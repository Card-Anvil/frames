import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  type FrameManifest,
  FrameManifestSchema,
  type PackagedAsset,
  frameToManifest,
  manifestToFrame,
} from "../manifest/index.js";
import type { Frame } from "../schema/frame.js";
import { type LoadOptions, type LoadedFrame, loadFrames } from "./api.js";
import { describeBytes, writeBundle } from "./bundle.js";
import { PackagingError } from "./errors.js";
import { hashFile, mapWithConcurrency } from "./hash.js";
import type { Reporter } from "./report.js";
import { stableStringify } from "./stableJson.js";

/** How many characters of the sha256 name a packaged asset. 64 bits. */
const HASH_PREFIX_LENGTH = 16;

/** GitHub refuses individual repository files above 100 MB. */
const MAX_ASSET_BYTES = 100 * 1024 * 1024;

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export interface BuildOptions extends LoadOptions {
  /** Directory bundles and the index are written to. Created if missing. */
  outDir: string;
  /** Stamped into every manifest. One version for every frame in the repo. */
  version: string;
  generator?: string;
}

export interface BuiltFrame {
  loaded: LoadedFrame;
  manifest: FrameManifest;
  /** Absolute path to the written bundle. */
  bundleFile: string;
  /** Filename only, which is what a release asset is addressed by. */
  bundleName: string;
  bytes: number;
}

/**
 * Packs every sound frame into a `.cardframe` bundle.
 *
 * Frames that fail to load are reported and skipped rather than aborting the
 * run, so one bad frame does not hide the state of the others.
 */
export async function buildFrames(
  options: BuildOptions,
  reporter: Reporter,
): Promise<BuiltFrame[]> {
  if (!VERSION_PATTERN.test(options.version)) {
    throw new PackagingError(
      `"${options.version}" is not a version. Expected MAJOR.MINOR.PATCH, ` +
        `optionally with a pre-release suffix.`,
    );
  }

  const loaded = await loadFrames(options, reporter);
  const outDir = path.resolve(options.outDir);
  await mkdir(outDir, { recursive: true });

  const built: BuiltFrame[] = [];
  for (const frame of loaded) {
    const result = await buildOne(frame, outDir, options, reporter);
    if (result) {
      built.push(result);
    }
  }
  return built;
}

async function buildOne(
  loaded: LoadedFrame,
  outDir: string,
  options: BuildOptions,
  reporter: Reporter,
): Promise<BuiltFrame | undefined> {
  const slug = loaded.discovered.slug;

  const packaged = await packageAssets(loaded, slug, reporter);
  if (!packaged) {
    return undefined;
  }
  const { byUrl, fileByPath } = packaged;

  let manifest: FrameManifest;
  try {
    manifest = frameToManifest(loaded.plain as Frame, {
      id: loaded.discovered.meta.id,
      version: options.version,
      ...(options.generator === undefined
        ? {}
        : { generator: options.generator }),
      author: loaded.discovered.meta.author,
      resolveAsset: (url) => {
        const asset = byUrl.get(url);
        if (asset === undefined) {
          throw new PackagingError(`unresolved asset ${url}`);
        }
        return asset;
      },
    });

    // Prove the bundle is one a loader could read back — on the real manifest,
    // through JSON, so anything non-serializable is caught too.
    const roundTripped: unknown = JSON.parse(stableStringify(manifest));
    FrameManifestSchema.parse(roundTripped);
    manifestToFrame(roundTripped, { resolveUrl: (assetPath) => assetPath });
  } catch (cause) {
    reporter.error({
      frame: slug,
      message: `cannot be packaged: ${cause instanceof Error ? cause.message : String(cause)}`,
    });
    return undefined;
  }

  const bundleName = `${slug}-${options.version}.cardframe`;
  const bundleFile = path.join(outDir, bundleName);
  try {
    const { bytes, large } = await writeBundle(bundleFile, manifest, {
      fileByPath,
    });
    if (large) {
      reporter.warn({
        frame: slug,
        message:
          `${bundleName} is ${describeBytes(bytes)}. It will publish, but that ` +
          `is a long download for someone trying the frame out.`,
      });
    }
    return { loaded, manifest, bundleFile, bundleName, bytes };
  } catch (cause) {
    reporter.error({
      frame: slug,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return undefined;
  }
}

/**
 * Hashes every asset and decides where it lands in the bundle.
 *
 * Runs as a pre-pass because `frameToManifest`'s `resolveAsset` is synchronous
 * and hashing is not. Naming an asset after its content means deduplication
 * needs no bookkeeping — two identical files simply claim the same path — and
 * makes the output independent of traversal order.
 */
async function packageAssets(
  loaded: LoadedFrame,
  slug: string,
  reporter: Reporter,
): Promise<
  | {
      byUrl: Map<string, PackagedAsset>;
      fileByPath: Map<string, string>;
    }
  | undefined
> {
  const byUrl = new Map<string, PackagedAsset>();
  const byFile = new Map<string, PackagedAsset>();
  const fileByPath = new Map<string, string>();
  const hashByPath = new Map<string, string>();
  // A list rather than a boolean: the worker runs inside a callback, where a
  // flag assignment does not survive TypeScript's narrowing.
  const failures: string[] = [];

  await mapWithConcurrency(loaded.assets, 8, async ({ url, file }) => {
    const seen = byFile.get(file);
    if (seen) {
      byUrl.set(url, seen);
      return;
    }
    try {
      const { size } = await stat(file);
      if (size > MAX_ASSET_BYTES) {
        reporter.error({
          frame: slug,
          message:
            `${path.basename(file)} is ${describeBytes(size)}, over GitHub's ` +
            `100 MB limit for a single file.`,
        });
        failures.push(file);
        return;
      }
      const sha256 = await hashFile(file);
      const assetPath = `assets/${sha256.slice(0, HASH_PREFIX_LENGTH)}${path
        .extname(file)
        .toLowerCase()}`;

      const clash = hashByPath.get(assetPath);
      if (clash !== undefined && clash !== sha256) {
        throw new PackagingError(
          `two different assets hash to ${assetPath}. This should not happen; ` +
            `please report it.`,
        );
      }
      hashByPath.set(assetPath, sha256);

      const asset: PackagedAsset = { path: assetPath, bytes: size, sha256 };
      byFile.set(file, asset);
      byUrl.set(url, asset);
      fileByPath.set(assetPath, file);
    } catch (cause) {
      reporter.error({
        frame: slug,
        message: cause instanceof Error ? cause.message : String(cause),
      });
      failures.push(file);
    }
  });

  return failures.length > 0 ? undefined : { byUrl, fileByPath };
}
