import type { APIContext } from "astro";
import type { ApiListResponse, PlantPlacementDto } from "@/types";
import { errorResponse, jsonResponse } from "@/lib/http/errors";
import { listPlantPlacements } from "@/lib/services/plant-placements.service";
import { PlantPlacementsPathSchema, PlantPlacementsQuerySchema } from "@/lib/validation/plant-placements";
import { z } from "zod";

export const prerender = false;

/**
 * GET /api/plans/:plan_id/plants - Pobierz stronicowaną listę nasadzeń rośliny
 */
export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  // 3. Waliduj parametry ścieżki
  const pathParse = PlantPlacementsPathSchema.safeParse(ctx.params);
  if (!pathParse.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of pathParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }
    const message = pathParse.error.issues[0]?.message || "Invalid path parameters.";
    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { plan_id: planId } = pathParse.data;

  // 4. Parsuj i waliduj query parametry
  const queryParams: Record<string, string> = {};
  for (const [key, value] of ctx.url.searchParams.entries()) {
    queryParams[key] = value;
  }

  const queryParse = PlantPlacementsQuerySchema.safeParse(queryParams);
  if (!queryParse.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of queryParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }
    const message = queryParse.error.issues[0]?.message || "Invalid query parameters.";
    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { limit, cursorKey, name } = queryParse.data;

  // 5. Dla pierwszej strony (brak cursora) weryfikuj istnienie planu
  if (!cursorKey) {
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError) {
      // Błąd uprawnień (RLS)
      const msg = String(planError?.message ?? "");
      const code = planError?.code;
      const isForbidden =
        msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || code === "42501";

      if (isForbidden) {
        return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
      }

      // Nieoczekiwany błąd
      return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
    }

    if (!planData) {
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }
  }

  // 6. Pobierz listę nasadzeń
  try {
    const result = await listPlantPlacements(supabase, {
      planId,
      userId: user.id,
      limit,
      cursorKey,
      name,
    });

    const body: ApiListResponse<PlantPlacementDto> = {
      data: result.items,
      pagination: { next_cursor: result.nextCursor },
    };

    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // Sprawdź typ błędu
    const error = e as { code?: string; message?: string };
    const msg = String(error?.message ?? "");
    const code = error?.code;

    // Plan nie istnieje (błąd PGRST116)
    if (code === "PGRST116" || msg.includes("Plan not found")) {
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }

    // Błąd uprawnień (RLS)
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || code === "42501";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    // Nieoczekiwany błąd
    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}
