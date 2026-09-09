import { describe, expect, it } from "vitest";

import { FrameSchema } from "@cardanvil/frame-kit";

import { extendedFrame } from "./index";

describe("Extended Art frame", () => {
  // The schemas are the contract every frame — built-in or third-party — is
  // held to. Typing a config as `Frame` is not enough: excess keys on a
  // namespace object, for one, type-check but are not valid frame data.
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(extendedFrame);
    // Assert on issues first: a bare success check reports only `false` and
    // hides which field drifted.
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(Object.keys(extendedFrame.config.layouts).length).toBeGreaterThan(0);
  });
});
