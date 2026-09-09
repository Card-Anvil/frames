import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readImageSize } from "./imageSize.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "frame-kit-size-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(name: string, data: Buffer): Promise<string> {
  const file = path.join(dir, name);
  await writeFile(file, data);
  return file;
}

/** A 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** Minimal JPEG: SOI, a segment to skip, then an SOF0 declaring 7x5. */
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]),
  Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x05, 0x00, 0x07]),
  Buffer.alloc(16),
]);

describe("readImageSize", () => {
  it("reads a PNG header", async () => {
    expect(await readImageSize(await write("a.png", PNG))).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("walks the JPEG marker chain to the frame header", async () => {
    expect(await readImageSize(await write("a.jpg", JPEG))).toEqual({
      width: 7,
      height: 5,
    });
  });

  // Dimensions are a nicety for a browse UI, never a reason to fail a build.
  it("gives up quietly on anything else", async () => {
    expect(
      await readImageSize(await write("a.txt", Buffer.from("nope"))),
    ).toBeUndefined();
    expect(await readImageSize(path.join(dir, "missing.png"))).toBeUndefined();
  });
});
