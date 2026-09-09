import { z } from "zod";

import { FrameManifestSchema } from "../manifest/contract.js";
import { FrameSchema } from "../schema/frame.js";
import { FrameMetaSchema } from "../schema/frameMeta.js";
import { FrameIndexSchema } from "./frameIndex.js";

/**
 * The formats this package defines, as JSON Schema.
 *
 * Useful to anything that is not TypeScript — an editor offering completion in
 * `frame.meta.json`, or a marketplace validating an index it fetched.
 * TypeScript consumers should use the zod schemas directly instead.
 */
const SCHEMAS = {
  /** A frame descriptor. Authors write these by hand, so completion helps. */
  meta: { schema: FrameMetaSchema, file: "frame-meta.schema.json" },
  /** A release index. What an aggregator validates before trusting a repo. */
  index: { schema: FrameIndexSchema, file: "frame-index.schema.json" },
  /** A `.cardframe`'s frame.json. Large — emitted on request, not shipped. */
  manifest: { schema: FrameManifestSchema, file: "frame-manifest.schema.json" },
  /** A frame object. Large — emitted on request, not shipped. */
  frame: { schema: FrameSchema, file: "frame.schema.json" },
} as const;

export type SchemaName = keyof typeof SCHEMAS;

export const SCHEMA_NAMES = Object.keys(SCHEMAS) as SchemaName[];

/**
 * Emitted with the *input* view: these describe documents being written or
 * read, where a field with a default is optional. The output view would mark
 * those required, which is wrong for a document an author is authoring.
 */
export function toJsonSchema(name: SchemaName): unknown {
  return z.toJSONSchema(SCHEMAS[name].schema, { io: "input" });
}

export function schemaFilename(name: SchemaName): string {
  return SCHEMAS[name].file;
}

/**
 * The schemas small enough, and useful enough, to ship in the package. The
 * other two are hundreds of kilobytes and have no consumer that could not use
 * the zod schema instead.
 */
export const SHIPPED_SCHEMAS: SchemaName[] = ["meta", "index"];
