import path from "node:path";

import { type BuildOptions, buildFrames } from "./build.js";
import { discoverFrames } from "./discover.js";
import { invalidateFrameModules, startFrameServer } from "./loadFrame.js";
import { Reporter, formatProblem } from "./report.js";
import { type SourceWatcher, startSourceWatcher } from "./sourceWatcher.js";

export interface WatchOptions extends BuildOptions {
  /** Called after every rebuild so the CLI can report it. */
  onBuild?: (summary: string) => void;
}

const plural = (n: number) => `${String(n)} frame${n === 1 ? "" : "s"}`;

/**
 * Rebuilds frames as their sources change, until the process is interrupted.
 *
 * One Vite server stays alive for the whole session — starting one costs a
 * second or two — and its module graph is dropped before each rebuild so an
 * edit is actually seen. See `invalidateFrameModules`.
 *
 * Debouncing, ignore rules and the non-overlapping drain live in
 * `startSourceWatcher`, shared with `frame-kit studio`.
 */
export async function watchFrames(options: WatchOptions): Promise<void> {
  const root = path.resolve(options.root);
  const outDir = path.resolve(options.outDir);
  const report =
    options.onBuild ??
    ((summary: string) => {
      console.log(summary);
    });

  const frameServer = await startFrameServer(root);
  let watcher: SourceWatcher | undefined;

  function runBuild(only: string[] | undefined): Promise<void> {
    invalidateFrameModules(frameServer);
    const reporter = new Reporter();
    const started = Date.now();
    return buildFrames(
      { ...options, ...(only === undefined ? {} : { only }) },
      reporter,
      frameServer,
    ).then(({ frames }) => {
      for (const problem of reporter.problems) {
        console.error(`${problem.severity}: ${formatProblem(problem)}`);
      }
      report(
        `${plural(frames.length)} rebuilt in ${String(Date.now() - started)}ms`,
      );
    });
  }

  try {
    await runBuild(undefined);

    // Each frame's own directory, plus the root, so a frame added or removed
    // while watching is noticed.
    const frames = await discoverFrames(root, new Reporter());
    watcher = startSourceWatcher({
      root,
      dirs: [...frames.map((frame) => frame.dir), root],
      ignore: (file) => file.startsWith(outDir),
      onChange: async (changed) => {
        const slugs = await slugsFor(root, changed, options.only);
        if (slugs?.length === 0) {
          return; // nothing we build was touched
        }
        await runBuild(slugs);
      },
    });

    report("Watching for changes. Press Ctrl+C to stop.");
    await new Promise<void>((resolve) => {
      const stop = () => {
        resolve();
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  } finally {
    watcher?.close();
    await frameServer.close();
  }
}

/**
 * Which frames a set of changed paths affects.
 *
 * `undefined` means "rebuild everything" — a descriptor appeared or vanished,
 * or something outside every frame directory changed (a shared module, a
 * workspace file), and we cannot know what depends on it.
 */
export async function slugsFor(
  root: string,
  changed: readonly string[],
  only: readonly string[] | undefined,
): Promise<string[] | undefined> {
  if (changed.some((file) => path.basename(file) === "frame.meta.json")) {
    return undefined;
  }

  const discovered = await discoverFrames(root, new Reporter());
  const wanted = new Set(only ?? []);
  const slugs = new Set<string>();

  for (const file of changed) {
    const owner = discovered
      .filter((frame) => file.startsWith(frame.dir + path.sep))
      .sort((a, b) => b.dir.length - a.dir.length)[0];
    if (!owner) {
      return undefined; // outside every frame — something shared changed
    }
    if (owner.meta.private) {
      continue; // a build would skip it anyway; do not announce a rebuild
    }
    if (wanted.size === 0 || wanted.has(owner.slug)) {
      slugs.add(owner.slug);
    }
  }
  return [...slugs];
}
