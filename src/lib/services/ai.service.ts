/**
 * Moduł AI - Service Layer
 *
 * Encapsulacja logiki komunikacji z AI:
 * - Timeout handling
 * - Error transformation
 * - Integracja z API endpoints
 * - Mock data dla developmentu (gdy USE_MOCK_AI=true)
 *
 * TODO (poza zakresem MVP):
 * - Faktyczna integracja z AI provider (OpenAI, Claude, etc.)
 * - Prompt engineering dla search i fit
 * - Caching odpowiedzi AI
 * - Monitoring i logging
 */

import type { PlantSearchResultDto, PlantFitCommand, PlantFitResultDto } from "@/types";
import { getMockSearchResult, getMockFitResult, simulateNetworkDelay } from "@/lib/mocks/ai-mock-data";

/**
 * Konfiguracja serwisu AI
 */
export interface AIServiceConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  headers?: Record<string, string>;
  useMock?: boolean; // Toggle dla mock data
  mockDelay?: number; // Opóźnienie dla mock responses (ms)
}

/**
 * Serwis komunikacji z AI
 *
 * @example
 * ```ts
 * const aiService = new AIService({
 *   baseUrl: '',
 *   timeout: 10000,
 *   maxRetries: 1
 * });
 *
 * const results = await aiService.search('tomato');
 * ```
 */
export class AIService {
  constructor(private config: AIServiceConfig) {}

  /**
   * Wyszukiwanie roślin po nazwie przez AI
   *
   * @param query - Nazwa rośliny do wyszukania
   * @returns Lista kandydatów z nazwami i nazwami łacińskimi
   *
   * @throws AIError - timeout, bad_json, rate_limit, network, unknown
   *
   * @example
   * ```ts
   * const result = await aiService.search("pomidor");
   * // { candidates: [{ name: "Pomidor", latin_name: "Solanum lycopersicum", source: "ai" }] }
   * ```
   */
  async search(query: string): Promise<PlantSearchResultDto> {
    // Mock data dla developmentu
    if (this.config.useMock) {
      await simulateNetworkDelay(this.config.mockDelay);
      return getMockSearchResult(query);
    }

    // TODO: Implement actual AI call with body: { query }
    return this.request<PlantSearchResultDto>("POST", "/api/ai/plants/search", { query });
  }

  /**
   * Ocena dopasowania rośliny do lokalizacji planu
   *
   * @param command - Parametry: plan_id, x, y, plant_name
   * @returns Scores 1-5 dla sunlight, humidity, precip, overall + explanation
   *
   * @throws AIError - timeout, bad_json, rate_limit, network, unknown
   *
   * @example
   * ```ts
   * const result = await aiService.checkFit({
   *   plan_id: "123",
   *   x: 5,
   *   y: 10,
   *   plant_name: "Pomidor"
   * });
   * // { sunlight_score: 5, humidity_score: 4, precip_score: 4, overall_score: 5, explanation: "..." }
   * ```
   */
  async checkFit(command: PlantFitCommand): Promise<PlantFitResultDto> {
    // Mock data dla developmentu
    if (this.config.useMock) {
      await simulateNetworkDelay(this.config.mockDelay);
      return getMockFitResult(command.plant_name);
    }

    // TODO: Implement actual AI call with body: command
    return this.request<PlantFitResultDto>("POST", "/api/ai/plants/fit", command);
  }

  /**
   * Wewnętrzna metoda request z timeout i error handling
   *
   * @private
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param body - Request body
   * @returns Odpowiedź z API
   *
   * TODO: Zaimplementować:
   * - AbortController dla timeout
   * - Retry logic z exponential backoff
   * - Error transformation do AIError
   * - Response validation
   */
  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    // Placeholder implementation
    // Faktyczna implementacja będzie zawierać:
    // 1. AbortController + setTimeout dla timeout
    // 2. Fetch z headers z config
    // 3. Obsługę błędów HTTP (429, 504, etc.)
    // 4. Walidację JSON response
    // 5. Retry logic
    // Body będzie wykorzystane w finalnej implementacji: { body: JSON.stringify(body) }

    throw new Error(`AIService.request not implemented: ${method} ${endpoint} ${body ? JSON.stringify(body) : ""}`);
  }
}
