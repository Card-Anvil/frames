/**
 * Trimming: cutting full-sheet art down to the part of it that draws.
 *
 * Frame art is authored on the full 3264 × 4440 sheet so that it lines up by
 * itself, but much of it covers a sliver of that: a Saga banner is under 5% of
 * its sheet. A renderer decodes, caches and composites every pixel of an image,
 * transparent or not, so the empty rest costs memory and time on every card.
 * Trimmed, the image keeps only that sliver, and the frame records where it
 * sits on the sheet.
 *
 * Nothing about how the art looks changes: the pixels kept are byte-for-byte
 * the same, and the chunks that tell a decoder how to show them (colour
 * profile, gamma) are carried over. A trimmed image also records its own
 * position in an `oFFs` chunk, so trimming it again still reports where it
 * sits on the sheet rather than in itself.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

import { PackagingError } from "./errors.js";

/** A rectangle in pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Decoded pixels, four bytes (RGBA) a pixel, row after row. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * The smallest rectangle holding every pixel that is not fully transparent,
 * or `undefined` when the image has none.
 */
export function opaqueBounds({
  width,
  height,
  data,
}: Pixels): Rect | undefined {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] !== 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = y;
      }
    }
  }
  return right < 0
    ? undefined
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** The smallest rectangle holding all of `rects`, or `undefined` for none. */
export function unionBounds(rects: readonly Rect[]): Rect | undefined {
  if (rects.length === 0) {
    return undefined;
  }
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** `pixels` cut down to `rect`, which must lie inside them. */
export function cropPixels(pixels: Pixels, rect: Rect): Pixels {
  const data = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    const from = ((rect.y + y) * pixels.width + rect.x) * 4;
    data.set(
      pixels.data.subarray(from, from + rect.width * 4),
      y * rect.width * 4,
    );
  }
  return { width: rect.width, height: rect.height, data };
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

interface Chunk {
  type: string;
  /** The whole chunk: length, type, data and CRC. */
  bytes: Buffer;
  data: Buffer;
}

/** Splits a PNG file into its chunks, without decoding any. */
function readChunks(file: Buffer): Chunk[] {
  const chunks: Chunk[] = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= file.length) {
    const length = file.readUInt32BE(offset);
    const end = offset + 12 + length;
    chunks.push({
      type: file.toString("latin1", offset + 4, offset + 8),
      bytes: file.subarray(offset, end),
      data: file.subarray(offset + 8, offset + 8 + length),
    });
    offset = end;
  }
  return chunks;
}

/**
 * Chunks that change how a decoder shows the pixels — colour profile, gamma,
 * chromaticities, significant bits, colour space — plus the pixel density.
 * The encoder writes none of them, and a browser drawing the art honours
 * every one, so each is copied from the original.
 */
const KEPT_CHUNKS = new Set([
  "cHRM",
  "cICP",
  "gAMA",
  "iCCP",
  "mDCV",
  "cLLI",
  "sBIT",
  "sRGB",
  "pHYs",
]);

/** Where an image sits on its sheet, from an `oFFs` chunk in pixels. */
function readOffset(chunks: readonly Chunk[]): { x: number; y: number } {
  const offs = chunks.find((chunk) => chunk.type === "oFFs");
  // Unit 0 is pixels; a micrometre offset is someone else's and is ignored.
  if (offs?.data.length === 9 && offs.data[8] === 0) {
    return { x: offs.data.readInt32BE(0), y: offs.data.readInt32BE(4) };
  }
  return { x: 0, y: 0 };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeAndData.copy(out, 4);
  out.writeUInt32BE(crc32(typeAndData), 8 + data.length);
  return out;
}

function offsetChunk(x: number, y: number): Buffer {
  const data = Buffer.alloc(9);
  data.writeInt32BE(x, 0);
  data.writeInt32BE(y, 4);
  data.writeUInt8(0, 8);
  return chunk("oFFs", data);
}

/**
 * Encodes `pixels` as an RGBA PNG carrying `original`'s display chunks and an
 * `oFFs` chunk at `at`. All of them go straight after the header, which is
 * before any palette or image data, as the format requires.
 */
function encode(
  pixels: Pixels,
  original: readonly Chunk[],
  at: { x: number; y: number },
): Buffer {
  const png = new PNG({ width: pixels.width, height: pixels.height });
  png.data = Buffer.from(
    pixels.data.buffer,
    pixels.data.byteOffset,
    pixels.data.byteLength,
  );
  const encoded = PNG.sync.write(png, { colorType: 6 });
  const [header, ...rest] = readChunks(encoded);
  if (!header) {
    throw new Error("the PNG encoder wrote no header");
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    header.bytes,
    ...original.filter((c) => KEPT_CHUNKS.has(c.type)).map((c) => c.bytes),
    offsetChunk(at.x, at.y),
    ...rest.map((c) => c.bytes),
  ]);
}

interface Source {
  file: string;
  bytes: Buffer;
  chunks: Chunk[];
  pixels: Pixels;
  /** Where the image already sits on its sheet, if it was trimmed before. */
  offset: { x: number; y: number };
  bounds: Rect | undefined;
}

async function readSource(file: string): Promise<Source> {
  const bytes = await readFile(file);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new PackagingError(
      `${file} is not a PNG. Only PNGs have transparency to trim.`,
    );
  }
  const chunks = readChunks(bytes);
  // Decoding scales 16 bits down to 8, so writing it back would lose detail.
  const header = chunks[0];
  if (header?.type === "IHDR" && header.data[8] === 16) {
    throw new PackagingError(
      `${file} has 16 bits a channel. Trimming keeps pixels exactly, which ` +
        "it can only do for 8-bit images.",
    );
  }
  const png = PNG.sync.read(bytes);
  const pixels = { width: png.width, height: png.height, data: png.data };
  return {
    file,
    bytes,
    chunks,
    pixels,
    offset: readOffset(chunks),
    bounds: opaqueBounds(pixels),
  };
}

export interface TrimOptions {
  /**
   * Cut every image to one rectangle: the smallest holding all of their
   * visible pixels. They must all be the same size, and they then share one
   * position on the sheet — which is what images drawn together, such as a
   * banner and the masks cut from it, need.
   */
  shared?: boolean;
  /**
   * Where trimmed images are written, under their own names. Without it each
   * one replaces its original.
   */
  outDir?: string;
  /** Work everything out but write nothing. */
  dryRun?: boolean;
}

export interface TrimmedImage {
  file: string;
  /** Where it was written; `undefined` when nothing was. */
  written: string | undefined;
  /** Its size before trimming. */
  width: number;
  height: number;
  /**
   * The part kept, with `x` and `y` on the sheet. `undefined` when the image
   * has no visible pixel, and is left as it was.
   */
  kept: Rect | undefined;
}

export interface TrimResult {
  images: TrimmedImage[];
  /** With `shared`: the one rectangle every image was cut to, on the sheet. */
  shared: Rect | undefined;
}

/**
 * Trims each PNG in `files` to its visible pixels, or with `shared` all of
 * them to one rectangle, and reports where each now sits on its sheet. An
 * image already as small as it can be is not rewritten.
 */
export async function trimImages(
  files: readonly string[],
  options: TrimOptions = {},
): Promise<TrimResult> {
  const sources = await Promise.all(files.map((file) => readSource(file)));

  let shared: Rect | undefined;
  if (options.shared) {
    const [first] = sources;
    const mismatched = sources.find(
      (s) =>
        first &&
        (s.pixels.width !== first.pixels.width ||
          s.pixels.height !== first.pixels.height ||
          s.offset.x !== first.offset.x ||
          s.offset.y !== first.offset.y),
    );
    if (first && mismatched) {
      throw new PackagingError(
        `--shared needs images of one size at one place on the sheet, but ` +
          `${mismatched.file} is ${String(mismatched.pixels.width)} × ` +
          `${String(mismatched.pixels.height)} at ` +
          `(${String(mismatched.offset.x)}, ${String(mismatched.offset.y)}) ` +
          `and ${first.file} is ${String(first.pixels.width)} × ` +
          `${String(first.pixels.height)} at ` +
          `(${String(first.offset.x)}, ${String(first.offset.y)}).`,
      );
    }
    shared = unionBounds(sources.flatMap((s) => (s.bounds ? [s.bounds] : [])));
  }

  const images = await Promise.all(
    sources.map(async (source): Promise<TrimmedImage> => {
      const crop = options.shared ? shared : source.bounds;
      const { width, height } = source.pixels;
      const onSheet = crop && {
        ...crop,
        x: source.offset.x + crop.x,
        y: source.offset.y + crop.y,
      };
      const unchanged =
        !crop ||
        (crop.x === 0 &&
          crop.y === 0 &&
          crop.width === width &&
          crop.height === height);
      if (unchanged || options.dryRun) {
        return {
          file: source.file,
          written: undefined,
          width,
          height,
          kept: onSheet,
        };
      }
      const target = options.outDir
        ? path.join(options.outDir, path.basename(source.file))
        : source.file;
      await writeFile(
        target,
        encode(cropPixels(source.pixels, crop), source.chunks, onSheet ?? crop),
      );
      return {
        file: source.file,
        written: target,
        width,
        height,
        kept: onSheet,
      };
    }),
  );

  return {
    images,
    shared: shared && {
      ...shared,
      x: (sources[0]?.offset.x ?? 0) + shared.x,
      y: (sources[0]?.offset.y ?? 0) + shared.y,
    },
  };
}
