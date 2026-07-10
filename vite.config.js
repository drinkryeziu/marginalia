import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // No inline module-preload polyfill script, so a strict script-src 'self'
  // CSP never breaks the build. (Targets modern browsers.)
  build: { modulePreload: { polyfill: false } },
});
