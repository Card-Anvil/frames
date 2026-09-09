import type { Frame } from "../schema/frame.js";

/**
 * A small but structurally realistic frame for tests: assets in a color set, a
 * nested mask, a preview image, and styling strings that must NOT be treated as
 * assets. `base.w` and `base.u` deliberately share one URL so deduplication is
 * exercised.
 */
export const SHARED_URL = "/src/frames/shared-border.png";

export const testFrame: Frame = {
  name: "Test Frame",
  description: "Fixture",
  previewImage: "/src/frames/preview.jpg",
  tags: ["test"],
  templateSettings: {
    useNyxBorder: {
      type: "boolean",
      label: "Use Nyx Border",
      defaultValue: true,
    },
    style: {
      type: "select",
      label: "Style",
      defaultValue: "classic",
      options: ["classic", "modern"],
    },
  },
  config: {
    layouts: {
      normal: {
        boxes: {
          art: { x: 0, y: 0, width: 100, height: 100 },
          mana: { x: 0, y: 0, width: 10, height: 10, fontSize: 12 },
          title: {
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            fontSize: 12,
            color: "white",
            outlineColor: "black",
            fontFamily: "Beleren",
          },
          type: { x: 0, y: 0, width: 10, height: 10, fontSize: 12 },
          setSymbol: { x: 0, y: 0, width: 10, height: 10 },
        },
        frameAssets: {
          base: { w: SHARED_URL, u: SHARED_URL, b: "/src/frames/black.png" },
          black: "/src/frames/crown-bar.png",
        },
        masks: { pinlines: "/src/frames/pinlines.png" },
      },
    },
  },
};
