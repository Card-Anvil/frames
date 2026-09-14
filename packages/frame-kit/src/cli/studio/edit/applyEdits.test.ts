import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyEdits, literalDenotes, renderLiteral } from "./applyEdits.js";
import type { ResolveContext } from "./resolvePath.js";
import { createSourceIndex } from "./sourceIndex.js";
import { loadTypeScript } from "./ts.js";

const fixtures = path.join(import.meta.dirname, "__fixtures__");

let dir: string;
let ctx: ResolveContext;

/** The fixture frame's values, as the loader would have produced them. */
const plainFrame = {
  config: {
    layouts: {
      normal: {
        boxes: {
          art: { x: 144, y: 144, width: 2976, height: 2172 },
          title: {
            x: 400,
            y: 2446,
            width: 2100,
            height: 180,
            fontSize: 82,
            color: "#000000",
            textAlign: "left",
            shadow: true,
          },
          mana: { x: 2600, y: 2446, width: 500, height: 180, fontSize: 82 },
          type: { x: 400, y: 2700, width: 2100, height: 150, fontSize: 64 },
          setSymbol: { x: 2700, y: 2700, width: 300, height: 150 },
          pt: { x: 2441, y: 3847, width: 400, height: 200, fontSize: 90 },
          negative: { x: -12, y: 0, width: 10, height: 10, fontSize: 10 },
        },
      },
    },
  },
};

const boxPath = (...segments: string[]) => [
  "config",
  "layouts",
  "normal",
  "boxes",
  ...segments,
];

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "frame-kit-studio-"));
  for (const file of ["shape1-index.ts", "shape1-boxes.ts"]) {
    await copyFile(path.join(fixtures, file), path.join(dir, file));
  }
  const api = await loadTypeScript();
  ctx = { api, index: createSourceIndex(api), root: dir };
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const apply = (edits: { path: string[]; value: number | string | boolean }[]) =>
  applyEdits({
    ctx,
    entryFile: path.join(dir, "shape1-index.ts"),
    exportName: "plainFrame",
    frame: plainFrame,
    edits,
  });

const boxesText = () => readFile(path.join(dir, "shape1-boxes.ts"), "utf8");

describe("applyEdits", () => {
  it("replaces one number and changes nothing else", async () => {
    const before = await boxesText();
    const result = await apply([{ path: boxPath("title", "x"), value: 512 }]);

    expect(result.ok).toBe(true);
    const after = await boxesText();
    expect(after).toBe(before.replace("x: 400,", "x: 512,"));
  });

  it("keeps comments, spacing and trailing commas byte for byte", async () => {
    const before = await boxesText();
    await apply([{ path: boxPath("title", "y"), value: 2500 }]);
    const after = await boxesText();

    expect(after).toContain(
      "// The title sits above the art; this comment must survive an edit.",
    );
    // Every line except the one holding the edited literal is untouched.
    const changed = before
      .split("\n")
      .map((line, i) => (line === after.split("\n")[i] ? null : i))
      .filter((i) => i !== null);
    expect(changed).toHaveLength(1);
  });

  it("applies several edits to one file with correct offsets", async () => {
    await apply([
      { path: boxPath("title", "x"), value: 1 },
      { path: boxPath("title", "y"), value: 2 },
      { path: boxPath("title", "width"), value: 3 },
      { path: boxPath("art", "x"), value: 4 },
    ]);
    const after = await boxesText();

    expect(after).toContain("x: 1,");
    expect(after).toContain("y: 2,");
    expect(after).toContain("width: 3,");
    expect(after).toContain("art: { x: 4,");
  });

  it("rewrites a negative number as a whole", async () => {
    await apply([{ path: boxPath("negative", "x"), value: 7 }]);
    expect(await boxesText()).toContain("negative: { x: 7,");
  });

  it("reuses the existing quote character for a string", async () => {
    await apply([{ path: boxPath("title", "color"), value: "#ff0000" }]);
    expect(await boxesText()).toContain('color: "#ff0000"');
  });

  it("rounds a fractional coordinate", async () => {
    await apply([{ path: boxPath("title", "x"), value: 400.6 }]);
    expect(await boxesText()).toContain("x: 401,");
  });

  it("round-trips: the new value resolves back", async () => {
    await apply([{ path: boxPath("title", "x"), value: 999 }]);
    const again = await applyEdits({
      ctx,
      entryFile: path.join(dir, "shape1-index.ts"),
      exportName: "plainFrame",
      // The frame as it would now reload.
      frame: {
        ...plainFrame,
        config: {
          layouts: {
            normal: {
              boxes: {
                ...plainFrame.config.layouts.normal.boxes,
                title: {
                  ...plainFrame.config.layouts.normal.boxes.title,
                  x: 999,
                },
              },
            },
          },
        },
      },
      edits: [{ path: boxPath("title", "x"), value: 1000 }],
    });
    expect(again.ok).toBe(true);
    expect(await boxesText()).toContain("x: 1000,");
  });
});

describe("refusals", () => {
  it("writes nothing when any edit in the batch is unresolvable", async () => {
    const before = await boxesText();
    const result = await apply([
      { path: boxPath("title", "x"), value: 512 },
      { path: boxPath("title", "outlineWidth"), value: 4 },
    ]);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.rejected[0]?.reason).toBe("missing-property");
    expect(await boxesText()).toBe(before);
  });

  // The gate: if the literal we found does not denote the value the frame
  // loaded with, the resolver found the wrong literal and must not write.
  it("refuses when the literal disagrees with the loaded value", async () => {
    const before = await boxesText();
    const result = await applyEdits({
      ctx,
      entryFile: path.join(dir, "shape1-index.ts"),
      exportName: "plainFrame",
      frame: {
        config: {
          layouts: {
            normal: {
              boxes: {
                ...plainFrame.config.layouts.normal.boxes,
                // Disagrees with the 400 written in the fixture.
                title: {
                  ...plainFrame.config.layouts.normal.boxes.title,
                  x: 12345,
                },
              },
            },
          },
        },
      },
      edits: [{ path: boxPath("title", "x"), value: 512 }],
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.rejected[0]?.reason).toBe("value-mismatch");
    expect(!result.ok && result.rejected[0]?.detail).toContain("12345");
    expect(await boxesText()).toBe(before);
  });

  it("refuses two edits to the same literal", async () => {
    const before = await boxesText();
    const result = await apply([
      { path: boxPath("title", "x"), value: 1 },
      { path: boxPath("title", "x"), value: 2 },
    ]);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.rejected[0]?.reason).toBe("overlap");
    expect(await boxesText()).toBe(before);
  });

  it("refuses a file that changed since the studio read it", async () => {
    const file = path.join(dir, "shape1-boxes.ts");
    const result = await applyEdits({
      ctx,
      entryFile: path.join(dir, "shape1-index.ts"),
      exportName: "plainFrame",
      frame: plainFrame,
      edits: [{ path: boxPath("title", "x"), value: 512 }],
      expect: new Map([
        [file.split(path.sep).join("/"), "not-the-current-hash"],
      ]),
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.rejected[0]?.reason).toBe("stale");
  });

  it("reports the new hash of every file it wrote", async () => {
    const result = await apply([{ path: boxPath("title", "x"), value: 512 }]);
    expect(result.ok && result.files.size).toBe(1);
  });

  it("picks up a file edited underneath it on the next apply", async () => {
    await apply([{ path: boxPath("title", "x"), value: 512 }]);
    const file = path.join(dir, "shape1-boxes.ts");
    const edited = (await readFile(file, "utf8")).replace("x: 512,", "x: 777,");
    await writeFile(file, edited);

    // The index is keyed on mtime+size, so the new text is what gets spliced.
    const result = await applyEdits({
      ctx,
      entryFile: path.join(dir, "shape1-index.ts"),
      exportName: "plainFrame",
      frame: {
        config: {
          layouts: {
            normal: {
              boxes: {
                ...plainFrame.config.layouts.normal.boxes,
                title: {
                  ...plainFrame.config.layouts.normal.boxes.title,
                  x: 777,
                },
              },
            },
          },
        },
      },
      edits: [{ path: boxPath("title", "y"), value: 3000 }],
    });
    expect(result.ok).toBe(true);
    expect(await boxesText()).toContain("x: 777,");
    expect(await boxesText()).toContain("y: 3000,");
  });
});

describe("literal rendering", () => {
  it("recognises what a literal denotes", () => {
    expect(literalDenotes("400", 400)).toBe(true);
    expect(literalDenotes("400", 401)).toBe(false);
    expect(literalDenotes("-12", -12)).toBe(true);
    expect(literalDenotes('"left"', "left")).toBe(true);
    expect(literalDenotes("'left'", "left")).toBe(true);
    expect(literalDenotes("true", true)).toBe(true);
    expect(literalDenotes("left", "left")).toBe(false); // unquoted: not a string literal
  });

  it("renders in the style of what it replaces", () => {
    expect(renderLiteral(512, "400")).toBe("512");
    expect(renderLiteral(400.6, "400")).toBe("401");
    expect(renderLiteral("x", '"a"')).toBe('"x"');
    expect(renderLiteral("x", "'a'")).toBe("'x'");
    expect(renderLiteral(false, "true")).toBe("false");
  });
});
