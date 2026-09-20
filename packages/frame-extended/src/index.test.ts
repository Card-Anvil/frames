import { describe, expect, it } from "vitest";

import { FrameMetaSchema, FrameSchema } from "@cardanvil/frame-kit";
import { resolveBoxOverrides } from "@cardanvil/frame-kit/layout";

import frameMeta from "../frame.meta.json";
import * as exported from "./index";
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

  // Inherited, not copied: the layout spreads `regularLayoutConfig.masks`, and
  // the toggle rides along in M15's `defaultSettings`. Both halves have to be
  // present or the control renders and does nothing — so assert them together.
  it("inherits both border masks and the toggle that selects them", () => {
    const masks = FrameSchema.parse(extendedFrame).config.layouts.normal?.masks;
    expect(masks?.border).toBeDefined();
    expect(masks?.borderFull).toBeDefined();
    expect(masks?.borderFull).not.toBe(masks?.border);
    expect(extendedFrame.templateSettings.useFullBorder.defaultValue).toBe(
      false,
    );
  });

  // The collector rule rides along with M15's bounds, and has to: it is
  // written for the partial `border` mask this layout inherits.
  it("adapts collector text only once the whole ring is colored", () => {
    const { boxes } = extendedFrame.config.layouts.normal;
    const color = (useFullBorder: boolean) =>
      resolveBoxOverrides(boxes, {
        border: "light",
        settings: { useFullBorder },
      }).collectorInfo?.color;
    expect(color(false)).toBe("white");
    expect(color(true)).toBe("black");
  });
});

describe("frame.meta.json", () => {
  it("describes this package", () => {
    const meta = FrameMetaSchema.parse(frameMeta);
    expect(meta.export).toBe("extendedFrame");
  });

  // Catches a typo in `export` here rather than at packaging time.
  it("names an export that exists", () => {
    const parsed = FrameMetaSchema.parse(frameMeta);
    expect(exported).toHaveProperty(parsed.export);
  });
});
