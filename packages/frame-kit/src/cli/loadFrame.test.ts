import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { walkAssets } from "../manifest/walk.js";
import { FrameSchema } from "../schema/frame.js";
import { devUrlToFile } from "./devUrl.js";
import {
  type FrameServer,
  loadFrameExport,
  startFrameServer,
} from "./loadFrame.js";

const fixture = path.resolve(import.meta.dirname, "__fixtures__/simple-frame");

describe("loading a frame through Vite", () => {
  let frameServer: FrameServer;

  beforeAll(async () => {
    frameServer = await startFrameServer(fixture);
  }, 60_000);

  afterAll(async () => {
    await frameServer.close();
  });

  it("returns the named export", async () => {
    const exported = await loadFrameExport(
      frameServer,
      path.join(fixture, "index.ts"),
      "simpleFrame",
    );
    expect(FrameSchema.safeParse(exported)).toMatchObject({ success: true });
  });

  it("explains what a module exports when the name is wrong", async () => {
    await expect(
      loadFrameExport(frameServer, path.join(fixture, "index.ts"), "nope"),
    ).rejects.toThrow(/has no export named "nope".*simpleFrame/s);
  });

  it("resolves every asset back to a real file", async () => {
    const frame = FrameSchema.parse(
      await loadFrameExport(
        frameServer,
        path.join(fixture, "index.ts"),
        "simpleFrame",
      ),
    );
    const assets = walkAssets(FrameSchema, JSON.parse(JSON.stringify(frame)));
    expect(assets.length).toBeGreaterThan(0);
    for (const { url } of assets) {
      const file = devUrlToFile(url, frameServer.root, frameServer.base);
      expect(existsSync(file), `${url} -> ${file}`).toBe(true);
    }
  });

  // Vite inlines assets under its limit as data URLs in serve mode, not just
  // at build time. Without `assetsInlineLimit: 0` this SVG would come back as
  // `data:image/svg+xml,...` and there would be no file to put in the bundle.
  it("keeps a small SVG a file instead of inlining it", async () => {
    const frame = FrameSchema.parse(
      await loadFrameExport(
        frameServer,
        path.join(fixture, "index.ts"),
        "simpleFrame",
      ),
    );
    const pinlines = frame.config.layouts.normal?.masks?.pinlines;
    expect(pinlines).toBeDefined();
    expect(pinlines).not.toMatch(/^data:/);
    expect(
      existsSync(
        devUrlToFile(pinlines ?? "", frameServer.root, frameServer.base),
      ),
    ).toBe(true);
  });
});
