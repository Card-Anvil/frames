import { describe, expect, it } from "vitest";

import type { FramePayload, FrameSlot } from "../api/types.js";
import { boxesIn, isTurnedWithSet, rotationOf } from "./frameModel.js";

const box = { x: 700, y: 386, width: 3376, height: 172, fontSize: 119 };

const payload = {
  slug: "fixture",
  revision: 1,
  canvas: { width: 3264, height: 4440 },
  frame: {
    config: {
      layouts: {
        normal: { boxes: { title: box } },
        split: {
          boxes: { rotation: 90, title: box },
          secondFaceBoxes: { rotation: 270, title: box },
        },
        // Not something the contract allows; a frame loaded from disk can
        // still say it.
        skewed: { boxes: { rotation: 45, title: box } },
      },
    },
  },
} as unknown as FramePayload;

const slot = (layout: string, key = "boxes"): FrameSlot => ({
  key,
  kind: "boxes",
  required: key === "boxes",
  variant: null,
  layout,
  path: ["config", "layouts", layout, key],
});

describe("rotationOf", () => {
  it("is undefined for a set that reads upright", () => {
    expect(rotationOf(payload, slot("normal"))).toBeUndefined();
  });

  it("reads a turned set's rotation", () => {
    expect(rotationOf(payload, slot("split"))).toBe(90);
  });

  // A second face's set is turned on its own, not with the first face's.
  it("reads each set's own rotation", () => {
    expect(rotationOf(payload, slot("split", "secondFaceBoxes"))).toBe(270);
  });

  it("is undefined without a slot, or for one the frame does not have", () => {
    expect(rotationOf(payload, undefined)).toBeUndefined();
    expect(rotationOf(payload, slot("missing"))).toBeUndefined();
  });

  it("ignores a rotation the contract does not define", () => {
    expect(rotationOf(payload, slot("skewed"))).toBeUndefined();
  });
});

describe("boxesIn", () => {
  // A set's `rotation` sits beside its boxes; it is not one of them.
  it("does not list a turned set's rotation as a box", () => {
    expect(boxesIn(payload, slot("split")).map(({ key }) => key)).toEqual([
      "title",
    ]);
  });
});

describe("isTurnedWithSet", () => {
  it("leaves the collector line on the unturned sheet", () => {
    expect(isTurnedWithSet("collectorInfo")).toBe(false);
    expect(isTurnedWithSet("title")).toBe(true);
    expect(isTurnedWithSet("art")).toBe(true);
  });
});
