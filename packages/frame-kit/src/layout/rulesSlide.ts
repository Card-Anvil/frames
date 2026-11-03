import type { CardBoxes, RulesSlide } from "../schema/frame.js";

/**
 * How far a `rulesSlide` moves the boxes for rules text `textHeight` tall in
 * a `rules` box `boxHeight` tall: the room left over less `padding`, rounded
 * down to whole steps, at most `maxSteps` of them.
 */
export function rulesSlideOffset(
  slide: RulesSlide,
  boxHeight: number,
  textHeight: number,
): number {
  const room = boxHeight - textHeight - slide.padding;
  const steps = Math.min(slide.maxSteps, Math.floor(room / slide.step));
  return steps > 0 ? steps * slide.step : 0;
}

/**
 * The boxes once a `rulesSlide` has moved them down by `offset`: the listed
 * boxes moved whole, and the `rules` box's top moved with them while its
 * bottom stays put.
 */
export function slideBoxes(
  boxes: CardBoxes,
  slide: RulesSlide,
  offset: number,
): CardBoxes {
  if (offset === 0) {
    return boxes;
  }
  const slid: CardBoxes = { ...boxes };
  for (const key of slide.boxes) {
    const box = boxes[key];
    Object.assign(slid, { [key]: { ...box, y: box.y + offset } });
  }
  if (boxes.rules) {
    slid.rules = {
      ...boxes.rules,
      y: boxes.rules.y + offset,
      height: boxes.rules.height - offset,
    };
  }
  return slid;
}
