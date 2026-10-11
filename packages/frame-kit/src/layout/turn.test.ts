import { describe, expect, it } from "vitest";

import type { Rotation } from "../schema/frame.js";
import {
  applyMatrix,
  sheetVectorInTurned,
  turnMatrix,
  turnPlacement,
  turnedBoundsOnSheet,
  turnedSheetSize,
  turnedVectorOnSheet,
} from "./turn.js";

const sheet = { width: 3264, height: 4440 };
const rotations = [undefined, 90, 180, 270] as const;

/** `-0` and `0` are the same place; `toEqual` disagrees. */
const point = ({ x, y }: { x: number; y: number }) => ({
  x: x + 0,
  y: y + 0,
});

describe("turnedSheetSize", () => {
  it("swaps the sheet's sides at a quarter turn only", () => {
    expect(turnedSheetSize(sheet, undefined)).toEqual(sheet);
    expect(turnedSheetSize(sheet, 180)).toEqual(sheet);
    expect(turnedSheetSize(sheet, 90)).toEqual({ width: 4440, height: 3264 });
    expect(turnedSheetSize(sheet, 270)).toEqual({ width: 4440, height: 3264 });
  });
});

describe("turnMatrix", () => {
  // A split card is read turned 90 clockwise: its top edge is the sheet's
  // left edge, and its first half sits at the bottom of the sheet.
  it("puts a set turned 90 up the sheet's left edge", () => {
    const matrix = turnMatrix(sheet, 90);
    expect(point(applyMatrix(matrix, { x: 0, y: 0 }))).toEqual({
      x: 0,
      y: 4440,
    });
    expect(point(applyMatrix(matrix, { x: 4440, y: 0 }))).toEqual({
      x: 0,
      y: 0,
    });
    expect(point(applyMatrix(matrix, { x: 0, y: 3264 }))).toEqual({
      x: 3264,
      y: 4440,
    });
  });

  // An aftermath half is read turned the other way: its top edge is the
  // sheet's right edge.
  it("puts a set turned 270 down the sheet's right edge", () => {
    const matrix = turnMatrix(sheet, 270);
    expect(point(applyMatrix(matrix, { x: 0, y: 0 }))).toEqual({
      x: 3264,
      y: 0,
    });
    expect(point(applyMatrix(matrix, { x: 4440, y: 0 }))).toEqual({
      x: 3264,
      y: 4440,
    });
  });

  it("puts a set turned 180 upside down from the opposite corner", () => {
    const matrix = turnMatrix(sheet, 180);
    expect(point(applyMatrix(matrix, { x: 0, y: 0 }))).toEqual({
      x: 3264,
      y: 4440,
    });
    expect(point(applyMatrix(matrix, { x: 100, y: 50 }))).toEqual({
      x: 3164,
      y: 4390,
    });
  });

  it("is the identity for an upright set", () => {
    expect(turnMatrix(sheet, undefined)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  // The renderer draws through `turnPlacement` and the PSD writer through the
  // matrix, so the two have to describe one transform.
  it.each(rotations)("agrees with turnPlacement at %s", (rotation) => {
    const placement = turnPlacement(sheet, rotation);
    const radians = (placement.rotation * Math.PI) / 180;
    const cos = Math.round(Math.cos(radians));
    const sin = Math.round(Math.sin(radians));
    const [a, b, c, d, e, f] = turnMatrix(sheet, rotation);
    expect([a, b, c, d, e, f].map((n) => n + 0)).toEqual(
      [cos, sin, -sin, cos, placement.x, placement.y].map((n) => n + 0),
    );
  });
});

describe("turnedBoundsOnSheet", () => {
  const box = { x: 400, y: 300, width: 1000, height: 200 };

  // The rectangle is the box's four corners taken through the matrix, so the
  // shortcut maths here cannot drift from it.
  it.each(rotations)("covers the box's corners at %s", (rotation) => {
    const matrix = turnMatrix(sheet, rotation);
    const corners = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
    ].map((corner) => applyMatrix(matrix, corner));
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    expect(turnedBoundsOnSheet(box, sheet, rotation)).toEqual({
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    });
  });

  it("maps the whole turned sheet onto the whole sheet", () => {
    for (const rotation of rotations) {
      const turned = turnedSheetSize(sheet, rotation);
      expect(
        turnedBoundsOnSheet({ x: 0, y: 0, ...turned }, sheet, rotation),
      ).toEqual({ x: 0, y: 0, ...sheet });
    }
  });

  it("drops anything but the rectangle", () => {
    const text = { ...box, fontSize: 90, color: "white" };
    expect(Object.keys(turnedBoundsOnSheet(text, sheet, 90)).sort()).toEqual([
      "height",
      "width",
      "x",
      "y",
    ]);
  });
});

describe("turned vectors", () => {
  // "Down the page" in a set turned 90 runs towards the sheet's right edge.
  it("turns a reading direction onto the sheet", () => {
    expect(point(turnedVectorOnSheet({ x: 0, y: 1 }, 90))).toEqual({
      x: 1,
      y: 0,
    });
    expect(point(turnedVectorOnSheet({ x: 0, y: 1 }, 270))).toEqual({
      x: -1,
      y: 0,
    });
    expect(point(turnedVectorOnSheet({ x: 0, y: 1 }, 180))).toEqual({
      x: 0,
      y: -1,
    });
  });

  it.each(rotations)("round-trips at %s", (rotation: Rotation | undefined) => {
    const vector = { x: 3, y: -7 };
    expect(
      point(
        sheetVectorInTurned(turnedVectorOnSheet(vector, rotation), rotation),
      ),
    ).toEqual(vector);
  });
});
