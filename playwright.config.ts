import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// Ładowanie zmiennych środowiskowych z .env.test
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

/**
 * Konfiguracja Playwright dla testów E2E
 * Używamy tylko przeglądarki Chromium zgodnie z regułami projektu
 */
export default defineConfig({
  // Katalog z testami E2E
  testDir: "./e2e",

  // Timeout dla pojedynczego testu (120 sekund)
  timeout: 120 * 1000,

  // Maksymalny czas dla całego zestawu testów (bez limitu)
  globalTimeout: 0,

  // Oczekiwania (assertions)
  expect: {
    // Timeout dla expect (5 sekund)
    timeout: 5000,
  },

  // Uruchomienie testów
  fullyParallel: true, // Testy uruchamiane równolegle
  forbidOnly: !!process.env.CI, // Zabronione .only() w CI
  retries: process.env.CI ? 2 : 0, // 2x retry w CI, 0 lokalnie
  workers: process.env.CI ? 1 : undefined, // W CI: 1 worker, lokalnie: auto

  // Reporter
  reporter: process.env.CI ? [["html"], ["github"]] : [["html"], ["list"]],

  // Ustawienia współdzielone dla wszystkich projektów
  use: {
    // Base URL aplikacji
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Trace on first retry
    trace: "on-first-retry",

    // Screenshot tylko przy błędzie
    screenshot: "only-on-failure",

    // Video tylko przy błędzie
    video: "retain-on-failure",

    // Timeout dla akcji (kliknięcia, wypełnienia pól)
    actionTimeout: 10 * 1000,
  },

  // Projekty testowe - tylko Chromium zgodnie z regułami
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Webserver - uruchomienie aplikacji przed testami
  webServer: {
    command: "npm run preview",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Folder dla artefaktów testowych
  outputDir: "test-results/",

  // Global teardown - czyszczenie planów po zakończeniu wszystkich testów
  globalTeardown: "./e2e/teardown.ts",
});
