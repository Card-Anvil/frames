import { z } from "zod";

import { CONTRACT_VERSION } from "../manifest/contract.js";

/** Bumped only when the index's own shape changes, not the frame contract's. */
export const FRAME_INDEX_FORMAT_VERSION = 1;

export const FRAME_INDEX_FILENAME = "frame-index.json";

const ArtifactSchema = z.object({
  /** Filename as attached to the release. Always present. */
  file: z.string(),
  /** Absolute URL. Absent for a local build, which has no release to point at. */
  url: z.url().optional(),
  bytes: z.int().nonnegative(),
  sha256: z.string(),
});

const PreviewSchema = ArtifactSchema.extend({
  width: z.int().positive().optional(),
  height: z.int().positive().optional(),
});

export const IndexedFrameSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  tags: z.array(z.string()),
  /** Layout names the frame supports, so a browse UI can filter on them. */
  layouts: z.array(z.string()),
  canvas: z.object({ width: z.int(), height: z.int() }),
  author: z.object({ name: z.string(), url: z.string().optional() }),
  license: z.string(),
  homepage: z.string().optional(),
  /** Which frame contract the bundle targets — a client filters on this. */
  contractVersion: z.string(),
  assetCount: z.int().nonnegative(),
  bundle: ArtifactSchema,
  preview: PreviewSchema,
});

export type IndexedFrame = z.infer<typeof IndexedFrameSchema>;

export const FrameIndexSchema = z.object({
  /** Envelope discriminators, so a consumer handed the wrong JSON can say so. */
  app: z.literal("card-anvil"),
  kind: z.literal("frame-index"),
  formatVersion: z.int().positive(),

  generatedAt: z.string(),
  generator: z.string().optional(),
  /** The contract the generating frame-kit implements. */
  contractVersion: z.string(),
  /** The release version. One version covers every frame in the repository. */
  version: z.string(),

  /**
   * Where this index came from. Omitted for a local build. An aggregator that
   * merged many repositories keeps this so it can still re-fetch each one.
   */
  source: z
    .object({
      kind: z.literal("github-release"),
      repository: z.string(),
      tag: z.string(),
      url: z.url(),
      downloadBase: z.url(),
      /** Always the newest release — what a marketplace polls. */
      latestIndexUrl: z.url(),
    })
    .optional(),

  frames: z.array(IndexedFrameSchema),
});

export type FrameIndex = z.infer<typeof FrameIndexSchema>;

export interface ReleaseSource {
  /** `owner/name`. */
  repository: string;
  /** `vX.Y.Z`. */
  tag: string;
}

/** Where a release's assets are downloadable from. */
export function downloadBase(source: ReleaseSource): string {
  return `https://github.com/${source.repository}/releases/download/${source.tag}/`;
}

/**
 * The stable URL a marketplace polls: GitHub resolves `latest` to the newest
 * published, non-prerelease release, so it needs no API call and no auth. This
 * is the same convention Card Anvil's own updater relies on.
 */
export function latestIndexUrl(repository: string): string {
  return `https://github.com/${repository}/releases/latest/download/${FRAME_INDEX_FILENAME}`;
}

export function buildSource(source: ReleaseSource): FrameIndex["source"] {
  return {
    kind: "github-release",
    repository: source.repository,
    tag: source.tag,
    url: `https://github.com/${source.repository}/releases/tag/${source.tag}`,
    downloadBase: downloadBase(source),
    latestIndexUrl: latestIndexUrl(source.repository),
  };
}

export function buildIndex(options: {
  version: string;
  generator?: string;
  frames: IndexedFrame[];
  source?: ReleaseSource;
  generatedAt?: Date;
}): FrameIndex {
  return {
    app: "card-anvil",
    kind: "frame-index",
    formatVersion: FRAME_INDEX_FORMAT_VERSION,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    ...(options.generator === undefined
      ? {}
      : { generator: options.generator }),
    contractVersion: CONTRACT_VERSION,
    version: options.version,
    ...(options.source === undefined
      ? {}
      : { source: buildSource(options.source) }),
    // Sorted by id so the index is stable and diffable across releases.
    frames: [...options.frames].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
