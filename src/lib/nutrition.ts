import type { BodyType, UserProfile } from "@/types/profile";

export function computeBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0 || weightKg <= 0) return 0;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal range";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function bmiGuidance(bmi: number, category: string): string {
  if (bmi < 18.5)
    return "Your BMI is below the healthy range. Focus on gradual weight gain with nutrient-dense foods and strength training—not crash eating.";
  if (category === "Normal range")
    return "Your BMI is in a healthy range. Maintenance or recomposition (lose fat, keep muscle) is reasonable if that matches how you feel.";
  if (category === "Overweight")
    return "Your BMI suggests extra weight for height. A modest, sustainable deficit with high protein usually works well.";
  return "Your BMI is in the obese range. Steady, doctor-informed fat loss with resistance training and walking is the safest default.";
}

/** Rough weekly loss cap (kg) for safety messaging */
export function maxSafeWeeklyLossKg(weightKg: number): number {
  const pct = weightKg * 0.01;
  return Math.min(1, Math.max(0.35, Math.round(pct * 20) / 20));
}

export function evaluateGoalSafety(
  currentKg: number,
  targetKg: number,
  goalDateIso: string
): { safe: boolean; message: string; maxWeeklyLossKg: number } {
  const maxLoss = maxSafeWeeklyLossKg(currentKg);
  const end = new Date(goalDateIso);
  const now = new Date();
  const weeks = Math.max(1, (end.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const toLose = currentKg - targetKg;
  if (toLose <= 0) {
    return {
      safe: true,
      message: "Goal is maintenance or gain—timeline pressure is low. Still pick a realistic strength and habit plan.",
      maxWeeklyLossKg: maxLoss,
    };
  }
  const requiredWeekly = toLose / weeks;
  const safe = requiredWeekly <= maxLoss + 0.05;
  const message = safe
    ? `Losing about ${(requiredWeekly * 2.2).toFixed(1)} lb/week fits a sustainable pace for your size.`
    : `That timeline needs ~${(requiredWeekly * 2.2).toFixed(1)} lb/week, which is steeper than the ~${(maxLoss * 2.2).toFixed(1)} lb/week upper range we use for safety. Extend the date, raise calories slightly, or adjust the target.`;
  return { safe, message, maxWeeklyLossKg: maxLoss };
}

export function tdeeEstimate(weightKg: number, heightCm: number, age = 30, sex: "male" | "female" = "female"): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  return Math.round(bmr * 1.45);
}

export function deficitCaloriesForLoss(weeklyLossKg: number): number {
  return Math.round((weeklyLossKg * 7700) / 7);
}

export function buildNutritionTargets(
  weightKg: number,
  heightCm: number,
  currentKg: number,
  targetKg: number,
  goalDateIso: string,
  bodyType: BodyType,
  batchCooking: boolean
): import("@/types/profile").NutritionTargets {
  const tdee = tdeeEstimate(weightKg, heightCm);
  const weeks = Math.max(
    4,
    (new Date(goalDateIso).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
  );
  const toLose = Math.max(0, currentKg - targetKg);
  const weeklyLoss = Math.min(maxSafeWeeklyLossKg(weightKg), toLose / weeks || 0.4);
  const deficit = deficitCaloriesForLoss(weeklyLoss);
  const daily = Math.max(1200, tdee - deficit);
  const proteinBase = bodyType === "endomorph" ? 2.0 : bodyType === "mesomorph" ? 1.9 : 1.8;
  const proteinG = Math.round(weightKg * proteinBase);
  const fatG = Math.round((daily * 0.28) / 9);
  const carbsG = Math.round((daily - proteinG * 4 - fatG * 9) / 4);
  const slotCalories = splitMealCalories(daily);
  return {
    dailyCalories: daily,
    proteinG,
    carbsG: Math.max(80, carbsG),
    fatG,
    mealTimingNote:
      "Pre-morning hydration + protein anchor. Cluster carbs around training. Batch cook 2–3 anchors mid-week.",
    batchCooking,
    slotCalories,
    mealTimeHints: defaultMealTimeHints(),
  };
}

export function defaultMealTimeHints(): Record<import("@/types/profile").MealSlotId, string> {
  return {
    preMorning: "Upon waking — water + electrolytes",
    breakfast: "08:00–09:30",
    lunch: "12:30–14:00",
    dinner: "18:30–20:00",
    snacks: "10:30 or 15:30",
    drinks: "Through the day",
    bedtimeTea: "21:00–21:30",
    nighttimeTea: "22:00 (caffeine-free)",
  };
}

export function splitMealCalories(daily: number): Record<import("@/types/profile").MealSlotId, number> {
  return {
    preMorning: Math.round(daily * 0.04),
    breakfast: Math.round(daily * 0.2),
    lunch: Math.round(daily * 0.26),
    dinner: Math.round(daily * 0.28),
    snacks: Math.round(daily * 0.1),
    drinks: Math.round(daily * 0.05),
    bedtimeTea: Math.round(daily * 0.035),
    nighttimeTea: Math.round(daily * 0.035),
  };
}

export function buildDashboardCopy(profile: Pick<UserProfile, "bmiCategory" | "foodLikes" | "gym" | "nutrition">): {
  expectations: string;
  mistakesToAvoid: string;
  quickWins: string;
} {
  const { gym, nutrition } = profile;
  const expectations = `Aim for ${nutrition.dailyCalories} kcal on average, ${nutrition.proteinG}g protein, and ${gym.daysPerWeek} strength sessions. Fat loss is rarely linear—expect 2–3 weeks of flat scale before a whoosh.`;
  const mistakesToAvoid =
    "Skipping protein, zero vegetables 'until later', all-or-nothing weekends, and replacing food sleep with extra cardio.";
  const quickWins = `Pre-log tomorrow's breakfast, walk 8k steps, hit ${Math.round(nutrition.proteinG * 0.35)}g protein before 2pm, and keep workouts under ${gym.windowEnd} on gym days.`;
  return { expectations, mistakesToAvoid, quickWins };
}

export function buildGymPlanText(gym: import("@/types/profile").GymPlan): string {
  const days = `${gym.daysPerWeek}×/week`;
  const window = `${gym.windowStart}–${gym.windowEnd}`;
  const uni =
    gym.uniDayIndices?.length && gym.uniDayIndices.length > 0
      ? `Uni/light days: ${gym.uniDayIndices.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")} (${gym.uniDayMode}). `
      : "";
  const session = `Sessions ~${gym.sessionTotalMin ?? 38} min including ~${gym.warmupMin ?? 5} min warm-up; after weights aim ${gym.cardioAfterWeightsMin ?? 10}–${gym.cardioAfterWeightsMax ?? 15} min easy cardio. `;
  const deload = `Deload / easier week every ~${gym.deloadEveryWeeks ?? 4} weeks. `;
  const cardio = gym.likesCardio
    ? `Weekly easy cardio budget ~${gym.cardioMinutesRecommended} min total beyond post-lift finishers.`
    : "Structured cardio optional — steps still matter.";
  const loc =
    gym.location === "home"
      ? "Home setup — prioritize dumbbells, bands, and a bench if possible."
      : gym.location === "gym"
        ? "Gym access — use compound machines you listed for repeatable progression."
        : "Mixed home + gym — keep one 'anchor' workout location for consistency.";
  const machines =
    gym.machines.length > 0 ? `Equipment focus: ${gym.machines.slice(0, 6).join(", ")}.` : "";
  return `${days}, preferred window ${window}. ${uni}${session}${deload}${loc} ${cardio} ${machines}`;
}
