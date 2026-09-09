import { describe, expect, it } from "vitest";

import { FrameSchema } from "../schema/frame.js";
import { SHARED_URL, testFrame } from "./testFrame.js";
import { formatPath, getAtPath, setAtPath, walkAssets } from "./walk.js";

const paths = () =>
  walkAssets(FrameSchema, testFrame).map((a) => formatPath(a.path));

describe("walkAssets", () => {
  it("finds every branded asset position", () => {
    expect(paths().sort()).toEqual(
      [
        "config.layouts.normal.frameAssets.base.b",
        "config.layouts.normal.frameAssets.base.u",
        "config.layouts.normal.frameAssets.base.w",
        "config.layouts.normal.frameAssets.black",
        "config.layouts.normal.masks.pinlines",
        "previewImage",
      ].sort(),
    );
  });

  // The guard that matters: packaging rewrites every position this returns, so
  // a color or font leaking in would be copied as if it were a file.
  it("skips styling and display strings", () => {
    const found = paths();
    for (const notAnAsset of [
      "name",
      "description",
      "tags.0",
      "config.layouts.normal.boxes.title.color",
      "config.layouts.normal.boxes.title.outlineColor",
      "config.layouts.normal.boxes.title.fontFamily",
      "templateSettings.style.defaultValue",
      "templateSettings.style.options.0",
    ]) {
      expect(found).not.toContain(notAnAsset);
    }
  });

  it("reports each occurrence of a shared URL separately", () => {
    const shared = walkAssets(FrameSchema, testFrame).filter(
      (a) => a.url === SHARED_URL,
    );
    expect(shared).toHaveLength(2);
  });
});

describe("path helpers", () => {
  it("reads and writes nested positions", () => {
    const value: unknown = { a: { b: ["x"] } };
    expect(getAtPath(value, ["a", "b", 0])).toBe("x");
    setAtPath(value, ["a", "b", 0], "y");
    expect(getAtPath(value, ["a", "b", 0])).toBe("y");
  });

  it("returns undefined for a missing branch instead of throwing", () => {
    expect(getAtPath({ a: 1 }, ["a", "nope", "deeper"])).toBeUndefined();
  });

  it("refuses to write where no container exists", () => {
    expect(() => {
      setAtPath({ a: 1 }, ["missing", "x"], 1);
    }).toThrow(/no container/);
  });
});
