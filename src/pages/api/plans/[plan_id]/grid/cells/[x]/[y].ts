import type { APIContext } from "astro";
import type { ApiItemResponse, GridCellDto } from "@/types";
import { getPlanGridMetadata, updateGridCellType } from "@/lib/services/grid-cells.service";
import { gridCellUpdatePathSchema, gridCellUpdateSchema } from "@/lib/validation/grid";
import { jsonResponse, errorResponse, ValidationError } from "@/lib/http/errors";

/**
 * Wyłączenie pre-renderingu dla tego endpointu (SSR only)
 */
export const prerender = false;

/**
 * PUT /api/plans/:plan_id/grid/cells/:x/:y
 *
 * Endpoint do aktualizacji typu pojedynczej komórki siatki planu działki.
 *
 * Funkcjonalność:
 * - Ustawia typ komórki (soil, path, water, building, blocked)
 * - Używa UPSERT dla idempotencji (jeśli komórka nie istnieje, zostanie utworzona)
 * - Zmiana typu na nie-soil może automatycznie usunąć powiązane nasadzenia (trigger w bazie)
 * - Operacja jest atomowa
 *
 * Path params:
 * - plan_id: UUID planu
 * - x: współrzędna X (0-indexed, nieujemna liczba całkowita)
 * - y: współrzędna Y (0-indexed, nieujemna liczba całkowita)
 *
 * Body (JSON):
 * - type: "soil" | "path" | "water" | "building" | "blocked"
 *
 * Wymagania:
 * - Użytkownik musi być zalogowany (401 jeśli brak sesji)
 * - Plan musi należeć do użytkownika (404 jeśli nie istnieje lub brak dostępu)
 * - Parametr plan_id musi być poprawnym UUID (400 jeśli niepoprawny)
 * - Współrzędne x,y muszą mieścić się w granicach siatki (400 jeśli poza zakresem)
 * - Body musi zawierać prawidłowy typ komórki (400 jeśli nieprawidłowy)
 *
 * Odpowiedzi:
 * - 200: Sukces - zwraca ApiItemResponse<GridCellDto>
 * - 400: ValidationError - niepoprawne parametry lub współrzędne poza zakresem
 * - 401: Unauthorized - brak sesji użytkownika
 * - 403: Forbidden - naruszenie RLS (brak uprawnień)
 * - 404: NotFound - plan nie istnieje lub nie należy do użytkownika
 * - 422: UnprocessableEntity - naruszenie constraintów/triggerów w bazie
 * - 500: InternalError - nieoczekiwany błąd serwera
 */
export async function PUT(ctx: APIContext): Promise<Response> {
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

  // Validate Path: Walidacja parametrów ścieżki (plan_id, x, y)
  const pathValidation = gridCellUpdatePathSchema.safeParse(ctx.params);

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

  const { plan_id, x, y } = pathValidation.data;

  // Validate Body: Walidacja ciała żądania
  let bodyData: unknown;
  try {
    bodyData = await ctx.request.json();
  } catch {
    return jsonResponse(
      errorResponse("ValidationError", "Invalid JSON body.", {
        field_errors: { body: "Request body must be valid JSON" },
      }),
      400
    );
  }

  const bodyValidation = gridCellUpdateSchema.safeParse(bodyData);

  if (!bodyValidation.success) {
    const fieldErrors: Record<string, string> = {};
    bodyValidation.error.errors.forEach((err) => {
      const field = err.path.join(".");
      fieldErrors[field] = err.message;
    });

    return jsonResponse(errorResponse("ValidationError", "Invalid request body.", { field_errors: fieldErrors }), 400);
  }

  const command = bodyValidation.data;

  // Execute: Pobierz metadane planu dla walidacji zakresów
  try {
    const planMetadata = await getPlanGridMetadata(supabase, user.id, plan_id);

    // Not Found: Plan nie istnieje lub nie należy do użytkownika
    if (!planMetadata) {
      return jsonResponse(errorResponse("NotFound", "Plan not found or you do not have access to it."), 404);
    }

    // Validate Bounds: Sprawdź czy współrzędne mieszczą się w granicach siatki
    if (x < 0 || x >= planMetadata.grid_width || y < 0 || y >= planMetadata.grid_height) {
      const fieldErrors: Record<string, string> = {};
      if (x < 0 || x >= planMetadata.grid_width) {
        fieldErrors["x"] =
          `x must be between 0 and ${planMetadata.grid_width - 1} (grid width: ${planMetadata.grid_width})`;
      }
      if (y < 0 || y >= planMetadata.grid_height) {
        fieldErrors["y"] =
          `y must be between 0 and ${planMetadata.grid_height - 1} (grid height: ${planMetadata.grid_height})`;
      }

      return jsonResponse(
        errorResponse("ValidationError", "Coordinates out of grid bounds.", { field_errors: fieldErrors }),
        400
      );
    }

    // Update: Wykonaj aktualizację komórki
    const gridCell = await updateGridCellType(supabase, plan_id, x, y, command);

    // Success: Zwróć zaktualizowaną komórkę
    const response: ApiItemResponse<GridCellDto> = {
      data: gridCell,
    };

    return jsonResponse(response, 200);
  } catch (error) {
    // Obsługa ValidationError z serwisu (422 Unprocessable - naruszenia constraintów)
    if (error instanceof ValidationError) {
      const fieldErrors: Record<string, string> = {};
      if (error.field) {
        fieldErrors[error.field] = error.message;
      }

      // ValidationError z serwisu oznacza naruszenie constraintu (422), nie błąd walidacji wejścia (400)
      return jsonResponse(errorResponse("UnprocessableEntity", error.message, { field_errors: fieldErrors }), 422);
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
        return jsonResponse(errorResponse("Forbidden", "You do not have permission to modify this plan."), 403);
      }
    }

    return jsonResponse(errorResponse("InternalError", "An unexpected error occurred while updating grid cell."), 500);
  }
}
