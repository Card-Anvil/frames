import { createHash } from "node:crypto";

import type { FramePath } from "../../../manifest/walk.js";
import { formatPath, getAtPath } from "../../../manifest/walk.js";
import { writeFileAtomic } from "../../atomic.js";
import {
  type ResolveContext,
  type SourceLocation,
  type UnsupportedReason,
  resolveFramePath,
} from "./resolvePath.js";
import { normalizeFile } from "./sourceIndex.js";

/** A value a literal may be replaced with. The contract has no others. */
export type EditableValue = number | string | boolean;

export interface Edit {
  readonly path: FramePath;
  readonly value: EditableValue;
}

export interface EditRejection {
  readonly path: FramePath;
  readonly reason: UnsupportedReason | "value-mismatch" | "stale" | "overlap";
  readonly detail: string;
  readonly source?: SourceLocation;
}

export interface AppliedEdit {
  readonly path: FramePath;
  readonly file: string;
  readonly from: string;
  readonly to: string;
  /** True when the literal is a helper default other box sets also read. */
  readonly sharedDefault: boolean;
}

export type ApplyResult =
  | {
      readonly ok: true;
      readonly applied: readonly AppliedEdit[];
      /** New sha256 of every file written, for the caller's self-write map. */
      readonly files: ReadonlyMap<string, string>;
    }
  | { readonly ok: false; readonly rejected: readonly EditRejection[] };

export interface ApplyOptions {
  readonly ctx: ResolveContext;
  readonly entryFile: string;
  readonly exportName: string;
  /**
   * The frame as most recently loaded, used to verify that each literal we are
   * about to overwrite really is the one that produced the current value.
   */
  readonly frame: unknown;
  readonly edits: readonly Edit[];
  /**
   * sha256 each file is expected to still have. A file that has changed since
   * the studio read it is refused rather than overwritten.
   */
  readonly expect?: ReadonlyMap<string, string>;
}

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

/** Whether a literal's source text really denotes `value`. */
export function literalDenotes(text: string, value: unknown): boolean {
  if (typeof value === "number") {
    return Number(text) === value;
  }
  if (typeof value === "boolean") {
    return text === String(value);
  }
  if (typeof value === "string") {
    const quote = text[0];
    if (quote !== '"' && quote !== "'" && quote !== "`") {
      return false;
    }
    return text.slice(1, -1) === value;
  }
  return false;
}

/**
 * Renders a new literal in the style of the one it replaces.
 *
 * Numbers are written plainly — every real frame uses integers, and a drag
 * produces fractions nobody wants in source. Strings reuse the quote
 * character already there so the file still satisfies Prettier.
 */
export function renderLiteral(value: EditableValue, previous: string): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Math.round(value));
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  const quote = previous.startsWith("'")
    ? "'"
    : previous.startsWith("`")
      ? "`"
      : '"';
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll(quote, `\\${quote}`);
  return `${quote}${escaped}${quote}`;
}

interface Splice {
  readonly file: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly applied: AppliedEdit;
}

/**
 * Rewrites literals in place, or refuses and writes nothing.
 *
 * Every edit is resolved to a source range, checked against the value the
 * frame actually loaded with, and only then spliced. The check is the reason
 * this is safe to run against someone's working tree: if the resolver is ever
 * wrong — a mis-ordered spread, a followed import that was the wrong one — the
 * literal will not match the value, and the whole batch is refused. The
 * failure mode is "refuses to edit", never "edited the wrong number".
 *
 * Only the literal's own characters change, so comments, formatting and import
 * order survive by construction; nothing is reprinted.
 */
export async function applyEdits(options: ApplyOptions): Promise<ApplyResult> {
  const { ctx, entryFile, exportName, frame, edits, expect } = options;
  const rejected: EditRejection[] = [];
  const splices: Splice[] = [];

  for (const edit of edits) {
    const resolution = resolveFramePath(ctx, entryFile, exportName, edit.path);
    if (!resolution.editable) {
      rejected.push({
        path: edit.path,
        reason: resolution.reason,
        detail: resolution.detail,
        ...(resolution.source ? { source: resolution.source } : {}),
      });
      continue;
    }

    // The gate. `getAtPath` reads the value the frame really loaded with; if
    // the literal we found does not denote it, we found the wrong literal.
    const current = getAtPath(frame, edit.path);
    if (!literalDenotes(resolution.text, current)) {
      rejected.push({
        path: edit.path,
        reason: "value-mismatch",
        detail:
          `${formatPath(edit.path)} is ${JSON.stringify(current)} in the loaded frame, but ` +
          `the literal found at ${resolution.location.file}:${String(resolution.location.line)} is ` +
          `${resolution.text}. Refusing to edit a value the studio cannot account for.`,
        source: resolution.location,
      });
      continue;
    }

    splices.push({
      file: resolution.file,
      start: resolution.start,
      end: resolution.end,
      text: renderLiteral(edit.value, resolution.text),
      applied: {
        path: edit.path,
        file: resolution.file,
        from: resolution.text,
        to: renderLiteral(edit.value, resolution.text),
        sharedDefault: resolution.sharedDefault,
      },
    });
  }

  if (rejected.length > 0) {
    return { ok: false, rejected };
  }

  // Group by file, then reject a batch whose ranges collide — two edits to one
  // literal have no defined outcome, and silently picking one is worse.
  const byFile = new Map<string, Splice[]>();
  for (const splice of splices) {
    const key = normalizeFile(splice.file);
    byFile.set(key, [...(byFile.get(key) ?? []), splice]);
  }

  for (const [file, group] of byFile) {
    const sorted = [...group].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (previous && current && current.start < previous.end) {
        rejected.push({
          path: current.applied.path,
          reason: "overlap",
          detail: `Two edits target overlapping text in ${file}.`,
        });
      }
    }
  }

  if (rejected.length > 0) {
    return { ok: false, rejected };
  }

  const written = new Map<string, string>();
  const pending: { file: string; text: string }[] = [];

  for (const [file, group] of byFile) {
    const text = ctx.index.text(file);
    if (text === undefined) {
      return {
        ok: false,
        rejected: [
          {
            path: group[0]?.applied.path ?? [],
            reason: "unreadable",
            detail: `Could not read ${file}.`,
          },
        ],
      };
    }

    const wanted = expect?.get(file);
    if (wanted !== undefined && sha256(text) !== wanted) {
      return {
        ok: false,
        rejected: [
          {
            path: group[0]?.applied.path ?? [],
            reason: "stale",
            detail: `${file} changed on disk since the studio last read it.`,
          },
        ],
      };
    }

    // Descending, so an earlier replacement never shifts a later offset.
    let next = text;
    for (const splice of [...group].sort((a, b) => b.start - a.start)) {
      next = next.slice(0, splice.start) + splice.text + next.slice(splice.end);
    }
    pending.push({ file, text: next });
    written.set(file, sha256(next));
  }

  for (const { file, text } of pending) {
    await writeFileAtomic(file, text);
    ctx.index.invalidate(file);
  }

  return {
    ok: true,
    applied: splices.map((splice) => splice.applied),
    files: written,
  };
}
