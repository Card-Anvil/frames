import { z } from "zod";

/**
 * The marker file that says "a frame lives in this directory".
 *
 * Packaging has to work both in a pnpm workspace of packages (Card Anvil's own
 * frames) and in a flat single-package repository (the author template), so
 * frames are found by looking for this file rather than by guessing at a
 * directory convention.
 */
export const FRAME_META_FILENAME = "frame.meta.json";

/** Reverse-DNS, e.g. `com.example.parchment`. */
const IdSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(\.[a-z0-9-]+)+$/,
    "must be reverse-DNS, lower case, e.g. com.example.parchment",
  );

/** Lower-case kebab, used for filenames. */
const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lower-case kebab-case");

export const FrameMetaSchema = z.object({
  $schema: z.string().optional(),

  /**
   * Stable identity. Never changes across releases — it is what an installed
   * frame is keyed by, and what a marketplace binds to a repository.
   */
  id: IdSchema,

  /**
   * Names the bundle file. Defaults to the directory basename, so it only
   * needs setting when the directory is named something else (Card Anvil's
   * `packages/frame-m15` ships as `m15`).
   */
  slug: SlugSchema.optional(),

  /** Module exporting the frame, relative to this file. */
  entry: z.string().default("./index.ts"),

  /** Named export to read from `entry`. */
  export: z.string().default("default"),

  author: z.object({
    name: z.string().min(1),
    url: z.url().optional(),
  }),

  /**
   * How the frame's art is licensed. Required because it travels into the
   * distributable index where anyone installing the frame can read it, and
   * nobody else can answer it for you. SPDX identifiers are preferred;
   * `NOASSERTION` is the SPDX way to say no claim is being made.
   */
  license: z.string().min(1),

  homepage: z.url().optional(),
});

export type FrameMeta = z.infer<typeof FrameMetaSchema>;
