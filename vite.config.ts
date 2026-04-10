import { copyFileSync } from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub Pages project sites use /repo-name/; set VITE_BASE in CI (e.g. /my-repo/) */
const raw = process.env.VITE_BASE?.trim();
const base = (raw && raw.length > 0 ? raw : "/").replace(/\/?$/, "/");

/** GitHub Pages serves 404.html for unknown paths; copy SPA shell so client routes work on refresh. */
function spa404Fallback(): Plugin {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      const index = path.resolve(__dirname, "dist/index.html");
      const notFound = path.resolve(__dirname, "dist/404.html");
      copyFileSync(index, notFound);
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), spa404Fallback()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
