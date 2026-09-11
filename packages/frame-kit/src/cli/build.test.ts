import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FrameManifestSchema } from "../manifest/contract.js";
import { buildFrames } from "./build.js";
import { FrameIndexSchema } from "./frameIndex.js";
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
  const { frames: built, index } = await buildFrames(
    { root, outDir: out, version },
    reporter,
  );
  return { reporter, built, index };
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
    const b = await readFile(second.frames[0]?.bundleFile ?? "");
    expect(a.equals(b)).toBe(true);
  }, 60_000);

  it("refuses a version that is not one", async () => {
    await expect(build("not-a-version")).rejects.toThrow(/is not a version/);
  }, 60_000);
});

describe("the release index", () => {
  it("is written next to the bundles and parses as an index", async () => {
    const { index } = await build();
    const onDisk: unknown = JSON.parse(
      await readFile(path.join(out, "frame-index.json"), "utf8"),
    );
    expect(FrameIndexSchema.safeParse(onDisk)).toMatchObject({ success: true });
    expect(index?.app).toBe("card-anvil");
    expect(index?.kind).toBe("frame-index");
    expect(index?.version).toBe("1.2.3");
  }, 60_000);

  it("describes the frame well enough to browse without downloading it", async () => {
    const { index } = await build();
    const entry = index?.frames[0];
    expect(entry).toMatchObject({
      id: "com.example.one",
      slug: "one",
      name: "One",
      license: "MIT",
      layouts: ["normal"],
      assetCount: 2,
    });
    expect(entry?.author.url).toBe("https://example.com");
    // Declared nowhere, so it falls back to the contract's canvas.
    expect(entry?.canvas).toEqual({ width: 3264, height: 4440 });
  }, 60_000);

  it("checksums the bundle itself, not its contents", async () => {
    const { built, index } = await build();
    const bundle = await readFile(built[0]?.bundleFile ?? "");
    const digest = createHash("sha256").update(bundle).digest("hex");
    expect(index?.frames[0]?.bundle.sha256).toBe(digest);
    expect(index?.frames[0]?.bundle.bytes).toBe(bundle.length);
  }, 60_000);

  it("copies the preview out so a browse UI can show it", async () => {
    const { index } = await build();
    const preview = index?.frames[0]?.preview;
    expect(preview?.file).toBe("one-1.2.3.preview.png");
    expect(preview?.width).toBe(1);
    expect(preview?.height).toBe(1);
    await expect(
      readFile(path.join(out, preview?.file ?? "")),
    ).resolves.toBeInstanceOf(Buffer);
  }, 60_000);

  // A local build has no release to point at, so it names files and stops
  // there. The index is still valid — that is what makes local builds useful.
  it("omits urls and the source block when there is no release", async () => {
    const { index } = await build();
    expect(index?.source).toBeUndefined();
    expect(index?.frames[0]?.bundle.url).toBeUndefined();
    expect(index?.frames[0]?.preview.url).toBeUndefined();
  }, 60_000);

  it("adds download urls and the stable index url when given a release", async () => {
    const reporter = new Reporter();
    const { index } = await buildFrames(
      {
        root,
        outDir: out,
        version: "1.2.3",
        source: { repository: "jane/frames", tag: "v1.2.3" },
      },
      reporter,
    );
    expect(index?.source?.latestIndexUrl).toBe(
      "https://github.com/jane/frames/releases/latest/download/frame-index.json",
    );
    expect(index?.frames[0]?.bundle.url).toBe(
      "https://github.com/jane/frames/releases/download/v1.2.3/one-1.2.3.cardframe",
    );
  }, 60_000);
});

describe("private frames", () => {
  /** A second, well-formed frame that says it is not for shipping. */
  const addPrivateFrame = async (slug = "two") => {
    await mkdir(path.join(root, slug), { recursive: true });
    await writeFile(path.join(root, slug, "a.png"), PNG_A);
    await writeFile(path.join(root, slug, "b.png"), PNG_B);
    await writeFile(
      path.join(root, slug, "frame.meta.json"),
      JSON.stringify({
        id: `com.example.${slug}`,
        private: true,
        export: "theFrame",
        author: { name: "Jane" },
        license: "MIT",
      }),
    );
    await writeFile(
      path.join(root, slug, "index.ts"),
      `
import a from "./a.png";
import b from "./b.png";
export const theFrame = {
  name: "Two", description: "d", previewImage: b, tags: ["T"],
  config: { layouts: { normal: {
    boxes: {
      art: { x: 0, y: 0, width: 1, height: 1 },
      mana: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      title: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      type: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      setSymbol: { x: 0, y: 0, width: 1, height: 1 },
    },
    frameAssets: { base: { w: a } },
  } } },
};
`,
    );
  };

  it("packs no bundle and claims no row in the index", async () => {
    await addPrivateFrame();
    const { reporter, built, index } = await build();
    expect(reporter.toText()).toBe("");
    expect(built.map((frame) => frame.loaded.discovered.slug)).toEqual(["one"]);
    expect(index?.frames.map((frame) => frame.slug)).toEqual(["one"]);
    await expect(
      readFile(path.join(out, "two-1.2.3.cardframe")),
    ).rejects.toThrow();
  }, 60_000);

  it("is reported as skipped rather than silently dropped", async () => {
    await addPrivateFrame();
    const { built } = await build();
    const { skipped } = await buildFrames(
      { root, outDir: path.join(root, "out2"), version: "1.2.3" },
      new Reporter(),
    );
    expect(built).toHaveLength(1);
    expect(skipped.map((frame) => frame.discovered.slug)).toEqual(["two"]);
  }, 60_000);

  // The whole point of skipping at build rather than at discovery: a frame
  // nobody ships is still held to the contract, so it cannot quietly rot.
  it("is still checked, and its problems still fail the run", async () => {
    await addPrivateFrame();
    await rm(path.join(root, "two/a.png"));
    const { reporter, built } = await build();
    expect(built).toHaveLength(1);
    expect(reporter.ok).toBe(false);
    expect(reporter.toText()).toMatch(/two/);
  }, 60_000);

  it("warns when it is the frame that was asked for by name", async () => {
    await addPrivateFrame();
    const reporter = new Reporter();
    const { frames, index } = await buildFrames(
      { root, outDir: out, version: "1.2.3", only: ["two"] },
      reporter,
    );
    expect(frames).toEqual([]);
    expect(index).toBeUndefined();
    expect(reporter.ok).toBe(true); // a warning, not a failure
    expect(reporter.toText()).toMatch(/two — is private, so it was not built/);
  }, 60_000);

  it("writes no index at all when every frame is private", async () => {
    await rm(path.join(root, "one"), { recursive: true });
    await addPrivateFrame();
    const { built, index } = await build();
    expect(built).toEqual([]);
    expect(index).toBeUndefined();
    await expect(
      readFile(path.join(out, "frame-index.json")),
    ).rejects.toThrow();
  }, 60_000);
});
