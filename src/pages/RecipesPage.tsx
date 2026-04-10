import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import recipeSeed from "@/data/recipes.json";
import {
  importDatasetRecipes,
  listUserRecipes,
  todayIso,
} from "@/firebase/userDoc";
import type { JsonRecipeRow } from "@/lib/recipeMapping";
import { assignRecipeToMealPlan, ASSIGN_SLOT_LABELS } from "@/lib/recipeAssign";
import { formatMonthDay } from "@/lib/dateIso";
import type { MealSlotId, UserRecipe } from "@/types/profile";
import { MEAL_SLOT_ORDER } from "@/lib/mealSlotOrder";
import { RECIPE_DATASET_VERSION, RECIPE_DATASET_VERSION_KEY } from "@/lib/recipeDatasetVersion";
import { isFoodLogSmartPortionTemplate } from "@/lib/userRecipeFilters";
import RecipeDetailModal, { RecipeMeta } from "@/components/RecipeDetailModal";

function asRecipeRows(raw: unknown): JsonRecipeRow[] {
  if (!Array.isArray(raw)) return [];
  return raw as JsonRecipeRow[];
}

const SEED_ROWS = asRecipeRows(recipeSeed);

const PAGE_SIZE = 24;

function recipeMatchesSearch(r: UserRecipe, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  if (r.name.toLowerCase().includes(n)) return true;
  if (r.instructions?.toLowerCase().includes(n)) return true;
  if (r.category?.toLowerCase().includes(n)) return true;
  for (const ing of r.ingredients ?? []) {
    if (ing.toLowerCase().includes(n)) return true;
  }
  return false;
}

export default function RecipesPage() {
  const { user, profile, refreshProfile, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const planDate = useMemo(() => {
    const d = searchParams.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return todayIso();
  }, [searchParams]);
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "dataset" | "user">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [calMin, setCalMin] = useState<string>("");
  const [calMax, setCalMax] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [assignSlot, setAssignSlot] = useState<MealSlotId>("breakfast");
  const [modalRecipe, setModalRecipe] = useState<UserRecipe | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setMsg(null);
      try {
        let list = await listUserRecipes(user.uid);
        if (cancelled) return;
        const storedV = localStorage.getItem(RECIPE_DATASET_VERSION_KEY);
        const needsSync =
          SEED_ROWS.length > 0 && (list.length === 0 || storedV !== RECIPE_DATASET_VERSION);
        if (needsSync) {
          setSeeding(true);
          await importDatasetRecipes(user.uid, SEED_ROWS);
          localStorage.setItem(RECIPE_DATASET_VERSION_KEY, RECIPE_DATASET_VERSION);
          list = await listUserRecipes(user.uid);
        }
        if (!cancelled) {
          setRecipes(list);
          if (list.length === 0 && SEED_ROWS.length === 0) {
            setMsg("No recipe seed data bundled. Add data/recipes_updated.json and rebuild.");
          }
        }
      } catch (e) {
        if (!cancelled) setMsg(e instanceof Error ? e.message : "Could not load recipes");
      } finally {
        if (!cancelled) setSeeding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of recipes) s.add(r.category);
    return ["all", ...Array.from(s).sort()];
  }, [recipes]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (sourceFilter === "dataset") list = list.filter((r) => r.origin === "dataset");
    if (sourceFilter === "user")
      list = list.filter((r) => r.origin === "user" && !isFoodLogSmartPortionTemplate(r));
    if (catFilter !== "all") list = list.filter((r) => r.category === catFilter);
    const minN = calMin.trim() === "" ? null : Number(calMin);
    const maxN = calMax.trim() === "" ? null : Number(calMax);
    if (minN !== null && !Number.isNaN(minN)) list = list.filter((r) => r.calories >= minN);
    if (maxN !== null && !Number.isNaN(maxN)) list = list.filter((r) => r.calories <= maxN);
    list = list.filter((r) => recipeMatchesSearch(r, searchQuery));
    return list;
  }, [recipes, sourceFilter, catFilter, calMin, calMax, searchQuery]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filtered.length, searchQuery, sourceFilter, catFilter, calMin, calMax]);

  const visibleRecipes = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || visibleCount >= filtered.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, visibleCount, filtered.length]);

  async function assign(r: UserRecipe) {
    if (!user || !profile) return;
    setMsg(null);
    const res = await assignRecipeToMealPlan({
      uid: user.uid,
      profile,
      recipe: r,
      planDate,
      assignSlot,
    });
    if (!res.ok) {
      if (res.message !== "Cancelled.") setMsg(res.message);
      return;
    }
    await refreshProfile();
    setMsg(`Saved to ${ASSIGN_SLOT_LABELS[assignSlot]} for ${formatMonthDay(planDate)} (${planDate}).`);
    setModalRecipe(null);
  }

  const ownerName = profile?.displayName?.trim() || "You";

  return (
    <div className="app-shell">
      <h1 className="app-page-title">Recipes</h1>
      <p className="page-lead">
        Search by name or ingredient. Plan library is built-in; <strong>My own</strong> lists dishes you saved (e.g. manual
        meals) — not smart-portion calculator templates. Tap a card for details, or use + to assign to the slot below for{" "}
        <strong>{formatMonthDay(planDate)}</strong> ({planDate}).
      </p>
      <p style={{ margin: "-0.35rem 0 0.75rem", fontSize: "0.88rem" }}>
        <Link to={`/meals?date=${encodeURIComponent(planDate)}`} style={{ color: "var(--accent)" }}>
          Change day on Meals
        </Link>
      </p>

      {seeding && <p className="page-lead" style={{ marginTop: "-0.5rem" }}>Updating recipe library…</p>}

      {msg && (msg.startsWith("Saved") ? <div className="success-banner">{msg}</div> : <div className="error-banner">{msg}</div>)}

      <div className="card stack">
        <label htmlFor="recipe-search">Search recipes</label>
        <input
          id="recipe-search"
          type="search"
          placeholder="Name, ingredient, or keyword…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
        <label>Source</label>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "all" | "dataset" | "user")}>
          <option value="all">All sources</option>
          <option value="dataset">Plan library (inbuilt)</option>
          <option value="user">My own</option>
        </select>
        <label>Assign to meal slot</label>
        <select value={assignSlot} onChange={(e) => setAssignSlot(e.target.value as MealSlotId)}>
          {MEAL_SLOT_ORDER.map((k) => (
            <option key={k} value={k}>
              {ASSIGN_SLOT_LABELS[k]} ({profile?.nutrition.slotCalories[k] ?? "—"} kcal)
            </option>
          ))}
        </select>
        <label>Filter by category</label>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
        <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 8rem" }}>
            <label>Min kcal</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Any"
              value={calMin}
              onChange={(e) => setCalMin(e.target.value)}
            />
          </div>
          <div style={{ flex: "1 1 8rem" }}>
            <label>Max kcal</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Any"
              value={calMax}
              onChange={(e) => setCalMax(e.target.value)}
            />
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
          Showing {visibleRecipes.length} of {filtered.length} match{filtered.length === 1 ? "" : "es"}
          {recipes.length > 0 && ` · ${recipes.length} total in library`}
        </p>
      </div>

      {isAdmin && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
          <Link to="/admin/recipes" style={{ color: "var(--accent)" }}>
            Admin: edit or delete recipes
          </Link>
        </p>
      )}

      <div className="recipe-grid recipe-grid--cards">
        {visibleRecipes.map((r) => (
          <div key={r.id} className="recipe-card-tile">
            <div className="recipe-card-tile__head">
              <button type="button" className="recipe-card-tile__title-btn" onClick={() => setModalRecipe(r)}>
                {r.name}
              </button>
              <button
                type="button"
                className="recipe-card-tile__plus"
                title={`Add to ${ASSIGN_SLOT_LABELS[assignSlot]}`}
                onClick={() => void assign(r)}
              >
                +
              </button>
            </div>
            <button type="button" className="recipe-card-tile__body-btn" onClick={() => setModalRecipe(r)}>
              <RecipeMeta r={r} ownerName={r.origin === "user" ? ownerName : undefined} />
              <div className="recipe-card-tile__metrics">
                <div className="recipe-metric">
                  <span className="recipe-metric__v">{r.calories}</span>
                  <span className="recipe-metric__u">kcal</span>
                </div>
                <div className="recipe-metric">
                  <span className="recipe-metric__v">{r.proteinG}</span>
                  <span className="recipe-metric__u">Protein (g)</span>
                </div>
                <div className="recipe-metric">
                  <span className="recipe-metric__v">{r.carbsG}</span>
                  <span className="recipe-metric__u">Carbs (g)</span>
                </div>
                <div className="recipe-metric">
                  <span className="recipe-metric__v">{r.fatG}</span>
                  <span className="recipe-metric__u">Fat (g)</span>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {filtered.length > visibleRecipes.length && (
        <div ref={loadMoreSentinelRef} className="recipe-load-sentinel" aria-hidden>
          <p className="muted" style={{ textAlign: "center", fontSize: "0.85rem", margin: "0.5rem 0" }}>
            Scroll for more…
          </p>
        </div>
      )}

      {!seeding && filtered.length === 0 && recipes.length > 0 && (
        <p className="muted">No recipes match your filters. Try another search or source.</p>
      )}

      {!seeding && filtered.length === 0 && recipes.length === 0 && (
        <p className="muted">No recipes yet. They will appear after the library sync finishes.</p>
      )}

      <RecipeDetailModal
        recipe={modalRecipe}
        onClose={() => setModalRecipe(null)}
        assignSlotLabel={ASSIGN_SLOT_LABELS[assignSlot]}
        onAssign={assign}
        recipeOwnerName={modalRecipe?.origin === "user" ? ownerName : undefined}
      />
    </div>
  );
}
