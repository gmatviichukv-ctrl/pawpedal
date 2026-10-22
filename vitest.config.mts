import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Next docs (node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md) suggest vite-tsconfig-paths,
// but the installed Vite resolves tsconfig `paths` natively and warns that the plugin is redundant
// (reported by the maker in docs/runs/20261022T075404Z-loop.md) — so we use the built-in option.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
