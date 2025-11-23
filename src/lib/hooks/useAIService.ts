/**
 * Custom Hook: useAIService
 *
 * Wrapper dla komunikacji z AI z obsługą timeout i walidacji
 * Integruje się z istniejącymi mutations (useSearchPlants, useCheckPlantFit)
 * i dodaje warstwę walidacji odpowiedzi
 */

import { useSearchPlants, useCheckPlantFit } from "@/lib/hooks/mutations/useAIMutations";
import { validateSearchResult, validateFitResult } from "@/lib/validation/ai.validation";
import { createAIError, toAIError } from "@/lib/utils/ai-errors";
import type { PlantSearchResultDto, PlantFitCommand, PlantFitResultDto, AIError } from "@/types";

/**
 * Konfiguracja opcjonalna dla useAIService
 */
export interface UseAIServiceConfig {
  onSearchError?: (error: AIError) => void;
  onFitError?: (error: AIError) => void;
}

/**
 * Hook interfejs
 */
export interface UseAIServiceReturn {
  /** Wyszukiwanie roślin z walidacją odpowiedzi */
  searchPlants: (query: string) => Promise<PlantSearchResultDto>;
  /** Sprawdzenie dopasowania rośliny z walidacją odpowiedzi */
  checkPlantFit: (command: PlantFitCommand) => Promise<PlantFitResultDto>;
  /** Czy trwa wyszukiwanie */
  isSearching: boolean;
  /** Czy trwa sprawdzanie dopasowania */
  isFitting: boolean;
}

/**
 * Hook do komunikacji z AI z walidacją i obsługą błędów
 *
 * Dodaje warstwę walidacji nad istniejącymi mutations:
 * - Walidacja struktury JSON z Zod
 * - Konwersja błędów do AIError
 * - Obsługa rate limit z header Retry-After
 *
 * @param config - Opcjonalna konfiguracja z callbackami błędów
 * @returns Interfejs do komunikacji z AI
 *
 * @example
 * ```tsx
 * const { searchPlants, isSearching } = useAIService({
 *   onSearchError: (error) => toast.error(error.message)
 * });
 *
 * try {
 *   const results = await searchPlants('tomato');
 *   console.log(results.candidates);
 * } catch (error) {
 *   // error jest typu AIError
 * }
 * ```
 */
export function useAIService(config?: UseAIServiceConfig): UseAIServiceReturn {
  const searchMutation = useSearchPlants();
  const fitMutation = useCheckPlantFit();

  /**
   * Wyszukiwanie roślin z walidacją
   */
  const searchPlants = async (query: string): Promise<PlantSearchResultDto> => {
    if (!query || query.trim().length === 0) {
      throw createAIError("unknown", "search", undefined, "Query nie może być pusty");
    }

    try {
      // Wywołanie istniejącej mutation (już ma timeout + retry)
      const rawResponse = await searchMutation.mutateAsync({ query: query.trim() });

      // Walidacja struktury odpowiedzi
      const validation = validateSearchResult({ data: rawResponse });

      if (!validation.success) {
        const aiError = createAIError(
          "bad_json",
          "search",
          undefined,
          validation.error.errors.map((e) => e.message).join(", ")
        );
        config?.onSearchError?.(aiError);
        throw aiError;
      }

      return validation.data.data;
    } catch (error) {
      // Konwersja błędu do AIError
      let aiError: AIError;

      if (error instanceof Error) {
        // Parsowanie specyficznych komunikatów z mutation
        if (error.message.includes("Przekroczono limit czasu")) {
          aiError = createAIError("timeout", "search");
        } else if (error.message.includes("Zbyt wiele żądań")) {
          aiError = createAIError("rate_limit", "search", 60);
        } else if (error.message.includes("nie odpowiada")) {
          aiError = createAIError("timeout", "search");
        } else {
          aiError = toAIError(error, "search");
        }
      } else {
        aiError = toAIError(error, "search");
      }

      config?.onSearchError?.(aiError);
      throw aiError;
    }
  };

  /**
   * Sprawdzenie dopasowania rośliny z walidacją
   */
  const checkPlantFit = async (command: PlantFitCommand): Promise<PlantFitResultDto> => {
    // Walidacja parametrów
    if (!command.plan_id || !command.plant_name) {
      throw createAIError("unknown", "fit", undefined, "Brak wymaganych parametrów: plan_id, plant_name");
    }

    try {
      // Wywołanie istniejącej mutation (już ma timeout + retry)
      const rawResponse = await fitMutation.mutateAsync(command);

      // Walidacja struktury odpowiedzi
      const validation = validateFitResult({ data: rawResponse });

      if (!validation.success) {
        const aiError = createAIError(
          "bad_json",
          "fit",
          undefined,
          validation.error.errors.map((e) => e.message).join(", ")
        );
        config?.onFitError?.(aiError);
        throw aiError;
      }

      return validation.data.data;
    } catch (error) {
      // Konwersja błędu do AIError
      let aiError: AIError;

      if (error instanceof Error) {
        // Parsowanie specyficznych komunikatów z mutation
        if (error.message.includes("Przekroczono limit czasu")) {
          aiError = createAIError("timeout", "fit");
        } else if (error.message.includes("Zbyt wiele żądań")) {
          aiError = createAIError("rate_limit", "fit", 60);
        } else if (error.message.includes("nie odpowiada")) {
          aiError = createAIError("timeout", "fit");
        } else if (error.message.includes("nie został znaleziony")) {
          aiError = createAIError("unknown", "fit", undefined, "Plan nie istnieje");
        } else {
          aiError = toAIError(error, "fit");
        }
      } else {
        aiError = toAIError(error, "fit");
      }

      config?.onFitError?.(aiError);
      throw aiError;
    }
  };

  return {
    searchPlants,
    checkPlantFit,
    isSearching: searchMutation.isPending,
    isFitting: fitMutation.isPending,
  };
}
