import { describe, expect, it } from "vitest";

import { FrameSchema } from "@cardanvil/frame-kit";

import { retroFrame } from "./index";

describe("Retro frame", () => {
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(retroFrame);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(Object.keys(retroFrame.config.layouts).length).toBeGreaterThan(0);
  });
});
