import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PackagingError } from "./errors.js";
import { cropPixels, opaqueBounds, trimImages, unionBounds } from "./trim.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "frame-kit-trim-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** An RGBA image with `rect` filled in a colour that varies by pixel. */
function pixelsWith(
  width: number,
  height: number,
  rects: { x: number; y: number; width: number; height: number }[],
): PNG {
  const png = new PNG({ width, height });
  png.data.fill(0);
  for (const rect of rects) {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        const at = (y * width + x) * 4;
        png.data[at] = x * 7;
        png.data[at + 1] = y * 11;
        png.data[at + 2] = 200;
        png.data[at + 3] = 1 + ((x + y) % 255);
      }
    }
  }
  return png;
}

/** A display chunk, hand-built so the test checks it is carried over. */
function gammaChunk(): Buffer {
  // gAMA 1/2.2, with its CRC.
  return Buffer.from("0000000467414d410000b18f0bfc6105", "hex");
}

async function writePng(
  name: string,
  png: PNG,
  extraChunk?: Buffer,
): Promise<string> {
  let bytes = PNG.sync.write(png, { colorType: 6 });
  if (extraChunk) {
    // Straight after the signature (8) and IHDR (25).
    bytes = Buffer.concat([
      bytes.subarray(0, 33),
      extraChunk,
      bytes.subarray(33),
    ]);
  }
  const file = path.join(dir, name);
  await writeFile(file, bytes);
  return file;
}

function chunkTypes(bytes: Buffer): string[] {
  const types: string[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    types.push(bytes.toString("latin1", offset + 4, offset + 8));
    offset += 12 + bytes.readUInt32BE(offset);
  }
  return types;
}

describe("opaqueBounds", () => {
  it("finds every pixel that is not fully transparent", () => {
    const png = pixelsWith(20, 10, [
      { x: 3, y: 2, width: 4, height: 1 },
      { x: 9, y: 6, width: 2, height: 3 },
    ]);
    expect(opaqueBounds(png)).toEqual({ x: 3, y: 2, width: 8, height: 7 });
  });

  it("finds nothing in a fully transparent image", () => {
    expect(opaqueBounds(pixelsWith(5, 5, []))).toBeUndefined();
  });
});

describe("unionBounds", () => {
  it("holds every rectangle", () => {
    expect(
      unionBounds([
        { x: 5, y: 1, width: 2, height: 2 },
        { x: 1, y: 4, width: 2, height: 3 },
      ]),
    ).toEqual({ x: 1, y: 1, width: 6, height: 6 });
    expect(unionBounds([])).toBeUndefined();
  });
});

describe("cropPixels", () => {
  it("keeps the pixels inside the rectangle exactly", () => {
    const png = pixelsWith(8, 8, [{ x: 0, y: 0, width: 8, height: 8 }]);
    const cropped = cropPixels(png, { x: 2, y: 3, width: 3, height: 2 });
    expect(cropped.width).toBe(3);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        const from = ((3 + y) * 8 + 2 + x) * 4;
        const to = (y * 3 + x) * 4;
        expect([...cropped.data.subarray(to, to + 4)]).toEqual([
          ...png.data.subarray(from, from + 4),
        ]);
      }
    }
  });
});

describe("trimImages", () => {
  it("cuts each image to its own visible pixels, keeping them exactly", async () => {
    const png = pixelsWith(30, 40, [{ x: 10, y: 12, width: 5, height: 9 }]);
    const file = await writePng("a.png", png);

    const result = await trimImages([file]);

    expect(result.images[0]?.kept).toEqual({
      x: 10,
      y: 12,
      width: 5,
      height: 9,
    });
    const trimmed = PNG.sync.read(await readFile(file));
    expect([trimmed.width, trimmed.height]).toEqual([5, 9]);
    expect(trimmed.data).toEqual(
      Buffer.from(cropPixels(png, { x: 10, y: 12, width: 5, height: 9 }).data),
    );
  });

  it("cuts images to one shared rectangle with --shared", async () => {
    const banner = await writePng(
      "banner.png",
      pixelsWith(30, 40, [{ x: 4, y: 5, width: 10, height: 20 }]),
    );
    const mask = await writePng(
      "mask.png",
      pixelsWith(30, 40, [{ x: 8, y: 9, width: 3, height: 25 }]),
    );

    const result = await trimImages([banner, mask], { shared: true });

    const shared = { x: 4, y: 5, width: 10, height: 29 };
    expect(result.shared).toEqual(shared);
    expect(result.images.map((image) => image.kept)).toEqual([shared, shared]);
    for (const file of [banner, mask]) {
      const trimmed = PNG.sync.read(await readFile(file));
      expect([trimmed.width, trimmed.height]).toEqual([10, 29]);
    }
  });

  it("carries the display chunks over and records the position", async () => {
    const file = await writePng(
      "a.png",
      pixelsWith(10, 10, [{ x: 2, y: 3, width: 2, height: 2 }]),
      gammaChunk(),
    );

    await trimImages([file]);

    const types = chunkTypes(await readFile(file));
    expect(types.slice(0, 3)).toEqual(["IHDR", "gAMA", "oFFs"]);
    expect(types.indexOf("oFFs")).toBeLessThan(types.indexOf("IDAT"));
  });

  it("reports a trimmed image's place on the sheet when trimmed again", async () => {
    const file = await writePng(
      "a.png",
      pixelsWith(20, 20, [
        { x: 5, y: 6, width: 4, height: 4 },
        { x: 12, y: 6, width: 1, height: 1 },
      ]),
    );
    await trimImages([file]);

    // Erase the stray pixel at the right, so a second trim has more to cut.
    const once = PNG.sync.read(await readFile(file));
    const stray = (0 * once.width + 7) * 4 + 3;
    once.data[stray] = 0;
    const bytes = await readFile(file);
    const reencoded = PNG.sync.write(once, { colorType: 6 });
    const offs = bytes.subarray(
      bytes.indexOf("oFFs") - 4,
      bytes.indexOf("oFFs") + 17,
    );
    await writeFile(
      file,
      Buffer.concat([reencoded.subarray(0, 33), offs, reencoded.subarray(33)]),
    );

    const result = await trimImages([file]);
    expect(result.images[0]?.kept).toEqual({ x: 5, y: 6, width: 4, height: 4 });
  });

  it("leaves alone an image with nothing to cut, or nothing visible", async () => {
    const full = await writePng(
      "full.png",
      pixelsWith(4, 4, [{ x: 0, y: 0, width: 4, height: 4 }]),
    );
    const empty = await writePng("empty.png", pixelsWith(4, 4, []));
    const before = [await readFile(full), await readFile(empty)];

    const result = await trimImages([full, empty]);

    expect(result.images.map((image) => image.written)).toEqual([
      undefined,
      undefined,
    ]);
    expect(result.images[1]?.kept).toBeUndefined();
    expect([await readFile(full), await readFile(empty)]).toEqual(before);
  });

  it("writes to another folder, or nowhere on a dry run", async () => {
    const file = await writePng(
      "a.png",
      pixelsWith(10, 10, [{ x: 2, y: 2, width: 2, height: 2 }]),
    );
    const before = await readFile(file);
    const out = path.join(dir, "out");
    await mkdir(out);

    const dry = await trimImages([file], { dryRun: true });
    expect(dry.images[0]?.written).toBeUndefined();
    expect(await readFile(file)).toEqual(before);

    const result = await trimImages([file], { outDir: out });
    expect(result.images[0]?.written).toBe(path.join(out, "a.png"));
    expect(await readFile(file)).toEqual(before);
  });

  it("refuses images of different sizes with --shared", async () => {
    const a = await writePng(
      "a.png",
      pixelsWith(10, 10, [{ x: 1, y: 1, width: 1, height: 1 }]),
    );
    const b = await writePng(
      "b.png",
      pixelsWith(12, 10, [{ x: 1, y: 1, width: 1, height: 1 }]),
    );
    await expect(trimImages([a, b], { shared: true })).rejects.toThrow(
      PackagingError,
    );
  });

  it("refuses anything but a PNG", async () => {
    const file = path.join(dir, "a.jpg");
    await writeFile(file, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    await expect(trimImages([file])).rejects.toThrow(PackagingError);
  });
});
