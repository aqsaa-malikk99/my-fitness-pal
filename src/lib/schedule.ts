import type { GymPlan, PlanDayBlock, WeeklyPlanDay } from "@/types/profile";

const DOW_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FOCUS_ROTATION = [
  "Chest & shoulders",
  "Legs & core",
  "Back & biceps",
  "Shoulders & arms",
  "Glutes & hamstrings",
];

function isUniDay(dow: number, uni: number[]): boolean {
  return uni.includes(dow);
}

export function buildWeeklySchedule(gym: GymPlan): WeeklyPlanDay[] {
  const uni = gym.uniDayIndices?.length ? gym.uniDayIndices : [];
  const mode = gym.uniDayMode ?? "home";
  const days = gym.daysPerWeek;
  const warmup = gym.warmupMin ?? 5;
  const total = gym.sessionTotalMin ?? 38;
  const cMin = gym.cardioAfterWeightsMin ?? 10;
  const cMax = gym.cardioAfterWeightsMax ?? 15;

  const nonUni: number[] = [];
  for (let d = 0; d < 7; d++) {
    if (!isUniDay(d, uni)) nonUni.push(d);
  }
  const preferOrder = [1, 2, 3, 4, 5, 6, 0];
  const nonUniOrdered = preferOrder.filter((d) => nonUni.includes(d));

  const gymDays = new Set<number>();
  for (let i = 0; i < Math.min(days, nonUniOrdered.length); i++) {
    gymDays.add(nonUniOrdered[i]);
  }

  let focusIdx = 0;
  const out: WeeklyPlanDay[] = [];

  for (let dow = 0; dow < 7; dow++) {
    const label = DOW_LABEL[dow];
    if (isUniDay(dow, uni)) {
      let location: WeeklyPlanDay["location"] = "rest";
      let focus = "Uni day — lighter load";
      const blocks: PlanDayBlock[] = [];
      if (mode === "home") {
        location = "home";
        focus = "Home / mobility (no gym)";
        blocks.push(
          { title: "Walk or easy movement", minutes: 20 },
          { title: "Bands or bodyweight circuit", minutes: 20 },
          { title: "Protein target + hydration", minutes: undefined }
        );
      } else if (mode === "evening_gym") {
        location = "gym";
        focus = "Evening gym — shorter session";
        blocks.push(
          { title: `Warm-up`, minutes: warmup },
          { title: "Upper or lower maintenance", minutes: Math.max(15, total - warmup - cMax - 5) },
          { title: `Easy cardio after weights`, minutes: cMax }
        );
      } else {
        blocks.push(
          { title: "Active recovery / steps", minutes: undefined },
          { title: "Optional: stretching", minutes: 15 }
        );
      }
      out.push({
        dayIndex: dow,
        label,
        location,
        sessionMinutes: mode === "rest" ? 0 : mode === "home" ? Math.min(total, 35) : total,
        focus,
        blocks,
        cardioNote:
          mode === "evening_gym"
            ? `After weights: ${cMin}–${cMax} min easy cardio.`
            : "No structured post-lift cardio — keep daily steps.",
      });
      continue;
    }

    if (gymDays.has(dow)) {
      const focusName = FOCUS_ROTATION[focusIdx % FOCUS_ROTATION.length];
      focusIdx += 1;
      const mainMin = Math.max(12, total - warmup - cMax);
      const blocks: PlanDayBlock[] = [
        { title: "Warm-up + activation", minutes: warmup },
        { title: `${focusName} — compounds + accessories`, minutes: mainMin },
        { title: `Finisher cardio (after weights)`, minutes: cMax },
      ];
      out.push({
        dayIndex: dow,
        label,
        location: "gym",
        sessionMinutes: total,
        focus: focusName,
        blocks,
        cardioNote: `Keep cardio after lifting: about ${cMin}–${cMax} minutes easy.`,
      });
    } else {
      out.push({
        dayIndex: dow,
        label,
        location: "rest",
        sessionMinutes: 0,
        focus: "Recovery / walking",
        blocks: [{ title: "Walk + protein + sleep", minutes: undefined }],
        cardioNote: "Light movement only.",
      });
    }
  }

  return out;
}

export function stepsToKcalBurned(steps: number, weightKg: number): number {
  if (steps <= 0 || weightKg <= 0) return 0;
  const perStep = 0.00045 * weightKg + 0.02;
  return Math.round(steps * perStep);
}

export function stepsNeededForKcalDeficit(kcal: number, weightKg: number): number {
  if (kcal <= 0 || weightKg <= 0) return 0;
  const perStep = 0.00045 * weightKg + 0.02;
  return Math.ceil(kcal / perStep);
}
