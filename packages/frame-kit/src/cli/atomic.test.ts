import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  copyFileAtomic,
  writeFileAtomic,
  writeStreamAtomic,
} from "./atomic.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "frame-kit-atomic-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const at = (name: string) => path.join(dir, name);

describe("writeFileAtomic", () => {
  it("writes the content", async () => {
    await writeFileAtomic(at("a.json"), "hello");
    expect(await readFile(at("a.json"), "utf8")).toBe("hello");
  });

  it("replaces an existing file", async () => {
    await writeFile(at("a.json"), "old");
    await writeFileAtomic(at("a.json"), "new");
    expect(await readFile(at("a.json"), "utf8")).toBe("new");
  });

  it("leaves no temp file behind", async () => {
    await writeFileAtomic(at("a.json"), "hello");
    expect(await readdir(dir)).toEqual(["a.json"]);
  });
});

describe("writeStreamAtomic", () => {
  it("writes the stream and reports the byte count", async () => {
    const bytes = await writeStreamAtomic(
      at("a.bin"),
      Readable.from([Buffer.from("abc"), Buffer.from("de")]),
    );
    expect(bytes).toBe(5);
    expect(await readFile(at("a.bin"), "utf8")).toBe("abcde");
  });

  // The reason this module exists: a reader watching the directory must never
  // see a partial file, and a failed write must not leave one either.
  it("removes the temp file and leaves the target untouched when the stream fails", async () => {
    await writeFile(at("a.bin"), "original");
    const failing = new Readable({
      read() {
        this.destroy(new Error("stream blew up"));
      },
    });
    await expect(writeStreamAtomic(at("a.bin"), failing)).rejects.toThrow(
      "stream blew up",
    );
    expect(await readFile(at("a.bin"), "utf8")).toBe("original");
    expect(await readdir(dir)).toEqual(["a.bin"]);
  });
});

describe("copyFileAtomic", () => {
  it("copies and leaves nothing behind", async () => {
    await writeFile(at("src.png"), "bytes");
    await copyFileAtomic(at("src.png"), at("dest.png"));
    expect(await readFile(at("dest.png"), "utf8")).toBe("bytes");
    expect((await readdir(dir)).sort()).toEqual(["dest.png", "src.png"]);
  });

  it("fails without creating the destination when the source is missing", async () => {
    await expect(
      copyFileAtomic(at("nope.png"), at("dest.png")),
    ).rejects.toThrow();
    expect(await readdir(dir)).toEqual([]);
  });
});
