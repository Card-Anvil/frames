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
