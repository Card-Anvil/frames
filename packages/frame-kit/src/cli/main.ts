#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { validateFrames } from "./api.js";
import { PackagingError } from "./errors.js";
import { type Reporter, inGitHubActions } from "./report.js";

const USAGE = `frame-kit — package Card Anvil frames

Usage:
  frame-kit validate [options]      check every frame without writing anything
  frame-kit --help
  frame-kit --version

Options:
  --root <dir>          where to look for frames (default: the current directory)
  --frame <slug>        only this frame; repeatable
  --summary-md <file>   append a Markdown summary (use "$GITHUB_STEP_SUMMARY")
  --json                machine-readable output

A frame is any directory containing a frame.meta.json.
`;

/** 0 clean · 1 one or more frames failed · 2 the command was used wrongly. */
const EXIT = { ok: 0, failed: 1, usage: 2 } as const;

async function packageVersion(): Promise<string> {
  const manifest: unknown = JSON.parse(
    await readFile(
      path.join(import.meta.dirname, "../../package.json"),
      "utf8",
    ),
  );
  const version = (manifest as { version?: unknown }).version;
  return typeof version === "string" ? version : "0.0.0";
}

async function emit(
  reporter: Reporter,
  summaryFile: string | undefined,
): Promise<void> {
  if (reporter.problems.length > 0) {
    console.error(
      inGitHubActions() ? reporter.toAnnotations() : reporter.toText(),
    );
  }
  if (summaryFile) {
    const body = reporter.ok
      ? "### Frames\n\nEvery frame is valid.\n"
      : `### Frames\n\n${reporter.toMarkdown()}\n`;
    await appendFile(summaryFile, body, "utf8");
  }
}

function summarise(reporter: Reporter, frames: number): void {
  const { length: errors } = reporter.errors;
  const { length: warnings } = reporter.warnings;
  const counts = [
    `${String(frames)} frame${frames === 1 ? "" : "s"} checked`,
    errors > 0
      ? `${String(errors)} error${errors === 1 ? "" : "s"}`
      : undefined,
    warnings > 0
      ? `${String(warnings)} warning${warnings === 1 ? "" : "s"}`
      : undefined,
  ].filter(Boolean);
  console.log(counts.join(", "));
}

async function main(argv: string[]): Promise<number> {
  const command = argv[0];

  if (command === undefined || command === "--help" || command === "-h") {
    console.log(USAGE);
    return command === undefined ? EXIT.usage : EXIT.ok;
  }
  if (command === "--version" || command === "-v") {
    console.log(await packageVersion());
    return EXIT.ok;
  }
  if (command !== "validate") {
    console.error(`Unknown command "${command}".\n\n${USAGE}`);
    return EXIT.usage;
  }

  let values;
  try {
    ({ values } = parseArgs({
      args: argv.slice(1),
      options: {
        root: { type: "string" },
        frame: { type: "string", multiple: true },
        "summary-md": { type: "string" },
        json: { type: "boolean" },
      },
      strict: true,
    }));
  } catch (cause) {
    console.error(
      `${cause instanceof Error ? cause.message : String(cause)}\n\n${USAGE}`,
    );
    return EXIT.usage;
  }

  const root = path.resolve(values.root ?? process.cwd());
  const { reporter, frames } = await validateFrames({
    root,
    only: values.frame ?? [],
  });

  if (values.json) {
    console.log(
      JSON.stringify(
        { ok: reporter.ok, frames: frames.length, problems: reporter.problems },
        null,
        2,
      ),
    );
  } else {
    await emit(reporter, values["summary-md"]);
    summarise(reporter, frames.length);
  }
  return reporter.ok ? EXIT.ok : EXIT.failed;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (cause) {
  // A PackagingError is something the author can act on; anything else is a bug
  // in this tool and deserves its stack.
  if (cause instanceof PackagingError) {
    console.error(cause.message);
  } else {
    console.error(cause);
  }
  process.exitCode = EXIT.failed;
}
