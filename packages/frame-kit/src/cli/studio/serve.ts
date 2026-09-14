import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import path from "node:path";
import { parseArgs } from "node:util";

import { devUrlToFile } from "../devUrl.js";
import { relativePosix } from "../discover.js";
import { PackagingError } from "../errors.js";
import { startSourceWatcher } from "../sourceWatcher.js";
import { type Edit, applyEdits } from "./edit/applyEdits.js";
import { type BoxSetRef, createImpactCache } from "./edit/impact.js";
import { resolveFramePath } from "./edit/resolvePath.js";
import { isUnderRoot, normalizeFile } from "./edit/sourceIndex.js";
import { startSession } from "./session.js";

const DEFAULT_PORT = 4620;
const DEFAULT_HOST = "127.0.0.1";
/** How long a file we just wrote is still attributed to us. */
const SELF_WRITE_TTL_MS = 2000;

const HTML_TYPE = "text/html; charset=utf-8";

const MIME: Record<string, string> = {
  ".html": HTML_TYPE,
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const mimeFor = (file: string) =>
  MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

interface StudioEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

/** Live-update channel. One-way, self-reconnecting, no dependency. */
class EventStream {
  private readonly clients = new Set<ServerResponse>();

  add(res: ServerResponse): void {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    res.write("retry: 1000\n\n");
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
  }

  send(event: StudioEvent): void {
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      client.write(frame);
    }
  }

  ping(): void {
    for (const client of this.clients) {
      client.write(": ping\n\n");
    }
  }

  close(): void {
    for (const client of this.clients) {
      client.end();
    }
    this.clients.clear();
  }
}

/**
 * Where the studio UI's source sits relative to the built CLI.
 *
 * `dist/cli/studio/serve.js` → up four is `packages/`, and the UI is a sibling
 * package there. Only present in the frames workspace; a published frame-kit
 * ships `dist/studio` and no source at all.
 */
function defaultUiSrcDir(): string {
  return path.resolve(import.meta.dirname, "../../../../frame-studio");
}

/**
 * The studio UI served from source, with hot reloading, on this same server.
 *
 * Vite runs in middleware mode and its HMR socket attaches to the http server
 * already listening, so developing the UI needs one command and one port
 * rather than a second dev server behind a proxy.
 */
async function startUiDevServer(
  srcDir: string,
  httpServer: import("node:http").Server,
): Promise<{
  middlewares: (req: IncomingMessage, res: ServerResponse) => void;
  close: () => Promise<void>;
}> {
  if (!existsSync(path.join(srcDir, "index.html"))) {
    throw new PackagingError(
      `--dev needs the studio UI's source, which is not at ${srcDir}.\n\n` +
        "It ships only inside the frames workspace; an installed frame-kit\n" +
        "carries the built UI instead. Drop --dev to serve that.\n",
    );
  }

  let vite;
  try {
    vite = await import("vite");
  } catch {
    throw new PackagingError("--dev needs Vite installed.\n");
  }

  const server = await vite.createServer({
    root: srcDir,
    appType: "spa",
    server: { middlewareMode: true, hmr: { server: httpServer } },
  });

  return {
    middlewares: (req, res) => {
      server.middlewares(req, res);
    },
    close: () => server.close(),
  };
}

export interface StudioOptions {
  readonly root: string;
  readonly only?: readonly string[];
  readonly port?: number;
  readonly host?: string;
  readonly writeEnabled?: boolean;
  /** Directory holding the built SPA. Defaults to `dist/studio`. */
  readonly uiDir?: string;
  /**
   * Serve the studio UI from source with hot reloading instead of from
   * `dist/studio`. Only possible inside the frames workspace, where that
   * source exists — a published frame-kit ships the built SPA alone.
   */
  readonly dev?: boolean;
  /** Where the studio UI's source lives. Defaults to the workspace sibling. */
  readonly uiSrcDir?: string;
  readonly open?: boolean;
  readonly onReady?: (url: string) => void;
}

/** Opens a URL in the platform's default browser, best effort. */
function openBrowser(url: string): void {
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(command, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Not being able to open a browser is not a reason to fail to serve; the
    // URL was already printed.
  }
}

/** Serves the studio until the process is interrupted. */
export async function serveStudio(options: StudioOptions): Promise<void> {
  const root = path.resolve(options.root);
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  const writeEnabled = options.writeEnabled ?? true;
  const uiDir =
    options.uiDir ?? path.resolve(import.meta.dirname, "../../studio");

  const session = await startSession(root, options.only ?? []);
  const events = new EventStream();
  const selfWrites = new Map<string, number>();
  const impacts = createImpactCache();

  /** Every box set in a frame, for the shared-literal scan. */
  const boxSetsOf = (slug: string): BoxSetRef[] =>
    (session.get(slug)?.payload.slots ?? [])
      .filter((slot) => slot.kind === "boxes")
      .map((slot) => ({
        variant: slot.variant,
        layout: slot.layout,
        key: slot.key,
        path: slot.path,
      }));

  const keepAlive = setInterval(() => {
    events.ping();
  }, 25_000);
  keepAlive.unref();

  async function serveUi(res: ServerResponse, pathname: string): Promise<void> {
    const requested = pathname === "/" ? "/index.html" : pathname;
    const file = path.join(uiDir, requested.replace(/^\/+/, ""));
    const target = isUnderRoot(file, uiDir)
      ? file
      : path.join(uiDir, "index.html");
    try {
      const body = await readFile(target);
      res.writeHead(200, {
        "content-type": mimeFor(target),
        "cache-control": "no-store",
      });
      res.end(body);
    } catch {
      // Unknown path: hand back the shell so the SPA can route it, unless the
      // shell itself is missing, which means the UI was never built.
      try {
        const shell = await readFile(path.join(uiDir, "index.html"));
        res.writeHead(200, {
          "content-type": HTML_TYPE,
          "cache-control": "no-store",
        });
        res.end(shell);
      } catch {
        res.writeHead(500, { "content-type": HTML_TYPE });
        res.end(
          "<h1>The studio UI is not built.</h1><p>Run <code>pnpm --filter @cardanvil/frame-studio build</code>.</p>",
        );
      }
    }
  }

  async function serveAsset(
    res: ServerResponse,
    url: string | null,
  ): Promise<void> {
    if (!url) {
      sendJson(res, 400, { error: "missing asset url" });
      return;
    }
    const file = devUrlToFile(
      url,
      session.frameServer.root,
      session.frameServer.base,
    );
    if (!file) {
      sendJson(res, 404, { error: `not an asset url: ${url}` });
      return;
    }
    try {
      const info = await stat(file);
      const etag = `"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
      res.writeHead(200, {
        "content-type": mimeFor(file),
        "cache-control": "no-cache",
        etag,
      });
      createReadStream(file).pipe(res);
    } catch {
      sendJson(res, 404, {
        error: `asset not found: ${relativePosix(root, file)}`,
      });
    }
  }

  function handleSource(res: ServerResponse, url: URL): void {
    const slug = url.searchParams.get("frame") ?? "";
    const raw = url.searchParams.get("path") ?? "";
    const entry = session.get(slug);
    if (!entry) {
      sendJson(res, 404, { error: `no frame "${slug}"` });
      return;
    }
    const framePath = raw.split(".").filter(Boolean);
    const ctx = { api: session.api, index: session.index, root: session.root };
    const resolution = resolveFramePath(
      ctx,
      entry.discovered.entryFile,
      entry.discovered.meta.export,
      framePath,
    );
    const shared =
      resolution.editable && url.searchParams.get("impact") === "1"
        ? impacts.get(entry.payload.revision, {
            ctx,
            entryFile: entry.discovered.entryFile,
            exportName: entry.discovered.meta.export,
            boxSets: boxSetsOf(slug),
            target: framePath,
          })
        : [];
    sendJson(res, 200, {
      path: framePath,
      ...(resolution.editable
        ? {
            editable: true,
            file: relativePosix(root, resolution.file),
            line: resolution.location.line,
            column: resolution.location.column,
            text: resolution.text,
            sharedDefault: resolution.sharedDefault,
            shared,
          }
        : {
            editable: false,
            reason: resolution.reason,
            detail: resolution.detail,
            ...(resolution.source
              ? {
                  source: {
                    file: relativePosix(root, resolution.source.file),
                    line: resolution.source.line,
                    column: resolution.source.column,
                  },
                }
              : {}),
          }),
    });
  }

  async function handleEdit(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (!writeEnabled) {
      sendJson(res, 403, {
        code: "read-only",
        detail: "The studio was started with --no-write.",
      });
      return;
    }
    const body = (await readBody(req)) as {
      frame?: string;
      edits?: Edit[];
      expect?: Record<string, string>;
      confirmShared?: boolean;
    };
    const entry = session.get(body.frame ?? "");
    if (!entry) {
      sendJson(res, 404, { error: `no frame "${body.frame ?? ""}"` });
      return;
    }

    // A literal several box sets read moves all of them. Say so and make the
    // author confirm, rather than surprising them after the write.
    if (body.confirmShared !== true) {
      const ctx = {
        api: session.api,
        index: session.index,
        root: session.root,
      };
      const boxSets = boxSetsOf(entry.payload.slug);
      const shared = (body.edits ?? []).flatMap((edit) =>
        impacts
          .get(entry.payload.revision, {
            ctx,
            entryFile: entry.discovered.entryFile,
            exportName: entry.discovered.meta.export,
            boxSets,
            target: edit.path,
          })
          .map((impact) => ({ ...impact, edited: edit.path })),
      );
      if (shared.length > 0) {
        sendJson(res, 409, { code: "shared", shared });
        return;
      }
    }

    const result = await applyEdits({
      ctx: { api: session.api, index: session.index, root: session.root },
      entryFile: entry.discovered.entryFile,
      exportName: entry.discovered.meta.export,
      frame: entry.raw,
      edits: body.edits ?? [],
      ...(body.expect
        ? {
            expect: new Map(
              Object.entries(body.expect).map(([file, hash]) => [
                normalizeFile(path.resolve(root, file)),
                hash,
              ]),
            ),
          }
        : {}),
    });

    if (!result.ok) {
      sendJson(res, 409, {
        code: result.rejected[0]?.reason,
        rejected: result.rejected,
      });
      return;
    }

    const now = Date.now();
    for (const file of result.files.keys()) {
      selfWrites.set(file, now);
    }
    await session.reload([entry.payload.slug]);
    const updated = session.get(entry.payload.slug);
    events.send({
      type: "frame",
      slug: entry.payload.slug,
      revision: updated?.payload.revision ?? 0,
      cause: "self",
    });
    sendJson(res, 200, {
      applied: result.applied.map((edit) => ({
        ...edit,
        file: relativePosix(root, edit.file),
      })),
      revision: updated?.payload.revision ?? 0,
    });
  }

  /**
   * The UI in development: a Vite server in middleware mode, mounted on this
   * same http server so one command and one port give you both the API and
   * hot reloading. Its HMR socket rides the same server, so nothing else has
   * to be running and no proxy sits in between.
   */
  let uiDev: Awaited<ReturnType<typeof startUiDevServer>> | undefined;

  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", `http://${host}:${String(port)}`);
      try {
        switch (url.pathname) {
          case "/api/studio":
            sendJson(res, 200, {
              root: relativePosix(path.dirname(root), root),
              absoluteRoot: root,
              writeEnabled,
            });
            return;
          case "/api/frames":
            sendJson(res, 200, { frames: session.list() });
            return;
          case "/api/frame": {
            const entry = session.get(url.searchParams.get("frame") ?? "");
            if (!entry) {
              sendJson(res, 404, { error: "no such frame" });
              return;
            }
            sendJson(res, 200, entry.payload);
            return;
          }
          case "/api/asset":
            await serveAsset(res, url.searchParams.get("u"));
            return;
          case "/api/source":
            handleSource(res, url);
            return;
          case "/api/edit":
            await handleEdit(req, res);
            return;
          case "/api/events":
            events.add(res);
            return;
          default:
            if (uiDev) {
              uiDev.middlewares(req, res);
              return;
            }
            await serveUi(res, url.pathname);
        }
      } catch (cause) {
        sendJson(res, 500, {
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    })();
  });

  const watcher = startSourceWatcher({
    root,
    dirs: session.watchDirs(),
    onChange: async (changed) => {
      const now = Date.now();
      const ours = changed.every((file) => {
        const at = selfWrites.get(normalizeFile(file));
        return at !== undefined && now - at < SELF_WRITE_TTL_MS;
      });
      if (ours) {
        return; // already reloaded and broadcast by the edit that wrote it
      }
      const reloaded = await session.reload();
      for (const slug of reloaded) {
        const entry = session.get(slug);
        events.send({
          type: entry?.payload.stale === true ? "frame-error" : "frame",
          slug,
          revision: entry?.payload.revision ?? 0,
          cause: "external",
        });
      }
      events.send({ type: "frames", frames: session.list() });
    },
  });

  if (options.dev === true) {
    // Created after the http server exists so HMR can attach to it.
    uiDev = await startUiDevServer(
      options.uiSrcDir ?? defaultUiSrcDir(),
      server,
    );
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const url = `http://${host}:${String(port)}/`;
  (
    options.onReady ??
    ((ready: string) => {
      console.log(`studio → ${ready}`);
    })
  )(url);
  if (options.open === true) {
    openBrowser(url);
  }

  try {
    await new Promise<void>((resolve) => {
      const stop = () => {
        resolve();
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  } finally {
    clearInterval(keepAlive);
    watcher.close();
    events.close();
    server.close();
    await uiDev?.close();
    await session.close();
  }
}

/** `frame-kit studio` — parses its own flags, like `schema` does. */
export async function runStudio(argv: string[]): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        root: { type: "string" },
        frame: { type: "string", multiple: true },
        port: { type: "string" },
        host: { type: "string" },
        open: { type: "boolean" },
        dev: { type: "boolean" },
        // `parseArgs` has no `--no-` negation; the key is the literal name.
        "no-write": { type: "boolean" },
      },
      strict: true,
    }));
  } catch (cause) {
    console.error(cause instanceof Error ? cause.message : String(cause));
    return 2;
  }

  const port = values.port === undefined ? DEFAULT_PORT : Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid --port "${values.port ?? ""}".`);
    return 2;
  }

  const host = values.host ?? DEFAULT_HOST;
  const writeEnabled = values["no-write"] !== true;
  if (writeEnabled && host !== DEFAULT_HOST && host !== "localhost") {
    console.error(
      `Warning: serving on ${host} with editing enabled. The studio writes to\n` +
        "your source files; anyone who can reach this port can change them.\n",
    );
  }

  await serveStudio({
    root: values.root ?? process.cwd(),
    ...(values.frame ? { only: values.frame } : {}),
    port,
    host,
    writeEnabled,
    open: values.open === true,
    dev: values.dev === true,
  });
  return 0;
}
