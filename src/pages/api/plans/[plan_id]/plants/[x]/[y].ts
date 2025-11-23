import type { APIRoute } from "astro";
import { errorResponse, jsonResponse } from "@/lib/http/errors";
import { PlantPlacementPathSchema, PlantPlacementUpsertSchema } from "@/lib/validation/plant-placements";
import { upsertPlantPlacement, deletePlantPlacement } from "@/lib/services/plant-placements.service";
import type { ApiItemResponse, PlantPlacementUpsertCommand } from "@/types";
import { ZodError } from "zod";
import { logger } from "@/lib/utils/logger";

export const prerender = false;

/**
 * PUT /api/plans/:plan_id/plants/:x/:y
 * Dodaje lub aktualizuje pojedynczą roślinę w komórce siatki planu ogrodowego
 */
export const PUT: APIRoute = async ({ locals, params, request }) => {
  try {
    // 1. Pobierz klienta Supabase z locals
    const supabase = locals.supabase;
    if (!supabase) {
      return jsonResponse(errorResponse("Unauthorized", "Authentication required"), 401);
    }

    // 2. Autoryzuj użytkownika
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(errorResponse("Unauthorized", "Invalid or missing authentication token"), 401);
    }

    // 3. Waliduj parametry ścieżki
    const pathValidation = PlantPlacementPathSchema.safeParse(params);
    if (!pathValidation.success) {
      const fieldErrors: Record<string, string> = {};
      pathValidation.error.errors.forEach((err) => {
        const field = err.path.join(".");
        fieldErrors[field] = err.message;
      });
      return jsonResponse(
        errorResponse("ValidationError", "Invalid path parameters", { field_errors: fieldErrors }),
        400
      );
    }

    const { plan_id: planId, x, y } = pathValidation.data;

    // 4. Waliduj body żądania
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(errorResponse("ValidationError", "Invalid JSON in request body"), 400);
    }

    const bodyValidation = PlantPlacementUpsertSchema.safeParse(body);
    if (!bodyValidation.success) {
      const fieldErrors: Record<string, string> = {};
      bodyValidation.error.errors.forEach((err) => {
        const field = err.path.join(".");
        fieldErrors[field] = err.message;
      });
      return jsonResponse(errorResponse("ValidationError", "Invalid request body", { field_errors: fieldErrors }), 400);
    }

    const payload = bodyValidation.data;

    // 5. Pobierz plan i zweryfikuj własność + wymiary siatki
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, user_id, grid_width, grid_height")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError) {
      // Sprawdź czy to błąd RLS (403)
      if (planError.code === "42501") {
        return jsonResponse(errorResponse("Forbidden", "Access to this plan is forbidden"), 403);
      }
      throw planError;
    }

    if (!plan) {
      return jsonResponse(errorResponse("NotFound", "Plan not found or access denied"), 404);
    }

    // 6. Sprawdź granice x, y względem wymiarów siatki
    const gridWidth = (plan as { grid_width: number | null }).grid_width ?? 0;
    const gridHeight = (plan as { grid_height: number | null }).grid_height ?? 0;

    if (x >= gridWidth || y >= gridHeight) {
      return jsonResponse(
        errorResponse(
          "UnprocessableEntity",
          `Coordinates (${x}, ${y}) are out of grid bounds (${gridWidth}x${gridHeight})`
        ),
        422
      );
    }

    // 7. Pobierz komórkę i sprawdź czy ma typ 'soil'
    const { data: cell, error: cellError } = await supabase
      .from("grid_cells")
      .select("type")
      .eq("plan_id", planId)
      .eq("x", x)
      .eq("y", y)
      .maybeSingle();

    if (cellError) {
      throw cellError;
    }

    if (!cell) {
      return jsonResponse(errorResponse("NotFound", `Cell at coordinates (${x}, ${y}) not found`), 404);
    }

    const cellType = (cell as { type: string }).type;
    if (cellType !== "soil") {
      return jsonResponse(
        errorResponse(
          "UnprocessableEntity",
          `Cell at coordinates (${x}, ${y}) has type '${cellType}', but only 'soil' cells can contain plants`
        ),
        422
      );
    }

    // 8. Konwertuj payload: null -> undefined dla zgodności z PlantPlacementUpsertCommand
    const commandPayload: PlantPlacementUpsertCommand = {
      plant_name: payload.plant_name,
      sunlight_score: payload.sunlight_score ?? undefined,
      humidity_score: payload.humidity_score ?? undefined,
      precip_score: payload.precip_score ?? undefined,
      temperature_score: payload.temperature_score ?? undefined,
      overall_score: payload.overall_score ?? undefined,
    };

    // 9. Wywołaj serwis upsert
    const plantPlacement = await upsertPlantPlacement(supabase, {
      planId,
      x,
      y,
      payload: commandPayload,
      userId: user.id,
    });

    // 9. Zwróć sukces 200
    const response: ApiItemResponse<typeof plantPlacement> = {
      data: plantPlacement,
    };

    return jsonResponse(response, 200);
  } catch (error) {
    // Obsługa błędów walidacji Zod (nie powinny tu trafić, ale dla bezpieczeństwa)
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path.join(".");
        fieldErrors[field] = err.message;
      });
      return jsonResponse(errorResponse("ValidationError", "Validation failed", { field_errors: fieldErrors }), 400);
    }

    // Próba pobrania user_id z locals (jeśli dostępne)
    let userId: string | undefined;
    try {
      const supabase = locals.supabase;
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      }
    } catch {
      // Ignoruj błędy przy próbie pobrania user_id
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`[PUT /api/plans/:plan_id/plants/:x/:y] Unexpected error: ${errorMessage}`, {
      endpoint: "/api/plans/:plan_id/plants/:x/:y",
      method: "PUT",
      user_id: userId,
      params: params,
      stack: errorStack,
    });

    // Zwróć generyczny błąd 500
    return jsonResponse(errorResponse("InternalError", "An unexpected error occurred"), 500);
  }
};

/**
 * DELETE /api/plans/:plan_id/plants/:x/:y
 * Usuwa nasadzenie rośliny z konkretnej komórki siatki planu ogrodowego
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    // 1. Pobierz klienta Supabase z locals
    const supabase = locals.supabase;
    if (!supabase) {
      return jsonResponse(errorResponse("Unauthorized", "Authentication required"), 401);
    }

    // 2. Autoryzuj użytkownika
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(errorResponse("Unauthorized", "Invalid or missing authentication token"), 401);
    }

    // 3. Waliduj parametry ścieżki
    const pathValidation = PlantPlacementPathSchema.safeParse(params);
    if (!pathValidation.success) {
      const fieldErrors: Record<string, string> = {};
      pathValidation.error.errors.forEach((err) => {
        const field = err.path.join(".");
        fieldErrors[field] = err.message;
      });
      return jsonResponse(
        errorResponse("ValidationError", "Invalid path parameters", { field_errors: fieldErrors }),
        400
      );
    }

    const { plan_id: planId, x, y } = pathValidation.data;

    // 4. Pobierz plan i zweryfikuj własność + wymiary siatki
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, user_id, grid_width, grid_height")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError) {
      // Sprawdź czy to błąd RLS (403)
      if (planError.code === "42501") {
        return jsonResponse(errorResponse("Forbidden", "Access to this plan is forbidden"), 403);
      }
      throw planError;
    }

    if (!plan) {
      return jsonResponse(errorResponse("NotFound", "Plan not found or access denied"), 404);
    }

    // 5. Sprawdź granice x, y względem wymiarów siatki
    const gridWidth = (plan as { grid_width: number | null }).grid_width ?? 0;
    const gridHeight = (plan as { grid_height: number | null }).grid_height ?? 0;

    if (x >= gridWidth || y >= gridHeight) {
      return jsonResponse(
        errorResponse(
          "ValidationError",
          `Coordinates (${x}, ${y}) are out of grid bounds (${gridWidth}x${gridHeight})`
        ),
        400
      );
    }

    // 6. Pobierz komórkę i sprawdź czy istnieje
    const { data: cell, error: cellError } = await supabase
      .from("grid_cells")
      .select("type")
      .eq("plan_id", planId)
      .eq("x", x)
      .eq("y", y)
      .maybeSingle();

    if (cellError) {
      throw cellError;
    }

    if (!cell) {
      return jsonResponse(errorResponse("NotFound", `Cell at coordinates (${x}, ${y}) not found`), 404);
    }

    // 7. Wywołaj serwis delete
    try {
      await deletePlantPlacement(supabase, {
        planId,
        x,
        y,
        userId: user.id,
      });
    } catch (serviceError) {
      // Sprawdź czy to błąd "not found"
      if (serviceError instanceof Error && serviceError.message === "Plant placement not found") {
        return jsonResponse(errorResponse("NotFound", `No plant placement found at coordinates (${x}, ${y})`), 404);
      }
      throw serviceError;
    }

    // 8. Zwróć sukces 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    // Obsługa błędów walidacji Zod (nie powinny tu trafić, ale dla bezpieczeństwa)
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path.join(".");
        fieldErrors[field] = err.message;
      });
      return jsonResponse(errorResponse("ValidationError", "Validation failed", { field_errors: fieldErrors }), 400);
    }

    // Próba pobrania user_id z locals (jeśli dostępne)
    let userId: string | undefined;
    try {
      const supabase = locals.supabase;
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      }
    } catch {
      // Ignoruj błędy przy próbie pobrania user_id
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`[DELETE /api/plans/:plan_id/plants/:x/:y] Unexpected error: ${errorMessage}`, {
      endpoint: "/api/plans/:plan_id/plants/:x/:y",
      method: "DELETE",
      user_id: userId,
      params: params,
      stack: errorStack,
    });

    // Zwróć generyczny błąd 500
    return jsonResponse(errorResponse("InternalError", "An unexpected error occurred"), 500);
  }
};
