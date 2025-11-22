/**
 * Custom Hook: useAIValidation
 *
 * Hook z funkcjami walidacji odpowiedzi AI
 * Wrapper dla Zod schemas z dodatkowymi utilsami
 */

import { validateSearchResult, validateFitResult } from "@/lib/validation/ai.validation";
import { createAIError } from "@/lib/utils/ai-errors";
import type { AIValidationResult, PlantSearchResultDto, PlantFitResultDto } from "@/types";

/**
 * Hook interfejs
 */
export interface UseAIValidationReturn {
  /** Walidacja wyniku wyszukiwania */
  validateSearchResult: (data: unknown) => AIValidationResult<PlantSearchResultDto>;
  /** Walidacja wyniku dopasowania */
  validateFitResult: (data: unknown) => AIValidationResult<PlantFitResultDto>;
}

/**
 * Hook do walidacji odpowiedzi AI
 *
 * Wykorzystuje Zod schemas i konwertuje wyniki do AIValidationResult
 *
 * @returns Funkcje walidacji
 *
 * @example
 * ```tsx
 * const { validateSearchResult } = useAIValidation();
 *
 * const result = validateSearchResult(apiResponse);
 * if (result.success) {
 *   console.log(result.data.candidates);
 * } else {
 *   console.error(result.error); // AIError
 * }
 * ```
 */
export function useAIValidation(): UseAIValidationReturn {
  /**
   * Walidacja search result z konwersją do AIValidationResult
   */
  const validateSearch = (data: unknown): AIValidationResult<PlantSearchResultDto> => {
    const zodResult = validateSearchResult(data);

    if (zodResult.success) {
      return {
        success: true,
        data: zodResult.data.data,
      };
    }

    // Konwersja Zod error do AIError
    const errorDetails = zodResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");

    return {
      success: false,
      error: createAIError("bad_json", "search", undefined, errorDetails),
    };
  };

  /**
   * Walidacja fit result z konwersją do AIValidationResult
   */
  const validateFit = (data: unknown): AIValidationResult<PlantFitResultDto> => {
    const zodResult = validateFitResult(data);

    if (zodResult.success) {
      return {
        success: true,
        data: zodResult.data.data,
      };
    }

    // Konwersja Zod error do AIError
    const errorDetails = zodResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");

    return {
      success: false,
      error: createAIError("bad_json", "fit", undefined, errorDetails),
    };
  };

  return {
    validateSearchResult: validateSearch,
    validateFitResult: validateFit,
  };
}
