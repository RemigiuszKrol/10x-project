import type { APIContext } from "astro";
import type { ApiItemResponse, ProfileDto } from "@/types";
import { errorResponse, jsonResponse, ValidationError } from "@/lib/http/errors";
import { logApiError } from "@/lib/http/error-handler";
import { getProfileByUserId, updateProfileByUserId } from "@/lib/services/profile.service";
import { ProfileUpdateSchema } from "@/lib/validation/profile.schema";
import { z } from "zod";

export const prerender = false;

/**
 * GET /api/profile - Pobierz profil zalogowanego użytkownika
 */
export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "GET /api/profile",
      method: "GET",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "GET /api/profile",
      method: "GET",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // Sanity-check user id
  const idSchema = z.string().uuid();
  const parse = idSchema.safeParse(user.id);
  if (!parse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "GET /api/profile",
      method: "GET",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  try {
    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) {
      logApiError(new Error("Profile not found"), {
        endpoint: "GET /api/profile",
        method: "GET",
        user_id: user.id,
      });
      return jsonResponse(errorResponse("NotFound", "Profile not found."), 404);
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "GET /api/profile",
      method: "GET",
      user_id: user.id,
    });

    // Heurystyka dla 403 (RLS)
    const msg = String((e as Error)?.message ?? "");
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || code === "PGRST301";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}

/**
 * PUT /api/profile - Aktualizuj profil zalogowanego użytkownika
 */
export async function PUT(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "PUT /api/profile",
      method: "PUT",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "PUT /api/profile",
      method: "PUT",
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "PUT /api/profile",
      method: "PUT",
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
      endpoint: "PUT /api/profile",
      method: "PUT",
      user_id: user.id,
    });
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON body."), 400);
  }

  const bodyParse = ProfileUpdateSchema.safeParse(requestBody);
  if (!bodyParse.success) {
    // Mapowanie błędów Zod na field_errors
    const fieldErrors: Record<string, string> = {};
    for (const issue of bodyParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }

    // Jeśli błąd to refine (co najmniej jedno pole), użyj głównego message
    const mainError = bodyParse.error.issues.find((issue) => issue.path.length === 0);
    const message = mainError?.message || "Invalid input data.";

    logApiError(new ValidationError(message), {
      endpoint: "PUT /api/profile",
      method: "PUT",
      user_id: user.id,
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const command = bodyParse.data;

  // 4. Aktualizuj profil
  try {
    const profile = await updateProfileByUserId(supabase, user.id, command);
    if (!profile) {
      logApiError(new Error("Profile not found"), {
        endpoint: "PUT /api/profile",
        method: "PUT",
        user_id: user.id,
      });
      return jsonResponse(errorResponse("NotFound", "Profile not found."), 404);
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(e, {
      endpoint: "PUT /api/profile",
      method: "PUT",
      user_id: user.id,
    });

    // Heurystyka dla 403 (RLS)
    const msg = String((e as Error)?.message ?? "");
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || code === "PGRST301";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}
