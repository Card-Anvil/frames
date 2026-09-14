import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { type BoxSetRef, createImpactCache, impactOf } from "./impact.js";
import type { ResolveContext } from "./resolvePath.js";
import { createSourceIndex } from "./sourceIndex.js";
import { loadTypeScript } from "./ts.js";

const fixtures = path.join(import.meta.dirname, "__fixtures__");
const entryFile = path.join(fixtures, "shape2-config.ts");
const root = path.resolve(import.meta.dirname, "../../../..");

let ctx: ResolveContext;

beforeAll(async () => {
  const api = await loadTypeScript();
  ctx = { api, index: createSourceIndex(api), root };
});

/** The fixture's three layouts, as `session.ts` would enumerate them. */
const boxSets: BoxSetRef[] = ["normal", "short", "computed"].map((layout) => ({
  variant: null,
  layout,
  key: "boxes",
  path: ["config", "layouts", layout, "boxes"],
}));

const scan = (layout: string, ...tail: string[]) =>
  impactOf({
    ctx,
    entryFile,
    exportName: "shape2Frame",
    boxSets,
    target: ["config", "layouts", layout, "boxes", ...tail],
  });

describe("impactOf", () => {
  // `shortBoxes` and `computedBoxes` both spread `baseBoxes`, so all three
  // layouts read one `title.y`. Moving it in one moves it in all of them, and
  // the studio has to say so before it writes.
  it("finds every layout reading a spread-shared literal", () => {
    const shared = scan("normal", "title", "y");
    expect(shared.map((impact) => impact.layout).sort()).toEqual([
      "computed",
      "short",
    ]);
  });

  it("reports the same set from any of the sharers", () => {
    expect(
      scan("short", "title", "y")
        .map((i) => i.layout)
        .sort(),
    ).toEqual(["computed", "normal"]);
  });

  // `short` overrides `type.y` with its own literal, so it is nobody else's.
  it("finds nothing for a value one layout writes itself", () => {
    expect(scan("short", "type", "y")).toEqual([]);
  });

  // `computedBoxes.title.x` is `400 + SHIFT`, which resolves to no literal at
  // all — an unresolvable value cannot be shared.
  it("finds nothing when the value itself is not editable", () => {
    expect(scan("computed", "title", "x")).toEqual([]);
  });

  it("excludes the value being edited from its own impact list", () => {
    const shared = scan("normal", "title", "y");
    expect(shared.some((impact) => impact.layout === "normal")).toBe(false);
  });

  it("reports the path each sharer reads it through", () => {
    const shared = scan("normal", "title", "y");
    expect(shared.map((impact) => impact.path.join("."))).toEqual(
      expect.arrayContaining([
        "config.layouts.short.boxes.title.y",
        "config.layouts.computed.boxes.title.y",
      ]),
    );
  });

  it("returns nothing for a path outside every box set", () => {
    expect(
      impactOf({
        ctx,
        entryFile,
        exportName: "shape2Frame",
        boxSets,
        target: ["name"],
      }),
    ).toEqual([]);
  });
});

describe("createImpactCache", () => {
  it("reuses a result within one revision and drops it on the next", () => {
    const cache = createImpactCache();
    const options = {
      ctx,
      entryFile,
      exportName: "shape2Frame",
      boxSets,
      target: ["config", "layouts", "normal", "boxes", "title", "y"],
    };

    const first = cache.get(1, options);
    expect(cache.get(1, options)).toBe(first); // same array, not recomputed
    expect(cache.get(2, options)).not.toBe(first);
    expect(cache.get(2, options)).toEqual(first);
  });
});
