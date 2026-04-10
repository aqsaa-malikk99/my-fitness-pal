import type { CalculatorEntry, FoodLogEntryKind, MealSlotId } from "@/types/profile";

/** UI labels for tagging a log entry to a meal type. */
export const FOOD_LOG_SLOT_LABELS: Record<MealSlotId, string> = {
  preMorning: "Pre-morning / hydration",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
  bedtimeTea: "Bedtime tea",
  nighttimeTea: "Evening tea",
};

/** `UserRecipeDoc.category` — matches Recipes filters. */
export function mealSlotToRecipeCategory(slot: MealSlotId): string {
  switch (slot) {
    case "preMorning":
      return "Drinks";
    case "breakfast":
      return "Breakfast";
    case "lunch":
      return "Lunch";
    case "dinner":
      return "Dinner";
    case "snacks":
      return "Snack";
    case "drinks":
      return "Drinks";
    case "bedtimeTea":
    case "nighttimeTea":
      return "Tea";
    default:
      return "Lunch";
  }
}

export function inferFoodLogEntryKind(e: CalculatorEntry): FoodLogEntryKind {
  if (e.fromMealSlot) return "meal_slot";
  if (e.entryKind) return e.entryKind;
  if (/\(\d+(\.\d+)? g eq\.\)/.test(e.label)) return "smart_portion";
  return "manual_meal";
}

export function splitIngredients(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
