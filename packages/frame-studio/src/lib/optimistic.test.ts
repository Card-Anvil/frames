import { describe, expect, it } from "vitest";

import type { FramePayload } from "../api/types.js";
import { atPath } from "./frameModel.js";
import { pathKey, withPending } from "./optimistic.js";

const payload = (): FramePayload =>
  ({
    slug: "fixture",
    revision: 7,
    canvas: { width: 3264, height: 4440 },
    frame: {
      config: {
        layouts: {
          normal: {
            boxes: {
              title: {
                x: 400,
                y: 2446,
                width: 2100,
                height: 180,
                color: "black",
              },
              type: { x: 400, y: 2700, width: 2100, height: 150 },
            },
          },
        },
      },
    },
  }) as unknown as FramePayload;

const titlePath = ["config", "layouts", "normal", "boxes", "title"];
const at = (frame: unknown, ...rest: string[]) =>
  atPath(frame, [...titlePath, ...rest]);

describe("withPending", () => {
  // Identity matters: a new object here would re-run every dependent effect,
  // which is the churn this exists to stop.
  it("returns the same payload when nothing is pending", () => {
    const original = payload();
    expect(withPending(original, new Map())).toBe(original);
  });

  it("overlays a committed value", () => {
    const next = withPending(
      payload(),
      new Map([[pathKey([...titlePath, "x"]), 512]]),
    );
    expect(at(next.frame, "x")).toBe(512);
  });

  it("leaves the original payload untouched", () => {
    const original = payload();
    withPending(original, new Map([[pathKey([...titlePath, "x"]), 512]]));
    expect(at(original.frame, "x")).toBe(400);
  });

  it("overlays several fields of one box at once", () => {
    const next = withPending(
      payload(),
      new Map<string, number>([
        [pathKey([...titlePath, "x"]), 1],
        [pathKey([...titlePath, "y"]), 2],
        [pathKey([...titlePath, "width"]), 3],
        [pathKey([...titlePath, "height"]), 4],
      ]),
    );
    expect([
      at(next.frame, "x"),
      at(next.frame, "y"),
      at(next.frame, "width"),
      at(next.frame, "height"),
    ]).toEqual([1, 2, 3, 4]);
  });

  it("keeps the fields it was not given", () => {
    const next = withPending(
      payload(),
      new Map([[pathKey([...titlePath, "x"]), 512]]),
    );
    expect(at(next.frame, "y")).toBe(2446);
    expect(at(next.frame, "color")).toBe("black");
  });

  it("overlays strings and booleans too", () => {
    const next = withPending(
      payload(),
      new Map<string, string>([[pathKey([...titlePath, "color"]), "white"]]),
    );
    expect(at(next.frame, "color")).toBe("white");
  });

  it("ignores a path that does not exist", () => {
    const next = withPending(
      payload(),
      new Map([["config.layouts.nope.boxes.title.x", 512]]),
    );
    expect(at(next.frame, "x")).toBe(400);
  });
});
