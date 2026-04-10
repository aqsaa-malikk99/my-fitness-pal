import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import type { MealSlotAssignment, MealSlotId, MealSlots, UserRecipe } from "@/types/profile";
import { MEAL_SLOT_ORDER } from "@/lib/mealSlotOrder";
import { compareIso, formatMonthDay, localDateIso, maxIso, minIso } from "@/lib/dateIso";
import { resolveMealPlanForDate } from "@/lib/mealPlanResolve";
import { getDailyLog, listDailyMealPlansMap, listUserRecipes, saveDailyLog } from "@/firebase/userDoc";
import MealCalendarNav from "@/components/MealCalendarNav";
import RecipeDetailModal from "@/components/RecipeDetailModal";

/** Title case for card headings */
const labels: Record<MealSlotId, string> = {
  preMorning: "Pre morning",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
  bedtimeTea: "Bedtime tea",
  nighttimeTea: "Evening tea",
};

const ORDER = MEAL_SLOT_ORDER;

function macrosForSlotLog(assignment: MealSlotAssignment, recipe: UserRecipe | undefined) {
  const cal = assignment.calories;
  if (recipe && recipe.calories > 0) {
    const r = cal / recipe.calories;
    return {
      calories: cal,
      proteinG: Math.round(recipe.proteinG * r * 10) / 10,
      carbsG: Math.round(recipe.carbsG * r * 10) / 10,
      fatG: Math.round(recipe.fatG * r * 10) / 10,
    };
  }
  return { calories: cal, proteinG: 0, carbsG: 0, fatG: 0 };
}

/** Macros on this page follow **checked meal slots only** (not the Food log). */
function totalsFromCheckedSlotsOnly(
  slotDone: Partial<Record<MealSlotId, boolean>>,
  assignments: MealSlots,
  recipes: Map<string, UserRecipe>,
) {
  let k = 0;
  let p = 0;
  let c = 0;
  let f = 0;
  for (const slot of ORDER) {
    if (!slotDone[slot]) continue;
    const as = assignments[slot];
    if (!as) continue;
    const m = macrosForSlotLog(as, recipes.get(as.recipeId));
    k += m.calories;
    p += m.proteinG;
    c += m.carbsG;
    f += m.fatG;
  }
  return { kcal: k, proteinG: p, carbsG: c, fatG: f };
}

const SLOT_COLOR_CLASS: Record<MealSlotId, string> = {
  preMorning: "meal-slot--preMorning",
  breakfast: "meal-slot--breakfast",
  lunch: "meal-slot--lunch",
  dinner: "meal-slot--dinner",
  snacks: "meal-slot--snacks",
  drinks: "meal-slot--drinks",
  bedtimeTea: "meal-slot--bedtimeTea",
  nighttimeTea: "meal-slot--nighttimeTea",
};

function MacroBar({
  label,
  current,
  target,
  kind,
}: {
  label: string;
  current: number;
  target: number;
  kind: "protein" | "carbs" | "fat";
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="macro-bar-wrap">
      <div className="macro-bar-head">
        <span>{label}</span>
        <span>
          {Math.round(current)} / {target} g
        </span>
      </div>
      <div className="macro-bar-track">
        <div className={`macro-bar-fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MealsPage() {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [planMap, setPlanMap] = useState<Map<string, MealSlots>>(new Map());
  const [slotDone, setSlotDone] = useState<Partial<Record<MealSlotId, boolean>>>({});
  const [recipeById, setRecipeById] = useState<Map<string, UserRecipe>>(new Map());
  const [recipeModal, setRecipeModal] = useState<UserRecipe | null>(null);
  /** Local calendar “today”, refreshed so the tab stays correct across midnight and tab focus. */
  const [todayStr, setTodayStr] = useState(() => localDateIso());

  useEffect(() => {
    const sync = () => setTodayStr(localDateIso());
    sync();
    const id = setInterval(sync, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const selectedDate = useMemo(() => {
    const d = searchParams.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return todayStr;
  }, [searchParams, todayStr]);

  /** When opening Meals without `?date=`, put today’s local date in the URL so the day is explicit. */
  useEffect(() => {
    const d = searchParams.get("date");
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setSearchParams({ date: todayStr }, { replace: true });
    }
  }, [searchParams, setSearchParams, todayStr]);

  const programStart = profile?.createdAt.slice(0, 10) ?? localDateIso();
  /** Through goal date or today (whichever is later), never before program start. */
  const rangeEnd = profile
    ? maxIso(maxIso(profile.goalDate.slice(0, 10), todayStr), programStart)
    : todayStr;

  const loadPlans = useCallback(async () => {
    if (!user) return;
    const m = await listDailyMealPlansMap(user.uid);
    setPlanMap(m);
  }, [user]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!user) return;
    void listUserRecipes(user.uid).then((rows) => setRecipeById(new Map(rows.map((r) => [r.id, r]))));
  }, [user]);

  useEffect(() => {
    const onFocus = () => void loadPlans();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadPlans]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const log = await getDailyLog(user.uid, selectedDate);
    setSlotDone(log?.slotDone ?? {});
  }, [user, selectedDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resolved = useMemo(() => {
    if (!profile) {
      return {
        assignments: {} as MealSlots,
        isStored: false,
        inheritedFrom: null as string | null,
      };
    }
    return resolveMealPlanForDate(selectedDate, programStart, profile.mealAssignments, planMap);
  }, [selectedDate, programStart, profile, planMap]);

  const a = resolved.assignments;

  const overrideDates = useMemo(() => new Set(planMap.keys()), [planMap]);

  const setSelectedDate = useCallback(
    (iso: string) => {
      const clamped = minIso(maxIso(iso, programStart), rangeEnd);
      setSearchParams({ date: clamped });
    },
    [programStart, rangeEnd, setSearchParams],
  );

  const allChecked = useMemo(() => ORDER.every((s) => slotDone[s]), [slotDone]);

  const macroTotals = useMemo(
    () => totalsFromCheckedSlotsOnly(slotDone, resolved.assignments, recipeById),
    [slotDone, resolved.assignments, recipeById],
  );

  if (!profile || !user) return null;
  const n = profile.nutrition;

  async function toggle(slot: MealSlotId) {
    if (!user) return;
    if (compareIso(selectedDate, todayStr) > 0) return;

    const nextChecked = !slotDone[slot];
    const next = { ...slotDone, [slot]: nextChecked };
    setSlotDone(next);

    try {
      await saveDailyLog(user.uid, selectedDate, { slotDone: { [slot]: nextChecked } });
      await refresh();
    } catch {
      await refresh();
    }
  }

  const recipesLink = `/recipes?date=${encodeURIComponent(selectedDate)}`;

  const isFutureDay = compareIso(selectedDate, todayStr) > 0;

  return (
    <div className="app-shell">
      <h1 className="app-page-title">Meal</h1>
      <p className="page-lead">
        Plan window: <strong>{programStart}</strong> → <strong>{profile.goalDate.slice(0, 10)}</strong> · Food log and
        checkboxes are stored per day.
      </p>

      <div className="card meal-cal-card">
        <MealCalendarNav
          rangeStart={programStart}
          rangeEnd={rangeEnd}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          overrideDates={overrideDates}
          todayCalendar={todayStr}
        />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {selectedDate === todayStr ? "Today" : formatMonthDay(selectedDate)}{" "}
          <span className="muted" style={{ fontWeight: 500, fontSize: "0.88rem" }}>
            ({selectedDate})
          </span>
        </h2>
        {resolved.isStored && (
          <p className="meal-plan-banner meal-plan-banner--stored">
            This day has its own saved meal plan. Changes on Recipes apply only to this date.
          </p>
        )}
        {!resolved.isStored && resolved.inheritedFrom && (
          <p className="meal-plan-banner meal-plan-banner--inherit">
            Meals carried from <strong>{formatMonthDay(resolved.inheritedFrom)}</strong> ({resolved.inheritedFrom}). Assign
            recipes to save a separate plan for this day.
          </p>
        )}
        {!resolved.isStored && !resolved.inheritedFrom && (
          <p className="meal-plan-banner meal-plan-banner--default">
            Using your profile default meals. Assign recipes to start a day-specific plan chain.
          </p>
        )}

        {allChecked && (
          <div className="success-banner" style={{ marginBottom: "0.75rem" }}>
            All meal slots checked — solid day.
          </div>
        )}

        <h2>Macros</h2>
        <p className="page-lead" style={{ margin: "0 0 0.65rem" }}>
          From <strong>checked meals</strong> below: <strong>{Math.round(macroTotals.kcal)}</strong> kcal · Plan{" "}
          <strong>{n.dailyCalories}</strong> kcal
        </p>
        <MacroBar label="Protein" current={macroTotals.proteinG} target={n.proteinG} kind="protein" />
        <MacroBar label="Carbs" current={macroTotals.carbsG} target={n.carbsG} kind="carbs" />
        <MacroBar label="Fat" current={macroTotals.fatG} target={n.fatG} kind="fat" />
        <p className="page-lead" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
          These bars update only when you check off a meal slot. Food log entries on the Food log tab do not change this
          summary.
        </p>
      </div>

      <div className="card">
        <h2>Slots, timing, budgets & check-off</h2>
        <p className="page-lead" style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
          {n.mealTimingNote}
        </p>
        <div className="meal-slot-stack">
          {ORDER.map((slot) => {
            const hint = n.mealTimeHints[slot]?.trim() ?? "";
            const budget = n.slotCalories[slot];
            const assignment = a[slot];
            const planned = assignment?.calories ?? 0;
            const over = assignment && planned > budget;
            const showHydrationNote = slot === "preMorning" && hint.length > 0;
            const hintBody = hint.startsWith("@") ? hint.slice(1) : hint;
            const titleWithTime =
              slot === "preMorning"
                ? labels[slot]
                : slot === "nighttimeTea"
                  ? labels.nighttimeTea
                  : slot === "bedtimeTea"
                    ? hint
                      ? `${labels.bedtimeTea} @${hintBody}`
                      : labels.bedtimeTea
                    : hint
                      ? `${labels[slot]} @${hintBody}`
                      : labels[slot];

            return (
              <div key={slot} className={`meal-slot-card ${SLOT_COLOR_CLASS[slot]}`}>
                <div className="meal-slot-card__row">
                  <div className="meal-slot-card__main">
                    <div className="meal-slot-card__title">{titleWithTime}</div>
                    {slot === "bedtimeTea" && <p className="meal-slot-card__fatloss">For fat loss</p>}
                    {slot === "nighttimeTea" && (
                      <p className="meal-slot-card__optional-hint">{hint || "Optional · anytime"}</p>
                    )}
                    {assignment ? (
                      <>
                        <p className="meal-slot-card__recipe">{assignment.recipeName}</p>
                        {slot !== "preMorning" && (
                          <button
                            type="button"
                            className="meal-slot-card__tap"
                            aria-label="View recipe and ingredients"
                            onClick={() => {
                              const r = recipeById.get(assignment.recipeId);
                              if (r) setRecipeModal(r);
                              else {
                                window.alert(
                                  "Recipe details aren’t available yet. Open the Recipes tab once so your library can sync.",
                                );
                              }
                            }}
                          >
                            Tap to view recipe and ingredients
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="meal-slot-card__none">No recipe assigned — pick one in Recipes.</p>
                    )}
                    {showHydrationNote && (
                      <p className="meal-slot-card__warn" role="status">
                        <span className="meal-slot-card__warn-icon" aria-hidden>
                          ⚠️
                        </span>{" "}
                        {hint}
                      </p>
                    )}
                  </div>
                  <div className="meal-slot-card__aside">
                    <div
                      className={`meal-slot-card__pill${over ? " meal-slot-card__pill--over" : ""}`}
                      title="Planned calories from assigned recipe vs this slot’s budget"
                    >
                      {assignment ? planned : 0}/{budget} kcal
                    </div>
                    <input
                      type="checkbox"
                      className="meal-slot-card__round-check"
                      checked={!!slotDone[slot]}
                      disabled={isFutureDay}
                      title={
                        isFutureDay
                          ? "You can only check off meals for today or past days"
                          : "Mark this planned meal done — updates Macros above"
                      }
                      onChange={() => void toggle(slot)}
                      aria-label="Done with this meal slot"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Link to={recipesLink} className="btn btn-primary btn-block" style={{ textAlign: "center", textDecoration: "none" }}>
        Browse recipes & assign
      </Link>

      <RecipeDetailModal recipe={recipeModal} onClose={() => setRecipeModal(null)} />
    </div>
  );
}
