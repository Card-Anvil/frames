import { createWriteStream } from "node:fs";
import { copyFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

/**
 * A temp name beside the destination.
 *
 * Beside, not in the system temp directory: `rename` is only atomic within one
 * filesystem, and an author's output directory is frequently on a different
 * volume from /tmp.
 */
function tempFor(file: string): string {
  return path.join(
    path.dirname(file),
    `.${path.basename(file)}.${String(process.pid)}.tmp`,
  );
}

async function discard(temp: string): Promise<void> {
  await rm(temp, { force: true });
}

/**
 * Writes `file` so that a reader never sees a partial one.
 *
 * Watch mode means something else is reading this directory while it is being
 * written — Card Anvil re-reads a bundle the moment it changes. Writing in
 * place would hand it a truncated zip whenever the timing was unlucky, so
 * every output is written to a temp file and renamed into position, which is
 * atomic on every platform this runs on.
 */
export async function writeFileAtomic(
  file: string,
  data: string | Uint8Array,
): Promise<void> {
  const temp = tempFor(file);
  try {
    await writeFile(temp, data);
    await rename(temp, file);
  } catch (cause) {
    await discard(temp);
    throw cause;
  }
}

/** Streams to `file` atomically. Returns the number of bytes written. */
export async function writeStreamAtomic(
  file: string,
  // The broad interface rather than node:stream's Readable, because yazl types
  // its output stream this way.
  stream: NodeJS.ReadableStream,
): Promise<number> {
  const temp = tempFor(file);
  let bytes = 0;
  stream.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
  });
  try {
    await pipeline(stream, createWriteStream(temp));
    await rename(temp, file);
    return bytes;
  } catch (cause) {
    await discard(temp);
    throw cause;
  }
}

/** Copies to `dest` atomically. */
export async function copyFileAtomic(
  source: string,
  dest: string,
): Promise<void> {
  const temp = tempFor(dest);
  try {
    await copyFile(source, temp);
    await rename(temp, dest);
  } catch (cause) {
    await discard(temp);
    throw cause;
  }
}
