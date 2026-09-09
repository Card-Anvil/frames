import { type Frame, FrameSchema } from "../schema/frame.js";
import { layouts } from "../schema/layout.js";
import {
  type FrameManifest,
  FrameManifestSchema,
  assertDeclarative,
  isContractCompatible,
} from "./contract.js";
import { setAtPath, walkAssets } from "./walk.js";

export interface ManifestToFrameOptions {
  /**
   * Turns a package-relative asset path into a URL the renderer can load —
   * an object URL for a zip, an `asset://` URL for a directory on disk, an
   * absolute http(s) URL for a remote package.
   */
  resolveUrl: (path: string) => string;
  /**
   * Called when the frame loads but not in full fidelity — it targets a newer
   * minor contract than this build, or it configures layouts this build does
   * not know about. Called once per reason.
   */
  onDegraded?: (reason: string) => void;
}

const KNOWN_LAYOUTS: ReadonlySet<string> = new Set<string>(layouts);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Filters one layout map, recording every key it had to drop. */
function pruneLayoutMap(value: unknown, dropped: string[]): unknown {
  if (!isRecord(value)) {
    return value;
  }
  const unknown = Object.keys(value).filter((key) => !KNOWN_LAYOUTS.has(key));
  if (unknown.length === 0) {
    return value;
  }
  dropped.push(...unknown);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => KNOWN_LAYOUTS.has(key)),
  );
}

/** Filters every variant's layout map under `config.alternateLayouts`. */
function pruneAlternateLayouts(value: unknown, dropped: string[]): unknown {
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  let changed = false;
  for (const [variant, map] of Object.entries(value)) {
    const pruned = pruneLayoutMap(map, dropped);
    changed ||= pruned !== map;
    next[variant] = pruned;
  }
  return changed ? next : value;
}

/**
 * Strips layout keys this build does not recognise, before the manifest is
 * parsed.
 *
 * `config.layouts` is a `partialRecord` over a closed enum, so an unknown key
 * is a hard error rather than a stripped one — the one place a minor contract
 * bump can still reject a whole frame outright, which is exactly what the
 * degrade policy exists to prevent. Dropping the key costs that one layout and
 * keeps the rest of the frame.
 *
 * Returns the manifest untouched when there is nothing to drop, so the ordinary
 * case does not pay for a copy.
 */
function dropUnknownLayouts(
  manifest: unknown,
  onDegraded: ((reason: string) => void) | undefined,
): unknown {
  if (!isRecord(manifest) || !isRecord(manifest.frame)) {
    return manifest;
  }
  const frame = manifest.frame;
  const config = frame.config;
  if (!isRecord(config)) {
    return manifest;
  }

  const dropped: string[] = [];
  const prunedLayouts = pruneLayoutMap(config.layouts, dropped);
  const prunedAlternates = pruneAlternateLayouts(
    config.alternateLayouts,
    dropped,
  );
  if (dropped.length === 0) {
    return manifest;
  }

  const names = [...new Set(dropped)].sort();
  onDegraded?.(
    `ignoring ${String(names.length)} unknown layout(s) this build does not support: ${names.join(", ")}`,
  );

  const nextConfig: Record<string, unknown> = {
    ...config,
    layouts: prunedLayouts,
  };
  if (prunedAlternates !== undefined) {
    nextConfig.alternateLayouts = prunedAlternates;
  }
  return { ...manifest, frame: { ...frame, config: nextConfig } };
}

/**
 * Validates a manifest and rebuilds a loadable {@link Frame} from it, turning
 * every package-relative asset path back into a URL.
 */
export function manifestToFrame(
  manifest: unknown,
  options: ManifestToFrameOptions,
): Frame {
  const parsed: FrameManifest = FrameManifestSchema.parse(
    dropUnknownLayouts(manifest, options.onDegraded),
  );

  const compatibility = isContractCompatible(parsed.contractVersion);
  if (!compatibility.ok) {
    throw new Error(compatibility.reason ?? "incompatible contract version");
  }
  if (compatibility.degraded && compatibility.reason) {
    options.onDegraded?.(compatibility.reason);
  }

  assertDeclarative(parsed);

  const frame: unknown = JSON.parse(JSON.stringify(parsed.frame));
  for (const occurrence of walkAssets(FrameSchema, frame)) {
    setAtPath(frame, occurrence.path, options.resolveUrl(occurrence.url));
  }

  return FrameSchema.parse(frame);
}
