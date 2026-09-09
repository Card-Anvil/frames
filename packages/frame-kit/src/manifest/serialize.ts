import { type Frame, FrameSchema } from "../schema/frame.js";
import {
  type AssetEntry,
  CONTRACT_VERSION,
  DECLARATIVE_KIND,
  type FrameManifest,
} from "./contract.js";
import { formatPath, setAtPath, walkAssets } from "./walk.js";

/** Where one asset ended up in the package, and what it contains. */
export interface PackagedAsset {
  /** Path relative to the directory holding `frame.json`. POSIX separators. */
  path: string;
  bytes?: number;
  sha256?: string;
}

export interface FrameToManifestOptions {
  id: string;
  version: string;
  generator?: string;
  author?: { name: string; url?: string };
  license?: string;
  /**
   * Maps a build-time asset URL to its packaged location.
   *
   * Supplied by the caller so this module stays free of filesystem access:
   * the packaging CLI hashes and copies files, tests pass an in-memory map.
   * Returning the same path for two URLs is how deduplication happens.
   */
  resolveAsset: (url: string) => PackagedAsset;
}

/**
 * Converts an authored {@link Frame} into a distributable manifest, rewriting
 * every asset URL to a package-relative path.
 *
 * The frame is serialized *after* authoring helpers have run, so a loader never
 * needs them — which is what lets the authoring API evolve without changing the
 * on-disk format.
 */
export function frameToManifest(
  frame: Frame,
  options: FrameToManifestOptions,
): FrameManifest {
  // Round-trip through JSON to get a plain, mutable copy. Frame configs wire
  // module namespace objects straight into asset fields (the barrel
  // convention), and those are neither mutable nor plain.
  const plain: unknown = JSON.parse(JSON.stringify(frame));

  const assetsByPath = new Map<string, AssetEntry>();

  for (const occurrence of walkAssets(FrameSchema, plain)) {
    const packaged = options.resolveAsset(occurrence.url);
    if (!packaged.path) {
      throw new Error(
        `resolveAsset returned no path for ${occurrence.url} at ${formatPath(occurrence.path)}`,
      );
    }
    setAtPath(plain, occurrence.path, packaged.path);
    assetsByPath.set(packaged.path, {
      path: packaged.path,
      ...(packaged.bytes === undefined ? {} : { bytes: packaged.bytes }),
      ...(packaged.sha256 === undefined ? {} : { sha256: packaged.sha256 }),
    });
  }

  const rewritten = FrameSchema.parse(plain);

  return {
    contractVersion: CONTRACT_VERSION,
    kind: DECLARATIVE_KIND,
    id: options.id,
    version: options.version,
    ...(options.generator === undefined
      ? {}
      : { generator: options.generator }),
    ...(options.author === undefined ? {} : { author: options.author }),
    ...(options.license === undefined ? {} : { license: options.license }),
    frame: rewritten,
    // Sorted so the manifest is byte-stable across builds and diffs cleanly.
    assets: [...assetsByPath.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    ),
  };
}
