import type { OpacityStop } from "../schema/paint.js";

const round = (value: number, places: number): number =>
  Number(value.toFixed(places));

/**
 * Opacity stops sampled from `curve`, which maps 0–1 along a gradient to an
 * opacity 0–1 — for writing a gradient's `opacity` from a formula. The stops
 * are spaced evenly, `count` of them (at least two). A canvas draws straight
 * lines between them, so a tight curve wants more.
 */
export function opacityStopsFrom(
  curve: (t: number) => number,
  count = 24,
): OpacityStop[] {
  const n = Math.max(2, Math.round(count));
  return Array.from({ length: n }, (_, i) => {
    const at = i / (n - 1);
    return {
      at: round(at, 6),
      opacity: round(Math.min(1, Math.max(0, curve(at))), 4),
    };
  });
}
