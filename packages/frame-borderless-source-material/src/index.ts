import { Frame, TemplateSettingsConfig, TextBox } from "@cardanvil/frame-kit";
import { withCollectorInfoDefaults } from "@cardanvil/frame-kit";

import borderlessSourceMaterialPreview from "./preview.jpg";
import { borderlessSourceMaterialLayoutConfig } from "./regular/config";

export const defaultCollectorInfoBounds = {
  x: 333,
  y: 4019,
  width: 2200,
  height: 200,
  fontSize: 50,
  color: "white",
  // outlineColor: "black",
  // outlineWidth: 30,
  letterSpacing: 5,
} as const satisfies TextBox;

export const borderlessSourceMaterialSettings = {
  useNoBorder: {
    type: "boolean",
    label: "No Border",
    helperText:
      "Drops the bottom band so art runs to the card edge. Collector info gains an outline to stay readable over it.",
    defaultValue: false,
  },
} as const satisfies TemplateSettingsConfig;

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
  templateSettings: {
    ...borderlessSourceMaterialSettings,
  },
  tags: ["Borderless Source Material"],
} as const satisfies Frame;
