/**
 * Open-Meteo Historical Weather API Integration
 *
 * Integracja z Open-Meteo Archive API zgodnie z dokumentacją:
 * https://open-meteo.com/en/docs/historical-weather-api
 *
 * Używamy Archive API (dane historyczne) zamiast Forecast API,
 * ponieważ potrzebujemy rzeczywistych danych z ostatnich 12 miesięcy.
 */

import { UpstreamError, UpstreamTimeoutError } from "@/lib/http/weather.errors";

export interface OpenMeteoParams {
  latitude: number;
  longitude: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Struktura odpowiedzi z Open-Meteo Archive API
 * Zgodnie z dokumentacją: https://open-meteo.com/en/docs/historical-weather-api
 */
export interface OpenMeteoRawResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    shortwave_radiation_sum: string;
    sunshine_duration: string;
    relative_humidity_2m_mean: string;
    precipitation_sum: string;
    temperature_2m_mean: string;
  };
  daily: {
    time: string[]; // ISO dates ["2024-01-01", "2024-01-02", ...]
    shortwave_radiation_sum: number[]; // MJ/m²
    sunshine_duration: number[]; // seconds
    relative_humidity_2m_mean: number[]; // %
    precipitation_sum: number[]; // mm
    temperature_2m_mean: number[]; // °C
  };
}

/**
 * Oblicza zakres dat dla ostatnich 12 miesięcy
 * Archive API ma ~5 dni opóźnienia, więc cofamy się o 5 dni od dzisiaj
 *
 * @returns [startDate, endDate] w formacie YYYY-MM-DD
 */
export function getLast12MonthsRange(): [string, string] {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 5); // Archive API ma ~5 dni opóźnienia

  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 12);

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  return [formatDate(startDate), formatDate(endDate)];
}

/**
 * Pobiera dane historyczne z Open-Meteo Archive API
 *
 * @param params - parametry zapytania (lat, lon, zakres dat)
 * @param timeoutMs - timeout w milisekundach (domyślnie 30s)
 * @returns surowe dane pogodowe z API
 * @throws {UpstreamError} - błąd HTTP lub nieprawidłowa odpowiedź
 * @throws {UpstreamTimeoutError} - timeout podczas zapytania
 */
export async function fetchWeatherArchive(params: OpenMeteoParams, timeoutMs = 1200): Promise<OpenMeteoRawResponse> {
  const baseUrl = import.meta.env.OPEN_METEO_API_URL || "https://archive-api.open-meteo.com/v1/archive";
  const url = new URL(baseUrl);

  // Parametry zgodnie z dokumentacją Open-Meteo
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  url.searchParams.set("start_date", params.startDate);
  url.searchParams.set("end_date", params.endDate);
  url.searchParams.set(
    "daily",
    "shortwave_radiation_sum,sunshine_duration,relative_humidity_2m_mean,precipitation_sum,temperature_2m_mean"
  );
  url.searchParams.set("timezone", "auto");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "PlantsPlaner/1.0", // Identyfikacja aplikacji
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new UpstreamError(`Open-Meteo API returned ${response.status}: ${errorText}`, response.status);
    }

    const data = await response.json();

    // Walidacja podstawowej struktury odpowiedzi
    if (!data.daily || !data.daily.time || !Array.isArray(data.daily.time)) {
      throw new UpstreamError("Invalid response structure from Open-Meteo API");
    }

    // Walidacja że mamy wszystkie wymagane metryki
    const requiredFields = [
      "shortwave_radiation_sum",
      "sunshine_duration",
      "relative_humidity_2m_mean",
      "precipitation_sum",
      "temperature_2m_mean",
    ];
    for (const field of requiredFields) {
      if (
        !data.daily[field] ||
        !Array.isArray(data.daily[field]) ||
        data.daily[field].length !== data.daily.time.length
      ) {
        throw new UpstreamError(`Missing or invalid field in Open-Meteo response: ${field}`);
      }
    }

    return data as OpenMeteoRawResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamTimeoutError();
    }
    if (error instanceof UpstreamError || error instanceof UpstreamTimeoutError) {
      throw error;
    }
    throw new UpstreamError(`Failed to fetch from Open-Meteo: ${error}`);
  } finally {
    clearTimeout(timeout);
  }
}
