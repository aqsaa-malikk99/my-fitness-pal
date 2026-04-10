/**
 * Firestore rejects `undefined` in any field (including nested). Omits undefined keys; keeps `null`.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) {
    return value as T;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as T;
  }
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}
