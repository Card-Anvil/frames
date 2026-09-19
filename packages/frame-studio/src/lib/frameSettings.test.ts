import { describe, expect, it } from "vitest";

import type { Frame } from "@cardanvil/frame-kit";

import {
  settingEntries,
  settingsInEffect,
  withSetting,
} from "./frameSettings.js";

const layout = (templateSettings?: Frame["templateSettings"]) => ({
  boxes: {
    art: { x: 0, y: 0, width: 1, height: 1 },
    mana: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
    title: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
    type: { x: 0, y: 0, width: 1, height: 1, fontSize: 1 },
    setSymbol: { x: 0, y: 0, width: 1, height: 1 },
  },
  frameAssets: { base: {} },
  ...(templateSettings ? { templateSettings } : {}),
});

const frame: Frame = {
  name: "Fixture",
  description: "",
  previewImage: "/preview.png",
  tags: [],
  templateSettings: {
    frameVariant: {
      type: "select",
      label: "Frame Variant",
      defaultValue: "normal",
      options: ["normal", "textless"],
    },
    useNyxBorder: { type: "boolean", label: "Nyx", defaultValue: true },
    useNoBorder: { type: "boolean", label: "No Border", defaultValue: false },
  },
  config: {
    layouts: {
      normal: layout(),
      saga: layout({
        useFullBorder: {
          type: "boolean",
          label: "Color Entire Border",
          defaultValue: false,
        },
      }),
    },
  },
};

describe("settingEntries", () => {
  it("lists the frame's settings, then the layout's own", () => {
    expect(
      settingEntries(frame, "saga").map((entry) => [entry.scope, entry.key]),
    ).toEqual([
      ["frame", "useNoBorder"],
      ["layout", "useFullBorder"],
    ]);
  });

  // The variant picker and the Card toggles already drive these.
  it("leaves out settings the studio controls elsewhere", () => {
    const keys = settingEntries(frame, "normal").map((entry) => entry.key);
    expect(keys).not.toContain("frameVariant");
    expect(keys).not.toContain("useNyxBorder");
  });
});

describe("settings in effect", () => {
  it("starts from the frame's declared defaults", () => {
    expect(settingsInEffect(frame, {}, "saga").layout).toMatchObject({
      useNoBorder: false,
      useFullBorder: false,
    });
  });

  it("stores a layout's setting under the layout, as Card Anvil does", () => {
    const [noBorder, fullBorder] = settingEntries(frame, "saga");
    if (!noBorder || !fullBorder) {
      throw new Error("fixture settings missing");
    }
    const values = withSetting(
      withSetting({}, noBorder, "saga", true),
      fullBorder,
      "saga",
      true,
    );
    expect(values).toEqual({
      useNoBorder: true,
      saga: { useFullBorder: true },
    });
    expect(settingsInEffect(frame, values, "saga").layout).toMatchObject({
      useNoBorder: true,
      useFullBorder: true,
    });
    // Another layout sees the frame-level change, not the saga's own.
    expect(settingsInEffect(frame, values, "normal").layout).not.toHaveProperty(
      "useFullBorder",
    );
  });
});
