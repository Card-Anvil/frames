import path from "node:path";

import { PackagingError } from "./errors.js";

/** Vite's prefix for files outside the project root. */
const FS_PREFIX = "/@fs/";

/** Matches a Windows drive letter at the start of a path. */
const DRIVE_LETTER = /^[a-zA-Z]:/;

/**
 * Reverses Vite's `fileToDevUrl`, turning the URL a frame's asset import
 * resolved to back into the file on disk it came from.
 *
 * In serve mode an asset under `root` becomes `base` + its POSIX path relative
 * to root; anything outside root becomes `/@fs/` + its absolute path. The URL
 * is built from the raw module id, so an import query rides along and has to be
 * stripped.
 */
export function devUrlToFile(url: string, root: string, base: string): string {
  const pathname = url.split("?", 1)[0] ?? "";

  if (pathname.startsWith("data:")) {
    throw new PackagingError(
      `${url} is a data URL, not a file. The packager turns Vite's inline ` +
        `limit off, so this is an explicit \`?inline\` import — drop the suffix ` +
        `so the asset stays a real file.`,
    );
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathname)) {
    throw new PackagingError(
      `${url} points somewhere remote. A frame has to ship its own art, ` +
        `because the bundle is what gets installed — remote URLs cannot be ` +
        `packaged.`,
    );
  }

  const decoded = decodeURIComponent(pathname);

  if (decoded.startsWith(FS_PREFIX)) {
    // `path.posix.join` built this, and it collapsed the double slash: a POSIX
    // path lost its leading slash and needs it back, while a Windows path
    // already carries its own drive letter.
    const rest = decoded.slice(FS_PREFIX.length);
    return path.resolve(DRIVE_LETTER.test(rest) ? rest : `/${rest}`);
  }

  if (!decoded.startsWith(base)) {
    throw new PackagingError(
      `${url} is not under the dev base ${base}, so it cannot be mapped back ` +
        `to a file.`,
    );
  }
  return path.resolve(root, decoded.slice(base.length));
}
