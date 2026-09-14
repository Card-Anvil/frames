import type {
  FrameAssets,
  FrameColor,
  FrameRef,
} from "../schema/frameAssets.js";
import { FRAME_COLORS } from "../schema/frameAssets.js";

/**
 * Exact per-family lookup. The only alias is base `c2` → base `c`, for a frame
 * with no distinct hybrid wash.
 *
 * Deliberately no cross-family fallback: a missing `land_*` or `nyx_*` variant
 * has to resolve to `undefined` so the overlay that needed it is dropped
 * rather than drawn in the wrong family. Falling back on the *base* frame is a
 * separate, explicit decision — see {@link resolveBaseFrame}.
 *
 * Mirrors Card Anvil's `utils/resolveFrameAsset.ts`.
 */
export function resolveFrameAsset(
  assets: FrameAssets,
  ref: FrameRef,
): string | undefined {
  switch (ref.family) {
    case "base":
      return ref.color === "c2"
        ? (assets.base.c2 ?? assets.base.c)
        : assets.base[ref.color];
    case "land":
      return assets.land?.[ref.color];
    case "nyx":
      return assets.nyx?.[ref.color];
    case "tall":
      return assets.tall?.[ref.color];
    case "creature":
      return assets.creature?.[ref.color];
  }
}

export interface ResolvedBaseFrame {
  ref: FrameRef;
  url: string;
  /**
   * True when the requested ref was missing and another colour stood in.
   * Callers drop every overlay in that case — the overlays were composed for
   * the frame that is not there.
   */
  usedFallback: boolean;
}

/**
 * The base frame, with the fallback chain the renderer uses: the requested
 * family and colour, then the same colour in `base`, then (`l` → `c`), then
 * `m`, then `w`, then whatever the frame does ship.
 *
 * `undefined` only when a frame ships no base art at all.
 */
export function resolveBaseFrame(
  assets: FrameAssets,
  ref: FrameRef,
): ResolvedBaseFrame | undefined {
  const direct = resolveFrameAsset(assets, ref);
  if (direct !== undefined) {
    return { ref, url: direct, usedFallback: false };
  }

  const readBase = (color: FrameColor | "c2"): string | undefined =>
    color === "c2" ? (assets.base.c2 ?? assets.base.c) : assets.base[color];

  const chain: (FrameColor | "c2")[] =
    ref.color === "l" ? [ref.color, "c", "m", "w"] : [ref.color, "m", "w"];
  for (const color of chain) {
    const url = readBase(color);
    if (url !== undefined) {
      return { ref: { family: "base", color }, url, usedFallback: true };
    }
  }

  // Last resort: the first colour the frame ships, in canonical order rather
  // than whatever order the object happens to be written in.
  for (const color of FRAME_COLORS) {
    const url = assets.base[color];
    if (url !== undefined) {
      return { ref: { family: "base", color }, url, usedFallback: true };
    }
  }
  return undefined;
}
