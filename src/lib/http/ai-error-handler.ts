import type { ApiErrorResponse } from "@/types";

/**
 * Obsługuje błędy z serwisu AI i zwraca odpowiednią odpowiedź HTTP
 *
 * @param error - Błąd do obsłużenia
 * @param defaultMessage - Domyślny komunikat błędu dla InternalError
 * @returns Response z odpowiednim kodem statusu i komunikatem błędu
 */
export function handleAIError(error: unknown, defaultMessage: string): Response {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  // Timeout
  if (error instanceof Error && errorMessage.includes("Przekroczono limit czasu")) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UpstreamTimeout",
          message: "AI nie odpowiada. Spróbuj ponownie lub dodaj roślinę ręcznie.",
        },
      } satisfies ApiErrorResponse),
      { status: 504, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit
  if (error instanceof Error && errorMessage.includes("Rate limit")) {
    return new Response(
      JSON.stringify({
        error: {
          code: "RateLimited",
          message: errorMessage,
        },
      } satisfies ApiErrorResponse),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  }

  // Inne błędy
  return new Response(
    JSON.stringify({
      error: {
        code: "InternalError",
        message: defaultMessage,
      },
    } satisfies ApiErrorResponse),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
