import type { APIContext } from "astro";
import type { ApiItemResponse, ApiListResponse, PlanDto } from "@/types";
import { errorResponse, jsonResponse, ValidationError } from "@/lib/http/errors";
import { logApiError } from "@/lib/http/error-handler";
import { createPlan, listPlans } from "@/lib/services/plans.service";
import { PlanCreateSchema, PlanListQuerySchema } from "@/lib/validation/plans";
import { z } from "zod";

export const prerender = false;

/**
 * POST /api/plans - Utwórz nowy plan działki
 */
export async function POST(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "POST /api/plans",
      method: "POST",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "POST /api/plans",
      method: "POST",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "POST /api/plans",
      method: "POST",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  // 3. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error("Invalid JSON body"), {
      endpoint: "POST /api/plans",
      method: "POST",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON body."), 400);
  }

  const bodyParse = PlanCreateSchema.safeParse(requestBody);
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
      endpoint: "POST /api/plans",
      method: "POST",
      user_id: user.id,
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const command = bodyParse.data;

  // 4. Utwórz plan
  try {
    // Ensure command has width_cm and height_cm for PlanCreateCommand
    const { width_m, height_m, ...rest } = command;
    const planCreateCommand = {
      ...rest,
      width_cm: Math.round(width_m * 100),
      height_cm: Math.round(height_m * 100),
    };

    const plan = await createPlan(supabase, user.id, planCreateCommand);

    const body: ApiItemResponse<PlanDto> = { data: plan };
    return jsonResponse(body, 201);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "POST /api/plans",
      method: "POST",
      user_id: user.id,
    });

    // Sprawdź typ błędu
    const error = e as { code?: string; message?: string };
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
 * GET /api/plans - Pobierz paginowaną listę planów działki użytkownika
 */
export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "GET /api/plans",
      method: "GET",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "GET /api/plans",
      method: "GET",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "GET /api/plans",
      method: "GET",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  // 3. Parsuj i waliduj query parametry
  const queryParams: Record<string, string> = {};
  for (const [key, value] of ctx.url.searchParams.entries()) {
    queryParams[key] = value;
  }

  const queryParse = PlanListQuerySchema.safeParse(queryParams);
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
      endpoint: "GET /api/plans",
      method: "GET",
      user_id: user.id,
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const query = queryParse.data;

  // 4. Pobierz listę planów
  try {
    const result = await listPlans(supabase, user.id, query);

    const body: ApiListResponse<PlanDto> = {
      data: result.items,
      pagination: { next_cursor: result.nextCursor },
    };

    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "GET /api/plans",
      method: "GET",
      user_id: user.id,
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
