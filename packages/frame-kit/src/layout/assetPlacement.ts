import type {
  CrownRenderConfig,
  NicknameRenderConfig,
} from "../schema/frame.js";
import { defaultCrownConfig, defaultNicknameConfig } from "../schema/frame.js";

/** Where the PT plate sits when a layout does not say. */
export const DEFAULT_PT_IMAGE = { x: 2441, y: 3847 } as const;

/** The crown's black bar is fixed art at a fixed place. */
export const CROWN_BLACK_BAR = {
  x: 220,
  y: 200,
  width: 2815,
  height: 140,
} as const;

/** Horizontal fallback for the nyx insert when the crown's width is unknown. */
export const NYX_INSERT_FALLBACK_X = 611;

export interface PlacementConfig {
  readonly crownConfig?: CrownRenderConfig | undefined;
  readonly nicknameConfig?: NicknameRenderConfig | undefined;
  readonly ptImage?: { readonly x: number; readonly y: number } | undefined;
  /** Whether the card being previewed has a nickname; moves the crown. */
  readonly hasNickname?: boolean;
}

export interface Placed {
  readonly x: number;
  readonly y: number;
}

export type Placement =
  /** Centred on the canvas — full-sheet art. */
  | { readonly kind: "center" }
  /** Drawn at a fixed point on the sheet. */
  | { readonly kind: "at"; readonly at: Placed }
  /**
   * Positioned by the renderer at draw time from measurements nothing static
   * has — ability rows, saga chapters, the flipside plate.
   */
  | { readonly kind: "dynamic"; readonly reason: string };

/** First segment of a dotted asset path, e.g. `crown` in `crown.nickname`. */
const familyOf = (assetPath: string): string =>
  assetPath.split(".")[0] ?? assetPath;

/**
 * Where an asset is drawn on the sheet.
 *
 * Most frame art is full-sheet and simply centres, but several families do
 * not: crowns, nicknames and the PT plate are placed from the layout's own
 * render config, and drawing them centred — as a naive compositor does — puts
 * a legendary crown in the middle of the card. The positions here mirror
 * Card Anvil's `konva/nodes/imageNodes.ts`, which is the authority.
 *
 * `assetPath` is the dotted path within a `FrameAssets`, as `walkAssets`
 * reports it: `base.w`, `crown.nickname`, `pt.u`, and so on.
 */
export function placeAsset(
  assetPath: string,
  config: PlacementConfig = {},
  image?: { readonly width: number; readonly height: number },
): Placement {
  const family = familyOf(assetPath);
  const leaf = assetPath.split(".").slice(1).join(".");

  switch (family) {
    // Full-sheet art.
    case "base":
    case "land":
    case "nyx":
    case "tall":
    case "creature":
    case "tokenTitle":
    case "extendedOverlay":
      return { kind: "center" };

    case "black":
      return { kind: "at", at: { x: CROWN_BLACK_BAR.x, y: CROWN_BLACK_BAR.y } };

    case "dfcIcon":
    case "dfcIconSet":
    case "dfcIconColorSet":
      return { kind: "at", at: { x: 0, y: 0 } };

    case "crown": {
      const crown = config.crownConfig ?? defaultCrownConfig;
      const nicknamed = config.hasNickname === true;
      const x = (nicknamed ? crown.nicknameCrownX : undefined) ?? crown.x;
      const y = (nicknamed ? crown.nicknameCrownY : undefined) ?? crown.y;

      // The nyx insert sits just inside the crown it decorates.
      if (leaf.startsWith("nyxInsert")) {
        const insetX =
          crown.nyxInsertX ??
          (image
            ? x + (CROWN_BLACK_BAR.width - image.width) / 2
            : NYX_INSERT_FALLBACK_X);
        const insetY =
          (nicknamed ? crown.nyxInsertNicknameY : undefined) ??
          crown.nyxInsertY ??
          y + 2;
        return { kind: "at", at: { x: insetX, y: insetY } };
      }
      return { kind: "at", at: { x, y } };
    }

    case "nickname": {
      const nickname = config.nicknameConfig ?? defaultNicknameConfig;
      return { kind: "at", at: { x: nickname.x, y: nickname.y } };
    }

    case "pt": {
      const pt = config.ptImage ?? DEFAULT_PT_IMAGE;
      return { kind: "at", at: { x: pt.x, y: pt.y } };
    }

    case "planeswalker":
      return {
        kind: "dynamic",
        reason: "ability rows are laid out from the card's ability count",
      };
    case "saga":
      return {
        kind: "dynamic",
        reason: "chapter badges are laid out from the card's chapter count",
      };
    case "flipside":
      return {
        kind: "dynamic",
        reason: "positioned from the other face's power/toughness",
      };

    default:
      return { kind: "center" };
  }
}

/** Resolves a placement to concrete coordinates for an image of known size. */
export function placementOrigin(
  placement: Placement,
  image: { readonly width: number; readonly height: number },
  canvas: { readonly width: number; readonly height: number },
): Placed | undefined {
  switch (placement.kind) {
    case "center":
      return {
        x: (canvas.width - image.width) / 2,
        y: (canvas.height - image.height) / 2,
      };
    case "at":
      return placement.at;
    default:
      return undefined;
  }
}
