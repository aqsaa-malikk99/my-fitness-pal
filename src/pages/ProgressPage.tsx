import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addProgressEntry,
  deleteProgressEntry,
  listProgress,
  todayIso,
} from "@/firebase/userDoc";
import type { ProgressEntry } from "@/types/profile";
import { stepsToKcalBurned } from "@/lib/schedule";

export default function ProgressPage() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [date, setDate] = useState(todayIso);
  const [weightKg, setWeightKg] = useState("");
  const [armsCm, setArmsCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipsCm, setHipsCm] = useState("");
  const [injuryNote, setInjuryNote] = useState("");
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const rows = await listProgress(user.uid);
    setEntries(rows);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    if (!user) return;
    setBusy(true);
    await addProgressEntry(user.uid, {
      date,
      weightKg: weightKg ? Number(weightKg) : undefined,
      armsCm: armsCm ? Number(armsCm) : undefined,
      waistCm: waistCm ? Number(waistCm) : undefined,
      hipsCm: hipsCm ? Number(hipsCm) : undefined,
      steps: steps ? Math.round(Number(steps)) : undefined,
      injuryNote: injuryNote.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setWeightKg("");
    setArmsCm("");
    setWaistCm("");
    setHipsCm("");
    setSteps("");
    setInjuryNote("");
    setNotes("");
    await refresh();
    setBusy(false);
    setToast("Saved. Home updates with your latest steps, weight, and BMI trend when you log them.");
    window.setTimeout(() => setToast(null), 5000);
  }

  async function remove(id: string) {
    if (!user) return;
    await deleteProgressEntry(user.uid, id);
    await refresh();
  }

  async function clearAll() {
    if (!user || !entries.length) return;
    if (!confirm("Delete all progress entries?")) return;
    setBusy(true);
    await Promise.all(entries.map((e) => deleteProgressEntry(user.uid, e.id)));
    await refresh();
    setBusy(false);
  }

  return (
    <div className="app-shell">
      <h1 className="app-page-title">Progress</h1>
      <p className="page-lead">
        Log weight and steps anytime. Arms, waist, and hips are optional — skip them if you only care about weight and
        movement. Entries stay in your history until you remove them.
      </p>

      {toast && <div className="success-banner">{toast}</div>}

      <div className="card stack">
        <h2>New entry</h2>
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label>Weight (kg)</label>
        <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="optional" />
        <label>Steps today (optional)</label>
        <input
          type="text"
          inputMode="numeric"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="e.g. 8420"
        />
        {profile && steps && Number(steps) > 0 && (
          <p className="muted" style={{ margin: "-0.35rem 0 0.5rem", fontSize: "0.82rem" }}>
            ~{stepsToKcalBurned(Number(steps), profile.weightKg)} kcal burn estimate from steps
          </p>
        )}
        <p className="muted" style={{ margin: "0 0 0.35rem", fontSize: "0.8rem" }}>
          Optional measurements — leave blank if you’re only tracking steps and weight.
        </p>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Arms (cm)</label>
            <input value={armsCm} onChange={(e) => setArmsCm(e.target.value)} placeholder="skip" />
          </div>
          <div style={{ flex: 1 }}>
            <label>Waist (cm)</label>
            <input value={waistCm} onChange={(e) => setWaistCm(e.target.value)} placeholder="skip" />
          </div>
          <div style={{ flex: 1 }}>
            <label>Hips (cm)</label>
            <input value={hipsCm} onChange={(e) => setHipsCm(e.target.value)} placeholder="skip" />
          </div>
        </div>
        <label>Injury / pain note</label>
        <textarea value={injuryNote} onChange={(e) => setInjuryNote(e.target.value)} placeholder="e.g. right knee — avoid deep flexion this week" />
        <label>General notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sleep, steps, wins…" />
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void save()}>
          Save entry
        </button>
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>History</h2>
        {entries.length > 0 && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void clearAll()}>
            Clear all measurements
          </button>
        )}
      </div>

      <div className="stack">
        {entries.map((e) => (
          <div key={e.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{e.date}</strong>
              <button type="button" className="btn btn-ghost" onClick={() => void remove(e.id)}>
                Delete
              </button>
            </div>
            <p className="muted" style={{ margin: "0.35rem 0" }}>
              {e.weightKg != null && <>Weight {e.weightKg} kg · </>}
              {e.armsCm != null && <>Arms {e.armsCm} cm · </>}
              {e.waistCm != null && <>Waist {e.waistCm} cm · </>}
              {e.hipsCm != null && <>Hips {e.hipsCm} cm · </>}
              {e.steps != null &&
                (profile ? (
                  <>Steps {e.steps.toLocaleString()} (~{stepsToKcalBurned(e.steps, profile.weightKg)} kcal)</>
                ) : (
                  <>Steps {e.steps.toLocaleString()}</>
                ))}
            </p>
            {e.injuryNote && (
              <p style={{ margin: 0 }}>
                <span className="pill bad">Injury</span> {e.injuryNote}
              </p>
            )}
            {e.notes && (
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                {e.notes}
              </p>
            )}
          </div>
        ))}
        {entries.length === 0 && <p className="muted">No entries yet.</p>}
      </div>
    </div>
  );
}
