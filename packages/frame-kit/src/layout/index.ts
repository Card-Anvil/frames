/**
 * How a frame is drawn for one card: which art a card selects and where each
 * piece goes, which cutouts and border recolor apply, which template settings
 * are in effect, and how text boxes resolve and are styled.
 *
 * Card Anvil owns the card parsing — reading a Scryfall card into
 * `FrameDetails` — and this owns everything downstream of it. It all used to
 * live in the app; it moved here so the studio and the renderer cannot drift
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
  type BorderStateInput,
  borderStateFor,
  ringMaskFor,
} from "./border.js";
export {
  type OverrideState,
  overrideMatches,
  resolveBoxOverrides,
} from "./boxOverrides.js";
export {
  type RgbColor,
  getReadableTextColor,
  parseNormalizedCssColor,
  relativeLuminance,
} from "./color.js";
export { type FrameCutoutInput, frameCutoutMasks } from "./cutouts.js";
export {
  type BannerColors,
  type DecorationCard,
  type DecorationFacts,
  type DecorationState,
  crownColors,
  decorationsFor,
  identityColors,
  nicknameColors,
  ptBoxColor,
  resolveCrownAsset,
  resolveCrownNicknameAsset,
  resolveNicknameAsset,
  resolveNyxInsertAsset,
  resolvePtBoxAsset,
} from "./decorations.js";
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
export {
  type SettingValue,
  type TemplateSettingValues,
  layoutTemplateSettings,
  mergeTemplateSettings,
  templateSettingDefaults,
} from "./settings.js";
export {
  TEXT_SHADOW_COLOR,
  type TextOutline,
  type TextShadow,
  textOutlineFor,
  textShadowFor,
} from "./textStyle.js";
