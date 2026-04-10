import type { MealSlotId } from "@/types/profile";

/**
 * Single source of truth for meal-slot order in UI (Meals, Dashboard counts, assign dropdowns, profile merge).
 * Drinks sits after dinner and before bedtime tea.
 */
export const MEAL_SLOT_ORDER: MealSlotId[] = [
  "preMorning",
  "breakfast",
  "snacks",
  "lunch",
  "nighttimeTea",
  "dinner",
  "drinks",
  "bedtimeTea",
];
