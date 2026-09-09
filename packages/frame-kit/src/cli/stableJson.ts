/**
 * JSON with object keys sorted, recursively.
 *
 * A manifest's bytes should depend only on the frame, never on the order zod
 * happened to build an object in — so two builds of the same source produce an
 * identical `frame.json`, and diffing two releases is diffing text.
 *
 * Arrays keep their order: `assets` is already sorted by path, and layout
 * ordering is meaningful.
 */
export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    sorted[key] = sortKeys(source[key]);
  }
  return sorted;
}
