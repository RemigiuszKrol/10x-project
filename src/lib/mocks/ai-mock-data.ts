/**
 * Mock Data dla AI Service - Development & Testing
 *
 * Używane gdy USE_MOCK_AI = true w konfiguracji
 * Symuluje odpowiedzi AI provider dla:
 * - Wyszukiwania roślin (search)
 * - Oceny dopasowania (fit)
 */

import type { PlantSearchResultDto, PlantFitResultDto } from "@/types";

/**
 * Mock responses dla wyszukiwania roślin
 * Różne scenariusze: popularny, rzadki, wielokrotny wynik
 */
export const MOCK_SEARCH_RESPONSES: Record<string, PlantSearchResultDto> = {
  // Popularne warzywa
  pomidor: {
    candidates: [
      {
        name: "Pomidor",
        latin_name: "Solanum lycopersicum",
        source: "ai",
      },
      {
        name: "Pomidor koktajlowy",
        latin_name: "Solanum lycopersicum var. cerasiforme",
        source: "ai",
      },
      {
        name: "Pomidor malinowy",
        latin_name: "Solanum lycopersicum 'Malinowy'",
        source: "ai",
      },
    ],
  },

  ogórek: {
    candidates: [
      {
        name: "Ogórek siewny",
        latin_name: "Cucumis sativus",
        source: "ai",
      },
      {
        name: "Ogórek gruntowy",
        latin_name: "Cucumis sativus var. sativus",
        source: "ai",
      },
    ],
  },

  marchew: {
    candidates: [
      {
        name: "Marchew zwyczajna",
        latin_name: "Daucus carota",
        source: "ai",
      },
    ],
  },

  bazylia: {
    candidates: [
      {
        name: "Bazylia pospolita",
        latin_name: "Ocimum basilicum",
        source: "ai",
      },
      {
        name: "Bazylia cytrynowa",
        latin_name: "Ocimum × citriodorum",
        source: "ai",
      },
      {
        name: "Bazylia tajska",
        latin_name: "Ocimum basilicum var. thyrsiflora",
        source: "ai",
      },
    ],
  },

  // Kwiaty
  róża: {
    candidates: [
      {
        name: "Róża wielkokwiatowa",
        latin_name: "Rosa × hybrida",
        source: "ai",
      },
      {
        name: "Róża pnąca",
        latin_name: "Rosa multiflora",
        source: "ai",
      },
      {
        name: "Róża okrywowa",
        latin_name: "Rosa × wichuraiana",
        source: "ai",
      },
    ],
  },

  lawenda: {
    candidates: [
      {
        name: "Lawenda wąskolistna",
        latin_name: "Lavandula angustifolia",
        source: "ai",
      },
    ],
  },

  // Fallback - brak wyników
  default: {
    candidates: [],
  },
};

/**
 * Mock responses dla oceny dopasowania
 * Różne scenariusze scoringu: idealne, dobre, średnie, słabe
 */
export const MOCK_FIT_RESPONSES: Record<string, PlantFitResultDto> = {
  // Idealne warunki (4-5 gwiazdek)
  pomidor_ideal: {
    sunlight_score: 5,
    humidity_score: 4,
    precip_score: 4,
    overall_score: 5,
    explanation:
      "Pomidor wymaga pełnego słońca (6-8h dziennie), które jest dostępne w tej lokalizacji. " +
      "Wilgotność i opady są na odpowiednim poziomie dla zdrowego wzrostu. " +
      "Strefa klimatyczna 6-7 jest idealna dla uprawy pomidorów w gruncie. " +
      "Rekomendacja: Wiosenna wysadka po ostatnich przymrozkach (maj), regularne podlewanie, mulczowanie.",
  },

  // Dobre warunki (3-4 gwiazdki)
  ogórek_good: {
    sunlight_score: 4,
    humidity_score: 5,
    precip_score: 3,
    overall_score: 4,
    explanation:
      "Ogórki preferują pełne słońce, ale radzą sobie także w półcieniu. " +
      "Wysoka wilgotność jest korzystna. Opady mogą wymagać uzupełnienia podlewaniem. " +
      "Strefa klimatyczna 6-7 pozwala na uprawę od maja do września.",
  },

  // Średnie warunki (2-3 gwiazdki)
  róża_medium: {
    sunlight_score: 3,
    humidity_score: 3,
    precip_score: 3,
    overall_score: 3,
    explanation:
      "Róże preferują pełne słońce (minimum 6h), a dostępne warunki są na granicy minimum. " +
      "Wilgotność i opady są akceptowalne, ale mogą wymagać dodatkowego nawadniania w suchych okresach. " +
      "Rekomendacja: Wybierz odmiany tolerujące półcień, stosuj mulczowanie, nawadniaj regularnie.",
  },

  // Słabe warunki (1-2 gwiazdki)
  lawenda_poor: {
    sunlight_score: 2,
    humidity_score: 1,
    precip_score: 2,
    overall_score: 2,
    explanation:
      "Lawenda wymaga pełnego słońca (8h+), suchej gleby i niskiej wilgotności. " +
      "Warunki w tej lokalizacji (cień, wysoka wilgotność) są niekorzystne. " +
      "Ostrzeżenie: Ryzyko chorób grzybicznych, słaby wzrost, brak kwitnienia. " +
      "Rekomendacja: Rozważ inne rośliny lubujące się w cieniu i wilgoci (np. paprocie, hosty).",
  },

  // Fallback - średnia ocena
  default: {
    sunlight_score: 3,
    humidity_score: 3,
    precip_score: 3,
    overall_score: 3,
    explanation:
      "Brak szczegółowych danych o wymaganiach tej rośliny. " +
      "Zalecamy konsultację z lokalnym ogrodnikiem lub szkółką roślin. " +
      "Monitoruj wzrost i dostosuj pielęgnację według obserwacji.",
  },
};

/**
 * Helper: Get mock search result dla danego query
 */
export function getMockSearchResult(query: string): PlantSearchResultDto {
  const normalized = query.toLowerCase().trim();
  return MOCK_SEARCH_RESPONSES[normalized] || MOCK_SEARCH_RESPONSES.default;
}

/**
 * Helper: Get mock fit result dla danej rośliny
 * Wybiera scenariusz na podstawie nazwy rośliny
 */
export function getMockFitResult(plantName: string): PlantFitResultDto {
  const normalized = plantName.toLowerCase().trim();

  // Mapowanie roślin do scenariuszy
  if (normalized.includes("pomidor")) {
    return MOCK_FIT_RESPONSES.pomidor_ideal;
  }

  if (normalized.includes("ogórek")) {
    return MOCK_FIT_RESPONSES.ogórek_good;
  }

  if (normalized.includes("róża")) {
    return MOCK_FIT_RESPONSES.róża_medium;
  }

  if (normalized.includes("lawenda")) {
    return MOCK_FIT_RESPONSES.lawenda_poor;
  }

  // Pozostałe - średnie oceny
  return MOCK_FIT_RESPONSES.default;
}

/**
 * Helper: Symulacja opóźnienia API (realistic timing)
 */
export async function simulateNetworkDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
