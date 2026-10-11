import { describe, expect, it } from "vitest";

import {
  type Bounds,
  FrameMetaSchema,
  FrameSchema,
  type LayoutConfig,
  type Rotation,
} from "@cardanvil/frame-kit";
import {
  resolveBoxOverrides,
  turnedBoundsOnSheet,
} from "@cardanvil/frame-kit/layout";

import frameMeta from "../frame.meta.json";
import * as exported from "./index";
import { borderlessSourceMaterialFrame } from "./index";

/** The sheet every box here is measured on, bleed included. */
const SHEET = { width: 3264, height: 4440 };

/** The layouts whose text does not all read upright on one side. */
const TURNED_LAYOUTS = ["battle", "split", "aftermath", "flip"] as const;
type TurnedLayout = (typeof TURNED_LAYOUTS)[number];

/** A box set as a plain record, for checks that walk whatever it places. */
type BoxSet = Record<string, unknown> & { rotation?: Rotation };

function setsOf(layout: TurnedLayout): {
  boxes: BoxSet;
  secondFaceBoxes?: BoxSet;
} {
  const config: LayoutConfig =
    borderlessSourceMaterialFrame.config.layouts[layout];
  return config;
}

/**
 * Where each piece of text a set places lands on the sheet. Art is left out —
 * text sits over it — and so is the collector line, which is measured on the
 * sheet already.
 */
function textOnSheet(
  set: BoxSet | undefined,
): { key: string; bounds: Bounds }[] {
  return Object.entries(set ?? {})
    .filter(
      ([key, box]) =>
        key !== "art" &&
        key !== "collectorInfo" &&
        typeof box === "object" &&
        box !== null,
    )
    .map(([key, box]) => ({
      key,
      bounds: turnedBoundsOnSheet(box as Bounds, SHEET, set?.rotation),
    }));
}

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

  // The inset spell and the card's own rules share the text box side by side,
  // so each inset layout has to place all four inset boxes and keep the two
  // columns apart.
  it.each(["adventure", "omen", "prepare"] as const)(
    "puts the %s layout's inset spell beside its rules",
    (layout) => {
      const { rules, insetTitle, insetMana, insetType, insetRules } =
        borderlessSourceMaterialFrame.config.layouts[layout].boxes;
      expect(rules).toBeDefined();
      for (const box of [insetTitle, insetMana, insetType, insetRules]) {
        expect(box).toBeDefined();
        // Wholly to one side of the rules column or the other.
        const apart =
          box &&
          rules &&
          (box.x + box.width <= rules.x || rules.x + rules.width <= box.x);
        expect(apart).toBe(true);
      }
    },
  );

  // The inset layouts change the boxes and nothing else, so "No Border" and a
  // border color act on them exactly as they do on a regular card.
  it("gives the inset layouts the regular layout's art and masks", () => {
    const { layouts } = borderlessSourceMaterialFrame.config;
    for (const layout of ["adventure", "omen", "prepare"] as const) {
      expect(layouts[layout].frameAssets).toBe(layouts.normal.frameAssets);
      expect(layouts[layout].masks).toBe(layouts.normal.masks);
    }
  });

  // A layout whose text does not all read upright says so with `rotation`,
  // and each of these turns the way the real card does: a battle and both
  // halves of a split card a quarter turn clockwise, an aftermath half the
  // other way under an upright first half, a flip card's second face upside
  // down.
  it("turns each layout's sets the way the card is read", () => {
    const turns = (layout: TurnedLayout) => {
      const { boxes, secondFaceBoxes } = setsOf(layout);
      return [boxes.rotation, secondFaceBoxes?.rotation];
    };
    expect(turns("battle")).toEqual([90, undefined]);
    expect(turns("split")).toEqual([90, 90]);
    expect(turns("aftermath")).toEqual([undefined, 270]);
    expect(turns("flip")).toEqual([undefined, 180]);
  });

  // Two faces share one side of the card, each in a set that may be turned
  // its own way, so "apart" only means something once both are on the sheet.
  it.each(["split", "aftermath", "flip"] as const)(
    "keeps the two faces of the %s layout apart on the sheet",
    (layout) => {
      const { boxes, secondFaceBoxes } = setsOf(layout);
      const first = textOnSheet(boxes);
      const second = textOnSheet(secondFaceBoxes);
      expect(first.length).toBeGreaterThan(0);
      expect(second.length).toBeGreaterThan(0);

      const overlaps = (a: Bounds, b: Bounds) =>
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height;
      for (const a of first) {
        for (const b of second) {
          // The Fuse line belongs to both halves, and runs under the second.
          if (a.key === "fuse") {
            continue;
          }
          expect(overlaps(a.bounds, b.bounds), `${a.key} / ${b.key}`).toBe(
            false,
          );
        }
      }
    },
  );

  // Nothing a turned layout places may land under the band: it is the one
  // piece of chrome on the card, and the collector line printed on it stays
  // upright on the sheet whichever way the text above it reads.
  it.each(TURNED_LAYOUTS)(
    "keeps the %s layout's text on the art, off the band",
    (layout) => {
      const { boxes, secondFaceBoxes } = setsOf(layout);
      const bandTop =
        borderlessSourceMaterialFrame.config.layouts.normal.boxes.art.height;
      for (const { key, bounds } of [
        ...textOnSheet(boxes),
        ...textOnSheet(secondFaceBoxes),
      ]) {
        expect(bounds.x, key).toBeGreaterThanOrEqual(0);
        expect(bounds.y, key).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width, key).toBeLessThanOrEqual(SHEET.width);
        expect(bounds.y + bounds.height, key).toBeLessThanOrEqual(bandTop);
      }
    },
  );

  // One art on every one of these, covering what the regular layout's does
  // however its set is turned.
  it.each(TURNED_LAYOUTS)(
    "gives the %s layout the regular layout's art area",
    (layout) => {
      const { boxes } = setsOf(layout);
      expect(
        turnedBoundsOnSheet(boxes.art as Bounds, SHEET, boxes.rotation),
      ).toEqual(borderlessSourceMaterialFrame.config.layouts.normal.boxes.art);
    },
  );

  // Only a battle's front is the battle. Its back is an ordinary card, drawn
  // from the regular layout's boxes and art.
  it("draws a battle's back face as a regular card", () => {
    const { battle, normal } = borderlessSourceMaterialFrame.config.layouts;
    expect(battle.backBoxes?.rotation).toBeUndefined();
    expect(battle.backBoxes?.title).toBe(normal.boxes.title);
    expect(battle.backFrameAssets).toBe(normal.frameAssets);
    expect(battle.backMasks).toBe(normal.masks);
  });

  // A Fuse line runs under both halves of a split card, so its box has to
  // span both columns and sit below both halves' rules.
  it("runs the split layout's Fuse line under both halves", () => {
    const { boxes, secondFaceBoxes } = setsOf("split");
    const fuse = boxes.fuse as Bounds;
    const rules = boxes.rules as Bounds;
    const secondRules = secondFaceBoxes?.rules as Bounds;
    expect(fuse.x).toBeLessThanOrEqual(rules.x);
    expect(fuse.x + fuse.width).toBeGreaterThanOrEqual(
      secondRules.x + secondRules.width,
    );
    expect(fuse.y).toBeGreaterThanOrEqual(rules.y + rules.height);
    expect(fuse.y).toBeGreaterThanOrEqual(secondRules.y + secondRules.height);
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
