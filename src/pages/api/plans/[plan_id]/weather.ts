import type { APIContext } from "astro";
import type { ApiListResponse, WeatherMonthlyDto } from "@/types";
import { errorResponse, jsonResponse } from "@/lib/http/errors";
import { getPlanWeather } from "@/lib/services/weather.service";
import { PlanWeatherParamsSchema } from "@/lib/validation/plans";
import { z } from "zod";

export const prerender = false;

/**
 * GET /api/plans/:plan_id/weather - Pobierz dane pogodowe dla planu działki
 *
 * Zwraca zcache'owane, miesięczne metryki pogodowe (sunlight, humidity, precip, last_refreshed_at)
 * dla planu należącego do obecnie uwierzytelnionego użytkownika.
 * Dane posortowane malejąco wg year, następnie month (max 12 miesięcy).
 *
 * @returns 200 - Sukces z danymi pogodowymi w formacie ApiListResponse<WeatherMonthlyDto>
 * @returns 400 - ValidationError - nieprawidłowy plan_id (nie UUID)
 * @returns 401 - Unauthorized - brak autoryzacji
 * @returns 404 - NotFound - plan nie istnieje lub nie należy do użytkownika
 * @returns 500 - InternalError - nieoczekiwany błąd serwera
 */
export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase;

  // 1. Sprawdź dostępność klienta Supabase
  if (!supabase) {
    return jsonResponse(errorResponse("InternalError", "Configuration error."), 500);
  }

  // 2. Sprawdź sesję użytkownika
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  const user = userData?.user;
  if (!user) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 3. Sanity-check user id (musi być UUID)
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    return jsonResponse(errorResponse("InternalError", "Invalid user id."), 500);
  }

  // 4. Waliduj parametr ścieżki plan_id
  const paramsParse = PlanWeatherParamsSchema.safeParse(ctx.params);
  if (!paramsParse.success) {
    // Mapowanie błędów Zod na field_errors
    const fieldErrors: Record<string, string> = {};
    for (const issue of paramsParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }

    // Główny komunikat błędu
    const message = paramsParse.error.issues[0]?.message || "Invalid plan_id parameter.";

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const { plan_id } = paramsParse.data;

  // 5. Pobierz dane pogodowe z bazy
  try {
    const weatherData = await getPlanWeather({
      planId: plan_id,
      userId: user.id,
      supabase,
    });

    // 6. Sprawdź czy plan istnieje (serwis zwraca null jeśli plan nie należy do użytkownika)
    if (weatherData === null) {
      return jsonResponse(errorResponse("NotFound", "Plan not found."), 404);
    }

    // 7. Zwróć sukces w formacie ApiListResponse
    const body: ApiListResponse<WeatherMonthlyDto> = {
      data: weatherData,
      pagination: { next_cursor: null }, // Weather monthly zawsze max 12 rekordów, brak paginacji
    };

    return jsonResponse(body, 200);
  } catch (e: unknown) {
    // 8. Obsługa błędów
    const error = e as { code?: string; message?: string };
    const msg = String(error?.message ?? "");
    const code = error?.code;

    // Błąd uprawnień (RLS) - może wystąpić mimo wcześniejszej weryfikacji
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || code === "42501";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    // Nieoczekiwany błąd
    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}
