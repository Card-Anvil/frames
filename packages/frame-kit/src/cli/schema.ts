import { z } from "zod";

import { FrameManifestSchema } from "../manifest/contract.js";
import { FrameSchema } from "../schema/frame.js";
import { FrameMetaSchema } from "../schema/frameMeta.js";
import { FrameIndexSchema } from "./frameIndex.js";

/**
 * The formats this package defines, and what each is called on disk.
 *
 * Useful to anything that is not TypeScript — an editor offering completion in
 * `frame.meta.json`, or a marketplace validating an index it fetched.
 * TypeScript consumers should use the zod schemas directly instead.
 */
const SCHEMA_FILES = {
  /** A frame descriptor. Authors write these by hand, so completion helps. */
  meta: "frame-meta.schema.json",
  /** A release index. What an aggregator validates before trusting a repo. */
  index: "frame-index.schema.json",
  /** A `.cardframe`'s frame.json. Large — emitted on request, not shipped. */
  manifest: "frame-manifest.schema.json",
  /** A frame object. Large — emitted on request, not shipped. */
  frame: "frame.schema.json",
} as const;

export type SchemaName = keyof typeof SCHEMA_FILES;

/**
 * Annotated as `z.ZodType` on purpose. Without it TypeScript inlines each
 * schema's full inferred type into this module's declarations, which turns a
 * fifty-line file into a megabyte of .d.ts.
 */
const SCHEMAS: Record<SchemaName, z.ZodType> = {
  meta: FrameMetaSchema,
  index: FrameIndexSchema,
  manifest: FrameManifestSchema,
  frame: FrameSchema,
};

export const SCHEMA_NAMES = Object.keys(SCHEMA_FILES) as SchemaName[];

/**
 * Emitted with the *input* view: these describe documents being written or
 * read, where a field with a default is optional. The output view would mark
 * those required, which is wrong for a document an author is authoring.
 */
export function toJsonSchema(name: SchemaName): unknown {
  return z.toJSONSchema(SCHEMAS[name], { io: "input" });
}

export function schemaFilename(name: SchemaName): string {
  return SCHEMA_FILES[name];
}

/**
 * The schemas small enough, and useful enough, to ship in the package. The
 * other two are hundreds of kilobytes and have no consumer that could not use
 * the zod schema instead.
 */
export const SHIPPED_SCHEMAS: SchemaName[] = ["meta", "index"];
