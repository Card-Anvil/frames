import { omit } from "@cardanvil/frame-kit";

import * as backIcons from "./back";
import * as frontIcons from "./front";

/**
 * The `icons/front` and `icons/back` barrels also carry art that is not a DFC
 * `frame_effects` variant: the Lesson crown icon (wired up separately through
 * `frameAssets.lessonIcon`) and meld art that nothing selects today.
 *
 * `dfcIconSet` is keyed by `frame_effects`, so the barrels are narrowed to just
 * those keys here. Passing a whole barrel through instead type-checks — excess
 * property checks do not apply to a namespace object — but puts keys in the
 * frame contract that no card can ever resolve.
 */
export const frontDfcIcons = omit(frontIcons, ["lesson", "meld"]);

export const backDfcIcons = omit(backIcons, ["meld"]);

/** Crown icon drawn on Lesson cards, in place of the usual DFC mark. */
export const lessonIcon = frontIcons.lesson;
