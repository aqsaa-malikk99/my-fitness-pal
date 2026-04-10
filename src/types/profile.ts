export type BodyType = "ectomorph" | "mesomorph" | "endomorph" | "unsure";

/** Optional — used for copy and period defaults; older profiles may omit. */
export type Gender = "female" | "male" | "non_binary" | "prefer_not_say";

/** Primary nutrition goal — drives calorie target and in-app copy. */
export type GoalDirection = "lose" | "gain" | "maintain";

export type MealSlotId =
  | "preMorning"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snacks"
  | "drinks"
  | "bedtimeTea"
  | "nighttimeTea";

export interface MealSlotAssignment {
  recipeId: string;
  recipeName: string;
  calories: number;
}

export type MealSlots = Record<MealSlotId, MealSlotAssignment | null>;

/** Stored at users/{uid}/dailyMealPlans/{YYYY-MM-DD} — explicit plan for that day only. */
export interface DailyMealPlanDoc {
  date: string;
  mealAssignments: MealSlots;
  updatedAt: string;
}

export type UniDayMode = "home" | "evening_gym" | "rest";

export interface GymPlan {
  daysPerWeek: number;
  windowStart: string;
  windowEnd: string;
  eveningWindowStart?: string;
  eveningWindowEnd?: string;
  likesCardio: boolean;
  location: "home" | "gym" | "both";
  machines: string[];
  cardioMinutesRecommended: number;
  /** Minutes easy cardio after weights (lower bound) */
  cardioAfterWeightsMin: number;
  /** Minutes easy cardio after weights (upper bound) */
  cardioAfterWeightsMax: number;
  sessionTotalMin: number;
  warmupMin: number;
  /** Deload / easier week every N weeks */
  deloadEveryWeeks: number;
  /** 0 = Sunday … 6 = Saturday (matches Date.getDay()) */
  uniDayIndices: number[];
  uniDayMode: UniDayMode;
  stepsGoal: number;
}

export interface PlanDayBlock {
  title: string;
  minutes?: number;
}

export interface WeeklyPlanDay {
  dayIndex: number;
  label: string;
  location: "gym" | "home" | "rest";
  sessionMinutes: number;
  focus: string;
  blocks: PlanDayBlock[];
  cardioNote?: string;
}

export interface PeriodTracking {
  enabled: boolean;
  cycleLengthDays: number;
  lastPeriodStart?: string;
}

export interface NutritionTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealTimingNote: string;
  batchCooking: boolean;
  slotCalories: Record<MealSlotId, number>;
  /** Suggested clock windows per slot */
  mealTimeHints: Record<MealSlotId, string>;
}

export interface UserProfile {
  displayName: string;
  gender?: Gender;
  heightCm: number;
  weightKg: number;
  bodyType: BodyType;
  /** Target weight in kg */
  targetWeightKg: number;
  /** ISO date string goal deadline */
  goalDate: string;
  /** Lose, gain, or maintain — used for targets and messaging */
  goalDirection: GoalDirection;
  foodLikes: string;
  favoriteFoods: string;
  gym: GymPlan;
  nutrition: NutritionTargets;
  weeklySchedule: WeeklyPlanDay[];
  period?: PeriodTracking;
  /** Generated copy for dashboard */
  expectations: string;
  mistakesToAvoid: string;
  quickWins: string;
  bmi: number;
  bmiCategory: string;
  goalSafety: {
    safe: boolean;
    message: string;
    /** Sustainable weekly loss cap (kg/wk); used when losing */
    maxWeeklyLossKg: number;
    /** Sustainable weekly gain cap (kg/wk); used when gaining */
    maxWeeklyGainKg: number;
    direction: GoalDirection;
  };
  mealAssignments: MealSlots;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecipeTag =
  | "lunch"
  | "dinner"
  | "snacks"
  | "anti-inflammatory"
  | "batch"
  | "tea"
  | "original";

export interface CustomRecipe {
  id: string;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  mealTypes: MealSlotId[];
  tags?: RecipeTag[];
  sourceNote?: string;
  createdAt: string;
}

/** Stored at users/{uid}/recipes/{docId} — dataset import + user CRUD */
export interface UserRecipeDoc {
  origin: "dataset" | "user";
  sourceId?: number;
  name: string;
  category: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: string[];
  instructions: string;
  source?: string;
  mealTypes: MealSlotId[];
  tags?: RecipeTag[];
  createdAt: string;
  updatedAt: string;
}

export type UserRecipe = UserRecipeDoc & { id: string };

export interface ProgressEntry {
  id: string;
  date: string;
  weightKg?: number;
  armsCm?: number;
  waistCm?: number;
  hipsCm?: number;
  steps?: number;
  injuryNote?: string;
  notes?: string;
}

/** How a food-log row was created (for grouping and display). */
export type FoodLogEntryKind = "smart_portion" | "manual_meal" | "meal_slot";

export interface CalculatorEntry {
  id: string;
  date: string;
  label: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  /** Set when this row was created from checking off a meal slot on the Meals page */
  fromMealSlot?: MealSlotId;
  entryKind?: FoodLogEntryKind;
  /** User-tagged meal bucket (breakfast, lunch, snack, tea, …) */
  taggedMealSlot?: MealSlotId;
  ingredientsNote?: string;
  instructionsNote?: string;
  /** users/{uid}/recipes/{id} when this log was also saved as a user recipe */
  savedRecipeId?: string;
}

export interface DailyLogDoc {
  date: string;
  slotDone: Partial<Record<MealSlotId, boolean>>;
  updatedAt: string;
}
