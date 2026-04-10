import type { MealSlotId, UserRecipeDoc } from "@/types/profile";

export type JsonRecipeRow = {
  id: number;
  name: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
  instructions: string;
  source: string;
};

export function categoryToMealTypes(category: string, nameLower: string): MealSlotId[] {
  const c = category.trim().toLowerCase();
  if (c === "breakfast") return ["breakfast"];
  if (c === "lunch") return ["lunch"];
  if (c === "dinner") return ["dinner"];
  if (c === "snack" || c === "snacks") return ["snacks"];
  if (c === "drink" || c === "drinks") return ["drinks"];
  if (c === "tea") {
    if (nameLower.includes("bed") || nameLower.includes("chamomile")) return ["bedtimeTea", "drinks"];
    if (nameLower.includes("night") || nameLower.includes("sleep")) return ["nighttimeTea", "drinks"];
    return ["drinks", "bedtimeTea", "nighttimeTea"];
  }
  return ["lunch"];
}

function tagsForRow(row: JsonRecipeRow): UserRecipeDoc["tags"] | undefined {
  const c = row.category.trim().toLowerCase();
  if (c === "tea" || row.name.toLowerCase().includes("tea")) return ["tea"];
  return undefined;
}

export function jsonRowToUserRecipeDoc(row: JsonRecipeRow, now: string): UserRecipeDoc {
  const nameLower = row.name.toLowerCase();
  return {
    origin: "dataset",
    sourceId: row.id,
    name: row.name,
    category: row.category,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    ingredients: row.ingredients,
    instructions: row.instructions,
    source: row.source,
    mealTypes: categoryToMealTypes(row.category, nameLower),
    tags: tagsForRow(row),
    createdAt: now,
    updatedAt: now,
  };
}

export function datasetDocId(sourceId: number): string {
  return `ds-${sourceId}`;
}
