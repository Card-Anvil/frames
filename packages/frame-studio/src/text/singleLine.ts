import Konva from "konva";

import type { TextBox } from "../api/types.js";
import { resolveFamily } from "./fonts.js";
import { type PreviewableBox, ptToPx } from "./metrics.js";

/**
 * How the renderer draws each single-line box.
 *
 * Taken from `drawCardToStage`'s own `buildOutlinedText` calls rather than
 * guessed: each box has its own font, weight and horizontal default, and
 * every one of them is vertically centred. A box's own `textAlign` still
 * wins over the default here, exactly as `buildOutlinedText` resolves it.
 */
interface BoxTextSpec {
  readonly family: string;
  readonly fontStyle: "bold" | "italic" | "normal";
  readonly align: "left" | "center" | "right";
  /** Whether a box's `fontFamily` override applies; only the title's does. */
  readonly honoursFontFamily: boolean;
}

const SPECS: Record<PreviewableBox, BoxTextSpec> = {
  title: {
    family: "Beleren",
    fontStyle: "bold",
    align: "left",
    honoursFontFamily: true,
  },
  type: {
    family: "Beleren",
    fontStyle: "bold",
    align: "left",
    honoursFontFamily: false,
  },
  nicknameTitle: {
    family: "Plantin MT Pro",
    fontStyle: "italic",
    align: "center",
    honoursFontFamily: false,
  },
  pt: {
    family: "Beleren Small Caps",
    fontStyle: "bold",
    align: "center",
    honoursFontFamily: false,
  },
};

/** The font, style and alignment a box is actually drawn with. */
function specFor(
  key: PreviewableBox,
  box: TextBox,
): { family: string; fontStyle: string; align: string; substituted: boolean } {
  const spec = SPECS[key];
  const wanted =
    spec.honoursFontFamily && box.fontFamily !== undefined
      ? box.fontFamily
      : spec.family;
  const { family, substituted } = resolveFamily(wanted);
  return {
    family,
    fontStyle: spec.fontStyle,
    align: box.textAlign ?? spec.align,
    substituted,
  };
}

let measureCtx: CanvasRenderingContext2D | undefined;

function measureContext(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) {
      throw new Error("could not create a 2d context for measuring");
    }
    measureCtx = context;
  }
  return measureCtx;
}

/** Rendered width of one line, in canvas pixels. Fonts must be loaded first. */
export function measureLine(
  key: PreviewableBox,
  text: string,
  box: TextBox,
): number {
  const { family, fontStyle } = specFor(key, box);
  const context = measureContext();
  context.font = `${fontStyle} ${String(ptToPx(box.fontSize ?? 0))}px "${family}"`;
  return context.measureText(text).width;
}

export interface PreviewText {
  readonly node: Konva.Text;
  /** How far the line exceeds the box, in canvas pixels. 0 when it fits. */
  readonly overflow: number;
  /** True when the box named a font family the studio does not have. */
  readonly substituted: boolean;
}

/**
 * One line of text laid out in a box, as the renderer lays it out.
 *
 * Drawn at the **authored** `fontSize`. Card Anvil shrinks the title to clear
 * the real mana cost and the type line to clear the set symbol's measured
 * pixel edge; neither runs here, so a line that overflows is reported rather
 * than silently shrunk. For a box-authoring tool that is the useful signal —
 * you want to be told the box is too small.
 */
export function buildPreviewText(
  key: PreviewableBox,
  text: string,
  box: TextBox,
): PreviewText {
  const { family, fontStyle, align, substituted } = specFor(key, box);
  const hasOutline =
    box.outlineColor !== undefined && (box.outlineWidth ?? 0) > 0;

  const node = new Konva.Text({
    text,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    align,
    // Every single-line box is vertically centred in the renderer; none of
    // them read the box's `verticalAlign`.
    verticalAlign: "middle",
    fontFamily: family,
    fontStyle,
    fontSize: ptToPx(box.fontSize ?? 0),
    fill: box.color ?? "black",
    wrap: "none",
    listening: false,
    ...(hasOutline
      ? {
          stroke: box.outlineColor,
          strokeWidth: box.outlineWidth,
          fillAfterStrokeEnabled: true,
          lineJoin: "round",
        }
      : {}),
    ...(box.opacity === undefined ? {} : { opacity: box.opacity }),
  });

  return {
    node,
    overflow: Math.max(0, Math.round(measureLine(key, text, box) - box.width)),
    substituted,
  };
}

export { PREVIEWABLE, PT_TO_PX, isPreviewable, ptToPx } from "./metrics.js";
export type { PreviewableBox } from "./metrics.js";
