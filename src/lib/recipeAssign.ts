import {
  listDailyMealPlansMap,
  saveDailyMealPlan,
  updateProfilePartial,
} from "@/firebase/userDoc";
import { resolveMealPlanForDate } from "@/lib/mealPlanResolve";
import type { MealSlotId, MealSlots, UserProfile, UserRecipe } from "@/types/profile";

export const ASSIGN_SLOT_LABELS: Record<MealSlotId, string> = {
  preMorning: "Pre-morning",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
  bedtimeTea: "Bedtime tea (fat loss)",
  nighttimeTea: "Evening tea",
};

const DONOR_SLOT_PRIORITY: MealSlotId[] = [
  "snacks",
  "drinks",
  "nighttimeTea",
  "bedtimeTea",
  "lunch",
  "dinner",
  "breakfast",
  "preMorning",
];

const MIN_SLOT_BUDGET_KCAL = 50;

function donorSlotsFor(target: MealSlotId): MealSlotId[] {
  return DONOR_SLOT_PRIORITY.filter((s) => s !== target);
}

export function computeSlotRedistribution(
  slotCalories: Record<MealSlotId, number>,
  target: MealSlotId,
  recipeCalories: number,
): { next: Record<MealSlotId, number>; lines: string[] } | null {
  const cap = slotCalories[target];
  if (recipeCalories <= cap) return { next: { ...slotCalories }, lines: [] };
  const overflow = recipeCalories - cap;
  const next = { ...slotCalories };
  next[target] = recipeCalories;
  const lines: string[] = [];
  let left = overflow;
  for (const d of donorSlotsFor(target)) {
    if (left <= 0) break;
    const before = next[d];
    const canGive = Math.max(0, before - MIN_SLOT_BUDGET_KCAL);
    const take = Math.min(left, canGive);
    if (take > 0) {
      next[d] = before - take;
      lines.push(`${ASSIGN_SLOT_LABELS[d]}: ${before} → ${next[d]} kcal`);
      left -= take;
    }
  }
  if (left > 0) return null;
  return { next, lines };
}

export type AssignRecipeResult = { ok: true } | { ok: false; message: string };

/**
 * Assigns a recipe to a meal slot for one calendar day (same behavior as Recipes tab +).
 */
export async function assignRecipeToMealPlan(params: {
  uid: string;
  profile: UserProfile;
  recipe: UserRecipe;
  planDate: string;
  assignSlot: MealSlotId;
}): Promise<AssignRecipeResult> {
  const { uid, profile, recipe, planDate, assignSlot } = params;
  const cap = profile.nutrition.slotCalories[assignSlot];
  let nextNutrition = profile.nutrition;

  if (recipe.calories > cap) {
    const plan = computeSlotRedistribution(profile.nutrition.slotCalories, assignSlot, recipe.calories);
    if (!plan) {
      return {
        ok: false,
        message: `Cannot fit "${recipe.name}" (${recipe.calories} kcal): other meal budgets cannot be reduced below ${MIN_SLOT_BUDGET_KCAL} kcal enough to cover the ${recipe.calories - cap} kcal overflow. Adjust targets on Plan or pick a smaller recipe.`,
      };
    }
    const detail =
      plan.lines.length > 0
        ? `\n\nWe will set ${ASSIGN_SLOT_LABELS[assignSlot]} to ${recipe.calories} kcal and reduce other slots by ${recipe.calories - cap} kcal total:\n${plan.lines.join("\n")}`
        : "";
    const ok = window.confirm(
      `"${recipe.name}" is ${recipe.calories} kcal; your ${ASSIGN_SLOT_LABELS[assignSlot]} budget is ${cap} kcal (${recipe.calories - cap} kcal over).${detail}\n\nApply this assignment and rebalance meal budgets?`,
    );
    if (!ok) return { ok: false, message: "Cancelled." };
    nextNutrition = { ...profile.nutrition, slotCalories: plan.next };
  }

  const programStart = profile.createdAt.slice(0, 10);
  const map = await listDailyMealPlansMap(uid);
  const resolved = resolveMealPlanForDate(planDate, programStart, profile.mealAssignments, map);
  const nextAssignments: MealSlots = {
    ...resolved.assignments,
    [assignSlot]: {
      recipeId: recipe.id,
      recipeName: recipe.name,
      calories: recipe.calories,
    },
  };

  await saveDailyMealPlan(uid, planDate, nextAssignments);
  if (nextNutrition !== profile.nutrition) {
    await updateProfilePartial(uid, { nutrition: nextNutrition });
  }
  return { ok: true };
}
