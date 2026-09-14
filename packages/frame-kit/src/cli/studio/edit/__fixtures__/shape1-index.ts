import { boxes } from "./shape1-boxes.js";

export const plainFrame = {
  name: "Plain",
  description: "Template-shaped fixture frame.",
  tags: ["Custom"],
  config: {
    layouts: {
      normal: { boxes },
    },
  },
} as const;
