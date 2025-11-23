import type { APIContext } from "astro";
import type { ApiItemResponse, AnalyticsEventDto } from "@/types";
import { errorResponse, jsonResponse, ValidationError } from "@/lib/http/errors";
import { logApiError } from "@/lib/http/error-handler";
import { createAnalyticsEvent } from "@/lib/services/analytics-events.service";
import { AnalyticsEventCreateSchema } from "@/lib/validation/analytics";
import { z } from "zod";

export const prerender = false;

/**
 * POST /api/analytics/events - Rejestruje zdarzenie analityczne MVP
 *
 * Endpoint przyjmuje zdarzenia typu: plan_created, grid_saved, area_typed, plant_confirmed
 * Zdarzenia są przypisywane do aktualnie zalogowanego użytkownika.
 */
export async function POST(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "POST /api/analytics/events",
      method: "POST",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "POST /api/analytics/events",
      method: "POST",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "POST /api/analytics/events",
      method: "POST",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 422);
  }

  // 3. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error("Invalid JSON body"), {
      endpoint: "POST /api/analytics/events",
      method: "POST",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON body."), 400);
  }

  const bodyParse = AnalyticsEventCreateSchema.safeParse(requestBody);
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
      endpoint: "POST /api/analytics/events",
      method: "POST",
      user_id: user.id,
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const command = bodyParse.data;

  // 4. Dodatkowa kontrola biznesowa: sprawdź czy plan_id istnieje i należy do użytkownika
  if (command.plan_id !== null) {
    try {
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id")
        .eq("id", command.plan_id)
        .maybeSingle();

      // Błąd uprawnień (RLS)
      if (planError) {
        const msg = String(planError?.message ?? "").toLowerCase();
        const code = planError?.code;
        const isForbidden = msg.includes("permission") || msg.includes("rls") || code === "PGRST301";

        if (isForbidden) {
          return jsonResponse(errorResponse("Forbidden", "Access denied to plan."), 403);
        }

        // Inny błąd bazy danych
        return jsonResponse(errorResponse("InternalError", "Failed to verify plan."), 500);
      }

      // Plan nie istnieje lub nie należy do użytkownika
      if (!plan) {
        logApiError(new Error("Plan not found"), {
          endpoint: "POST /api/analytics/events",
          method: "POST",
          user_id: user.id,
          params: { plan_id: command.plan_id },
        });
        return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
      }
    } catch (error) {
      logApiError(error instanceof Error ? error : new Error("Failed to verify plan"), {
        endpoint: "POST /api/analytics/events",
        method: "POST",
        user_id: user.id,
        params: { plan_id: command.plan_id },
      });
      return jsonResponse(errorResponse("InternalError", "Failed to verify plan."), 500);
    }
  }

  // 5. Utwórz zdarzenie analityczne
  try {
    const event = await createAnalyticsEvent(supabase, user.id, command);

    const body: ApiItemResponse<AnalyticsEventDto> = { data: event };
    return jsonResponse(body, 201);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "POST /api/analytics/events",
      method: "POST",
      user_id: user.id,
      params: { plan_id: command.plan_id },
    });

    // Sprawdź typ błędu
    const error = e as { code?: string; message?: string };
    const msg = String(error?.message ?? "").toLowerCase();
    const code = error?.code;

    // Naruszenie ograniczenia FK (plan_id usunięty w międzyczasie)
    if (code === "23503") {
      return jsonResponse(errorResponse("UnprocessableEntity", "Referenced plan no longer exists."), 422);
    }

    // Błąd uprawnień (RLS)
    const isForbidden = msg.includes("permission") || msg.includes("rls") || code === "PGRST301";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    // Nieoczekiwany błąd
    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}
