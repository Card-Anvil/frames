import { describe, expect, it } from "vitest";
import { z } from "zod";

import { FrameSchema } from "../schema/frame.js";
import { CONTRACT_VERSION } from "./contract.js";
import { manifestToFrame } from "./deserialize.js";
import { type PackagedAsset, frameToManifest } from "./serialize.js";
import { SHARED_URL, testFrame } from "./testFrame.js";
import { formatPath, walkAssets } from "./walk.js";

/** Stand-in for the packaging step: content-addresses by URL, no filesystem. */
function packager() {
  const assigned = new Map<string, PackagedAsset>();
  let n = 0;
  return (url: string): PackagedAsset => {
    const existing = assigned.get(url);
    if (existing) {
      return existing;
    }
    const ext = url.slice(url.lastIndexOf("."));
    n += 1;
    const packaged: PackagedAsset = {
      path: `assets/file-${String(n)}${ext}`,
      bytes: url.length,
      sha256: `hash-${String(n)}`,
    };
    assigned.set(url, packaged);
    return packaged;
  };
}

const build = () =>
  frameToManifest(testFrame, {
    id: "com.example.test",
    version: "1.2.3",
    generator: "@cardanvil/frame-kit@test",
    resolveAsset: packager(),
  });

describe("frameToManifest", () => {
  it("stamps the contract version and kind", () => {
    const m = build();
    expect(m.contractVersion).toBe(CONTRACT_VERSION);
    expect(m.kind).toBe("declarative");
    expect(m.id).toBe("com.example.test");
    expect(m.version).toBe("1.2.3");
  });

  it("rewrites every asset position to a package-relative path", () => {
    const m = build();
    for (const { url } of walkAssets(FrameSchema, m.frame)) {
      expect(url).toMatch(/^assets\//);
    }
  });

  it("deduplicates a URL used in several positions", () => {
    const m = build();
    const base = m.frame.config.layouts.normal?.frameAssets.base;
    // w and u shared one source URL, so they must land on one packaged file.
    expect(base?.w).toBe(base?.u);
    expect(base?.w).not.toBe(base?.b);
    // 5 distinct source URLs across 6 positions.
    expect(m.assets).toHaveLength(5);
  });

  it("lists assets sorted, so the manifest is stable across builds", () => {
    const paths = build().assets.map((a) => a.path);
    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b)));
  });

  it("carries the licence when one is declared", () => {
    const m = frameToManifest(testFrame, {
      id: "com.example.test",
      version: "1.2.3",
      license: "CC-BY-4.0",
      resolveAsset: packager(),
    });
    expect(m.license).toBe("CC-BY-4.0");
    // It survives a load, so an installed frame carries it with it.
    expect(manifestToFrame(m, { resolveUrl: (p) => p })).toBeTruthy();
  });

  it("omits the licence key when none is declared", () => {
    expect("license" in build()).toBe(false);
  });

  it("leaves the authored frame untouched", () => {
    build();
    expect(testFrame.previewImage).toBe("/src/frames/preview.jpg");
    expect(testFrame.config.layouts.normal?.frameAssets.base.w).toBe(
      SHARED_URL,
    );
  });
});

/** The fixture's one real layout config, to stand in for any layout key. */
function known(): unknown {
  const normal = build().frame.config.layouts.normal;
  if (!normal) {
    throw new Error("fixture lost its normal layout");
  }
  return normal;
}

/** A manifest whose layout maps are exactly what the caller passes. */
function manifestWithLayouts(
  extraLayouts: Record<string, unknown>,
  alternateLayouts?: Record<string, Record<string, unknown>>,
): unknown {
  const base = build();
  return {
    ...base,
    frame: {
      ...base.frame,
      config: {
        ...base.frame.config,
        layouts: { normal: known(), ...extraLayouts },
        ...(alternateLayouts ? { alternateLayouts } : {}),
      },
    },
  };
}

/** Reads a manifest's layout map back out without trusting its type. */
function layoutsOf(manifest: unknown): Record<string, unknown> {
  const record = z
    .object({
      frame: z.object({
        config: z.object({ layouts: z.record(z.string(), z.unknown()) }),
      }),
    })
    .parse(manifest);
  return record.frame.config.layouts;
}

describe("manifestToFrame", () => {
  it("round-trips back to the original URLs", () => {
    const resolve = packager();
    const manifest = frameToManifest(testFrame, {
      id: "com.example.test",
      version: "1.2.3",
      resolveAsset: resolve,
    });
    // Invert the packaging map to play the loader's part.
    const back = new Map(
      walkAssets(FrameSchema, testFrame).map((a) => [
        resolve(a.url).path,
        a.url,
      ]),
    );
    const frame = manifestToFrame(manifest, {
      resolveUrl: (path) => back.get(path) ?? `unresolved:${path}`,
    });
    expect(frame).toEqual(testFrame);
  });

  it("warns when the manifest targets a newer minor contract", () => {
    const reasons: string[] = [];
    manifestToFrame(
      { ...build(), contractVersion: "1.99" },
      { resolveUrl: (p) => p, onDegraded: (r) => reasons.push(r) },
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/reduced fidelity/);
  });

  it("refuses a different major", () => {
    expect(() =>
      manifestToFrame(
        { ...build(), contractVersion: "2.0" },
        { resolveUrl: (p) => p },
      ),
    ).toThrow(/not supported/);
  });

  it("refuses a non-declarative kind", () => {
    expect(() =>
      manifestToFrame({ ...build(), kind: "code" }, { resolveUrl: (p) => p }),
    ).toThrow(/only loads "declarative"/);
  });

  it("drops a layout this build does not know about", () => {
    const reasons: string[] = [];
    const frame = manifestToFrame(manifestWithLayouts({ hologram: known() }), {
      resolveUrl: (p) => p,
      onDegraded: (r) => reasons.push(r),
    });
    expect(Object.keys(frame.config.layouts)).toEqual(["normal"]);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/hologram/);
  });

  it("drops an unknown layout from an alternate variant", () => {
    const reasons: string[] = [];
    const frame = manifestToFrame(
      manifestWithLayouts(
        {},
        { showcase: { normal: known(), hologram: known() } },
      ),
      { resolveUrl: (p) => p, onDegraded: (r) => reasons.push(r) },
    );
    expect(Object.keys(frame.config.alternateLayouts?.showcase ?? {})).toEqual([
      "normal",
    ]);
    expect(reasons[0]).toMatch(/hologram/);
  });

  it("leaves the caller's manifest untouched when it drops a layout", () => {
    const manifest = manifestWithLayouts({ hologram: known() });
    manifestToFrame(manifest, { resolveUrl: (p) => p });
    expect(Object.keys(layoutsOf(manifest))).toEqual(["normal", "hologram"]);
  });

  it("says nothing when every layout is known", () => {
    const reasons: string[] = [];
    manifestToFrame(build(), {
      resolveUrl: (p) => p,
      onDegraded: (r) => reasons.push(r),
    });
    expect(reasons).toEqual([]);
  });

  it("reports where a malformed manifest went wrong", () => {
    expect(() =>
      manifestToFrame({ contractVersion: "1.0" }, { resolveUrl: (p) => p }),
    ).toThrow();
  });
});

describe("formatPath", () => {
  it("renders the root readably", () => {
    expect(formatPath([])).toBe("<root>");
  });
});
