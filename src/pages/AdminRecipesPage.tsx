import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  deleteUserRecipe,
  importDatasetRecipes,
  listUserRecipes,
  setUserRecipeFull,
} from "@/firebase/userDoc";
import { parseBulkRecipeJson } from "@/lib/bulkRecipeJson";
import type { MealSlotId, RecipeTag, UserRecipe, UserRecipeDoc } from "@/types/profile";
import { MEAL_SLOT_ORDER } from "@/lib/mealSlotOrder";
import NumericInput from "@/components/NumericInput";

const slotLabels: Record<MealSlotId, string> = {
  preMorning: "Pre-morning",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
  bedtimeTea: "Bedtime tea (fat loss)",
  nighttimeTea: "Evening tea",
};

export default function AdminRecipesPage() {
  const { user, isAdmin, refreshProfile } = useAuth();
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRecipe | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadRecipes = useCallback(async () => {
    if (!user) return;
    const list = await listUserRecipes(user.uid);
    setRecipes(list);
  }, [user]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of recipes) s.add(r.category);
    return ["all", ...Array.from(s).sort()];
  }, [recipes]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (catFilter !== "all") list = list.filter((r) => r.category === catFilter);
    return list;
  }, [recipes, catFilter]);

  async function removeFirestore(r: UserRecipe) {
    if (!user) return;
    if (!confirm(`Delete “${r.name}” from your library?`)) return;
    await deleteUserRecipe(user.uid, r.id);
    await loadRecipes();
    await refreshProfile();
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

  async function runBulkImport() {
    if (!user) return;
    const parsed = parseBulkRecipeJson(bulkText);
    if (!parsed.ok) {
      setMsg(parsed.error);
      return;
    }
    setBulkBusy(true);
    setMsg(null);
    try {
      const { count } = await importDatasetRecipes(user.uid, parsed.rows);
      await loadRecipes();
      setMsg(`Imported ${count} recipes from JSON (merged into dataset docs ds-*).`);
      setBulkText("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  const msgIsSuccess =
    msg &&
    (/imported|deleted|updated/i.test(msg) || msg.includes("merged into dataset"));

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="app-shell">
        <h1 className="app-page-title">Admin recipes</h1>
        <p className="page-lead">You don’t have access to edit the recipe library.</p>
        <Link to="/recipes" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="app-page-title">Edit recipes (admin)</h1>
          <p className="page-lead" style={{ marginBottom: "0.5rem" }}>
            Change or remove items in your Firestore library. Regular users manage assignments on the Recipes page only.
          </p>
        </div>
        <Link to="/recipes" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          Done
        </Link>
      </div>

      {msg && <div className={msgIsSuccess ? "success-banner" : "error-banner"}>{msg}</div>}

      <div className="card stack">
        <h2 style={{ marginTop: 0 }}>Bulk update from JSON</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem", lineHeight: 1.45 }}>
          Paste the same format as <code style={{ fontSize: "0.8rem" }}>data/recipes_updated.json</code>: an array of
          objects with <code style={{ fontSize: "0.8rem" }}>id</code>, <code style={{ fontSize: "0.8rem" }}>name</code>,{" "}
          <code style={{ fontSize: "0.8rem" }}>category</code>, <code style={{ fontSize: "0.8rem" }}>calories</code>,{" "}
          <code style={{ fontSize: "0.8rem" }}>protein_g</code>, <code style={{ fontSize: "0.8rem" }}>carbs_g</code>,{" "}
          <code style={{ fontSize: "0.8rem" }}>fat_g</code>, <code style={{ fontSize: "0.8rem" }}>ingredients</code>,{" "}
          <code style={{ fontSize: "0.8rem" }}>instructions</code>, <code style={{ fontSize: "0.8rem" }}>source</code>.
          Documents are written as <code style={{ fontSize: "0.8rem" }}>ds-{"{id}"}</code> and merge with existing data.
        </p>
        <label htmlFor="bulk-json-file">Load from file</label>
        <input
          id="bulk-json-file"
          type="file"
          accept=".json,application/json"
          style={{ marginBottom: "0.65rem" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            void f.text().then(setBulkText);
            e.target.value = "";
          }}
        />
        <label htmlFor="bulk-json-text">JSON</label>
        <textarea
          id="bulk-json-text"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder='[ { "id": 1, "name": "...", ... }, ... ]'
          style={{ minHeight: 140, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}
        />
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={bulkBusy || !bulkText.trim()} onClick={() => void runBulkImport()}>
            {bulkBusy ? "Importing…" : "Import / merge into Firestore"}
          </button>
        </div>
      </div>

      <div className="card stack">
        <label>Filter by category</label>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="stack">
        {filtered.map((r) => (
          <div key={r.id} className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong>{r.name}</strong>
                <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
                  {r.calories} kcal · P {r.proteinG} · C {r.carbsG} · F {r.fatG} · {r.category}
                </p>
              </div>
              <div className="row" style={{ gap: "0.35rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing({ ...r })}>
                  Edit
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void removeFirestore(r)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div key={editing.id} className="card stack" style={{ borderColor: "var(--accent)" }}>
          <h2 style={{ marginTop: 0 }}>Edit recipe</h2>
          <label>Name</label>
          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <label>Category</label>
          <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            <div className="row">
            <div style={{ flex: 1 }}>
              <label>Calories</label>
              <NumericInput
                min={1}
                value={editing.calories}
                onValueChange={(n) => setEditing({ ...editing, calories: n })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Protein</label>
              <NumericInput
                min={0}
                value={editing.proteinG}
                onValueChange={(n) => setEditing({ ...editing, proteinG: n })}
              />
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Carbs</label>
              <NumericInput
                min={0}
                value={editing.carbsG}
                onValueChange={(n) => setEditing({ ...editing, carbsG: n })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Fat</label>
              <NumericInput
                min={0}
                value={editing.fatG}
                onValueChange={(n) => setEditing({ ...editing, fatG: n })}
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
            {MEAL_SLOT_ORDER.map((t) => (
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
            {(["lunch", "dinner", "snacks", "anti-inflammatory", "batch", "tea", "original"] as RecipeTag[]).map((t) => (
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
