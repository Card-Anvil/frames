import { z } from "zod";

import { isAssetUrlSchema } from "../schema/assetUrl.js";

/** Location of a value inside a frame, as a property path. */
export type FramePath = readonly (string | number)[];

export interface AssetOccurrence {
  readonly path: FramePath;
  readonly url: string;
}

/**
 * The subset of zod's schema definitions this walker understands. zod's `def`
 * is not a discriminated union at the type level, so the shape is described
 * once, here, instead of at every branch below.
 */
interface SchemaNode {
  readonly type: string;
  readonly shape?: Record<string, z.ZodType>;
  readonly innerType?: z.ZodType;
  readonly valueType?: z.ZodType;
  readonly element?: z.ZodType;
  readonly options?: readonly z.ZodType[];
}

function definition(schema: z.ZodType): SchemaNode {
  return schema.def;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function visit(
  schema: z.ZodType,
  value: unknown,
  path: FramePath,
  out: AssetOccurrence[],
): void {
  const node = definition(schema);

  switch (node.type) {
    // Wrappers: same value, one level in.
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "readonly":
    case "nonoptional": {
      if (node.innerType) {
        visit(node.innerType, value, path, out);
      }
      return;
    }

    case "object": {
      if (!isPlainRecord(value) || !node.shape) {
        return;
      }
      for (const [key, child] of Object.entries(node.shape)) {
        if (key in value) {
          visit(child, value[key], [...path, key], out);
        }
      }
      return;
    }

    case "record": {
      const { valueType } = node;
      if (!isPlainRecord(value) || !valueType) {
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        visit(valueType, child, [...path, key], out);
      }
      return;
    }

    case "array": {
      const { element } = node;
      if (!Array.isArray(value) || !element) {
        return;
      }
      value.forEach((item, index) => {
        visit(element, item, [...path, index], out);
      });
      return;
    }

    case "union": {
      // Follow only the branch that actually accepts this value, so a union
      // never reports assets belonging to a variant the value is not.
      const match = node.options?.find(
        (option) => option.safeParse(value).success,
      );
      if (match) {
        visit(match, value, path, out);
      }
      return;
    }

    default: {
      if (typeof value === "string" && isAssetUrlSchema(schema)) {
        out.push({ path, url: value });
      }
    }
  }
}

/**
 * Finds every asset URL in `value` by walking `schema` alongside it.
 *
 * Driven by the schema rather than by a hard-coded list of field paths, so a
 * new asset field in the contract is picked up automatically — see
 * {@link isAssetUrlSchema}.
 */
export function walkAssets(
  schema: z.ZodType,
  value: unknown,
): AssetOccurrence[] {
  const found: AssetOccurrence[] = [];
  visit(schema, value, [], found);
  return found;
}

/** Reads the value at `path`, or `undefined` if any segment is missing. */
export function getAtPath(root: unknown, path: FramePath): unknown {
  let current = root;
  for (const segment of path) {
    if (!isPlainRecord(current) && !Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

/** Writes `value` at `path`. Every parent segment must already exist. */
export function setAtPath(
  root: unknown,
  path: FramePath,
  value: unknown,
): void {
  if (path.length === 0) {
    throw new Error("setAtPath: empty path");
  }
  const parent = getAtPath(root, path.slice(0, -1));
  if (!isPlainRecord(parent) && !Array.isArray(parent)) {
    throw new Error(`setAtPath: no container at ${formatPath(path)}`);
  }
  const last = path[path.length - 1];
  if (last === undefined) {
    throw new Error("setAtPath: empty path segment");
  }
  (parent as Record<string | number, unknown>)[last] = value;
}

/** Human-readable rendering of a path, for error messages. */
export function formatPath(path: FramePath): string {
  return path.length === 0 ? "<root>" : path.join(".");
}
