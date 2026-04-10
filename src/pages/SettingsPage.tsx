import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  buildDashboardCopy,
  buildNutritionTargets,
  bmiCategory,
  computeBmi,
  evaluateGoalSafety,
  goalDirectionLabel,
} from "@/lib/nutrition";
import { buildWeeklySchedule } from "@/lib/schedule";
import type { BodyType, GoalDirection, PeriodTracking, UniDayMode, UserProfile } from "@/types/profile";
import { saveProfile } from "@/firebase/userDoc";

const DOW = [
  { bit: 0, label: "Sun" },
  { bit: 1, label: "Mon" },
  { bit: 2, label: "Tue" },
  { bit: 3, label: "Wed" },
  { bit: 4, label: "Thu" },
  { bit: 5, label: "Fri" },
  { bit: 6, label: "Sat" },
];

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [heightCm, setHeightCm] = useState(165);
  const [weightKg, setWeightKg] = useState(70);
  const [bodyType, setBodyType] = useState<BodyType>("mesomorph");
  const [targetWeightKg, setTargetWeightKg] = useState(65);
  const [goalDate, setGoalDate] = useState("");
  const [periodEnabled, setPeriodEnabled] = useState(false);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [foodLikes, setFoodLikes] = useState("");
  const [favoriteFoods, setFavoriteFoods] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [windowStart, setWindowStart] = useState("12:00");
  const [windowEnd, setWindowEnd] = useState("13:30");
  const [eveningWindowStart, setEveningWindowStart] = useState("18:00");
  const [eveningWindowEnd, setEveningWindowEnd] = useState("20:00");
  const [likesCardio, setLikesCardio] = useState(true);
  const [location, setLocation] = useState<"home" | "gym" | "both">("gym");
  const [machinesRaw, setMachinesRaw] = useState("");
  const [uniDays, setUniDays] = useState<number[]>([]);
  const [uniDayMode, setUniDayMode] = useState<UniDayMode>("home");
  const [sessionTotalMin, setSessionTotalMin] = useState(38);
  const [warmupMin, setWarmupMin] = useState(5);
  const [cardioAfterMin, setCardioAfterMin] = useState(10);
  const [cardioAfterMax, setCardioAfterMax] = useState(15);
  const [deloadEveryWeeks, setDeloadEveryWeeks] = useState(4);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [batchCooking, setBatchCooking] = useState(true);
  const [goalDirection, setGoalDirection] = useState<GoalDirection>("lose");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setHeightCm(profile.heightCm);
    setWeightKg(profile.weightKg);
    setBodyType(profile.bodyType);
    setTargetWeightKg(profile.targetWeightKg);
    setGoalDate(profile.goalDate);
    setFoodLikes(profile.foodLikes);
    setFavoriteFoods(profile.favoriteFoods);
    const g = profile.gym;
    setDaysPerWeek(g.daysPerWeek);
    setWindowStart(g.windowStart);
    setWindowEnd(g.windowEnd);
    setEveningWindowStart(g.eveningWindowStart ?? "18:00");
    setEveningWindowEnd(g.eveningWindowEnd ?? "20:00");
    setLikesCardio(g.likesCardio);
    setLocation(g.location);
    setMachinesRaw(g.machines.join(", "));
    setUniDays([...(g.uniDayIndices ?? [])]);
    setUniDayMode(g.uniDayMode);
    setSessionTotalMin(g.sessionTotalMin);
    setWarmupMin(g.warmupMin);
    setCardioAfterMin(g.cardioAfterWeightsMin);
    setCardioAfterMax(g.cardioAfterWeightsMax);
    setDeloadEveryWeeks(g.deloadEveryWeeks);
    setStepsGoal(g.stepsGoal);
    setBatchCooking(profile.nutrition.batchCooking);
    setGoalDirection(profile.goalDirection ?? "lose");
    if (profile.period) {
      setPeriodEnabled(profile.period.enabled);
      setCycleLengthDays(profile.period.cycleLengthDays);
      setLastPeriodStart(profile.period.lastPeriodStart ?? "");
    }
  }, [profile]);

  if (!user || !profile) return null;

  function toggleUniDay(d: number) {
    setUniDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  async function save() {
    if (!user || !profile) return;
    const u = user;
    const p = profile;
    setErr(null);
    setOk(null);
    setSaving(true);
    const machines = machinesRaw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const cardioMinutesRecommended = likesCardio ? Math.min(40, 15 + daysPerWeek * 5) : 12;
    const gym = {
      daysPerWeek,
      windowStart,
      windowEnd,
      eveningWindowStart,
      eveningWindowEnd,
      likesCardio,
      location,
      machines,
      cardioMinutesRecommended,
      cardioAfterWeightsMin: cardioAfterMin,
      cardioAfterWeightsMax: cardioAfterMax,
      sessionTotalMin,
      warmupMin,
      deloadEveryWeeks,
      uniDayIndices: uniDays,
      uniDayMode,
      stepsGoal,
    };
    const nutrition = buildNutritionTargets(
      weightKg,
      heightCm,
      weightKg,
      targetWeightKg,
      goalDate,
      bodyType,
      batchCooking,
      goalDirection,
    );
    const weeklySchedule = buildWeeklySchedule(gym);
    const bmi = computeBmi(weightKg, heightCm);
    const bmiCat = bmiCategory(bmi);
    const safety = evaluateGoalSafety(weightKg, targetWeightKg, goalDate, goalDirection);
    const dash = buildDashboardCopy({
      bmiCategory: bmiCat,
      foodLikes,
      gym,
      nutrition,
      goalDirection,
    });
    const period: PeriodTracking = periodEnabled
      ? {
          enabled: true,
          cycleLengthDays,
          ...(lastPeriodStart.trim() ? { lastPeriodStart: lastPeriodStart.trim() } : {}),
        }
      : { enabled: false, cycleLengthDays: 28 };
    const now = new Date().toISOString();
    const next: UserProfile = {
      ...p,
      displayName: displayName.trim() || p.displayName,
      heightCm,
      weightKg,
      bodyType,
      targetWeightKg,
      goalDate,
      goalDirection,
      foodLikes,
      favoriteFoods,
      gym,
      nutrition,
      weeklySchedule,
      period,
      expectations: dash.expectations,
      mistakesToAvoid: dash.mistakesToAvoid,
      quickWins: dash.quickWins,
      bmi,
      bmiCategory: bmiCat,
      goalSafety: safety,
      updatedAt: now,
    };
    try {
      await saveProfile(u.uid, next);
      await refreshProfile();
      setOk("Profile saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h1 className="app-page-title" style={{ margin: 0 }}>
          Profile & settings
        </h1>
        <Link to="/" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          Home
        </Link>
      </div>
      <p className="page-lead">Update your goal, targets, and schedule. Saved meal picks stay as they are.</p>
      {err && <div className="error-banner">{err}</div>}
      {ok && <div className="success-banner">{ok}</div>}

      <div className="card stack">
        <h2>Basics</h2>
        <label>Display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <label>Height (cm)</label>
        <input type="number" min={120} max={230} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
        <label>Weight (kg)</label>
        <input
          type="number"
          min={35}
          max={250}
          step={0.1}
          value={weightKg}
          onChange={(e) => setWeightKg(Number(e.target.value))}
        />
        <label>Body type</label>
        <select value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)}>
          <option value="ectomorph">Ectomorph</option>
          <option value="mesomorph">Mesomorph</option>
          <option value="endomorph">Endomorph</option>
          <option value="unsure">Not sure</option>
        </select>
      </div>

      <div className="card stack">
        <h2>Goal</h2>
        <p className="page-lead" style={{ marginTop: 0 }}>
          Primary focus (drives calorie target and dashboard copy)
        </p>
        <div className="goal-segment" role="group" aria-label="Primary goal">
          {(["lose", "gain", "maintain"] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={goalDirection === g ? "btn btn-primary" : "btn btn-secondary"}
              style={{ flex: "1 1 30%", minWidth: "6.5rem", fontSize: "0.82rem" }}
              onClick={() => setGoalDirection(g)}
            >
              {goalDirectionLabel(g)}
            </button>
          ))}
        </div>
        <label>Target weight (kg)</label>
        <input
          type="number"
          min={35}
          max={250}
          step={0.1}
          value={targetWeightKg}
          onChange={(e) => setTargetWeightKg(Number(e.target.value))}
        />
        <label>Goal date</label>
        <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
        <p className="page-lead" style={{ marginBottom: 0 }}>
          When you save, we recalculate daily calories and macros from your goal, weight, and date.
        </p>
      </div>

      <div className="card stack">
        <h2>Cycle tracking</h2>
        <label className="row" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={periodEnabled}
            onChange={(e) => setPeriodEnabled(e.target.checked)}
            style={{ width: "auto", marginRight: "0.5rem" }}
          />
          Track period
        </label>
        {periodEnabled && (
          <>
            <label>Cycle length (days)</label>
            <input
              type="number"
              min={21}
              max={40}
              value={cycleLengthDays}
              onChange={(e) => setCycleLengthDays(Number(e.target.value))}
            />
            <label>Last period start</label>
            <input type="date" value={lastPeriodStart} onChange={(e) => setLastPeriodStart(e.target.value)} />
          </>
        )}
      </div>

      <div className="card stack">
        <h2>Food notes</h2>
        <label>What you like</label>
        <textarea value={foodLikes} onChange={(e) => setFoodLikes(e.target.value)} />
        <label>Favorites</label>
        <textarea value={favoriteFoods} onChange={(e) => setFavoriteFoods(e.target.value)} />
        <label>
          <input
            type="checkbox"
            checked={batchCooking}
            onChange={(e) => setBatchCooking(e.target.checked)}
            style={{ width: "auto", marginRight: "0.5rem" }}
          />
          Open to batch cooking
        </label>
      </div>

      <div className="card stack">
        <h2>Gym & schedule</h2>
        <label>Strength days / week</label>
        <input type="number" min={2} max={6} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} />
        <label>Main window start / end</label>
        <div className="row">
          <input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
          <input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
        </div>
        <label>Evening window</label>
        <div className="row">
          <input type="time" value={eveningWindowStart} onChange={(e) => setEveningWindowStart(e.target.value)} />
          <input type="time" value={eveningWindowEnd} onChange={(e) => setEveningWindowEnd(e.target.value)} />
        </div>
        <label>Uni / lighter days</label>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
          {DOW.map(({ bit, label }) => (
            <button
              key={bit}
              type="button"
              className={uniDays.includes(bit) ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "0.35rem 0.55rem", fontSize: "0.8rem" }}
              onClick={() => toggleUniDay(bit)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>On uni days</label>
        <select value={uniDayMode} onChange={(e) => setUniDayMode(e.target.value as UniDayMode)}>
          <option value="home">Home / bands</option>
          <option value="evening_gym">Evening gym</option>
          <option value="rest">Rest / walk</option>
        </select>
        <label>Session length (min)</label>
        <input type="number" min={25} max={75} value={sessionTotalMin} onChange={(e) => setSessionTotalMin(Number(e.target.value))} />
        <label>Warm-up (min)</label>
        <input type="number" min={3} max={20} value={warmupMin} onChange={(e) => setWarmupMin(Number(e.target.value))} />
        <label>Cardio after weights (min range)</label>
        <div className="row">
          <input type="number" min={5} max={30} value={cardioAfterMin} onChange={(e) => setCardioAfterMin(Number(e.target.value))} />
          <input type="number" min={5} max={45} value={cardioAfterMax} onChange={(e) => setCardioAfterMax(Number(e.target.value))} />
        </div>
        <label>Deload every (weeks)</label>
        <input type="number" min={2} max={8} value={deloadEveryWeeks} onChange={(e) => setDeloadEveryWeeks(Number(e.target.value))} />
        <label>Steps goal</label>
        <input type="number" min={3000} max={20000} step={500} value={stepsGoal} onChange={(e) => setStepsGoal(Number(e.target.value))} />
        <label>Where you train</label>
        <select value={location} onChange={(e) => setLocation(e.target.value as typeof location)}>
          <option value="home">Home</option>
          <option value="gym">Gym</option>
          <option value="both">Both</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={likesCardio}
            onChange={(e) => setLikesCardio(e.target.checked)}
            style={{ width: "auto", marginRight: "0.5rem" }}
          />
          Extra structured cardio beyond post-lift
        </label>
        <label>Equipment (comma separated)</label>
        <textarea value={machinesRaw} onChange={(e) => setMachinesRaw(e.target.value)} />
      </div>

      <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
