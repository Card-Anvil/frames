import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discoverFrames, relativePosix } from "./discover.js";
import { Reporter } from "./report.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "frame-kit-discover-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function frame(dir: string, meta: unknown): Promise<void> {
  await mkdir(path.join(root, dir), { recursive: true });
  await writeFile(
    path.join(root, dir, "frame.meta.json"),
    typeof meta === "string" ? meta : JSON.stringify(meta),
  );
}

const valid = (id: string) => ({
  id,
  author: { name: "Jane" },
  license: "MIT",
});

describe("discoverFrames", () => {
  it("finds frames anywhere under the root, in a stable order", async () => {
    await frame("packages/beta", valid("com.example.beta"));
    await frame("alpha", valid("com.example.alpha"));
    const reporter = new Reporter();
    const found = await discoverFrames(root, reporter);
    expect(found.map((f) => f.slug)).toEqual(["alpha", "beta"]);
    expect(reporter.ok).toBe(true);
  });

  it("defaults the slug to the directory name and honours an explicit one", async () => {
    await frame("frame-m15", { ...valid("com.example.m15"), slug: "m15" });
    await frame("plain", valid("com.example.plain"));
    const found = await discoverFrames(root, new Reporter());
    expect(found.map((f) => f.slug).sort()).toEqual(["m15", "plain"]);
  });

  it("resolves entry relative to the descriptor", async () => {
    await frame("a", { ...valid("com.example.a"), entry: "./src/index.ts" });
    const [found] = await discoverFrames(root, new Reporter());
    expect(found?.entryFile).toBe(path.resolve(root, "a/src/index.ts"));
  });

  it("never walks into node_modules, dist or fixtures", async () => {
    await frame("node_modules/pkg", valid("com.example.dep"));
    await frame("dist/out", valid("com.example.built"));
    await frame("src/__fixtures__/f", valid("com.example.fixture"));
    await frame("real", valid("com.example.real"));
    const found = await discoverFrames(root, new Reporter());
    expect(found.map((f) => f.slug)).toEqual(["real"]);
  });

  describe("reporting", () => {
    it("names the file when the descriptor is not JSON", async () => {
      await frame("broken", "{ not json");
      const reporter = new Reporter();
      await discoverFrames(root, reporter);
      expect(reporter.ok).toBe(false);
      expect(reporter.errors[0]?.file).toBe("broken/frame.meta.json");
      expect(reporter.errors[0]?.message).toMatch(/not valid JSON/);
    });

    // One run should tell an author everything, not one thing at a time.
    it("reports every schema problem at once", async () => {
      await frame("bad", { id: "NotReverseDNS", license: "MIT" });
      const reporter = new Reporter();
      await discoverFrames(root, reporter);
      expect(reporter.errors.length).toBeGreaterThanOrEqual(2);
      expect(reporter.errors.map((e) => e.path)).toContain("id");
      expect(reporter.errors.map((e) => e.path)).toContain("author");
    });

    it("flags both sides of a duplicate id", async () => {
      await frame("one", valid("com.example.same"));
      await frame("two", valid("com.example.same"));
      const reporter = new Reporter();
      await discoverFrames(root, reporter);
      expect(reporter.errors).toHaveLength(2);
      expect(
        reporter.errors.every((e) => e.message.includes("permanent identity")),
      ).toBe(true);
    });

    it("flags a duplicate slug, which would collide as a filename", async () => {
      await frame("a", { ...valid("com.example.a"), slug: "shared" });
      await frame("b", { ...valid("com.example.b"), slug: "shared" });
      const reporter = new Reporter();
      await discoverFrames(root, reporter);
      expect(reporter.errors).toHaveLength(2);
      expect(reporter.errors[0]?.message).toMatch(/names the bundle file/);
    });
  });
});

describe("relativePosix", () => {
  it("uses forward slashes whatever the platform", () => {
    const file = path.join(root, "a", "b", "c.json");
    expect(relativePosix(root, file)).toBe("a/b/c.json");
  });
});
