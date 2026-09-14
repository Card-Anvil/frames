import { describe, expect, it } from "vitest";

import {
  PREVIEWABLE,
  PT_TO_PX,
  isPreviewable,
  ptToPx,
  pxToPt,
} from "./metrics.js";

describe("pt to px", () => {
  // The contract states font sizes in points; Konva draws in pixels. If this
  // ever stops matching Card Anvil's `konva/measure.ts`, every previewed box
  // is drawn at the wrong size and nothing else would say so.
  it("matches the renderer's conversion", () => {
    expect(PT_TO_PX).toBe(96 / 72);
    expect(ptToPx(72)).toBe(96);
    expect(ptToPx(120)).toBe(160);
  });

  it("round-trips", () => {
    expect(pxToPt(ptToPx(82))).toBeCloseTo(82);
  });
});

describe("previewable boxes", () => {
  // Everything here must be a single line in the real renderer: no wrapping,
  // no symbols, no auto-shrink. Adding a multi-line box (rules, abilities)
  // would make the preview claim a fidelity the studio does not have. `pt`
  // qualifies because it renders as one "power/toughness" string.
  it("covers only single-line boxes", () => {
    expect([...PREVIEWABLE]).toEqual([
      "title",
      "type",
      "nicknameTitle",
      "keyword",
      "pt",
    ]);
  });

  it("excludes the boxes the renderer lays out itself", () => {
    for (const key of ["rules", "abilities", "mana", "collectorInfo"]) {
      expect(isPreviewable(key)).toBe(false);
    }
  });

  it("narrows a matching key", () => {
    expect(isPreviewable("title")).toBe(true);
    expect(isPreviewable("nope")).toBe(false);
  });
});
