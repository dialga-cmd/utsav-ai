import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/**/*.tsx", "hooks/**/*.ts", "app/api/**/*.ts"],
      thresholds: {
        lines: 90,
        functions: 95,
        statements: 90,
        branches: 84,
      },
    },
  },
});
