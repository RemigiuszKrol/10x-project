import { z } from "zod";
import { logger } from "@/lib/utils/logger";

/**
 * Schemat walidacji dla parametrów ścieżki PUT /api/plans/:plan_id/plants/:x/:y
 * Waliduje UUID planu i współrzędne x, y w zakresie 0-199
 */
export const PlantPlacementPathSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
  x: z.coerce
    .number()
    .int("X coordinate must be an integer")
    .min(0, "X coordinate must be at least 0")
    .max(199, "X coordinate must be at most 199"),
  y: z.coerce
    .number()
    .int("Y coordinate must be an integer")
    .min(0, "Y coordinate must be at least 0")
    .max(199, "Y coordinate must be at most 199"),
});

/**
 * Typ wejściowy dla parametrów ścieżki (wynikowy z Zod schema)
 */
export type PlantPlacementPathParams = z.infer<typeof PlantPlacementPathSchema>;

/**
 * Schemat walidacji dla body PUT /api/plans/:plan_id/plants/:x/:y
 * Waliduje nazwę rośliny i opcjonalne score'y (1-5 lub null)
 */
export const PlantPlacementUpsertSchema = z.object({
  plant_name: z.string().trim().min(1, "Plant name is required").max(100, "Plant name must be at most 100 characters"),
  sunlight_score: z
    .union([z.null(), z.number().int().min(1, "Sunlight score must be between 1 and 5").max(5)])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  humidity_score: z
    .union([z.null(), z.number().int().min(1, "Humidity score must be between 1 and 5").max(5)])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  precip_score: z
    .union([z.null(), z.number().int().min(1, "Precipitation score must be between 1 and 5").max(5)])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  overall_score: z
    .union([z.null(), z.number().int().min(1, "Overall score must be between 1 and 5").max(5)])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
});

/**
 * Typ wejściowy dla body upsert rośliny (wynikowy z Zod schema)
 */
export type PlantPlacementUpsertBody = z.infer<typeof PlantPlacementUpsertSchema>;

/**
 * Schemat walidacji dla parametrów ścieżki GET /api/plans/:plan_id/plants
 * Waliduje UUID planu
 */
export const PlantPlacementsPathSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * Typ wejściowy dla parametrów ścieżki listy nasadzeń (wynikowy z Zod schema)
 */
export type PlantPlacementsPathParams = z.infer<typeof PlantPlacementsPathSchema>;

/**
 * Typ cursor klucza dla paginacji nasadzeń (używa plant_name + x + y)
 */
export interface PlantPlacementCursorKey {
  plant_name: string;
  x: number;
  y: number;
}

/**
 * Schemat walidacji dla query parametrów GET /api/plans/:plan_id/plants
 * Obsługuje cursor-based pagination z filtrem po nazwie rośliny
 */
export const PlantPlacementsQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(100, "Limit must be at most 100")
      .optional()
      .default(25),
    cursor: z.string().optional(),
    name: z
      .string()
      .trim()
      .min(1, "Name filter must be at least 1 character")
      .max(100, "Name filter must be at most 100 characters")
      .optional(),
  })
  .transform((data) => {
    // Dekoduj cursor jeśli obecny
    let cursorKey: PlantPlacementCursorKey | null = null;
    if (data.cursor) {
      try {
        // Najpierw zdekoduj URL-encoding (jeśli występuje)
        let decodedCursor = data.cursor;
        try {
          decodedCursor = decodeURIComponent(data.cursor);
        } catch (error) {
          // Jeśli dekodowanie URL się nie powiodło, użyj oryginalnego stringa
          if (error instanceof Error) {
            logger.warn("Nie udało się zdekodować URL cursor, używam oryginalnego", { error: error.message });
          }
          decodedCursor = data.cursor;
        }

        // Teraz zdekoduj Base64
        const json = Buffer.from(decodedCursor, "base64").toString("utf-8");
        const parsed = JSON.parse(json);

        // Walidacja struktury
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          typeof parsed.plant_name === "string" &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        ) {
          cursorKey = parsed as PlantPlacementCursorKey;
        } else {
          throw new z.ZodError([
            {
              code: "custom",
              message: "Invalid cursor structure",
              path: ["cursor"],
            },
          ]);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Jeśli to już ZodError, przekaż dalej
          throw error;
        }
        // Inny błąd - loguj i rzuć ogólny błąd walidacji
        if (error instanceof Error) {
          logger.error("Błąd podczas dekodowania cursor", { error: error.message });
        } else {
          logger.error("Nieoczekiwany błąd podczas dekodowania cursor", { error: String(error) });
        }
        throw new z.ZodError([
          {
            code: "custom",
            message: "Invalid cursor format",
            path: ["cursor"],
          },
        ]);
      }
    }

    return {
      limit: data.limit,
      cursorKey,
      name: data.name,
    };
  });

/**
 * Typ wejściowy dla query parametrów listy nasadzeń (wynikowy z Zod schema)
 */
export type PlantPlacementsQuery = z.infer<typeof PlantPlacementsQuerySchema>;

/**
 * Koduje cursor klucz do Base64 stringa
 * @param key - Klucz zawierający plant_name, x i y
 * @returns Base64 zakodowany string
 */
export function encodePlantPlacementCursor(key: PlantPlacementCursorKey): string {
  const json = JSON.stringify(key);
  return Buffer.from(json, "utf-8").toString("base64");
}

/**
 * Wynik operacji usunięcia nasadzenia rośliny
 */
export interface DeletePlantPlacementResult {
  deleted: boolean;
}
