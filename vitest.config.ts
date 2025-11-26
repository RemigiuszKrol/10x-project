import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Środowisko testowe (happy-dom jest szybsze i bardziej kompatybilne niż jsdom)
    environment: "happy-dom",

    // Pliki setup
    setupFiles: ["./vitest.setup.ts"],

    // Globalne dopasowania testów
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "e2e/",
        "src/**/*.d.ts",
        "src/**/*.config.{ts,js}",
        "src/env.d.ts",
        "src/db/database.types.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
      // Minimalne progi pokrycia (80% zgodnie z wymaganiami)
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Globals dla łatwiejszego użycia (bez konieczności importowania describe, it, expect)
    globals: true,

    // Reporter
    reporters: ["verbose"],

    // Timeout dla testów
    testTimeout: 10000,

    // Mockowanie
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
