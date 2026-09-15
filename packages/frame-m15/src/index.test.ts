import { describe, expect, it } from "vitest";

import { FrameMetaSchema, FrameSchema } from "@cardanvil/frame-kit";

import frameMeta from "../frame.meta.json";
import * as exported from "./index";
import { m15Frame } from "./index";

describe("M15 frame", () => {
  // The schemas are the contract every frame — built-in or third-party — is
  // held to. Typing a config as `Frame` is not enough: excess keys on a
  // namespace object, for one, type-check but are not valid frame data.
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(m15Frame);
    // Assert on issues first: a bare success check reports only `false` and
    // hides which field drifted.
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(Object.keys(m15Frame.config.layouts).length).toBeGreaterThan(0);
  });

  // `LayoutMasksSchema` is a plain object schema, so a mask key it doesn't
  // know is dropped on parse rather than rejected — the frame would keep
  // type-checking and the toggle below would silently do nothing.
  it("keeps both border masks on the normal layout through a parse", () => {
    const parsed = FrameSchema.parse(m15Frame);
    const masks = parsed.config.layouts.normal?.masks;
    expect(masks?.border).toBeDefined();
    expect(masks?.borderFull).toBeDefined();
    expect(masks?.borderFull).not.toBe(masks?.border);
  });

  // The toggle is what selects `borderFull`; without it the mask is unreachable.
  it("offers the full-border toggle, defaulting to the partial mask", () => {
    // toMatchObject, not toEqual: the assertion is about the toggle's type,
    // label and default — not a ban on further optional fields like helperText.
    expect(m15Frame.templateSettings.useFullBorder).toMatchObject({
      type: "boolean",
      label: "Color Entire Border",
      defaultValue: false,
    });
  });
});

describe("frame.meta.json", () => {
  it("describes this package", () => {
    const meta = FrameMetaSchema.parse(frameMeta);
    expect(meta.export).toBe("m15Frame");
  });

  // Catches a typo in `export` here rather than at packaging time.
  it("names an export that exists", () => {
    const parsed = FrameMetaSchema.parse(frameMeta);
    expect(exported).toHaveProperty(parsed.export);
  });
});
