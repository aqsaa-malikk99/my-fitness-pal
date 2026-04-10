import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildGymPlanText } from "@/lib/nutrition";
import { stepsNeededForKcalDeficit } from "@/lib/schedule";

export default function PlanPage() {
  const { profile } = useAuth();
  const [selected, setSelected] = useState(() => new Date().getDay());

  const sched = profile?.weeklySchedule;
  const day = useMemo(() => sched?.find((d) => d.dayIndex === selected), [sched, selected]);

  if (!profile) return null;
  const g = profile.gym;
  const n = profile.nutrition;
  const stepsFor300Kcal = stepsNeededForKcalDeficit(300, profile.weightKg);

  return (
    <div className="app-shell">
      <h1>Weekly plan</h1>
      <p className="muted" style={{ fontSize: "0.88rem" }}>
        Tap a day for the full session outline. Uni days follow your onboarding choice ({g.uniDayMode.replace("_", " ")}).
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
        <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", fontSize: "0.88rem" }}>
          <li>
            After weights: <strong>{g.cardioAfterWeightsMin}–{g.cardioAfterWeightsMax}</strong> min easy cardio (cap),
            when lifting at the gym.
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
            Deload / easier week every <strong>{g.deloadEveryWeeks}</strong> weeks — reduce loads ~10–15% and keep
            technique crisp.
          </li>
          <li>
            Steps goal <strong>{g.stepsGoal.toLocaleString()}</strong>/day · Extra walking helps close small calorie
            gaps (~{stepsFor300Kcal} steps ≈ 300 kcal for your weight, rough).
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Calories & deficit</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          Plan intake <strong>{n.dailyCalories} kcal</strong> with <strong>{n.proteinG}g</strong> protein. Log food in
          Calc to see how today compares. Batch cooking: {n.batchCooking ? "recommended anchors" : "flexible"}.
        </p>
      </div>

      {profile.period?.enabled && (
        <div className="card">
          <h2>Cycle</h2>
          <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
            Tracking on · typical cycle {profile.period.cycleLengthDays} days
            {profile.period.lastPeriodStart ? ` · last start ${profile.period.lastPeriodStart}` : ""}. Lighten
            intensity when energy is low; keep protein and steps consistent.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Equipment & summary</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          {buildGymPlanText(g)}
        </p>
      </div>
    </div>
  );
}
