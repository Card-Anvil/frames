import beleren from "./fonts/beleren-b.ttf?url";
import belerenSmallCaps from "./fonts/beleren-bsc.ttf?url";

/**
 * The faces the studio can draw with.
 *
 * Card Anvil renders both the card name and the type line in Beleren
 * (`TITLE_FONT` / `TYPE_FONT` in its `utils/card.ts`), and the only
 * `fontFamily` overrides across every shipped frame name these same two
 * families — so this is the complete set for a single-line preview.
 *
 * Both are declared bold: that is the weight `fonts.css` declares, and the
 * only one either file ships.
 */
const FACES = [
  { family: "Beleren", url: beleren },
  { family: "Beleren Small Caps", url: belerenSmallCaps },
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
      FACES.map(async ({ family, url }) => {
        const face = new FontFace(family, `url(${url})`, { weight: "bold" });
        document.fonts.add(await face.load());
      }),
    );
    await document.fonts.ready;
  })();
  return ready;
}

/** The family to draw a box in, and whether it is the one it asked for. */
export function resolveFamily(requested: string | undefined): {
  family: string;
  substituted: boolean;
} {
  if (requested === undefined) {
    return { family: "Beleren", substituted: false };
  }
  return AVAILABLE_FAMILIES.includes(requested)
    ? { family: requested, substituted: false }
    : { family: FALLBACK_FAMILY, substituted: true };
}
