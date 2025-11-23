import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type {
  PlantSearchCommand,
  PlantSearchResultDto,
  PlantFitCommand,
  PlantFitResultDto,
  ApiItemResponse,
  ApiErrorResponse,
} from "@/types";

/**
 * Bezpiecznie parsuje odpowiedź jako JSON
 * Obsługuje przypadki, gdy odpowiedź nie jest w formacie JSON
 */
async function safeParseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  const text = await response.text();

  if (!isJson) {
    throw new Error(
      `Oczekiwano odpowiedzi JSON, otrzymano: ${contentType || "unknown"}. Treść: ${text.substring(0, 100)}`
    );
  }

  if (!text.trim()) {
    throw new Error("Odpowiedź jest pusta");
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Błąd parsowania JSON: ${error.message}. Treść odpowiedzi: ${text.substring(0, 200)}`);
    }
    throw error;
  }
}

/**
 * React Query mutation do wyszukiwania roślin przez AI
 *
 * Endpoint: POST /api/ai/plants/search
 *
 * Timeout: 10s
 * Rate limit: 10/min/user
 *
 * @returns Mutation result z kandydatami roślin
 */
export function useSearchPlants(): UseMutationResult<PlantSearchResultDto, Error, PlantSearchCommand> {
  return useMutation({
    mutationFn: async (command: PlantSearchCommand) => {
      // AbortController dla timeoutu
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch("/api/ai/plants/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(command),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Obsługa błędów HTTP
        if (response.status === 401) {
          window.location.assign("/auth/login");
          throw new Error("Unauthorized");
        }

        if (response.status === 429) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Zbyt wiele żądań. Spróbuj ponownie za chwilę.");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error("Zbyt wiele żądań. Spróbuj ponownie za chwilę.");
            }
            throw error;
          }
        }

        if (response.status === 504) {
          throw new Error("AI nie odpowiada. Spróbuj ponownie lub dodaj roślinę ręcznie.");
        }

        if (response.status === 400) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Nieprawidłowe zapytanie");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error("Nieprawidłowe zapytanie");
            }
            throw error;
          }
        }

        if (!response.ok) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Nie udało się wyszukać roślin");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error(`Nie udało się wyszukać roślin (HTTP ${response.status})`);
            }
            throw error;
          }
        }

        const result: ApiItemResponse<PlantSearchResultDto> =
          await safeParseJson<ApiItemResponse<PlantSearchResultDto>>(response);
        return result.data;
      } catch (error) {
        clearTimeout(timeoutId);

        if ((error as { name?: string }).name === "AbortError") {
          throw new Error("Przekroczono limit czasu oczekiwania. Spróbuj ponownie lub dodaj roślinę ręcznie.");
        }

        throw error;
      }
    },
    retry: 1, // Tylko 1 retry dla AI (timeout-sensitive)
  });
}

/**
 * React Query mutation do sprawdzenia dopasowania rośliny
 *
 * Endpoint: POST /api/ai/plants/fit
 *
 * Timeout: 10s
 * Rate limit: 10/min/user
 *
 * @returns Mutation result z oceną dopasowania (scores + explanation)
 */
export function useCheckPlantFit(): UseMutationResult<PlantFitResultDto, Error, PlantFitCommand> {
  return useMutation({
    mutationFn: async (command: PlantFitCommand) => {
      // AbortController dla timeoutu
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch("/api/ai/plants/fit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(command),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Obsługa błędów HTTP
        if (response.status === 401) {
          window.location.assign("/auth/login");
          throw new Error("Unauthorized");
        }

        if (response.status === 404) {
          throw new Error("Plan nie został znaleziony");
        }

        if (response.status === 422) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Nieprawidłowe współrzędne");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error("Nieprawidłowe współrzędne");
            }
            throw error;
          }
        }

        if (response.status === 429) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Zbyt wiele żądań. Spróbuj ponownie za chwilę.");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error("Zbyt wiele żądań. Spróbuj ponownie za chwilę.");
            }
            throw error;
          }
        }

        if (response.status === 504) {
          throw new Error("AI nie odpowiada. Możesz dodać roślinę bez oceny dopasowania.");
        }

        if (response.status === 400) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Nieprawidłowe dane zapytania");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error("Nieprawidłowe dane zapytania");
            }
            throw error;
          }
        }

        if (!response.ok) {
          try {
            const errorData: ApiErrorResponse = await safeParseJson<ApiErrorResponse>(response);
            throw new Error(errorData.error.message || "Nie udało się sprawdzić dopasowania rośliny");
          } catch (error) {
            if (error instanceof Error && error.message.includes("Błąd parsowania JSON")) {
              throw new Error(`Nie udało się sprawdzić dopasowania rośliny (HTTP ${response.status})`);
            }
            throw error;
          }
        }

        const result: ApiItemResponse<PlantFitResultDto> =
          await safeParseJson<ApiItemResponse<PlantFitResultDto>>(response);
        return result.data;
      } catch (error) {
        clearTimeout(timeoutId);

        if ((error as { name?: string }).name === "AbortError") {
          throw new Error("Przekroczono limit czasu oczekiwania. Możesz dodać roślinę bez oceny dopasowania.");
        }

        throw error;
      }
    },
    retry: 1, // Tylko 1 retry dla AI (timeout-sensitive)
  });
}
