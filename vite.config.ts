import { copyFileSync } from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/** GitHub Pages project sites use /repo-name/; set VITE_BASE in CI (e.g. /my-repo/) */
const raw = process.env.VITE_BASE?.trim();
const base = (raw && raw.length > 0 ? raw : "/").replace(/\/?$/, "/");
const navigateFallback =
  base === "/" ? "/index.html" : `${base.replace(/\/$/, "")}/index.html`;

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
  plugins: [
    react(),
    spa404Fallback(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.png", "pwa-512.png", "app-logo.png", ".nojekyll"],
      manifest: {
        name: "MyFitness Gal",
        short_name: "MyFitnessGal",
        description: "Goals, meals, gym plan, and progress",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback,
        navigateFallbackDenylist: [/\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
