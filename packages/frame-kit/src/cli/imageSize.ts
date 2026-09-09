import { open } from "node:fs/promises";

export interface ImageSize {
  width: number;
  height: number;
}

/** Enough for a PNG header and for the SOF marker of any sane JPEG. */
const HEADER_BYTES = 64 * 1024;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Reads the pixel dimensions of a PNG or JPEG from its header.
 *
 * Hand-rolled rather than pulled from a dependency because it is a few dozen
 * bytes of well-specified header and this runs in every author's CI. Returns
 * `undefined` for anything it does not understand — dimensions are a nicety
 * for a browse UI, never a reason to fail a build.
 */
export async function readImageSize(
  file: string,
): Promise<ImageSize | undefined> {
  let handle;
  try {
    handle = await open(file, "r");
    const buffer = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
    const header = buffer.subarray(0, bytesRead);
    return readPng(header) ?? readJpeg(header);
  } catch {
    return undefined;
  } finally {
    await handle?.close();
  }
}

/** IHDR is always the first chunk: signature (8) + length (4) + type (4). */
function readPng(header: Buffer): ImageSize | undefined {
  if (header.length < 24 || !header.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return undefined;
  }
  if (header.subarray(12, 16).toString("latin1") !== "IHDR") {
    return undefined;
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

/**
 * Walks the JPEG marker chain to the start-of-frame, which carries the size.
 * Every other marker is a length-prefixed segment to skip over.
 */
function readJpeg(header: Buffer): ImageSize | undefined {
  if (header.length < 4 || header.readUInt16BE(0) !== 0xffd8) {
    return undefined;
  }
  let offset = 2;
  while (offset + 9 < header.length) {
    if (header[offset] !== 0xff) {
      return undefined; // out of sync with the marker chain
    }
    const marker = header[offset + 1];
    if (marker === undefined) {
      return undefined;
    }
    // SOF0-SOF15 carry the frame header; C4, C8 and CC are other things.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: header.readUInt16BE(offset + 5),
        width: header.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + header.readUInt16BE(offset + 2);
  }
  return undefined;
}
