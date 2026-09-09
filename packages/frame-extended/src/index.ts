import { Frame } from "@cardanvil/frame-kit";
import { withCollectorInfoDefaults } from "@cardanvil/frame-kit";
import {
  defaultCollectorInfoBounds,
  defaultSettings,
} from "@cardanvil/frame-m15/extend";

import { extendedLayoutConfig } from "./config";
import extendedPreview from "./preview.jpg";

export const extendedFrame = {
  name: "Extended Art",
  description: "Extended Art Frame",
  previewImage: extendedPreview,
  tags: ["Extended Art"],
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(
        extendedLayoutConfig,
        defaultCollectorInfoBounds,
      ),
    },
  },
  templateSettings: {
    ...defaultSettings,
  },
} as const satisfies Frame;
