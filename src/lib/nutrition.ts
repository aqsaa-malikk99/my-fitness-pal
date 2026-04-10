import type { BodyType, GoalDirection, UserProfile } from "@/types/profile";

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
    return "Your BMI is below the usual healthy range. A gradual calorie surplus with strength training helps more than eating huge one-off meals.";
  if (category === "Normal range")
    return "Your BMI sits in a healthy band. You can lean, bulk, or maintain — pick the goal that matches how you want to feel and perform.";
  if (category === "Overweight")
    return "Your BMI is above the typical range for your height. A steady calorie deficit with plenty of protein and lifting usually works well.";
  return "Your BMI is in the obese range. Sustainable fat loss plus resistance training (and medical guidance when needed) is the safest path.";
}

export function inferGoalDirection(weightKg: number, targetKg: number): GoalDirection {
  if (targetKg < weightKg - 0.25) return "lose";
  if (targetKg > weightKg + 0.25) return "gain";
  return "maintain";
}

export function goalDirectionLabel(d: GoalDirection): string {
  switch (d) {
    case "lose":
      return "Lose weight";
    case "gain":
      return "Gain weight";
    case "maintain":
      return "Maintain";
    default:
      return d;
  }
}

/** Rough weekly loss cap (kg) for safety messaging */
export function maxSafeWeeklyLossKg(weightKg: number): number {
  const pct = weightKg * 0.01;
  return Math.min(1, Math.max(0.35, Math.round(pct * 20) / 20));
}

/** Conservative weekly gain cap (kg) for lean-ish gain */
export function maxSafeWeeklyGainKg(weightKg: number): number {
  const pct = weightKg * 0.005;
  return Math.min(0.5, Math.max(0.12, Math.round(pct * 20) / 20));
}

export type GoalSafetyResult = {
  safe: boolean;
  message: string;
  maxWeeklyLossKg: number;
  maxWeeklyGainKg: number;
  direction: GoalDirection;
};

export function evaluateGoalSafety(
  currentKg: number,
  targetKg: number,
  goalDateIso: string,
  direction: GoalDirection,
): GoalSafetyResult {
  const maxLoss = maxSafeWeeklyLossKg(currentKg);
  const maxGain = maxSafeWeeklyGainKg(currentKg);
  const end = new Date(goalDateIso);
  const now = new Date();
  const weeks = Math.max(1, (end.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));

  if (direction === "maintain") {
    return {
      safe: true,
      message:
        "Maintenance focus: keep calories near your activity level, hit protein, and let training drive recomposition over time.",
      maxWeeklyLossKg: maxLoss,
      maxWeeklyGainKg: maxGain,
      direction: "maintain",
    };
  }

  if (direction === "gain") {
    const toGain = targetKg - currentKg;
    if (toGain <= 0.05) {
      return {
        safe: true,
        message:
          "Your target is at or below your current weight. We will still set a modest calorie surplus to support strength and muscle — adjust target if you want a bigger bulk.",
        maxWeeklyLossKg: 0,
        maxWeeklyGainKg: maxGain,
        direction: "gain",
      };
    }
    const requiredWeekly = toGain / weeks;
    const safe = requiredWeekly <= maxGain + 0.05;
    const message = safe
      ? `Gaining about ${(requiredWeekly * 2.2).toFixed(1)} lb/week matches a steady pace for your timeline.`
      : `That timeline needs ~${(requiredWeekly * 2.2).toFixed(1)} lb/week, which is faster than the ~${(maxGain * 2.2).toFixed(1)} lb/week we suggest for a lean gain. Try a later date or a smaller target gain.`;
    return {
      safe,
      message,
      maxWeeklyLossKg: 0,
      maxWeeklyGainKg: maxGain,
      direction: "gain",
    };
  }

  // lose
  const toLose = currentKg - targetKg;
  if (toLose <= 0) {
    return {
      safe: true,
      message:
        "Your target is at or above your current weight. For fat loss, lower the target a bit or switch to “Gain weight” / “Maintain” in settings.",
      maxWeeklyLossKg: maxLoss,
      maxWeeklyGainKg: 0,
      direction: "lose",
    };
  }
  const requiredWeekly = toLose / weeks;
  const safe = requiredWeekly <= maxLoss + 0.05;
  const message = safe
    ? `Losing about ${(requiredWeekly * 2.2).toFixed(1)} lb/week fits a sustainable pace for your size.`
    : `That timeline needs ~${(requiredWeekly * 2.2).toFixed(1)} lb/week, which is steeper than the ~${(maxLoss * 2.2).toFixed(1)} lb/week upper range we use for safety. Extend the date, raise calories slightly, or adjust the target.`;
  return {
    safe,
    message,
    maxWeeklyLossKg: maxLoss,
    maxWeeklyGainKg: 0,
    direction: "lose",
  };
}

export function tdeeEstimate(weightKg: number, heightCm: number, age = 30, sex: "male" | "female" = "female"): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  return Math.round(bmr * 1.45);
}

export function deficitCaloriesForLoss(weeklyLossKg: number): number {
  return Math.round((weeklyLossKg * 7700) / 7);
}

export function surplusCaloriesForGain(weeklyGainKg: number): number {
  return Math.round((weeklyGainKg * 7700) / 7);
}

export function buildNutritionTargets(
  weightKg: number,
  heightCm: number,
  currentKg: number,
  targetKg: number,
  goalDateIso: string,
  bodyType: BodyType,
  batchCooking: boolean,
  goalDirection: GoalDirection,
): import("@/types/profile").NutritionTargets {
  const tdee = tdeeEstimate(weightKg, heightCm);
  const weeks = Math.max(
    4,
    (new Date(goalDateIso).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000),
  );

  const proteinBase =
    goalDirection === "gain"
      ? bodyType === "ectomorph"
        ? 2.1
        : 2.0
      : bodyType === "endomorph"
        ? 2.0
        : bodyType === "mesomorph"
          ? 1.9
          : 1.8;
  const proteinG = Math.round(weightKg * proteinBase);

  let daily: number;
  let mealTimingNote: string;

  if (goalDirection === "maintain") {
    daily = Math.round(tdee);
    mealTimingNote =
      "Keep intake steady day to day. Spread protein across meals; nudge carbs up slightly on hard training days.";
  } else if (goalDirection === "gain") {
    const toGain = Math.max(0, targetKg - currentKg);
    const maxG = maxSafeWeeklyGainKg(weightKg);
    const weeklyGain = Math.min(maxG, toGain > 0 ? toGain / weeks : 0.2);
    const surplus = surplusCaloriesForGain(weeklyGain);
    daily = Math.round(Math.min(tdee + 600, tdee + surplus));
    daily = Math.max(daily, tdee + 150);
    mealTimingNote =
      "Add calories around training — extra carbs after lifts, protein at every meal. Batch-cook dense snacks (Greek yogurt, rice, nut butter) so hitting the target is easier.";
  } else {
    const toLose = Math.max(0, currentKg - targetKg);
    const weeklyLoss = Math.min(maxSafeWeeklyLossKg(weightKg), toLose / weeks || 0.4);
    const deficit = deficitCaloriesForLoss(weeklyLoss);
    daily = Math.max(1200, tdee - deficit);
    mealTimingNote =
      "Hydrate early, anchor protein at breakfast, and put most carbs around training. Batch-cook 2–3 protein + carb bases mid-week.";
  }

  const fatG = Math.round((daily * 0.28) / 9);
  let carbsG = Math.round((daily - proteinG * 4 - fatG * 9) / 4);
  carbsG = Math.max(goalDirection === "gain" ? 100 : 80, carbsG);

  const slotCalories = splitMealCalories(daily);
  return {
    dailyCalories: daily,
    proteinG,
    carbsG,
    fatG,
    mealTimingNote,
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
    nighttimeTea: "Optional · anytime",
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

export function buildDashboardCopy(
  profile: Pick<UserProfile, "bmiCategory" | "foodLikes" | "gym" | "nutrition"> & {
    goalDirection?: GoalDirection;
  },
): {
  expectations: string;
  mistakesToAvoid: string;
  quickWins: string;
} {
  const { gym, nutrition, goalDirection } = profile;
  const g: GoalDirection = goalDirection ?? "lose";

  const expectations =
    g === "gain"
      ? `Aim for about ${nutrition.dailyCalories} kcal per day on average, ${nutrition.proteinG}g protein, and ${gym.daysPerWeek} strength sessions. The scale may jump with water and glycogen — trust the trend over a few weeks.`
      : g === "maintain"
        ? `Hold roughly ${nutrition.dailyCalories} kcal with ${nutrition.proteinG}g protein and ${gym.daysPerWeek} lifting days. Small day-to-day swings are normal; weekly averages tell the story.`
        : `Aim for ${nutrition.dailyCalories} kcal on average, ${nutrition.proteinG}g protein, and ${gym.daysPerWeek} strength sessions. Fat loss is rarely linear — expect a week or two of flat weight before a drop.`;

  const mistakesToAvoid =
    g === "gain"
      ? "Skipping vegetables entirely, relying only on shakes, avoiding the plan when the scale spikes once, and cutting sleep (recovery drives growth)."
      : g === "maintain"
        ? "Chronic under-eating on training days, all-or-nothing weekends, and changing everything at once instead of one habit at a time."
        : "Skipping protein, zero vegetables “until later”, all-or-nothing weekends, and trading sleep for extra cardio.";

  const quickWins =
    g === "gain"
      ? `Add one extra snack (~300 kcal) on training days, hit ${Math.round(nutrition.proteinG * 0.35)}g protein before 2pm, and keep sessions finishing before ${gym.windowEnd} on gym days.`
      : g === "maintain"
        ? `Match intake to hunger on rest vs training days, walk toward ${gym.stepsGoal.toLocaleString()} steps, and pre-log tomorrow’s lunch once this week.`
        : `Pre-log tomorrow’s breakfast, walk toward ${gym.stepsGoal.toLocaleString()} steps, hit ${Math.round(nutrition.proteinG * 0.35)}g protein before 2pm, and keep workouts finishing before ${gym.windowEnd} on gym days.`;

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
        : "Mixed home + gym — keep one anchor location for consistency.";
  const machines =
    gym.machines.length > 0 ? `Equipment focus: ${gym.machines.slice(0, 6).join(", ")}.` : "";
  return `${days}, preferred window ${window}. ${uni}${session}${deload}${loc} ${cardio} ${machines}`;
}

/** Short bullets for the plan summary card (easier to scan than a single paragraph). */
export function buildGymPlanBullets(gym: import("@/types/profile").GymPlan): string[] {
  const out: string[] = [];
  out.push(`${gym.daysPerWeek} training days per week`);
  out.push(`Preferred window: ${gym.windowStart}–${gym.windowEnd}`);
  if (gym.uniDayIndices?.length) {
    const names = gym.uniDayIndices.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ");
    out.push(`Lighter uni days: ${names} (${gym.uniDayMode.replace("_", " ")})`);
  }
  out.push(
    `Sessions ~${gym.sessionTotalMin ?? 38} min total (~${gym.warmupMin ?? 5} min warm-up); after lifting, ${gym.cardioAfterWeightsMin ?? 10}–${gym.cardioAfterWeightsMax ?? 15} min easy cardio`,
  );
  out.push(`Deload / easier week every ~${gym.deloadEveryWeeks ?? 4} weeks`);
  out.push(
    gym.likesCardio
      ? `Extra easy cardio budget ~${gym.cardioMinutesRecommended} min/week beyond post-lift finishers`
      : "Structured cardio optional — daily steps still count",
  );
  out.push(
    gym.location === "home"
      ? "Home setup: dumbbells, bands, bench when possible"
      : gym.location === "gym"
        ? "Gym: use your listed machines for steady progression"
        : "Mixed home + gym: pick one main location when you can",
  );
  if (gym.machines.length > 0) {
    out.push(`Equipment: ${gym.machines.slice(0, 8).join(", ")}`);
  }
  return out;
}
