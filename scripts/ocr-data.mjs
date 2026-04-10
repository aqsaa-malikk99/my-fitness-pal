#!/usr/bin/env node
/**
 * Batch OCR for files in ./data (jpg/jpeg/png). Writes ./data/ocr-output.json with { file, text }[].
 * Curate snippets from that file into src/data/photoRecipes.ts (or merge programmatically later).
 */
import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const outFile = path.join(dataDir, "ocr-output.json");

async function main() {
  if (!fs.existsSync(dataDir)) {
    console.error("Missing data/ folder");
    process.exit(1);
  }
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort();
  if (!files.length) {
    console.error("No jpg/png files in data/");
    process.exit(1);
  }
  const worker = await createWorker("eng");
  const results = [];
  for (const f of files) {
    const fp = path.join(dataDir, f);
    process.stdout.write(`OCR ${f}… `);
    const {
      data: { text },
    } = await worker.recognize(fp);
    const trimmed = text.replace(/\s+/g, " ").trim().slice(0, 12000);
    results.push({ file: f, text: trimmed });
    console.log(`${trimmed.length} chars`);
  }
  await worker.terminate();
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), "utf8");
  console.log(`Wrote ${outFile} (${results.length} images)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
