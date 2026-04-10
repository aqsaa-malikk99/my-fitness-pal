import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/** GitHub Pages project sites use /repo-name/; set VITE_BASE in CI (e.g. /my-repo/) */
const raw = process.env.VITE_BASE?.trim();
const base = (raw && raw.length > 0 ? raw : "/").replace(/\/?$/, "/");

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
