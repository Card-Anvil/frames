import yazl from "yazl";

import type { FrameManifest } from "../manifest/contract.js";
import { writeStreamAtomic } from "./atomic.js";
import { PackagingError } from "./errors.js";
import { stableStringify } from "./stableJson.js";

/** The earliest instant a DOS timestamp can express. */
const ZIP_EPOCH = new Date(Date.UTC(1980, 0, 1));

/** GitHub refuses release assets above this. */
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024 * 1024;

/** Worth telling an author about long before they hit the hard limit. */
const WARN_BUNDLE_BYTES = 500 * 1024 * 1024;

export interface BundleSource {
  /** Where the asset lives now, keyed by its path inside the bundle. */
  fileByPath: ReadonlyMap<string, string>;
}

export interface BundleResult {
  bytes: number;
  /** True when the bundle is large enough to be worth mentioning. */
  large: boolean;
}

/**
 * Writes a `.cardframe`: the manifest, then every asset it names.
 *
 * Assets are **stored, not deflated**. PNG and JPEG are already compressed, so
 * re-deflating hundreds of megabytes buys about a percent, costs minutes of
 * CPU, and makes the output depend on the zlib version. Storing them keeps
 * packing IO-bound and leaves the archive readable without inflating.
 * `frame.json` is text and deflates roughly ten to one, so it stays compressed.
 *
 * Fixed timestamps and modes mean the same source produces the same bytes.
 */
export async function writeBundle(
  outFile: string,
  manifest: FrameManifest,
  source: BundleSource,
): Promise<BundleResult> {
  const zip = new yazl.ZipFile();

  zip.addBuffer(Buffer.from(stableStringify(manifest), "utf8"), "frame.json", {
    mtime: ZIP_EPOCH,
    mode: 0o100644,
    compress: true,
  });

  // `manifest.assets` is already sorted by path, so entry order is stable.
  for (const asset of manifest.assets) {
    const file = source.fileByPath.get(asset.path);
    if (file === undefined) {
      throw new PackagingError(
        `no source file for bundle entry ${asset.path} — this is a bug in frame-kit`,
      );
    }
    // yazl stats the file itself; `size` is only for stream entries.
    zip.addFile(file, asset.path, {
      mtime: ZIP_EPOCH,
      mode: 0o100644,
      compress: false,
    });
  }
  zip.end();

  // Written to a temp file and renamed: watch mode means Card Anvil may be
  // reading this directory while it is being written, and a partial zip is
  // indistinguishable from a corrupt one.
  const bytes = await writeStreamAtomic(outFile, zip.outputStream);

  if (bytes > MAX_BUNDLE_BYTES) {
    throw new PackagingError(
      `${outFile} is ${describeBytes(bytes)}, over GitHub's 2 GiB limit for a ` +
        `release asset. Split the frame, or use smaller art.`,
    );
  }
  return { bytes, large: bytes > WARN_BUNDLE_BYTES };
}

export function describeBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GiB` : `${mb.toFixed(1)} MB`;
}
