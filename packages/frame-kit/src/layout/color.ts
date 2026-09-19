export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses a browser-normalized color string — what a canvas 2D context's
 * `fillStyle` getter returns after being assigned a valid CSS color, e.g.
 * `"#ffffff"` or `"rgba(255, 0, 0, 0.5)"`. Hex and `rgb()`/`rgba()` only: a
 * named color has to go through a canvas first.
 */
export function parseNormalizedCssColor(
  normalized: string,
): RgbColor | undefined {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(
    normalized.trim(),
  );
  const digits = hex?.[1];
  if (digits) {
    if (digits.length === 3) {
      const [r = "0", g = "0", b = "0"] = digits;
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
      };
    }
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }

  const fn = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(
    normalized.trim(),
  );
  const [, rStr, gStr, bStr] = fn ?? [];
  if (rStr && gStr && bStr) {
    return { r: Number(rStr), g: Number(gStr), b: Number(bStr) };
  }

  return undefined;
}

/**
 * WCAG relative luminance of an sRGB color (0 = black, 1 = white).
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function relativeLuminance({ r, g, b }: RgbColor): number {
  const linear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * Picks whichever of black or white text has the higher WCAG contrast ratio
 * against `background` — the standard way to choose readable text color for
 * an arbitrary, user-chosen background (e.g. the border-color setting).
 */
export function getReadableTextColor(background: RgbColor): "black" | "white" {
  const l = relativeLuminance(background);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithBlack = (l + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "white" : "black";
}
