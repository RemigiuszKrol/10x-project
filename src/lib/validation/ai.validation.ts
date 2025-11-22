/**
 * Moduł AI - Validation Layer
 *
 * Zod schemas dla walidacji request/response AI:
 * - PlantSearchResult
 * - PlantFitResult
 * - Sanity-check odpowiedzi
 */

import { z } from "zod";

/**
 * Schema dla pojedynczego kandydata z wyszukiwania
 */
export const PlantSearchCandidateSchema = z.object({
  name: z.string().min(1, "Nazwa rośliny nie może być pusta"),
  latin_name: z.string().optional(),
  source: z.literal("ai"),
});

/**
 * Schema dla wyniku wyszukiwania roślin
 */
export const PlantSearchResultSchema = z.object({
  data: z.object({
    candidates: z.array(PlantSearchCandidateSchema),
  }),
});

/**
 * Schema dla wyniku oceny dopasowania
 * Scores muszą być w zakresie 1-5 (integer)
 */
export const PlantFitResultSchema = z.object({
  data: z.object({
    sunlight_score: z.number().int().min(1).max(5),
    humidity_score: z.number().int().min(1).max(5),
    precip_score: z.number().int().min(1).max(5),
    overall_score: z.number().int().min(1).max(5),
    explanation: z.string().optional(),
  }),
});

/**
 * Walidacja wyniku wyszukiwania roślin
 *
 * @param data - Surowa odpowiedź z API
 * @returns Zod SafeParseReturnType
 *
 * @example
 * ```ts
 * const result = validateSearchResult(apiResponse);
 * if (result.success) {
 *   console.log(result.data.candidates);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateSearchResult(data: unknown) {
  return PlantSearchResultSchema.safeParse(data);
}

/**
 * Walidacja wyniku oceny dopasowania
 *
 * @param data - Surowa odpowiedź z API
 * @returns Zod SafeParseReturnType
 *
 * @example
 * ```ts
 * const result = validateFitResult(apiResponse);
 * if (result.success) {
 *   console.log(result.data.overall_score);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateFitResult(data: unknown) {
  return PlantFitResultSchema.safeParse(data);
}

/**
 * Typ dla zwalidowanego search result
 */
export type ValidatedSearchResult = z.infer<typeof PlantSearchResultSchema>;

/**
 * Typ dla zwalidowanego fit result
 */
export type ValidatedFitResult = z.infer<typeof PlantFitResultSchema>;
