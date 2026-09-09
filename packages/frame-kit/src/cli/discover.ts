import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  FRAME_META_FILENAME,
  type FrameMeta,
  FrameMetaSchema,
} from "../schema/frameMeta.js";
import type { Reporter } from "./report.js";

/** Directories never worth walking into when looking for frames. */
const SKIP = new Set([
  "node_modules",
  "dist",
  ".git",
  ".pnpm-store",
  // The conventional name for test fixtures. A fixture frame exists to be
  // packaged by a test, not to be shipped by whoever owns the repository.
  "__fixtures__",
]);

export interface DiscoveredFrame {
  /** Names the bundle file. From `meta.slug`, else the directory basename. */
  slug: string;
  /** Absolute directory holding the descriptor. */
  dir: string;
  /** Absolute path to the descriptor, for error messages. */
  metaFile: string;
  /** Absolute path to the module exporting the frame. */
  entryFile: string;
  meta: FrameMeta;
}

/** Path relative to `root` with POSIX separators, for messages and annotations. */
export function relativePosix(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

async function findMetaFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // unreadable directory: nothing to discover, not worth failing over
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name) && !entry.name.startsWith(".")) {
        await findMetaFiles(path.join(dir, entry.name), out);
      }
    } else if (entry.name === FRAME_META_FILENAME) {
      out.push(path.join(dir, entry.name));
    }
  }
}

/**
 * Finds every frame under `root`.
 *
 * Marker-file driven rather than convention-guessed, because packaging has to
 * work both in a workspace of packages and in a flat single-package repository.
 *
 * Every malformed descriptor and every collision is reported, not just the
 * first — an author fixing their repo wants the whole list.
 */
export async function discoverFrames(
  root: string,
  reporter: Reporter,
): Promise<DiscoveredFrame[]> {
  const metaFiles: string[] = [];
  await findMetaFiles(root, metaFiles);
  metaFiles.sort((a, b) => a.localeCompare(b));

  const frames: DiscoveredFrame[] = [];

  for (const metaFile of metaFiles) {
    const file = relativePosix(root, metaFile);
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(metaFile, "utf8"));
    } catch (cause) {
      reporter.error({
        file,
        message: `is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
      });
      continue;
    }

    const parsed = FrameMetaSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        reporter.error({
          file,
          path: issue.path.join(".") || undefined,
          message: issue.message,
        });
      }
      continue;
    }

    const dir = path.dirname(metaFile);
    frames.push({
      slug: parsed.data.slug ?? path.basename(dir),
      dir,
      metaFile,
      entryFile: path.resolve(dir, parsed.data.entry),
      meta: parsed.data,
    });
  }

  reportCollisions(root, frames, reporter);
  return frames;
}

function reportCollisions(
  root: string,
  frames: DiscoveredFrame[],
  reporter: Reporter,
): void {
  for (const [key, label] of [
    ["id", "id"],
    ["slug", "slug"],
  ] as const) {
    const seen = new Map<string, DiscoveredFrame[]>();
    for (const frame of frames) {
      const value = key === "id" ? frame.meta.id : frame.slug;
      seen.set(value, [...(seen.get(value) ?? []), frame]);
    }
    for (const [value, group] of seen) {
      if (group.length < 2) {
        continue;
      }
      const where = group
        .map((frame) => relativePosix(root, frame.metaFile))
        .join(", ");
      for (const frame of group) {
        reporter.error({
          frame: frame.slug,
          file: relativePosix(root, frame.metaFile),
          message:
            `${label} "${value}" is claimed by more than one frame (${where}). ` +
            (label === "slug"
              ? 'Set a distinct "slug" — it names the bundle file.'
              : "An id is permanent identity; two frames cannot share one."),
        });
      }
    }
  }
}
