/**
 * Public API for frames that derive from Borderless. See the note in
 * `@cardanvil/frame-m15/extend` — the same stability promise applies.
 */
export { borderlessSettings, defaultCollectorInfoBounds } from "./index";

export {
  borderlessMdfcLayoutConfig,
  borderlessMdfcTextlessLayoutConfig,
} from "./mdfc/config";
export {
  borderlessNormalBoxes,
  borderlessNormalLayoutConfig,
  borderlessNormalTextlessLayoutConfig,
  borderlessShortBoxes,
  borderlessShortLayoutConfig,
  borderlessTokenBoxes,
  borderlessTokenLayoutConfig,
  borderlessTokenShortLayoutConfig,
  borderlessTokenTextlessLayoutConfig,
  textlessBoxes,
} from "./regular/config";
export {
  borderlessSagaCreatureLayoutConfig,
  borderlessSagaCreatureTextlessLayoutConfig,
  borderlessSagaLayoutConfig,
  borderlessSagaTextlessLayoutConfig,
} from "./saga/config";
export {
  borderlessSagaTransformCreatureLayoutConfig,
  borderlessSagaTransformCreatureTextlessLayoutConfig,
  borderlessSagaTransformLayoutConfig,
  borderlessSagaTransformTextlessLayoutConfig,
} from "./saga/transform/config";
export {
  borderlessTransformLayoutConfig,
  borderlessTransformTextlessLayoutConfig,
} from "./transform/config";
