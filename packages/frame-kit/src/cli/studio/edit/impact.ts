import type { FramePath } from "../../../manifest/walk.js";
import { type ResolveContext, resolveFramePath } from "./resolvePath.js";

/** A box set the studio can address, as `session.ts` enumerates them. */
export interface BoxSetRef {
  readonly variant: string | null;
  readonly layout: string;
  readonly key: string;
  readonly path: readonly string[];
}

/** One place a literal is read from, besides the one being edited. */
export interface Impact {
  readonly variant: string | null;
  readonly layout: string;
  readonly boxSet: string;
  readonly path: FramePath;
}

export interface ImpactOptions {
  readonly ctx: ResolveContext;
  readonly entryFile: string;
  readonly exportName: string;
  /** Every `kind: "boxes"` slot in the frame. */
  readonly boxSets: readonly BoxSetRef[];
  /** The full logical path of the value being edited. */
  readonly target: FramePath;
}

/** Splits a leaf path into its box-set prefix and the tail inside that set. */
function splitTarget(
  target: FramePath,
  boxSets: readonly BoxSetRef[],
): { set: BoxSetRef; tail: FramePath } | undefined {
  for (const set of boxSets) {
    if (
      target.length > set.path.length &&
      set.path.every((segment, i) => target[i] === segment)
    ) {
      return { set, tail: target.slice(set.path.length) };
    }
  }
  return undefined;
}

/**
 * Every box set that reads the same literal as `target`.
 *
 * Frames share geometry heavily — `frame-borderless` spreads
 * `borderlessNormalBoxes` into most of its layouts, and
 * `withCollectorInfoDefaults` hands one `collectorInfo` to all ten box sets of
 * every layout. Moving such a box moves it everywhere, so the studio has to be
 * able to say so *before* it writes, rather than surprising the author after.
 *
 * Identity is the exact source range: two paths are the same value only when
 * they resolve to the same characters in the same file.
 *
 * The scan is per-frame. A literal exported through `/extend` and read by a
 * different frame package is not counted here; `resolveFramePath` reports that
 * separately by way of the file it landed in.
 */
export function impactOf(options: ImpactOptions): Impact[] {
  const { ctx, entryFile, exportName, boxSets, target } = options;
  const split = splitTarget(target, boxSets);
  if (!split) {
    return [];
  }

  const anchor = resolveFramePath(ctx, entryFile, exportName, target);
  if (!anchor.editable) {
    return [];
  }

  const shared: Impact[] = [];
  for (const set of boxSets) {
    const path = [...set.path, ...split.tail];
    if (
      path.length === target.length &&
      path.every((s, i) => s === target[i])
    ) {
      continue; // the value being edited
    }
    const resolution = resolveFramePath(ctx, entryFile, exportName, path);
    if (
      resolution.editable &&
      resolution.file === anchor.file &&
      resolution.start === anchor.start &&
      resolution.end === anchor.end
    ) {
      shared.push({
        variant: set.variant,
        layout: set.layout,
        boxSet: set.key,
        path,
      });
    }
  }
  return shared;
}

/**
 * Memoises impact scans for one loaded revision of a frame.
 *
 * The scan resolves the same tail against every box set, which for a frame
 * like `frame-borderless` is ~100 resolutions; the inspector asks for one per
 * field. Parses are already cached by `sourceIndex`, so this only has to stop
 * the walk itself from repeating.
 */
export function createImpactCache(): {
  get: (revision: number, options: ImpactOptions) => Impact[];
} {
  let cachedRevision = -1;
  let entries = new Map<string, Impact[]>();

  return {
    get(revision, options) {
      if (revision !== cachedRevision) {
        cachedRevision = revision;
        entries = new Map();
      }
      const key = options.target.join(".");
      const hit = entries.get(key);
      if (hit) {
        return hit;
      }
      const computed = impactOf(options);
      entries.set(key, computed);
      return computed;
    },
  };
}
