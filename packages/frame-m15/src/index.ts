import { Frame, TemplateSettingsConfig, TextBox } from "@cardanvil/frame-kit";
import {
  withCollectorInfoDefaults,
  withSettingsDefaults,
} from "@cardanvil/frame-kit";

import { planeswalkerLayoutConfig } from "./planewalker/config";
import normalPreview from "./preview.jpg";
import { regularLayoutConfig } from "./regular/config";
import { sagaLayoutConfig } from "./saga/config";

export const defaultCollectorInfoBounds = {
  x: 333,
  y: 4019,
  width: 2200,
  height: 200,
  fontSize: 53,
  color: "white",
} as const satisfies TextBox;

export const defaultSettings = {
  useNyxBorder: {
    type: "boolean",
    label: "Use Nyx Border For Enchantments",
    defaultValue: true,
  },
} as const satisfies TemplateSettingsConfig;

export const sagaSettings = {
  useNyxBorder: {
    type: "boolean",
    label: "Use Nyx Border",
    defaultValue: true,
  },
} as const satisfies TemplateSettingsConfig;

export const m15Frame = {
  name: "M15",
  description: "Magic 2015 Frame",
  previewImage: normalPreview,
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(
        regularLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      normal_planeswalker: withCollectorInfoDefaults(
        planeswalkerLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      saga: withSettingsDefaults(
        withCollectorInfoDefaults(sagaLayoutConfig, defaultCollectorInfoBounds),
        sagaSettings,
      ),
      // adventure: withCollectorInfoDefaults(
      //   regularLayoutConfig,
      //   defaultCollectorInfoBounds,
      // ),

      // adventure: withCollectorInfoDefaults(
      //   regularLayoutConfig,
      //   defaultCollectorInfoBounds,
      // ),
    },
  },
  templateSettings: {
    ...defaultSettings,
  },
  tags: ["M15"],
} as const satisfies Frame;
