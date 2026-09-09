/** Returns a copy of `obj` with the given keys removed (non-mutating). */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const keyMap = {} as Record<K, true>;
  for (const key of keys) {
    keyMap[key] = true;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in keyMap)) {
      result[k] = v;
    }
  }
  return result as Omit<T, K>;
}
