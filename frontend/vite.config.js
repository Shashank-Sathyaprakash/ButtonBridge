import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built as static files for IIS hosting (see deployment/web.config).
// base: "./" keeps asset URLs relative so the app works whether IIS
// serves it from the site root or a sub-application path.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
