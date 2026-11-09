import type { PowerToughnessRow } from "../schema/frame.js";

/** How wide each part of a `powerToughnessRow` is drawn, in sheet px. */
export interface PowerToughnessRowWidths {
  power: number;
  toughness: number;
  /** The widest image in the power's `ptSlot`; 0, or left out, for none. */
  powerSymbol?: number;
  /** The widest image in the toughness's `ptSlot`; 0, or left out, for none. */
  toughnessSymbol?: number;
}

/** Where a `powerToughnessRow` puts each part, in sheet x. */
export interface PowerToughnessRowPlacement {
  /** The power number's left edge. */
  power: number;
  /** The toughness number's left edge. */
  toughness: number;
  /** Where the power's symbols end: their right edge. */
  powerSymbol: number;
  /** Where the toughness's symbols end: their right edge. */
  toughnessSymbol: number;
}

/**
 * Lays out a `powerToughnessRow` from its right edge: the toughness, its
 * symbol, the power, then the power's symbol, each left of the one before.
 */
export function powerToughnessRow(
  row: PowerToughnessRow,
  widths: PowerToughnessRowWidths,
): PowerToughnessRowPlacement {
  const toughness = row.right - widths.toughness;
  const toughnessSymbol = toughness - row.gap;
  const power =
    toughnessSymbol -
    (widths.toughnessSymbol ?? 0) -
    row.spacing -
    widths.power;
  return { power, toughness, powerSymbol: power - row.gap, toughnessSymbol };
}
