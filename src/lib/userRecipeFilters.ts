import type { UserRecipe } from "@/types/profile";

/**
 * Detects user recipes that were auto-created from the Food log smart-portion calculator
 * (legacy flow saved per-serving templates to Recipes). These are not full “my dishes” and are
 * hidden from **My own** in the Recipes tab.
 */
export function isFoodLogSmartPortionTemplate(r: UserRecipe): boolean {
  if (r.origin !== "user") return false;
  const t = (r.instructions ?? "").toLowerCase();
  if (t.includes("your log entry scales")) return true;
  if (t.includes("label values are per") && t.includes("g serving")) return true;
  if (t.includes("nutrition is per") && t.includes("g serving") && t.includes("scale")) return true;
  return false;
}
