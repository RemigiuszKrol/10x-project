import { z } from "zod";
import type { PlantSearchResultDto, PlantFitResultDto, OpenRouterConfig, PlantFitContext } from "@/types";
import { logger } from "@/lib/utils/logger";
import { denormalizeTemperature } from "@/lib/utils/temperature";

/**
 * Bazowa klasa błędów OpenRouter
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable = false,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Błąd przekroczenia czasu
 */
export class TimeoutError extends OpenRouterError {
  constructor() {
    super(
      "Przekroczono limit czasu oczekiwania (10s)",
      "TIMEOUT",
      true // retryable
    );
    this.name = "TimeoutError";
  }
}

/**
 * Błąd rate limiting
 */
export class RateLimitError extends OpenRouterError {
  constructor(retryAfter: number) {
    super(
      `Zbyt wiele zapytań. Spróbuj ponownie za ${retryAfter}s`,
      "RATE_LIMIT",
      true, // retryable
      retryAfter
    );
    this.name = "RateLimitError";
  }
}

/**
 * Błąd autoryzacji
 */
export class AuthenticationError extends OpenRouterError {
  constructor() {
    super(
      "OPENROUTER_API_KEY jest niepoprawny lub wygasł",
      "AUTHENTICATION",
      false // nie retryable
    );
    this.name = "AuthenticationError";
  }
}

/**
 * Błąd walidacji odpowiedzi
 */
export class ValidationError extends OpenRouterError {
  constructor(details: string) {
    super(
      `Niepoprawna odpowiedź AI: ${details}`,
      "VALIDATION",
      false // nie retryable (AI zwróciło złe dane)
    );
    this.name = "ValidationError";
  }
}

/**
 * Błąd sieci
 */
export class NetworkError extends OpenRouterError {
  constructor() {
    super(
      "Błąd połączenia z OpenRouter",
      "NETWORK",
      true // retryable
    );
    this.name = "NetworkError";
  }
}

/**
 * Błąd niedostatecznych środków
 */
export class InsufficientCreditsError extends OpenRouterError {
  constructor() {
    super(
      "Brak środków na koncie OpenRouter",
      "INSUFFICIENT_CREDITS",
      false // nie retryable
    );
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Zod schemas dla walidacji odpowiedzi
 */
const PlantSearchResultSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string().min(1),
        latin_name: z.string().transform((val) => val.trim() || undefined),
        source: z.literal("ai"),
      })
    )
    .min(1)
    .max(5),
});

const PlantFitResultSchema = z.object({
  sunlight_score: z.number().int().min(1).max(5),
  humidity_score: z.number().int().min(1).max(5),
  precip_score: z.number().int().min(1).max(5),
  temperature_score: z.number().int().min(1).max(5),
  overall_score: z.number().int().min(1).max(5),
  explanation: z.string().min(50),
});

/**
 * Interfejs konfiguracji completion
 */
interface CompletionConfig {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  response_format: ResponseFormat;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

/**
 * Format odpowiedzi JSON Schema
 */
interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

/**
 * Serwis OpenRouter dla integracji AI
 *
 * Zapewnia komunikację z OpenRouter API dla:
 * - Wyszukiwania roślin po nazwie
 * - Oceny dopasowania rośliny do warunków działki
 */
export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;

  constructor(config: OpenRouterConfig) {
    this.config = this.normalizeConfig(config);
    this.validateConfig();
  }

  /**
   * Wyszukuje rośliny po nazwie
   *
   * @param query - Nazwa rośliny (np. "pomidor", "tomato", "Solanum lycopersicum")
   * @returns Lista 1-5 kandydatów z nazwami zwyczajnymi i łacińskimi
   */
  async searchPlants(query: string): Promise<PlantSearchResultDto> {
    const sanitizedQuery = this.sanitizeUserInput(query);

    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      throw new Error("Zapytanie musi mieć minimum 2 znaki");
    }

    return this.executeWithRetry(async () => {
      const systemPrompt = this.buildSystemPrompt("search");
      const userPrompt = this.buildUserPrompt("search", { query: sanitizedQuery });
      const responseFormat = this.buildResponseFormat("search");

      const result = await this.createCompletion({
        model: this.config.searchModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: responseFormat,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        max_tokens: this.config.maxTokens,
      });

      return this.validateResponse<PlantSearchResultDto>(result, "search");
    });
  }

  /**
   * Sprawdza dopasowanie rośliny do warunków działki
   *
   * @param context - Kontekst zawierający nazwę rośliny, lokalizację, klimat i pogodę
   * @returns Oceny dopasowania (1-5) i wyjaśnienie
   */
  async checkPlantFit(context: PlantFitContext): Promise<PlantFitResultDto> {
    return this.executeWithRetry(async () => {
      const systemPrompt = this.buildSystemPrompt("fit");
      const userPrompt = this.buildUserPrompt("fit", context);
      const responseFormat = this.buildResponseFormat("fit");

      const result = await this.createCompletion({
        model: this.config.fitModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: responseFormat,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        max_tokens: this.config.maxTokens,
      });

      return this.validateResponse<PlantFitResultDto>(result, "fit");
    });
  }

  /**
   * Testuje połączenie z OpenRouter API
   *
   * @returns Status połączenia
   */
  async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    try {
      await this.searchPlants("test");
      return {
        success: true,
        model: this.config.searchModel,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Nieznany błąd",
      };
    }
  }

  /**
   * Normalizuje konfigurację z wartościami domyślnymi
   */
  private normalizeConfig(config: OpenRouterConfig): Required<OpenRouterConfig> {
    return {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || "https://openrouter.ai/api/v1",
      searchModel: config.searchModel,
      fitModel: config.fitModel,
      timeout: config.timeout ?? 10000,
      maxRetries: config.maxRetries ?? 1,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 1,
      maxTokens: config.maxTokens ?? 1000,
      appName: config.appName || "PlantsPlaner",
      siteUrl: config.siteUrl || "",
    };
  }

  /**
   * Waliduje konfigurację
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("apiKey nie może być pusty");
    }
    if (this.config.timeout <= 0) {
      throw new Error("timeout musi być > 0");
    }
    if (this.config.maxRetries < 0) {
      throw new Error("maxRetries musi być >= 0");
    }
    if (this.config.temperature < 0 || this.config.temperature > 2) {
      throw new Error("temperature musi być w zakresie 0-2");
    }
    if (this.config.topP < 0 || this.config.topP > 1) {
      throw new Error("topP musi być w zakresie 0-1");
    }
    if (this.config.maxTokens <= 0) {
      throw new Error("maxTokens musi być > 0");
    }
    if (!this.config.searchModel) {
      throw new Error("searchModel nie może być pusty");
    }
    if (!this.config.fitModel) {
      throw new Error("fitModel nie może być pusty");
    }
  }

  /**
   * Buduje prompt systemowy
   */
  private buildSystemPrompt(type: "search" | "fit"): string {
    if (type === "search") {
      return `Jesteś ekspertem ogrodniczym specjalizującym się w botanice i roślinach ogrodowych.
Twoim zadaniem jest znalezienie 1-5 najbardziej pasujących roślin ogrodowych na podstawie zapytania użytkownika.

ZASADY:
1. Rozpoznaj język zapytania (polski, angielski, łaciński)
2. Zwróć rośliny w tej samej kolejności co trafność dopasowania
3. Dla każdej rośliny podaj:
   - name: Nazwa zwyczajna w języku zapytania
   - latin_name: Pełna nazwa naukowa (genus + species + var. jeśli dotyczy)
   - source: Zawsze "ai"
4. Jeśli zapytanie jest wieloznaczne, zwróć różne interpretacje
5. Preferuj rośliny ogrodowe (warzywa, kwiaty, zioła, drzewa owocowe) nad dzikimi

FORMAT ODPOWIEDZI:
{
  "candidates": [
    {
      "name": "Nazwa zwyczajna",
      "latin_name": "Genus species var. varietatis",
      "source": "ai"
    }
  ]
}

WAŻNE: Zwróć TYLKO poprawny JSON bez dodatkowych komentarzy.`;
    }

    // type === 'fit'
    return `Jesteś ekspertem ogrodniczym oceniającym dopasowanie rośliny do warunków działki.
Otrzymasz szczegółowe dane klimatyczne i musisz ocenić, jak dobrze roślina będzie rosła w tych warunkach.

SYSTEM SCORINGU (1-5):
- 5 (Doskonałe): Warunki idealne, ≥90% zgodności z wymaganiami
- 4 (Dobre): Warunki sprzyjające, 80-89% zgodności
- 3 (Przeciętne): Roślina przeżyje, ale nie osiągnie pełni potencjału, 70-79% zgodności
- 2 (Słabe): Warunki trudne, wymaga intensywnej opieki, 60-69% zgodności
- 1 (Złe): Warunki nieodpowiednie, <60% zgodności, roślina prawdopodobnie nie przeżyje

WAGI SEZONÓW (dla półkuli północnej):
- Kwiecień-Wrzesień (miesiące 4-9): waga 2x (sezon wzrostu)
- Październik-Marzec (miesiące 10-3): waga 1x

METRYKI DO OCENY:
1. sunlight_score: Nasłonecznienie (sunlight + sunlight_hours)
2. humidity_score: Wilgotność powietrza (humidity)
3. precip_score: Opady (precip)
4. temperature_score: Temperatura powietrza (temperature) - średnia miesięczna w °C
5. overall_score: Ogólna ocena (weighted average z wagami sezonów, uwzględniając wszystkie 4 metryki)

FORMAT ODPOWIEDZI:
{
  "sunlight_score": 1-5,
  "humidity_score": 1-5,
  "precip_score": 1-5,
  "temperature_score": 1-5,
  "overall_score": 1-5,
  "explanation": "Szczegółowe wyjaśnienie uwzględniające: specyficzne wymagania rośliny (w tym zakres temperatur), analizę danych klimatycznych, rekomendacje (min 50 znaków)"
}

WAŻNE:
- Zwróć TYLKO poprawny JSON bez dodatkowych komentarzy
- explanation MUSI mieć minimum 50 znaków
- Wszystkie scores MUSZĄ być liczbami całkowitymi 1-5`;
  }

  /**
   * Buduje prompt użytkownika
   */
  private buildUserPrompt(type: "search" | "fit", data: { query: string } | PlantFitContext): string {
    if (type === "search") {
      const { query } = data as { query: string };
      return `Użytkownik wpisał: "${query}"

Znajdź najbardziej pasujące rośliny ogrodowe.`;
    }

    // type === 'fit'
    const context = data as PlantFitContext;
    const weatherMonthlyText =
      context.weather_monthly && context.weather_monthly.length > 0
        ? context.weather_monthly
            .map((m) => {
              const tempCelsius = denormalizeTemperature(m.temperature);
              return `- Miesiąc ${m.month}: temp ${tempCelsius.toFixed(1)}°C, słońce ${m.sunlight}/100, wilgotność ${m.humidity}/100, opady ${m.precip}/100`;
            })
            .join("\n")
        : "Brak szczegółowych danych miesięcznych";

    return `Oceń dopasowanie rośliny "${context.plant_name}" do następujących warunków:

LOKALIZACJA:
- Szerokość: ${context.location.lat}°${context.location.lat >= 0 ? "N" : "S"}
- Długość: ${context.location.lon}°${context.location.lon >= 0 ? "E" : "W"}${context.location.address ? `\n- Adres: ${context.location.address}` : ""}${context.climate.zone ? `\n- Strefa klimatyczna: ${context.climate.zone}` : ""}
- Orientacja działki: ${context.orientation}° (0 = północ)

KLIMAT ROCZNY:
- Średnia temperatura: ${context.climate.annual_temp_avg}°C
- Opady roczne: ${context.climate.annual_precip}mm${context.climate.frost_free_days ? `\n- Dni bez przymrozków: ${context.climate.frost_free_days}` : ""}

POZYCJA NA DZIAŁCE:
- Komórka: (${context.cell.x + 1}, ${context.cell.y + 1})${context.cell.sunlight_hours ? `\n- Szacowane nasłonecznienie: ${context.cell.sunlight_hours}h/dzień` : ""}

DANE MIESIĘCZNE (średnie):
${weatherMonthlyText}

Oceń dopasowanie rośliny do tych warunków.`;
  }

  /**
   * Buduje format odpowiedzi JSON Schema
   */
  private buildResponseFormat(type: "search" | "fit"): ResponseFormat {
    if (type === "search") {
      return {
        type: "json_schema",
        json_schema: {
          name: "plant_search_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    latin_name: { type: "string" },
                    source: { type: "string", enum: ["ai"] },
                  },
                  required: ["name", "latin_name", "source"],
                  additionalProperties: false,
                },
                minItems: 1,
                maxItems: 5,
              },
            },
            required: ["candidates"],
            additionalProperties: false,
          },
        },
      };
    }

    // type === 'fit'
    return {
      type: "json_schema",
      json_schema: {
        name: "plant_fit_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            sunlight_score: { type: "integer", minimum: 1, maximum: 5 },
            humidity_score: { type: "integer", minimum: 1, maximum: 5 },
            precip_score: { type: "integer", minimum: 1, maximum: 5 },
            temperature_score: { type: "integer", minimum: 1, maximum: 5 },
            overall_score: { type: "integer", minimum: 1, maximum: 5 },
            explanation: { type: "string", minLength: 50 },
          },
          required: [
            "sunlight_score",
            "humidity_score",
            "precip_score",
            "temperature_score",
            "overall_score",
            "explanation",
          ],
          additionalProperties: false,
        },
      },
    };
  }

  /**
   * Wykonuje zapytanie do OpenRouter API
   */
  private async createCompletion(config: CompletionConfig): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": this.config.siteUrl || "",
          "X-Title": this.config.appName || "",
        },
        body: JSON.stringify({
          model: config.model,
          messages: config.messages,
          response_format: config.response_format,
          temperature: config.temperature ?? this.config.temperature,
          top_p: config.top_p ?? this.config.topP,
          max_tokens: config.max_tokens ?? this.config.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const httpError = await this.handleHttpError(response);
        throw httpError;
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      clearTimeout(timeoutId);
      // Jeśli błąd jest już OpenRouterError, nie przekształcaj go
      if (error instanceof OpenRouterError) {
        throw error;
      }
      // Jeśli błąd jest zwykłym Error z handleHttpError (zawiera "OpenRouter API"), nie przekształcaj go
      if (error instanceof Error && error.message.includes("OpenRouter API")) {
        throw error;
      }
      // W przeciwnym razie przekształć błąd
      throw this.transformError(error);
    }
  }

  /**
   * Obsługuje błędy HTTP
   */
  private async handleHttpError(response: Response): Promise<Error> {
    const status = response.status;

    // 401: Niepoprawny API key
    if (status === 401) {
      return new AuthenticationError();
    }

    // 429: Rate limit
    if (status === 429) {
      try {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = parseInt(retryAfterHeader || "60", 10);
        return new RateLimitError(retryAfter);
      } catch {
        // Jeśli headers.get() rzuca błąd, użyj domyślnej wartości
        return new RateLimitError(60);
      }
    }

    // 402: Brak środków
    if (status === 402) {
      return new InsufficientCreditsError();
    }

    // 500+: Błąd serwera OpenRouter
    if (status >= 500) {
      return new Error("OpenRouter API jest niedostępne");
    }

    // Inne błędy
    try {
      const errorBody = await response.text();
      // Jeśli errorBody jest pusty, nie dodawaj go do komunikatu
      if (errorBody) {
        return new Error(`OpenRouter API error (${status}): ${errorBody}`);
      }
      return new Error(`OpenRouter API error (${status})`);
    } catch {
      // Jeśli response.text() rzuca błąd, zwróć błąd bez body
      return new Error(`OpenRouter API error (${status})`);
    }
  }

  /**
   * Przekształca błędy fetch/timeout
   */
  private transformError(error: unknown): Error {
    // Timeout (AbortError) - sprawdzamy zarówno Error jak i DOMException
    // DOMException może nie być instancją Error w niektórych środowiskach
    if (error && typeof error === "object") {
      const errorObj = error as { name?: string; constructor?: { name?: string } };
      const errorName = errorObj.name || errorObj.constructor?.name;

      // Sprawdź czy to AbortError (może być DOMException lub Error)
      if (errorName === "AbortError") {
        return new TimeoutError();
      }

      // Sprawdź czy to DOMException z name === "AbortError"
      if (error instanceof DOMException && error.name === "AbortError") {
        return new TimeoutError();
      }
    }

    // Network error (TypeError zwykle oznacza problem z fetch)
    if (error instanceof TypeError) {
      return new NetworkError();
    }

    // Już przekształcony błąd
    if (error instanceof Error) {
      return error;
    }

    // Nieznany błąd
    return new Error("Nieznany błąd komunikacji z AI");
  }

  /**
   * Waliduje odpowiedź z użyciem Zod schemas
   */
  private validateResponse<T>(data: unknown, type: "search" | "fit"): T {
    const schema = type === "search" ? PlantSearchResultSchema : PlantFitResultSchema;

    try {
      const validated = schema.parse(data) as T;

      // Dodatkowa sanityzacja dla search results
      if (type === "search") {
        const result = validated as PlantSearchResultDto;
        result.candidates = result.candidates.map((c) => ({
          name: this.sanitizeUserInput(c.name),
          latin_name: c.latin_name && c.latin_name.trim() ? this.sanitizeUserInput(c.latin_name) : undefined,
          source: "ai" as const,
        }));
      }

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
        throw new ValidationError(issues);
      }
      throw error;
    }
  }

  /**
   * Wykonuje operację z retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, retries: number = this.config.maxRetries): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Nie retry dla błędów nie-retryable
        if (error instanceof OpenRouterError && !error.retryable) {
          throw error;
        }

        // Ostatnia próba - throw
        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        this.logError(`Retry ${attempt + 1}/${retries}`, error as Error);
      }
    }

    throw lastError;
  }

  /**
   * Sanityzuje input użytkownika
   */
  private sanitizeUserInput(input: string): string {
    return input
      .trim()
      .slice(0, 200) // Max długość
      .replace(/[<>]/g, "") // Usuń potencjalne tagi HTML
      .replace(/[\r\n]+/g, " "); // Zamień newlines na spacje
  }

  /**
   * Loguje błędy
   */
  private logError(context: string, error: Error, metadata?: Record<string, unknown>): void {
    // Logowanie błędu przez logger
    logger.error(`[OpenRouterService] ${error.message}`, {
      endpoint: context,
      error_code: error instanceof OpenRouterError ? error.code : "UNKNOWN",
      stack: error.stack,
      ...metadata,
    });
  }
}
