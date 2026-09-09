import { stat } from "node:fs/promises";
import path from "node:path";

import {
  FrameManifestSchema,
  frameToManifest,
  manifestToFrame,
  walkAssets,
} from "../manifest/index.js";
import { type Frame, FrameSchema } from "../schema/frame.js";
import { devUrlToFile } from "./devUrl.js";
import {
  type DiscoveredFrame,
  discoverFrames,
  relativePosix,
} from "./discover.js";
import { PackagingError } from "./errors.js";
import {
  type FrameServer,
  loadFrameExport,
  startFrameServer,
} from "./loadFrame.js";
import { Reporter } from "./report.js";

/** Namespace reserved for Card Anvil's own frames. */
const RESERVED_ID_PREFIX = "com.cardanvil.";

export interface LoadedFrame {
  discovered: DiscoveredFrame;
  /** The frame as authored, validated against `FrameSchema`. */
  frame: Frame;
  /** JSON projection — asset sets are module namespace objects when authored. */
  plain: unknown;
  /** Every asset in the frame, resolved to a file that exists. */
  assets: { url: string; file: string }[];
}

export interface LoadOptions {
  root: string;
  /** Restrict to these slugs. Empty means every frame found. */
  only?: readonly string[];
}

/** Deep JSON copy: frame configs wire module namespaces into asset fields. */
function toPlain(frame: Frame): unknown {
  return JSON.parse(JSON.stringify(frame));
}

/**
 * Loads, validates and resolves every frame under `root`.
 *
 * Shared by `validate` and `build` so the two can never disagree about whether
 * a frame is sound.
 */
export async function loadFrames(
  options: LoadOptions,
  reporter: Reporter,
  /**
   * A server to reuse. When supplied the caller owns its lifetime and this
   * function will not close it — watch mode keeps one alive across rebuilds.
   */
  existingServer?: FrameServer,
): Promise<LoadedFrame[]> {
  const root = path.resolve(options.root);
  const discovered = await discoverFrames(root, reporter);

  const only = new Set(options.only ?? []);
  const wanted =
    only.size === 0
      ? discovered
      : discovered.filter((frame) => only.has(frame.slug));

  for (const slug of only) {
    if (!discovered.some((frame) => frame.slug === slug)) {
      reporter.error({ message: `no frame named "${slug}" was found` });
    }
  }
  if (wanted.length === 0) {
    if (discovered.length === 0) {
      reporter.error({
        message:
          `no frames found under ${root}. A frame is any directory with a ` +
          `frame.meta.json in it.`,
      });
    }
    return [];
  }

  const frameServer = existingServer ?? (await startFrameServer(root));
  const loaded: LoadedFrame[] = [];
  try {
    for (const frame of wanted) {
      const result = await loadOne(frameServer, root, frame, reporter);
      if (result) {
        loaded.push(result);
      }
    }
  } finally {
    if (!existingServer) {
      await frameServer.close();
    }
  }
  return loaded;
}

async function loadOne(
  frameServer: FrameServer,
  root: string,
  discovered: DiscoveredFrame,
  reporter: Reporter,
): Promise<LoadedFrame | undefined> {
  const slug = discovered.slug;
  const file = relativePosix(root, discovered.metaFile);

  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  if (
    discovered.meta.id.startsWith(RESERVED_ID_PREFIX) &&
    owner !== undefined &&
    owner !== "Card-Anvil"
  ) {
    reporter.warn({
      frame: slug,
      file,
      message:
        `id "${discovered.meta.id}" is in Card Anvil's own namespace. An id is ` +
        `permanent and a marketplace binds it to a repository — use your own, ` +
        `e.g. com.github.${owner}.${slug}.`,
    });
  }

  let exported: unknown;
  try {
    exported = await loadFrameExport(
      frameServer,
      discovered.entryFile,
      discovered.meta.export,
    );
  } catch (cause) {
    reporter.error({
      frame: slug,
      file,
      message: cause instanceof PackagingError ? cause.message : String(cause),
    });
    return undefined;
  }

  const parsed = FrameSchema.safeParse(exported);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      reporter.error({
        frame: slug,
        file: relativePosix(root, discovered.entryFile),
        path: issue.path.join(".") || undefined,
        message: issue.message,
      });
    }
    return undefined;
  }

  const plain = toPlain(parsed.data);
  const assets = await resolveAssets(frameServer, root, slug, plain, reporter);
  if (!assets) {
    return undefined;
  }

  if (!roundTrips(slug, plain, assets, reporter)) {
    return undefined;
  }

  return { discovered, frame: parsed.data, plain, assets };
}

/** Maps every asset URL to a file, and proves each one exists. */
async function resolveAssets(
  frameServer: FrameServer,
  root: string,
  slug: string,
  plain: unknown,
  reporter: Reporter,
): Promise<{ url: string; file: string }[] | undefined> {
  const occurrences = walkAssets(FrameSchema, plain);
  const byUrl = new Map<string, string>();
  let failed = false;

  for (const occurrence of occurrences) {
    if (byUrl.has(occurrence.url)) {
      continue;
    }
    let file: string;
    try {
      file = devUrlToFile(occurrence.url, frameServer.root, frameServer.base);
    } catch (cause) {
      reporter.error({
        frame: slug,
        path: occurrence.path.join("."),
        message:
          cause instanceof PackagingError ? cause.message : String(cause),
      });
      failed = true;
      continue;
    }
    try {
      const stats = await stat(file);
      if (!stats.isFile()) {
        throw new Error("not a file");
      }
    } catch {
      reporter.error({
        frame: slug,
        path: occurrence.path.join("."),
        message: `file not found: ${relativePosix(root, file)}`,
      });
      failed = true;
      continue;
    }
    byUrl.set(occurrence.url, file);
  }

  return failed ? undefined : [...byUrl].map(([url, file]) => ({ url, file }));
}

/**
 * Packs and unpacks the frame in memory, proving the bundle it would produce is
 * one a loader could actually read back. `build` repeats this on the real
 * manifest, so a build never emits an unloadable bundle.
 */
function roundTrips(
  slug: string,
  plain: unknown,
  assets: { url: string; file: string }[],
  reporter: Reporter,
): boolean {
  const paths = new Map(
    assets.map(({ url, file }, index) => [
      url,
      `assets/${String(index)}${path.extname(file).toLowerCase()}`,
    ]),
  );
  try {
    const manifest = frameToManifest(plain as Frame, {
      id: "com.example.check",
      version: "0.0.0",
      resolveAsset: (url) => {
        const packaged = paths.get(url);
        if (packaged === undefined) {
          throw new PackagingError(`unresolved asset ${url}`);
        }
        return { path: packaged };
      },
    });
    FrameManifestSchema.parse(JSON.parse(JSON.stringify(manifest)));
    manifestToFrame(manifest, { resolveUrl: (packaged) => packaged });
    return true;
  } catch (cause) {
    reporter.error({
      frame: slug,
      message: `cannot be packaged: ${cause instanceof Error ? cause.message : String(cause)}`,
    });
    return false;
  }
}

export interface ValidateResult {
  reporter: Reporter;
  /** The frames that loaded cleanly. Fewer than were found, if some failed. */
  frames: LoadedFrame[];
}

/** Loads every frame and reports what is wrong. Writes nothing. */
export async function validateFrames(
  options: LoadOptions,
): Promise<ValidateResult> {
  const reporter = new Reporter();
  const frames = await loadFrames(options, reporter);
  return { reporter, frames };
}
