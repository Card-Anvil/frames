import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateFrames } from "./api.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** A frame body with `ART` substituted into every asset position. */
function frameSource(art: string): string {
  return `
import w from "./w.png";
export const theFrame = {
  name: "Temp", description: "d", previewImage: w, tags: [],
  config: { layouts: { normal: {
    boxes: {
      art: { x: 0, y: 0, width: 1, height: 1 },
      mana: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      title: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      type: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
      setSymbol: { x: 0, y: 0, width: 1, height: 1 },
    },
    frameAssets: { base: { w: ${art} } },
  } } },
};
`;
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "frame-kit-api-"));
  await mkdir(path.join(root, "one"), { recursive: true });
  await writeFile(path.join(root, "one/w.png"), PNG);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function write(source: string, meta: object = {}): Promise<void> {
  await writeFile(path.join(root, "one/index.ts"), source);
  await writeFile(
    path.join(root, "one/frame.meta.json"),
    JSON.stringify({
      id: "com.example.one",
      export: "theFrame",
      author: { name: "Jane" },
      license: "MIT",
      ...meta,
    }),
  );
}

describe("validateFrames", () => {
  it("accepts a sound frame", async () => {
    await write(frameSource("w"));
    const { reporter, frames } = await validateFrames({ root });
    expect(reporter.toText()).toBe("");
    expect(frames).toHaveLength(1);
    expect(frames[0]?.assets).toHaveLength(1);
  }, 60_000);

  it("reports schema violations with the property path", async () => {
    await write(frameSource("w").replace(`name: "Temp"`, `name: 42`));
    const { reporter, frames } = await validateFrames({ root });
    expect(reporter.ok).toBe(false);
    expect(frames).toHaveLength(0);
    expect(reporter.errors.map((e) => e.path)).toContain("name");
  }, 60_000);

  it("says what a module exports when the descriptor names the wrong one", async () => {
    await write(frameSource("w"), { export: "notThere" });
    const { reporter } = await validateFrames({ root });
    expect(reporter.errors[0]?.message).toMatch(/no export named "notThere"/);
    expect(reporter.errors[0]?.message).toMatch(/theFrame/);
  }, 60_000);

  // A frame has to carry its own art: the bundle is what gets installed, so an
  // asset pointing at someone else's server would simply be missing.
  it("refuses an asset that points somewhere remote", async () => {
    await write(frameSource(`"https://example.com/w.png"`));
    const { reporter } = await validateFrames({ root });
    expect(reporter.ok).toBe(false);
    expect(reporter.errors[0]?.message).toMatch(/ship its own art/);
    expect(reporter.errors[0]?.path).toBe(
      "config.layouts.normal.frameAssets.base.w",
    );
  }, 60_000);

  it("reports when the root holds no frames at all", async () => {
    const empty = await mkdtemp(path.join(tmpdir(), "frame-kit-empty-"));
    try {
      const { reporter } = await validateFrames({ root: empty });
      expect(reporter.errors[0]?.message).toMatch(/no frames found/);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 60_000);

  it("reports an unknown --frame rather than silently checking nothing", async () => {
    await write(frameSource("w"));
    const { reporter } = await validateFrames({ root, only: ["nope"] });
    expect(reporter.errors[0]?.message).toMatch(/no frame named "nope"/);
  }, 60_000);
});
