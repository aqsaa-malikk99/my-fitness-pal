/**
 * Today’s date in the user’s local timezone (YYYY-MM-DD).
 * Use for UI “today” so it matches the device calendar (unlike UTC from `Date.toISOString()`).
 */
export function localDateIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add calendar days to an ISO date string (YYYY-MM-DD). */
export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Inclusive of both endpoints. */
export function eachDateInRangeInclusive(start: string, end: string): string[] {
  if (compareIso(start, end) > 0) return [];
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (compareIso(cur, end) <= 0 && guard++ < 800) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

export function maxIso(a: string, b: string): string {
  return compareIso(a, b) >= 0 ? a : b;
}

export function minIso(a: string, b: string): string {
  return compareIso(a, b) <= 0 ? a : b;
}

export function formatWeekdayShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

export function formatMonthDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
