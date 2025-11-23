/**
 * API Error Mapper - Mapowanie kodów błędów API na komunikaty użytkownika
 *
 * Mapuje kody błędów z ApiErrorResponse na czytelne komunikaty dla użytkownika
 * z obsługą field_errors dla ValidationError.
 */

import type { ApiErrorResponse } from "@/types";

/**
 * Mapuje kod błędu API na komunikat użytkownika
 *
 * @param errorCode - Kod błędu z ApiErrorResponse
 * @param defaultMessage - Domyślny komunikat z API (używany jeśli nie ma mapowania)
 * @param fieldErrors - Opcjonalne błędy pól dla ValidationError
 * @returns Sformatowany komunikat dla użytkownika
 */
export function mapErrorCodeToMessage(
  errorCode: ApiErrorResponse["error"]["code"],
  defaultMessage: string,
  fieldErrors?: Record<string, string>
): string {
  // Jeśli są field_errors, sformatuj je jako listę
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const fieldMessages = Object.entries(fieldErrors)
      .map(([field, message]) => {
        // Formatuj nazwę pola (np. "plan_id" -> "Plan ID")
        const formattedField = field
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return `${formattedField}: ${message}`;
      })
      .join(", ");

    return fieldMessages;
  }

  // Mapowanie kodów błędów na komunikaty użytkownika
  switch (errorCode) {
    case "ValidationError":
      return defaultMessage || "Nieprawidłowe dane wejściowe. Sprawdź wprowadzone wartości.";

    case "Unauthorized":
      return "Musisz być zalogowany, aby wykonać tę operację.";

    case "Forbidden":
      return "Brak uprawnień do wykonania tej operacji.";

    case "NotFound":
      return defaultMessage || "Nie znaleziono żądanego zasobu.";

    case "Conflict":
      return defaultMessage || "Wystąpił konflikt. Spróbuj ponownie.";

    case "RateLimited":
      return defaultMessage || "Zbyt wiele zapytań. Spróbuj ponownie za chwilę.";

    case "UpstreamTimeout":
      return "Serwis zewnętrzny nie odpowiada. Spróbuj ponownie za chwilę.";

    case "UnprocessableEntity":
      return defaultMessage || "Nie można przetworzyć żądania. Sprawdź wprowadzone dane.";

    case "InternalError":
      return "Wystąpił błąd serwera. Spróbuj ponownie później.";

    default:
      return defaultMessage || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
  }
}

/**
 * Tworzy szczegółowy komunikat błędu z field_errors
 *
 * @param errorCode - Kod błędu
 * @param defaultMessage - Domyślny komunikat
 * @param fieldErrors - Błędy pól
 * @returns Obiekt z tytułem i opisem dla toast
 */
export function createErrorMessage(
  errorCode: ApiErrorResponse["error"]["code"],
  defaultMessage: string,
  fieldErrors?: Record<string, string>
): { title: string; description?: string } {
  const hasFieldErrors = fieldErrors && Object.keys(fieldErrors).length > 0;

  if (hasFieldErrors) {
    // Dla ValidationError z field_errors - pokaż szczegóły w opisie
    const fieldMessages = Object.entries(fieldErrors)
      .map(([field, message]) => {
        const formattedField = field
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return `${formattedField}: ${message}`;
      })
      .join("\n");

    return {
      title: "Błędy walidacji",
      description: fieldMessages,
    };
  }

  // Dla innych błędów - użyj mapowania
  const message = mapErrorCodeToMessage(errorCode, defaultMessage, fieldErrors);

  return {
    title: message,
  };
}
