/**
 * Pure text-layout facts, kept free of Konva and of the font files so they can
 * be tested under Node.
 */

/**
 * Canvas reads a `pt` font size as CSS points (1pt = 1/72in, 96px/in), and
 * Konva only takes px. Card Anvil's renderer converts the same way — see its
 * `konva/measure.ts`. Diverging here would put every box at the wrong size.
 */
export const PT_TO_PX = 96 / 72;

export const ptToPx = (pt: number): number => pt * PT_TO_PX;
export const pxToPt = (px: number): number => px / PT_TO_PX;

/**
 * Boxes the studio previews text in.
 *
 * Exactly the four the renderer draws with `buildOutlinedText`: they need no
 * wrapping, no symbol layout and no auto-shrink, so what is drawn is what the
 * box says. Rules, abilities and `keyword` wrap, so they are deliberately
 * absent — reproducing those means reproducing the renderer, and Card Anvil
 * stays the authority on them.
 */
export const PREVIEWABLE = ["title", "type", "nicknameTitle", "pt"] as const;

export type PreviewableBox = (typeof PREVIEWABLE)[number];

export const isPreviewable = (key: string): key is PreviewableBox =>
  (PREVIEWABLE as readonly string[]).includes(key);
