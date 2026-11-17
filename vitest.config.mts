import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    // Helper worktrees live under .claude/; never run their copies of the tests.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/.next/**"],
    testTimeout: 30_000,
  },
});
