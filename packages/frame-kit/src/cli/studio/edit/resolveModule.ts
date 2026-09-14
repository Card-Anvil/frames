import { statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { normalizeFile } from "./sourceIndex.js";

/**
 * Extensions tried for a relative import, in order.
 *
 * Frame packages import without extensions by convention (`./boxes`,
 * `./base`), so a specifier names either a sibling module or a directory with
 * a barrel. `.js` is mapped back to `.ts` for authors who write NodeNext-style
 * specifiers.
 */
const CANDIDATES = [
  (base: string) => `${base}.ts`,
  (base: string) => `${base}.tsx`,
  (base: string) => path.join(base, "index.ts"),
  (base: string) => path.join(base, "index.tsx"),
  (base: string) => base,
];

function firstExisting(base: string): string | undefined {
  for (const candidate of CANDIDATES) {
    const file = candidate(base);
    try {
      if (statSync(file).isFile()) {
        return normalizeFile(file);
      }
    } catch {
      /* not there; try the next candidate */
    }
  }
  return undefined;
}

/**
 * Absolute path a specifier resolves to from `importer`, or `undefined`.
 *
 * Relative specifiers are probed on disk; bare ones go through Node's own
 * resolver, which honours `exports` maps and pnpm's workspace links. That
 * matters because frame packages point their exports straight at TypeScript
 * source (`"./extend": "./src/extend.ts"`), so `@cardanvil/frame-m15/extend`
 * resolves to a file this can actually parse.
 */
export function resolveModuleFile(
  specifier: string,
  importer: string,
): string | undefined {
  if (specifier.startsWith(".")) {
    const base = path.resolve(path.dirname(importer), specifier);
    const stripped = base.replace(/\.js$/, "");
    return firstExisting(base) ?? firstExisting(stripped);
  }

  try {
    return normalizeFile(createRequire(importer).resolve(specifier));
  } catch {
    return undefined;
  }
}
