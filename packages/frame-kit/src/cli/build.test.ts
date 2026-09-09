import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FrameManifestSchema } from "../manifest/contract.js";
import { buildFrames } from "./build.js";
import { Reporter } from "./report.js";

const PNG_A = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_B = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let root: string;
let out: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "frame-kit-build-"));
  out = path.join(root, "out");
  await mkdir(path.join(root, "one"), { recursive: true });
  await writeFile(path.join(root, "one/a.png"), PNG_A);
  await writeFile(path.join(root, "one/b.png"), PNG_B);
  // Same bytes as a.png, different filename: this is what dedup has to collapse.
  await writeFile(path.join(root, "one/copy-of-a.png"), PNG_A);
  await writeFile(
    path.join(root, "one/frame.meta.json"),
    JSON.stringify({
      id: "com.example.one",
      export: "theFrame",
      author: { name: "Jane", url: "https://example.com" },
      license: "MIT",
    }),
  );
  await writeFile(
    path.join(root, "one/index.ts"),
    `
import a from "./a.png";
import b from "./b.png";
import copy from "./copy-of-a.png";
export const theFrame = {
  name: "One", description: "d", previewImage: b, tags: ["T"],
  config: { layouts: { normal: {
    boxes: {
      art: { x: 0, y: 0, width: 1, height: 1 },
      mana: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      title: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      type: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      setSymbol: { x: 0, y: 0, width: 1, height: 1 },
    },
    frameAssets: { base: { w: a, u: copy } },
  } } },
};
`,
  );
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const build = async (version = "1.2.3") => {
  const reporter = new Reporter();
  const built = await buildFrames({ root, outDir: out, version }, reporter);
  return { reporter, built };
};

describe("buildFrames", () => {
  it("writes one bundle per frame, named for the slug and version", async () => {
    const { reporter, built } = await build();
    expect(reporter.toText()).toBe("");
    expect(built).toHaveLength(1);
    expect(built[0]?.bundleName).toBe("one-1.2.3.cardframe");
    expect(built[0]?.bytes).toBeGreaterThan(0);
  }, 60_000);

  it("stamps the descriptor's identity into the manifest", async () => {
    const { built } = await build();
    const manifest = built[0]?.manifest;
    expect(manifest?.id).toBe("com.example.one");
    expect(manifest?.version).toBe("1.2.3");
    expect(manifest?.kind).toBe("declarative");
    expect(manifest?.author?.name).toBe("Jane");
    expect(manifest?.generator).toBeUndefined();
  }, 60_000);

  // Naming an asset after its content is what makes deduplication automatic:
  // two identical files claim the same path with no bookkeeping.
  it("collapses identical assets to one entry", async () => {
    const { built } = await build();
    const manifest = built[0]?.manifest;
    // Three imports, two distinct files.
    expect(manifest?.assets).toHaveLength(2);
    const base = manifest?.frame.config.layouts.normal?.frameAssets.base;
    expect(base?.w).toBe(base?.u);
  }, 60_000);

  it("names every asset after its own hash, and records size and checksum", async () => {
    const { built } = await build();
    for (const asset of built[0]?.manifest.assets ?? []) {
      const { sha256 } = asset;
      expect(sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(asset.path).toBe(`assets/${String(sha256).slice(0, 16)}.png`);
      expect(asset.bytes).toBeGreaterThan(0);
    }
  }, 60_000);

  it("lists assets sorted, so the manifest is stable", async () => {
    const { built } = await build();
    const paths = built[0]?.manifest.assets.map((a) => a.path) ?? [];
    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b)));
  }, 60_000);

  it("produces a manifest that parses as one", async () => {
    const { built } = await build();
    expect(
      FrameManifestSchema.safeParse(
        JSON.parse(JSON.stringify(built[0]?.manifest)),
      ).success,
    ).toBe(true);
  }, 60_000);

  it("produces the same bytes twice", async () => {
    const first = await build();
    const second = await buildFrames(
      { root, outDir: path.join(root, "out2"), version: "1.2.3" },
      new Reporter(),
    );
    const a = await readFile(first.built[0]?.bundleFile ?? "");
    const b = await readFile(second[0]?.bundleFile ?? "");
    expect(a.equals(b)).toBe(true);
  }, 60_000);

  it("refuses a version that is not one", async () => {
    await expect(build("not-a-version")).rejects.toThrow(/is not a version/);
  }, 60_000);
});
