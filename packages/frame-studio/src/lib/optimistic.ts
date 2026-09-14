import type { FramePayload } from "../api/types.js";
import { atPath } from "./frameModel.js";

/** A value the user has committed but the server has not confirmed yet. */
export type PendingEdits = ReadonlyMap<string, number | string | boolean>;

export const pathKey = (path: readonly (string | number)[]): string =>
  path.join(".");

/**
 * The frame as the user has just left it, before the file round-trip lands.
 *
 * Writing a coordinate takes a file write, an SSR reload and an SSE round
 * trip. Until that finishes the payload still holds the old numbers, so
 * anything that redraws from it in the meantime — a status change, a hover —
 * puts the box back where it was and makes a drag look like it snapped back.
 * Overlaying the committed values keeps the box where it was dropped.
 *
 * Returns the payload unchanged when nothing is pending, so the common case
 * keeps its identity and dependent effects do not re-run.
 */
export function withPending(
  payload: FramePayload,
  pending: PendingEdits,
): FramePayload {
  if (pending.size === 0) {
    return payload;
  }

  const frame: unknown = structuredClone(payload.frame);
  for (const [key, value] of pending) {
    const path = key.split(".");
    const parent = atPath(frame, path.slice(0, -1));
    const last = path[path.length - 1];
    if (last !== undefined && parent !== null && typeof parent === "object") {
      (parent as Record<string, unknown>)[last] = value;
    }
  }
  return { ...payload, frame };
}
