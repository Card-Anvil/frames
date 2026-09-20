import type { TextBox } from "../schema/frame.js";

/** The color plain-text drop shadows are drawn in. */
export const TEXT_SHADOW_COLOR = "#17191b";

export interface TextOutline {
  color: string;
  width: number;
}

export interface TextShadow {
  color: string;
  /** In canvas pixels. */
  offsetX: number;
  offsetY: number;
}

type StyledBox = Pick<
  TextBox,
  | "fontSize"
  | "outlineColor"
  | "outlineWidth"
  | "shadow"
  | "shadowOffsetX"
  | "shadowOffsetY"
>;

/** A box's outline, when it sets both an `outlineColor` and an `outlineWidth`. */
export function textOutlineFor(box: StyledBox): TextOutline | undefined {
  return box.outlineColor && box.outlineWidth
    ? { color: box.outlineColor, width: box.outlineWidth }
    : undefined;
}

/**
 * The drop shadow a plain-text box — title, type, P/T, nickname title,
 * collector info — is drawn with: only when it asks for one with `shadow`,
 * and never alongside an outline, which always wins. The offsets default to
 * fractions of the box's `fontSize`, unless the box sets its own.
 *
 * Symbols read `shadow` differently (on unless turned off), so this is for
 * plain text only.
 */
export function textShadowFor(box: StyledBox): TextShadow | undefined {
  if (!box.shadow || textOutlineFor(box)) {
    return undefined;
  }
  return {
    color: TEXT_SHADOW_COLOR,
    offsetX: box.shadowOffsetX ?? -(box.fontSize * 0.029),
    offsetY: box.shadowOffsetY ?? box.fontSize * 0.075,
  };
}
