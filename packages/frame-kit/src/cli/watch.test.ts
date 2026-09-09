import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { slugsFor } from "./watch.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "frame-kit-watch-"));
  for (const slug of ["alpha", "beta"]) {
    await mkdir(path.join(root, "frames", slug, "base"), { recursive: true });
    await writeFile(
      path.join(root, "frames", slug, "frame.meta.json"),
      JSON.stringify({
        id: `com.example.${slug}`,
        author: { name: "Jane" },
        license: "MIT",
      }),
    );
  }
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const at = (...parts: string[]) => path.join(root, ...parts);

describe("slugsFor", () => {
  it("maps a changed file to the frame that owns it", async () => {
    expect(
      await slugsFor(root, [at("frames", "alpha", "base", "w.png")], undefined),
    ).toEqual(["alpha"]);
  });

  it("collects every frame touched by a batch", async () => {
    const slugs = await slugsFor(
      root,
      [at("frames", "alpha", "index.ts"), at("frames", "beta", "index.ts")],
      undefined,
    );
    expect(slugs?.sort()).toEqual(["alpha", "beta"]);
  });

  it("deduplicates several changes to one frame", async () => {
    expect(
      await slugsFor(
        root,
        [at("frames", "alpha", "a.png"), at("frames", "alpha", "b.png")],
        undefined,
      ),
    ).toEqual(["alpha"]);
  });

  // Nothing here knows what depends on a shared module, so the safe answer is
  // everything.
  it("rebuilds everything when a change is outside every frame", async () => {
    expect(
      await slugsFor(root, [at("shared", "boxes.ts")], undefined),
    ).toBeUndefined();
  });

  it("rebuilds everything when a descriptor appears or changes", async () => {
    expect(
      await slugsFor(
        root,
        [at("frames", "gamma", "frame.meta.json")],
        undefined,
      ),
    ).toBeUndefined();
  });

  it("honours an explicit --frame filter", async () => {
    expect(
      await slugsFor(
        root,
        [at("frames", "alpha", "a.png"), at("frames", "beta", "b.png")],
        ["beta"],
      ),
    ).toEqual(["beta"]);
  });

  it("reports nothing to do when the filter excludes every change", async () => {
    expect(
      await slugsFor(root, [at("frames", "alpha", "a.png")], ["beta"]),
    ).toEqual([]);
  });
});
