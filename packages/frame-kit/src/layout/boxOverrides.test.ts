import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  type CardBoxes,
  CardBoxesSchema,
  type TextBox,
  TextBoxSchema,
} from "../schema/frame.js";
import { type OverrideState, resolveBoxOverrides } from "./boxOverrides.js";

const bounds = { x: 0, y: 0, width: 10, height: 10 };
const text = { ...bounds, fontSize: 12, color: "white" } satisfies TextBox;

const onBorder = {
  ...text,
  overrides: [
    {
      when: { border: "none" },
      style: { outlineColor: "black", outlineWidth: 19 },
    },
    { when: { border: "light" }, style: { color: "black" } },
  ],
} satisfies TextBox;

function boxesWith(collectorInfo: TextBox): CardBoxes {
  return {
    art: bounds,
    mana: text,
    title: text,
    type: text,
    setSymbol: bounds,
    collectorInfo,
  };
}

/** `box` resolved as the collector info of a render in `state`. */
function collector(
  box: TextBox,
  state: Partial<OverrideState> = {},
): TextBox | undefined {
  return resolveBoxOverrides(boxesWith(box), {
    border: "default",
    settings: {},
    ...state,
  }).collectorInfo;
}

describe("resolveBoxOverrides", () => {
  it("merges an override whose border matches", () => {
    expect(collector(onBorder, { border: "light" })).toEqual({
      ...text,
      color: "black",
    });
    expect(collector(onBorder, { border: "none" })).toEqual({
      ...text,
      outlineColor: "black",
      outlineWidth: 19,
    });
  });

  it("leaves the box as authored when nothing matches", () => {
    expect(collector(onBorder, { border: "default" })).toEqual(text);
    expect(collector(onBorder, { border: "dark" })).toEqual(text);
  });

  it("matches any border state an array lists", () => {
    const box = {
      ...text,
      overrides: [
        { when: { border: ["light", "none"] }, style: { color: "red" } },
      ],
    } satisfies TextBox;
    expect(collector(box, { border: "light" })?.color).toBe("red");
    expect(collector(box, { border: "none" })?.color).toBe("red");
    expect(collector(box, { border: "dark" })?.color).toBe("white");
  });

  // M15's shape: its collector strip only takes the border color once
  // "Color Entire Border" swaps in the full-coverage mask.
  it("requires every setting as well as the border", () => {
    const box = {
      ...text,
      overrides: [
        {
          when: { border: "light", settings: { useFullBorder: true } },
          style: { color: "black" },
        },
      ],
    } satisfies TextBox;
    const fullBorder = { useFullBorder: true };
    expect(
      collector(box, { border: "light", settings: fullBorder })?.color,
    ).toBe("black");
    expect(
      collector(box, { border: "light", settings: { useFullBorder: false } })
        ?.color,
    ).toBe("white");
    expect(collector(box, { border: "light" })?.color).toBe("white");
    expect(
      collector(box, { border: "dark", settings: fullBorder })?.color,
    ).toBe("white");
  });

  it("compares settings strictly", () => {
    const box = {
      ...text,
      overrides: [{ when: { settings: { size: 2 } }, style: { color: "red" } }],
    } satisfies TextBox;
    expect(collector(box, { settings: { size: "2" } })?.color).toBe("white");
    expect(collector(box, { settings: { size: 2 } })?.color).toBe("red");
  });

  it("lets a later match win", () => {
    const box = {
      ...text,
      overrides: [
        { when: {}, style: { color: "red", opacity: 0.5 } },
        { when: { border: "light" }, style: { color: "blue" } },
      ],
    } satisfies TextBox;
    expect(collector(box, { border: "light" })).toEqual({
      ...text,
      color: "blue",
      opacity: 0.5,
    });
  });

  it("drops the list, and leaves a box without one as it was", () => {
    expect(collector({ ...text, overrides: [] }, { border: "light" })).toEqual(
      text,
    );
    const boxes = boxesWith(text);
    expect(
      resolveBoxOverrides(boxes, { border: "light", settings: {} }),
    ).toEqual(boxes);
  });

  it("does not modify the boxes it is given", () => {
    const boxes = boxesWith(onBorder);
    resolveBoxOverrides(boxes, { border: "light", settings: {} });
    expect(boxes.collectorInfo).toBe(onBorder);
    expect(onBorder.color).toBe("white");
  });

  // The resolver keeps its own list of text boxes; this fails when the
  // contract gains one the list misses, which would otherwise never restyle.
  it("resolves every text box the contract defines", () => {
    const textKeys = Object.entries(CardBoxesSchema.shape)
      .filter(
        ([, schema]) =>
          (schema instanceof z.ZodOptional ? schema.unwrap() : schema) ===
          TextBoxSchema,
      )
      .map(([key]) => key);
    const restyled = {
      ...text,
      overrides: [{ when: {}, style: { color: "red" } }],
    } satisfies TextBox;
    const boxes: CardBoxes = {
      ...boxesWith(text),
      ...Object.fromEntries(textKeys.map((key) => [key, restyled])),
    };

    const resolved: Record<string, unknown> = resolveBoxOverrides(boxes, {
      border: "default",
      settings: {},
    });
    expect(textKeys.length).toBeGreaterThan(0);
    for (const key of textKeys) {
      expect(resolved[key], key).toEqual({ ...text, color: "red" });
    }
  });
});
