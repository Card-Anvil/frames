import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type ts from "typescript";

import type { TypeScriptApi } from "./ts.js";

/**
 * Path in the one spelling everything else compares against.
 *
 * Windows hands the same file back with either separator and either
 * drive-letter case depending on who produced the path — Vite's module graph,
 * `path.resolve`, or an author's `frame.meta.json`. Every map key, root
 * confinement check and self-write lookup goes through here.
 */
export function normalizeFile(file: string): string {
  const resolved = path.resolve(file).split(path.sep).join("/");
  return /^[a-z]:\//i.test(resolved)
    ? resolved.slice(0, 1).toUpperCase() + resolved.slice(1)
    : resolved;
}

/** Whether `file` is inside `root` — not merely prefixed by its name. */
export function isUnderRoot(file: string, root: string): boolean {
  const normalizedRoot = normalizeFile(root);
  const normalized = normalizeFile(file);
  return (
    normalized === normalizedRoot ||
    normalized.startsWith(
      normalizedRoot.endsWith("/") ? normalizedRoot : `${normalizedRoot}/`,
    )
  );
}

interface Entry {
  readonly mtimeMs: number;
  readonly size: number;
  readonly text: string;
  readonly sourceFile: ts.SourceFile;
}

export interface SourceIndex {
  /** Parsed file, or `undefined` if it cannot be read. */
  get: (file: string) => ts.SourceFile | undefined;
  /** Current text of `file`, from the same cached read as `get`. */
  text: (file: string) => string | undefined;
  /** Drops a file so the next `get` re-reads it. */
  invalidate: (file: string) => void;
}

/**
 * Parses source files on demand and keeps them until they change on disk.
 *
 * Keyed on `(mtimeMs, size)` rather than a manual flush, so the studio's own
 * writes invalidate themselves and an edit made in the author's editor is
 * picked up without coordination.
 */
export function createSourceIndex(api: TypeScriptApi): SourceIndex {
  const cache = new Map<string, Entry>();

  function load(file: string): Entry | undefined {
    const key = normalizeFile(file);
    let stat;
    try {
      stat = statSync(key);
    } catch {
      cache.delete(key);
      return undefined;
    }

    const hit = cache.get(key);
    if (hit?.mtimeMs === stat.mtimeMs && hit.size === stat.size) {
      return hit;
    }

    let text: string;
    try {
      text = readFileSync(key, "utf8");
    } catch {
      cache.delete(key);
      return undefined;
    }

    const entry: Entry = {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      text,
      sourceFile: api.createSourceFile(
        key,
        text,
        api.ScriptTarget.Latest,
        // The resolver walks upward from a node to find its declaration.
        /* setParentNodes */ true,
        key.endsWith(".tsx") ? api.ScriptKind.TSX : api.ScriptKind.TS,
      ),
    };
    cache.set(key, entry);
    return entry;
  }

  return {
    get: (file) => load(file)?.sourceFile,
    text: (file) => load(file)?.text,
    invalidate: (file) => {
      cache.delete(normalizeFile(file));
    },
  };
}
