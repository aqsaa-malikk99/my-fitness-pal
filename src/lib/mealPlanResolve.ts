import type { MealSlots } from "@/types/profile";
import { addDaysIso, compareIso } from "@/lib/dateIso";

export type MealPlanResolution = {
  assignments: MealSlots;
  /** True if this calendar day has its own Firestore doc. */
  isStored: boolean;
  /** If not stored, ISO date of the nearest prior day that had a saved plan (what we copied from). */
  inheritedFrom: string | null;
};

/**
 * Resolve meals for `date`: use an explicit daily doc if present; otherwise walk backward day by day
 * to the most recent saved plan, then profile defaults.
 */
export function resolveMealPlanForDate(
  date: string,
  programStartIso: string,
  profileDefaults: MealSlots,
  storedByDate: Map<string, MealSlots>,
): MealPlanResolution {
  if (storedByDate.has(date)) {
    return { assignments: storedByDate.get(date)!, isStored: true, inheritedFrom: null };
  }

  let cursor = addDaysIso(date, -1);
  let guard = 0;
  const floor = compareIso(programStartIso, "1970-01-01") < 0 ? "1970-01-01" : programStartIso;

  while (compareIso(cursor, floor) >= 0 && guard++ < 500) {
    if (storedByDate.has(cursor)) {
      return { assignments: storedByDate.get(cursor)!, isStored: false, inheritedFrom: cursor };
    }
    cursor = addDaysIso(cursor, -1);
  }

  return { assignments: profileDefaults, isStored: false, inheritedFrom: null };
}
