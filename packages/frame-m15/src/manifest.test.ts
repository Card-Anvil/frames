import { describe, expect, it } from "vitest";

import { FrameSchema } from "@cardanvil/frame-kit";
import {
  type PackagedAsset,
  frameToManifest,
  manifestToFrame,
  walkAssets,
} from "@cardanvil/frame-kit/manifest";

import { m15Frame } from "./index";

/**
 * Packages a real frame, not a fixture. M15 is the widest built-in: nested
 * saga and planeswalker layouts, crown variants, and asset sets wired in as
 * module namespace objects rather than plain objects — the case most likely to
 * break a schema walk.
 */
describe("M15 manifest round-trip", () => {
  function pack() {
    const byUrl = new Map<string, PackagedAsset>();
    return (url: string): PackagedAsset => {
      const existing = byUrl.get(url);
      if (existing) {
        return existing;
      }
      const packaged: PackagedAsset = {
        path: `assets/${String(byUrl.size)}${url.slice(url.lastIndexOf("."))}`,
      };
      byUrl.set(url, packaged);
      return packaged;
    };
  }

  it("finds assets through namespace-object asset sets", () => {
    const found = walkAssets(FrameSchema, JSON.parse(JSON.stringify(m15Frame)));
    expect(found.length).toBeGreaterThan(100);
    for (const { url } of found) {
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("serializes and restores the frame unchanged", () => {
    const resolveAsset = pack();
    const manifest = frameToManifest(m15Frame, {
      id: "com.cardanvil.m15",
      version: "0.1.0",
      resolveAsset,
    });

    expect(manifest.assets.length).toBeGreaterThan(0);
    for (const { url } of walkAssets(FrameSchema, manifest.frame)) {
      expect(url).toMatch(/^assets\//);
    }

    const back = new Map(
      walkAssets(FrameSchema, JSON.parse(JSON.stringify(m15Frame))).map(
        (a) => [resolveAsset(a.url).path, a.url] as const,
      ),
    );
    const restored = manifestToFrame(manifest, {
      resolveUrl: (path) => back.get(path) ?? `unresolved:${path}`,
    });

    // Compare against the frame as the *contract* sees it, not as authored.
    // Two normalizations are expected and intended:
    //   - authored asset sets are module namespace objects, which are
    //     structurally equal to plain objects but not `toEqual`-equal;
    //   - some barrels carry keys the schema does not declare (m15's mask
    //     barrels still export the legacy `border`/`frame` entries that
    //     nothing reads), and parsing strips them.
    // Packaging must preserve everything the contract defines, and is free to
    // drop everything it does not.
    expect(restored).toEqual(FrameSchema.parse(m15Frame));
  });
});
