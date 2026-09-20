import { describe, expect, it } from "vitest";

import { FrameMetaSchema, FrameSchema } from "@cardanvil/frame-kit";
import { resolveBoxOverrides } from "@cardanvil/frame-kit/layout";

import frameMeta from "../frame.meta.json";
import * as exported from "./index";
import { borderlessSourceMaterialFrame } from "./index";

describe("Borderless Source Material frame", () => {
  // The schemas are the contract every frame — built-in or third-party — is
  // held to. Typing a config as `Frame` is not enough: excess keys on a
  // namespace object, for one, type-check but are not valid frame data.
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(borderlessSourceMaterialFrame);
    // Assert on issues first: a bare success check reports only `false` and
    // hides which field drifted.
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(
      Object.keys(borderlessSourceMaterialFrame.config.layouts).length,
    ).toBeGreaterThan(0);
  });

  // "No Border" cuts the bottom band away, and the band is this frame's only
  // chrome — so the cutout mask and the toggle that applies it have to ship
  // together, or the setting renders and changes nothing.
  it("pairs the No Border toggle with the cutout mask it needs", () => {
    const masks = FrameSchema.parse(borderlessSourceMaterialFrame).config
      .layouts.normal?.masks;
    expect(masks?.border).toBeDefined();
    expect(masks?.noBorder).toBeDefined();
    expect(masks?.noBorder).not.toBe(masks?.border);
    // toMatchObject, not toEqual: the assertion is about the toggle's type,
    // label and default — not a ban on further optional fields like helperText.
    expect(
      borderlessSourceMaterialFrame.templateSettings.useNoBorder,
    ).toMatchObject({
      type: "boolean",
      label: "No Border",
      defaultValue: false,
    });
  });

  // The toggle's helper text promises this outline, and the frame is what
  // declares it — through the collector info defaults.
  it("outlines collector info once No Border cuts the band away", () => {
    const { boxes } = borderlessSourceMaterialFrame.config.layouts.normal;
    const resolved = resolveBoxOverrides(boxes, {
      border: "none",
      settings: {},
    });
    expect(resolved.collectorInfo).toMatchObject({
      color: "white",
      outlineColor: "black",
      outlineWidth: 19,
    });
  });
});

describe("frame.meta.json", () => {
  it("describes this package", () => {
    const meta = FrameMetaSchema.parse(frameMeta);
    expect(meta.export).toBe("borderlessSourceMaterialFrame");
  });

  // Catches a typo in `export` here rather than at packaging time.
  it("names an export that exists", () => {
    const parsed = FrameMetaSchema.parse(frameMeta);
    expect(exported).toHaveProperty(parsed.export);
  });
});
