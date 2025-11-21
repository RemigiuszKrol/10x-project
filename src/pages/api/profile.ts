import type { APIContext } from "astro";
import type { ApiItemResponse, ProfileDto } from "@/types";
import { errorResponse, jsonResponse } from "@/lib/http/errors";
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
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // Sanity-check user id
  const idSchema = z.string().uuid();
  const parse = idSchema.safeParse(user.id);
  if (!parse.success) {
    return jsonResponse(errorResponse("UnprocessableEntity", "Invalid user id."), 400);
  }

  try {
    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) {
      return jsonResponse(errorResponse("NotFound", "Profile not found."), 404);
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
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

  // 3. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch {
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

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const command = bodyParse.data;

  // 4. Aktualizuj profil
  try {
    const profile = await updateProfileByUserId(supabase, user.id, command);
    if (!profile) {
      return jsonResponse(errorResponse("NotFound", "Profile not found."), 404);
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return jsonResponse(body, 200);
  } catch (e: unknown) {
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
