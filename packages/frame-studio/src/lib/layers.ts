import type { FramePayload, FrameSlot } from "../api/types.js";
import { assetUrls } from "./frameModel.js";

export interface AssetLayer {
  /** Dotted path within the asset set, e.g. `base.w` or `crown.nickname`. */
  readonly id: string;
  /** First segment: the asset family. */
  readonly family: string;
  /** Last segment — a colour code for the colour sets, else a variant name. */
  readonly leaf: string;
  readonly url: string;
}

export interface MaskLayer {
  readonly id: string;
  readonly url: string;
}

/**
 * Every image in an asset set, as pickable layers.
 *
 * Deliberately not a reimplementation of the app's `getFrameLayers`, which
 * infers the right art from a card's colours, type and frame effects across
 * 500-odd lines. The studio is positioning boxes, not rendering a card, so it
 * offers the assets directly and lets you choose — which is also the only way
 * to look at art no real card would select.
 */
export function assetLayers(
  payload: FramePayload,
  slot: FrameSlot | undefined,
): AssetLayer[] {
  if (!slot) {
    return [];
  }
  return assetUrls(payload, slot).map(({ label, url }) => {
    const parts = label.split(".");
    return {
      id: label,
      family: parts[0] ?? label,
      leaf: parts[parts.length - 1] ?? label,
      url,
    };
  });
}

/** Masks in a layout's mask set, each togglable as a cutout. */
export function maskLayers(
  payload: FramePayload,
  slot: FrameSlot | undefined,
): MaskLayer[] {
  if (!slot) {
    return [];
  }
  return assetUrls(payload, slot).map(({ label, url }) => ({ id: label, url }));
}

/**
 * Which layers to show for a colour before anyone touches the list.
 *
 * One per family — the entry whose leaf is the chosen colour, else the family's
 * first — so a frame opens looking like a card rather than like every piece of
 * art it owns stacked on top of each other.
 */
export function defaultEnabled(
  layers: readonly AssetLayer[],
  color: string,
): Set<string> {
  const byFamily = new Map<string, AssetLayer>();
  for (const layer of layers) {
    const current = byFamily.get(layer.family);
    if (!current || (layer.leaf === color && current.leaf !== color)) {
      byFamily.set(layer.family, layer);
    }
  }
  return new Set(
    [...byFamily.values()]
      .filter(
        (layer) =>
          layer.leaf === color || !hasColor(layers, layer.family, color),
      )
      .map((layer) => layer.id),
  );
}

/** Whether a family offers art for this colour at all. */
function hasColor(
  layers: readonly AssetLayer[],
  family: string,
  color: string,
): boolean {
  return layers.some(
    (layer) => layer.family === family && layer.leaf === color,
  );
}
