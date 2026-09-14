import { watch } from "node:fs";
import path from "node:path";

import { relativePosix } from "./discover.js";

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
 * How long to wait for changes to stop before reacting.
 *
 * One save can produce several events — a write, a rename, an attribute
 * change — and a tool upstream may rewrite a whole directory.
 */
export const DEBOUNCE_MS = 200;

/** Whether a path is build output, editor debris, or inside a skipped dir. */
export function isIgnored(file: string): boolean {
  const segments = file.split(path.sep);
  return (
    segments.some(
      (segment) => SKIP_DIRS.has(segment) || segment.startsWith("."),
    ) || IGNORED_FILE.test(file)
  );
}

export interface SourceWatcherOptions {
  /** Absolute path the watch is rooted at. Only used for error messages. */
  root: string;
  /** Directories to watch recursively. Overlapping entries are fine. */
  dirs: readonly string[];
  /**
   * Called with each batch of changed paths, debounced and never overlapping.
   *
   * Anything that arrives while a call is in flight is queued and delivered in
   * the next batch, so a slow handler cannot drop a change.
   */
  onChange: (changed: readonly string[]) => void | Promise<void>;
  /** Ignored on top of the built-in list — a build's own output directory, say. */
  ignore?: (file: string) => boolean;
  /** Defaults to `DEBOUNCE_MS`. */
  debounceMs?: number;
  /** Where an unwatchable directory or a throwing handler is reported. */
  onError?: (message: string) => void;
}

export interface SourceWatcher {
  close: () => void;
}

/**
 * Watches directories and delivers debounced, non-overlapping change batches.
 *
 * Shared by `frame-kit build --watch` and `frame-kit studio`, which need the
 * same three things and get them wrong in the same three ways otherwise:
 * coalescing a burst of events from one save, never running two handlers at
 * once, and surviving a handler that throws.
 */
export function startSourceWatcher(
  options: SourceWatcherOptions,
): SourceWatcher {
  const {
    root,
    dirs,
    onChange,
    ignore,
    debounceMs = DEBOUNCE_MS,
    onError = (message: string) => {
      console.error(message);
    },
  } = options;

  const watchers: { close: () => void }[] = [];
  const pending = new Set<string>();
  let timer: NodeJS.Timeout | undefined;
  let running = false;

  async function drain(): Promise<void> {
    if (running) {
      // Whatever arrived is already in `pending`, and the loop below picks it
      // up when the in-flight handler finishes.
      return;
    }
    running = true;
    try {
      // Keyed off `pending` rather than a flag: anything that arrived during a
      // handler is still queued when it finishes.
      while (pending.size > 0) {
        const changed = [...pending];
        pending.clear();
        await onChange(changed);
      }
    } catch (cause) {
      // A failed handler must not end the session: the author is mid-edit and
      // the next save is probably the fix.
      onError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      running = false;
    }
  }

  function onFileEvent(file: string): void {
    if (isIgnored(file) || ignore?.(file) === true) {
      return;
    }
    pending.add(file);
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => void drain(), debounceMs);
  }

  for (const dir of dirs) {
    try {
      watchers.push(
        watch(dir, { recursive: true }, (_event, name) => {
          if (name !== null) {
            onFileEvent(path.join(dir, name));
          }
        }),
      );
    } catch {
      onError(
        `Could not watch ${relativePosix(root, dir)}. Recursive watching is ` +
          `not supported on this filesystem.`,
      );
    }
  }

  return {
    close() {
      if (timer) {
        clearTimeout(timer);
      }
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}
