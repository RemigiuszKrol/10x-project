/**
 * Weather Service
 *
 * Serwis odpowiedzialny za pobieranie, normalizację i zapisywanie danych pogodowych.
 * Używa Open-Meteo Historical Weather API do pobierania rzeczywistych danych z ostatnich 12 miesięcy.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { DbPlan, WeatherRefreshResultDto } from "@/types";
import { PlanNotFoundError, PlanMissingLocationError } from "@/lib/http/weather.errors";
import { fetchWeatherArchive, getLast12MonthsRange, type OpenMeteoRawResponse } from "@/lib/integrations/open-meteo";

/**
 * Dane znormalizowane dla pojedynczego miesiąca (0-100)
 */
interface NormalizedMonthlyData {
  year: number;
  month: number; // 1-12
  sunlight: number; // 0-100
  humidity: number; // 0-100
  precip: number; // 0-100
  temperature: number; // 0-100
}

export class WeatherService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Odświeża dane pogodowe dla planu użytkownika
   *
   * @param planId - ID planu
   * @param force - czy wymusić odświeżenie nawet jeśli cache jest aktualny
   * @returns wynik odświeżenia (czy dane zostały zaktualizowane i ile miesięcy)
   */
  async refreshWeatherForPlan(planId: string, force = false): Promise<WeatherRefreshResultDto> {
    // 1. Pobierz plan (RLS automatycznie sprawdzi ownership)
    const plan = await this.fetchPlan(planId);
    if (!plan) {
      throw new PlanNotFoundError(planId);
    }

    // 2. Sprawdź czy plan ma lokalizację
    if (plan.latitude === null || plan.longitude === null) {
      throw new PlanMissingLocationError(planId);
    }

    // 3. Sprawdź czy refresh jest potrzebny
    if (!force) {
      const needsRefresh = await this.shouldRefresh(planId);
      if (!needsRefresh) {
        return { refreshed: false, months: 0 };
      }
    }

    // 4. Pobierz dane z Open-Meteo
    const [startDate, endDate] = getLast12MonthsRange();
    const rawData = await fetchWeatherArchive({
      latitude: plan.latitude,
      longitude: plan.longitude,
      startDate,
      endDate,
    });

    // 5. Normalizuj dane do 0-100
    const normalizedData = this.normalizeWeatherData(rawData);

    // 6. Zapisz do bazy
    const savedMonths = await this.saveWeatherData(planId, normalizedData);

    return { refreshed: true, months: savedMonths };
  }

  /**
   * Pobiera plan z bazy (z RLS)
   */
  private async fetchPlan(planId: string): Promise<DbPlan | null> {
    const { data, error } = await this.supabase
      .from("plans")
      .select("id, user_id, latitude, longitude")
      .eq("id", planId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as DbPlan;
  }

  /**
   * Sprawdza czy refresh jest potrzebny (ostatnie odświeżenie > 30 dni temu)
   */
  private async shouldRefresh(planId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("weather_monthly")
      .select("last_refreshed_at")
      .eq("plan_id", planId)
      .order("last_refreshed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Jeśli nie ma danych, trzeba odświeżyć
    if (error || !data) {
      return true;
    }

    // Sprawdź czy ostatnie odświeżenie było > 30 dni temu
    const weatherData = data as { last_refreshed_at: string };
    const lastRefresh = new Date(weatherData.last_refreshed_at);
    const now = new Date();
    const daysSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceRefresh > 30;
  }

  /**
   * Normalizuje surowe dane z Open-Meteo do skali 0-100
   *
   * Zgodnie z dokumentacją Open-Meteo:
   * - shortwave_radiation_sum: MJ/m²/day
   * - sunshine_duration: seconds/day
   * - relative_humidity_2m_mean: % (już 0-100)
   * - precipitation_sum: mm
   * - temperature_2m_mean: °C
   */
  private normalizeWeatherData(raw: OpenMeteoRawResponse): NormalizedMonthlyData[] {
    const dailyData = raw.daily;
    const grouped = new Map<
      string,
      {
        radiation: number[];
        sunshine: number[];
        humidity: number[];
        precip: number[];
        temperature: number[];
      }
    >();

    // 1. Grupuj dane dzienne po miesiącach
    for (let i = 0; i < dailyData.time.length; i++) {
      const date = new Date(dailyData.time[i]);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          radiation: [],
          sunshine: [],
          humidity: [],
          precip: [],
          temperature: [],
        });
      }

      const month = grouped.get(key);
      if (month) {
        month.radiation.push(dailyData.shortwave_radiation_sum[i] || 0);
        month.sunshine.push(dailyData.sunshine_duration[i] || 0);
        month.humidity.push(dailyData.relative_humidity_2m_mean[i] || 0);
        month.precip.push(dailyData.precipitation_sum[i] || 0);
        month.temperature.push(dailyData.temperature_2m_mean[i] ?? 0);
      }
    }

    // 2. Oblicz średnie miesięczne i normalizuj
    const normalized: NormalizedMonthlyData[] = [];

    for (const [key, values] of grouped.entries()) {
      const [year, month] = key.split("-").map(Number);

      // Średnie dzienne dla miesiąca
      const avgRadiation = average(values.radiation); // MJ/m²/day
      const avgSunshineSec = average(values.sunshine); // seconds/day
      const avgHumidity = average(values.humidity); // %
      const totalPrecip = sum(values.precip); // mm/month
      const avgTemperature = average(values.temperature); // °C

      // Konwersja sunshine z sekund na godziny
      const avgSunshineHours = avgSunshineSec / 3600;

      // Normalizacja do 0-100
      const sunlight = Math.round(normalizeRadiation(avgRadiation) * 0.6 + normalizeSunshine(avgSunshineHours) * 0.4);

      const humidity = Math.round(avgHumidity); // już 0-100

      // Normalizacja opadów: zakres 0-300mm/miesiąc
      const precip = Math.round(Math.min((totalPrecip / 300) * 100, 100));

      // Normalizacja temperatury: zakres -30°C do +50°C → 0-100
      const temperature = Math.round(normalizeTemperature(avgTemperature));

      normalized.push({
        year,
        month,
        sunlight: clamp(sunlight, 0, 100),
        humidity: clamp(humidity, 0, 100),
        precip: clamp(precip, 0, 100),
        temperature: clamp(temperature, 0, 100),
      });
    }

    // Sortuj chronologicznie
    return normalized.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  /**
   * Zapisuje znormalizowane dane do bazy (batch upsert)
   */
  private async saveWeatherData(planId: string, data: NormalizedMonthlyData[]): Promise<number> {
    if (data.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    const records = data.map((d) => ({
      plan_id: planId,
      year: d.year,
      month: d.month as number,
      sunlight: d.sunlight as number,
      humidity: d.humidity as number,
      precip: d.precip as number,
      temperature: d.temperature as number,
      last_refreshed_at: now,
    }));

    const { error } = await this.supabase.from("weather_monthly").upsert(records as never[], {
      onConflict: "plan_id,year,month",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to save weather data: ${error.message}`);
    }

    return data.length;
  }
}

// Helper functions

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Normalizuje promieniowanie słoneczne z MJ/m²/day do 0-100
 * Typowy zakres: 0-30 MJ/m²/day
 */
function normalizeRadiation(mjPerM2: number): number {
  return Math.min((mjPerM2 / 30) * 100, 100);
}

/**
 * Normalizuje czas nasłonecznienia z godzin/dzień do 0-100
 * Typowy zakres: 0-16 godzin/dzień
 */
function normalizeSunshine(hours: number): number {
  return Math.min((hours / 16) * 100, 100);
}

/**
 * Normalizuje temperaturę z °C do 0-100
 * Zakres: -30°C do +50°C → 0-100
 * Formuła: ((temp + 30) / 80) * 100
 */
function normalizeTemperature(celsius: number): number {
  return ((celsius + 30) / 80) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Pobiera dane pogodowe dla planu (używane przez GET endpoint)
 *
 * @param options - planId, userId, supabase client
 * @returns lista danych miesięcznych lub null jeśli plan nie należy do użytkownika
 */
export async function getPlanWeather(options: {
  planId: string;
  userId: string;
  supabase: SupabaseClient;
}): Promise<import("@/types").WeatherMonthlyDto[] | null> {
  const { planId, userId, supabase } = options;

  // Sprawdź czy plan należy do użytkownika (z RLS)
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (planError || !plan) {
    return null;
  }

  // Pobierz dane pogodowe (RLS automatycznie filtruje)
  const { data, error } = await supabase
    .from("weather_monthly")
    .select("year, month, sunlight, humidity, precip, temperature, last_refreshed_at")
    .eq("plan_id", planId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }

  return data || [];
}
