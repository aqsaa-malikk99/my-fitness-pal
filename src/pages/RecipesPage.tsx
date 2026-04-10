import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_RECIPES } from "@/data/defaultRecipes";
import { PHOTO_RECIPES } from "@/data/photoRecipes";
import {
  addUserRecipe,
  deleteUserRecipe,
  importDatasetRecipes,
  listCustomRecipes,
  listUserRecipes,
  saveProfile,
  setUserRecipeFull,
} from "@/firebase/userDoc";
import type { JsonRecipeRow } from "@/lib/recipeMapping";
import type { CustomRecipe, MealSlotId, RecipeTag, UserRecipe, UserRecipeDoc } from "@/types/profile";

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

type Combined = {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealTypes: MealSlotId[];
  source: "local" | "online";
  url?: string;
  isCustom?: boolean;
  fromFirestore?: boolean;
  firestoreId?: string;
  tags?: string[];
  sourceFile?: string;
  category?: string;
  ingredients?: string[];
  instructions?: string;
  origin?: "dataset" | "user";
};

const TAG_OPTS: { id: RecipeTag | "all"; label: string }[] = [
  { id: "all", label: "All tags" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
  { id: "anti-inflammatory", label: "Anti-inflammatory" },
  { id: "batch", label: "Batch cooking" },
];

function resolveRecipeId(r: Combined): string {
  if (r.fromFirestore && r.firestoreId) return r.firestoreId;
  if (r.isCustom) return r.id.replace("custom:", "");
  return r.id;
}

export default function RecipesPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [custom, setCustom] = useState<CustomRecipe[]>([]);
  const [fromFs, setFromFs] = useState<UserRecipe[]>([]);
  const [filter, setFilter] = useState<MealSlotId | "all">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<RecipeTag | "all">("all");
  const [showStarter, setShowStarter] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [assignSlot, setAssignSlot] = useState<MealSlotId>("breakfast");
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<UserRecipe | null>(null);

  const [newName, setNewName] = useState("");
  const [newCal, setNewCal] = useState(300);
  const [newP, setNewP] = useState(25);
  const [newC, setNewC] = useState(30);
  const [newF, setNewF] = useState(10);
  const [newTypes, setNewTypes] = useState<MealSlotId[]>(["lunch"]);
  const [newTags, setNewTags] = useState<RecipeTag[]>([]);
  const [newCategory, setNewCategory] = useState("Custom");
  const [newIngredients, setNewIngredients] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newNote, setNewNote] = useState("");

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [c, fs] = await Promise.all([listCustomRecipes(user.uid), listUserRecipes(user.uid)]);
    setCustom(c);
    setFromFs(fs);
  }, [user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of fromFs) s.add(r.category);
    return ["all", ...Array.from(s).sort()];
  }, [fromFs]);

  const combined = useMemo((): Combined[] => {
    const fsCombined: Combined[] = fromFs.map((r) => ({
      id: `fs:${r.id}`,
      firestoreId: r.id,
      fromFirestore: true,
      name: r.name,
      calories: r.calories,
      proteinG: r.proteinG,
      carbsG: r.carbsG,
      fatG: r.fatG,
      mealTypes: r.mealTypes,
      source: "local",
      tags: r.tags?.map(String),
      category: r.category,
      ingredients: r.ingredients,
      instructions: r.instructions,
      origin: r.origin,
    }));
    const photo = PHOTO_RECIPES.map((r) => ({
      ...r,
      isCustom: false as const,
      tags: r.tags?.map(String),
      sourceFile: r.sourceFile,
    }));
    const base = DEFAULT_RECIPES.map((r) => ({ ...r, isCustom: false as const }));
    const c = custom.map((r) => ({
      id: `custom:${r.id}`,
      name: r.name,
      calories: r.calories,
      proteinG: r.proteinG ?? 0,
      carbsG: r.carbsG ?? 0,
      fatG: r.fatG ?? 0,
      mealTypes: r.mealTypes,
      source: "local" as const,
      isCustom: true as const,
      url: r.sourceNote,
      tags: r.tags?.map(String),
    }));
    const starter = showStarter ? [...photo, ...base] : [];
    return [...fsCombined, ...c, ...starter];
  }, [fromFs, custom, showStarter]);

  const filtered = useMemo(() => {
    let rows = combined;
    if (filter !== "all") rows = rows.filter((r) => r.mealTypes.includes(filter));
    if (catFilter !== "all") rows = rows.filter((r) => r.category === catFilter);
    if (tagFilter !== "all") rows = rows.filter((r) => r.tags?.includes(tagFilter));
    return rows;
  }, [combined, filter, catFilter, tagFilter]);

  async function assign(recipe: Combined) {
    if (!user || !profile) return;
    setMsg(null);
    const cap = profile.nutrition.slotCalories[assignSlot];
    if (recipe.calories > cap) {
      setMsg(
        `"${recipe.name}" is ${recipe.calories} kcal but your ${slotLabels[assignSlot]} budget is ${cap} kcal.`
      );
      return;
    }
    const rid = resolveRecipeId(recipe);
    const next = {
      ...profile,
      mealAssignments: {
        ...profile.mealAssignments,
        [assignSlot]: {
          recipeId: rid,
          recipeName: recipe.name,
          calories: recipe.calories,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(user.uid, next);
    await refreshProfile();
    setMsg(`Saved to ${slotLabels[assignSlot]}.`);
  }

  async function importJson() {
    if (!user) return;
    setMsg(null);
    setImporting(true);
    try {
      const res = await fetch("/data/recipes.json");
      if (!res.ok) {
        setMsg(
          "Could not load /data/recipes.json. Run npm run sync:recipes (copies data/recipes.json into public for the app)."
        );
        return;
      }
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        setMsg("Invalid recipes.json format.");
        return;
      }
      const { count } = await importDatasetRecipes(user.uid, data as JsonRecipeRow[]);
      await loadAll();
      setMsg(`Imported ${count} recipes to your Firestore library.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function addOwn() {
    if (!user || !newName.trim()) return;
    const ingredients = newIngredients
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await addUserRecipe(user.uid, {
      origin: "user",
      name: newName.trim(),
      category: newCategory.trim() || "Custom",
      calories: newCal,
      proteinG: newP,
      carbsG: newC,
      fatG: newF,
      ingredients,
      instructions: newInstructions.trim() || "—",
      source: newNote.trim() || "user",
      mealTypes: newTypes.length ? newTypes : ["lunch"],
      tags: newTags.length ? newTags : undefined,
    });
    setNewName("");
    setNewIngredients("");
    setNewInstructions("");
    await loadAll();
    setMsg("Recipe added to Firestore.");
  }

  async function removeFirestore(r: UserRecipe) {
    if (!user) return;
    if (!confirm(`Delete “${r.name}” from your library?`)) return;
    await deleteUserRecipe(user.uid, r.id);
    await loadAll();
    setMsg("Recipe deleted.");
    if (editing?.id === r.id) setEditing(null);
  }

  function openEdit(r: UserRecipe) {
    setEditing({ ...r });
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
    await loadAll();
    setEditing(null);
    setMsg("Recipe updated.");
  }

  function toggleType(t: MealSlotId, which: "new" | "edit") {
    if (which === "new") {
      setNewTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    } else if (editing) {
      setEditing({
        ...editing,
        mealTypes: editing.mealTypes.includes(t)
          ? editing.mealTypes.filter((x) => x !== t)
          : [...editing.mealTypes, t],
      });
    }
  }

  function toggleTag(t: RecipeTag, which: "new" | "edit") {
    if (which === "new") {
      setNewTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    } else if (editing) {
      const cur = editing.tags ?? [];
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
      setEditing({ ...editing, tags: next.length ? next : undefined });
    }
  }

  return (
    <div className="app-shell">
      <h1>Recipes</h1>
      <p className="muted" style={{ fontSize: "0.88rem" }}>
        Your library lives in Firestore under <code style={{ fontSize: "0.78rem" }}>users/…/recipes</code>. Import{" "}
        <code style={{ fontSize: "0.78rem" }}>data/recipes.json</code> once, then browse, edit, or delete.
      </p>

      {msg && (msg.startsWith("Saved") || msg.includes("Imported") || msg.includes("added") || msg.includes("updated") || msg.includes("deleted") ? <div className="success-banner">{msg}</div> : <div className="error-banner">{msg}</div>)}

      <div className="card stack">
        <button type="button" className="btn btn-primary btn-block" disabled={importing} onClick={() => void importJson()}>
          {importing ? "Importing…" : "Import dataset from recipes.json → Firestore"}
        </button>
        <p className="muted" style={{ margin: 0, fontSize: "0.78rem" }}>
          Uses <code>/data/recipes.json</code> (run <code>npm run sync:recipes</code> after editing the file in{" "}
          <code>data/</code>). Re-import merges by recipe id (<code>ds-1</code>, …).
        </p>
        <label className="row" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={showStarter}
            onChange={(e) => setShowStarter(e.target.checked)}
            style={{ width: "auto" }}
          />
          Show starter / photo defaults in list
        </label>
      </div>

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
        <label>Filter by category (Firestore)</label>
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
        {filtered.map((r) => {
          const fsRow = r.fromFirestore && r.firestoreId ? fromFs.find((x) => x.id === r.firestoreId) : undefined;
          return (
            <div key={r.id} className="card recipe-item">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{r.name}</strong>
                <span className="pill">{r.calories} kcal</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                P {r.proteinG} · C {r.carbsG} · F {r.fatG}
                {r.category && ` · ${r.category}`}
                {r.isCustom && " · Legacy custom"}
                {r.fromFirestore && r.origin === "dataset" && " · Dataset"}
                {r.fromFirestore && r.origin === "user" && " · Yours (FS)"}
                {!r.fromFirestore && !r.isCustom && " · Starter"}
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
              {r.sourceFile && (
                <p className="muted" style={{ margin: "0.15rem 0 0", fontSize: "0.72rem" }}>
                  From data: {r.sourceFile}
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
              {r.url && !r.isCustom && (
                <a href={r.url} target="_blank" rel="noreferrer">
                  Open link
                </a>
              )}
              <div className="slot-actions">
                <button type="button" className="btn btn-primary" onClick={() => void assign(r)}>
                  Add to {slotLabels[assignSlot]}
                </button>
                {fsRow && (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => openEdit(fsRow)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => void removeFirestore(fsRow)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
                  onChange={() => toggleType(t, "edit")}
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
                  onChange={() => toggleTag(t, "edit")}
                  style={{ width: "auto" }}
                />
                {t}
              </label>
            ))}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>
            Slot list drives filters; category text is free-form (Breakfast, Tea, …). Re-save updates{" "}
            <code>mealTypes</code> from category: use checkboxes above to override.
          </p>
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

      <div className="card stack">
        <h2>Add recipe (Firestore)</h2>
        <label>Name</label>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Chicken bowl" />
        <label>Category label</label>
        <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Lunch, Snack, …" />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Calories</label>
            <input type="number" min={20} value={newCal} onChange={(e) => setNewCal(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Protein g</label>
            <input type="number" min={0} value={newP} onChange={(e) => setNewP(Number(e.target.value))} />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Carbs g</label>
            <input type="number" min={0} value={newC} onChange={(e) => setNewC(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Fat g</label>
            <input type="number" min={0} value={newF} onChange={(e) => setNewF(Number(e.target.value))} />
          </div>
        </div>
        <label>Ingredients (one per line)</label>
        <textarea value={newIngredients} onChange={(e) => setNewIngredients(e.target.value)} placeholder="50g rice…" />
        <label>Instructions</label>
        <textarea value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} />
        <label>Meal slots</label>
        <div className="row">
          {(Object.keys(slotLabels) as MealSlotId[]).map((t) => (
            <label key={t} className="row" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              <input type="checkbox" checked={newTypes.includes(t)} onChange={() => toggleType(t, "new")} style={{ width: "auto" }} />
              {slotLabels[t]}
            </label>
          ))}
        </div>
        <label>Tags</label>
        <div className="row">
          {(["lunch", "dinner", "snacks", "anti-inflammatory", "batch"] as RecipeTag[]).map((t) => (
            <label key={t} className="row" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              <input type="checkbox" checked={newTags.includes(t)} onChange={() => toggleTag(t, "new")} style={{ width: "auto" }} />
              {t}
            </label>
          ))}
        </div>
        <label>Source note</label>
        <input value={newNote} onChange={(e) => setNewNote(e.target.value)} />
        <button type="button" className="btn btn-secondary btn-block" onClick={() => void addOwn()}>
          Save to Firestore
        </button>
      </div>
    </div>
  );
}
