import type { APIRoute } from "astro";
import { z } from "zod";
import { getOpenRouterService } from "@/lib/services/openrouter.instance";
import type { PlantFitContext, ApiItemResponse, ApiErrorResponse, PlantFitResultDto } from "@/types";
import type { Database } from "@/db/database.types";
import { logger } from "@/lib/utils/logger";
import { denormalizeTemperature } from "@/lib/utils/temperature";
import { handleAIError } from "@/lib/http/ai-error-handler";

/**
 * Walidacja request body
 */
const FitRequestSchema = z.object({
  plan_id: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  plant_name: z.string().min(1).max(200),
});

/**
 * POST /api/ai/plants/fit
 *
 * Sprawdza dopasowanie rośliny do warunków działki używając OpenRouter AI
 *
 * Request body:
 * {
 *   "plan_id": "uuid",
 *   "x": 5,
 *   "y": 10,
 *   "plant_name": "Pomidor"
 * }
 *
 * Response 200:
 * {
 *   "data": {
 *     "sunlight_score": 5,
 *     "humidity_score": 4,
 *     "precip_score": 4,
 *     "overall_score": 5,
 *     "explanation": "Pomidor wymaga pełnego słońca..."
 *   }
 * }
 *
 * Response 401: Unauthorized (brak użytkownika)
 * Response 400: ValidationError (nieprawidłowe dane)
 * Response 403: Forbidden (brak dostępu do planu)
 * Response 404: NotFound (plan nie istnieje)
 * Response 422: UnprocessableEntity (komórka nie istnieje lub nie jest typu 'soil')
 * Response 429: RateLimited (zbyt wiele zapytań)
 * Response 504: UpstreamTimeout (AI nie odpowiada)
 * Response 500: InternalError (nieznany błąd)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "Unauthorized",
            message: "Musisz być zalogowany",
          },
        } satisfies ApiErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parse i walidacja body
    const body = await request.json();
    const validation = FitRequestSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({
          error: {
            code: "ValidationError",
            message: "Nieprawidłowe dane",
            details: {
              field_errors: Object.fromEntries(
                Object.entries(fieldErrors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
              ),
            },
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { plan_id, x, y, plant_name } = validation.data;

    // 3. Pobierz dane planu z bazy
    const supabase = locals.supabase;
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("user_id, latitude, longitude, orientation, hemisphere")
      .eq("id", plan_id)
      .single();

    if (planError || !planData) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NotFound",
            message: "Plan nie został znaleziony",
          },
        } satisfies ApiErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const plan = planData as Database["public"]["Tables"]["plans"]["Row"];

    // 4. Sprawdź czy użytkownik jest właścicielem planu
    if (plan.user_id !== locals.user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "Forbidden",
            message: "Brak dostępu do tego planu",
          },
        } satisfies ApiErrorResponse),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Sprawdź czy komórka jest typu 'soil'
    const { data: cellData, error: cellError } = await supabase
      .from("grid_cells")
      .select("type")
      .eq("plan_id", plan_id)
      .eq("x", x)
      .eq("y", y)
      .single();

    if (cellError || !cellData) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UnprocessableEntity",
            message: "Komórka nie istnieje",
          },
        } satisfies ApiErrorResponse),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const cell = cellData as Database["public"]["Tables"]["grid_cells"]["Row"];

    if (cell.type !== "soil") {
      return new Response(
        JSON.stringify({
          error: {
            code: "UnprocessableEntity",
            message: 'Roślinę można dodać tylko na komórce typu "ziemia"',
          },
        } satisfies ApiErrorResponse),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Pobierz dane pogodowe (cached w tabeli weather_monthly)
    const weatherQuery = await supabase
      .from("weather_monthly")
      .select("month, temperature, sunlight, humidity, precip")
      .eq("plan_id", plan_id)
      .order("month", { ascending: true });

    const weatherData = (weatherQuery.data || []) as {
      month: number;
      temperature: number;
      sunlight: number;
      humidity: number;
      precip: number;
    }[];

    // 7. Przygotuj kontekst dla AI
    const context: PlantFitContext = {
      plant_name,
      location: {
        lat: plan.latitude ?? 0,
        lon: plan.longitude ?? 0,
      },
      orientation: plan.orientation,
      climate: {
        annual_temp_avg:
          weatherData.length > 0
            ? weatherData.reduce((sum, w) => sum + denormalizeTemperature(w.temperature), 0) / weatherData.length
            : 0,
        annual_precip: weatherData.length > 0 ? weatherData.reduce((sum, w) => sum + w.precip, 0) : 0,
      },
      cell: { x, y },
      weather_monthly: weatherData,
    };

    // 8. Wywołanie OpenRouter
    const openRouter = getOpenRouterService();
    const result = await openRouter.checkPlantFit(context);

    // 9. Zwrócenie wyniku
    return new Response(
      JSON.stringify({
        data: result,
      } satisfies ApiItemResponse<PlantFitResultDto>),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`[API] /api/ai/plants/fit error: ${errorMessage}`, {
      endpoint: "/api/ai/plants/fit",
      method: "POST",
      user_id: locals.user?.id,
      stack: errorStack,
    });

    return handleAIError(error, "Nie udało się sprawdzić dopasowania rośliny");
  }
};
