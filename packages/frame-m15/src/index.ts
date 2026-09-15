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
  y: 4015,
  width: 2200,
  height: 200,
  fontSize: 50,
  color: "white",
  letterSpacing: 7.5,
} as const satisfies TextBox;

export const defaultSettings = {
  useNyxBorder: {
    type: "boolean",
    label: "Use Nyx Border For Enchantments",
    defaultValue: true,
  },
  /**
   * Off by default: `masks.border` colors only the region outside the
   * collector strip, and turning this on swaps in `masks.borderFull` to color
   * the whole ring. Lives in the shared defaults so frames deriving from M15
   * inherit it — they inherit `regularLayoutConfig.masks`, and with it both
   * border masks, so the toggle is wired up for them too.
   */
  useFullBorder: {
    type: "boolean",
    label: "Color Entire Border",
    helperText:
      "Extends the border color across the collector strip, which is left uncolored by default.",
    defaultValue: false,
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
