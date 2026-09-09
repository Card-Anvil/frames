import { Frame, TextBox } from "@cardanvil/frame-kit";
import { withCollectorInfoDefaults } from "@cardanvil/frame-kit";

import borderlessSourceMaterialPreview from "./preview.jpg";
import { borderlessSourceMaterialLayoutConfig } from "./regular/config";

export const defaultCollectorInfoBounds = {
  x: 333,
  y: 4019,
  width: 2200,
  height: 200,
  fontSize: 53,
  color: "white",
  outlineColor: "black",
  outlineWidth: 30,
} as const satisfies TextBox;

export const borderlessSourceMaterialFrame = {
  name: "Borderless Source Material",
  description: "Borderless Source Material Frame",
  previewImage: borderlessSourceMaterialPreview,
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(
        borderlessSourceMaterialLayoutConfig,
        defaultCollectorInfoBounds,
      ),
    },
  },
  tags: ["Borderless Source Material"],
} as const satisfies Frame;
