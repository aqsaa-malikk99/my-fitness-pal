import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { listCalculatorDay, listProgress, todayIso } from "@/firebase/userDoc";
import { stepsToKcalBurned, stepsNeededForKcalDeficit } from "@/lib/schedule";
import { tdeeEstimate } from "@/lib/nutrition";
import type { GoalDirection, MealSlotId } from "@/types/profile";

const SLOT_KEYS: MealSlotId[] = [
  "preMorning",
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "drinks",
  "bedtimeTea",
  "nighttimeTea",
];

export default function Dashboard() {
  const { profile, user, logout } = useAuth();
  const [consumed, setConsumed] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [weekBurned, setWeekBurned] = useState(0);

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
  const missingRecipes = SLOT_KEYS.filter((k) => !profile.mealAssignments[k]).length;

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
        <div className="metric-tile">
          <span className="metric-label">Food today</span>
          <span className="metric-value">
            {consumed}
            <small> / {n.dailyCalories}</small>
          </span>
          <span className="metric-sub">{eatSub}</span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Steps</span>
          <span className="metric-value">
            {todaySteps.toLocaleString()}
            <small> / {g.stepsGoal.toLocaleString()}</small>
          </span>
          <span className="metric-sub">~{stepsBurnToday} kcal from walking today (estimate)</span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Burn (7d steps)</span>
          <span className="metric-value">{weekBurned}</span>
          <span className="metric-sub">Estimated from steps you logged (7 days)</span>
        </div>
        <div className="metric-tile">
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
            Planned deficit about <strong>{plannedDeficit}</strong> kcal/day vs estimated maintenance (~{tdee} kcal).
            Your plan: <strong>{n.dailyCalories}</strong> kcal. Batch cooking:{" "}
            {n.batchCooking ? "you’re open to meal prep" : "flexible"}.
          </p>
        )}
        {goalDir === "gain" && (
          <p className="page-lead" style={{ marginTop: 0 }}>
            Planned surplus about <strong>{plannedSurplus}</strong> kcal/day vs estimated maintenance (~{tdee} kcal).
            Your plan: <strong>{n.dailyCalories}</strong> kcal. Batch cooking:{" "}
            {n.batchCooking ? "you’re open to meal prep" : "flexible"}.
          </p>
        )}
        {goalDir === "maintain" && (
          <p className="page-lead" style={{ marginTop: 0 }}>
            Intake is set near estimated maintenance (~{tdee} kcal). Plan: <strong>{n.dailyCalories}</strong> kcal. Batch
            cooking: {n.batchCooking ? "you’re open to meal prep" : "flexible"}.
          </p>
        )}
        <p className="page-lead" style={{ marginBottom: 0 }}>
          Recipes not chosen yet: <strong>{missingRecipes}</strong> / {SLOT_KEYS.length} meal slots · Deload week every{" "}
          <strong>{g.deloadEveryWeeks}</strong> weeks
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
        <h2>Goal check</h2>
        <p className={profile.goalSafety.safe ? "pill ok" : "pill bad"} style={{ marginBottom: "0.5rem" }}>
          {profile.goalSafety.safe ? "Timeline looks reasonable" : "Timeline is aggressive"}
        </p>
        <p className="page-lead" style={{ margin: 0 }}>
          {profile.goalSafety.message}
        </p>
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
