/**
 * Toast Error Handler - Centralny system obsługi błędów API dla toastów
 *
 * Automatycznie wyświetla toasty dla błędów z API endpointów.
 * Integruje się z React Query mutations przez callback onError.
 */

import { toast } from "sonner";
import type { ApiErrorResponse } from "@/types";
import { createErrorMessage } from "./api-error-mapper";
import { logger } from "./logger";

/**
 * Opcje dla toast error handlera
 */
export interface ToastErrorOptions {
  /**
   * Wyłącza automatyczne wyświetlanie toastu
   * Przydatne gdy chcemy obsłużyć błąd w inny sposób
   */
  skipToast?: boolean;

  /**
   * Nadpisuje domyślny komunikat błędu
   */
  customMessage?: string;

  /**
   * Callback wywoływany przed wyświetleniem toastu
   * Może być użyty do custom obsługi (np. redirect, custom toast)
   */
  onError?: (error: ApiErrorResponse) => void;
}

/**
 * Parsuje błąd i wyodrębnia ApiErrorResponse
 *
 * @param error - Błąd z React Query (może być Error, ApiErrorResponse, string, itp.)
 * @returns ApiErrorResponse lub null jeśli nie można sparsować
 */
function parseApiError(error: unknown): ApiErrorResponse | null {
  // Jeśli to już ApiErrorResponse
  if (error && typeof error === "object" && "error" in error) {
    return error as ApiErrorResponse;
  }

  // Jeśli to Error z message zawierającym JSON
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        return parsed as ApiErrorResponse;
      }
    } catch (parseError) {
      // Nie jest JSON, kontynuuj
      if (parseError instanceof Error) {
        // Cichy błąd - to normalne, że nie każdy error.message jest JSON
      }
    }
  }

  // Jeśli to string zawierający JSON
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        return parsed as ApiErrorResponse;
      }
    } catch (parseError) {
      // Nie jest JSON, kontynuuj
      if (parseError instanceof Error) {
        // Cichy błąd - to normalne, że nie każdy string jest JSON
      }
    }
  }

  return null;
}

/**
 * Obsługuje błąd API i wyświetla toast
 *
 * @param error - Błąd z React Query mutation
 * @param options - Opcje obsługi błędu
 */
export function handleApiError(error: unknown, options: ToastErrorOptions = {}): void {
  const { skipToast = false, customMessage, onError } = options;

  // Spróbuj sparsować błąd jako ApiErrorResponse
  const apiError = parseApiError(error);

  // Jeśli nie można sparsować, obsłuż jako błąd sieciowy lub unknown
  if (!apiError) {
    if (skipToast) return;

    // Sprawdź czy to błąd sieciowy
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("network")) {
        toast.error("Brak połączenia z serwerem", {
          description: "Sprawdź połączenie internetowe i spróbuj ponownie.",
        });
        return;
      }
    }

    // Unknown error
    toast.error(customMessage || "Wystąpił nieoczekiwany błąd", {
      description: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  // Wywołaj callback jeśli jest zdefiniowany
  if (onError) {
    onError(apiError);
    // Jeśli skipToast jest ustawione, nie wyświetlaj automatycznego toastu
    if (skipToast) return;
  }

  // Obsługa specjalnych przypadków
  const errorCode = apiError.error.code;

  // Unauthorized - redirect do login (nie pokazuj toastu, redirect już się dzieje)
  if (errorCode === "Unauthorized") {
    // Redirect jest już obsłużony w mutation (np. useRefreshWeather)
    // Możemy pokazać toast przed redirectem
    if (!skipToast) {
      toast.error("Sesja wygasła", {
        description: "Zostaniesz przekierowany do strony logowania.",
      });
    }
    return;
  }

  // Dla innych błędów - wyświetl toast
  if (!skipToast) {
    const errorMessage = createErrorMessage(
      errorCode,
      customMessage || apiError.error.message,
      apiError.error.details?.field_errors
    );

    toast.error(errorMessage.title, {
      ...(errorMessage.description && { description: errorMessage.description }),
    });
  }
}

/**
 * Helper do tworzenia błędu z ApiErrorResponse dla React Query
 *
 * Tworzy Error z message zawierającym JSON ApiErrorResponse,
 * co pozwala na późniejsze parsowanie przez handleApiError.
 *
 * @param apiError - ApiErrorResponse z serwera
 * @returns Error z message zawierającym JSON
 */
export function createApiError(apiError: ApiErrorResponse): Error {
  return new Error(JSON.stringify(apiError));
}

/**
 * Helper do parsowania odpowiedzi HTTP i tworzenia błędu
 *
 * @param response - Response z fetch
 * @returns Promise z Error (jeśli błąd) lub null (jeśli sukces)
 */
export async function parseHttpError(response: Response): Promise<Error | null> {
  if (response.ok) {
    return null;
  }

  try {
    const errorData: ApiErrorResponse = await response.json();
    return createApiError(errorData);
  } catch (error) {
    // Jeśli nie można sparsować JSON, zwróć ogólny błąd
    if (error instanceof Error) {
      logger.error("Błąd podczas parsowania odpowiedzi błędu HTTP", { error: error.message });
    } else {
      logger.error("Nieoczekiwany błąd podczas parsowania odpowiedzi błędu HTTP", { error: String(error) });
    }
    return new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}
