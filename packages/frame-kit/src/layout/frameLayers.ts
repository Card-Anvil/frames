import type { FrameColor, FrameRef } from "../schema/frameAssets.js";

/**
 * The subset of Proxyshop's `LAYERS` enum the frame logic needs: canonical
 * colour letters plus the identity labels. Mirrors Card Anvil's
 * `utils/frameLogic.ts`, which is where the card-parsing half still lives.
 */
export const LAYERS = {
  WHITE: "W",
  BLUE: "U",
  BLACK: "B",
  RED: "R",
  GREEN: "G",
  ARTIFACT: "Artifact",
  COLORLESS: "Colorless",
  LAND: "Land",
  GOLD: "Gold",
  VEHICLE: "Vehicle",
  HYBRID: "Hybrid",
} as const;

/** WUBRG in canonical order, which every multi-colour string is sorted into. */
export const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;

const COLOR_LETTERS = new Set<string>(COLOR_ORDER);

/**
 * What the frame logic concluded about a card, before any art is chosen.
 *
 * This is the seam between parsing a card and picking its frame: Card Anvil
 * derives it from a Scryfall card, and the studio builds it from a colour
 * picker, but both feed the same selection below.
 */
export interface FrameDetails {
  /** Drives the base frame: a colour, `Artifact`, `Land`, `Gold`… */
  background: string;
  /** Colours the pinlines and text box. */
  pinlines: string;
  /** Colours the name and type boxes. */
  twins: string;
  /** The card's colour identity; what a land's base frame uses. */
  identity: string;
  isColorless: boolean;
  isHybrid: boolean;
}

/**
 * Which set of frame art a card draws from. Lands use `land`, enchantments
 * `nyx` when nyx borders are on, everything else the plain colour frames.
 */
export type FrameFamily = "normal" | "land" | "nyx";

/** A mask that recolours one section of the frame. */
export type OverlayMaskName =
  "pinlines" | "rules" | "titleAndType" | "title" | "rightHalf";

export interface FrameOverlay {
  frame: FrameRef;
  mask: OverlayMaskName;
  /** Applied after the primary mask. */
  secondaryMask?: "rightHalf";
  /** Blend RGB only, keeping the existing alpha. */
  preserveAlpha?: boolean;
}

export interface FrameLayers {
  baseFrame: FrameRef;
  overlays?: FrameOverlay[];
}

/** Whether two refs point at the same family and colour. */
function sameRef(a: FrameRef, b: FrameRef): boolean {
  return a.family === b.family && a.color === b.color;
}

/** Maps a `LAYERS` value to a single frame colour token. */
export function colorToken(value: string): FrameColor {
  switch (value) {
    case LAYERS.WHITE:
      return "w";
    case LAYERS.BLUE:
      return "u";
    case LAYERS.BLACK:
      return "b";
    case LAYERS.RED:
      return "r";
    case LAYERS.GREEN:
      return "g";
    case LAYERS.ARTIFACT:
      return "a";
    case LAYERS.COLORLESS:
      return "c";
    case LAYERS.LAND:
      return "l";
    case LAYERS.VEHICLE:
      return "v";
    case LAYERS.GOLD:
      return "m";
    case "":
      return "c";
    default:
      // Three or more colours share the gold frame.
      return "m";
  }
}

/** Splits a two-colour combo like `WU`, or `null` if it is not one. */
export function splitTwoColor(value: string): [FrameColor, FrameColor] | null {
  const [first, second] = value;
  if (
    value.length === 2 &&
    first !== undefined &&
    second !== undefined &&
    COLOR_LETTERS.has(first) &&
    COLOR_LETTERS.has(second)
  ) {
    return [
      first.toLowerCase() as FrameColor,
      second.toLowerCase() as FrameColor,
    ];
  }
  return null;
}

/**
 * The ref for a colour within a family.
 *
 * Families do not all carry every colour, and the fallbacks are deliberate:
 * nyx has no vehicle frame, and a land that is not one of WUBRG or gold falls
 * back to the colourless land in the base family.
 */
export function makeFamilyRef(
  color: FrameColor | "c2",
  family: FrameFamily,
): FrameRef {
  if (family === "normal") {
    return { family: "base", color };
  }
  if (family === "nyx") {
    switch (color) {
      case "w":
      case "u":
      case "b":
      case "r":
      case "g":
      case "m":
      case "a":
      case "c":
      case "l":
        return { family: "nyx", color };
      case "v":
        return { family: "nyx", color: "a" }; // there is no nyx vehicle frame
      default:
        return { family: "nyx", color: "c" };
    }
  }
  switch (color) {
    case "w":
    case "u":
    case "b":
    case "r":
    case "g":
    case "m":
      return { family: "land", color };
    default:
      // a / c / l / v / c2 → the colourless land, which lives in `base`.
      return { family: "base", color: "l" };
  }
}

/** The family a type line implies. */
export function frameFamily(
  typeLine: string,
  useNyxBorder = true,
): FrameFamily {
  const lower = typeLine.toLowerCase();
  if (lower.includes("enchantment") && useNyxBorder) {
    return "nyx";
  }
  return lower.includes("land") ? "land" : "normal";
}

/** Section overlays that recolour pinlines, text box and twins. */
function buildSectionOverlays(
  details: FrameDetails,
  family: FrameFamily,
  baseRef: FrameRef,
): FrameOverlay[] {
  const overlays: FrameOverlay[] = [];
  const pinlineSplit = splitTwoColor(details.pinlines);

  if (pinlineSplit) {
    // Two colours: the left colour runs full width, the right is masked to
    // its half, for both the pinlines and the text box.
    const first = makeFamilyRef(pinlineSplit[0], family);
    const second = makeFamilyRef(pinlineSplit[1], family);
    overlays.push(
      { frame: first, mask: "pinlines", preserveAlpha: true },
      {
        frame: second,
        mask: "pinlines",
        secondaryMask: "rightHalf",
        preserveAlpha: true,
      },
      { frame: first, mask: "rules", preserveAlpha: true },
      {
        frame: second,
        mask: "rules",
        secondaryMask: "rightHalf",
        preserveAlpha: true,
      },
    );
  } else {
    const pinlines = makeFamilyRef(colorToken(details.pinlines), family);
    if (!sameRef(pinlines, baseRef)) {
      overlays.push(
        { frame: pinlines, mask: "pinlines", preserveAlpha: true },
        { frame: pinlines, mask: "rules", preserveAlpha: true },
      );
    }
  }

  const twins = makeFamilyRef(colorToken(details.twins), family);
  if (!sameRef(twins, baseRef)) {
    overlays.push({ frame: twins, mask: "titleAndType", preserveAlpha: true });
  }

  // The border follows the background, which the base frame already supplies.
  return overlays;
}

export interface SelectOptions {
  readonly family?: FrameFamily;
  /** Mask for the colourless wash over a two-colour hybrid. */
  readonly hybridTitleMask?: "title" | "titleAndType";
  /**
   * Whether the layout ships a `pinlines` mask. A coloured artifact normally
   * keeps the Artifact base and carries its colour in the overlays; a layout
   * with no pinlines mask can never draw those, so it falls back to a
   * colour-based base rather than losing the colour entirely.
   */
  readonly hasPinlineMask?: boolean;
}

/**
 * The art to composite for a set of frame details.
 *
 * The selection half of Card Anvil's `getFrameLayers`, with the card parsing
 * lifted out: mono and three-plus-colour cards are a single base frame, gold
 * two-colour cards get split pinlines, and two-colour hybrids render as two
 * halves under a colourless wash.
 */
export function selectFrameLayers(
  details: FrameDetails,
  options: SelectOptions = {},
): FrameLayers {
  const {
    family = "normal",
    hybridTitleMask = "titleAndType",
    hasPinlineMask = true,
  } = options;

  if (details.isHybrid) {
    const split = splitTwoColor(details.pinlines);
    if (split) {
      return {
        baseFrame: makeFamilyRef(split[0], family),
        overlays: [
          {
            frame: makeFamilyRef(split[1], family),
            mask: "rightHalf",
            preserveAlpha: true,
          },
          {
            frame: makeFamilyRef("c2", family),
            mask: hybridTitleMask,
            preserveAlpha: true,
          },
        ],
      };
    }
  }

  const usesArtifactFallback =
    family !== "land" &&
    !hasPinlineMask &&
    details.background === LAYERS.ARTIFACT &&
    details.identity.length > 0;

  const baseColor = colorToken(
    family === "land" || usesArtifactFallback
      ? details.identity
      : details.background,
  );
  const baseRef = makeFamilyRef(baseColor, family);
  const overlays = buildSectionOverlays(details, family, baseRef);

  return {
    baseFrame: baseRef,
    ...(overlays.length > 0 ? { overlays } : {}),
  };
}

/**
 * What a card is, reduced to the switches that actually change its frame.
 *
 * Card Anvil derives these from a Scryfall card; the studio has no card, so it
 * offers them as controls. Everything here maps onto a real Scryfall
 * distinction — `devoid` is the Battle for Zendikar keyword, `vehicle` and
 * `artifact` are type-line terms, `land` and `enchantment` pick the frame
 * family.
 */
export interface CardShape {
  /** Colour identity, in any order; sorted into WUBRG here. */
  readonly colors?: readonly FrameColor[];
  readonly isArtifact?: boolean;
  readonly isVehicle?: boolean;
  readonly isLand?: boolean;
  readonly isEnchantment?: boolean;
  /** Devoid: coloured by identity, but framed colourless. */
  readonly isDevoid?: boolean;
  /** A card with no colours at all — Eldrazi, most artifacts' pinlines. */
  readonly isColorless?: boolean;
  /** Two colours paid with hybrid mana, which splits the frame down the middle. */
  readonly isHybrid?: boolean;
}

/** WUBRG order, which every colour combination is normalised into. */
export function orderColors(colors: readonly FrameColor[]): string {
  const wanted = new Set(colors.map((color) => color.toUpperCase()));
  return COLOR_ORDER.filter((letter) => wanted.has(letter)).join("");
}

/**
 * The frame details a card shape implies.
 *
 * Mirrors the branch order of Card Anvil's `getFrameDetailsNonland` so the
 * studio and the app agree on the awkward cases: devoid multicolour keeps gold
 * plates over a colourless body, a colourless card goes colourless throughout,
 * vehicles and artifacts override the background while their colours stay in
 * the pinlines, and a hybrid pair takes land-coloured twins.
 *
 * Lands are simplified on purpose: the app reads basic-land types and fetch
 * text to infer a land's colours, which a picker states outright.
 */
export function frameDetailsFor(shape: CardShape): FrameDetails {
  const identity = orderColors(shape.colors ?? []);

  const details: FrameDetails = {
    background: identity,
    pinlines: identity,
    twins: identity,
    identity,
    isColorless: false,
    isHybrid: false,
  };

  if (shape.isLand === true) {
    // `selectFrameLayers` takes a land's base colour from `identity`; the
    // background is always Land.
    details.background = LAYERS.LAND;
    if (identity.length === 0) {
      details.pinlines = LAYERS.LAND;
      details.twins = LAYERS.LAND;
    } else if (identity.length > 2) {
      details.pinlines = LAYERS.GOLD;
      details.twins = LAYERS.GOLD;
    }
    return details;
  }

  const devoid = shape.isDevoid === true && identity.length > 0;
  const colorless =
    devoid ||
    shape.isColorless === true ||
    (identity.length === 0 && shape.isArtifact !== true);

  if (colorless) {
    if (devoid && identity.length > 1) {
      details.twins = LAYERS.GOLD;
      details.background = LAYERS.GOLD;
    } else if (!devoid) {
      details.twins = LAYERS.COLORLESS;
      details.background = LAYERS.COLORLESS;
      details.pinlines = LAYERS.COLORLESS;
    }
    details.isColorless = true;
    return details;
  }

  const hybrid = shape.isHybrid === true && identity.length === 2;
  details.isHybrid = hybrid;

  if (shape.isVehicle === true) {
    details.background = LAYERS.VEHICLE;
  } else if (shape.isArtifact === true) {
    details.background = LAYERS.ARTIFACT;
  } else if (identity.length >= 2 && !hybrid) {
    details.background = LAYERS.GOLD;
  }

  if (identity.length === 0) {
    details.pinlines = LAYERS.ARTIFACT;
  } else if (identity.length > 2) {
    details.pinlines = LAYERS.GOLD;
  }

  if (identity.length === 0) {
    details.twins = LAYERS.ARTIFACT;
  } else if (hybrid) {
    details.twins = LAYERS.LAND;
  } else if (identity.length >= 2) {
    details.twins = LAYERS.GOLD;
  }

  return details;
}

/** The frame family a card shape implies, without a type line to parse. */
export function familyFor(shape: CardShape, useNyxBorder = true): FrameFamily {
  if (shape.isEnchantment === true && useNyxBorder) {
    return "nyx";
  }
  return shape.isLand === true ? "land" : "normal";
}
