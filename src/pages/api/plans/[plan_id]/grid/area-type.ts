import type { APIContext } from "astro";
import type { ApiItemResponse, GridAreaTypeResultDto } from "@/types";
import { errorResponse, jsonResponse, PlantRemovalRequiresConfirmationError, ValidationError } from "@/lib/http/errors";
import { logApiError } from "@/lib/http/error-handler";
import { setAreaType } from "@/lib/services/grid-area.service";
import { gridAreaTypePathSchema, gridAreaTypePayloadSchema } from "@/lib/validation/grid-area";
import { z } from "zod";

export const prerender = false;

/**
 * POST /api/plans/:plan_id/grid/area-type
 * Hurtowa zmiana typu komórek w prostokątnym obszarze siatki planu działki
 *
 * Endpoint umożliwia ustawienie nowego typu powierzchni dla wybranego prostokąta.
 * Operacja wykorzystuje Supabase z włączonym RLS oraz triggery bazy, które usuwają
 * nasadzenia z komórek o typie innym niż 'soil'.
 */
export async function POST(ctx: APIContext) {
  // 1. Sprawdź klienta Supabase
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 3. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 422);
  }

  // 4. Waliduj parametr ścieżki plan_id
  const paramsParse = gridAreaTypePathSchema.safeParse(ctx.params);
  if (!paramsParse.success) {
    // Mapowanie błędów Zod na field_errors
    const fieldErrors: Record<string, string> = {};
    for (const issue of paramsParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }

    // Główny komunikat błędu
    const message = paramsParse.error.issues[0]?.message || "Invalid plan_id parameter.";

    logApiError(new ValidationError(message), {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 422);
  }

  const { plan_id } = paramsParse.data;

  // 5. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error("Invalid JSON body"), {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      user_id: user.id,
      params: { plan_id },
    });
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON body."), 400);
  }

  const bodyParse = gridAreaTypePayloadSchema.safeParse(requestBody);
  if (!bodyParse.success) {
    // Mapowanie błędów Zod na field_errors
    const fieldErrors: Record<string, string> = {};
    for (const issue of bodyParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }

    // Główny komunikat błędu
    const message = bodyParse.error.issues[0]?.message || "Invalid input data.";

    logApiError(new ValidationError(message), {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      user_id: user.id,
      params: { plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 422);
  }

  const { x1, y1, x2, y2, type, confirm_plant_removal } = bodyParse.data;

  // 6. Wykonaj operację zmiany typu obszaru
  try {
    const result = await setAreaType(supabase, user.id, {
      planId: plan_id,
      x1,
      y1,
      x2,
      y2,
      type,
      confirmPlantRemoval: confirm_plant_removal,
    });

    // 7. Sprawdź czy plan istniał (jeśli affected_cells === 0 i removed_plants === 0, może nie istnieć)
    // Ale to jest edge case - serwis zwraca 0,0 gdy plan nie istnieje
    // Musimy to sprawdzić osobno dla pewności
    if (result.affected_cells === 0 && result.removed_plants === 0) {
      // Sprawdź czy plan rzeczywiście istnieje
      const { data: planCheck } = await supabase
        .from("plans")
        .select("id")
        .eq("id", plan_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!planCheck) {
        logApiError(new Error("Plan not found"), {
          endpoint: "POST /api/plans/:plan_id/grid/area-type",
          method: "POST",
          user_id: user.id,
          params: { plan_id },
        });
        return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
      }
    }

    // 8. Zwróć sukces
    const body: ApiItemResponse<GridAreaTypeResultDto> = { data: result };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // 9. Obsługa błędów
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "POST /api/plans/:plan_id/grid/area-type",
      method: "POST",
      user_id: user.id,
      params: { plan_id },
    });

    // Błąd walidacji z serwisu (współrzędne poza granicami)
    if (e instanceof ValidationError) {
      const fieldErrors: Record<string, string> = {};
      if (e.field) {
        fieldErrors[e.field] = e.message;
      }
      return jsonResponse(errorResponse("UnprocessableEntity", e.message, { field_errors: fieldErrors }), 422);
    }

    // Błąd wymagający potwierdzenia usunięcia roślin
    if (e instanceof PlantRemovalRequiresConfirmationError) {
      return jsonResponse(
        errorResponse("Conflict", e.message, {
          field_errors: { plant_count: e.plantCount.toString() },
        }),
        409
      );
    }

    // Sprawdź typ błędu z Supabase
    const error = e as { code?: string; message?: string };
    const msg = String(error?.message ?? "");
    const code = error?.code;

    // Błąd uprawnień (RLS)
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || code === "PGRST301";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    // Nieoczekiwany błąd
    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}
