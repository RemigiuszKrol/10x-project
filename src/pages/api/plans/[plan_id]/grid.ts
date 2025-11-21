import type { APIContext } from "astro";
import type { ApiItemResponse, GridMetadataDto } from "@/types";
import { getPlanGridMetadata } from "@/lib/services/plans.service";
import { PlanGridParamsSchema } from "@/lib/validation/plans";
import { jsonResponse, errorResponse } from "@/lib/http/errors";

/**
 * Wyłączenie pre-renderingu dla tego endpointu (SSR only)
 */
export const prerender = false;

/**
 * GET /api/plans/:plan_id/grid
 *
 * Endpoint do pobierania metadanych siatki planu działki.
 * Zwraca grid_width, grid_height, cell_size_cm, orientation dla określonego planu.
 *
 * Wymagania:
 * - Użytkownik musi być zalogowany (401 jeśli brak sesji)
 * - Plan musi należeć do użytkownika (404 jeśli nie istnieje lub brak dostępu)
 * - Parametr plan_id musi być poprawnym UUID (422 jeśli niepoprawny)
 *
 * Odpowiedzi:
 * - 200: Sukces - zwraca ApiItemResponse<GridMetadataDto>
 * - 401: Unauthorized - brak sesji użytkownika
 * - 403: Forbidden - naruszenie RLS (brak uprawnień)
 * - 404: NotFound - plan nie istnieje lub nie należy do użytkownika
 * - 422: UnprocessableEntity - niepoprawny format plan_id
 * - 500: InternalError - nieoczekiwany błąd serwera
 */
export async function GET(ctx: APIContext): Promise<Response> {
  // Guard Clause: Sprawdź czy klient Supabase jest dostępny
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    return jsonResponse(errorResponse("Unauthorized", "Supabase client not available."), 401);
  }

  // Auth Check: Pobierz zalogowanego użytkownika
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse(errorResponse("Unauthorized", "You must be logged in to access this resource."), 401);
  }

  // Sanity Check: Waliduj user.id jako UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    return jsonResponse(
      errorResponse("UnprocessableEntity", "Invalid user ID format.", {
        field_errors: { user_id: "User ID must be a valid UUID" },
      }),
      422
    );
  }

  // Validate Path: Walidacja parametru plan_id
  const pathValidation = PlanGridParamsSchema.safeParse(ctx.params);

  if (!pathValidation.success) {
    const fieldErrors: Record<string, string> = {};
    pathValidation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      fieldErrors[field] = err.message;
    });

    return jsonResponse(
      errorResponse("UnprocessableEntity", "Invalid path parameters.", { field_errors: fieldErrors }),
      422
    );
  }

  const { plan_id } = pathValidation.data;

  // Execute: Wywołanie serwisu
  try {
    const gridMetadata = await getPlanGridMetadata(supabase, user.id, plan_id);

    // Not Found: Jeśli plan nie istnieje lub nie należy do użytkownika
    if (!gridMetadata) {
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }

    // Success: Zwróć metadane siatki
    const response: ApiItemResponse<GridMetadataDto> = {
      data: gridMetadata,
    };

    return jsonResponse(response, 200);
  } catch (error) {
    // Obsługa błędów RLS (Forbidden)
    if (error && typeof error === "object") {
      const err = error as { message?: string; code?: string };

      // Heurystyka: sprawdź czy to błąd RLS
      const isRlsError =
        err.message?.toLowerCase().includes("permission") ||
        err.message?.toLowerCase().includes("rls") ||
        err.code === "PGRST301" ||
        err.code === "42501";

      if (isRlsError) {
        return jsonResponse(errorResponse("Forbidden", "You do not have permission to access this plan."), 403);
      }
    }

    return jsonResponse(
      errorResponse("InternalError", "An unexpected error occurred while fetching grid metadata."),
      500
    );
  }
}
