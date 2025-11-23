import { OpenRouterService } from "./openrouter.service";

/**
 * Singleton instance serwisu OpenRouter
 * Używany przez API routes
 */
let openRouterInstance: OpenRouterService | null = null;

/**
 * Zwraca singleton instance serwisu OpenRouter
 *
 * Automatycznie inicjalizuje serwis ze zmiennych środowiskowych:
 * - OPENROUTER_API_KEY (wymagany)
 * - OPENROUTER_SEARCH_MODEL (opcjonalny, domyślnie: openai/gpt-4o-mini)
 * - OPENROUTER_FIT_MODEL (opcjonalny, domyślnie: openai/gpt-4o-mini)
 * - OPENROUTER_APP_NAME (opcjonalny, domyślnie: PlantsPlaner)
 * - OPENROUTER_SITE_URL (opcjonalny)
 *
 * @throws Error jeśli OPENROUTER_API_KEY nie jest ustawiony
 */
export function getOpenRouterService(): OpenRouterService {
  if (!openRouterInstance) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }

    openRouterInstance = new OpenRouterService({
      apiKey,
      searchModel: import.meta.env.OPENROUTER_SEARCH_MODEL || "openai/gpt-4o-mini",
      fitModel: import.meta.env.OPENROUTER_FIT_MODEL || "openai/gpt-4o-mini",
      timeout: 10000,
      maxRetries: 1,
      temperature: 0.7,
      topP: 1,
      maxTokens: 1000,
      appName: import.meta.env.OPENROUTER_APP_NAME || "PlantsPlaner",
      siteUrl: import.meta.env.OPENROUTER_SITE_URL || "",
    });
  }

  return openRouterInstance;
}

/**
 * Resetuje singleton instance (dla testów)
 */
export function resetOpenRouterService(): void {
  openRouterInstance = null;
}
