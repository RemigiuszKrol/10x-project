import type { APIContext } from "astro";
import type { ApiItemResponse, PlanDto } from "@/types";
import { errorResponse, jsonResponse, GridChangeRequiresConfirmationError, ValidationError } from "@/lib/http/errors";
import { logApiError } from "@/lib/http/error-handler";
import { getPlanById, updatePlan, deletePlan } from "@/lib/services/plans.service";
import { PlanIdParamSchema, PlanUpdateSchema, PlanUpdateQuerySchema } from "@/lib/validation/plans";
import { z } from "zod";

export const prerender = false;

/**
 * GET /api/plans/:plan_id - Pobierz szczegóły pojedynczego planu działki
 */
export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "GET /api/plans/:plan_id",
      method: "GET",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "GET /api/plans/:plan_id",
      method: "GET",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "GET /api/plans/:plan_id",
      method: "GET",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  // 3. Waliduj parametr ścieżki plan_id
  const paramsParse = PlanIdParamSchema.safeParse(ctx.params);
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
      endpoint: "GET /api/plans/:plan_id",
      method: "GET",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { plan_id } = paramsParse.data;

  // 4. Pobierz plan z bazy
  try {
    const plan = await getPlanById(supabase, user.id, plan_id);

    // 5. Sprawdź czy plan istnieje
    if (!plan) {
      logApiError(new Error("Plan not found"), {
        endpoint: "GET /api/plans/:plan_id",
        method: "GET",
        user_id: user.id,
        params: { plan_id },
      });
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }

    // 6. Zwróć sukces
    const body: ApiItemResponse<PlanDto> = { data: plan };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "GET /api/plans/:plan_id",
      method: "GET",
      user_id: user.id,
      params: { plan_id },
    });

    // Sprawdź typ błędu
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

/**
 * PATCH /api/plans/:plan_id - Aktualizuj istniejący plan działki
 */
export async function PATCH(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  // 3. Waliduj parametr ścieżki plan_id
  const paramsParse = PlanIdParamSchema.safeParse(ctx.params);
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
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { plan_id } = paramsParse.data;

  // 4. Waliduj query parametry
  const queryParams: Record<string, string> = {};
  for (const [key, value] of ctx.url.searchParams.entries()) {
    queryParams[key] = value;
  }

  const queryParse = PlanUpdateQuerySchema.safeParse(queryParams);
  if (!queryParse.success) {
    // Mapowanie błędów Zod na field_errors
    const fieldErrors: Record<string, string> = {};
    for (const issue of queryParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }

    // Główny komunikat błędu
    const message = queryParse.error.issues[0]?.message || "Invalid query parameters.";

    logApiError(new ValidationError(message), {
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      user_id: user.id,
      params: { plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { confirm_regenerate } = queryParse.data;

  // 5. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error("Invalid JSON body"), {
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      user_id: user.id,
      params: { plan_id },
    });
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON body."), 400);
  }

  const bodyParse = PlanUpdateSchema.safeParse(requestBody);
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
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      user_id: user.id,
      params: { plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const command = bodyParse.data;

  // 6. Aktualizuj plan
  try {
    const plan = await updatePlan(supabase, user.id, plan_id, command, {
      confirmRegenerate: confirm_regenerate,
    });

    // 7. Sprawdź czy plan istnieje
    if (!plan) {
      logApiError(new Error("Plan not found"), {
        endpoint: "PATCH /api/plans/:plan_id",
        method: "PATCH",
        user_id: user.id,
        params: { plan_id },
      });
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }

    // 8. Zwróć sukces
    const body: ApiItemResponse<PlanDto> = { data: plan };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "PATCH /api/plans/:plan_id",
      method: "PATCH",
      user_id: user.id,
      params: { plan_id },
    });

    // Sprawdź typ błędu
    const error = e as { code?: string; message?: string };

    // Błąd walidacji z serwisu (powinien być mapowany na 400)
    if (e instanceof ValidationError) {
      const fieldErrors: Record<string, string> = {};
      if (e.field) {
        fieldErrors[e.field] = e.message;
      }
      return jsonResponse(errorResponse("ValidationError", e.message, { field_errors: fieldErrors }), 400);
    }

    // Błąd wymagający potwierdzenia regeneracji siatki
    if (e instanceof GridChangeRequiresConfirmationError) {
      // 'requires_confirmation' is not a known property, so include it inside field_errors for compatibility
      return jsonResponse(
        errorResponse("Conflict", e.message, {
          field_errors: { requires_confirmation: "true" },
        }),
        409
      );
    }

    const msg = String(error?.message ?? "");
    const code = error?.code;

    // Konflikt unikatowości (user_id, name)
    if (code === "23505") {
      return jsonResponse(errorResponse("Conflict", "Plan with this name already exists."), 409);
    }

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

/**
 * DELETE /api/plans/:plan_id - Usuń istniejący plan działki
 */
export async function DELETE(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "DELETE /api/plans/:plan_id",
      method: "DELETE",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "DELETE /api/plans/:plan_id",
      method: "DELETE",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "DELETE /api/plans/:plan_id",
      method: "DELETE",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  // 3. Waliduj parametr ścieżki plan_id
  const paramsParse = PlanIdParamSchema.safeParse(ctx.params);
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
      endpoint: "DELETE /api/plans/:plan_id",
      method: "DELETE",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { plan_id } = paramsParse.data;

  // 4. Usuń plan
  try {
    const deleted = await deletePlan(supabase, user.id, plan_id);

    // 5. Sprawdź czy plan został usunięty
    if (!deleted) {
      logApiError(new Error("Plan not found"), {
        endpoint: "DELETE /api/plans/:plan_id",
        method: "DELETE",
        user_id: user.id,
        params: { plan_id },
      });
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }

    // 6. Zwróć sukces (204 No Content - bez treści)
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "DELETE /api/plans/:plan_id",
      method: "DELETE",
      user_id: user.id,
      params: { plan_id },
    });

    // Sprawdź typ błędu
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
