import type { Bounds, Rotation } from "../schema/frame.js";

/**
 * The geometry of a turned box set — one whose `rotation` says the card is
 * turned to read it (see `CardBoxesSchema`).
 *
 * Two spaces are in play. The **sheet** is the canvas as printed, and never
 * turns. A set's **turned space** is that sheet as it lies once the card has
 * been turned `rotation` degrees clockwise, which is where the set's boxes are
 * measured. Everything here maps the second onto the first.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A 2D affine transform in the order a canvas takes one:
 * `x' = a·x + c·y + e`, `y' = b·x + d·y + f`.
 */
export type Matrix = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

/** The sheet as a turned set sees it: a quarter turn swaps its sides. */
export function turnedSheetSize(
  sheet: Size,
  rotation: Rotation | undefined,
): Size {
  return rotation === 90 || rotation === 270
    ? { width: sheet.height, height: sheet.width }
    : { width: sheet.width, height: sheet.height };
}

/**
 * Where a turned set's origin lands on the sheet and how far it is rotated
 * there, in degrees clockwise — the `x`, `y` and `rotation` of a node that
 * draws the set. Turning the card clockwise to read a set means the set
 * itself sits counter-clockwise on the sheet, hence the opposite sign.
 */
export function turnPlacement(
  sheet: Size,
  rotation: Rotation | undefined,
): Point & { rotation: number } {
  switch (rotation) {
    case 90:
      return { x: 0, y: sheet.height, rotation: -90 };
    case 180:
      return { x: sheet.width, y: sheet.height, rotation: 180 };
    case 270:
      return { x: sheet.width, y: 0, rotation: 90 };
    default:
      return { x: 0, y: 0, rotation: 0 };
  }
}

/** {@link turnPlacement} as a matrix taking turned space to the sheet. */
export function turnMatrix(
  sheet: Size,
  rotation: Rotation | undefined,
): Matrix {
  switch (rotation) {
    case 90:
      return [0, -1, 1, 0, 0, sheet.height];
    case 180:
      return [-1, 0, 0, -1, sheet.width, sheet.height];
    case 270:
      return [0, 1, -1, 0, sheet.width, 0];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

/** A point in a matrix's source space, in its target space. */
export function applyMatrix(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix;
  return {
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
  };
}

/** The rectangle a turned set's box covers on the sheet. */
export function turnedBoundsOnSheet(
  bounds: Bounds,
  sheet: Size,
  rotation: Rotation | undefined,
): Bounds {
  switch (rotation) {
    case 90:
      return {
        x: bounds.y,
        y: sheet.height - bounds.x - bounds.width,
        width: bounds.height,
        height: bounds.width,
      };
    case 180:
      return {
        x: sheet.width - bounds.x - bounds.width,
        y: sheet.height - bounds.y - bounds.height,
        width: bounds.width,
        height: bounds.height,
      };
    case 270:
      return {
        x: sheet.width - bounds.y - bounds.height,
        y: bounds.x,
        width: bounds.height,
        height: bounds.width,
      };
    default:
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
  }
}

/**
 * A direction in a turned set's space, as a direction on the sheet. Only the
 * turn applies; a direction has no position to translate.
 */
export function turnedVectorOnSheet(
  vector: Point,
  rotation: Rotation | undefined,
): Point {
  switch (rotation) {
    case 90:
      return { x: vector.y, y: -vector.x };
    case 180:
      return { x: -vector.x, y: -vector.y };
    case 270:
      return { x: -vector.y, y: vector.x };
    default:
      return { x: vector.x, y: vector.y };
  }
}

/** The reverse of {@link turnedVectorOnSheet}. */
export function sheetVectorInTurned(
  vector: Point,
  rotation: Rotation | undefined,
): Point {
  switch (rotation) {
    case 90:
      return { x: -vector.y, y: vector.x };
    case 180:
      return { x: -vector.x, y: -vector.y };
    case 270:
      return { x: vector.y, y: -vector.x };
    default:
      return { x: vector.x, y: vector.y };
  }
}
