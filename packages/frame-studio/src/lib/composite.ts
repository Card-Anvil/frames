import type {
  FrameAssets,
  FrameColor as FrameColorToken,
} from "@cardanvil/frame-kit";
import {
  type BannerColors,
  type CardShape,
  type DecorationCard,
  type Placement,
  type PlacementConfig,
  crownColors,
  decorationsFor,
  familyFor,
  frameDetailsFor,
  nicknameColors,
  placeAsset,
  ptBoxColor,
  resolveBaseFrame,
  resolveCrownAsset,
  resolveFrameAsset,
  resolveNicknameAsset,
  resolveNyxInsertAsset,
  resolvePtBoxAsset,
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
  /** Nickname text and power/toughness, which decide the banners. */
  readonly card: Omit<DecorationCard, "isLegendary">;
  readonly useNyxBorder: boolean;
  /** Template settings that swap in alternate crown art. */
  readonly useNyxInsert: boolean;
  readonly useUBCrowns: boolean;
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
    card,
    useNyxBorder,
    useNyxInsert,
    useUBCrowns,
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

  // Decorations: which ones a card gets, and in what colour, are decided the
  // same way the renderer decides them — legendary gets a crown, nickname text
  // gets a plate, power *and* toughness get a PT box — so the studio shows what
  // the app would show instead of asking the author to guess.
  const layoutPath = boxSlot?.path.slice(0, -1) ?? [];
  const numbersAt = (
    ...path: string[]
  ): { x: number; y: number } | undefined => {
    const value = asRecord(atPath(payload.frame, path));
    return typeof value?.x === "number" && typeof value.y === "number"
      ? (value as unknown as { x: number; y: number })
      : undefined;
  };

  // `isLegendary` is a type-line switch, so it lives with the other type
  // switches in the shape rather than being restated here.
  const wanted = decorationsFor({ ...card, isLegendary: shape.isLegendary });
  const hasNickname = wanted.nickname;
  const placement: PlacementConfig = {
    crownConfig: asRecord(
      atPath(payload.frame, [...layoutPath, "crownConfig"]),
    ) as PlacementConfig["crownConfig"] | undefined,
    nicknameConfig: numbersAt(...layoutPath, "nicknameConfig"),
    ...(boxSlot ? { ptImage: numbersAt(...boxSlot.path, "ptImage") } : {}),
    hasNickname,
  };

  /** A banner colour is one token, or two halves for a two-colour card. */
  const halves = (colors: BannerColors): FrameColorToken[] =>
    Array.isArray(colors) ? colors : [colors];

  const addDecoration = (id: string, url: string | undefined) => {
    if (url !== undefined) {
      layers.push({ id, url, placement: placeAsset(id, placement) });
    }
  };

  if (wanted.crownBlackBar && typeof assets.black === "string") {
    addDecoration("black", assets.black);
  }

  if (wanted.crown) {
    for (const color of halves(crownColors(details, shape))) {
      addDecoration(
        `crown.${color}`,
        resolveCrownAsset(assets, color, {
          nickname: hasNickname,
          useUBCrowns,
        }),
      );
    }
    if (useNyxInsert) {
      for (const color of halves(crownColors(details, shape))) {
        addDecoration(
          `crown.nyxInsert.${color}`,
          resolveNyxInsertAsset(assets, color, useUBCrowns),
        );
      }
    }
  }

  // A frame whose crown art already includes the nickname needs no separate
  // plate — the same test the renderer makes.
  const crownCarriesNickname =
    wanted.crown &&
    halves(crownColors(details, shape)).some(
      (color) =>
        resolveCrownAsset(assets, color, { nickname: true, useUBCrowns }) !==
        resolveCrownAsset(assets, color, { nickname: false, useUBCrowns }),
    );

  if (hasNickname && !crownCarriesNickname) {
    for (const color of halves(nicknameColors(details, shape))) {
      addDecoration(`nickname.${color}`, resolveNicknameAsset(assets, color));
    }
  }

  if (wanted.ptBox) {
    const color = ptBoxColor(details, shape);
    addDecoration(`pt.${color}`, resolvePtBoxAsset(assets, color));
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
