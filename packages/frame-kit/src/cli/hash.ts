import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";

/**
 * sha256 of a file, streamed.
 *
 * Streamed rather than read whole because frame art runs to hundreds of
 * megabytes across a frame, and every asset is hashed on every build.
 */
export async function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(file), hash);
  return hash.digest("hex");
}

/**
 * Runs `worker` over every item, at most `limit` at a time.
 *
 * Hashing is IO-bound; unbounded concurrency over a few hundred files just
 * exhausts file handles.
 */
export async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        if (item !== undefined) {
          await worker(item);
        }
      }
    },
  );
  await Promise.all(runners);
}
