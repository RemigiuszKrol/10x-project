import type { APIRoute } from "astro";
import { z } from "zod";
import { getOpenRouterService } from "@/lib/services/openrouter.instance";
import type { ApiItemResponse, ApiErrorResponse, PlantSearchResultDto } from "@/types";
import { logger } from "@/lib/utils/logger";
import { handleAIError } from "@/lib/http/ai-error-handler";

/**
 * Walidacja request body
 */
const SearchRequestSchema = z.object({
  query: z.string().min(2).max(200),
});

/**
 * POST /api/ai/plants/search
 *
 * Wyszukuje rośliny po nazwie używając OpenRouter AI
 *
 * Request body:
 * {
 *   "query": "pomidor"
 * }
 *
 * Response 200:
 * {
 *   "data": {
 *     "candidates": [
 *       { "name": "Pomidor", "latin_name": "Solanum lycopersicum", "source": "ai" }
 *     ]
 *   }
 * }
 *
 * Response 401: Unauthorized (brak użytkownika)
 * Response 400: ValidationError (nieprawidłowe zapytanie)
 * Response 429: RateLimited (zbyt wiele zapytań)
 * Response 504: UpstreamTimeout (AI nie odpowiada)
 * Response 500: InternalError (nieznany błąd)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check (użytkownik musi być zalogowany)
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "Unauthorized",
            message: "Musisz być zalogowany",
          },
        } satisfies ApiErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse i walidacja body
    const body = await request.json();
    const validation = SearchRequestSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({
          error: {
            code: "ValidationError",
            message: "Nieprawidłowe zapytanie",
            details: {
              field_errors: Object.fromEntries(
                Object.entries(fieldErrors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
              ),
            },
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Wywołanie OpenRouter
    const openRouter = getOpenRouterService();
    const result = await openRouter.searchPlants(validation.data.query);

    // 4. Zwrócenie wyniku
    return new Response(
      JSON.stringify({
        data: result,
      } satisfies ApiItemResponse<PlantSearchResultDto>),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`[API] /api/ai/plants/search error: ${errorMessage}`, {
      endpoint: "/api/ai/plants/search",
      method: "POST",
      user_id: locals.user?.id,
      stack: errorStack,
    });

    return handleAIError(error, "Nie udało się wyszukać roślin");
  }
};
