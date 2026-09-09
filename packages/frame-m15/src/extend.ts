/**
 * Public API for frames that derive from M15.
 *
 * Everything exported here is part of this package's contract: a breaking
 * change is a breaking change for every dependent frame. Keep it to pieces
 * that are genuinely reusable, not whatever happens to be internal.
 */
export {
  defaultCollectorInfoBounds,
  defaultSettings,
  sagaSettings,
} from "./index";

export { planeswalkerLayoutConfig } from "./planewalker/config";
export { regularLayoutConfig } from "./regular/config";
export { sagaLayoutConfig } from "./saga/config";
