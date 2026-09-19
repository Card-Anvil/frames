import { describe, expect, it } from "vitest";

import {
  FrameMetaSchema,
  FrameSchema,
  type LayoutConfig,
  onBorderTextOverrides,
} from "@cardanvil/frame-kit";

import frameMeta from "../frame.meta.json";
import * as exported from "./index";
import { borderlessFrame } from "./index";

/** Every layout config the frame ships, alternate variants included. */
const everyLayout: [string, LayoutConfig][] = [
  ...Object.entries(borderlessFrame.config.layouts),
  ...Object.entries(borderlessFrame.config.alternateLayouts).flatMap(
    ([variant, layouts]) =>
      Object.entries(layouts).map(
        ([layout, config]): [string, LayoutConfig] => [
          `${variant}.${layout}`,
          config,
        ],
      ),
  ),
];

/** The mask sets a render can pick as the active one (see renderCardToCanvas). */
const ACTIVE_MASK_SETS = [
  "masks",
  "backMasks",
  "creatureMasks",
  "backCreatureMasks",
  "sagaFrontMasks",
  "sagaBackMasks",
  "sagaFrontCreatureMasks",
  "sagaBackCreatureMasks",
] as const;

describe("Borderless frame", () => {
  // The schemas are the contract every frame — built-in or third-party — is
  // held to. Typing a config as `Frame` is not enough: excess keys on a
  // namespace object, for one, type-check but are not valid frame data.
  it("validates against FrameSchema", () => {
    const result = FrameSchema.safeParse(borderlessFrame);
    // Assert on issues first: a bare success check reports only `false` and
    // hides which field drifted.
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("declares at least one layout", () => {
    expect(Object.keys(borderlessFrame.config.layouts).length).toBeGreaterThan(
      0,
    );
  });

  // Collector info sits on the border ring on every layout, and takes the
  // helper's on-border default: black on a light border, outlined once "No
  // Border" cuts the ring away.
  it("gives every layout's collector info the on-border overrides", () => {
    for (const [name, config] of everyLayout) {
      expect(config.boxes.collectorInfo?.overrides, name).toBe(
        onBorderTextOverrides,
      );
    }
  });

  // The renderer only counts the border as gone — and outlines the collector
  // info — where a `noBorder` mask actually cuts it away. So every mask set a
  // render can pick has to ship one, or "No Border" leaves the text bare.
  it("ships a noBorder mask with every mask set", () => {
    for (const [name, config] of everyLayout) {
      for (const key of ACTIVE_MASK_SETS) {
        const masks = config[key];
        if (masks) {
          expect(masks.noBorder, `${name}.${key}`).toBeDefined();
        }
      }
    }
  });
});

describe("frame.meta.json", () => {
  it("describes this package", () => {
    const meta = FrameMetaSchema.parse(frameMeta);
    expect(meta.export).toBe("borderlessFrame");
  });

  // Catches a typo in `export` here rather than at packaging time.
  it("names an export that exists", () => {
    const parsed = FrameMetaSchema.parse(frameMeta);
    expect(exported).toHaveProperty(parsed.export);
  });
});
