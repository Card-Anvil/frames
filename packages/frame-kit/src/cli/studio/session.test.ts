import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type StudioSession, startSession } from "./session.js";

let root: string;
let session: StudioSession | undefined;

const BOXES = `import { type CardBoxes } from "@cardanvil/frame-kit";

export const boxes: CardBoxes = {
  art: { x: 144, y: 144, width: 2976, height: 2172 },
  mana: { x: 2600, y: 2446, width: 500, height: 180, fontSize: 82 },
  title: { x: 400, y: 2446, width: 2100, height: 180, fontSize: 82 },
  type: { x: 400, y: 2700, width: 2100, height: 150, fontSize: 64 },
  setSymbol: { x: 2700, y: 2700, width: 300, height: 150 },
};
`;

const INDEX = `import { boxes } from "./boxes";
import * as base from "./base";
import preview from "./preview.png";

export const fixtureFrame = {
  name: "Fixture",
  description: "A fixture frame for the studio session tests.",
  previewImage: preview,
  tags: ["Custom"],
  config: { layouts: { normal: { boxes, frameAssets: { base } } } },
};
`;

// A 1×1 PNG; the loader only needs the file to exist and parse as an image.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "frame-kit-session-"));
  const dir = path.join(root, "frames", "fixture");
  await mkdir(path.join(dir, "base"), { recursive: true });
  await writeFile(
    path.join(dir, "frame.meta.json"),
    JSON.stringify({
      id: "com.example.fixture",
      export: "fixtureFrame",
      author: { name: "Jane" },
      license: "MIT",
    }),
  );
  await writeFile(path.join(dir, "boxes.ts"), BOXES);
  await writeFile(path.join(dir, "index.ts"), INDEX);
  await writeFile(path.join(dir, "preview.png"), PNG);
  await writeFile(path.join(dir, "base", "w.png"), PNG);
  await writeFile(
    path.join(dir, "base", "index.ts"),
    `export { default as w } from "./w.png";\n`,
  );
});

afterEach(async () => {
  await session?.close();
  session = undefined;
  await rm(root, { recursive: true, force: true });
});

describe("startSession", () => {
  it("loads a frame and describes its box sets", async () => {
    session = await startSession(root);
    const entry = session.get("fixture");

    expect(session.list().map((frame) => frame.slug)).toEqual(["fixture"]);
    expect(entry?.payload.canvas).toEqual({ width: 3264, height: 4440 });
    expect(
      entry?.payload.slots.map((slot) => `${slot.layout}.${slot.key}`).sort(),
    ).toEqual(["normal.boxes", "normal.frameAssets"]);
    expect(entry?.payload.stale).toBe(false);
  });

  it("rewrites asset URLs to the studio's own endpoint", async () => {
    session = await startSession(root);
    const frame = session.get("fixture")?.payload.frame as {
      config: { layouts: { normal: { frameAssets: { base: { w: string } } } } };
    };
    expect(frame.config.layouts.normal.frameAssets.base.w).toMatch(
      /^\/api\/asset\?u=/,
    );
  });

  it("reports the source files the frame was built from", async () => {
    session = await startSession(root);
    expect(session.get("fixture")?.payload.sourceFiles).toEqual(
      expect.arrayContaining([
        "frames/fixture/boxes.ts",
        "frames/fixture/index.ts",
      ]),
    );
  });

  // An author mid-save produces a syntax error on almost every keystroke.
  // Blanking the canvas each time would make the studio unusable, so the last
  // good payload is kept and flagged instead.
  it("keeps the last good frame when the source stops parsing", async () => {
    session = await startSession(root);
    const before = session.get("fixture")?.payload.frame;

    await writeFile(
      path.join(root, "frames", "fixture", "boxes.ts"),
      "export const boxes: CardBoxes = { this is not valid typescript",
    );
    await session.reload();

    const after = session.get("fixture");
    expect(after?.payload.stale).toBe(true);
    expect(after?.payload.frame).toEqual(before);
    expect(after?.payload.staleProblems?.length ?? 0).toBeGreaterThan(0);
  });

  it("recovers once the source parses again", async () => {
    session = await startSession(root);
    const file = path.join(root, "frames", "fixture", "boxes.ts");

    await writeFile(file, "export const boxes = { broken");
    await session.reload();
    expect(session.get("fixture")?.payload.stale).toBe(true);

    await writeFile(file, BOXES.replace("x: 400,", "x: 512,"));
    await session.reload();

    const entry = session.get("fixture");
    expect(entry?.payload.stale).toBe(false);
    const frame = entry?.payload.frame as {
      config: { layouts: { normal: { boxes: { title: { x: number } } } } };
    };
    expect(frame.config.layouts.normal.boxes.title.x).toBe(512);
  });

  it("bumps the revision on every successful reload", async () => {
    session = await startSession(root);
    const first = session.get("fixture")?.payload.revision ?? 0;
    await session.reload();
    expect(session.get("fixture")?.payload.revision).toBeGreaterThan(first);
  });
});
