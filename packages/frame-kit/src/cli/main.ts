#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { validateFrames } from "./api.js";
import { buildFrames } from "./build.js";
import { describeBytes } from "./bundle.js";
import { PackagingError } from "./errors.js";
import { Reporter, inGitHubActions } from "./report.js";

const USAGE = `frame-kit — package Card Anvil frames

Usage:
  frame-kit validate [options]           check every frame, write nothing
  frame-kit build --out <dir> [options]  check every frame, then pack each one
  frame-kit --help
  frame-kit --version

Options:
  --root <dir>          where to look for frames (default: the current directory)
  --frame <slug>        only this frame; repeatable
  --summary-md <file>   append a Markdown summary (use "$GITHUB_STEP_SUMMARY")
  --json                machine-readable output

build only:
  --out <dir>           where bundles are written (required)
  --version <x.y.z>     version stamped into every frame
                        (default: the version in the repository's package.json)
  --repository <o/n>    the GitHub repository the release belongs to
  --tag <vX.Y.Z>        the release tag; with --repository, puts download URLs
                        in the index

A frame is any directory containing a frame.meta.json.
`;

/** 0 clean · 1 one or more frames failed · 2 the command was used wrongly. */
const EXIT = { ok: 0, failed: 1, usage: 2 } as const;

interface Values {
  root?: string | undefined;
  frame?: string[] | undefined;
  "summary-md"?: string | undefined;
  json?: boolean | undefined;
  out?: string | undefined;
  version?: string | undefined;
  repository?: string | undefined;
  tag?: string | undefined;
}

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

/** The single version every frame in a repository is released under. */
async function repositoryVersion(root: string): Promise<string> {
  try {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    );
    const version = (manifest as { version?: unknown }).version;
    if (typeof version === "string") {
      return version;
    }
  } catch {
    // No package.json, or an unreadable one — the message below covers both.
  }
  throw new PackagingError(
    "no version to stamp into the frames. Pass --version, or set one in the " +
      "repository's package.json.",
  );
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
  console.log(
    [
      `${String(frames)} frame${frames === 1 ? "" : "s"}`,
      errors > 0
        ? `${String(errors)} error${errors === 1 ? "" : "s"}`
        : undefined,
      warnings > 0
        ? `${String(warnings)} warning${warnings === 1 ? "" : "s"}`
        : undefined,
    ]
      .filter(Boolean)
      .join(", "),
  );
}

async function runValidate(
  root: string,
  only: readonly string[],
  values: Values,
): Promise<number> {
  const { reporter, frames } = await validateFrames({ root, only });
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

async function runBuild(
  root: string,
  only: readonly string[],
  values: Values,
): Promise<number> {
  if (values.out === undefined) {
    console.error(`build needs --out <dir>.\n\n${USAGE}`);
    return EXIT.usage;
  }
  const version = values.version ?? (await repositoryVersion(root));
  const reporter = new Reporter();
  const { frames: built } = await buildFrames(
    {
      root,
      only,
      outDir: values.out,
      version,
      generator: `@cardanvil/frame-kit@${await packageVersion()}`,
      // Both or neither: a download URL needs the repository and the tag.
      ...(values.repository !== undefined && values.tag !== undefined
        ? { source: { repository: values.repository, tag: values.tag } }
        : {}),
    },
    reporter,
  );

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          ok: reporter.ok,
          version,
          frames: built.map((frame) => ({
            id: frame.manifest.id,
            slug: frame.loaded.discovered.slug,
            bundle: frame.bundleName,
            bytes: frame.bytes,
          })),
          problems: reporter.problems,
        },
        null,
        2,
      ),
    );
  } else {
    await emit(reporter, values["summary-md"]);
    for (const frame of built) {
      console.log(`${frame.bundleName}  ${describeBytes(frame.bytes)}`);
    }
    summarise(reporter, built.length);
  }
  return reporter.ok ? EXIT.ok : EXIT.failed;
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
  if (command !== "validate" && command !== "build") {
    console.error(`Unknown command "${command}".\n\n${USAGE}`);
    return EXIT.usage;
  }

  let values: Values;
  try {
    ({ values } = parseArgs({
      args: argv.slice(1),
      options: {
        root: { type: "string" },
        frame: { type: "string", multiple: true },
        "summary-md": { type: "string" },
        json: { type: "boolean" },
        out: { type: "string" },
        version: { type: "string" },
        repository: { type: "string" },
        tag: { type: "string" },
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
  const only = values.frame ?? [];

  return command === "build"
    ? await runBuild(root, only, values)
    : await runValidate(root, only, values);
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
