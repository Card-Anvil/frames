import {
  Frame,
  TemplateSettingsConfig,
  TextBox,
  withCollectorInfoDefaults,
} from "@cardanvil/frame-kit";

import preview from "./regular/w.png";
import { regularLayoutConfig } from "./regular/config";

// Matches M15's collector info bounds — the Retro boxes were copied from M15
// as a starting point and share its canvas size.
export const defaultCollectorInfoBounds = {
  x: 460,
  y: 3880,
  width: 2330,
  height: 200,
  fontSize: 58,
  color: "white",
  shadow: true,
  shadowOffsetX: 4,
  shadowOffsetY: 6,
} as const satisfies TextBox;

export const retroSettings = {
  useNoBorder: {
    type: "boolean",
    label: "No Border",
    defaultValue: false,
  },
  dividerBarStyle: {
    type: "select",
    label: "Flavor Divider Bar",
    helperText:
      "Style of the divider bar between rules and flavor text, or none to leave a plain gap.",
    defaultValue: "none",
    options: ["none", "modern", "portal"],
  },
} as const satisfies TemplateSettingsConfig;

export const retroFrame = {
  name: "Retro",
  description: "Retro Frame",
  previewImage: preview,
  tags: ["Custom"],
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(
        regularLayoutConfig,
        defaultCollectorInfoBounds,
      ),
    },
  },
  templateSettings: {
    ...retroSettings,
  },
} as const satisfies Frame;
