import { describe, expect, it } from "vitest";

import {
  SCHEMA_NAMES,
  SHIPPED_SCHEMAS,
  schemaFilename,
  toJsonSchema,
} from "./schema.js";

describe("JSON Schema output", () => {
  it.each(SCHEMA_NAMES)("converts %s", (name) => {
    const json = toJsonSchema(name) as Record<string, unknown>;
    expect(json.$schema).toMatch(/json-schema\.org/);
    expect(json.type).toBe("object");
    expect(json.properties).toBeTypeOf("object");
  });

  // The input view treats a field with a default as optional, which is what a
  // document being authored looks like. The output view would demand it.
  it("treats defaulted fields as optional, as an author writes them", () => {
    const meta = toJsonSchema("meta") as { required?: string[] };
    expect(meta.required).toContain("id");
    expect(meta.required).not.toContain("entry");
    expect(meta.required).not.toContain("export");
  });

  it("ships only the schemas with a consumer that cannot use zod", () => {
    expect(SHIPPED_SCHEMAS).toEqual(["meta", "index"]);
    for (const name of SHIPPED_SCHEMAS) {
      expect(schemaFilename(name)).toMatch(/^frame-[a-z]+\.schema\.json$/);
    }
  });
});
