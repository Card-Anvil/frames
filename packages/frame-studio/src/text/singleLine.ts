import Konva from "konva";

import type { TextBox } from "../api/types.js";
import { resolveFamily } from "./fonts.js";
import { ptToPx } from "./metrics.js";

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
export function measureLine(text: string, box: TextBox): number {
  const { family } = resolveFamily(box.fontFamily);
  const size = ptToPx(box.fontSize ?? 0);
  const context = measureContext();
  context.font = `bold ${String(size)}px "${family}"`;
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
 * One line of text laid out in a box, as the frame describes it.
 *
 * Drawn at the **authored** `fontSize`. Card Anvil shrinks the title to clear
 * the real mana cost and the type line to clear the set symbol's measured
 * pixel edge; neither runs here, so a line that overflows is reported rather
 * than silently shrunk. For a box-authoring tool that is the useful signal —
 * you want to be told the box is too small.
 */
export function buildPreviewText(text: string, box: TextBox): PreviewText {
  const { family, substituted } = resolveFamily(box.fontFamily);
  const size = ptToPx(box.fontSize ?? 0);
  const hasOutline =
    box.outlineColor !== undefined && (box.outlineWidth ?? 0) > 0;

  const node = new Konva.Text({
    text,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    align: box.textAlign ?? "left",
    verticalAlign: box.verticalAlign === "center" ? "middle" : "top",
    fontFamily: family,
    fontStyle: "bold",
    fontSize: size,
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
    overflow: Math.max(0, Math.round(measureLine(text, box) - box.width)),
    substituted,
  };
}

export { PREVIEWABLE, PT_TO_PX, isPreviewable, ptToPx } from "./metrics.js";
export type { PreviewableBox } from "./metrics.js";
