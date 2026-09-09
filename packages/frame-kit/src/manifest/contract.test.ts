import { describe, expect, it } from "vitest";

import {
  CONTRACT_VERSION,
  FrameManifestSchema,
  assertDeclarative,
  isContractCompatible,
} from "./contract.js";
import { testFrame } from "./testFrame.js";

describe("isContractCompatible", () => {
  it("accepts the same version", () => {
    expect(isContractCompatible("1.0", "1.0")).toMatchObject({
      ok: true,
      degraded: false,
    });
  });

  it("accepts an older minor without degrading", () => {
    expect(isContractCompatible("1.0", "1.4")).toMatchObject({
      ok: true,
      degraded: false,
    });
  });

  // Additive minors stay loadable because parsing strips unknown keys; the
  // loader just may not honour everything the frame declares.
  it("accepts a newer minor but flags it as degraded", () => {
    const result = isContractCompatible("1.9", "1.0");
    expect(result.ok).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.reason).toMatch(/reduced fidelity/);
  });

  it("refuses a different major", () => {
    expect(isContractCompatible("2.0", "1.0").ok).toBe(false);
    expect(isContractCompatible("0.9", "1.0").ok).toBe(false);
  });

  it("refuses a malformed version", () => {
    for (const bad of ["", "1", "1.0.0", "v1.0", "one.zero"]) {
      expect(isContractCompatible(bad, "1.0").ok).toBe(false);
    }
  });
});

describe("assertDeclarative", () => {
  const manifest = FrameManifestSchema.parse({
    contractVersion: CONTRACT_VERSION,
    kind: "declarative",
    id: "com.example.test",
    version: "1.0.0",
    frame: testFrame,
    assets: [],
  });

  it("passes a declarative manifest", () => {
    expect(() => {
      assertDeclarative(manifest);
    }).not.toThrow();
  });

  // A future "code" kind must be rejected here — at the loader — rather than by
  // schema validation, which would report the wrong problem.
  it("rejects an unknown kind with an actionable message", () => {
    expect(() => {
      assertDeclarative({ ...manifest, kind: "code" });
    }).toThrow(/only loads "declarative"/);
  });

  it("still parses an unknown kind, so the rejection is the loader's call", () => {
    expect(
      FrameManifestSchema.safeParse({
        contractVersion: CONTRACT_VERSION,
        kind: "code",
        id: "com.example.test",
        version: "1.0.0",
        frame: testFrame,
        assets: [],
      }).success,
    ).toBe(true);
  });
});
