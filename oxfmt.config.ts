import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Minified Quran data written by scripts/build-data.mjs and shipped as-is.
  // GitHub's own issue templates keep the layout GitHub gave them.
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    "apps/web/public/data/**",
    ".github/**",
  ],
});
