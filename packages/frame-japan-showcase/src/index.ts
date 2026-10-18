import { Frame, TemplateSettingsConfig, TextBox } from "@cardanvil/frame-kit";
import { withCollectorInfoDefaults } from "@cardanvil/frame-kit";

import { japanShowcaseLayoutConfig } from "./config";
import japanShowcasePreview from "./preview.jpg";

// M15's position, without its "Color Entire Border" rule: with no override of
// its own, the collector line takes frame-kit's on-border default.
export const defaultCollectorInfoBounds = {
  x: 333,
  y: 4015,
  width: 2200,
  height: 200,
  fontSize: 50,
  color: "white",
  letterSpacing: 7.5,
} as const satisfies TextBox;

export const japanShowcaseSettings = {
  // Without this toggle the layout's `noBorder` mask is never applied.
  useNoBorder: {
    type: "boolean",
    label: "No Border",
    helperText: "Cuts away the border so the art runs to the card edge.",
    defaultValue: false,
  },
  // Draws `frameAssets.fullBorder` under the frame, in the border color when
  // one is picked.
  useFullBorder: {
    type: "boolean",
    label: "Full Border",
    helperText:
      "Draws a border around the whole card, under the frame. Takes the border color too.",
    defaultValue: false,
  },
} as const satisfies TemplateSettingsConfig;

export const japanShowcaseFrame = {
  name: "Japan Showcase",
  description: "Japan Showcase Frame",
  previewImage: japanShowcasePreview,
  tags: ["Japan Showcase"],
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(
        japanShowcaseLayoutConfig,
        defaultCollectorInfoBounds,
      ),
    },
  },
  templateSettings: {
    ...japanShowcaseSettings,
  },
} as const satisfies Frame;
