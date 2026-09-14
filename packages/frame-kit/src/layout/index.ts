/**
 * How a frame's art is chosen and placed.
 *
 * Card Anvil owns the card parsing — reading a Scryfall card into
 * `FrameDetails` — and this owns everything downstream of it: which art a set
 * of details selects, and where each piece is drawn. Both halves used to live
 * in the app; this one moved here so the studio and the renderer cannot drift
 * on it.
 *
 * A separate entry point from the main one: nothing on the packaging path
 * needs it, and frames themselves never import it.
 */
export {
  CROWN_BLACK_BAR,
  DEFAULT_PT_IMAGE,
  NYX_INSERT_FALLBACK_X,
  type Placed,
  type Placement,
  type PlacementConfig,
  placeAsset,
  placementOrigin,
} from "./assetPlacement.js";
export {
  COLOR_ORDER,
  type CardShape,
  type FrameDetails,
  type FrameFamily,
  type FrameLayers,
  type FrameOverlay,
  LAYERS,
  type OverlayMaskName,
  type SelectOptions,
  colorToken,
  familyFor,
  frameDetailsFor,
  frameFamily,
  makeFamilyRef,
  orderColors,
  selectFrameLayers,
  splitTwoColor,
} from "./frameLayers.js";
export {
  type ResolvedBaseFrame,
  resolveBaseFrame,
  resolveFrameAsset,
} from "./resolveFrameAsset.js";
