import { describe, expect, it } from "vitest";

import type { Frame } from "../schema/frame.js";
import {
  layoutTemplateSettings,
  mergeTemplateSettings,
  templateSettingDefaults,
} from "./settings.js";

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
    useNoBorder: { type: "boolean", label: "No Border", defaultValue: false },
    style: {
      type: "select",
      label: "Style",
      defaultValue: "a",
      options: ["a", "b"],
    },
  },
  config: {
    layouts: {
      normal: layout(),
      saga: layout({
        useNyxBorder: { type: "boolean", label: "Nyx", defaultValue: true },
      }),
    },
  },
};

describe("templateSettingDefaults", () => {
  it("nests each layout's defaults under its name", () => {
    expect(templateSettingDefaults(frame)).toEqual({
      useNoBorder: false,
      style: "a",
      saga: { useNyxBorder: true },
    });
  });
});

describe("mergeTemplateSettings", () => {
  it("merges a layout's sub-object by key rather than replacing it", () => {
    expect(
      mergeTemplateSettings(
        { style: "a", saga: { useNyxBorder: true, other: 1 } },
        { style: "b", saga: { useNyxBorder: false } },
      ),
    ).toEqual({ style: "b", saga: { useNyxBorder: false, other: 1 } });
  });

  it("returns whichever side exists when the other is missing", () => {
    const only = { style: "a" };
    expect(mergeTemplateSettings(only, undefined)).toBe(only);
    expect(mergeTemplateSettings(undefined, only)).toBe(only);
  });
});

describe("layoutTemplateSettings", () => {
  const settings = {
    useNoBorder: true,
    useNyxBorder: true,
    saga: { useNyxBorder: false },
    other: { unrelated: 1 },
  };

  it("lays the layout's own settings over the frame's", () => {
    expect(layoutTemplateSettings(settings, "saga")).toEqual({
      useNoBorder: true,
      useNyxBorder: false,
    });
  });

  it("leaves other layouts' settings out", () => {
    expect(layoutTemplateSettings(settings, "normal")).toEqual({
      useNoBorder: true,
      useNyxBorder: true,
    });
  });

  it("is empty for a frame with no settings", () => {
    expect(layoutTemplateSettings(undefined, "normal")).toEqual({});
  });
});
