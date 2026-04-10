import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  buildDashboardCopy,
  buildGymPlanText,
  buildNutritionTargets,
  bmiCategory,
  bmiGuidance,
  computeBmi,
  evaluateGoalSafety,
} from "@/lib/nutrition";
import { buildWeeklySchedule } from "@/lib/schedule";
import type { BodyType, PeriodTracking, UniDayMode, UserProfile } from "@/types/profile";
import { emptyMealSlots, saveProfile } from "@/firebase/userDoc";

const DOW = [
  { bit: 0, label: "Sun" },
  { bit: 1, label: "Mon" },
  { bit: 2, label: "Tue" },
  { bit: 3, label: "Wed" },
  { bit: 4, label: "Thu" },
  { bit: 5, label: "Fri" },
  { bit: 6, label: "Sat" },
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [heightCm, setHeightCm] = useState(165);
  const [weightKg, setWeightKg] = useState(70);
  const [bodyType, setBodyType] = useState<BodyType>("mesomorph");

  const [targetWeightKg, setTargetWeightKg] = useState(65);
  const [goalDate, setGoalDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().slice(0, 10);
  });

  const [periodEnabled, setPeriodEnabled] = useState(true);
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
  const [machinesRaw, setMachinesRaw] = useState("cable, dumbbells, leg press, treadmill");

  const [uniDays, setUniDays] = useState<number[]>([1, 3]);
  const [uniDayMode, setUniDayMode] = useState<UniDayMode>("home");
  const [sessionTotalMin, setSessionTotalMin] = useState(38);
  const [warmupMin, setWarmupMin] = useState(5);
  const [cardioAfterMin, setCardioAfterMin] = useState(10);
  const [cardioAfterMax, setCardioAfterMax] = useState(15);
  const [deloadEveryWeeks, setDeloadEveryWeeks] = useState(4);
  const [stepsGoal, setStepsGoal] = useState(10000);

  const [batchCooking, setBatchCooking] = useState(true);

  if (!user) return null;

  const bmi = computeBmi(weightKg, heightCm);
  const bmiCat = bmiCategory(bmi);
  const guidance = bmiGuidance(bmi, bmiCat);
  const safety = evaluateGoalSafety(weightKg, targetWeightKg, goalDate);

  const machines = machinesRaw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const cardioMinutesRecommended = likesCardio ? Math.min(40, 15 + daysPerWeek * 5) : 12;

  function toggleUniDay(d: number) {
    setUniDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  async function finish() {
    if (!user) return;
    setErr(null);
    const nutrition = buildNutritionTargets(
      weightKg,
      heightCm,
      weightKg,
      targetWeightKg,
      goalDate,
      bodyType,
      batchCooking
    );
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
    const weeklySchedule = buildWeeklySchedule(gym);
    const dash = buildDashboardCopy({
      bmiCategory: bmiCat,
      foodLikes,
      gym,
      nutrition,
    });
    const now = new Date().toISOString();
    const period: PeriodTracking = periodEnabled
      ? {
          enabled: true,
          cycleLengthDays,
          ...(lastPeriodStart.trim() ? { lastPeriodStart: lastPeriodStart.trim() } : {}),
        }
      : { enabled: false, cycleLengthDays: 28 };
    const profile: UserProfile = {
      displayName: displayName.trim() || user.displayName || "Athlete",
      heightCm,
      weightKg,
      bodyType,
      targetWeightKg,
      goalDate,
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
      mealAssignments: emptyMealSlots(),
      onboardingComplete: true,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveProfile(user.uid, profile);
      await refreshProfile();
      nav("/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile");
    }
  }

  return (
    <div className="app-shell">
      <p className="pill">Step {step + 1} / 6</p>
      <h1>Your profile</h1>
      {err && <div className="error-banner">{err}</div>}

      {step === 0 && (
        <div className="card stack">
          <label>Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          <label>Height (cm)</label>
          <input
            type="number"
            min={120}
            max={230}
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
          />
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
            <option value="ectomorph">Ectomorph (leaner, harder to gain)</option>
            <option value="mesomorph">Mesomorph (muscular, moderate)</option>
            <option value="endomorph">Endomorph (softer, gains easier)</option>
            <option value="unsure">Not sure</option>
          </select>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(1)}>
            Next
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card stack">
          <h2>BMI</h2>
          <p>
            Your BMI is <strong>{bmi}</strong> — <span className="pill">{bmiCat}</span>
          </p>
          <p className="muted">{guidance}</p>
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card stack">
          <h2>Goal & timeline</h2>
          <label>Target weight (kg)</label>
          <input
            type="number"
            min={35}
            max={250}
            step={0.1}
            value={targetWeightKg}
            onChange={(e) => setTargetWeightKg(Number(e.target.value))}
          />
          <label>Target month / date</label>
          <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
          <p className={safety.safe ? "success-banner" : "error-banner"} style={{ marginTop: "0.5rem" }}>
            {safety.safe ? "Looks reasonable: " : "Heads up: "}
            {safety.message}
          </p>
          <p className="muted">Max sustainable pace we use: ~{(safety.maxWeeklyLossKg * 2.2).toFixed(2)} lb/week.</p>

          <h3 style={{ marginTop: "1rem", marginBottom: "0.35rem" }}>Cycle tracking</h3>
          <label className="row" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            <input
              type="checkbox"
              checked={periodEnabled}
              onChange={(e) => setPeriodEnabled(e.target.checked)}
              style={{ width: "auto", marginRight: "0.5rem" }}
            />
            Track period (for lighter training / recovery cues)
          </label>
          {periodEnabled && (
            <>
              <label>Typical cycle length (days)</label>
              <input
                type="number"
                min={21}
                max={40}
                value={cycleLengthDays}
                onChange={(e) => setCycleLengthDays(Number(e.target.value))}
              />
              <label>Last period start (optional)</label>
              <input type="date" value={lastPeriodStart} onChange={(e) => setLastPeriodStart(e.target.value)} />
            </>
          )}

          <div className="row" style={{ marginTop: "0.75rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
              {safety.safe ? "Next" : "I understand — continue"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card stack">
          <h2>Food preferences</h2>
          <label>What do you like to eat?</label>
          <textarea value={foodLikes} onChange={(e) => setFoodLikes(e.target.value)} placeholder="e.g. spicy, Mediterranean, high protein…" />
          <label>Favorites</label>
          <textarea value={favoriteFoods} onChange={(e) => setFavoriteFoods(e.target.value)} placeholder="Meals you want often" />
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card stack">
          <h2>Gym, uni days & session shape</h2>
          <label>Strength days / week (on non-uni days first)</label>
          <input
            type="number"
            min={2}
            max={6}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
          />
          <label>Main gym window start</label>
          <input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
          <label>Main gym window end</label>
          <input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
          <label>Evening window (if you use evening gym on busy days)</label>
          <div className="row">
            <input type="time" value={eveningWindowStart} onChange={(e) => setEveningWindowStart(e.target.value)} />
            <span className="muted" style={{ alignSelf: "center" }}>
              –
            </span>
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
          <label>On those days I will…</label>
          <select value={uniDayMode} onChange={(e) => setUniDayMode(e.target.value as UniDayMode)}>
            <option value="home">Train at home / bands only (no gym)</option>
            <option value="evening_gym">Use the evening gym window</option>
            <option value="rest">Rest / walk only</option>
          </select>
          <label>Total session length target (min)</label>
          <input
            type="number"
            min={25}
            max={75}
            value={sessionTotalMin}
            onChange={(e) => setSessionTotalMin(Number(e.target.value))}
          />
          <label>Warm-up (min)</label>
          <input type="number" min={3} max={20} value={warmupMin} onChange={(e) => setWarmupMin(Number(e.target.value))} />
          <label>Cardio after weights (min, range)</label>
          <div className="row">
            <input type="number" min={5} max={30} value={cardioAfterMin} onChange={(e) => setCardioAfterMin(Number(e.target.value))} />
            <span className="muted" style={{ alignSelf: "center" }}>
              –
            </span>
            <input type="number" min={5} max={45} value={cardioAfterMax} onChange={(e) => setCardioAfterMax(Number(e.target.value))} />
          </div>
          <label>Deload / easier week every (weeks)</label>
          <input
            type="number"
            min={2}
            max={8}
            value={deloadEveryWeeks}
            onChange={(e) => setDeloadEveryWeeks(Number(e.target.value))}
          />
          <label>Daily steps goal</label>
          <input type="number" min={3000} max={20000} step={500} value={stepsGoal} onChange={(e) => setStepsGoal(Number(e.target.value))} />
          <label>Where do you train?</label>
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
            I want structured cardio beyond the post-lift finisher
          </label>
          <p className="muted">
            Post-lift cardio band: {cardioAfterMin}–{cardioAfterMax} min. Weekly easy cardio (if enabled): ~
            {cardioMinutesRecommended} min.
          </p>
          <label>Machines / equipment (comma separated)</label>
          <textarea value={machinesRaw} onChange={(e) => setMachinesRaw(e.target.value)} />
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card stack">
          <h2>Meals</h2>
          <label>
            <input
              type="checkbox"
              checked={batchCooking}
              onChange={(e) => setBatchCooking(e.target.checked)}
              style={{ width: "auto", marginRight: "0.5rem" }}
            />
            Open to batch cooking (2–3 anchors per week)
          </label>
          <p className="muted">
            Slots include pre-morning, breakfast, lunch, dinner, snacks, drinks, bedtime tea, and nighttime tea. Assign
            recipes after onboarding.
          </p>
          <div className="card" style={{ background: "var(--bg)" }}>
            <strong>Plan preview</strong>
            <p className="muted" style={{ marginBottom: 0, fontSize: "0.85rem" }}>
              {buildGymPlanText({
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
              })}
            </p>
          </div>
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(4)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void finish()}>
              Save & open dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
