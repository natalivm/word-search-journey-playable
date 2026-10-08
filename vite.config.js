import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The game lives in app/ so that the repo-root index.html stays the plain
// static landing page and is never processed by Vite.
export default defineConfig({
  root: "app",
  // Relative asset URLs so the build works under a GitHub Pages project path
  // (/<repo>/game/) without knowing that path at build time.
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020"
  },
  server: { port: 5173 }
});
