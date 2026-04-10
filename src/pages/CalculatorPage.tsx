import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addCalculatorItem,
  addUserRecipe,
  deleteCalculatorItem,
  listCalculatorDay,
} from "@/firebase/userDoc";
import type { CalculatorEntry, MealSlotId, UserRecipe, UserRecipeDoc } from "@/types/profile";
import { MEAL_SLOT_ORDER } from "@/lib/mealSlotOrder";
import { localDateIso } from "@/lib/dateIso";
import {
  FOOD_LOG_SLOT_LABELS,
  inferFoodLogEntryKind,
  mealSlotToRecipeCategory,
  splitIngredients,
} from "@/lib/foodLog";
import { assignRecipeToMealPlan } from "@/lib/recipeAssign";
import NumericInput from "@/components/NumericInput";

type PortionUnit = "g" | "oz" | "cup" | "tbsp" | "tsp";

const UNIT_TO_G: Record<PortionUnit, number> = {
  g: 1,
  oz: 28.35,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

function amountToGrams(amount: number, unit: PortionUnit): number {
  return amount * UNIT_TO_G[unit];
}

type LogTab = "smart" | "manual";

function groupEntries(items: CalculatorEntry[]) {
  const smart: CalculatorEntry[] = [];
  const manual: CalculatorEntry[] = [];
  const meal: CalculatorEntry[] = [];
  for (const i of items) {
    const k = inferFoodLogEntryKind(i);
    if (k === "meal_slot") meal.push(i);
    else if (k === "smart_portion") smart.push(i);
    else manual.push(i);
  }
  return { smart, manual, meal };
}

function buildUserRecipe(id: string, doc: Omit<UserRecipeDoc, "createdAt" | "updatedAt">): UserRecipe {
  const now = new Date().toISOString();
  return { id, ...doc, createdAt: now, updatedAt: now };
}

export default function CalculatorPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [date, setDate] = useState(localDateIso);
  const [items, setItems] = useState<CalculatorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LogTab>("smart");
  const [msg, setMsg] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState(200);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [manualSlot, setManualSlot] = useState<MealSlotId>("breakfast");
  const [ingredientsText, setIngredientsText] = useState("");
  const [instructionsText, setInstructionsText] = useState("");

  const [pLabel, setPLabel] = useState("Portion");
  const [calPerServing, setCalPerServing] = useState(150);
  const [serveG, setServeG] = useState(30);
  const [pPerServe, setPPerServe] = useState(0);
  const [cPerServe, setCPerServe] = useState(0);
  const [fPerServe, setFPerServe] = useState(0);
  const [sodiumMg, setSodiumMg] = useState(0);
  const [amt, setAmt] = useState(20);
  const [unit, setUnit] = useState<PortionUnit>("g");
  const [smartSlot, setSmartSlot] = useState<MealSlotId>("snacks");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rows = await listCalculatorDay(user.uid, date);
    setItems(rows);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const gramsTaken = amountToGrams(amt, unit);
  const ratio = serveG > 0 ? gramsTaken / serveG : 0;
  const calcCal = Math.round(calPerServing * ratio);
  const calcP = Math.round(pPerServe * ratio * 10) / 10;
  const calcC = Math.round(cPerServe * ratio * 10) / 10;
  const calcF = Math.round(fPerServe * ratio * 10) / 10;
  const calcNa = Math.round(sodiumMg * ratio);

  const dayLabel = useMemo(() => {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [date]);

  const grouped = useMemo(() => groupEntries(items), [items]);

  function manualDocBase(): Omit<UserRecipeDoc, "createdAt" | "updatedAt"> {
    const ing = splitIngredients(ingredientsText);
    return {
      origin: "user",
      name: label.trim(),
      category: mealSlotToRecipeCategory(manualSlot),
      calories,
      proteinG: proteinG ?? 0,
      carbsG: carbsG ?? 0,
      fatG: fatG ?? 0,
      ingredients: ing,
      instructions: instructionsText.trim() || "—",
      mealTypes: [manualSlot],
      tags: manualSlot === "bedtimeTea" || manualSlot === "nighttimeTea" ? ["tea"] : undefined,
    };
  }

  /** Save to Recipes + log only (searchable later; no meal plan slot). */
  async function addManualSaveForFuture() {
    if (!user || !label.trim()) return;
    setMsg(null);
    try {
      const doc = manualDocBase();
      const id = await addUserRecipe(user.uid, doc);
      await addCalculatorItem(user.uid, {
        date,
        label: label.trim(),
        calories,
        proteinG: proteinG || undefined,
        carbsG: carbsG || undefined,
        fatG: fatG || undefined,
        entryKind: "manual_meal",
        taggedMealSlot: manualSlot,
        ingredientsNote: ingredientsText.trim() || undefined,
        instructionsNote: instructionsText.trim() || undefined,
        savedRecipeId: id,
      });
      setLabel("");
      setIngredientsText("");
      setInstructionsText("");
      await refresh();
      setMsg("Saved to your log and Recipes — find it under My own when you search.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    }
  }

  /** Save to Recipes, assign to meal plan for this day, and log. */
  async function addManualToMealPlan() {
    if (!user || !profile || !label.trim()) return;
    setMsg(null);
    try {
      const doc = manualDocBase();
      const id = await addUserRecipe(user.uid, doc);
      const saved = buildUserRecipe(id, doc);

      const assignRes = await assignRecipeToMealPlan({
        uid: user.uid,
        profile,
        recipe: saved,
        planDate: date,
        assignSlot: manualSlot,
      });

      await addCalculatorItem(user.uid, {
        date,
        label: label.trim(),
        calories,
        proteinG: proteinG || undefined,
        carbsG: carbsG || undefined,
        fatG: fatG || undefined,
        entryKind: "manual_meal",
        taggedMealSlot: manualSlot,
        ingredientsNote: ingredientsText.trim() || undefined,
        instructionsNote: instructionsText.trim() || undefined,
        savedRecipeId: id,
      });
      setLabel("");
      setIngredientsText("");
      setInstructionsText("");
      await refresh();
      if (assignRes.ok) {
        await refreshProfile();
        setMsg("Saved to Recipes, added to your meal plan for this day, and logged.");
      } else if (assignRes.message === "Cancelled.") {
        setMsg("Saved to Recipes and your log. Meal plan assignment was cancelled.");
      } else {
        await refreshProfile();
        setMsg(`Saved to Recipes and your log. Meal plan: ${assignRes.message}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function addPortionToLog() {
    if (!user || !pLabel.trim() || serveG <= 0) return;
    setMsg(null);
    try {
      await addCalculatorItem(user.uid, {
        date,
        label: `${pLabel.trim()} (${gramsTaken.toFixed(0)} g eq.)`,
        calories: calcCal,
        proteinG: calcP || undefined,
        carbsG: calcC || undefined,
        fatG: calcF || undefined,
        entryKind: "smart_portion",
        taggedMealSlot: smartSlot,
      });
      await refresh();
      setMsg("Added to your food log for this day. (Meal page macros only change when you check off meals there.)");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function remove(id: string) {
    if (!user) return;
    await deleteCalculatorItem(user.uid, id);
    await refresh();
  }

  function entryCard(i: CalculatorEntry) {
    const kind = inferFoodLogEntryKind(i);
    const tag = i.taggedMealSlot ? FOOD_LOG_SLOT_LABELS[i.taggedMealSlot] : null;
    return (
      <div
        key={i.id}
        className={`food-log-entry-card card row${kind === "smart_portion" ? " food-log-entry-card--smart" : kind === "manual_meal" ? " food-log-entry-card--manual" : " food-log-entry-card--meal"}`}
        style={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <strong>{i.label}</strong>
          {kind === "meal_slot" && (
            <span className="food-log-kind-badge food-log-kind-badge--meal" title="From Meal page check-off">
              {" "}
              · Meal plan
            </span>
          )}
          {kind === "smart_portion" && (
            <span className="food-log-kind-badge food-log-kind-badge--smart"> · Smart portion</span>
          )}
          {kind === "manual_meal" && (
            <span className="food-log-kind-badge food-log-kind-badge--manual"> · Manual meal</span>
          )}
          {tag && <span className="food-log-slot-pill">{tag}</span>}
          <div className="food-log-entry-macros">
            <span className="food-log-kcal">{i.calories} kcal</span>
            {(i.proteinG != null || i.carbsG != null || i.fatG != null) && (
              <>
                <span className="food-log-sep"> · </span>
                <span className="food-log-protein">P {i.proteinG ?? 0}g</span>
                <span className="food-log-sep"> </span>
                <span className="food-log-carbs">C {i.carbsG ?? 0}g</span>
                <span className="food-log-sep"> </span>
                <span className="food-log-fat">F {i.fatG ?? 0}g</span>
              </>
            )}
          </div>
          {i.ingredientsNote && (
            <p className="food-log-entry-note muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              <strong>Ingredients:</strong> {i.ingredientsNote.slice(0, 200)}
              {i.ingredientsNote.length > 200 ? "…" : ""}
            </p>
          )}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void remove(i.id)}>
          Remove
        </button>
      </div>
    );
  }

  const msgIsError = Boolean(msg && (msg.startsWith("Could not") || msg.includes("Cannot fit")));

  return (
    <div className="app-shell">
      <h1 className="app-page-title">Food log</h1>
      <p className="page-lead">
        <strong>Smart portion</strong> only adds a line to this food log (not Recipes, not the Meal plan).{" "}
        <strong>Manual meal</strong> can save a dish under My own and/or assign it with{" "}
        <strong>Add to my meal plan</strong>.
      </p>

      {msg && (msgIsError ? <div className="error-banner">{msg}</div> : <div className="success-banner">{msg}</div>)}

      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ flex: "1 1 10rem" }}>
            <label>Day</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="food-log-day-line muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              {dayLabel}
            </p>
          </div>
        </div>

        <h2 style={{ marginTop: "1rem", marginBottom: 0 }}>Add to log</h2>
        <div className="food-log-tabs" role="tablist" aria-label="Log mode" style={{ marginTop: "0.5rem" }}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "smart"}
            className={`food-log-tab${tab === "smart" ? " food-log-tab--active" : ""}`}
            onClick={() => setTab("smart")}
          >
            Smart portion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "manual"}
            className={`food-log-tab${tab === "manual" ? " food-log-tab--active" : ""}`}
            onClick={() => setTab("manual")}
          >
            Manual meal
          </button>
        </div>

        {tab === "smart" && (
          <div className="stack" style={{ marginTop: "0.75rem" }}>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.82rem" }}>
              Per-serving values from the pack, then your portion. This only records what you ate here — it does not create a
              recipe and does not change Meal page macros.
            </p>
            <label>Label (short)</label>
            <input value={pLabel} onChange={(e) => setPLabel(e.target.value)} placeholder="e.g. granola" />
            <label>Tag (optional, for sorting this log)</label>
            <select value={smartSlot} onChange={(e) => setSmartSlot(e.target.value as MealSlotId)}>
              {MEAL_SLOT_ORDER.map((k) => (
                <option key={k} value={k}>
                  {FOOD_LOG_SLOT_LABELS[k]}
                </option>
              ))}
            </select>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>kcal / serving</label>
                <NumericInput min={0} value={calPerServing} onValueChange={setCalPerServing} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Serving size (g)</label>
                <NumericInput min={1} value={serveG} onValueChange={setServeG} />
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Protein g / serving</label>
                <NumericInput min={0} value={pPerServe} onValueChange={setPPerServe} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Carbs g / serving</label>
                <NumericInput min={0} value={cPerServe} onValueChange={setCPerServe} />
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Fat g / serving</label>
                <NumericInput min={0} value={fPerServe} onValueChange={setFPerServe} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Sodium mg / serving</label>
                <NumericInput min={0} value={sodiumMg} onValueChange={setSodiumMg} />
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Amount you took</label>
                <NumericInput min={0} step={0.1} value={amt} onValueChange={setAmt} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value as PortionUnit)}>
                  <option value="g">grams</option>
                  <option value="oz">ounces</option>
                  <option value="cup">cup (~240 g)</option>
                  <option value="tbsp">tablespoon (~15 g)</option>
                  <option value="tsp">teaspoon (~5 g)</option>
                </select>
              </div>
            </div>
            <div className="food-log-result card" style={{ background: "var(--bg)", marginBottom: 0 }}>
              <strong>Result</strong>
              <p className="food-log-result-line" style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: 1.55 }}>
                <span className="muted">~{gramsTaken.toFixed(1)} g equivalent → </span>
                <span className="food-log-kcal food-log-kcal--lg">{calcCal} kcal</span>
                <span className="muted"> · </span>
                <span className="food-log-protein">Protein {calcP}g</span>
                <span className="muted"> · </span>
                <span className="food-log-carbs">Carbs {calcC}g</span>
                <span className="muted"> · </span>
                <span className="food-log-fat">Fat {calcF}g</span>
                {sodiumMg > 0 && (
                  <>
                    <span className="muted"> · </span>
                    <span>Na ~{calcNa} mg</span>
                  </>
                )}
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={() => void addPortionToLog()}>
              Add portion to log
            </button>
          </div>
        )}

        {tab === "manual" && (
          <div className="stack" style={{ marginTop: "0.75rem" }}>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.82rem" }}>
              Enter the meal name, tag, macros, and optional ingredients and recipe notes. Then either add it to
              today’s <strong>meal plan</strong> (and Recipes), or only save for <strong>future</strong> search on the Recipes
              tab under My own.
            </p>
            <label>Meal name</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. chicken rice bowl" />
            <label>Tag (breakfast, lunch, snack, tea, …)</label>
            <select value={manualSlot} onChange={(e) => setManualSlot(e.target.value as MealSlotId)}>
              {MEAL_SLOT_ORDER.map((k) => (
                <option key={k} value={k}>
                  {FOOD_LOG_SLOT_LABELS[k]}
                </option>
              ))}
            </select>
            <label>Calories</label>
            <NumericInput min={1} value={calories} onValueChange={setCalories} />
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Protein g</label>
                <NumericInput min={0} value={proteinG} onValueChange={setProteinG} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Carbs g</label>
                <NumericInput min={0} value={carbsG} onValueChange={setCarbsG} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Fat g</label>
                <NumericInput min={0} value={fatG} onValueChange={setFatG} />
              </div>
            </div>
            <label>Ingredients (optional, one per line)</label>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={3}
              placeholder="e.g. 150 g cooked rice&#10;120 g grilled chicken"
            />
            <label>Recipe / notes (optional)</label>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              rows={3}
              placeholder="Short steps or notes"
            />
            <button type="button" className="btn btn-primary btn-block" onClick={() => void addManualToMealPlan()}>
              Add to my meal plan
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => void addManualSaveForFuture()}>
              Save meal for future (Recipes + log)
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="stack food-log-history">
          <h2 className="food-log-history-title">Entries for this day</h2>
          {items.length === 0 ? (
            <p className="muted">No entries for this day.</p>
          ) : (
            <>
              {grouped.meal.length > 0 && (
                <section className="food-log-section">
                  <h3 className="food-log-section__title">From your meal plan</h3>
                  <div className="stack">{grouped.meal.map(entryCard)}</div>
                </section>
              )}
              {grouped.smart.length > 0 && (
                <section className="food-log-section">
                  <h3 className="food-log-section__title">Smart portions</h3>
                  <div className="stack">{grouped.smart.map(entryCard)}</div>
                </section>
              )}
              {grouped.manual.length > 0 && (
                <section className="food-log-section">
                  <h3 className="food-log-section__title">Manual meals</h3>
                  <div className="stack">{grouped.manual.map(entryCard)}</div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
