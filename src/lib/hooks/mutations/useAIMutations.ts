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
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Zbyt wiele żądań. Spróbuj ponownie za chwilę.");
        }

        if (response.status === 504) {
          throw new Error("AI nie odpowiada. Spróbuj ponownie lub dodaj roślinę ręcznie.");
        }

        if (response.status === 400) {
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Nieprawidłowe zapytanie");
        }

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Nie udało się wyszukać roślin");
        }

        const result: ApiItemResponse<PlantSearchResultDto> = await response.json();
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
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Nieprawidłowe współrzędne");
        }

        if (response.status === 429) {
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Zbyt wiele żądań. Spróbuj ponownie za chwilę.");
        }

        if (response.status === 504) {
          throw new Error("AI nie odpowiada. Możesz dodać roślinę bez oceny dopasowania.");
        }

        if (response.status === 400) {
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Nieprawidłowe dane zapytania");
        }

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message || "Nie udało się sprawdzić dopasowania rośliny");
        }

        const result: ApiItemResponse<PlantFitResultDto> = await response.json();
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
