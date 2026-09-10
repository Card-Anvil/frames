import { createWriteStream } from "node:fs";
import { copyFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { setTimeout as delay } from "node:timers/promises";

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
 * What Windows reports when something else has the destination open.
 *
 * `EBUSY` and `EACCES` for the same situation on network shares and some
 * antivirus filters.
 */
const HELD_OPEN = new Set(["EPERM", "EACCES", "EBUSY"]);

/** Backoff between rename attempts. */
const RETRY_DELAYS_MS = [10, 20, 40, 80, 160, 320, 640, 1000];

const TOTAL_WAIT_MS = RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);

/**
 * Renames, waiting out anything that has the destination open.
 *
 * POSIX lets a file be replaced while it is being read. Windows does not: a
 * rename onto a path some process holds open fails outright. A linked folder
 * exists precisely to be read — Card Anvil re-reads a bundle whenever it
 * changes — so a rebuild that lands mid-read hits this, and so do antivirus
 * and search indexers, which open files briefly on their own schedule.
 *
 * Waiting is the whole fix: whatever holds the file is finishing a read that
 * takes milliseconds. A real permission problem still fails, two seconds later.
 */
async function renameWhenFree(temp: string, file: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temp, file);
      return;
    } catch (cause) {
      const code = (cause as NodeJS.ErrnoException).code ?? "";
      if (!HELD_OPEN.has(code)) {
        throw cause;
      }
      const wait = RETRY_DELAYS_MS[attempt];
      if (wait === undefined) {
        // `EPERM: operation not permitted, rename` says nothing about what to
        // do. Whatever is holding the file is the thing to go and close.
        throw new Error(
          `could not replace ${path.basename(file)}: something still has it open after ${String(TOTAL_WAIT_MS)}ms (${code}). On Windows a file cannot be replaced while another process holds it — close whatever is reading it, or point the build somewhere else.`,
          { cause },
        );
      }
      await delay(wait);
    }
  }
}

/**
 * Writes `file` so that a reader never sees a partial one.
 *
 * Watch mode means something else is reading this directory while it is being
 * written — Card Anvil re-reads a bundle the moment it changes. Writing in
 * place would hand it a truncated zip whenever the timing was unlucky, so
 * every output is written to a temp file and renamed into position, which is
 * atomic on every platform this runs on — see {@link renameWhenFree} for the
 * one thing Windows asks for in return.
 */
export async function writeFileAtomic(
  file: string,
  data: string | Uint8Array,
): Promise<void> {
  const temp = tempFor(file);
  try {
    await writeFile(temp, data);
    await renameWhenFree(temp, file);
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
    await renameWhenFree(temp, file);
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
    await renameWhenFree(temp, dest);
  } catch (cause) {
    await discard(temp);
    throw cause;
  }
}
