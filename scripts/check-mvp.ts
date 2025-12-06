#!/usr/bin/env tsx
/**
 * Narzędzie do sprawdzania statusu implementacji MVP PlantsPlaner
 *
 * Sprawdza zgodność z PRD (.ai/docs/prd.md) i generuje raport statusu.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

interface MVPFeature {
  id: string;
  name: string;
  category: string;
  status: "implemented" | "partial" | "missing";
  details: string[];
  files: string[];
}

interface MVPCategory {
  name: string;
  features: MVPFeature[];
}

const PROJECT_ROOT = process.cwd();

/**
 * Sprawdza czy plik istnieje
 */
function fileExists(path: string): boolean {
  return existsSync(join(PROJECT_ROOT, path));
}

/**
 * Sprawdza czy plik zawiera wzorzec
 */
function fileContains(pattern: RegExp, ...paths: string[]): boolean {
  for (const path of paths) {
    const fullPath = join(PROJECT_ROOT, path);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      if (pattern.test(content)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Sprawdza czy którykolwiek plik w katalogu zawiera wzorzec
 */
function anyFileContains(pattern: RegExp, dirPath: string): boolean {
  try {
    const fullDir = join(PROJECT_ROOT, dirPath);
    if (!existsSync(fullDir)) return false;

    const files = readdirSync(fullDir);
    for (const file of files) {
      const fullPath = join(fullDir, file);
      if (statSync(fullPath).isFile()) {
        const content = readFileSync(fullPath, "utf-8");
        if (pattern.test(content)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Znajduje pliki pasujące do wzorca (uproszczona wersja)
 */
function findFiles(pattern: string): string[] {
  const results: string[] = [];

  // Uproszczone wyszukiwanie - sprawdzamy konkretne ścieżki
  const simplePaths: string[] = [];

  // Mapowanie wzorców na konkretne ścieżki
  if (pattern.includes("src/pages/api/auth")) {
    simplePaths.push("src/pages/api/auth/register.ts", "src/pages/api/auth/login.ts", "src/pages/api/auth/logout.ts");
  } else if (pattern.includes("src/pages/api/plans")) {
    simplePaths.push(
      "src/pages/api/plans/index.ts",
      "src/pages/api/plans/[plan_id]/index.ts",
      "src/pages/api/plans/[plan_id]/plants/[x]/[y].ts"
    );
  } else if (pattern.includes("src/components/editor")) {
    simplePaths.push("src/components/editor/GridEditor.tsx", "src/components/editor/SideDrawer");
  } else if (pattern.includes("src/pages/api/ai/plants")) {
    simplePaths.push("src/pages/api/ai/plants/search.ts", "src/pages/api/ai/plants/fit.ts");
  } else if (pattern.includes("src/lib/services")) {
    simplePaths.push(
      "src/lib/services/plans.service.ts",
      "src/lib/services/weather.service.ts",
      "src/lib/services/openrouter.service.ts"
    );
  } else if (pattern.includes("supabase/migrations")) {
    try {
      const migrationsDir = join(PROJECT_ROOT, "supabase", "migrations");
      if (existsSync(migrationsDir)) {
        const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
        simplePaths.push(...files.map((f) => join("supabase", "migrations", f)));
      }
    } catch {
      // Ignore
    }
  } else if (pattern.includes("src/pages/**/profile")) {
    simplePaths.push("src/pages/profile.astro", "src/pages/profile/index.astro");
  } else if (pattern.includes("src/components/**/*Map")) {
    simplePaths.push("src/components/editor/LocationMap.tsx", "src/components/editor/LocationMap");
  } else if (pattern.includes("src/lib/**/*weather")) {
    simplePaths.push("src/lib/services/weather.service.ts", "src/lib/integrations/open-meteo.ts");
  } else if (pattern.includes("src/pages/api/analytics")) {
    simplePaths.push("src/pages/api/analytics/events.ts");
  } else if (pattern.includes("src/lib/validation/analytics")) {
    simplePaths.push("src/lib/validation/analytics.ts");
  } else if (pattern.includes("src/lib/hooks/useAddPlantFlow")) {
    simplePaths.push("src/lib/hooks/useAddPlantFlow.ts");
  }

  for (const path of simplePaths) {
    const fullPath = join(PROJECT_ROOT, path);
    if (existsSync(fullPath)) {
      results.push(path);
    }
  }

  return results;
}

/**
 * Sprawdza implementację funkcjonalności MVP
 */
function checkMVPFeatures(): MVPCategory[] {
  const categories: MVPCategory[] = [];

  // 1. Uwierzytelnianie i konto
  const authFeatures: MVPFeature[] = [
    {
      id: "auth-register",
      name: "Rejestracja e-mail/hasło",
      category: "Uwierzytelnianie",
      status: fileExists("src/pages/api/auth/register.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/auth/register.ts"),
    },
    {
      id: "auth-login",
      name: "Logowanie e-mail/hasło",
      category: "Uwierzytelnianie",
      status: fileExists("src/pages/api/auth/login.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/auth/login.ts"),
    },
    {
      id: "auth-logout",
      name: "Wylogowanie",
      category: "Uwierzytelnianie",
      status: fileExists("src/pages/api/auth/logout.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/auth/logout.ts"),
    },
    {
      id: "auth-profile",
      name: "Strona profilu (język, motyw)",
      category: "Uwierzytelnianie",
      status:
        fileExists("src/pages/profile.astro") || fileExists("src/pages/profile/index.astro")
          ? "implemented"
          : "missing",
      details: [],
      files: findFiles("src/pages/**/profile*.astro"),
    },
  ];

  categories.push({ name: "Uwierzytelnianie i konto", features: authFeatures });

  // 2. Plany działki
  const planFeatures: MVPFeature[] = [
    {
      id: "plan-create",
      name: "Tworzenie planu (nazwa, lokalizacja, orientacja, wymiary, jednostka kratki)",
      category: "Plany działki",
      status:
        fileExists("src/pages/api/plans/index.ts") || fileExists("src/pages/api/plans.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/plans/**/*.ts"),
    },
    {
      id: "plan-grid-generate",
      name: "Generowanie siatki na podstawie wymiarów",
      category: "Plany działki",
      status: fileContains(/grid.*generat|generateGrid|createGrid/i, "src/lib/services/plans.service.ts")
        ? "implemented"
        : "partial",
      details: [],
      files: findFiles("src/lib/services/plans.service.ts"),
    },
    {
      id: "plan-grid-edit",
      name: "Edycja siatki (zaznaczanie obszaru, przypisywanie typów)",
      category: "Plany działki",
      status: fileExists("src/components/editor") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/components/editor/**/*.tsx"),
    },
    {
      id: "plan-grid-save",
      name: "Zapis stanu planu i siatki",
      category: "Plany działki",
      status:
        fileContains(/updatePlan|updateGridCellType|PUT.*APIRoute/i, "src/lib/services/plans.service.ts") ||
        fileContains(/updateGridCellType/i, "src/lib/services/grid-cells.service.ts") ||
        fileExists("src/pages/api/plans/[plan_id]/grid/cells/[x]/[y].ts")
          ? "implemented"
          : "partial",
      details: [],
      files: findFiles("src/pages/api/plans/**/*.ts"),
    },
    {
      id: "plan-limit-200x200",
      name: "Limit siatki 200×200 pól",
      category: "Plany działki",
      status: fileContains(
        /check.*grid_width.*between.*1.*and.*200|check.*grid_height.*between.*1.*and.*200/i,
        "supabase/migrations/20251104120000_init_plantsplanner_schema.sql"
      )
        ? "implemented"
        : "missing",
      details: [],
      files: findFiles("supabase/migrations/**/*.sql"),
    },
  ];

  categories.push({ name: "Plany działki", features: planFeatures });

  // 3. Rośliny
  const plantFeatures: MVPFeature[] = [
    {
      id: "plant-add",
      name: "Dodawanie rośliny do pola (1 roślina = 1 pole, tylko ziemia)",
      category: "Rośliny",
      status:
        fileExists("src/pages/api/plans") && fileContains(/plant.*add|addPlant/i, "src/lib/hooks/useAddPlantFlow.ts")
          ? "implemented"
          : "partial",
      details: [],
      files: findFiles("src/lib/hooks/useAddPlantFlow.ts"),
    },
    {
      id: "plant-remove",
      name: "Usuwanie rośliny z pola",
      category: "Rośliny",
      status:
        fileExists("src/pages/api/plans/[plan_id]/plants/[x]/[y].ts") &&
        fileContains(/DELETE.*APIRoute|deletePlantPlacement/i, "src/pages/api/plans/[plan_id]/plants/[x]/[y].ts")
          ? "implemented"
          : "missing",
      details: [],
      files: findFiles("src/pages/api/plans/**/*.ts"),
    },
    {
      id: "plant-soil-only",
      name: "Blokada dodawania roślin do pól innych niż ziemia",
      category: "Rośliny",
      status: fileContains(/soil.*only|type.*soil/i, "src/pages/api/ai/plants/fit.ts") ? "implemented" : "partial",
      details: [],
      files: findFiles("src/pages/api/ai/plants/fit.ts"),
    },
  ];

  categories.push({ name: "Rośliny", features: plantFeatures });

  // 4. Lokalizacja i mapy
  const locationFeatures: MVPFeature[] = [
    {
      id: "location-leaflet",
      name: "Leaflet.js + OpenStreetMap (mapy, geokodowanie)",
      category: "Lokalizacja i mapy",
      status:
        fileContains(/leaflet|react-leaflet/i, "package.json") && fileExists("src/components")
          ? "implemented"
          : "missing",
      details: [],
      files: findFiles("src/components/**/*Location*.tsx"),
    },
    {
      id: "location-pin",
      name: "Ustawianie pinezki lokalizacji działki",
      category: "Lokalizacja i mapy",
      status:
        fileContains(/Marker|marker|draggable|onMarkerMove/i, "src/components/location/LocationMap.tsx") ||
        fileExists("src/components/location/LocationMap.tsx")
          ? "implemented"
          : "partial",
      details: [],
      files: findFiles("src/components/**/*Map*.tsx"),
    },
  ];

  categories.push({ name: "Lokalizacja i mapy", features: locationFeatures });

  // 5. Dane pogodowe
  const weatherFeatures: MVPFeature[] = [
    {
      id: "weather-open-meteo",
      name: "Integracja z Open-Meteo",
      category: "Dane pogodowe",
      status:
        fileExists("src/lib/integrations/open-meteo.ts") || fileExists("src/lib/services/weather.service.ts")
          ? "implemented"
          : "missing",
      details: [],
      files: findFiles("src/lib/**/*weather*.ts"),
    },
    {
      id: "weather-cache",
      name: "Cache miesięczny per plan",
      category: "Dane pogodowe",
      status: fileContains(
        /shouldRefresh|refreshWeatherForPlan|last_refreshed_at|30.*day|daysSinceRefresh/i,
        "src/lib/services/weather.service.ts"
      )
        ? "implemented"
        : "partial",
      details: [],
      files: findFiles("src/lib/services/weather.service.ts"),
    },
    {
      id: "weather-normalization",
      name: "Normalizacja danych pogodowych (nasłonecznienie, wilgotność, opady)",
      category: "Dane pogodowe",
      status: fileContains(/normalize|normalization/i, "src/lib/services/weather.service.ts")
        ? "implemented"
        : "partial",
      details: [],
      files: findFiles("src/lib/services/weather.service.ts"),
    },
  ];

  categories.push({ name: "Dane pogodowe", features: weatherFeatures });

  // 6. AI
  const aiFeatures: MVPFeature[] = [
    {
      id: "ai-search",
      name: "Wyszukiwanie roślin po nazwie",
      category: "AI",
      status: fileExists("src/pages/api/ai/plants/search.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/ai/plants/search.ts"),
    },
    {
      id: "ai-fit",
      name: "Ocena dopasowania rośliny (scoring 1-5)",
      category: "AI",
      status: fileExists("src/pages/api/ai/plants/fit.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/ai/plants/fit.ts"),
    },
    {
      id: "ai-json-schema",
      name: "Strict JSON schema z sanity-check",
      category: "AI",
      status: fileContains(/schema|zod|validate/i, "src/lib/services/openrouter.service.ts")
        ? "implemented"
        : "partial",
      details: [],
      files: findFiles("src/lib/services/openrouter.service.ts"),
    },
    {
      id: "ai-timeout",
      name: "Timeout 10s dla zapytań AI",
      category: "AI",
      status: fileContains(/timeout.*10|10000/i, "src/lib/services/openrouter.service.ts") ? "implemented" : "partial",
      details: [],
      files: findFiles("src/lib/services/openrouter.service.ts"),
    },
    {
      id: "ai-weighted-months",
      name: "Średnia ważona miesięcy (IV-IX waga 2, pozostałe 1)",
      category: "AI",
      status: fileContains(/weight|weighted|hemisphere/i, "src/lib/services/openrouter.service.ts")
        ? "implemented"
        : "partial",
      details: [],
      files: findFiles("src/lib/services/openrouter.service.ts"),
    },
  ];

  categories.push({ name: "AI", features: aiFeatures });

  // 7. Analityka
  const analyticsFeatures: MVPFeature[] = [
    {
      id: "analytics-endpoint",
      name: "Endpoint POST /api/analytics/events",
      category: "Analityka",
      status: fileExists("src/pages/api/analytics/events.ts") ? "implemented" : "missing",
      details: [],
      files: findFiles("src/pages/api/analytics/events.ts"),
    },
    {
      id: "analytics-events",
      name: "4 zdarzenia: plan_created, grid_saved, area_typed, plant_confirmed",
      category: "Analityka",
      status: fileContains(/plan_created|grid_saved|area_typed|plant_confirmed/i, "src/lib/validation/analytics.ts")
        ? "implemented"
        : "missing",
      details: [],
      files: findFiles("src/lib/validation/analytics.ts"),
    },
  ];

  categories.push({ name: "Analityka", features: analyticsFeatures });

  // 8. Baza danych
  const dbFeatures: MVPFeature[] = [
    {
      id: "db-schema",
      name: "Schemat bazy danych (profiles, plans, grid_cells, plant_placements, weather_monthly, analytics_events)",
      category: "Baza danych",
      status:
        fileExists("supabase/migrations") && findFiles("supabase/migrations/**/*.sql").length > 0
          ? "implemented"
          : "missing",
      details: [],
      files: findFiles("supabase/migrations/**/*.sql"),
    },
    {
      id: "db-rls",
      name: "Row Level Security (RLS) dla plans",
      category: "Baza danych",
      status:
        fileContains(
          /enable row level security|alter table.*enable row level security/i,
          "supabase/migrations/20251104120000_init_plantsplanner_schema.sql"
        ) || anyFileContains(/enable row level security|alter table.*enable row level security/i, "supabase/migrations")
          ? "implemented"
          : "partial",
      details: [],
      files: findFiles("supabase/migrations/**/*.sql"),
    },
  ];

  categories.push({ name: "Baza danych", features: dbFeatures });

  return categories;
}

/**
 * Generuje raport tekstowy
 */
function generateReport(categories: MVPCategory[]): string {
  let report = "# Raport Statusu MVP - PlantsPlaner\n\n";
  report += `Data wygenerowania: ${new Date().toLocaleString("pl-PL")}\n\n`;
  report += "---\n\n";

  let totalFeatures = 0;
  let implementedCount = 0;
  let partialCount = 0;
  let missingCount = 0;

  for (const category of categories) {
    report += `## ${category.name}\n\n`;

    for (const feature of category.features) {
      totalFeatures++;
      const statusIcon = feature.status === "implemented" ? "✅" : feature.status === "partial" ? "⚠️" : "❌";

      report += `### ${statusIcon} ${feature.name}\n`;
      report += `- **Status:** ${feature.status}\n`;

      if (feature.files.length > 0) {
        report += `- **Pliki:** ${feature.files.slice(0, 3).join(", ")}${feature.files.length > 3 ? "..." : ""}\n`;
      }

      if (feature.details.length > 0) {
        report += `- **Szczegóły:**\n`;
        for (const detail of feature.details) {
          report += `  - ${detail}\n`;
        }
      }

      report += "\n";

      if (feature.status === "implemented") implementedCount++;
      else if (feature.status === "partial") partialCount++;
      else missingCount++;
    }

    report += "\n";
  }

  // Podsumowanie
  report += "---\n\n";
  report += "## Podsumowanie\n\n";
  report += `- **Łącznie funkcjonalności:** ${totalFeatures}\n`;
  report += `- **✅ Zaimplementowane:** ${implementedCount} (${Math.round((implementedCount / totalFeatures) * 100)}%)\n`;
  report += `- **⚠️ Częściowo zaimplementowane:** ${partialCount} (${Math.round((partialCount / totalFeatures) * 100)}%)\n`;
  report += `- **❌ Brakujące:** ${missingCount} (${Math.round((missingCount / totalFeatures) * 100)}%)\n\n`;

  const completionRate = ((implementedCount + partialCount * 0.5) / totalFeatures) * 100;
  const completionRateStr = completionRate.toFixed(1);
  report += `**Postęp implementacji MVP:** ${completionRateStr}%\n\n`;

  // Status ogólny
  if (completionRate >= 95 && missingCount === 0) {
    report += "**Status:** 🟢 MVP w pełni zaimplementowane\n";
  } else if (completionRate >= 90) {
    report += "**Status:** 🟢 MVP gotowe do testów\n";
  } else if (completionRate >= 70) {
    report += "**Status:** 🟡 MVP w trakcie implementacji\n";
  } else {
    report += "**Status:** 🔴 MVP wymaga dalszej pracy\n";
  }

  return report;
}

/**
 * Główna funkcja
 */
function main() {
  const categories = checkMVPFeatures();
  const report = generateReport(categories);

  // Zapisz raport do pliku
  const reportPath = join(PROJECT_ROOT, ".ai", "docs", "mvp-status-report.md");
  try {
    const dir = dirname(reportPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(reportPath, report, "utf-8");
  } catch {
    // Ignore
  }
}

main();
