import type { FrameAssets } from "@cardanvil/frame-kit";
import {
  type CardShape,
  type Placement,
  type PlacementConfig,
  familyFor,
  frameDetailsFor,
  placeAsset,
  resolveBaseFrame,
  resolveFrameAsset,
  selectFrameLayers,
} from "@cardanvil/frame-kit/layout";

import type { FramePayload, FrameSlot } from "../api/types.js";
import { atPath } from "./frameModel.js";

/** One image to draw, with whatever masks clip it. */
export interface ArtLayer {
  readonly id: string;
  readonly url: string;
  readonly placement: Placement;
  /** Clips this layer to a section of the frame. */
  readonly maskUrl?: string;
  readonly secondaryMaskUrl?: string;
  /** Blend colour only, keeping the alpha underneath. */
  readonly preserveAlpha?: boolean;
}

export interface CompositeInput {
  readonly payload: FramePayload;
  readonly assetSlot: FrameSlot | undefined;
  readonly maskSlot: FrameSlot | undefined;
  readonly boxSlot: FrameSlot | undefined;
  readonly shape: CardShape;
  readonly useNyxBorder: boolean;
  /** Extra art (crowns, nicknames, PT plates) the user switched on. */
  readonly extras: ReadonlySet<string>;
  /** Section masks switched on for inspection, applied over everything. */
  readonly inspectMasks: ReadonlySet<string>;
}

export interface CompositeResult {
  readonly layers: readonly ArtLayer[];
  /** Masks applied as cutouts over the finished stack. */
  readonly cutoutUrls: readonly string[];
  /** Set when the requested base art was missing and another colour stood in. */
  readonly fallbackNote?: string;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * The payload's `frame` is the schema-validated frame, serialized to JSON with
 * asset URLs rewritten — so a slot the server labelled `kind: "assets"` really
 * is a `FrameAssets`. That is asserted once, here, rather than at every use.
 */
const asFrameAssets = (value: unknown): FrameAssets | undefined =>
  asRecord(value) as FrameAssets | undefined;

/**
 * The art a card shape selects, stacked the way the renderer stacks it.
 *
 * The frame body is derived, not picked: `selectFrameLayers` decides the base
 * frame and the section overlays exactly as Card Anvil does, so a two-colour
 * gold card gets split pinlines and a hybrid pair renders as two halves —
 * without the studio guessing. Decorations (crowns, nicknames, PT plates) stay
 * manual toggles, because whether a card is legendary or nicknamed is a
 * property of the card, not of the frame.
 */
export function composite(input: CompositeInput): CompositeResult {
  const {
    payload,
    assetSlot,
    maskSlot,
    boxSlot,
    shape,
    useNyxBorder,
    extras,
    inspectMasks,
  } = input;

  const assets = assetSlot
    ? asFrameAssets(atPath(payload.frame, assetSlot.path))
    : undefined;
  const masks = maskSlot
    ? asRecord(atPath(payload.frame, maskSlot.path))
    : undefined;
  if (!assets) {
    return { layers: [], cutoutUrls: [] };
  }

  const maskUrl = (name: string): string | undefined => {
    const url = masks?.[name];
    return typeof url === "string" ? url : undefined;
  };

  const family = familyFor(shape, useNyxBorder);
  const details = frameDetailsFor(shape);
  const hybridTitleMask = atPath(payload.frame, [
    ...(boxSlot?.path.slice(0, -1) ?? []),
    "hybridTitleMask",
  ]);
  const selected = selectFrameLayers(details, {
    family,
    hasPinlineMask: maskUrl("pinlines") !== undefined,
    ...(hybridTitleMask === "title"
      ? { hybridTitleMask: "title" as const }
      : {}),
  });

  const layers: ArtLayer[] = [];

  const resolvedBase = resolveBaseFrame(assets, selected.baseFrame);
  if (resolvedBase) {
    layers.push({
      id: `${selected.baseFrame.family}.${selected.baseFrame.color}`,
      url: resolvedBase.url,
      placement: placeAsset(
        `${resolvedBase.ref.family}.${resolvedBase.ref.color}`,
      ),
    });
  }

  // A substituted base frame was not what the overlays were composed for, so
  // the renderer drops them; the studio does the same and says why.
  const usedFallback = resolvedBase?.usedFallback === true;
  if (!usedFallback) {
    for (const overlay of selected.overlays ?? []) {
      const url = resolveFrameAsset(assets, overlay.frame);
      const primary = maskUrl(overlay.mask);
      if (url === undefined || primary === undefined) {
        continue; // a frame without that art or that mask simply skips it
      }
      layers.push({
        id: `${overlay.frame.family}.${overlay.frame.color}/${overlay.mask}`,
        url,
        placement: placeAsset(`${overlay.frame.family}.${overlay.frame.color}`),
        maskUrl: primary,
        ...(overlay.secondaryMask
          ? { secondaryMaskUrl: maskUrl(overlay.secondaryMask) }
          : {}),
        ...(overlay.preserveAlpha === true ? { preserveAlpha: true } : {}),
      });
    }
  }

  // Decorations, placed from the layout's own render config.
  // The knob configs sit on the layout, one level above the box set.
  const layoutPath = boxSlot?.path.slice(0, -1) ?? [];
  const numbersAt = (
    ...path: string[]
  ): { x: number; y: number } | undefined => {
    const value = asRecord(atPath(payload.frame, path));
    return typeof value?.x === "number" && typeof value.y === "number"
      ? (value as unknown as { x: number; y: number })
      : undefined;
  };
  const placement: PlacementConfig = {
    crownConfig: asRecord(
      atPath(payload.frame, [...layoutPath, "crownConfig"]),
    ) as PlacementConfig["crownConfig"] | undefined,
    nicknameConfig: numbersAt(...layoutPath, "nicknameConfig"),
    ...(boxSlot ? { ptImage: numbersAt(...boxSlot.path, "ptImage") } : {}),
    hasNickname: [...extras].some((id) => id.startsWith("nickname")),
  };

  for (const id of [...extras].sort()) {
    const url = atPath(payload.frame, [
      ...(assetSlot?.path ?? []),
      ...id.split("."),
    ]);
    if (typeof url !== "string") {
      continue;
    }
    layers.push({ id, url, placement: placeAsset(id, placement) });
  }

  const cutoutUrls = [...inspectMasks]
    .map((name) => maskUrl(name))
    .filter((url): url is string => url !== undefined);

  return {
    layers,
    cutoutUrls,
    ...(usedFallback
      ? {
          fallbackNote:
            `no ${selected.baseFrame.family} "${selected.baseFrame.color}" art — ` +
            `using ${resolvedBase.ref.family} "${resolvedBase.ref.color}"; overlays dropped`,
        }
      : {}),
  };
}
