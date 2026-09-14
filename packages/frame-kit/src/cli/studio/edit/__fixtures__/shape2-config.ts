// Card Anvil shape: an inline `const boxes` inside a config that also builds
// the LayoutConfig, with variants spreading from a shared base.
const baseBoxes = {
  art: { x: 144, y: 144, width: 2976, height: 2172 },
  title: { x: 400, y: 2446, width: 2100, height: 180, fontSize: 82 },
  mana: { x: 2600, y: 2446, width: 500, height: 180, fontSize: 82 },
  type: { x: 400, y: 2700, width: 2100, height: 150, fontSize: 64 },
  setSymbol: { x: 2700, y: 2700, width: 300, height: 150 },
};

// Shares `title` with baseBoxes; only `type` moves.
export const shortBoxes = {
  ...baseBoxes,
  type: { ...baseBoxes.type, y: 2900 },
};

const SHIFT = 40;

export const computedBoxes = {
  ...baseBoxes,
  title: { ...baseBoxes.title, x: 400 + SHIFT },
};

export const shape2Frame = {
  name: "Shape Two",
  description: "Workspace-shaped fixture frame.",
  tags: ["Custom"],
  config: {
    layouts: {
      normal: { boxes: baseBoxes },
      short: { boxes: shortBoxes },
      computed: { boxes: computedBoxes },
    },
  },
} as const;
