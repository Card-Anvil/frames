import { z } from "zod";

/**
 * Metadata key marking a schema position that holds an image URL rather than
 * an arbitrary string. Frame configs assign these from bundler asset imports
 * (`import w from "./w.png"`), so at runtime they are ordinary strings and the
 * inferred type stays `string`.
 *
 * The marker exists so tooling can find every asset in a `Frame` by walking the
 * schema instead of hard-coding a list of field paths that would silently rot
 * as the contract grows. Packaging a frame for distribution rewrites exactly
 * these positions to package-relative paths.
 */
export const ASSET_URL_META_KEY = "cardAnvilAsset";

/**
 * An image URL. Identical to `z.string()` at both the type and validation
 * level — the only difference is the metadata marker described above.
 */
export const AssetUrlSchema = z.string().meta({ [ASSET_URL_META_KEY]: true });

export type AssetUrl = z.infer<typeof AssetUrlSchema>;

/**
 * Whether a schema position was declared as an asset URL.
 *
 * Typed on the core schema interface so it also accepts the results of
 * unwrapping (`ZodOptional.unwrap()`), which is how callers reach the declared
 * schema behind an optional field.
 */
export function isAssetUrlSchema(schema: z.core.$ZodType): boolean {
  return z.globalRegistry.get(schema)?.[ASSET_URL_META_KEY] === true;
}
