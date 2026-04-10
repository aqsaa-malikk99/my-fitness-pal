import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addCalculatorItem,
  deleteCalculatorItem,
  listCalculatorDay,
  todayIso,
} from "@/firebase/userDoc";

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

export default function CalculatorPage() {
  const { user, profile } = useAuth();
  const [date, setDate] = useState(todayIso);
  const [items, setItems] = useState<
    { id: string; label: string; calories: number; date: string; proteinG?: number; carbsG?: number; fatG?: number }[]
  >([]);
  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState(200);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [loading, setLoading] = useState(true);

  const [pLabel, setPLabel] = useState("Portion");
  const [calPerServing, setCalPerServing] = useState(150);
  const [serveG, setServeG] = useState(30);
  const [pPerServe, setPPerServe] = useState(0);
  const [cPerServe, setCPerServe] = useState(0);
  const [fPerServe, setFPerServe] = useState(0);
  const [sodiumMg, setSodiumMg] = useState(0);
  const [amt, setAmt] = useState(20);
  const [unit, setUnit] = useState<PortionUnit>("g");

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

  const total = useMemo(() => items.reduce((s, i) => s + i.calories, 0), [items]);
  const totalP = useMemo(() => items.reduce((s, i) => s + (i.proteinG ?? 0), 0), [items]);
  const totalC = useMemo(() => items.reduce((s, i) => s + (i.carbsG ?? 0), 0), [items]);
  const totalF = useMemo(() => items.reduce((s, i) => s + (i.fatG ?? 0), 0), [items]);
  const target = profile?.nutrition.dailyCalories ?? 0;
  const remain = target - total;

  const gramsTaken = amountToGrams(amt, unit);
  const ratio = serveG > 0 ? gramsTaken / serveG : 0;
  const calcCal = Math.round(calPerServing * ratio);
  const calcP = Math.round(pPerServe * ratio * 10) / 10;
  const calcC = Math.round(cPerServe * ratio * 10) / 10;
  const calcF = Math.round(fPerServe * ratio * 10) / 10;
  const calcNa = Math.round(sodiumMg * ratio);

  async function add() {
    if (!user || !label.trim()) return;
    await addCalculatorItem(user.uid, {
      date,
      label: label.trim(),
      calories,
      proteinG: proteinG || undefined,
      carbsG: carbsG || undefined,
      fatG: fatG || undefined,
    });
    setLabel("");
    await refresh();
  }

  async function addPortion() {
    if (!user || !pLabel.trim() || serveG <= 0) return;
    await addCalculatorItem(user.uid, {
      date,
      label: `${pLabel.trim()} (${gramsTaken.toFixed(0)} g eq.)`,
      calories: calcCal,
      proteinG: calcP || undefined,
      carbsG: calcC || undefined,
      fatG: calcF || undefined,
    });
    await refresh();
  }

  async function remove(id: string) {
    if (!user) return;
    await deleteCalculatorItem(user.uid, id);
    await refresh();
  }

  return (
    <div className="app-shell">
      <h1>Calculator</h1>
      <p className="muted" style={{ fontSize: "0.88rem" }}>
        Food log plus a smart portion scaler (label macros per serving vs what you actually took).
      </p>

      <div className="card">
        <label>Day</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
          Logged: <strong>{total}</strong> kcal
          {target > 0 && (
            <>
              {" "}
              · Target {target} kcal · <span className={remain < 0 ? "pill bad" : "pill ok"}>{remain} kcal left</span>
            </>
          )}
        </p>
        <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
          P {Math.round(totalP)}g · C {Math.round(totalC)}g · F {Math.round(totalF)}g (when logged)
        </p>
      </div>

      <div className="card stack">
        <h2 style={{ marginTop: 0 }}>Smart portion</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.82rem" }}>
          Enter what the packet says per serving, then the amount you used. Cup/tbsp/tsp use rough gram equivalents for
          solids; weigh when possible.
        </p>
        <label>Food name</label>
        <input value={pLabel} onChange={(e) => setPLabel(e.target.value)} placeholder="e.g. granola" />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>kcal / serving</label>
            <input type="number" min={0} value={calPerServing} onChange={(e) => setCalPerServing(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Serving size (g)</label>
            <input type="number" min={1} value={serveG} onChange={(e) => setServeG(Number(e.target.value))} />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Protein g / serving</label>
            <input type="number" min={0} value={pPerServe} onChange={(e) => setPPerServe(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Carbs g / serving</label>
            <input type="number" min={0} value={cPerServe} onChange={(e) => setCPerServe(Number(e.target.value))} />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Fat g / serving</label>
            <input type="number" min={0} value={fPerServe} onChange={(e) => setFPerServe(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Sodium mg / serving</label>
            <input type="number" min={0} value={sodiumMg} onChange={(e) => setSodiumMg(Number(e.target.value))} />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Amount you took</label>
            <input type="number" min={0} step={0.1} value={amt} onChange={(e) => setAmt(Number(e.target.value))} />
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
        <div className="card" style={{ background: "var(--bg)", marginBottom: 0 }}>
          <strong>Result</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>
            ~{gramsTaken.toFixed(1)} g equivalent · <strong>{calcCal}</strong> kcal · P {calcP}g · C {calcC}g · F {calcF}g
            {sodiumMg > 0 && <> · Na ~{calcNa} mg</>}
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => void addPortion()}>
          Add portion to log
        </button>
      </div>

      <div className="card stack">
        <h2 style={{ marginTop: 0 }}>Quick add</h2>
        <label>Food</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. latte, apple" />
        <label>Calories</label>
        <input type="number" min={1} value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Protein g</label>
            <input type="number" min={0} value={proteinG} onChange={(e) => setProteinG(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Carbs g</label>
            <input type="number" min={0} value={carbsG} onChange={(e) => setCarbsG(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Fat g</label>
            <input type="number" min={0} value={fatG} onChange={(e) => setFatG(Number(e.target.value))} />
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => void add()}>
          Add entry
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="stack">
          {items.map((i) => (
            <div key={i.id} className="card row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{i.label}</strong>
                <div className="muted">
                  {i.calories} kcal
                  {(i.proteinG ?? i.carbsG ?? i.fatG) != null && (
                    <>
                      {" "}
                      · P {i.proteinG ?? 0} C {i.carbsG ?? 0} F {i.fatG ?? 0}
                    </>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => void remove(i.id)}>
                Remove
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="muted">No entries for this day.</p>}
        </div>
      )}
    </div>
  );
}
