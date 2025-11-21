/**
 * Weather Service Error Classes
 *
 * Hierarchia błędów dla operacji pobierania i normalizacji danych pogodowych.
 * Wszystkie błędy dziedziczą z WeatherServiceError dla łatwego rozróżnienia.
 */

export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherServiceError";
  }
}

/**
 * Plan nie został znaleziony lub użytkownik nie ma do niego dostępu
 */
export class PlanNotFoundError extends WeatherServiceError {
  constructor(planId: string) {
    super(`Plan with ID ${planId} not found`);
    this.name = "PlanNotFoundError";
  }
}

/**
 * Plan nie ma ustawionej lokalizacji (latitude/longitude są null)
 */
export class PlanMissingLocationError extends WeatherServiceError {
  constructor(planId: string) {
    super(`Plan ${planId} must have location (latitude/longitude) set before weather data can be fetched`);
    this.name = "PlanMissingLocationError";
  }
}

/**
 * Błąd komunikacji z zewnętrznym serwisem pogodowym (Open-Meteo API)
 */
export class UpstreamError extends WeatherServiceError {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/**
 * Timeout podczas komunikacji z zewnętrznym serwisem pogodowym
 */
export class UpstreamTimeoutError extends WeatherServiceError {
  constructor() {
    super("Weather service request timed out");
    this.name = "UpstreamTimeoutError";
  }
}
