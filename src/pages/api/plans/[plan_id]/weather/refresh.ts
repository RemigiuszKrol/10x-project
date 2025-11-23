/**
 * POST /api/plans/:plan_id/weather/refresh
 *
 * Endpoint odświeżający cache danych pogodowych dla planu użytkownika.
 * Pobiera dane z Open-Meteo Historical Weather API, normalizuje do 0-100
 * i zapisuje w tabeli weather_monthly.
 *
 * @returns 200 - Sukces, dane zostały odświeżone lub cache był aktualny
 * @returns 400 - ValidationError - nieprawidłowy format plan_id lub body
 * @returns 401 - Unauthorized - brak autoryzacji
 * @returns 404 - NotFound - plan nie istnieje lub nie należy do użytkownika
 * @returns 422 - UnprocessableEntity - plan nie ma ustawionej lokalizacji
 * @returns 429 - RateLimited - przekroczono limit zapytań (1/2min per plan)
 * @returns 500 - InternalError - nieoczekiwany błąd serwera
 * @returns 502 - UpstreamError - błąd Open-Meteo API
 * @returns 504 - UpstreamTimeout - timeout Open-Meteo API
 */

import type { APIContext } from "astro";
import type { ApiItemResponse, WeatherRefreshResultDto } from "@/types";
import { errorResponse, jsonResponse, ValidationError } from "@/lib/http/errors";
import { logApiError } from "@/lib/http/error-handler";
import {
  PlanNotFoundError,
  PlanMissingLocationError,
  UpstreamError,
  UpstreamTimeoutError,
} from "@/lib/http/weather.errors";
import { WeatherService } from "@/lib/services/weather.service";
import { weatherRefreshLimiter } from "@/lib/utils/rate-limiter";
import { planIdParamSchema, weatherRefreshCommandSchema } from "@/lib/validation/weather";
import { z } from "zod";

export const prerender = false;

/**
 * POST /api/plans/:plan_id/weather/refresh
 * Odświeża cache danych pogodowych dla planu
 */
export async function POST(ctx: APIContext) {
  const supabase = ctx.locals.supabase;

  // 1. Sprawdź dostępność klienta Supabase
  if (!supabase) {
    logApiError(new Error("Supabase client not available"), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("InternalError", "Configuration error."), 500);
  }

  // 2. Sprawdź sesję użytkownika (JWT authentication)
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    logApiError(authError, {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  const user = userData?.user;
  if (!user) {
    logApiError(new Error("User not found in session"), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 3. Sanity-check user id (musi być UUID)
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    logApiError(new Error("Invalid user id format"), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });
    return jsonResponse(errorResponse("InternalError", "Invalid user id."), 500);
  }

  // 4. Waliduj parametr ścieżki plan_id
  const paramsParse = planIdParamSchema.safeParse(ctx.params.plan_id);
  if (!paramsParse.success) {
    const fieldErrors: Record<string, string> = {
      plan_id: paramsParse.error.issues[0]?.message || "Invalid plan_id format",
    };

    logApiError(new ValidationError("Invalid plan_id format", "plan_id"), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user.id,
      params: { plan_id: ctx.params.plan_id },
    });

    return jsonResponse(errorResponse("ValidationError", "Invalid plan_id format", { field_errors: fieldErrors }), 400);
  }

  const planId = paramsParse.data;

  // 5. Check rate limit PRZED parsowaniem body (optymalizacja)
  const rateLimitCheck = weatherRefreshLimiter.check(planId);
  if (!rateLimitCheck.allowed) {
    const retryAfter = rateLimitCheck.retryAfter ?? 120; // default 2 min
    const retryMinutes = Math.ceil(retryAfter / 60);

    logApiError(new Error("Rate limit exceeded"), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user.id,
      params: { plan_id: planId },
    });

    return new Response(
      JSON.stringify(
        errorResponse(
          "RateLimited",
          `Weather refresh rate limit exceeded. Please try again in ${retryMinutes} minute${retryMinutes > 1 ? "s" : ""}.`
        )
      ),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // 6. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error("Invalid JSON in request body"), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user.id,
      params: { plan_id: planId },
    });
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON in request body."), 400);
  }

  const bodyParse = weatherRefreshCommandSchema.safeParse(requestBody);
  if (!bodyParse.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of bodyParse.error.issues) {
      const field = issue.path[0]?.toString() || "root";
      fieldErrors[field] = issue.message;
    }

    const message = bodyParse.error.issues[0]?.message || "Invalid request data.";

    logApiError(new ValidationError(message), {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user.id,
      params: { plan_id: planId },
    });

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { force } = bodyParse.data;

  // 7. Execute weather refresh
  try {
    const weatherService = new WeatherService(supabase);
    const result = await weatherService.refreshWeatherForPlan(planId, force);

    // 8. Zwróć sukces
    const body: ApiItemResponse<WeatherRefreshResultDto> = { data: result };
    return jsonResponse(body, 200);
  } catch (error) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(error, {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user.id,
      params: { plan_id: planId },
    });

    return handleWeatherServiceError(error);
  }
}

/**
 * Helper do obsługi błędów z WeatherService
 * Mapuje custom error classes na odpowiednie HTTP responses
 */
function handleWeatherServiceError(error: unknown): Response {
  // Custom error types z WeatherService
  if (error instanceof PlanNotFoundError) {
    return jsonResponse(errorResponse("NotFound", error.message), 404);
  }

  if (error instanceof PlanMissingLocationError) {
    return jsonResponse(errorResponse("UnprocessableEntity", error.message), 422);
  }

  if (error instanceof UpstreamTimeoutError) {
    return jsonResponse(errorResponse("UpstreamTimeout", "Weather service request timed out."), 504);
  }

  if (error instanceof UpstreamError) {
    return jsonResponse(errorResponse("InternalError", error.message), 500);
  }

  return jsonResponse(
    errorResponse("InternalError", "An unexpected error occurred while refreshing weather data."),
    500
  );
}
