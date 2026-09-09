import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  type FrameServer,
  invalidateFrameModules,
  loadFrameExport,
  startFrameServer,
} from "./loadFrame.js";

let root: string;
let frameServer: FrameServer;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "frame-kit-invalidate-"));
  frameServer = await startFrameServer(root);
});
afterEach(async () => {
  await frameServer.close();
  await rm(root, { recursive: true, force: true });
});

const write = (value: string) =>
  writeFile(path.join(root, "mod.ts"), `export const value = ${value};\n`);

describe("invalidateFrameModules", () => {
  // The whole reason watch mode can reuse one server. Without invalidation
  // ssrLoadModule serves the module it loaded first, so an author's edit
  // rebuilds to byte-identical output and the watch loop appears to do
  // nothing at all.
  it("makes the next load see an edit on disk", async () => {
    await write("1");
    const entry = path.join(root, "mod.ts");
    expect(await loadFrameExport(frameServer, entry, "value")).toBe(1);

    await write("2");
    invalidateFrameModules(frameServer);
    expect(await loadFrameExport(frameServer, entry, "value")).toBe(2);
  }, 60_000);

  it("serves the cached module without it, which is what makes this necessary", async () => {
    await write("1");
    const entry = path.join(root, "mod.ts");
    expect(await loadFrameExport(frameServer, entry, "value")).toBe(1);

    await write("2");
    expect(await loadFrameExport(frameServer, entry, "value")).toBe(1);
  }, 60_000);
});
