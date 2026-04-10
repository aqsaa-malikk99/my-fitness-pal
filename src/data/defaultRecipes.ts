import type { MealSlotId } from "@/types/profile";

export interface RecipeDef {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealTypes: MealSlotId[];
  source: "local" | "online";
  url?: string;
  /** From OCR / your data folder — informational */
  sourceFile?: string;
  tags?: string[];
}

export const DEFAULT_RECIPES: RecipeDef[] = [
  {
    id: "oats-berry",
    name: "Protein oats + berries",
    calories: 320,
    proteinG: 28,
    carbsG: 38,
    fatG: 8,
    mealTypes: ["breakfast"],
    source: "local",
  },
  {
    id: "egg-wrap",
    name: "Veggie egg wrap",
    calories: 290,
    proteinG: 22,
    carbsG: 24,
    fatG: 12,
    mealTypes: ["breakfast"],
    source: "local",
  },
  {
    id: "greek-parfait",
    name: "Greek yogurt parfait",
    calories: 280,
    proteinG: 26,
    carbsG: 30,
    fatG: 6,
    mealTypes: ["breakfast", "snacks"],
    source: "local",
  },
  {
    id: "chicken-bowl",
    name: "Chicken rice bowl",
    calories: 520,
    proteinG: 45,
    carbsG: 55,
    fatG: 12,
    mealTypes: ["lunch", "dinner"],
    source: "online",
    url: "https://www.example.com/chicken-bowl",
  },
  {
    id: "tuna-salad",
    name: "Tuna salad plate",
    calories: 380,
    proteinG: 35,
    carbsG: 18,
    fatG: 18,
    mealTypes: ["lunch"],
    source: "local",
  },
  {
    id: "lentil-soup",
    name: "Lentil vegetable soup",
    calories: 340,
    proteinG: 18,
    carbsG: 48,
    fatG: 8,
    mealTypes: ["lunch", "dinner"],
    source: "local",
  },
  {
    id: "salmon-potato",
    name: "Salmon + roasted potatoes",
    calories: 560,
    proteinG: 40,
    carbsG: 42,
    fatG: 24,
    mealTypes: ["dinner"],
    source: "online",
    url: "https://www.example.com/salmon-potato",
  },
  {
    id: "turkey-stirfry",
    name: "Turkey stir-fry",
    calories: 480,
    proteinG: 38,
    carbsG: 40,
    fatG: 16,
    mealTypes: ["dinner"],
    source: "local",
  },
  {
    id: "cottage-fruit",
    name: "Cottage cheese + fruit",
    calories: 220,
    proteinG: 24,
    carbsG: 20,
    fatG: 5,
    mealTypes: ["snacks"],
    source: "local",
  },
  {
    id: "protein-bar",
    name: "Protein bar (avg)",
    calories: 200,
    proteinG: 20,
    carbsG: 18,
    fatG: 7,
    mealTypes: ["snacks"],
    source: "local",
  },
  {
    id: "sparkling-tea",
    name: "Sparkling iced tea (0–5 kcal)",
    calories: 10,
    proteinG: 0,
    carbsG: 2,
    fatG: 0,
    mealTypes: ["drinks"],
    source: "local",
  },
  {
    id: "protein-shake",
    name: "Protein shake (water)",
    calories: 120,
    proteinG: 24,
    carbsG: 4,
    fatG: 2,
    mealTypes: ["drinks", "snacks"],
    source: "local",
  },
  {
    id: "pre-morning-electrolyte",
    name: "Electrolyte + collagen (pre-morning)",
    calories: 35,
    proteinG: 8,
    carbsG: 2,
    fatG: 0,
    mealTypes: ["preMorning", "drinks"],
    source: "local",
  },
  {
    id: "bedtime-chamomile",
    name: "Chamomile + honey (bedtime tea)",
    calories: 25,
    proteinG: 0,
    carbsG: 6,
    fatG: 0,
    mealTypes: ["bedtimeTea", "drinks"],
    source: "local",
  },
  {
    id: "night-peppermint",
    name: "Peppermint tea (nighttime)",
    calories: 5,
    proteinG: 0,
    carbsG: 1,
    fatG: 0,
    mealTypes: ["nighttimeTea", "drinks"],
    source: "local",
  },
];
