import { z } from "zod";

import { FrameSchema } from "../schema/frame.js";

/**
 * Version of the distributable frame format, as `"MAJOR.MINOR"`.
 *
 * Deliberately independent of this package's semver: frame-kit will change for
 * authoring and tooling reasons that do not touch the format on disk.
 *
 * - MAJOR changes when a field is removed, renamed, retyped, or given new
 *   required semantics. A loader must refuse a manifest whose major differs.
 * - MINOR changes only ever add optional fields. Older loaders stay compatible
 *   because parsing strips unknown keys; they should warn that the frame may
 *   render with reduced fidelity.
 *
 * Version history:
 * - 1.2: added the optional `mask` asset URL on text boxes (shaped text).
 * - 1.1: added the optional `license` field on the manifest.
 */
export const CONTRACT_VERSION = "1.2";

/** The only manifest kind any loader understands today. */
export const DECLARATIVE_KIND = "declarative";

export const AssetEntrySchema = z.object({
  /** Path relative to the directory holding `frame.json`. Always POSIX. */
  path: z.string(),
  bytes: z.int().nonnegative().optional(),
  sha256: z.string().optional(),
});

export type AssetEntry = z.infer<typeof AssetEntrySchema>;

export const FrameManifestSchema = z.object({
  contractVersion: z.string(),
  /**
   * Open on purpose. Future formats (for example a frame that ships code) will
   * introduce new kinds, and a loader must reject those explicitly — see
   * {@link assertDeclarative} — rather than failing schema validation, which
   * would report the wrong problem.
   */
  kind: z.string(),
  /** Stable identifier, reverse-DNS by convention. */
  id: z.string(),
  /** The frame's own version, independent of `contractVersion`. */
  version: z.string(),
  generator: z.string().optional(),
  author: z.object({ name: z.string(), url: z.string().optional() }).optional(),
  /**
   * How the frame's art is licensed, as declared in its descriptor.
   *
   * Optional because contract 1.0 bundles predate it. Added in 1.1 so an
   * installed frame carries its licence with it — before this it existed only
   * in the release index, which an installed bundle does not travel with.
   */
  license: z.string().optional(),
  /** The frame itself, with every asset URL rewritten to a relative path. */
  frame: FrameSchema,
  /** Integrity index for the packaged files. Loaders may ignore it. */
  assets: z.array(AssetEntrySchema),
});

export type FrameManifest = z.infer<typeof FrameManifestSchema>;

export interface ContractCompatibility {
  /** Whether this loader can use the manifest at all. */
  ok: boolean;
  /**
   * True when the manifest is a newer minor than this loader: it will load,
   * but may reference fields the loader ignores.
   */
  degraded: boolean;
  reason?: string;
}

function parseVersion(
  version: string,
): { major: number; minor: number } | undefined {
  const match = /^(\d+)\.(\d+)$/.exec(version);
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  return { major: Number(match[1]), minor: Number(match[2]) };
}

/** Whether a manifest's `contractVersion` can be loaded by this build. */
export function isContractCompatible(
  contractVersion: string,
  loaderVersion: string = CONTRACT_VERSION,
): ContractCompatibility {
  const theirs = parseVersion(contractVersion);
  const ours = parseVersion(loaderVersion);
  if (!theirs || !ours) {
    return {
      ok: false,
      degraded: false,
      reason: `malformed contract version: ${contractVersion}`,
    };
  }
  if (theirs.major !== ours.major) {
    return {
      ok: false,
      degraded: false,
      reason: `contract major ${String(theirs.major)} is not supported by this build (expects ${String(ours.major)})`,
    };
  }
  return {
    ok: true,
    degraded: theirs.minor > ours.minor,
    reason:
      theirs.minor > ours.minor
        ? `frame targets contract ${contractVersion}; this build understands ${loaderVersion} and may render it with reduced fidelity`
        : undefined,
  };
}

/**
 * Narrows a manifest to one a declarative loader can use.
 *
 * Every loader must call this. A manifest of an unknown kind is a manifest
 * whose `frame` this loader has no business interpreting.
 */
export function assertDeclarative(manifest: FrameManifest): void {
  if (manifest.kind !== DECLARATIVE_KIND) {
    throw new Error(
      `unsupported frame kind ${JSON.stringify(manifest.kind)}; this build only loads ${JSON.stringify(DECLARATIVE_KIND)} frames`,
    );
  }
}
