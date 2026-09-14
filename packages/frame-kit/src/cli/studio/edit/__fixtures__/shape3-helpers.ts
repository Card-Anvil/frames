// Helper shapes: frame-kit's `omit`, and a local single-expression function.
import { omit } from "../../../../authoring/omit.js";

const baseBoxes = {
  art: { x: 144, y: 144, width: 2976, height: 2172 },
  title: { x: 400, y: 2446, width: 2100, height: 180, fontSize: 82 },
  mana: { x: 2600, y: 2446, width: 500, height: 180, fontSize: 82 },
  type: { x: 400, y: 2700, width: 2100, height: 150, fontSize: 64 },
  setSymbol: { x: 2700, y: 2700, width: 300, height: 150 },
  rules: { x: 400, y: 2900, width: 2100, height: 800, fontSize: 60 },
};

const textlessOverrides = {
  type: { x: 400, y: 3400, width: 2100, height: 150, fontSize: 64 },
};

/** Single-expression local function — the studio inlines this. */
function stripRules(boxes: typeof baseBoxes) {
  return omit({ ...boxes, ...textlessOverrides }, ["rules"]);
}

/** Block-bodied with a const then a return — also inlined. */
function widenTitle(boxes: typeof baseBoxes) {
  const widened = { ...boxes, title: { ...boxes.title, width: 2200 } };
  return widened;
}

/** Imperative: builds then mutates. Deliberately NOT followed. */
function mutating(boxes: typeof baseBoxes) {
  const result = { ...boxes };
  result.title = { ...boxes.title, y: 9999 };
  return result;
}

export const helperFrame = {
  name: "Helpers",
  description: "Helper-shaped fixture frame.",
  tags: ["Custom"],
  config: {
    layouts: {
      normal: { boxes: baseBoxes },
      textless: { boxes: stripRules(baseBoxes) },
      wide: { boxes: widenTitle(baseBoxes) },
      mutated: { boxes: mutating(baseBoxes) },
    },
  },
} as const;
