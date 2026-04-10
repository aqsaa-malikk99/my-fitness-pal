import { buildWeeklySchedule } from "@/lib/schedule";
import type { GymPlan, MealSlots, MealSlotId, NutritionTargets, UserProfile } from "@/types/profile";
import { defaultMealTimeHints, splitMealCalories } from "@/lib/nutrition";

const ALL_SLOTS: MealSlotId[] = [
  "preMorning",
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "drinks",
  "bedtimeTea",
  "nighttimeTea",
];

export function emptyMealSlots(): MealSlots {
  return {
    preMorning: null,
    breakfast: null,
    lunch: null,
    dinner: null,
    snacks: null,
    drinks: null,
    bedtimeTea: null,
    nighttimeTea: null,
  };
}

function mergeGym(g: Partial<GymPlan> | undefined): GymPlan {
  const base: GymPlan = {
    daysPerWeek: 3,
    windowStart: "12:00",
    windowEnd: "13:30",
    eveningWindowStart: "18:00",
    eveningWindowEnd: "20:00",
    likesCardio: true,
    location: "gym",
    machines: [],
    cardioMinutesRecommended: 20,
    cardioAfterWeightsMin: 10,
    cardioAfterWeightsMax: 15,
    sessionTotalMin: 38,
    warmupMin: 5,
    deloadEveryWeeks: 4,
    uniDayIndices: [],
    uniDayMode: "home",
    stepsGoal: 10000,
  };
  if (!g) return base;
  return {
    ...base,
    ...g,
    machines: Array.isArray(g.machines) ? g.machines : base.machines,
    uniDayIndices: Array.isArray(g.uniDayIndices) ? g.uniDayIndices : base.uniDayIndices,
  };
}

function mergeNutrition(n: Partial<NutritionTargets> | undefined, daily: number): NutritionTargets {
  const slots = splitMealCalories(daily);
  const base: NutritionTargets = {
    dailyCalories: daily,
    proteinG: 120,
    carbsG: 150,
    fatG: 55,
    mealTimingNote:
      "Anchor protein early; cluster most carbs around training. Batch cook 2–3 proteins + carbs on Sunday.",
    batchCooking: true,
    slotCalories: slots,
    mealTimeHints: defaultMealTimeHints(),
  };
  if (!n) return base;
  const dc = n.dailyCalories ?? daily;
  const mergedSlots = { ...splitMealCalories(dc), ...n.slotCalories };
  for (const k of ALL_SLOTS) {
    if (mergedSlots[k] == null) mergedSlots[k] = splitMealCalories(dc)[k];
  }
  return {
    ...base,
    ...n,
    dailyCalories: dc,
    slotCalories: mergedSlots as Record<MealSlotId, number>,
    mealTimeHints: { ...defaultMealTimeHints(), ...n.mealTimeHints },
  };
}

function mergeMealAssignments(m: Partial<MealSlots> | undefined): MealSlots {
  const e = emptyMealSlots();
  if (!m) return e;
  const out = { ...e };
  for (const k of ALL_SLOTS) {
    out[k] = m[k] ?? null;
  }
  return out;
}

export function migrateProfile(raw: UserProfile): UserProfile {
  const gym = mergeGym(raw.gym);
  const nutrition = mergeNutrition(raw.nutrition, raw.nutrition?.dailyCalories ?? 1800);
  const mealAssignments = mergeMealAssignments(raw.mealAssignments);
  const weeklySchedule =
    raw.weeklySchedule?.length === 7 ? raw.weeklySchedule : buildWeeklySchedule(gym);
  return {
    ...raw,
    gym,
    nutrition,
    mealAssignments,
    weeklySchedule,
  };
}
