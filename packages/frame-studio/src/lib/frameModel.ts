import type { CardBoxes, LayoutMasks, Rotation } from "@cardanvil/frame-kit";
import {
  type OverrideState,
  resolveBoxOverrides,
} from "@cardanvil/frame-kit/layout";

import type { Bounds, FramePayload, FrameSlot, TextBox } from "../api/types.js";

/** Reads the value at a dotted path, like the server's `getAtPath`. */
export function atPath(
  root: unknown,
  path: readonly (string | number)[],
): unknown {
  let current = root;
  for (const segment of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

export const isBounds = (value: unknown): value is Bounds =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Bounds).x === "number" &&
  typeof (value as Bounds).width === "number";

/**
 * How far the card is turned to read one box-set slot's boxes — the set's
 * `rotation`, or `undefined` for a set that reads upright. A turned set is
 * measured on the sheet as it lies after that turn, so everything the studio
 * draws from the set has to go through the same turn (see `CardBoxesSchema`).
 */
export function rotationOf(
  payload: FramePayload,
  slot: FrameSlot | undefined,
): Rotation | undefined {
  const set = slot ? atPath(payload.frame, slot.path) : undefined;
  if (set === null || typeof set !== "object") {
    return undefined;
  }
  const { rotation } = set as { rotation?: unknown };
  return rotation === 90 || rotation === 180 || rotation === 270
    ? rotation
    : undefined;
}

/**
 * The one member of a turned set that does not turn with it: a card prints
 * its collector line upright along the sheet's bottom edge whichever way the
 * text above it reads.
 */
export const isTurnedWithSet = (key: string): boolean =>
  key !== "collectorInfo";

/** The boxes in one box-set slot, in contract order. */
export function boxesIn(
  payload: FramePayload,
  slot: FrameSlot,
): { key: string; box: TextBox }[] {
  const set = atPath(payload.frame, slot.path);
  if (set === null || typeof set !== "object") {
    return [];
  }
  return Object.entries(set as Record<string, unknown>)
    .filter(([, value]) => isBounds(value))
    .map(([key, value]) => ({ key, box: value as TextBox }));
}

/**
 * The boxes in one box-set slot as a render in `state` draws them — each text
 * box's `overrides` resolved, exactly as Card Anvil resolves them.
 */
export function resolvedBoxesIn(
  payload: FramePayload,
  slot: FrameSlot,
  state: OverrideState,
): { key: string; box: TextBox }[] {
  const set = atPath(payload.frame, slot.path);
  if (set === null || typeof set !== "object") {
    return [];
  }
  // The payload is the schema-validated frame, so a box-set slot really does
  // hold a `CardBoxes`.
  const resolved = resolveBoxOverrides(set as CardBoxes, state);
  return Object.entries(resolved)
    .filter(([, value]) => isBounds(value))
    .map(([key, value]) => ({ key, box: value as TextBox }));
}

/**
 * A mask slot's masks. Any object will do as a `LayoutMasks`, every mask in
 * one being optional — and the payload is validated besides.
 */
export function masksIn(
  payload: FramePayload,
  slot: FrameSlot | undefined,
): LayoutMasks | undefined {
  const masks = slot ? atPath(payload.frame, slot.path) : undefined;
  return masks !== null && typeof masks === "object" ? masks : undefined;
}

/** Distinct layouts in a frame, grouped by variant. */
export function layoutsOf(payload: FramePayload): {
  variant: string | null;
  layouts: string[];
}[] {
  const byVariant = new Map<string | null, Set<string>>();
  for (const slot of payload.slots) {
    const set = byVariant.get(slot.variant) ?? new Set<string>();
    set.add(slot.layout);
    byVariant.set(slot.variant, set);
  }
  return [...byVariant.entries()]
    .sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""))
    .map(([variant, layouts]) => ({ variant, layouts: [...layouts].sort() }));
}

/** Every image URL in an asset slot, flattened, in a stable order. */
export function assetUrls(
  payload: FramePayload,
  slot: FrameSlot,
): { label: string; url: string }[] {
  const assets = atPath(payload.frame, slot.path);
  if (assets === null || typeof assets !== "object") {
    return [];
  }
  const out: { label: string; url: string }[] = [];
  const walk = (value: unknown, label: string) => {
    if (typeof value === "string") {
      if (value.startsWith("/api/asset")) {
        out.push({ label, url: value });
      }
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      walk(child, label ? `${label}.${key}` : key);
    }
  };
  walk(assets, "");
  return out;
}
