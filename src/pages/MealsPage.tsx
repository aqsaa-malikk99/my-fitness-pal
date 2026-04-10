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
      <h1 className="app-page-title">Meals</h1>
      <p className="page-lead">
        Today · <strong>{date}</strong> · Targets, meal times, and checkboxes save to your account.
      </p>

      {allChecked && (
        <div className="success-banner" style={{ marginBottom: "0.75rem" }}>
          All meal slots checked — solid day.
        </div>
      )}

      <div className="card">
        <h2>Macros</h2>
        <p className="page-lead" style={{ margin: "0 0 0.65rem" }}>
          Logged today (from Calc): <strong>{consumedKcal}</strong> kcal · Plan <strong>{n.dailyCalories}</strong> kcal
        </p>
        <MacroBar label="Protein" current={consumedP} target={n.proteinG} kind="protein" />
        <MacroBar label="Carbs" current={consumedC} target={n.carbsG} kind="carbs" />
        <MacroBar label="Fat" current={consumedF} target={n.fatG} kind="fat" />
        <p className="page-lead" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
          Add protein, carbs, and fat in Food log so these bars stay accurate.
        </p>
      </div>

      <div className="card">
        <h2>Meal timing</h2>
        <p className="page-lead" style={{ margin: "0 0 0.5rem" }}>
          {n.mealTimingNote}
        </p>
        <ul className="coach-list coach-list--tight" style={{ marginTop: 0 }}>
          {ORDER.map((slot) => (
            <li key={slot} style={{ marginBottom: "0.25rem" }}>
              <strong>{labels[slot]}:</strong> {n.mealTimeHints[slot] ?? "—"}
            </li>
          ))}
        </ul>
        <p className="page-lead" style={{ margin: "0.65rem 0 0", fontSize: "0.85rem" }}>
          {n.batchCooking
            ? "Batch cooking: cook 2–3 protein + carb bases and remix through the week."
            : "Flexible prep: repeat simple meals mid-week if that is easier."}
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
