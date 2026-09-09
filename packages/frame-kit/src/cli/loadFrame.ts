import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ViteDevServer } from "vite";

import { PackagingError } from "./errors.js";

/**
 * Vite is what turns `import w from "./w.png"` into a URL, so a frame cannot be
 * packaged without it.
 *
 * It is an *optional* peer, imported dynamically: frame-kit's schemas and
 * manifest helpers have to keep working under plain Node, in a browser, and
 * inside Card Anvil's bundle, none of which have Vite. Nothing on those paths
 * ever reaches this module.
 */
async function importVite(): Promise<typeof import("vite")> {
  try {
    return await import("vite");
  } catch {
    throw new PackagingError(
      "Vite is not installed.\n\n" +
        'Frames import their art directly (`import w from "./w.png"`), and only\n' +
        "a bundler can turn those imports into files. Install it:\n\n" +
        "  pnpm add -D vite\n",
    );
  }
}

export interface FrameServer {
  readonly server: ViteDevServer;
  /** Absolute project root every asset URL is relative to. */
  readonly root: string;
  /** Vite's dev base, the prefix on every asset URL. */
  readonly base: string;
  close(): Promise<void>;
}

/**
 * Starts one Vite server for a whole packaging run.
 *
 * Starting it is the expensive part, and frames that extend one another share
 * the module graph, so it is deliberately not per-frame.
 */
export async function startFrameServer(root: string): Promise<FrameServer> {
  const vite = await importVite();
  const cacheDir = await mkdtemp(path.join(tmpdir(), "frame-kit-"));

  const server = await vite.createServer({
    // Never inherit the author's config. Its `base`, plugins and asset rules
    // would change the URLs we get back, and a frame that only packages
    // correctly under one app's config is not distributable.
    configFile: false,
    root,
    appType: "custom",
    logLevel: "warn",
    // Nothing is ever served over HTTP; the module runner is the whole point.
    server: { middlewareMode: true, hmr: false, watch: null },
    build: {
      // Vite inlines small assets as data URLs in serve mode too, not just at
      // build time. A data URL has no file to package, so an SVG mask under
      // the default 4 KB limit would silently vanish from the bundle.
      assetsInlineLimit: 0,
    },
    optimizeDeps: { noDiscovery: true },
    // Keep the dep cache out of the author's node_modules.
    cacheDir,
    resolve: { dedupe: ["zod"] },
  });

  return {
    server,
    root: path.resolve(root),
    base: server.config.base,
    async close() {
      await server.close();
      await rm(cacheDir, { recursive: true, force: true });
    },
  };
}

/**
 * Loads one frame's module and returns the named export, unvalidated.
 *
 * Returns `unknown` rather than trusting `ssrLoadModule`'s `Record<string, any>`
 * — the caller parses it against `FrameSchema`, which is the only thing that
 * decides whether it is a frame.
 */
export async function loadFrameExport(
  frameServer: FrameServer,
  entryFile: string,
  exportName: string,
): Promise<unknown> {
  let namespace: Record<string, unknown>;
  try {
    namespace = (await frameServer.server.ssrLoadModule(entryFile)) as Record<
      string,
      unknown
    >;
  } catch (cause) {
    throw new PackagingError(
      `could not load ${entryFile}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  if (!(exportName in namespace)) {
    const available = Object.keys(namespace)
      .filter((key) => key !== "default" || "default" in namespace)
      .sort()
      .join(", ");
    throw new PackagingError(
      `${entryFile} has no export named "${exportName}". ` +
        (available ? `It exports: ${available}.` : "It exports nothing.") +
        ` Set "export" in frame.meta.json to the one that is the frame.`,
    );
  }
  return namespace[exportName];
}
