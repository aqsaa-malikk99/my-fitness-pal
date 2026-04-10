import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import recipeSeed from "@/data/recipes.json";
import {
  deleteUserRecipe,
  importDatasetRecipes,
  listUserRecipes,
  saveProfile,
  setUserRecipeFull,
} from "@/firebase/userDoc";
import type { JsonRecipeRow } from "@/lib/recipeMapping";
import type { MealSlotId, RecipeTag, UserRecipe, UserRecipeDoc } from "@/types/profile";

const slotLabels: Record<MealSlotId, string> = {
  preMorning: "Pre-morning",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
  bedtimeTea: "Bedtime tea",
  nighttimeTea: "Nighttime tea",
};

const TAG_OPTS: { id: RecipeTag | "all"; label: string }[] = [
  { id: "all", label: "All tags" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
  { id: "anti-inflammatory", label: "Anti-inflammatory" },
  { id: "batch", label: "Batch cooking" },
];

function asRecipeRows(raw: unknown): JsonRecipeRow[] {
  if (!Array.isArray(raw)) return [];
  return raw as JsonRecipeRow[];
}

const SEED_ROWS = asRecipeRows(recipeSeed);

export default function RecipesPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<MealSlotId | "all">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<RecipeTag | "all">("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [assignSlot, setAssignSlot] = useState<MealSlotId>("breakfast");
  const [editing, setEditing] = useState<UserRecipe | null>(null);

  const loadRecipes = useCallback(async () => {
    if (!user) return;
    const list = await listUserRecipes(user.uid);
    setRecipes(list);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setMsg(null);
      try {
        let list = await listUserRecipes(user.uid);
        if (cancelled) return;
        if (list.length === 0 && SEED_ROWS.length > 0) {
          setSeeding(true);
          await importDatasetRecipes(user.uid, SEED_ROWS);
          list = await listUserRecipes(user.uid);
        }
        if (!cancelled) {
          setRecipes(list);
          if (list.length === 0 && SEED_ROWS.length === 0) {
            setMsg("No recipe seed data bundled. Add src/data/recipes.json and rebuild.");
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
    if (filter !== "all") list = list.filter((r) => r.mealTypes.includes(filter));
    if (catFilter !== "all") list = list.filter((r) => r.category === catFilter);
    if (tagFilter !== "all") list = list.filter((r) => r.tags?.includes(tagFilter));
    return list;
  }, [recipes, filter, catFilter, tagFilter]);

  async function assign(r: UserRecipe) {
    if (!user || !profile) return;
    setMsg(null);
    const cap = profile.nutrition.slotCalories[assignSlot];
    if (r.calories > cap) {
      setMsg(`"${r.name}" is ${r.calories} kcal but your ${slotLabels[assignSlot]} budget is ${cap} kcal.`);
      return;
    }
    const next = {
      ...profile,
      mealAssignments: {
        ...profile.mealAssignments,
        [assignSlot]: {
          recipeId: r.id,
          recipeName: r.name,
          calories: r.calories,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(user.uid, next);
    await refreshProfile();
    setMsg(`Saved to ${slotLabels[assignSlot]}.`);
  }

  async function removeFirestore(r: UserRecipe) {
    if (!user) return;
    if (!confirm(`Delete “${r.name}” from your library?`)) return;
    await deleteUserRecipe(user.uid, r.id);
    await loadRecipes();
    setMsg("Recipe deleted.");
    if (editing?.id === r.id) setEditing(null);
  }

  async function saveEdit() {
    if (!user || !editing) return;
    const docData: UserRecipeDoc = {
      origin: editing.origin,
      sourceId: editing.sourceId,
      name: editing.name.trim(),
      category: editing.category.trim(),
      calories: editing.calories,
      proteinG: editing.proteinG,
      carbsG: editing.carbsG,
      fatG: editing.fatG,
      ingredients: editing.ingredients,
      instructions: editing.instructions.trim(),
      source: editing.source,
      mealTypes: editing.mealTypes.length ? editing.mealTypes : ["lunch"],
      tags: editing.tags?.length ? editing.tags : undefined,
      createdAt: editing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await setUserRecipeFull(user.uid, editing.id, docData);
    await loadRecipes();
    setEditing(null);
    setMsg("Recipe updated.");
  }

  function toggleTypeEdit(t: MealSlotId) {
    if (!editing) return;
    setEditing({
      ...editing,
      mealTypes: editing.mealTypes.includes(t)
        ? editing.mealTypes.filter((x) => x !== t)
        : [...editing.mealTypes, t],
    });
  }

  function toggleTagEdit(t: RecipeTag) {
    if (!editing) return;
    const cur = editing.tags ?? [];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    setEditing({ ...editing, tags: next.length ? next : undefined });
  }

  return (
    <div className="app-shell">
      <h1>Recipes</h1>
      <p className="muted" style={{ fontSize: "0.88rem" }}>
        Recipes are stored in Firestore under <code style={{ fontSize: "0.78rem" }}>users/…/recipes</code>. On first
        open, the bundled <code style={{ fontSize: "0.78rem" }}>recipes.json</code> is written once if your library is
        empty.
      </p>

      {seeding && <p className="muted">Syncing recipe library to your account…</p>}

      {msg && (msg.startsWith("Saved") || msg.includes("updated") || msg.includes("deleted") ? <div className="success-banner">{msg}</div> : <div className="error-banner">{msg}</div>)}

      <div className="card stack">
        <label>Assign recipes to</label>
        <select value={assignSlot} onChange={(e) => setAssignSlot(e.target.value as MealSlotId)}>
          {(Object.keys(slotLabels) as MealSlotId[]).map((k) => (
            <option key={k} value={k}>
              {slotLabels[k]} ({profile?.nutrition.slotCalories[k] ?? "—"} kcal)
            </option>
          ))}
        </select>
        <label>Filter by slot</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All slots</option>
          {(Object.keys(slotLabels) as MealSlotId[]).map((k) => (
            <option key={k} value={k}>
              {slotLabels[k]}
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
        <label>Filter by tag</label>
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value as typeof tagFilter)}>
          {TAG_OPTS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="recipe-grid">
        {filtered.map((r) => (
          <div key={r.id} className="card recipe-item">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{r.name}</strong>
              <span className="pill">{r.calories} kcal</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              P {r.proteinG} · C {r.carbsG} · F {r.fatG}
              {r.category && ` · ${r.category}`}
            </p>
            {r.tags && r.tags.length > 0 && (
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}>
                {r.tags.map((t) => (
                  <span key={t} className="pill" style={{ marginRight: "0.25rem" }}>
                    {t}
                  </span>
                ))}
              </p>
            )}
            {r.ingredients && r.ingredients.length > 0 && (
              <details style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                <summary>Ingredients</summary>
                <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
                  {r.ingredients.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </details>
            )}
            {r.instructions && r.instructions !== "—" && (
              <details style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                <summary>Instructions</summary>
                <p style={{ margin: "0.35rem 0 0" }}>{r.instructions}</p>
              </details>
            )}
            <div className="slot-actions">
              <button type="button" className="btn btn-primary" onClick={() => void assign(r)}>
                Add to {slotLabels[assignSlot]}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing({ ...r })}>
                Edit
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void removeFirestore(r)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!seeding && filtered.length === 0 && recipes.length === 0 && (
        <p className="muted">No recipes yet. They will appear after the first sync finishes.</p>
      )}

      {editing && (
        <div className="card stack" style={{ borderColor: "var(--accent)" }}>
          <h2 style={{ marginTop: 0 }}>Edit recipe</h2>
          <label>Name</label>
          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <label>Category</label>
          <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Calories</label>
              <input
                type="number"
                min={1}
                value={editing.calories}
                onChange={(e) => setEditing({ ...editing, calories: Number(e.target.value) })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Protein</label>
              <input
                type="number"
                min={0}
                value={editing.proteinG}
                onChange={(e) => setEditing({ ...editing, proteinG: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Carbs</label>
              <input
                type="number"
                min={0}
                value={editing.carbsG}
                onChange={(e) => setEditing({ ...editing, carbsG: Number(e.target.value) })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Fat</label>
              <input
                type="number"
                min={0}
                value={editing.fatG}
                onChange={(e) => setEditing({ ...editing, fatG: Number(e.target.value) })}
              />
            </div>
          </div>
          <label>Ingredients (one per line)</label>
          <textarea
            value={editing.ingredients.join("\n")}
            onChange={(e) =>
              setEditing({
                ...editing,
                ingredients: e.target.value
                  .split(/\n+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <label>Instructions</label>
          <textarea value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
          <label>Meal slots</label>
          <div className="row">
            {(Object.keys(slotLabels) as MealSlotId[]).map((t) => (
              <label key={t} className="row" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                <input
                  type="checkbox"
                  checked={editing.mealTypes.includes(t)}
                  onChange={() => toggleTypeEdit(t)}
                  style={{ width: "auto" }}
                />
                {slotLabels[t]}
              </label>
            ))}
          </div>
          <label>Tags</label>
          <div className="row">
            {(["lunch", "dinner", "snacks", "anti-inflammatory", "batch"] as RecipeTag[]).map((t) => (
              <label key={t} className="row" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                <input
                  type="checkbox"
                  checked={!!editing.tags?.includes(t)}
                  onChange={() => toggleTagEdit(t)}
                  style={{ width: "auto" }}
                />
                {t}
              </label>
            ))}
          </div>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => void saveEdit()}>
              Save changes
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
