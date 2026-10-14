/**
 * Public API for frames that derive from Borderless Source Material. See the
 * note in `@cardanvil/frame-m15/extend`.
 */
export { defaultCollectorInfoBounds } from "./index";

export { borderlessSourceMaterialLayoutConfig } from "./regular/config";

export {
  borderlessSourceMaterialSagaLayoutConfig,
  borderlessSourceMaterialSectionedLayoutConfig,
} from "./sectioned/config";

export { borderlessSourceMaterialPlaneswalkerLayoutConfig } from "./planeswalker/config";
