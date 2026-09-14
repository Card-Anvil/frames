import { PackagingError } from "../../errors.js";

export type TypeScriptApi = typeof import("typescript");

let cached: TypeScriptApi | undefined;

/**
 * The TypeScript parser, loaded on demand.
 *
 * An *optional* peer, imported dynamically for the same reason Vite is (see
 * `loadFrame.ts`): frame-kit's schemas and manifest helpers must keep working
 * under plain Node and in a browser, and nothing on those paths reaches here.
 *
 * The studio needs it because it edits a value by locating the exact text of
 * the literal that produced it, which means parsing the author's source. Only
 * the parser is used — no `Program`, no `CompilerHost`, no type checker — so
 * this stays on the oldest and most stable corner of the API.
 */
export async function loadTypeScript(): Promise<TypeScriptApi> {
  if (cached) {
    return cached;
  }
  let mod: unknown;
  try {
    mod = await import("typescript");
  } catch {
    throw new PackagingError(
      "TypeScript is not installed.\n\n" +
        "The studio edits your source by finding the exact text of a value,\n" +
        "which needs the TypeScript parser. Install it:\n\n" +
        "  pnpm add -D typescript\n",
    );
  }
  // `typescript` is CommonJS: under Node's ESM interop the module object is
  // the default export, though named exports are usually detected too.
  const api =
    (mod as { default?: TypeScriptApi }).default ?? (mod as TypeScriptApi);
  cached = api;
  return api;
}
