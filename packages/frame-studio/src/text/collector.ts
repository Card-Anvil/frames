import Konva from "konva";

import type { TextBox } from "../api/types.js";
import { ptToPx } from "./metrics.js";
import { outlineAndShadow } from "./singleLine.js";

/**
 * A stand-in for the collector line.
 *
 * The renderer lays collector info out element by element — Gotham runs,
 * symbol glyphs, the artist in Beleren Small Caps — over one or two lines.
 * The studio draws one sample line instead, in the box's resolved style: what
 * matters here is what a border setting does to it, the colour, outline or
 * shadow its `overrides` give it. Gotham is not vendored, so the face is only
 * close, and no overflow is reported for it. The line sits where the box's
 * first line of `lines` would: left unless that line is centered.
 */
export function buildCollectorPreview(text: string, box: TextBox): Konva.Text {
  const align = box.lines?.[0]?.align ?? "left";
  return new Konva.Text({
    text,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    align,
    verticalAlign: "middle",
    fontFamily: "Gotham, sans-serif",
    fontSize: ptToPx(box.fontSize ?? 0),
    ...(box.letterSpacing ? { letterSpacing: box.letterSpacing } : {}),
    // Unlike every other box, collector text defaults to white.
    fill: box.color ?? "white",
    wrap: "none",
    listening: false,
    ...outlineAndShadow(box),
  });
}
