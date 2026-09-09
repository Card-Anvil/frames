import { type Frame, FrameSchema } from "../schema/frame.js";
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
   * Called when the manifest targets a newer minor contract than this build.
   * The frame still loads; some fields may be ignored.
   */
  onDegraded?: (reason: string) => void;
}

/**
 * Validates a manifest and rebuilds a loadable {@link Frame} from it, turning
 * every package-relative asset path back into a URL.
 */
export function manifestToFrame(
  manifest: unknown,
  options: ManifestToFrameOptions,
): Frame {
  const parsed: FrameManifest = FrameManifestSchema.parse(manifest);

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
