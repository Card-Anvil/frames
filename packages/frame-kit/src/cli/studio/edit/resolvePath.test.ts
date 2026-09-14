import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type ResolveContext,
  type Resolution,
  resolveFramePath,
} from "./resolvePath.js";
import { createSourceIndex } from "./sourceIndex.js";
import { loadTypeScript } from "./ts.js";

const fixtures = path.join(import.meta.dirname, "__fixtures__");
const root = path.resolve(import.meta.dirname, "../../../..");

let ctx: ResolveContext;

beforeAll(async () => {
  const api = await loadTypeScript();
  ctx = { api, index: createSourceIndex(api), root };
});

const at = (file: string, exportName: string, ...segments: string[]) =>
  resolveFramePath(ctx, path.join(fixtures, file), exportName, segments);

/** The literal text, or the reason it could not be resolved. */
function outcome(resolution: Resolution): string {
  return resolution.editable ? resolution.text : resolution.reason;
}

describe("template shape (a flat boxes.ts)", () => {
  const box = (...segments: string[]) =>
    at(
      "shape1-index.ts",
      "plainFrame",
      "config",
      "layouts",
      "normal",
      "boxes",
      ...segments,
    );

  it("resolves a number through a shorthand property and an import", () => {
    const resolved = box("title", "x");
    expect(outcome(resolved)).toBe("400");
    expect(resolved.editable && path.basename(resolved.file)).toBe(
      "shape1-boxes.ts",
    );
  });

  it("reports a 1-based line and column", () => {
    const resolved = box("title", "y");
    expect(resolved.editable && resolved.location.line).toBeGreaterThan(1);
    expect(resolved.editable && resolved.location.column).toBeGreaterThan(1);
  });

  it("resolves strings, booleans and negative numbers", () => {
    expect(outcome(box("title", "color"))).toBe('"#000000"');
    expect(outcome(box("title", "textAlign"))).toBe('"left"');
    expect(outcome(box("title", "shadow"))).toBe("true");
    expect(outcome(box("negative", "x"))).toBe("-12");
  });

  it("refuses a property that is not written", () => {
    expect(outcome(box("title", "outlineWidth"))).toBe("missing-property");
  });

  it("refuses a path through a box that does not exist", () => {
    expect(outcome(box("nickname", "x"))).toBe("missing-property");
  });
});

describe("workspace shape (an inline const, spreads and `as const`)", () => {
  const box = (layout: string, ...segments: string[]) =>
    at(
      "shape2-config.ts",
      "shape2Frame",
      "config",
      "layouts",
      layout,
      "boxes",
      ...segments,
    );

  it("resolves through `as const` and a local const", () => {
    expect(outcome(box("normal", "title", "x"))).toBe("400");
  });

  it("follows a spread to the base object", () => {
    expect(outcome(box("short", "title", "x"))).toBe("400");
  });

  // The override is written after the spread, so it wins.
  it("prefers an own property over an earlier spread", () => {
    expect(outcome(box("short", "type", "y"))).toBe("2900");
  });

  it("still reaches unshadowed members of a spread-over object", () => {
    expect(outcome(box("short", "type", "x"))).toBe("400");
  });

  it("refuses a value computed from another", () => {
    expect(outcome(box("computed", "title", "x"))).toBe("computed");
  });

  // Two layouts read the same literal, so an edit to one moves both. The
  // studio has to be able to see that before it writes.
  it("lands on the same range for a value two layouts share", () => {
    const a = box("normal", "title", "y");
    const b = box("short", "title", "y");
    expect(a.editable && b.editable && a.start).toBe(b.editable ? b.start : -1);
    expect(a.editable && b.editable && a.file).toBe(b.editable ? b.file : "");
  });
});

describe("helpers", () => {
  const box = (layout: string, ...segments: string[]) =>
    at(
      "shape3-helpers.ts",
      "helperFrame",
      "config",
      "layouts",
      layout,
      "boxes",
      ...segments,
    );

  it("sees through frame-kit's omit()", () => {
    expect(outcome(box("textless", "title", "x"))).toBe("400");
  });

  it("reports a key omit() removed as missing", () => {
    expect(outcome(box("textless", "rules", "x"))).toBe("missing-property");
  });

  it("applies overrides spread inside an omit() argument", () => {
    expect(outcome(box("textless", "type", "y"))).toBe("3400");
  });

  it("inlines a single-expression local function", () => {
    expect(outcome(box("textless", "mana", "x"))).toBe("2600");
  });

  it("inlines a block-bodied function with a const and a return", () => {
    expect(outcome(box("wide", "title", "width"))).toBe("2200");
    expect(outcome(box("wide", "title", "x"))).toBe("400");
  });

  // Building an object then mutating it is beyond static resolution, and
  // guessing would be worse than refusing.
  it("refuses a function that mutates what it returns", () => {
    expect(outcome(box("mutated", "title", "y"))).toBe("helper-call");
  });

  it("names the construct it could not follow", () => {
    const resolved = box("mutated", "title", "y");
    expect(resolved.editable).toBe(false);
    expect(!resolved.editable && resolved.detail).toContain("mutating");
    expect(!resolved.editable && resolved.source?.line).toBeGreaterThan(0);
  });
});

describe("guards", () => {
  it("refuses an export that does not exist", () => {
    expect(outcome(at("shape1-index.ts", "noSuchFrame", "config"))).toBe(
      "no-export",
    );
  });

  it("refuses a file that cannot be read", () => {
    expect(outcome(at("does-not-exist.ts", "x", "config"))).toBe("unreadable");
  });

  it("refuses a value outside the root it was given", () => {
    const narrow: ResolveContext = {
      ...ctx,
      root: path.join(fixtures, "nowhere"),
    };
    const resolved = resolveFramePath(
      narrow,
      path.join(fixtures, "shape1-index.ts"),
      "plainFrame",
      ["config", "layouts", "normal", "boxes", "title", "x"],
    );
    expect(outcome(resolved)).toBe("outside-root");
  });

  it("refuses an object where a literal was asked for", () => {
    expect(
      outcome(
        at(
          "shape1-index.ts",
          "plainFrame",
          "config",
          "layouts",
          "normal",
          "boxes",
          "title",
        ),
      ),
    ).toBe("not-a-literal");
  });
});
