import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildGymPlanBullets, tdeeEstimate } from "@/lib/nutrition";
import { focusEmoji } from "@/lib/planUi";
import { stepsNeededForKcalDeficit } from "@/lib/schedule";
import type { GoalDirection } from "@/types/profile";

type RuleTab = "windows" | "cardio" | "steps";

export default function PlanPage() {
  const { profile } = useAuth();
  const [selected, setSelected] = useState(() => new Date().getDay());
  const [ruleTab, setRuleTab] = useState<RuleTab>("windows");
  const [nutritionTab, setNutritionTab] = useState<"targets" | "cycle">("targets");

  const sched = profile?.weeklySchedule;
  const day = useMemo(() => sched?.find((d) => d.dayIndex === selected), [sched, selected]);

  if (!profile) return null;
  const g = profile.gym;
  const n = profile.nutrition;
  const goalDir: GoalDirection = profile.goalDirection ?? "lose";
  const stepsFor300Kcal = stepsNeededForKcalDeficit(300, profile.weightKg);
  const summaryBullets = buildGymPlanBullets(g);
  const tdeeLine = tdeeEstimate(profile.weightKg, profile.heightCm);
  const plannedDeficit = Math.max(0, tdeeLine - n.dailyCalories);
  const plannedSurplus = Math.max(0, n.dailyCalories - tdeeLine);

  return (
    <div className="app-shell">
      <h1 className="app-page-title">Weekly plan</h1>
      <p className="page-lead">
        Tap a day — gym days are blue, home / rest / mobility are red. Emoji hints match the session focus.
      </p>

      <div className="week-strip week-strip--equal">
        {(sched ?? []).map((d) => {
          const gym = d.location === "gym";
          return (
            <button
              key={d.dayIndex}
              type="button"
              className={`week-pill week-pill--equal${selected === d.dayIndex ? " active" : ""}${gym ? " week-pill--gym" : " week-pill--home"}`}
              onClick={() => setSelected(d.dayIndex)}
            >
              {d.label.slice(0, 3)}
              <span className="tiny">{d.location}</span>
            </button>
          );
        })}
      </div>

      {day && (
        <div className={`card plan-day-card plan-day-card--${day.location === "gym" ? "gym" : "home"}`}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.35rem", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>
              <span className="plan-day-emoji" aria-hidden>
                {focusEmoji(day)}
              </span>{" "}
              {day.label}
            </h2>
            <span className={`pill ${day.location === "gym" ? "pill--gym" : "pill--home"}`}>{day.location}</span>
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
        <div className="micro-tabs" role="tablist" aria-label="Session rules">
          {(
            [
              { id: "windows" as const, label: "Windows", tone: "tab-a" },
              { id: "cardio" as const, label: "After weights", tone: "tab-b" },
              { id: "steps" as const, label: "Steps & deload", tone: "tab-c" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={ruleTab === t.id}
              className={`micro-tab micro-tab--${t.tone}${ruleTab === t.id ? " micro-tab--active" : ""}`}
              onClick={() => setRuleTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="micro-tab-panel">
          {ruleTab === "windows" && (
            <ul className="coach-list coach-list--tight" style={{ marginTop: "0.5rem" }}>
              <li>
                Main training window <strong>{g.windowStart}</strong>–<strong>{g.windowEnd}</strong>
              </li>
              {g.uniDayMode === "evening_gym" && (
                <li>
                  Evening option <strong>{g.eveningWindowStart}</strong>–<strong>{g.eveningWindowEnd}</strong>
                </li>
              )}
              <li>
                Lighter “uni” days follow <strong>{g.uniDayMode.replace("_", " ")}</strong>
              </li>
            </ul>
          )}
          {ruleTab === "cardio" && (
            <ul className="coach-list coach-list--tight" style={{ marginTop: "0.5rem" }}>
              <li>
                After weights: <strong>{g.cardioAfterWeightsMin}–{g.cardioAfterWeightsMax}</strong> min easy cardio when you
                lift.
              </li>
              <li>Keep it conversational pace — not a second leg day.</li>
            </ul>
          )}
          {ruleTab === "steps" && (
            <ul className="coach-list coach-list--tight" style={{ marginTop: "0.5rem" }}>
              <li>
                Steps goal <strong>{g.stepsGoal.toLocaleString()}</strong>/day · About{" "}
                <strong>{stepsFor300Kcal}</strong> steps ≈ 300 kcal for your weight (rough).
              </li>
              <li>
                Deload / easier week every <strong>{g.deloadEveryWeeks}</strong> weeks — drop loads ~10–15%, keep reps
                clean.
              </li>
              <li>
                {goalDir === "lose" || goalDir === "maintain"
                  ? "Walking helps close small calorie gaps."
                  : "Movement still supports appetite and recovery on a bulk."}
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "0.5rem" }}>Calories & cycle</h2>
        {profile.period?.enabled ? (
          <>
            <div className="micro-tabs" role="tablist" aria-label="Nutrition and cycle">
              <button
                type="button"
                role="tab"
                aria-selected={nutritionTab === "targets"}
                className={`micro-tab micro-tab--nut${nutritionTab === "targets" ? " micro-tab--active" : ""}`}
                onClick={() => setNutritionTab("targets")}
              >
                Calories
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={nutritionTab === "cycle"}
                className={`micro-tab micro-tab--cyc${nutritionTab === "cycle" ? " micro-tab--active" : ""}`}
                onClick={() => setNutritionTab("cycle")}
              >
                Cycle
              </button>
            </div>
            <div className="micro-tab-panel">
              {nutritionTab === "targets" && (
                <div style={{ marginTop: "0.5rem" }}>
                  {goalDir === "lose" && (
                    <p className="page-lead" style={{ margin: 0 }}>
                      Rough maintenance ~<strong>{tdeeLine}</strong> kcal/day · Target{" "}
                      <strong>{n.dailyCalories}</strong> kcal · Planned gap ~<strong>{plannedDeficit}</strong> kcal/day ·
                      Protein <strong>{n.proteinG}g</strong>. Log meals in <strong>Food log</strong> to stay close to the
                      plan.
                    </p>
                  )}
                  {goalDir === "gain" && (
                    <p className="page-lead" style={{ margin: 0 }}>
                      Rough maintenance ~<strong>{tdeeLine}</strong> kcal/day · Target <strong>{n.dailyCalories}</strong>{" "}
                      kcal (~<strong>{plannedSurplus}</strong> kcal above) · Protein <strong>{n.proteinG}g</strong>.
                    </p>
                  )}
                  {goalDir === "maintain" && (
                    <p className="page-lead" style={{ margin: 0 }}>
                      Target <strong>{n.dailyCalories}</strong> kcal near maintenance (~{tdeeLine}) · Protein{" "}
                      <strong>{n.proteinG}g</strong>.
                    </p>
                  )}
                </div>
              )}
              {nutritionTab === "cycle" && (
                <p className="page-lead" style={{ margin: "0.5rem 0 0" }}>
                  Tracking on · typical cycle {profile.period!.cycleLengthDays} days
                  {profile.period!.lastPeriodStart ? ` · last start ${profile.period!.lastPeriodStart}` : ""}. When
                  energy is low, ease intensity — keep protein and daily movement steady.
                </p>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginTop: "0.25rem" }}>
            {goalDir === "lose" && (
              <p className="page-lead" style={{ margin: 0 }}>
                Rough maintenance ~<strong>{tdeeLine}</strong> kcal/day · Target <strong>{n.dailyCalories}</strong> kcal ·
                Planned gap ~<strong>{plannedDeficit}</strong> kcal/day · Protein <strong>{n.proteinG}g</strong>. Log meals
                in <strong>Food log</strong> to stay close to the plan.
              </p>
            )}
            {goalDir === "gain" && (
              <p className="page-lead" style={{ margin: 0 }}>
                Rough maintenance ~<strong>{tdeeLine}</strong> kcal/day · Target <strong>{n.dailyCalories}</strong> kcal (~
                <strong>{plannedSurplus}</strong> kcal above) · Protein <strong>{n.proteinG}g</strong>.
              </p>
            )}
            {goalDir === "maintain" && (
              <p className="page-lead" style={{ margin: 0 }}>
                Target <strong>{n.dailyCalories}</strong> kcal near maintenance (~{tdeeLine}) · Protein{" "}
                <strong>{n.proteinG}g</strong>.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Equipment & summary</h2>
        <ul className="plan-summary-bullets">
          {summaryBullets.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
