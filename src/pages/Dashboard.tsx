import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { listCalculatorDay, listDailyMealPlansMap, listProgress, todayIso } from "@/firebase/userDoc";
import { resolveMealPlanForDate } from "@/lib/mealPlanResolve";
import { stepsToKcalBurned, stepsNeededForKcalDeficit } from "@/lib/schedule";
import { tdeeEstimate } from "@/lib/nutrition";
import { MEAL_SLOT_ORDER } from "@/lib/mealSlotOrder";
import type { GoalDirection, MealSlotId } from "@/types/profile";

const SLOT_KEYS: MealSlotId[] = MEAL_SLOT_ORDER;

export default function Dashboard() {
  const { profile, user, logout } = useAuth();
  const [consumed, setConsumed] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [weekBurned, setWeekBurned] = useState(0);
  const [weightTrend, setWeightTrend] = useState<{ deltaKg: number; deltaBmi: number } | null>(null);
  const [missingRecipeSlots, setMissingRecipeSlots] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !profile) return;
    const d = todayIso();
    const items = await listCalculatorDay(user.uid, d);
    setConsumed(items.reduce((s, i) => s + i.calories, 0));
    const progressRows = await listProgress(user.uid, undefined, 90);
    const todayRow = progressRows.find((r) => r.date === d);
    setTodaySteps(todayRow?.steps ?? 0);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const cutoff = start.toISOString().slice(0, 10);
    let burn = 0;
    for (const r of progressRows) {
      if (r.date >= cutoff && r.steps && r.steps > 0) {
        burn += stepsToKcalBurned(r.steps, profile.weightKg);
      }
    }
    setWeekBurned(burn);

    const withW = progressRows
      .filter((r) => r.weightKg != null)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (withW.length >= 2) {
      const w0 = withW[0].weightKg!;
      const w1 = withW[1].weightKg!;
      const hM = profile.heightCm / 100;
      const bmi0 = w0 / (hM * hM);
      const bmi1 = w1 / (hM * hM);
      setWeightTrend({ deltaKg: w0 - w1, deltaBmi: bmi0 - bmi1 });
    } else {
      setWeightTrend(null);
    }

    const planMap = await listDailyMealPlansMap(user.uid);
    const resolved = resolveMealPlanForDate(d, profile.createdAt.slice(0, 10), profile.mealAssignments, planMap);
    setMissingRecipeSlots(SLOT_KEYS.filter((k) => !resolved.assignments[k]).length);
  }, [user, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!profile || !user) return null;

  const n = profile.nutrition;
  const g = profile.gym;
  const goalDir: GoalDirection = profile.goalDirection ?? "lose";
  const remainEat = n.dailyCalories - consumed;
  const stepsBurnToday = stepsToKcalBurned(todaySteps, profile.weightKg);
  const tdee = tdeeEstimate(profile.weightKg, profile.heightCm);
  const plannedDeficit = Math.max(0, tdee - n.dailyCalories);
  const plannedSurplus = Math.max(0, n.dailyCalories - tdee);
  const over = consumed > n.dailyCalories ? consumed - n.dailyCalories : 0;
  const stepsToWalkOff = over > 0 ? stepsNeededForKcalDeficit(over, profile.weightKg) : 0;
  const missingRecipes =
    missingRecipeSlots !== null
      ? missingRecipeSlots
      : SLOT_KEYS.filter((k) => !profile.mealAssignments[k]).length;
  const showRemainPrimary = goalDir !== "gain" && remainEat >= 0;

  const eatSub =
    goalDir === "gain"
      ? remainEat >= 0
        ? `${remainEat} kcal still to eat`
        : `${-remainEat} kcal over today’s target`
      : goalDir === "maintain"
        ? remainEat >= 0
          ? `${remainEat} kcal under target`
          : `${-remainEat} kcal over target`
        : remainEat >= 0
          ? `${remainEat} kcal left`
          : `${-remainEat} kcal over`;

  const deloadWeek = useMemo(() => {
    const start = new Date(profile.createdAt);
    const now = new Date();
    const weeks = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const every = g.deloadEveryWeeks || 4;
    return every > 0 && weeks > 0 && weeks % every === 0;
  }, [profile.createdAt, g.deloadEveryWeeks]);

  return (
    <div className="app-shell">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <p className="card-section-label" style={{ marginBottom: "0.35rem" }}>
            {goalDir === "gain" ? "Muscle & gain focus" : goalDir === "maintain" ? "Maintenance focus" : "Fat loss focus"}
          </p>
          <h1 className="app-page-title" style={{ marginBottom: "0.15rem" }}>
            Hi, {profile.displayName}
          </h1>
          <p className="page-lead" style={{ margin: 0 }}>
            BMI {profile.bmi} · {profile.bmiCategory}
            {weightTrend && (
              <span className="dash-trend" aria-live="polite">
                {" "}
                · Weight{" "}
                <span className={weightTrend.deltaKg <= 0 ? "dash-trend__down" : "dash-trend__up"}>
                  {weightTrend.deltaKg <= 0 ? "▼" : "▲"} {Math.abs(weightTrend.deltaKg).toFixed(1)} kg
                </span>{" "}
                vs last log · BMI{" "}
                <span className={weightTrend.deltaBmi <= 0 ? "dash-trend__down" : "dash-trend__up"}>
                  {weightTrend.deltaBmi <= 0 ? "▼" : "▲"} {Math.abs(weightTrend.deltaBmi).toFixed(2)}
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="row" style={{ gap: "0.35rem" }}>
          <Link to="/settings" className="btn btn-ghost" style={{ textDecoration: "none" }}>
            Profile
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-tile metric-tile--kcal">
          <span className="metric-label">Calories left</span>
          <span className="metric-value">
            {showRemainPrimary ? remainEat : consumed}
            <small> / {n.dailyCalories}</small>
          </span>
          <span className="metric-sub">
            {showRemainPrimary ? `${consumed} kcal eaten · ${eatSub}` : eatSub}
          </span>
        </div>
        <div className="metric-tile metric-tile--steps">
          <span className="metric-label">Steps</span>
          <span className="metric-value">
            {todaySteps.toLocaleString()}
            <small> / {g.stepsGoal.toLocaleString()}</small>
          </span>
          <span className="metric-sub">~{stepsBurnToday} kcal from walking today (estimate)</span>
        </div>
        <div className="metric-tile metric-tile--burn">
          <span className="metric-label">Burn (7d steps)</span>
          <span className="metric-value">{weekBurned}</span>
          <span className="metric-sub">Estimated from steps you logged (7 days)</span>
        </div>
        <div className="metric-tile metric-tile--protein">
          <span className="metric-label">Protein target</span>
          <span className="metric-value">{n.proteinG}g</span>
          <span className="metric-sub">
            Carbs ~{n.carbsG}g · Fat ~{n.fatG}g
          </span>
        </div>
      </div>

      {over > 0 && goalDir === "lose" && (
        <div className="card card--soft-warn">
          <h3 className="card-title-sm">Over today’s calorie target</h3>
          <p className="page-lead" style={{ margin: "0.35rem 0 0" }}>
            Roughly <strong>{stepsToWalkOff.toLocaleString()}</strong> extra steps would offset about {over} kcal — rough
            estimate only; one day does not undo your plan.
          </p>
        </div>
      )}
      {over > 0 && goalDir === "gain" && (
        <div className="card" style={{ borderColor: "var(--surface2)" }}>
          <h3 className="card-title-sm">Above today’s target</h3>
          <p className="page-lead" style={{ margin: "0.35rem 0 0" }}>
            On a gain phase, going over occasionally is normal. If it happens often, your targets may be low — check
            Settings.
          </p>
        </div>
      )}
      {over > 0 && goalDir === "maintain" && (
        <div className="card card--soft-warn">
          <h3 className="card-title-sm">Over today’s target</h3>
          <p className="page-lead" style={{ margin: "0.35rem 0 0" }}>
            Balance over the week matters more than one day. Extra walk optional — ~{stepsToWalkOff.toLocaleString()}{" "}
            steps ≈ {over} kcal (very rough).
          </p>
        </div>
      )}

      <div className="card">
        <h2>Energy & plan</h2>
        {goalDir === "lose" && (
          <p className="page-lead" style={{ marginTop: 0 }}>
            We estimate your body burns about <strong>{tdee} kcal</strong> per day if you stayed at the same activity
            level (maintenance). Your eating target is <strong>{n.dailyCalories} kcal</strong>, which leaves roughly a{" "}
            <strong>{plannedDeficit} kcal</strong> gap — that gap is your planned deficit for fat loss.
          </p>
        )}
        {goalDir === "gain" && (
          <p className="page-lead" style={{ marginTop: 0 }}>
            Maintenance is estimated around <strong>{tdee} kcal</strong>/day. Your target is{" "}
            <strong>{n.dailyCalories} kcal</strong>, about <strong>{plannedSurplus} kcal</strong> above that for a
            controlled surplus.
          </p>
        )}
        {goalDir === "maintain" && (
          <p className="page-lead" style={{ marginTop: 0 }}>
            Your target <strong>{n.dailyCalories} kcal</strong> is close to estimated maintenance (~{tdee} kcal) so
            weight stays steady while you keep habits consistent.
          </p>
        )}
        <p className="page-lead" style={{ marginBottom: "0.35rem" }}>
          Meal slots with a recipe chosen:{" "}
          <strong>
            {SLOT_KEYS.length - missingRecipes} / {SLOT_KEYS.length}
          </strong>
          {missingRecipes > 0 ? (
            <span className="pill bad" style={{ marginLeft: "0.35rem" }}>
              {missingRecipes} open
            </span>
          ) : (
            <span className="pill ok" style={{ marginLeft: "0.35rem" }}>
              All set
            </span>
          )}
        </p>
        <p className="page-lead" style={{ marginBottom: 0 }}>
          Deload week every <strong>{g.deloadEveryWeeks}</strong> weeks
          {deloadWeek ? <span className="pill warn" style={{ marginLeft: "0.35rem" }}>Deload window</span> : null}
        </p>
      </div>

      <details className="card">
        <summary className="details-summary">Coaching notes</summary>
        <ul className="coach-list">
          <li>
            <span className="coach-list-label">Expect</span> {profile.expectations}
          </li>
          <li>
            <span className="coach-list-label">Skip</span> {profile.mistakesToAvoid}
          </li>
          <li>
            <span className="coach-list-label">Try this week</span> {profile.quickWins}
          </li>
        </ul>
      </details>

      <div className="card">
        <h2>Weekly goals</h2>
        <p className={profile.goalSafety.safe ? "pill ok" : "pill bad"} style={{ marginBottom: "0.5rem" }}>
          {profile.goalSafety.safe ? "Timeline looks reasonable" : "Timeline is aggressive"}
        </p>
        <ul className="dash-bullet-list">
          {((): string[] => {
            const raw = profile.goalSafety.message.trim();
            const parts = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
            return parts.length ? parts : [raw];
          })().map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="row" style={{ gap: "0.5rem" }}>
        <Link to="/plan" className="btn btn-secondary btn-block" style={{ textAlign: "center", textDecoration: "none" }}>
          Weekly plan
        </Link>
        <Link to="/meals" className="btn btn-primary btn-block" style={{ textAlign: "center", textDecoration: "none" }}>
          Meals & check-in
        </Link>
      </div>
    </div>
  );
}
