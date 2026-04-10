import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildGymPlanText } from "@/lib/nutrition";
import { stepsNeededForKcalDeficit } from "@/lib/schedule";
import type { GoalDirection } from "@/types/profile";

export default function PlanPage() {
  const { profile } = useAuth();
  const [selected, setSelected] = useState(() => new Date().getDay());

  const sched = profile?.weeklySchedule;
  const day = useMemo(() => sched?.find((d) => d.dayIndex === selected), [sched, selected]);

  if (!profile) return null;
  const g = profile.gym;
  const n = profile.nutrition;
  const goalDir: GoalDirection = profile.goalDirection ?? "lose";
  const stepsFor300Kcal = stepsNeededForKcalDeficit(300, profile.weightKg);

  return (
    <div className="app-shell">
      <h1 className="app-page-title">Weekly plan</h1>
      <p className="page-lead">
        Pick a day for the session outline. Lighter “uni” days follow what you chose in onboarding (
        {g.uniDayMode.replace("_", " ")}).
      </p>

      <div className="week-strip">
        {(sched ?? []).map((d) => (
          <button
            key={d.dayIndex}
            type="button"
            className={`week-pill${selected === d.dayIndex ? " active" : ""}`}
            onClick={() => setSelected(d.dayIndex)}
          >
            {d.label.slice(0, 3)}
            <span className="tiny">{d.location}</span>
          </button>
        ))}
      </div>

      {day && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <h2 style={{ margin: 0 }}>{day.label}</h2>
            <span className="pill">{day.location}</span>
          </div>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
            <strong>{day.focus}</strong>
          </p>
          {day.sessionMinutes > 0 && (
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
              Target block ~{day.sessionMinutes} min · Warm-up {g.warmupMin} min included in template
            </p>
          )}
          <ol style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", fontSize: "0.88rem" }}>
            {day.blocks.map((b, i) => (
              <li key={i} style={{ marginBottom: "0.35rem" }}>
                {b.title}
                {b.minutes != null ? ` · ~${b.minutes} min` : ""}
              </li>
            ))}
          </ol>
          {day.cardioNote && (
            <p className="muted" style={{ margin: "0.65rem 0 0", fontSize: "0.82rem" }}>
              {day.cardioNote}
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h2>Session rules</h2>
        <ul className="coach-list coach-list--tight">
          <li>
            After weights: <strong>{g.cardioAfterWeightsMin}–{g.cardioAfterWeightsMax}</strong> min easy cardio when you
            lift.
          </li>
          <li>
            Main window <strong>{g.windowStart}</strong>–<strong>{g.windowEnd}</strong>
            {g.uniDayMode === "evening_gym" && (
              <>
                {" "}
                · Evening option <strong>{g.eveningWindowStart}</strong>–<strong>{g.eveningWindowEnd}</strong>
              </>
            )}
          </li>
          <li>
            Deload / easier week every <strong>{g.deloadEveryWeeks}</strong> weeks — drop loads ~10–15%, keep reps clean.
          </li>
          <li>
            Steps goal <strong>{g.stepsGoal.toLocaleString()}</strong>/day · About{" "}
            <strong>{stepsFor300Kcal}</strong> steps ≈ 300 kcal for your weight (very rough).
            {goalDir === "lose" || goalDir === "maintain"
              ? " Walking helps close small calorie gaps."
              : " Movement still supports appetite and recovery on a bulk."}
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>{goalDir === "gain" ? "Calories & surplus" : goalDir === "maintain" ? "Calories & balance" : "Calories & deficit"}</h2>
        <p className="page-lead" style={{ margin: 0 }}>
          Daily target <strong>{n.dailyCalories} kcal</strong>, protein <strong>{n.proteinG}g</strong>. Log meals in{" "}
          <strong>Calc</strong> to compare to the plan. Batch cooking:{" "}
          {n.batchCooking ? "you like repeatable anchors" : "stay flexible"}.
        </p>
      </div>

      {profile.period?.enabled && (
        <div className="card">
          <h2>Cycle</h2>
          <p className="page-lead" style={{ margin: 0 }}>
            Tracking on · typical cycle {profile.period.cycleLengthDays} days
            {profile.period.lastPeriodStart ? ` · last start ${profile.period.lastPeriodStart}` : ""}. When energy is
            low, ease intensity — keep protein and daily movement steady.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Equipment & summary</h2>
        <p className="page-lead" style={{ margin: 0 }}>
          {buildGymPlanText(g)}
        </p>
      </div>
    </div>
  );
}
