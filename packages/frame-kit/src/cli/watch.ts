import { watch } from "node:fs";
import path from "node:path";

import { type BuildOptions, buildFrames } from "./build.js";
import { discoverFrames, relativePosix } from "./discover.js";
import { invalidateFrameModules, startFrameServer } from "./loadFrame.js";
import { Reporter, formatProblem } from "./report.js";

/** Directories never worth watching. Mirrors discovery's own skip list. */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".pnpm-store",
  "__fixtures__",
]);

/** Files a rebuild produces, or an editor leaves lying around. */
const IGNORED_FILE =
  /(\.cardframe|frame-index\.json|\.preview\.[a-z]+|~|\.swp|\.tmp)$/i;

/**
 * How long to wait for changes to stop before rebuilding.
 *
 * One save can produce several events — a write, a rename, an attribute
 * change — and a tool upstream may rewrite a whole directory.
 */
const DEBOUNCE_MS = 200;

export interface WatchOptions extends BuildOptions {
  /** Called after every rebuild so the CLI can report it. */
  onBuild?: (summary: string) => void;
}

function isIgnored(file: string): boolean {
  const segments = file.split(path.sep);
  return (
    segments.some(
      (segment) => SKIP_DIRS.has(segment) || segment.startsWith("."),
    ) || IGNORED_FILE.test(file)
  );
}

const plural = (n: number) => `${String(n)} frame${n === 1 ? "" : "s"}`;

/**
 * Rebuilds frames as their sources change, until the process is interrupted.
 *
 * One Vite server stays alive for the whole session — starting one costs a
 * second or two — and its module graph is dropped before each rebuild so an
 * edit is actually seen. See `invalidateFrameModules`.
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
  const watchers: { close: () => void }[] = [];
  const pending = new Set<string>();
  let timer: NodeJS.Timeout | undefined;
  let building = false;

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

  async function drain(): Promise<void> {
    if (building) {
      // Two builds would race on the same output file. Whatever arrived is
      // already in `pending`, and the loop below will pick it up.
      return;
    }
    building = true;
    try {
      // Keyed off `pending` rather than a flag: anything that arrived during a
      // build is still queued when it finishes.
      while (pending.size > 0) {
        const changed = [...pending];
        pending.clear();
        const slugs = await slugsFor(root, changed, options.only);
        if (slugs?.length === 0) {
          continue; // nothing we build was touched
        }
        await runBuild(slugs);
      }
    } catch (cause) {
      // A failed rebuild must not end the session: the author is mid-edit and
      // the next save is probably the fix.
      console.error(cause instanceof Error ? cause.message : String(cause));
    } finally {
      building = false;
    }
  }

  function onChange(file: string): void {
    if (isIgnored(file) || file.startsWith(outDir)) {
      return;
    }
    pending.add(file);
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => void drain(), DEBOUNCE_MS);
  }

  function watchDir(dir: string): void {
    try {
      watchers.push(
        watch(dir, { recursive: true }, (_event, name) => {
          if (name !== null) {
            onChange(path.join(dir, name));
          }
        }),
      );
    } catch {
      console.error(
        `Could not watch ${relativePosix(root, dir)}. Recursive watching is ` +
          `not supported on this filesystem; rebuild with \`frame-kit build\`.`,
      );
    }
  }

  try {
    await runBuild(undefined);

    // Each frame's own directory, plus the root, so a frame added or removed
    // while watching is noticed.
    for (const frame of await discoverFrames(root, new Reporter())) {
      watchDir(frame.dir);
    }
    watchDir(root);

    report("Watching for changes. Press Ctrl+C to stop.");
    await new Promise<void>((resolve) => {
      const stop = () => {
        resolve();
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    for (const watcher of watchers) {
      watcher.close();
    }
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
    if (wanted.size === 0 || wanted.has(owner.slug)) {
      slugs.add(owner.slug);
    }
  }
  return [...slugs];
}
