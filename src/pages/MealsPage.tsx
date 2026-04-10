import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import type { MealSlotId } from "@/types/profile";
import { getDailyLog, listCalculatorDay, saveDailyLog, todayIso } from "@/firebase/userDoc";

const labels: Record<MealSlotId, string> = {
  preMorning: "Pre-morning",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
  bedtimeTea: "Bedtime tea",
  nighttimeTea: "Nighttime tea",
};

const ORDER: MealSlotId[] = [
  "preMorning",
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "drinks",
  "bedtimeTea",
  "nighttimeTea",
];

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
  const [date] = useState(todayIso);
  const [slotDone, setSlotDone] = useState<Partial<Record<MealSlotId, boolean>>>({});
  const [consumedP, setConsumedP] = useState(0);
  const [consumedC, setConsumedC] = useState(0);
  const [consumedF, setConsumedF] = useState(0);
  const [consumedKcal, setConsumedKcal] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const log = await getDailyLog(user.uid, date);
    setSlotDone(log?.slotDone ?? {});
    const items = await listCalculatorDay(user.uid, date);
    let p = 0;
    let c = 0;
    let f = 0;
    let k = 0;
    for (const i of items) {
      k += i.calories;
      p += i.proteinG ?? 0;
      c += i.carbsG ?? 0;
      f += i.fatG ?? 0;
    }
    setConsumedP(p);
    setConsumedC(c);
    setConsumedF(f);
    setConsumedKcal(k);
  }, [user, date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!profile || !user) return null;
  const n = profile.nutrition;
  const a = profile.mealAssignments;

  async function toggle(slot: MealSlotId) {
    if (!user) return;
    const next = { ...slotDone, [slot]: !slotDone[slot] };
    setSlotDone(next);
    await saveDailyLog(user.uid, date, { slotDone: { [slot]: !!next[slot] } });
  }

  const allChecked = useMemo(
    () => ORDER.every((s) => slotDone[s]),
    [slotDone]
  );

  return (
    <div className="app-shell">
      <h1>Meals</h1>
      <p className="muted" style={{ fontSize: "0.88rem" }}>
        Today ({date}) · Targets, timing, and checkboxes sync to your account.
      </p>

      {allChecked && (
        <div className="success-banner" style={{ marginBottom: "0.75rem" }}>
          You are done for the day — nice work.
        </div>
      )}

      <div className="card">
        <h2>Macros vs targets</h2>
        <p className="muted" style={{ margin: "0 0 0.65rem", fontSize: "0.82rem" }}>
          From Calc log today: <strong>{consumedKcal}</strong> kcal · Plan {n.dailyCalories} kcal
        </p>
        <MacroBar label="Protein" current={consumedP} target={n.proteinG} kind="protein" />
        <MacroBar label="Carbs" current={consumedC} target={n.carbsG} kind="carbs" />
        <MacroBar label="Fat" current={consumedF} target={n.fatG} kind="fat" />
        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
          Add protein/carbs/fat in Calc when logging for accurate bars.
        </p>
      </div>

      <div className="card">
        <h2>Meal timing</h2>
        <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
          {n.mealTimingNote}
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", fontSize: "0.82rem" }}>
          {ORDER.map((slot) => (
            <li key={slot} style={{ marginBottom: "0.25rem" }}>
              <strong>{labels[slot]}:</strong> {n.mealTimeHints[slot] ?? "—"}
            </li>
          ))}
        </ul>
        <p className="muted" style={{ margin: "0.65rem 0 0", fontSize: "0.8rem" }}>
          Batch cooking: {n.batchCooking ? "Cook 2–3 anchors (protein + carb base), remix into lunches." : "Keep repeats simple mid-week."}
        </p>
      </div>

      <div className="card">
        <h2>Slots, budgets & check-off</h2>
        {ORDER.map((slot) => (
          <div
            key={slot}
            style={{
              marginBottom: "0.75rem",
              paddingBottom: "0.75rem",
              borderBottom: "1px solid var(--surface2)",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <label className="row" style={{ gap: "0.5rem", alignItems: "center", cursor: "pointer", margin: 0 }}>
                <input
                  type="checkbox"
                  checked={!!slotDone[slot]}
                  onChange={() => void toggle(slot)}
                  style={{ width: "auto" }}
                />
                <span>
                  <strong>{labels[slot]}</strong>
                  <span className="pill" style={{ marginLeft: "0.35rem" }}>
                    {n.slotCalories[slot]} kcal
                  </span>
                </span>
              </label>
            </div>
            {a[slot] ? (
              <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                {a[slot]!.recipeName} · {a[slot]!.calories} kcal
                {a[slot]!.calories > n.slotCalories[slot] && (
                  <span className="pill bad" style={{ marginLeft: "0.35rem" }}>
                    Over budget
                  </span>
                )}
              </p>
            ) : (
              <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                Nothing assigned — pick a recipe in Recipes.
              </p>
            )}
          </div>
        ))}
      </div>

      <Link to="/recipes" className="btn btn-primary btn-block" style={{ textAlign: "center", textDecoration: "none" }}>
        Browse recipes & assign
      </Link>
    </div>
  );
}
