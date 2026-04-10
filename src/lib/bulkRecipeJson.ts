import type { JsonRecipeRow } from "@/lib/recipeMapping";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function num(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function validateRow(row: unknown, index: number): string | null {
  if (!isRecord(row)) return `Row ${index}: must be an object`;
  const id = num(row.id);
  if (id === null || !Number.isInteger(id) || id < 1) return `Row ${index}: "id" must be a positive integer`;
  if (typeof row.name !== "string" || !row.name.trim()) return `Row ${index}: "name" is required`;
  if (typeof row.category !== "string" || !row.category.trim()) return `Row ${index}: "category" is required`;
  const cal = num(row.calories);
  if (cal === null || cal < 0) return `Row ${index}: "calories" must be a non-negative number`;
  for (const k of ["protein_g", "carbs_g", "fat_g"] as const) {
    const n = num(row[k]);
    if (n === null || n < 0) return `Row ${index}: "${k}" must be a non-negative number`;
  }
  if (!Array.isArray(row.ingredients)) return `Row ${index}: "ingredients" must be an array`;
  for (let j = 0; j < row.ingredients.length; j++) {
    if (typeof row.ingredients[j] !== "string") return `Row ${index}: ingredients[${j}] must be a string`;
  }
  if (typeof row.instructions !== "string") return `Row ${index}: "instructions" must be a string`;
  if (typeof row.source !== "string" || !row.source.trim()) return `Row ${index}: "source" is required`;
  return null;
}

/**
 * Accepts the same shape as `data/recipes_updated.json`: a top-level array, or `{ "recipes": [...] }`.
 */
export function parseBulkRecipeJson(text: string):
  | { ok: true; rows: JsonRecipeRow[] }
  | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "Invalid JSON — check commas and quotes." };
  }

  let arr: unknown[];
  if (Array.isArray(data)) {
    arr = data;
  } else if (isRecord(data) && Array.isArray(data.recipes)) {
    arr = data.recipes;
  } else {
    return {
      ok: false,
      error: 'Expected a JSON array of recipes, or an object like { "recipes": [ ... ] }.',
    };
  }

  if (arr.length === 0) return { ok: false, error: "Array is empty." };

  const rows: JsonRecipeRow[] = [];
  for (let i = 0; i < arr.length; i++) {
    const err = validateRow(arr[i], i);
    if (err) return { ok: false, error: err };
    const row = arr[i] as Record<string, unknown>;
    rows.push({
      id: Math.floor(Number(row.id)),
      name: String(row.name).trim(),
      category: String(row.category).trim(),
      calories: Number(num(row.calories)),
      protein_g: Number(num(row.protein_g)),
      carbs_g: Number(num(row.carbs_g)),
      fat_g: Number(num(row.fat_g)),
      ingredients: (row.ingredients as string[]).map((s) => String(s).trim()).filter(Boolean),
      instructions: String(row.instructions).trim(),
      source: String(row.source).trim(),
    });
  }

  return { ok: true, rows };
}
