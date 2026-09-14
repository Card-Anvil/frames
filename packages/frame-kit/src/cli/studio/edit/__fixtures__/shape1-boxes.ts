// Template shape: a flat `boxes.ts` next to an `index.ts`, the way
// `frame-template` and `cardanvil-frames` author frames.
export const boxes = {
  art: { x: 144, y: 144, width: 2976, height: 2172 },
  // The title sits above the art; this comment must survive an edit.
  title: {
    x: 400,
    y: 2446,
    width: 2100,
    height: 180,
    fontSize: 82,
    color: "#000000",
    textAlign: "left",
    shadow: true,
  },
  mana: { x: 2600, y: 2446, width: 500, height: 180, fontSize: 82 },
  type: { x: 400, y: 2700, width: 2100, height: 150, fontSize: 64 },
  setSymbol: { x: 2700, y: 2700, width: 300, height: 150 },
  pt: { x: 2441, y: 3847, width: 400, height: 200, fontSize: 90 },
  negative: { x: -12, y: 0, width: 10, height: 10, fontSize: 10 },
};
