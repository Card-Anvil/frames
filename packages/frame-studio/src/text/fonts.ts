import plantinItalic from "./fonts/PlantinMTProRgIt.woff2?url";
import beleren from "./fonts/beleren-b.ttf?url";
import belerenSmallCaps from "./fonts/beleren-bsc.ttf?url";

/**
 * The faces the studio can draw with — one per single-line box the renderer
 * has: Beleren for the name and type line, Beleren Small Caps for P/T, and
 * Plantin MT Pro italic for a nickname title. See `singleLine.ts` for which
 * box takes which.
 *
 * Weights and styles match `fonts.css`, because measuring against the wrong
 * face is how an overflow warning ends up lying.
 */
const FACES = [
  { family: "Beleren", url: beleren, weight: "bold", style: "normal" },
  {
    family: "Beleren Small Caps",
    url: belerenSmallCaps,
    weight: "bold",
    style: "normal",
  },
  {
    family: "Plantin MT Pro",
    url: plantinItalic,
    weight: "normal",
    style: "italic",
  },
] as const;

export const AVAILABLE_FAMILIES: readonly string[] = FACES.map(
  (face) => face.family,
);

/** Fallback when a box names a family the studio does not have. */
export const FALLBACK_FAMILY = "serif";

let ready: Promise<void> | undefined;

/**
 * Loads the vendored faces once, and resolves when they are measurable.
 *
 * Canvas text measurement silently falls back to a system font if you measure
 * before the face has landed, which would make every wrap and overflow
 * decision subtly wrong. Everything that measures waits on this.
 */
export function loadFonts(): Promise<void> {
  ready ??= (async () => {
    await Promise.all(
      FACES.map(async ({ family, url, weight, style }) => {
        const face = new FontFace(family, `url(${url})`, { weight, style });
        document.fonts.add(await face.load());
      }),
    );
    await document.fonts.ready;
  })();
  return ready;
}

/** Whether the studio actually ships the family a box asked for. */
export function resolveFamily(requested: string): {
  family: string;
  substituted: boolean;
} {
  return AVAILABLE_FAMILIES.includes(requested)
    ? { family: requested, substituted: false }
    : { family: FALLBACK_FAMILY, substituted: true };
}
