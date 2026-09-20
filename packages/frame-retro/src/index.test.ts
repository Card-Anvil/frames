import { describe, expect, it } from "vitest";

import { BorderStateSchema, FrameSchema, omit } from "@cardanvil/frame-kit";
import { resolveBoxOverrides } from "@cardanvil/frame-kit/layout";

import { defaultCollectorInfoBounds, retroFrame } from "./index";

describe("Retro frame", () => {
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(retroFrame);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(Object.keys(retroFrame.config.layouts).length).toBeGreaterThan(0);
  });

  // The collector line sits on the frame body, not the border ring, so it
  // keeps its own white-with-shadow look whatever the border settings do.
  it("never restyles collector info for the border", () => {
    const { boxes } = retroFrame.config.layouts.normal;
    const authored = omit(defaultCollectorInfoBounds, ["overrides"]);
    for (const border of BorderStateSchema.options) {
      const { collectorInfo } = resolveBoxOverrides(boxes, {
        border,
        settings: {},
      });
      expect(collectorInfo, border).toEqual(authored);
    }
  });
});
