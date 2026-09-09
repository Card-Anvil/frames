import { describe, expect, it } from "vitest";

import { FrameMetaSchema } from "./frameMeta.js";

const valid = {
  id: "com.example.parchment",
  author: { name: "Jane Doe" },
  license: "CC-BY-4.0",
};

describe("FrameMetaSchema", () => {
  it("fills in the entry and export defaults", () => {
    const meta = FrameMetaSchema.parse(valid);
    expect(meta.entry).toBe("./index.ts");
    expect(meta.export).toBe("default");
  });

  it("requires an id, an author and a licence", () => {
    const { id, author, license } = valid;
    expect(FrameMetaSchema.safeParse({ author, license }).success).toBe(false);
    expect(FrameMetaSchema.safeParse({ id, license }).success).toBe(false);
    expect(FrameMetaSchema.safeParse({ id, author }).success).toBe(false);
  });

  // The id is baked into every bundle and is what a marketplace binds to a
  // repository, so a malformed one is worth catching at authoring time.
  it("rejects ids that are not reverse-DNS", () => {
    for (const id of ["parchment", "Com.Example.X", "com..x", "com.example."]) {
      expect(FrameMetaSchema.safeParse({ ...valid, id }).success).toBe(false);
    }
  });

  it("rejects slugs that would not make clean filenames", () => {
    for (const slug of ["My Frame", "frame_one", "-lead", "trail-"]) {
      expect(FrameMetaSchema.safeParse({ ...valid, slug }).success).toBe(false);
    }
    expect(
      FrameMetaSchema.safeParse({
        ...valid,
        slug: "borderless-source-material",
      }).success,
    ).toBe(true);
  });
});
