import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import type { PlantPlacementCursorKey } from "@/types";

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
  plant_name: z
    .string({ required_error: "Plant name is required" })
    .trim()
    .min(1, "Plant name is required")
    .max(100, "Plant name must be at most 100 characters"),
  sunlight_score: z
    .union([
      z.null(),
      z
        .number({ invalid_type_error: "Sunlight score must be between 1 and 5" })
        .int("Sunlight score must be between 1 and 5")
        .min(1, "Sunlight score must be between 1 and 5")
        .max(5, "Sunlight score must be between 1 and 5"),
    ])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  humidity_score: z
    .union([
      z.null(),
      z
        .number({ invalid_type_error: "Humidity score must be between 1 and 5" })
        .int("Humidity score must be between 1 and 5")
        .min(1, "Humidity score must be between 1 and 5")
        .max(5, "Humidity score must be between 1 and 5"),
    ])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  precip_score: z
    .union([
      z.null(),
      z
        .number({ invalid_type_error: "Precipitation score must be between 1 and 5" })
        .int("Precipitation score must be between 1 and 5")
        .min(1, "Precipitation score must be between 1 and 5")
        .max(5, "Precipitation score must be between 1 and 5"),
    ])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  temperature_score: z
    .union([
      z.null(),
      z
        .number({ invalid_type_error: "Temperature score must be between 1 and 5" })
        .int("Temperature score must be between 1 and 5")
        .min(1, "Temperature score must be between 1 and 5")
        .max(5, "Temperature score must be between 1 and 5"),
    ])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  overall_score: z
    .union([
      z.null(),
      z
        .number({ invalid_type_error: "Overall score must be between 1 and 5" })
        .int("Overall score must be between 1 and 5")
        .min(1, "Overall score must be between 1 and 5")
        .max(5, "Overall score must be between 1 and 5"),
    ])
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
  .superRefine((data, ctx) => {
    // Waliduj i dekoduj cursor jeśli obecny
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
          // Struktura jest poprawna - nie dodawaj błędu
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid cursor structure",
            path: ["cursor"],
          });
        }
      } catch (error) {
        // Błąd dekodowania Base64 lub parsowania JSON
        if (error instanceof Error) {
          logger.error("Błąd podczas dekodowania cursor", { error: error.message });
        } else {
          logger.error("Nieoczekiwany błąd podczas dekodowania cursor", { error: String(error) });
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid cursor format",
          path: ["cursor"],
        });
      }
    }
  })
  .transform((data) => {
    // Dekoduj cursor jeśli obecny i poprawny
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

        // Walidacja struktury (już zwalidowane w superRefine, ale sprawdzamy ponownie dla bezpieczeństwa)
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          typeof parsed.plant_name === "string" &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        ) {
          cursorKey = parsed as PlantPlacementCursorKey;
        }
      } catch (error) {
        // Błąd nie powinien wystąpić tutaj, bo już zwalidowaliśmy w superRefine
        // Ale na wszelki wypadek logujemy
        if (error instanceof Error) {
          logger.error("Nieoczekiwany błąd podczas dekodowania cursor w transform", { error: error.message });
        }
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
