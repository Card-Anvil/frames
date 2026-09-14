import path from "node:path";

import { walkAssets } from "../../manifest/walk.js";
import { setAtPath } from "../../manifest/walk.js";
import type { Frame } from "../../schema/frame.js";
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
} from "../../schema/frame.js";
import { FrameSchema } from "../../schema/frame.js";
import { loadFrames } from "../api.js";
import {
  type DiscoveredFrame,
  discoverFrames,
  relativePosix,
} from "../discover.js";
import {
  type FrameServer,
  invalidateFrameModules,
  startFrameServer,
} from "../loadFrame.js";
import { type Problem, Reporter } from "../report.js";
import { type LayoutSlot, layoutSlots } from "./boxSets.js";
import { createSourceIndex } from "./edit/sourceIndex.js";
import {
  type SourceIndex,
  isUnderRoot,
  normalizeFile,
} from "./edit/sourceIndex.js";
import { type TypeScriptApi, loadTypeScript } from "./edit/ts.js";

/** One box / asset / mask set present in a frame, addressed by logical path. */
export interface FrameSlot extends LayoutSlot {
  /** `null` for `config.layouts`, else the `alternateLayouts` key. */
  readonly variant: string | null;
  readonly layout: string;
  readonly path: readonly string[];
  /** Which `CardBoxes` members this set actually defines. */
  readonly boxKeys?: readonly string[];
}

export interface FramePayload {
  readonly slug: string;
  readonly id: string;
  readonly name: string;
  /** Bumps on every successful reload, so the client can drop stale state. */
  readonly revision: number;
  readonly canvas: { readonly width: number; readonly height: number };
  /** The validated frame, with asset URLs rewritten to studio endpoints. */
  readonly frame: unknown;
  readonly slots: readonly FrameSlot[];
  /** Root-relative POSIX paths of every source file the frame was built from. */
  readonly sourceFiles: readonly string[];
  readonly problems: readonly Problem[];
  /** True when this is the last good load and the newest one failed. */
  readonly stale: boolean;
  readonly staleProblems?: readonly Problem[];
}

export interface FrameSummary {
  readonly slug: string;
  readonly id: string;
  readonly name: string;
  readonly stale: boolean;
}

interface Entry {
  payload: FramePayload;
  /** The frame before URL rewriting — what edits are verified against. */
  raw: Frame;
  discovered: DiscoveredFrame;
}

export interface StudioSession {
  readonly root: string;
  readonly index: SourceIndex;
  readonly api: TypeScriptApi;
  readonly frameServer: FrameServer;
  list: () => FrameSummary[];
  get: (slug: string) => Entry | undefined;
  /** Absolute source files worth watching, across every loaded frame. */
  watchDirs: () => string[];
  reload: (only?: readonly string[]) => Promise<string[]>;
  close: () => Promise<void>;
}

/** Every box/asset/mask set a loaded frame actually defines. */
function slotsFor(frame: Frame): FrameSlot[] {
  const slots = layoutSlots();
  const found: FrameSlot[] = [];

  const collect = (
    container: Record<string, unknown> | undefined,
    variant: string | null,
    prefix: readonly string[],
  ) => {
    for (const [layout, config] of Object.entries(container ?? {})) {
      if (!config || typeof config !== "object") {
        continue;
      }
      const record = config as Record<string, unknown>;
      for (const slot of slots) {
        const value = record[slot.key];
        if (!value || typeof value !== "object") {
          continue;
        }
        found.push({
          ...slot,
          variant,
          layout,
          path: [...prefix, layout, slot.key],
          ...(slot.kind === "boxes" ? { boxKeys: Object.keys(value) } : {}),
        });
      }
    }
  };

  const config = frame.config as unknown as {
    layouts?: Record<string, unknown>;
    alternateLayouts?: Record<string, Record<string, unknown>>;
  };
  collect(config.layouts, null, ["config", "layouts"]);
  for (const [variant, layouts] of Object.entries(
    config.alternateLayouts ?? {},
  )) {
    collect(layouts, variant, ["config", "alternateLayouts", variant]);
  }
  return found;
}

/**
 * Rewrites every asset URL to the studio's own endpoint.
 *
 * Driven by `walkAssets` rather than a field list, so an asset field added to
 * the contract is served without touching this.
 */
function rewriteAssets(frame: Frame): unknown {
  const plain: unknown = JSON.parse(JSON.stringify(frame));
  for (const occurrence of walkAssets(FrameSchema, plain)) {
    setAtPath(
      plain,
      occurrence.path,
      `/api/asset?u=${encodeURIComponent(occurrence.url)}`,
    );
  }
  return plain;
}

/**
 * Owns the Vite server, the loaded frames, and the last-good cache.
 *
 * A frame that fails to load keeps its previous payload — an author mid-save
 * produces a syntax error on almost every keystroke, and blanking the canvas
 * each time would make the studio unusable. `loadFrames` already routes every
 * failure into the reporter instead of throwing, so a failed pass simply
 * yields no frame for that slug.
 */
export async function startSession(
  root: string,
  only: readonly string[] = [],
): Promise<StudioSession> {
  const resolvedRoot = path.resolve(root);
  const frameServer = await startFrameServer(resolvedRoot);
  const api = await loadTypeScript();
  const index = createSourceIndex(api);
  const cache = new Map<string, Entry>();
  let revision = 0;

  async function reload(slugs?: readonly string[]): Promise<string[]> {
    invalidateFrameModules(frameServer);
    const reporter = new Reporter();
    const wanted = slugs ?? only;
    const loaded = await loadFrames(
      { root: resolvedRoot, ...(wanted.length > 0 ? { only: wanted } : {}) },
      reporter,
      frameServer,
    );

    const seen = new Set<string>();
    const sourceFiles = [
      ...frameServer.server.environments.ssr.moduleGraph.fileToModulesMap.keys(),
    ]
      .filter(
        (file) => isUnderRoot(file, resolvedRoot) && /\.[cm]?tsx?$/.test(file),
      )
      .map((file) => relativePosix(resolvedRoot, file))
      .sort();

    for (const item of loaded) {
      const { discovered, frame } = item;
      seen.add(discovered.slug);
      revision += 1;
      const canvas = frame.config.canvas ?? {
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
      };
      cache.set(discovered.slug, {
        raw: frame,
        discovered,
        payload: {
          slug: discovered.slug,
          id: discovered.meta.id,
          name: frame.name,
          revision,
          canvas,
          frame: rewriteAssets(frame),
          slots: slotsFor(frame),
          sourceFiles,
          problems: reporter.problems.filter(
            (problem) => problem.frame === discovered.slug,
          ),
          stale: false,
        },
      });
    }

    // Anything asked for that did not come back kept its last good payload.
    for (const [slug, entry] of cache) {
      if (seen.has(slug) || (wanted.length > 0 && !wanted.includes(slug))) {
        continue;
      }
      const problems = reporter.problems.filter(
        (problem) => problem.frame === slug || problem.frame === undefined,
      );
      cache.set(slug, {
        ...entry,
        payload: { ...entry.payload, stale: true, staleProblems: problems },
      });
    }

    return [...seen];
  }

  await reload();

  return {
    root: resolvedRoot,
    index,
    api,
    frameServer,
    list: () =>
      [...cache.values()]
        .map((entry) => ({
          slug: entry.payload.slug,
          id: entry.payload.id,
          name: entry.payload.name,
          stale: entry.payload.stale,
        }))
        .sort((a, b) => a.slug.localeCompare(b.slug)),
    get: (slug) => cache.get(slug),
    watchDirs: () => {
      const dirs = new Set<string>([resolvedRoot]);
      for (const entry of cache.values()) {
        dirs.add(normalizeFile(entry.discovered.dir));
      }
      return [...dirs];
    },
    reload,
    close: () => frameServer.close(),
  };
}

/** Frames discoverable under `root`, for a startup message. */
export async function countFrames(root: string): Promise<number> {
  return (await discoverFrames(path.resolve(root), new Reporter())).length;
}
