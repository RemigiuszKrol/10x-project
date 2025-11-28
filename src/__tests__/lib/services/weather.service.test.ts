import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { WeatherService, getPlanWeather } from "@/lib/services/weather.service";
import { PlanNotFoundError, PlanMissingLocationError } from "@/lib/http/weather.errors";
import type { OpenMeteoRawResponse } from "@/lib/integrations/open-meteo";
import * as openMeteoModule from "@/lib/integrations/open-meteo";

/**
 * Helper do tworzenia mocka Supabase clienta
 * Symuluje chainable API Supabase (from().select().eq().single() etc.)
 */
function createMockSupabaseClient() {
  const createQueryBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      upsert: vi.fn(),
    };
    return builder;
  };

  const mockQueryBuilder = createQueryBuilder();
  const mockFrom = vi.fn().mockReturnValue(mockQueryBuilder);

  const mockSupabase = {
    from: mockFrom,
  } as unknown as SupabaseClient;

  return { mockSupabase, mockQueryBuilder, createQueryBuilder, mockFrom };
}

/**
 * Helper do tworzenia mockowych danych z Open-Meteo
 */
function createMockOpenMeteoResponse(): OpenMeteoRawResponse {
  const now = new Date();
  const dates: string[] = [];
  const radiation: number[] = [];
  const sunshine: number[] = [];
  const humidity: number[] = [];
  const precip: number[] = [];
  const temperature: number[] = [];

  // Generuj dane dla ostatnich 3 miesięcy (dla uproszczenia testów)
  for (let i = 0; i < 90; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);

    // Symuluj różne wartości
    radiation.push(15 + Math.random() * 10); // 15-25 MJ/m²/day
    sunshine.push(28800 + Math.random() * 14400); // 8-12 godzin (w sekundach)
    humidity.push(60 + Math.random() * 20); // 60-80%
    precip.push(Math.random() * 10); // 0-10mm
    temperature.push(10 + Math.random() * 15); // 10-25°C
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
      time: dates.reverse(),
      shortwave_radiation_sum: radiation.reverse(),
      sunshine_duration: sunshine.reverse(),
      relative_humidity_2m_mean: humidity.reverse(),
      precipitation_sum: precip.reverse(),
      temperature_2m_mean: temperature.reverse(),
    },
  };
}

describe("weather.service", () => {
  const planId = "plan-123";
  const userId = "user-456";
  const mockPlan = {
    id: planId,
    user_id: userId,
    latitude: 52.23,
    longitude: 21.01,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WeatherService.refreshWeatherForPlan", () => {
    it("powinien odświeżyć dane pogodowe gdy wszystko jest poprawne", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache (brak danych = trzeba odświeżyć)
      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock dla zapisu danych
      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // from() jest wywoływane wielokrotnie w odpowiedniej kolejności
      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Mock funkcji z open-meteo
      const mockOpenMeteoResponse = createMockOpenMeteoResponse();
      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      expect(result.refreshed).toBe(true);
      expect(result.months).toBeGreaterThan(0);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(openMeteoModule.fetchWeatherArchive).toHaveBeenCalledWith({
        latitude: mockPlan.latitude,
        longitude: mockPlan.longitude,
        startDate: "2023-01-01",
        endDate: "2024-01-01",
      });
    });

    it("powinien rzucić PlanNotFoundError gdy plan nie istnieje", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock zwraca null gdy plan nie istnieje (fetchPlan zwraca null)
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });

      mockFrom.mockReturnValue(plansBuilder);

      const service = new WeatherService(mockSupabase);

      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow(PlanNotFoundError);
      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow(`Plan with ID ${planId} not found`);
    });

    it("powinien rzucić PlanMissingLocationError gdy plan nie ma lokalizacji", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const planWithoutLocation = {
        ...mockPlan,
        latitude: null,
        longitude: null,
      };

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValue({
        data: planWithoutLocation,
        error: null,
      });

      mockFrom.mockReturnValue(plansBuilder);

      const service = new WeatherService(mockSupabase);

      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow(PlanMissingLocationError);
      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow(
        `Plan ${planId} must have location (latitude/longitude) set before weather data can be fetched`
      );
    });

    it("powinien rzucić PlanMissingLocationError gdy latitude jest null", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const planWithoutLatitude = {
        ...mockPlan,
        latitude: null,
        longitude: 21.01,
      };

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: planWithoutLatitude,
        error: null,
      });

      mockFrom.mockReturnValueOnce(plansBuilder);

      const service = new WeatherService(mockSupabase);

      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow(PlanMissingLocationError);
    });

    it("powinien rzucić PlanMissingLocationError gdy longitude jest null", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const planWithoutLongitude = {
        ...mockPlan,
        latitude: 52.23,
        longitude: null,
      };

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: planWithoutLongitude,
        error: null,
      });

      mockFrom.mockReturnValueOnce(plansBuilder);

      const service = new WeatherService(mockSupabase);

      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow(PlanMissingLocationError);
    });

    it("powinien zwrócić refreshed: false gdy cache jest aktualny (<30 dni)", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache - ostatnie odświeżenie 10 dni temu
      const cacheBuilder = createQueryBuilder();
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: { last_refreshed_at: tenDaysAgo.toISOString() },
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder); // dla weather_monthly (shouldRefresh)

      // Spy na fetchWeatherArchive przed testem
      const fetchSpy = vi.spyOn(openMeteoModule, "fetchWeatherArchive");

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      expect(result.refreshed).toBe(false);
      expect(result.months).toBe(0);
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("powinien zwrócić refreshed: false gdy cache jest dokładnie 30 dni", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache - ostatnie odświeżenie dokładnie 30 dni temu
      const cacheBuilder = createQueryBuilder();
      const exactly30DaysAgo = new Date();
      exactly30DaysAgo.setDate(exactly30DaysAgo.getDate() - 30);
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: { last_refreshed_at: exactly30DaysAgo.toISOString() },
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder); // dla weather_monthly (shouldRefresh)

      const fetchSpy = vi.spyOn(openMeteoModule, "fetchWeatherArchive");

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      // Dokładnie 30 dni = nie odświeżamy (warunek to >30)
      expect(result.refreshed).toBe(false);
      expect(result.months).toBe(0);
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("powinien wymusić odświeżenie gdy force=true nawet jeśli cache jest aktualny", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla zapisu danych
      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData) - skip shouldRefresh gdy force=true

      // Mock funkcji z open-meteo
      const mockOpenMeteoResponse = createMockOpenMeteoResponse();
      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId, true);

      expect(result.refreshed).toBe(true);
      expect(openMeteoModule.fetchWeatherArchive).toHaveBeenCalled();
    });

    it("powinien odświeżyć dane gdy cache jest starszy niż 30 dni", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache - ostatnie odświeżenie 35 dni temu
      const cacheBuilder = createQueryBuilder();
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: { last_refreshed_at: thirtyFiveDaysAgo.toISOString() },
        error: null,
      });

      // Mock dla zapisu danych
      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Mock funkcji z open-meteo
      const mockOpenMeteoResponse = createMockOpenMeteoResponse();
      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      expect(result.refreshed).toBe(true);
      expect(openMeteoModule.fetchWeatherArchive).toHaveBeenCalled();
    });

    it("powinien rzucić błąd gdy zapis danych się nie powiedzie", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache
      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock dla zapisu danych - błąd
      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error", code: "23505" },
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Mock funkcji z open-meteo
      const mockOpenMeteoResponse = createMockOpenMeteoResponse();
      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);

      await expect(service.refreshWeatherForPlan(planId)).rejects.toThrow("Failed to save weather data");
    });

    it("powinien zwrócić 0 miesięcy gdy dane z Open-Meteo są puste", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache
      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock dla zapisu danych
      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Mock funkcji z open-meteo - pusta odpowiedź
      const emptyResponse: OpenMeteoRawResponse = {
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
          time: [],
          shortwave_radiation_sum: [],
          sunshine_duration: [],
          relative_humidity_2m_mean: [],
          precipitation_sum: [],
          temperature_2m_mean: [],
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(emptyResponse);

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      expect(result.refreshed).toBe(true);
      expect(result.months).toBe(0);
      expect(weatherMonthlyBuilder.upsert).not.toHaveBeenCalled();
    });
  });

  describe("WeatherService - normalizacja danych", () => {
    it("powinien poprawnie normalizować dane pogodowe z Open-Meteo", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla sprawdzenia cache
      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock dla zapisu danych
      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Stwórz mockowe dane z konkretnymi wartościami do testowania normalizacji
      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          // 30 dni stycznia 2024 (wszystkie w tym samym miesiącu)
          time: Array.from({ length: 30 }, (_, i) => {
            const date = new Date("2024-01-01");
            date.setDate(date.getDate() + i);
            return date.toISOString().split("T")[0];
          }),
          // Promieniowanie: 15 MJ/m²/day (50% z 30 MJ/m² = 50)
          shortwave_radiation_sum: Array(30).fill(15),
          // Nasłonecznienie: 8 godzin = 28800 sekund (50% z 16h = 50)
          sunshine_duration: Array(30).fill(28800),
          // Wilgotność: 70% (już w skali 0-100)
          relative_humidity_2m_mean: Array(30).fill(70),
          // Opady: 150mm/miesiąc (50% z 300mm = 50)
          precipitation_sum: Array(30).fill(5), // 5mm/dzień * 30 = 150mm/miesiąc
          // Temperatura: 10°C ((-30 do +50) = 80°C zakres, 10+30=40, 40/80*100=50)
          temperature_2m_mean: Array(30).fill(10),
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      expect(result.refreshed).toBe(true);
      expect(result.months).toBe(1); // Jeden miesiąc danych

      // Sprawdź czy zapis został wywołany z znormalizowanymi danymi
      expect(weatherMonthlyBuilder.upsert).toHaveBeenCalled();
      const upsertCall = weatherMonthlyBuilder.upsert.mock.calls[0];
      expect(upsertCall[0]).toBeDefined();
      const records = upsertCall[0] as {
        plan_id: string;
        year: number;
        month: number;
        sunlight: number;
        humidity: number;
        precip: number;
        temperature: number;
      }[];

      expect(records.length).toBe(1);
      const record = records[0];

      // Sprawdź normalizację
      // Sunlight: (15/30*100)*0.6 + (8/16*100)*0.4 = 50*0.6 + 50*0.4 = 30 + 20 = 50
      expect(record.sunlight).toBe(50);
      // Humidity: 70% (bez zmian)
      expect(record.humidity).toBe(70);
      // Precip: 150/300*100 = 50
      expect(record.precip).toBe(50);
      // Temperature: ((10+30)/80)*100 = 50
      expect(record.temperature).toBe(50);
      expect(record.year).toBe(2024);
      expect(record.month).toBe(1);
    });

    it("powinien poprawnie obsłużyć wartości graniczne w normalizacji", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      const testDate = new Date("2024-01-01");
      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          time: [testDate.toISOString().split("T")[0]],
          // Maksymalne wartości
          shortwave_radiation_sum: [30], // 100% z 30 MJ/m²
          sunshine_duration: [57600], // 16 godzin = 100%
          relative_humidity_2m_mean: [100], // 100%
          precipitation_sum: [300], // 100% z 300mm
          temperature_2m_mean: [50], // Maksymalna temperatura
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      await service.refreshWeatherForPlan(planId);

      const records = (
        weatherMonthlyBuilder.upsert.mock.calls[0][0] as {
          sunlight: number;
          humidity: number;
          precip: number;
          temperature: number;
        }[]
      )[0];

      // Wszystkie wartości powinny być w zakresie 0-100
      expect(records.sunlight).toBeLessThanOrEqual(100);
      expect(records.humidity).toBeLessThanOrEqual(100);
      expect(records.precip).toBeLessThanOrEqual(100);
      expect(records.temperature).toBeLessThanOrEqual(100);

      expect(records.sunlight).toBeGreaterThanOrEqual(0);
      expect(records.humidity).toBeGreaterThanOrEqual(0);
      expect(records.precip).toBeGreaterThanOrEqual(0);
      expect(records.temperature).toBeGreaterThanOrEqual(0);
    });

    it("powinien poprawnie obsłużyć wartości minimalne w normalizacji", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      const testDate = new Date("2024-01-01");
      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          time: [testDate.toISOString().split("T")[0]],
          // Minimalne wartości
          shortwave_radiation_sum: [0],
          sunshine_duration: [0],
          relative_humidity_2m_mean: [0],
          precipitation_sum: [0],
          temperature_2m_mean: [-30], // Minimalna temperatura
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      await service.refreshWeatherForPlan(planId);

      const records = (
        weatherMonthlyBuilder.upsert.mock.calls[0][0] as {
          sunlight: number;
          humidity: number;
          precip: number;
          temperature: number;
        }[]
      )[0];

      // Wszystkie wartości powinny być w zakresie 0-100
      expect(records.sunlight).toBe(0);
      expect(records.humidity).toBe(0);
      expect(records.precip).toBe(0);
      expect(records.temperature).toBe(0);
    });

    it("powinien poprawnie obsłużyć wartości przekraczające maksimum (clamp)", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      const testDate = new Date("2024-01-01");
      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          time: [testDate.toISOString().split("T")[0]],
          // Wartości przekraczające maksimum
          shortwave_radiation_sum: [50], // > 30 MJ/m²
          sunshine_duration: [86400], // 24h > 16h
          relative_humidity_2m_mean: [150], // > 100%
          precipitation_sum: [500], // > 300mm
          temperature_2m_mean: [100], // > 50°C
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      await service.refreshWeatherForPlan(planId);

      const records = (
        weatherMonthlyBuilder.upsert.mock.calls[0][0] as {
          sunlight: number;
          humidity: number;
          precip: number;
          temperature: number;
        }[]
      )[0];

      // Wszystkie wartości powinny być ograniczone do 100
      expect(records.sunlight).toBe(100);
      expect(records.humidity).toBe(100); // clamp(150, 0, 100) = 100
      expect(records.precip).toBe(100);
      expect(records.temperature).toBe(100);
    });

    it("powinien poprawnie obsłużyć wartości null/undefined w danych", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      const testDate = new Date("2024-01-01");
      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          time: [testDate.toISOString().split("T")[0]],
          // Wartości null/undefined są obsługiwane przez || 0 i ?? 0
          shortwave_radiation_sum: [null as unknown as number],
          sunshine_duration: [undefined as unknown as number],
          relative_humidity_2m_mean: [null as unknown as number],
          precipitation_sum: [undefined as unknown as number],
          temperature_2m_mean: [null as unknown as number],
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      await service.refreshWeatherForPlan(planId);

      const records = (
        weatherMonthlyBuilder.upsert.mock.calls[0][0] as {
          sunlight: number;
          humidity: number;
          precip: number;
          temperature: number;
        }[]
      )[0];

      // Wszystkie wartości powinny być 0 gdy dane są null/undefined
      // Uwaga: temperatura null daje 0 po normalizacji, ale normalizacja temperatury
      // dla 0°C daje ((0+30)/80)*100 = 37.5 ≈ 38
      expect(records.sunlight).toBe(0);
      expect(records.humidity).toBe(0);
      expect(records.precip).toBe(0);
      // Temperatura null → 0 → normalizeTemperature(0) = ((0+30)/80)*100 = 37.5 ≈ 38
      expect(records.temperature).toBe(38);
    });

    it("powinien poprawnie grupować dane dzienne po miesiącach", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Stwórz dane dla dwóch miesięcy
      const janDates: string[] = [];
      const febDates: string[] = [];
      for (let i = 1; i <= 31; i++) {
        janDates.push(`2024-01-${String(i).padStart(2, "0")}`);
      }
      for (let i = 1; i <= 28; i++) {
        febDates.push(`2024-02-${String(i).padStart(2, "0")}`);
      }

      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          time: [...janDates, ...febDates],
          shortwave_radiation_sum: Array(59).fill(15),
          sunshine_duration: Array(59).fill(28800),
          relative_humidity_2m_mean: Array(59).fill(70),
          precipitation_sum: Array(59).fill(5),
          temperature_2m_mean: Array(59).fill(10),
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      const result = await service.refreshWeatherForPlan(planId);

      expect(result.months).toBe(2); // Dwa miesiące

      // Sprawdź zapisane dane
      expect(weatherMonthlyBuilder.upsert).toHaveBeenCalled();
      const records = weatherMonthlyBuilder.upsert.mock.calls[0][0] as {
        year: number;
        month: number;
      }[];

      expect(records.length).toBe(2);
      expect(records.some((r) => r.year === 2024 && r.month === 1)).toBe(true);
      expect(records.some((r) => r.year === 2024 && r.month === 2)).toBe(true);
    });

    it("powinien posortować dane chronologicznie po normalizacji", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cacheBuilder = createQueryBuilder();
      cacheBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const weatherMonthlyBuilder = createQueryBuilder();
      weatherMonthlyBuilder.upsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(plansBuilder) // dla plans
        .mockReturnValueOnce(cacheBuilder) // dla weather_monthly (shouldRefresh)
        .mockReturnValueOnce(weatherMonthlyBuilder); // dla weather_monthly (saveWeatherData)

      // Stwórz dane dla trzech miesięcy w losowej kolejności
      const dates: string[] = [];
      dates.push(...Array.from({ length: 28 }, (_, i) => `2024-02-${String(i + 1).padStart(2, "0")}`)); // Luty
      dates.push(...Array.from({ length: 31 }, (_, i) => `2024-01-${String(i + 1).padStart(2, "0")}`)); // Styczeń
      dates.push(...Array.from({ length: 31 }, (_, i) => `2024-03-${String(i + 1).padStart(2, "0")}`)); // Marzec

      const mockOpenMeteoResponse: OpenMeteoRawResponse = {
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
          shortwave_radiation_sum: Array(90).fill(15),
          sunshine_duration: Array(90).fill(28800),
          relative_humidity_2m_mean: Array(90).fill(70),
          precipitation_sum: Array(90).fill(5),
          temperature_2m_mean: Array(90).fill(10),
        },
      };

      vi.spyOn(openMeteoModule, "getLast12MonthsRange").mockReturnValue(["2023-01-01", "2024-01-01"]);
      vi.spyOn(openMeteoModule, "fetchWeatherArchive").mockResolvedValueOnce(mockOpenMeteoResponse);

      const service = new WeatherService(mockSupabase);
      await service.refreshWeatherForPlan(planId);

      const records = weatherMonthlyBuilder.upsert.mock.calls[0][0] as {
        year: number;
        month: number;
      }[];

      // Sprawdź czy dane są posortowane chronologicznie
      expect(records.length).toBe(3);
      expect(records[0].year).toBe(2024);
      expect(records[0].month).toBe(1); // Styczeń
      expect(records[1].month).toBe(2); // Luty
      expect(records[2].month).toBe(3); // Marzec
    });
  });

  describe("getPlanWeather", () => {
    it("powinien zwrócić dane pogodowe gdy plan należy do użytkownika", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const mockWeatherData = [
        {
          year: 2024,
          month: 1,
          sunlight: 50,
          humidity: 70,
          precip: 50,
          temperature: 50,
          last_refreshed_at: "2024-01-15T10:00:00Z",
        },
        {
          year: 2024,
          month: 2,
          sunlight: 60,
          humidity: 75,
          precip: 45,
          temperature: 55,
          last_refreshed_at: "2024-02-15T10:00:00Z",
        },
      ];

      // Mock dla sprawdzenia ownership planu - pierwsze wywołanie from("plans")
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      // Mock dla pobrania danych pogodowych - drugie wywołanie from("weather_monthly")
      const weatherBuilder = createQueryBuilder();
      weatherBuilder.limit.mockResolvedValueOnce({
        data: mockWeatherData,
        error: null,
      });
      mockFrom.mockReturnValueOnce(weatherBuilder);

      const result = await getPlanWeather({
        planId,
        userId,
        supabase: mockSupabase,
      });

      expect(result).toEqual(mockWeatherData);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockSupabase.from).toHaveBeenCalledWith("weather_monthly");
    });

    it("powinien zwrócić null gdy plan nie należy do użytkownika", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla sprawdzenia ownership planu - plan nie istnieje lub nie należy do użytkownika
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      const result = await getPlanWeather({
        planId,
        userId,
        supabase: mockSupabase,
      });

      expect(result).toBeNull();
    });

    it("powinien zwrócić null gdy plan nie istnieje", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      const result = await getPlanWeather({
        planId,
        userId,
        supabase: mockSupabase,
      });

      expect(result).toBeNull();
    });

    it("powinien zwrócić pustą tablicę gdy brak danych pogodowych", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla sprawdzenia ownership planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      // Mock dla pobrania danych pogodowych - brak danych
      const weatherBuilder = createQueryBuilder();
      weatherBuilder.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockFrom.mockReturnValueOnce(weatherBuilder);

      const result = await getPlanWeather({
        planId,
        userId,
        supabase: mockSupabase,
      });

      expect(result).toEqual([]);
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy pobieraniu danych pogodowych", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      // Mock dla sprawdzenia ownership planu
      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      // Mock dla pobrania danych pogodowych - błąd
      const weatherBuilder = createQueryBuilder();
      weatherBuilder.limit.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error", code: "23505" },
      });
      mockFrom.mockReturnValueOnce(weatherBuilder);

      await expect(
        getPlanWeather({
          planId,
          userId,
          supabase: mockSupabase,
        })
      ).rejects.toThrow("Failed to fetch weather data");
    });

    it("powinien zwrócić dane posortowane chronologicznie (najnowsze pierwsze)", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const mockWeatherData = [
        {
          year: 2024,
          month: 1,
          sunlight: 50,
          humidity: 70,
          precip: 50,
          temperature: 50,
          last_refreshed_at: "2024-01-15T10:00:00Z",
        },
        {
          year: 2024,
          month: 3,
          sunlight: 60,
          humidity: 75,
          precip: 45,
          temperature: 55,
          last_refreshed_at: "2024-03-15T10:00:00Z",
        },
        {
          year: 2024,
          month: 2,
          sunlight: 55,
          humidity: 72,
          precip: 48,
          temperature: 52,
          last_refreshed_at: "2024-02-15T10:00:00Z",
        },
      ];

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      const weatherBuilder = createQueryBuilder();
      weatherBuilder.limit.mockResolvedValueOnce({
        data: mockWeatherData,
        error: null,
      });
      mockFrom.mockReturnValueOnce(weatherBuilder);

      await getPlanWeather({
        planId,
        userId,
        supabase: mockSupabase,
      });

      // Sprawdź czy order() zostało wywołane z odpowiednimi parametrami
      expect(weatherBuilder.order).toHaveBeenCalledWith("year", { ascending: false });
      expect(weatherBuilder.order).toHaveBeenCalledWith("month", { ascending: false });
    });

    it("powinien ograniczyć wyniki do 12 miesięcy", async () => {
      const { mockSupabase, createQueryBuilder, mockFrom } = createMockSupabaseClient();

      const plansBuilder = createQueryBuilder();
      plansBuilder.single.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });
      mockFrom.mockReturnValueOnce(plansBuilder);

      const weatherBuilder = createQueryBuilder();
      weatherBuilder.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockFrom.mockReturnValueOnce(weatherBuilder);

      await getPlanWeather({
        planId,
        userId,
        supabase: mockSupabase,
      });

      // Sprawdź czy limit(12) zostało wywołane
      expect(weatherBuilder.limit).toHaveBeenCalledWith(12);
    });
  });
});
