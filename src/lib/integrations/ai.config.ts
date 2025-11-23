/**
 * Moduł AI - Configuration
 *
 * Konfiguracja endpointów, timeout, retry policies dla AI service
 */

/**
 * Konfiguracja AI zgodnie z PRD
 *
 * - Timeout: 10s zgodnie z wymaganiami
 * - MaxRetries: 1 - pojedyncze ponowienie
 * - Endpoints: API routes dla search i fit
 * - UseMock: Toggle dla mock data (development)
 */
export const AI_CONFIG = {
  baseUrl: import.meta.env.PUBLIC_API_URL || "",
  endpoints: {
    search: "/api/ai/plants/search",
    fit: "/api/ai/plants/fit",
  },
  timeout: 10000, // 10s zgodnie z PRD
  maxRetries: 1,
  headers: {
    "Content-Type": "application/json",
  },
  // Toggle dla mock data - ustaw na true dla developmentu bez AI provider
  useMock: import.meta.env.PUBLIC_USE_MOCK_AI === "true" || false,
  // Opóźnienie dla mock responses (ms) - symuluje network latency
  mockDelay: 800,
} as const;

/**
 * Typ konfiguracji AI (readonly)
 */
export type AIConfig = typeof AI_CONFIG;

/**
 * Progi scoring dla tooltipów/dokumentacji
 *
 * Wykorzystywane w UI do wyświetlania znaczenia scores:
 * - 5 gwiazdek: ≥90 (excellent)
 * - 4 gwiazdki: 80-89 (good)
 * - 3 gwiazdki: 70-79 (fair)
 * - 2 gwiazdki: 60-69 (poor)
 * - 1 gwiazdka: <60 (bad)
 */
export const SCORE_THRESHOLDS = {
  excellent: { min: 90, score: 5 },
  good: { min: 80, score: 4 },
  fair: { min: 70, score: 3 },
  poor: { min: 60, score: 2 },
  bad: { min: 0, score: 1 },
} as const;

/**
 * Wagi sezonów dla oceny dopasowania (dla tooltipów)
 *
 * - Growing season (IV-IX): waga 2 (northern hemisphere)
 * - Off season (X-III): waga 1
 *
 * Wykorzystywane w SeasonInfoTooltip
 */
export const SEASON_WEIGHTS = {
  northern: {
    growingSeason: { months: [4, 5, 6, 7, 8, 9], weight: 2 },
    offSeason: { months: [10, 11, 12, 1, 2, 3], weight: 1 },
  },
  southern: {
    growingSeason: { months: [10, 11, 12, 1, 2, 3], weight: 2 },
    offSeason: { months: [4, 5, 6, 7, 8, 9], weight: 1 },
  },
} as const;

/**
 * Etykiety dla scores (UI labels)
 */
export const SCORE_LABELS = {
  5: "Doskonałe",
  4: "Dobre",
  3: "Przeciętne",
  2: "Słabe",
  1: "Złe",
} as const;

/**
 * Opisy parametrów fit (dla tooltipów)
 */
export const FIT_PARAMETER_DESCRIPTIONS = {
  sunlight: "Ocena nasłonecznienia w lokalizacji względem wymagań rośliny",
  humidity: "Ocena wilgotności powietrza względem wymagań rośliny",
  precip: "Ocena opadów (deszcz, śnieg) względem wymagań rośliny",
  temperature: "Ocena temperatury powietrza w lokalizacji względem wymagań rośliny",
  overall: "Ogólna ocena dopasowania uwzględniająca wszystkie parametry",
} as const;
