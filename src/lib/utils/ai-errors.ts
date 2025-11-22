/**
 * Moduł AI - Error Utilities
 *
 * Funkcje pomocnicze do tworzenia i obsługi błędów AI
 */

import type { AIError } from "@/types";

/**
 * Fabryka błędów AI
 *
 * Tworzy obiekt AIError z odpowiednimi wartościami domyślnymi
 *
 * @param type - Typ błędu
 * @param context - Kontekst: 'search' lub 'fit'
 * @param retryAfter - Czas oczekiwania przed retry (opcjonalny, dla rate_limit)
 * @param details - Szczegóły techniczne (opcjonalne)
 * @returns Obiekt AIError
 *
 * @example
 * ```ts
 * throw createAIError('timeout', 'search');
 * throw createAIError('rate_limit', 'fit', 60);
 * ```
 */
export function createAIError(
  type: AIError["type"],
  context: AIError["context"],
  retryAfter?: number,
  details?: string
): AIError {
  const errorMessages: Record<AIError["type"], string> = {
    timeout: "Przekroczono limit czasu oczekiwania na odpowiedź AI (10s)",
    bad_json: "Otrzymano niepoprawną odpowiedź od AI",
    rate_limit: "Przekroczono limit zapytań do AI. Spróbuj ponownie za chwilę",
    network: "Brak połączenia z internetem",
    unknown: "Wystąpił nieoczekiwany błąd podczas komunikacji z AI",
  };

  return {
    type,
    message: errorMessages[type],
    context,
    canRetry: type !== "bad_json", // bad_json zazwyczaj nie ma sensu retry
    retryAfter,
    details,
  };
}

/**
 * Sprawdza czy błąd jest typu AIError
 *
 * @param error - Obiekt do sprawdzenia
 * @returns true jeśli to AIError
 */
export function isAIError(error: unknown): error is AIError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error &&
    "context" in error &&
    "canRetry" in error
  );
}

/**
 * Konwertuje natywny błąd JavaScript na AIError
 *
 * @param error - Błąd do konwersji
 * @param context - Kontekst: 'search' lub 'fit'
 * @returns AIError
 *
 * @example
 * ```ts
 * try {
 *   await fetch(...);
 * } catch (error) {
 *   throw toAIError(error, 'search');
 * }
 * ```
 */
export function toAIError(error: unknown, context: AIError["context"]): AIError {
  // Już jest AIError
  if (isAIError(error)) {
    return error;
  }

  // AbortError (timeout)
  if (error instanceof Error && error.name === "AbortError") {
    return createAIError("timeout", context);
  }

  // TypeError (network)
  if (error instanceof TypeError) {
    return createAIError("network", context, undefined, error.message);
  }

  // Nieznany błąd
  const details = error instanceof Error ? error.message : String(error);
  return createAIError("unknown", context, undefined, details);
}

/**
 * Formatuje czas retry dla UI
 *
 * @param seconds - Liczba sekund
 * @returns Sformatowany string np. "60s" lub "2m"
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
