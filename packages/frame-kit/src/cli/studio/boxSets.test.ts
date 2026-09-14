import { describe, expect, it } from "vitest";

import { boxSlots, cardBoxKeys, layoutSlots } from "./boxSets.js";

describe("layoutSlots", () => {
  it("classifies every box, asset and mask slot in the contract", () => {
    const slots = layoutSlots();
    const byKind = (kind: string) =>
      slots
        .filter((slot) => slot.kind === kind)
        .map((slot) => slot.key)
        .sort();

    expect(byKind("boxes")).toEqual([
      "backBoxes",
      "backCreatureBoxes",
      "boxes",
      "creatureBoxes",
      "flipsidePtBoxes",
      "sagaBackBoxes",
      "sagaBackCreatureBoxes",
      "sagaFrontBoxes",
      "sagaFrontCreatureBoxes",
      "tallBoxes",
      "twoAbilityBoxes",
    ]);
    expect(byKind("assets")).toEqual([
      "backFrameAssets",
      "compositeFrameAssets",
      "frameAssets",
      "sagaBackFrameAssets",
      "sagaFrontFrameAssets",
    ]);
    expect(byKind("masks")).toEqual([
      "backCreatureMasks",
      "backMasks",
      "compositeMasks",
      "creatureMasks",
      "masks",
      "sagaBackCreatureMasks",
      "sagaBackMasks",
      "sagaFrontCreatureMasks",
      "sagaFrontMasks",
    ]);
    // Recognised by shape (an object of numbers), not by name — so a knob
    // group added to the contract becomes editable with no change here.
    expect(byKind("knobs")).toEqual([
      "crownConfig",
      "nicknameConfig",
      "planeswalkerConfig",
      "sagaConfig",
    ]);
  });

  // These are the LayoutConfig members that must NOT be classified: a record,
  // a partial record and an enum. Misclassifying one would put a control in
  // the inspector for something that is not a plain numeric knob.
  it("leaves records and enums unclassified", () => {
    const keys = layoutSlots().map((slot) => slot.key);
    for (const key of [
      "templateSettings",
      "colorArtOverrides",
      "hybridTitleMask",
    ]) {
      expect(keys).not.toContain(key);
    }
  });

  // The studio enumerates slots by schema identity, so a slot whose schema is
  // reused but whose name is unfamiliar still classifies. This guards the
  // reverse: a *new* CardBoxes/FrameAssets/LayoutMasks slot must appear here,
  // and a contract change that makes one unclassifiable is caught.
  it("marks exactly the two required slots", () => {
    expect(
      layoutSlots()
        .filter((slot) => slot.required)
        .map((slot) => slot.key)
        .sort(),
    ).toEqual(["boxes", "frameAssets"]);
  });

  it("boxSlots is the boxes subset", () => {
    expect(boxSlots().every((slot) => slot.kind === "boxes")).toBe(true);
    expect(boxSlots()).toHaveLength(11);
  });
});

describe("cardBoxKeys", () => {
  it("lists every member a CardBoxes can hold", () => {
    const keys = cardBoxKeys();
    // The five the contract requires, plus a sample of the optional ones.
    expect(keys).toEqual(
      expect.arrayContaining([
        "art",
        "mana",
        "title",
        "type",
        "setSymbol",
        "rules",
        "pt",
        "ptImage",
        "collectorInfo",
      ]),
    );
  });
});
