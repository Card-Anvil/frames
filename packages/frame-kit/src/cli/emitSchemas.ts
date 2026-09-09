#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { SHIPPED_SCHEMAS, schemaFilename, toJsonSchema } from "./schema.js";
import { stableStringify } from "./stableJson.js";

/** Run at build time so the published package carries its own JSON Schema. */
const outDir = path.join(import.meta.dirname, "../../schema");

await mkdir(outDir, { recursive: true });
for (const name of SHIPPED_SCHEMAS) {
  const file = path.join(outDir, schemaFilename(name));
  await writeFile(file, stableStringify(toJsonSchema(name)), "utf8");
  console.log(`schema: ${schemaFilename(name)}`);
}
