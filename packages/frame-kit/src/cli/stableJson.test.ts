import { describe, expect, it } from "vitest";

import { stableStringify } from "./stableJson.js";

describe("stableStringify", () => {
  it("sorts keys so the bytes do not depend on construction order", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(
      stableStringify({ a: 2, b: 1 }),
    );
    expect(stableStringify({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}\n');
  });

  it("sorts nested keys too", () => {
    expect(stableStringify({ x: { z: 1, y: 2 } })).toBe(
      '{\n  "x": {\n    "y": 2,\n    "z": 1\n  }\n}\n',
    );
  });

  // Array order carries meaning — assets are sorted by path already, and
  // layout ordering is the author's.
  it("leaves array order alone", () => {
    expect(stableStringify(["c", "a", "b"])).toBe(
      '[\n  "c",\n  "a",\n  "b"\n]\n',
    );
  });

  it("sorts keys inside arrays", () => {
    expect(stableStringify([{ b: 1, a: 2 }])).toContain('"a": 2,\n    "b": 1');
  });

  it("ends with a newline", () => {
    expect(stableStringify({})).toBe("{}\n");
  });
});
