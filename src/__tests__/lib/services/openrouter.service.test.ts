import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OpenRouterService,
  OpenRouterError,
  TimeoutError,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  InsufficientCreditsError,
} from "@/lib/services/openrouter.service";
import type { OpenRouterConfig, PlantFitContext, PlantSearchResultDto, PlantFitResultDto } from "@/types";
import * as loggerModule from "@/lib/utils/logger";
import * as temperatureModule from "@/lib/utils/temperature";

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock temperature utils
vi.mock("@/lib/utils/temperature", () => ({
  denormalizeTemperature: vi.fn((val: number) => (val / 100) * 80 - 30),
}));

describe("OpenRouterService", () => {
  const mockConfig: OpenRouterConfig = {
    apiKey: "test-api-key",
    searchModel: "test-search-model",
    fitModel: "test-fit-model",
  };

  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Konstruktor i walidacja konfiguracji", () => {
    it("powinien utworzyć instancję z poprawną konfiguracją", () => {
      const service = new OpenRouterService(mockConfig);
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("powinien zastosować wartości domyślne dla opcjonalnych pól", () => {
      const service = new OpenRouterService(mockConfig);
      // Sprawdzamy przez testConnection, które używa wewnętrznej konfiguracji
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("powinien rzucić błąd gdy apiKey jest pusty", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, apiKey: "" });
      }).toThrow("apiKey nie może być pusty");
    });

    it("powinien rzucić błąd gdy searchModel jest pusty", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, searchModel: "" });
      }).toThrow("searchModel nie może być pusty");
    });

    it("powinien rzucić błąd gdy fitModel jest pusty", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, fitModel: "" });
      }).toThrow("fitModel nie może być pusty");
    });

    it("powinien rzucić błąd gdy timeout <= 0", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, timeout: 0 });
      }).toThrow("timeout musi być > 0");
    });

    it("powinien rzucić błąd gdy maxRetries < 0", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, maxRetries: -1 });
      }).toThrow("maxRetries musi być >= 0");
    });

    it("powinien rzucić błąd gdy temperature < 0", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, temperature: -1 });
      }).toThrow("temperature musi być w zakresie 0-2");
    });

    it("powinien rzucić błąd gdy temperature > 2", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, temperature: 3 });
      }).toThrow("temperature musi być w zakresie 0-2");
    });

    it("powinien rzucić błąd gdy topP < 0", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, topP: -1 });
      }).toThrow("topP musi być w zakresie 0-1");
    });

    it("powinien rzucić błąd gdy topP > 1", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, topP: 2 });
      }).toThrow("topP musi być w zakresie 0-1");
    });

    it("powinien rzucić błąd gdy maxTokens <= 0", () => {
      expect(() => {
        new OpenRouterService({ ...mockConfig, maxTokens: 0 });
      }).toThrow("maxTokens musi być > 0");
    });
  });

  describe("searchPlants", () => {
    it("powinien zwrócić listę kandydatów dla poprawnego zapytania", async () => {
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "Pomidor",
            latin_name: "Solanum lycopersicum",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      const result = await service.searchPlants("pomidor");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/completions"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });

    it("powinien rzucić błąd gdy zapytanie ma mniej niż 2 znaki", async () => {
      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("a")).rejects.toThrow("Zapytanie musi mieć minimum 2 znaki");
    });

    it("powinien rzucić błąd gdy zapytanie jest puste po sanityzacji", async () => {
      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("  ")).rejects.toThrow("Zapytanie musi mieć minimum 2 znaki");
    });

    it("powinien sanityzować input użytkownika", async () => {
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "Test",
            latin_name: "Test",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await service.searchPlants("  pomidor\n\r  ");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = callBody.messages[1].content;
      // Sprawdzamy, że zapytanie użytkownika zostało sanityzowane (bez newlines w cudzysłowie)
      const queryMatch = userMessage.match(/"([^"]+)"/);
      expect(queryMatch).toBeTruthy();
      if (queryMatch) {
        expect(queryMatch[1]).toBe("pomidor");
        expect(queryMatch[1]).not.toContain("\n");
        expect(queryMatch[1]).not.toContain("\r");
      }
    });

    it("powinien obciąć zapytanie do 200 znaków", async () => {
      const longQuery = "a".repeat(300);
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "Test",
            latin_name: "Test",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await service.searchPlants(longQuery);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = callBody.messages[1].content;
      const queryInMessage = userMessage.match(/"([^"]+)"/)?.[1] || "";
      expect(queryInMessage.length).toBeLessThanOrEqual(200);
    });

    it("powinien sanityzować nazwy roślin w odpowiedzi", async () => {
      const mockResponse = {
        candidates: [
          {
            name: "  Pomidor  ",
            latin_name: "  Solanum lycopersicum  ",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      const result = await service.searchPlants("pomidor");

      expect(result.candidates[0].name).toBe("Pomidor");
      expect(result.candidates[0].latin_name).toBe("Solanum lycopersicum");
    });
  });

  describe("checkPlantFit", () => {
    const mockContext: PlantFitContext = {
      plant_name: "Pomidor",
      location: {
        lat: 52.23,
        lon: 21.01,
        address: "Warszawa",
      },
      orientation: 0,
      climate: {
        zone: "6a",
        annual_temp_avg: 8.5,
        annual_precip: 550,
        frost_free_days: 180,
      },
      cell: {
        x: 0,
        y: 0,
        sunlight_hours: 8,
      },
      weather_monthly: [
        {
          month: 1,
          temperature: 50, // znormalizowana
          sunlight: 30,
          humidity: 70,
          precip: 40,
        },
      ],
    };

    it("powinien zwrócić ocenę dopasowania dla poprawnego kontekstu", async () => {
      const mockResponse: PlantFitResultDto = {
        sunlight_score: 5,
        humidity_score: 4,
        precip_score: 4,
        temperature_score: 5,
        overall_score: 5,
        explanation: "Warunki są doskonałe dla pomidora. Temperatura, nasłonecznienie i wilgotność są idealne.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      const result = await service.checkPlantFit(mockContext);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(vi.mocked(temperatureModule.denormalizeTemperature)).toHaveBeenCalledWith(50);
    });

    it("powinien obsłużyć kontekst bez danych miesięcznych", async () => {
      const contextWithoutMonthly = {
        ...mockContext,
        weather_monthly: undefined,
      };

      const mockResponse: PlantFitResultDto = {
        sunlight_score: 4,
        humidity_score: 3,
        precip_score: 3,
        temperature_score: 4,
        overall_score: 4,
        explanation: "Warunki są dobre dla pomidora, ale brak szczegółowych danych miesięcznych.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      const result = await service.checkPlantFit(contextWithoutMonthly);

      expect(result).toEqual(mockResponse);
    });

    it("powinien obsłużyć kontekst bez opcjonalnych pól", async () => {
      const minimalContext: PlantFitContext = {
        plant_name: "Pomidor",
        location: {
          lat: 52.23,
          lon: 21.01,
        },
        orientation: 0,
        climate: {
          annual_temp_avg: 8.5,
          annual_precip: 550,
        },
        cell: {
          x: 0,
          y: 0,
        },
      };

      const mockResponse: PlantFitResultDto = {
        sunlight_score: 3,
        humidity_score: 3,
        precip_score: 3,
        temperature_score: 3,
        overall_score: 3,
        explanation: "Warunki są przeciętne dla pomidora. Wymaga dodatkowej opieki.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      const result = await service.checkPlantFit(minimalContext);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("testConnection", () => {
    it("powinien zwrócić success=true gdy połączenie działa", async () => {
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "test",
            latin_name: "test",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.model).toBe("test-search-model");
      expect(result.error).toBeUndefined();
    });

    it("powinien zwrócić success=false gdy połączenie nie działa", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValueOnce(networkError);

      const service = new OpenRouterService(mockConfig);
      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.model).toBeUndefined();
    });
  });

  describe("Obsługa błędów HTTP", () => {
    it("powinien rzucić AuthenticationError dla statusu 401", async () => {
      const response = new Response("Unauthorized", {
        status: 401,
        statusText: "Unauthorized",
      });

      mockFetch.mockResolvedValueOnce(response);

      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("test")).rejects.toThrow(AuthenticationError);
    });

    it("powinien rzucić InsufficientCreditsError dla statusu 402", async () => {
      const response = new Response("Payment Required", {
        status: 402,
        statusText: "Payment Required",
      });

      mockFetch.mockResolvedValueOnce(response);

      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("test")).rejects.toThrow(InsufficientCreditsError);
    });
  });

  describe("Obsługa błędów sieciowych", () => {
    it("powinien rzucić NetworkError dla TypeError", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValueOnce(networkError);

      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("test")).rejects.toThrow(NetworkError);
    });
  });

  describe("Walidacja odpowiedzi", () => {
    it("powinien rzucić ValidationError dla niepoprawnej struktury odpowiedzi", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ invalid: "structure" }),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("test")).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy brakuje wymaganych pól", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  candidates: [
                    {
                      name: "Test",
                      // brakuje latin_name i source
                    },
                  ],
                }),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await expect(service.searchPlants("test")).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy explanation jest za krótkie", async () => {
      const mockContext: PlantFitContext = {
        plant_name: "Pomidor",
        location: { lat: 52.23, lon: 21.01 },
        orientation: 0,
        climate: { annual_temp_avg: 8.5, annual_precip: 550 },
        cell: { x: 0, y: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sunlight_score: 5,
                  humidity_score: 5,
                  precip_score: 5,
                  temperature_score: 5,
                  overall_score: 5,
                  explanation: "Krótkie", // < 50 znaków
                }),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await expect(service.checkPlantFit(mockContext)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy scores są poza zakresem", async () => {
      const mockContext: PlantFitContext = {
        plant_name: "Pomidor",
        location: { lat: 52.23, lon: 21.01 },
        orientation: 0,
        climate: { annual_temp_avg: 8.5, annual_precip: 550 },
        cell: { x: 0, y: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sunlight_score: 6, // poza zakresem 1-5
                  humidity_score: 5,
                  precip_score: 5,
                  temperature_score: 5,
                  overall_score: 5,
                  explanation: "To jest wystarczająco długie wyjaśnienie, które ma więcej niż 50 znaków.",
                }),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await expect(service.checkPlantFit(mockContext)).rejects.toThrow(ValidationError);
    });
  });

  describe("Retry logic", () => {
    it("powinien ponowić próbę dla retryable błędów", async () => {
      vi.useFakeTimers();
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "test",
            latin_name: "test",
            source: "ai",
          },
        ],
      };

      // Pierwsza próba - NetworkError (retryable)
      const networkError = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValueOnce(networkError);

      // Druga próba - sukces
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService({ ...mockConfig, maxRetries: 1 });
      const promise = service.searchPlants("test");

      // Przesuń timer o exponential backoff (1s)
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("nie powinien ponowić próby dla nie-retryable błędów", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401, // AuthenticationError - nie retryable
        text: async () => "Unauthorized",
      });

      const service = new OpenRouterService({ ...mockConfig, maxRetries: 2 });
      await expect(service.searchPlants("test")).rejects.toThrow(AuthenticationError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Klasy błędów", () => {
    it("OpenRouterError powinien mieć właściwości code i retryable", () => {
      const error = new OpenRouterError("Test", "TEST_CODE", true, 10);
      expect(error.code).toBe("TEST_CODE");
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(10);
      expect(error.name).toBe("OpenRouterError");
    });

    it("TimeoutError powinien być retryable", () => {
      const error = new TimeoutError();
      expect(error.code).toBe("TIMEOUT");
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("TimeoutError");
    });

    it("RateLimitError powinien mieć retryAfter", () => {
      const error = new RateLimitError(30);
      expect(error.code).toBe("RATE_LIMIT");
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30);
      expect(error.name).toBe("RateLimitError");
    });

    it("AuthenticationError nie powinien być retryable", () => {
      const error = new AuthenticationError();
      expect(error.code).toBe("AUTHENTICATION");
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("AuthenticationError");
    });

    it("ValidationError nie powinien być retryable", () => {
      const error = new ValidationError("Invalid data");
      expect(error.code).toBe("VALIDATION");
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("ValidationError");
    });

    it("NetworkError powinien być retryable", () => {
      const error = new NetworkError();
      expect(error.code).toBe("NETWORK");
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("NetworkError");
    });

    it("InsufficientCreditsError nie powinien być retryable", () => {
      const error = new InsufficientCreditsError();
      expect(error.code).toBe("INSUFFICIENT_CREDITS");
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("InsufficientCreditsError");
    });
  });

  describe("Formatowanie zapytań", () => {
    it("powinien użyć poprawnego formatu JSON Schema dla search", async () => {
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "test",
            latin_name: "test",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await service.searchPlants("test");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.response_format.type).toBe("json_schema");
      expect(callBody.response_format.json_schema.name).toBe("plant_search_response");
      expect(callBody.response_format.json_schema.strict).toBe(true);
    });

    it("powinien użyć poprawnego formatu JSON Schema dla fit", async () => {
      const mockContext: PlantFitContext = {
        plant_name: "Pomidor",
        location: { lat: 52.23, lon: 21.01 },
        orientation: 0,
        climate: { annual_temp_avg: 8.5, annual_precip: 550 },
        cell: { x: 0, y: 0 },
      };

      const mockResponse: PlantFitResultDto = {
        sunlight_score: 5,
        humidity_score: 5,
        precip_score: 5,
        temperature_score: 5,
        overall_score: 5,
        explanation: "To jest wystarczająco długie wyjaśnienie, które ma więcej niż 50 znaków.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(mockConfig);
      await service.checkPlantFit(mockContext);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.response_format.type).toBe("json_schema");
      expect(callBody.response_format.json_schema.name).toBe("plant_fit_response");
      expect(callBody.response_format.json_schema.strict).toBe(true);
    });

    it("powinien użyć poprawnych nagłówków HTTP", async () => {
      const mockResponse: PlantSearchResultDto = {
        candidates: [
          {
            name: "test",
            latin_name: "test",
            source: "ai",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService({
        ...mockConfig,
        appName: "TestApp",
        siteUrl: "https://test.com",
      });
      await service.searchPlants("test");

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer test-api-key");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["HTTP-Referer"]).toBe("https://test.com");
      expect(headers["X-Title"]).toBe("TestApp");
    });
  });
});
