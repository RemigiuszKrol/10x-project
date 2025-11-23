/**
 * Funkcje pomocnicze do konwersji temperatury
 */

/**
 * Denormalizuje temperaturę z zakresu 0-100 do °C
 * Zakres: 0-100 → -30°C do +50°C
 * Formuła: ((normalized / 100) * 80) - 30
 *
 * @param normalized - Znormalizowana wartość temperatury (0-100)
 * @returns Temperatura w °C
 */
export function denormalizeTemperature(normalized: number): number {
  return (normalized / 100) * 80 - 30;
}

/**
 * Denormalizuje temperaturę z zakresu 0-100 do °C (wersja z obsługą null)
 *
 * @param normalized - Znormalizowana wartość temperatury (0-100) lub null
 * @returns Temperatura w °C lub null
 */
export function denormalizeTemperatureNullable(normalized: number | null): number | null {
  if (normalized === null) return null;
  return Math.round(denormalizeTemperature(normalized));
}
