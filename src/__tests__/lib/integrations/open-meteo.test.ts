import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLast12MonthsRange, fetchWeatherArchive } from "@/lib/integrations/open-meteo";
import { UpstreamError, UpstreamTimeoutError } from "@/lib/http/weather.errors";
import type { OpenMeteoRawResponse } from "@/lib/integrations/open-meteo";

// Mock global fetch
const mockFetch = vi.fn();

// Mock AbortController
const mockAbort = vi.fn();

// Klasa mockująca AbortController
class MockAbortController {
  signal: AbortSignal;
  abort: ReturnType<typeof vi.fn>;

  constructor() {
    this.signal = {} as AbortSignal;
    this.abort = mockAbort;
  }
}

describe("open-meteo integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    // Setup fetch mock
    global.fetch = mockFetch;
    mockFetch.mockClear();

    // Setup AbortController mock
    mockAbort.mockClear();
    global.AbortController = MockAbortController as unknown as typeof AbortController;

    // Setup fake timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getLast12MonthsRange", () => {
    it("powinien zwrócić zakres dat dla ostatnich 12 miesięcy z uwzględnieniem 5-dniowego opóźnienia", () => {
      // Ustawiamy stałą datę dla przewidywalnych testów
      const mockDate = new Date("2024-12-20T12:00:00Z");
      vi.setSystemTime(mockDate);

      const [startDate, endDate] = getLast12MonthsRange();

      // endDate powinien być 5 dni przed dzisiaj (2024-12-15)
      expect(endDate).toBe("2024-12-15");

      // startDate powinien być 12 miesięcy przed endDate (2023-12-15)
      expect(startDate).toBe("2023-12-15");

      // Format powinien być YYYY-MM-DD
      expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("powinien poprawnie obsłużyć przejście przez rok", () => {
      const mockDate = new Date("2024-01-05T12:00:00Z");
      vi.setSystemTime(mockDate);

      const [startDate, endDate] = getLast12MonthsRange();

      // endDate: 2024-01-05 - 5 dni = 2023-12-31
      expect(endDate).toBe("2023-12-31");

      // startDate: 2023-12-31 - 12 miesięcy = 2022-12-31
      expect(startDate).toBe("2022-12-31");
    });

    it("powinien poprawnie obsłużyć przejście przez luty (rok przestępny)", () => {
      const mockDate = new Date("2024-03-01T12:00:00Z");
      vi.setSystemTime(mockDate);

      const [startDate, endDate] = getLast12MonthsRange();

      // endDate: 2024-03-01 - 5 dni = 2024-02-25
      expect(endDate).toBe("2024-02-25");

      // startDate: 2024-02-25 - 12 miesięcy = 2023-02-25
      expect(startDate).toBe("2023-02-25");
    });

    it("powinien zwrócić daty w formacie ISO (YYYY-MM-DD)", () => {
      const [startDate, endDate] = getLast12MonthsRange();

      // Sprawdzamy format regex
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(startDate).toMatch(dateRegex);
      expect(endDate).toMatch(dateRegex);

      // Sprawdzamy że można sparsować jako daty
      expect(() => new Date(startDate)).not.toThrow();
      expect(() => new Date(endDate)).not.toThrow();
    });

    it("powinien zwrócić daty gdzie startDate < endDate", () => {
      const [startDate, endDate] = getLast12MonthsRange();

      const start = new Date(startDate);
      const end = new Date(endDate);

      expect(start.getTime()).toBeLessThan(end.getTime());
    });
  });

  describe("fetchWeatherArchive", () => {
    const mockParams = {
      latitude: 52.23,
      longitude: 21.01,
      startDate: "2023-01-01",
      endDate: "2024-01-01",
    };

    const createMockResponse = (overrides?: Partial<OpenMeteoRawResponse>): OpenMeteoRawResponse => {
      const dates: string[] = [];
      const dataLength = 365; // 1 rok danych

      for (let i = 0; i < dataLength; i++) {
        const date = new Date("2023-01-01");
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split("T")[0]);
      }

      return {
        latitude: 52.23,
        longitude: 21.01,
        generationtime_ms: 10,
        utc_offset_seconds: 3600,
        timezone: "Europe/Warsaw",
        timezone_abbreviation: "CET",
        elevation: 100,
        daily_units: {
          time: "iso8601",
          shortwave_radiation_sum: "MJ/m²",
          sunshine_duration: "s",
          relative_humidity_2m_mean: "%",
          precipitation_sum: "mm",
          temperature_2m_mean: "°C",
        },
        daily: {
          time: dates,
          shortwave_radiation_sum: Array(dataLength).fill(15),
          sunshine_duration: Array(dataLength).fill(28800),
          relative_humidity_2m_mean: Array(dataLength).fill(70),
          precipitation_sum: Array(dataLength).fill(5),
          temperature_2m_mean: Array(dataLength).fill(15),
        },
        ...overrides,
      };
    };

    it("powinien pomyślnie pobrać dane pogodowe z API", async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      const result = await fetchWeatherArchive(mockParams);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Sprawdzamy URL i parametry
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("archive-api.open-meteo.com");
      expect(callUrl).toContain("latitude=52.23");
      expect(callUrl).toContain("longitude=21.01");
      expect(callUrl).toContain("start_date=2023-01-01");
      expect(callUrl).toContain("end_date=2024-01-01");
      expect(callUrl).toContain("daily=shortwave_radiation_sum");
      expect(callUrl).toContain("timezone=auto");

      // Sprawdzamy headers
      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers).toEqual({
        Accept: "application/json",
        "User-Agent": "PlantsPlaner/1.0",
      });
    });

    it("powinien użyć domyślnego URL jeśli OPEN_METEO_API_URL nie jest ustawiony", async () => {
      const originalEnv = import.meta.env.OPEN_METEO_API_URL;
      delete (import.meta.env as any).OPEN_METEO_API_URL;

      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await fetchWeatherArchive(mockParams);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("https://archive-api.open-meteo.com/v1/archive");

      // Przywracamy oryginalną wartość
      if (originalEnv) {
        (import.meta.env as any).OPEN_METEO_API_URL = originalEnv;
      }
    });

    it("powinien użyć niestandardowego URL z OPEN_METEO_API_URL", async () => {
      const customUrl = "https://custom-api.example.com/v1/archive";
      (import.meta.env as any).OPEN_METEO_API_URL = customUrl;

      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await fetchWeatherArchive(mockParams);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain(customUrl);

      delete (import.meta.env as any).OPEN_METEO_API_URL;
    });

    it("powinien użyć domyślnego timeout 1200ms", async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => mockResponse,
                text: async () => "",
              });
            }, 100);
          })
      );

      const promise = fetchWeatherArchive(mockParams);
      vi.advanceTimersByTime(100);
      await promise;

      // Sprawdzamy że AbortController został utworzony (sprawdzamy przez sprawdzenie czy fetch został wywołany z signal)
      expect(mockFetch).toHaveBeenCalled();
      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.signal).toBeDefined();
    });

    it("powinien użyć niestandardowego timeout", async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => mockResponse,
                text: async () => "",
              });
            }, 100);
          })
      );

      const customTimeout = 5000;
      const promise = fetchWeatherArchive(mockParams, customTimeout);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockFetch).toHaveBeenCalled();
      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.signal).toBeDefined();
    });

    it("powinien rzucić UpstreamTimeoutError gdy timeout zostanie przekroczony", async () => {
      // Symulujemy AbortError (który jest rzucany gdy timeout zostanie przekroczony)
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      
      // Mock fetch, który rzuca AbortError (symuluje timeout)
      mockFetch.mockImplementation(() => Promise.reject(abortError));

      const timeoutMs = 1000;
      const promise = fetchWeatherArchive(mockParams, timeoutMs);

      // Uruchamiamy timers, aby trigger timeout
      vi.advanceTimersByTime(timeoutMs);
      
      // Czekamy na promise z błędem
      await expect(promise).rejects.toThrow(UpstreamTimeoutError);
    });

    it("powinien rzucić UpstreamError dla statusu HTTP 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Open-Meteo API returned 404/);
    });

    it("powinien rzucić UpstreamError dla statusu HTTP 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Open-Meteo API returned 500/);
    });

    it("powinien obsłużyć błąd podczas czytania response.text()", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error("Failed to read text");
        },
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Open-Meteo API returned 500/);
    });

    it("powinien rzucić UpstreamError gdy odpowiedź nie ma pola daily", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          latitude: 52.23,
          longitude: 21.01,
          // brak pola daily
        }),
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Invalid response structure/);
    });

    it("powinien rzucić UpstreamError gdy daily.time nie jest tablicą", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          latitude: 52.23,
          longitude: 21.01,
          daily: {
            time: "not-an-array",
          },
        }),
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Invalid response structure/);
    });

    it("powinien rzucić UpstreamError gdy brakuje pola shortwave_radiation_sum", async () => {
      const mockResponse = createMockResponse();
      delete (mockResponse.daily as any).shortwave_radiation_sum;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Missing or invalid field.*shortwave_radiation_sum/);
    });

    it("powinien rzucić UpstreamError gdy brakuje pola sunshine_duration", async () => {
      const mockResponse = createMockResponse();
      delete (mockResponse.daily as any).sunshine_duration;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/sunshine_duration/);
    });

    it("powinien rzucić UpstreamError gdy brakuje pola relative_humidity_2m_mean", async () => {
      const mockResponse = createMockResponse();
      delete (mockResponse.daily as any).relative_humidity_2m_mean;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/relative_humidity_2m_mean/);
    });

    it("powinien rzucić UpstreamError gdy brakuje pola precipitation_sum", async () => {
      const mockResponse = createMockResponse();
      delete (mockResponse.daily as any).precipitation_sum;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/precipitation_sum/);
    });

    it("powinien rzucić UpstreamError gdy brakuje pola temperature_2m_mean", async () => {
      const mockResponse = createMockResponse();
      delete (mockResponse.daily as any).temperature_2m_mean;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/temperature_2m_mean/);
    });

    it("powinien rzucić UpstreamError gdy pole nie jest tablicą", async () => {
      const mockResponse = createMockResponse();
      (mockResponse.daily as any).shortwave_radiation_sum = "not-an-array";

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/shortwave_radiation_sum/);
    });

    it("powinien rzucić UpstreamError gdy długość tablicy nie pasuje do time.length", async () => {
      const mockResponse = createMockResponse();
      mockResponse.daily.time = ["2023-01-01", "2023-01-02", "2023-01-03"];
      mockResponse.daily.shortwave_radiation_sum = [15, 16]; // 2 elementy zamiast 3

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/shortwave_radiation_sum/);
    });

    it("powinien obsłużyć błąd sieci (network error)", async () => {
      const networkError = new Error("Network request failed");
      mockFetch.mockRejectedValue(networkError);

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Failed to fetch from Open-Meteo/);
    });

    it("powinien obsłużyć błąd parsowania JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
        text: async () => "",
      });

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Failed to fetch from Open-Meteo/);
    });

    it("powinien przekazać dalej UpstreamError bez modyfikacji", async () => {
      const originalError = new UpstreamError("Original error", 500);
      mockFetch.mockRejectedValue(originalError);

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamError);
      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(/Original error/);
    });

    it("powinien przekazać dalej UpstreamTimeoutError bez modyfikacji", async () => {
      const originalError = new UpstreamTimeoutError();
      mockFetch.mockRejectedValueOnce(originalError);

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow(UpstreamTimeoutError);
    });

    it("powinien wyczyścić timeout w bloku finally", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const mockResponse = createMockResponse();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await fetchWeatherArchive(mockParams);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("powinien wyczyścić timeout nawet gdy wystąpi błąd", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const networkError = new Error("Network request failed");
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(fetchWeatherArchive(mockParams)).rejects.toThrow();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("powinien poprawnie obsłużyć różne wartości latitude i longitude", async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      const params = {
        latitude: -33.8688, // Sydney
        longitude: 151.2093,
        startDate: "2023-01-01",
        endDate: "2024-01-01",
      };

      await fetchWeatherArchive(params);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("latitude=-33.8688");
      expect(callUrl).toContain("longitude=151.2093");
    });

    it("powinien poprawnie obsłużyć różne zakresy dat", async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      const params = {
        latitude: 52.23,
        longitude: 21.01,
        startDate: "2022-06-01",
        endDate: "2022-06-30",
      };

      await fetchWeatherArchive(params);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("start_date=2022-06-01");
      expect(callUrl).toContain("end_date=2022-06-30");
    });

    it("powinien użyć AbortSignal w fetch options", async () => {
      const mockResponse = createMockResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => "",
      });

      await fetchWeatherArchive(mockParams);

      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.signal).toBeDefined();
    });
  });
});

