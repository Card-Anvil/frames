import { type Frame } from "../../../schema/frame.js";
import pinlines from "./pinlines.svg";
import w from "./w.png";

/** Minimal frame fixture: one PNG and one SVG small enough that Vite would
 *  inline it as a data URL if the packager did not turn that off. */
export const simpleFrame = {
  name: "Simple",
  description: "Fixture",
  previewImage: w,
  tags: ["Fixture"],
  config: {
    layouts: {
      normal: {
        boxes: {
          art: { x: 0, y: 0, width: 100, height: 100 },
          mana: { x: 0, y: 0, width: 10, height: 10, fontSize: 12 },
          title: { x: 0, y: 0, width: 10, height: 10, fontSize: 12 },
          type: { x: 0, y: 0, width: 10, height: 10, fontSize: 12 },
          setSymbol: { x: 0, y: 0, width: 10, height: 10 },
        },
        frameAssets: { base: { w } },
        masks: { pinlines },
      },
    },
  },
} as const satisfies Frame;
