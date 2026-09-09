import { borderlessNormalLayoutConfig } from "@cardanvil/frame-borderless/extend";
import { LayoutConfig } from "@cardanvil/frame-kit";
import { regularLayoutConfig } from "@cardanvil/frame-m15/extend";

import extendedMask from "./extended.png";
import extendedOverlay from "./extendedOverlay.png";

export const extendedLayoutConfig: LayoutConfig = {
  ...regularLayoutConfig,
  boxes: {
    ...regularLayoutConfig.boxes,
    art: {
      x: 0,
      y: 412,
      width: 3264,
      height: 2344,
    },
    type: {
      ...regularLayoutConfig.boxes.type,
      color: "white",
    },
  },
  frameAssets: {
    ...regularLayoutConfig.frameAssets,
    crown: borderlessNormalLayoutConfig.frameAssets.crown,
    extendedOverlay,
  },
  masks: { ...regularLayoutConfig.masks, extended: extendedMask },
  crownConfig: {
    x: 226,
    y: 217,
  },
};
