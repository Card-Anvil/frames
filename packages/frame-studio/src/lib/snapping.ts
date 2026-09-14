import type { Bounds } from "../api/types.js";

/** The 63 × 88 mm card inside the 3 mm bleed, centred on the sheet. */
export const CARD_INSET = 144;

/** How close, in canvas pixels, an edge must be before it snaps. */
const THRESHOLD = 12;

export interface Guide {
  readonly axis: "x" | "y";
  readonly at: number;
}

export interface SnapResult {
  readonly bounds: Bounds;
  readonly guides: readonly Guide[];
}

/** Candidate lines on one axis: the canvas, the card face, and the siblings. */
function linesFor(
  axis: "x" | "y",
  canvas: { width: number; height: number },
  siblings: readonly Bounds[],
): number[] {
  const extent = axis === "x" ? canvas.width : canvas.height;
  const lines = [CARD_INSET, extent - CARD_INSET, extent / 2];
  for (const box of siblings) {
    const start = axis === "x" ? box.x : box.y;
    const size = axis === "x" ? box.width : box.height;
    lines.push(start, start + size, start + size / 2);
  }
  return lines;
}

/**
 * Nudges a box onto a nearby alignment line.
 *
 * Snaps each edge and the centre independently, so a box can catch the card
 * face on one axis while staying free on the other. Only the position moves —
 * a drag keeps its size, and a resize is snapped by its moving edges before it
 * ever gets here.
 */
export function snapBounds(
  bounds: Bounds,
  canvas: { width: number; height: number },
  siblings: readonly Bounds[],
): SnapResult {
  const guides: Guide[] = [];
  const snapped = { ...bounds };

  for (const axis of ["x", "y"] as const) {
    const lines = linesFor(axis, canvas, siblings);
    const start = axis === "x" ? bounds.x : bounds.y;
    const size = axis === "x" ? bounds.width : bounds.height;

    let best: { delta: number; at: number } | undefined;
    for (const edge of [start, start + size, start + size / 2]) {
      for (const line of lines) {
        const delta = line - edge;
        if (Math.abs(delta) <= THRESHOLD) {
          if (!best || Math.abs(delta) < Math.abs(best.delta)) {
            best = { delta, at: line };
          }
        }
      }
    }

    if (best) {
      guides.push({ axis, at: best.at });
      if (axis === "x") {
        snapped.x = Math.round(bounds.x + best.delta);
      } else {
        snapped.y = Math.round(bounds.y + best.delta);
      }
    }
  }

  return { bounds: snapped, guides };
}
