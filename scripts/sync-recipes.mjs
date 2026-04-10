import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "data", "recipes.json");
const dest = path.join(root, "src", "data", "recipes.json");

if (!fs.existsSync(src)) {
  console.warn("sync-recipes: missing data/recipes.json — skipping");
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("Synced data/recipes.json → src/data/recipes.json");
