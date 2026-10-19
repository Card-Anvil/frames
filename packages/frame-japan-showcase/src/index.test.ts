import { describe, expect, it } from "vitest";

import { FrameMetaSchema, FrameSchema } from "@cardanvil/frame-kit";
import { resolveBoxOverrides } from "@cardanvil/frame-kit/layout";

import frameMeta from "../frame.meta.json";
import * as exported from "./index";
import { japanShowcaseFrame } from "./index";

describe("Japan Showcase frame", () => {
  // The schemas are the contract every frame — built-in or third-party — is
  // held to. Typing a config as `Frame` is not enough: excess keys on a
  // namespace object, for one, type-check but are not valid frame data.
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(japanShowcaseFrame);
    // Assert on issues first: a bare success check reports only `false` and
    // hides which field drifted.
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(
      Object.keys(japanShowcaseFrame.config.layouts).length,
    ).toBeGreaterThan(0);
  });

  // Unlike Extended Art, this frame draws no decorative trim over the cutout.
  it("draws no extended-art overlay", () => {
    const { frameAssets } = japanShowcaseFrame.config.layouts.normal;
    expect(frameAssets.extendedOverlay).toBeUndefined();
  });

  it("outlines every text box, and the set symbol", () => {
    const { boxes } = japanShowcaseFrame.config.layouts.normal;
    for (const name of [
      "mana",
      "title",
      "type",
      "setSymbol",
      "rules",
      "pt",
      "nicknameTitle",
    ] as const) {
      expect(boxes[name]?.outlineColor, name).toBe("black");
      expect(boxes[name]?.outlineWidth, name).toBeGreaterThan(0);
    }
  });

  it("ships only its own base, P/T and mask art", () => {
    const { frameAssets, masks } = japanShowcaseFrame.config.layouts.normal;
    expect(Object.keys(frameAssets).sort()).toEqual([
      "base",
      "fullBorder",
      "pt",
    ]);
    expect(Object.keys(masks ?? {}).sort()).toEqual([
      "border",
      "noBorder",
      "pinlines",
    ]);
  });

  // The setting and the mask have to ship together: either alone renders a
  // toggle that does nothing, or a mask nothing applies.
  it("offers No Border, with a mask for it to apply", () => {
    const { masks } = japanShowcaseFrame.config.layouts.normal;
    expect(masks?.noBorder).toBeDefined();
    expect(japanShowcaseFrame.templateSettings.useNoBorder.defaultValue).toBe(
      false,
    );
  });

  // Same as No Border: a toggle without its art would do nothing.
  it("offers Full Border, with art for it to draw", () => {
    const { frameAssets } = japanShowcaseFrame.config.layouts.normal;
    expect(frameAssets.fullBorder).toBeDefined();
    expect(japanShowcaseFrame.templateSettings.useFullBorder.defaultValue).toBe(
      false,
    );
  });

  // With no override of its own, the collector line takes frame-kit's
  // on-border default and follows the border color.
  it("adapts collector text to a light border", () => {
    const { boxes } = japanShowcaseFrame.config.layouts.normal;
    const color = (border: "light" | "dark") =>
      resolveBoxOverrides(boxes, { border, settings: {} }).collectorInfo?.color;
    expect(color("dark")).toBe("white");
    expect(color("light")).toBe("black");
  });
});

describe("frame.meta.json", () => {
  it("describes this package", () => {
    const meta = FrameMetaSchema.parse(frameMeta);
    expect(meta.export).toBe("japanShowcaseFrame");
  });

  // Catches a typo in `export` here rather than at packaging time.
  it("names an export that exists", () => {
    const parsed = FrameMetaSchema.parse(frameMeta);
    expect(exported).toHaveProperty(parsed.export);
  });
});
