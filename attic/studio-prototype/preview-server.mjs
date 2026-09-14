#!/usr/bin/env node
/**
 * Zero-dependency dev server for tools/boxes-preview.html.
 *
 *   pnpm boxes-preview
 *
 * Serves the preview page plus JSON APIs the page polls so that edits to
 * a frame's boxes.ts show up live, without reloading:
 *
 *   GET /api/frames                 -> ["dragon-hoard", "example", …]
 *   GET /api/boxes?frame=<name>     -> { boxes: { … } }
 *   GET /api/preview?frame=<name>   -> { boxes: { … }, layers: [{ name, src }] }
 *   GET /asset?frame=<name>&p=<rel> -> the image file itself
 *
 * `layers` lists every PNG under the frame's base/ folder, bottom-to-top:
 * colour layers first, then the pt/ overlays.
 *
 * The boxes object is read from the frame's boxes.ts with a regex + eval, same
 * trick the page uses in file mode — the configs here are plain literals.
 */
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const framesDir = join(root, "frames");
const port = Number(process.env.PORT) || 4620;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
};

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

// Extract `export const boxes: CardBoxes = { … }` and evaluate the literal.
function parseBoxes(src) {
  const cleaned = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
  const m = /\bboxes\s*:[^=]*=\s*\{/.exec(cleaned);
  if (!m) throw new Error("no `export const boxes = { … }` found");
  const start = cleaned.indexOf("{", m.index);
  let depth = 0,
    end = -1,
    inStr = null;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'" || c === "`") inStr = c;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error("unbalanced braces in boxes object");
  return new Function(`return ${cleaned.slice(start, end + 1)}`)();
}

async function readBoxes(frame) {
  const p = join(framesDir, frame, "boxes.ts");
  if (!existsSync(p)) throw new Error(`frame "${frame}" has no boxes.ts`);
  return parseBoxes(await readFile(p, "utf8"));
}

// Every PNG under the frame's base/ folder, bottom-to-top (colours first,
// then the pt/ overlays), served through the /asset endpoint.
async function listLayers(frame) {
  const dir = join(framesDir, frame, "base");
  if (!existsSync(dir)) return [];
  const layers = [];
  const walk = async (rel) => {
    const abs = join(dir, rel);
    for (const e of (await readdir(abs, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(relPath);
      else if (e.name.endsWith(".png")) {
        layers.push({
          name: `base/${relPath}`,
          src: `/asset?frame=${encodeURIComponent(frame)}&p=${encodeURIComponent(`base/${relPath}`)}`,
        });
      }
    }
  };
  await walk("");
  // keep the pt/ overlays on top of the colour layers
  layers.sort((a, b) => {
    const aPt = a.name.includes("/pt/") ? 1 : 0;
    const bPt = b.name.includes("/pt/") ? 1 : 0;
    return aPt - bPt || a.name.localeCompare(b.name);
  });
  return layers;
}

// Resolve a frame-relative asset path, refusing anything outside frames/.
function safeAssetPath(frame, rel) {
  const abs = resolve(framesDir, frame, rel);
  if (!abs.startsWith(resolve(framesDir)) || !existsSync(abs)) return null;
  return abs;
}

function notFound(res, msg) {
  json(res, 404, { error: msg ?? "not found" });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const frame = url.searchParams.get("frame");

  try {
    switch (url.pathname) {
      case "/":
      case "/boxes-preview.html": {
        const html = await readFile(join(root, "tools", "boxes-preview.html"));
        res.writeHead(200, {
          "content-type": MIME[".html"],
          "cache-control": "no-store",
        });
        res.end(html);
        break;
      }
      case "/api/frames": {
        const entries = await readdir(framesDir, { withFileTypes: true });
        const frames = [];
        for (const e of entries) {
          if (
            e.isDirectory() &&
            existsSync(join(framesDir, e.name, "frame.meta.json"))
          ) {
            frames.push(e.name);
          }
        }
        json(res, 200, frames.sort());
        break;
      }
      case "/api/boxes": {
        json(res, 200, { boxes: await readBoxes(frame) });
        break;
      }
      case "/api/preview": {
        const [boxes, layers] = await Promise.all([
          readBoxes(frame),
          listLayers(frame),
        ]);
        json(res, 200, { boxes, layers });
        break;
      }
      case "/asset": {
        const p = safeAssetPath(frame, url.searchParams.get("p") ?? "");
        if (!p) {
          notFound(res, "asset not found");
          break;
        }
        res.writeHead(200, {
          "content-type": MIME[".png"],
          "cache-control": "no-store",
        });
        res.end(await readFile(p));
        break;
      }
      default:
        notFound(res);
    }
  } catch (e) {
    json(res, 400, { error: String(e.message ?? e) });
  }
});

server.listen(port, () => {
  console.log(`boxes preview → http://localhost:${port}/`);
});
