import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { listCalculatorDay, listProgress, todayIso } from "@/firebase/userDoc";
import { stepsToKcalBurned, stepsNeededForKcalDeficit } from "@/lib/schedule";
import { tdeeEstimate } from "@/lib/nutrition";
import type { MealSlotId } from "@/types/profile";

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
  const remainEat = n.dailyCalories - consumed;
  const stepsBurnToday = stepsToKcalBurned(todaySteps, profile.weightKg);
  const tdee = tdeeEstimate(profile.weightKg, profile.heightCm);
  const plannedDeficit = Math.max(0, tdee - n.dailyCalories);
  const over = consumed > n.dailyCalories ? consumed - n.dailyCalories : 0;
  const stepsToWalkOff = over > 0 ? stepsNeededForKcalDeficit(over, profile.weightKg) : 0;
  const missingRecipes = SLOT_KEYS.filter((k) => !profile.mealAssignments[k]).length;

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
          <h1 style={{ marginBottom: "0.15rem" }}>Hi, {profile.displayName}</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
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
          <span className="metric-label">Eat today</span>
          <span className="metric-value">
            {consumed}
            <small> / {n.dailyCalories}</small>
          </span>
          <span className="metric-sub">{remainEat >= 0 ? `${remainEat} kcal left` : `${-remainEat} kcal over`}</span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Steps</span>
          <span className="metric-value">
            {todaySteps.toLocaleString()}
            <small> / {g.stepsGoal.toLocaleString()}</small>
          </span>
          <span className="metric-sub">~{stepsBurnToday} kcal from steps today</span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Burn (7d steps)</span>
          <span className="metric-value">{weekBurned}</span>
          <span className="metric-sub">kcal est. from logged steps</span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Protein target</span>
          <span className="metric-value">{n.proteinG}g</span>
          <span className="metric-sub">
            Carbs ~{n.carbsG}g · Fat ~{n.fatG}g
          </span>
        </div>
      </div>

      {over > 0 && (
        <div className="card" style={{ borderColor: "var(--warn)" }}>
          <strong>Over daily calories</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>
            Roughly <strong>{stepsToWalkOff.toLocaleString()}</strong> extra steps to offset ~{over} kcal (estimate).
          </p>
        </div>
      )}

      <div className="card">
        <h2>Targets</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          Planned deficit ≈ <strong>{plannedDeficit}</strong> kcal/day (TDEE ~{tdee} − plan {n.dailyCalories}). Batch
          cooking: {n.batchCooking ? "on" : "flexible"}.
        </p>
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
          Meal slots not assigned: <strong>{missingRecipes}</strong> / {SLOT_KEYS.length} · Deload cadence: every{" "}
          {g.deloadEveryWeeks}w
          {deloadWeek ? <span className="pill warn" style={{ marginLeft: "0.35rem" }}>Deload window</span> : null}
        </p>
      </div>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Coaching notes</summary>
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
          {profile.expectations}
        </p>
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
          <strong>Avoid:</strong> {profile.mistakesToAvoid}
        </p>
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
          <strong>Quick wins:</strong> {profile.quickWins}
        </p>
      </details>

      <div className="card">
        <h2>Goal safety</h2>
        <p className={profile.goalSafety.safe ? "pill ok" : "pill bad"} style={{ marginBottom: "0.5rem" }}>
          {profile.goalSafety.safe ? "On track" : "Aggressive timeline"}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
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
