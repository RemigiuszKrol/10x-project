import type { APIContext } from "astro";
import type { ApiListResponse, GridCellDto } from "@/types";
import { listGridCells } from "@/lib/services/grid-cells.service";
import { gridCellsPathSchema, gridCellsQuerySchema } from "@/lib/validation/grid";
import { jsonResponse, errorResponse, ValidationError } from "@/lib/http/errors";
import { PlanNotFoundError } from "@/lib/http/weather.errors";

/**
 * Wyłączenie pre-renderingu dla tego endpointu (SSR only)
 */
export const prerender = false;

/**
 * GET /api/plans/:plan_id/grid/cells
 *
 * Endpoint do pobierania listy komórek siatki planu działki z paginacją kursorową.
 *
 * Funkcjonalność:
 * - Listowanie komórek siatki dla danego planu
 * - Filtry: type (enum), x/y (pojedyncza pozycja), bbox (prostokątny obszar)
 * - Paginacja kursorowa bazująca na (updated_at, x, y)
 * - Sortowanie: updated_at (default), x - obie w trybie asc/desc
 * - Limit 1-100 (default 50)
 *
 * Query params:
 * - type?: "soil" | "water" | "path" | "building" | "blocked"
 * - x?: number, y?: number (oba lub żadne)
 * - bbox?: "x1,y1,x2,y2"
 * - limit?: 1-100 (default 50)
 * - cursor?: string (Base64)
 * - sort?: "updated_at" | "x" (default "updated_at")
 * - order?: "asc" | "desc" (default "desc")
 *
 * Wymagania:
 * - Użytkownik musi być zalogowany (401 jeśli brak sesji)
 * - Plan musi należeć do użytkownika (404 jeśli nie istnieje lub brak dostępu)
 * - Parametr plan_id musi być poprawnym UUID (400 jeśli niepoprawny)
 * - Współrzędne muszą mieścić się w granicach siatki (400 jeśli poza zakresem)
 * - Nie można mieszać x/y z bbox (400 jeśli oba podane)
 *
 * Odpowiedzi:
 * - 200: Sukces - zwraca ApiListResponse<GridCellDto>
 * - 400: ValidationError - niepoprawne parametry zapytania
 * - 401: Unauthorized - brak sesji użytkownika
 * - 403: Forbidden - naruszenie RLS (brak uprawnień)
 * - 404: NotFound - plan nie istnieje lub nie należy do użytkownika
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
      errorResponse("ValidationError", "Invalid user ID format.", {
        field_errors: { user_id: "User ID must be a valid UUID" },
      }),
      400
    );
  }

  // Validate Path: Walidacja parametru plan_id
  const pathValidation = gridCellsPathSchema.safeParse(ctx.params);

  if (!pathValidation.success) {
    const fieldErrors: Record<string, string> = {};
    pathValidation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      fieldErrors[field] = err.message;
    });

    return jsonResponse(
      errorResponse("ValidationError", "Invalid path parameters.", { field_errors: fieldErrors }),
      400
    );
  }

  const { plan_id } = pathValidation.data;

  // Validate Query: Walidacja query params
  const queryValidation = gridCellsQuerySchema.safeParse(Object.fromEntries(ctx.url.searchParams.entries()));

  if (!queryValidation.success) {
    const fieldErrors: Record<string, string> = {};
    queryValidation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      fieldErrors[field] = err.message;
    });

    return jsonResponse(
      errorResponse("ValidationError", "Invalid query parameters.", { field_errors: fieldErrors }),
      400
    );
  }

  const query = queryValidation.data;

  // Execute: Wywołanie serwisu
  try {
    // Jeśli limit nie jest podany, ustaw bardzo duży limit aby pobrać wszystkie komórki
    const limit = query.limit ?? 40000;

    const result = await listGridCells(supabase, user.id, {
      planId: plan_id,
      type: query.type,
      x: query.x,
      y: query.y,
      bbox: query.bbox,
      cursor: query.cursor,
      limit,
      sort: query.sort,
      order: query.order,
    });

    // Success: Zwróć listę komórek
    const response: ApiListResponse<GridCellDto> = result;

    return jsonResponse(response, 200);
  } catch (error) {
    // Obsługa PlanNotFoundError z serwisu (404)
    if (error instanceof PlanNotFoundError) {
      return jsonResponse(errorResponse("NotFound", error.message), 404);
    }

    // Obsługa ValidationError z serwisu
    if (error instanceof ValidationError) {
      const fieldErrors: Record<string, string> = {};
      if (error.field) {
        fieldErrors[error.field] = error.message;
      }

      return jsonResponse(errorResponse("ValidationError", error.message, { field_errors: fieldErrors }), 400);
    }

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

    return jsonResponse(errorResponse("InternalError", "An unexpected error occurred while fetching grid cells."), 500);
  }
}
