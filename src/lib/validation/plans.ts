import { z } from "zod";

/**
 * Schemat walidacji dla tworzenia nowego planu działki
 * Waliduje wymiary, rozmiar komórki, orientację i koordynaty geograficzne
 */
export const PlanCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Plan name is required"),
    width_cm: z.number().int().positive("Width must be a positive integer"),
    height_cm: z.number().int().positive("Height must be a positive integer"),
    cell_size_cm: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)], {
      errorMap: () => ({ message: "Cell size must be 10, 25, 50, or 100 cm" }),
    }),
    orientation: z.number().int().min(0, "Orientation must be between 0 and 359").max(359),
    latitude: z.number().gte(-90, "Latitude must be between -90 and 90").lte(90).optional(),
    longitude: z.number().gte(-180, "Longitude must be between -180 and 180").lte(180).optional(),
    hemisphere: z
      .enum(["northern", "southern"], {
        errorMap: () => ({ message: "Hemisphere must be 'northern' or 'southern'" }),
      })
      .optional(),
  })
  .strict()
  .refine((data) => data.width_cm % data.cell_size_cm === 0, {
    message: "Width must be divisible by cell size",
    path: ["width_cm"],
  })
  .refine((data) => data.height_cm % data.cell_size_cm === 0, {
    message: "Height must be divisible by cell size",
    path: ["height_cm"],
  })
  .refine(
    (data) => {
      const gridWidth = data.width_cm / data.cell_size_cm;
      const gridHeight = data.height_cm / data.cell_size_cm;
      return gridWidth >= 1 && gridWidth <= 200 && gridHeight >= 1 && gridHeight <= 200;
    },
    {
      message: "Calculated grid dimensions must be between 1 and 200",
      path: ["width_cm"],
    }
  );

/**
 * Typ wejściowy dla tworzenia planu (wynikowy z Zod schema)
 */
export type PlanCreateInput = z.infer<typeof PlanCreateSchema>;

/**
 * Schemat walidacji dla aktualizacji istniejącego planu działki
 * Wszystkie pola są opcjonalne, ale co najmniej jedno musi być podane
 * Waliduje wymiary, rozmiar komórki, orientację i koordynaty geograficzne
 */
export const PlanUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Plan name cannot be empty").optional(),
    width_cm: z.number().int().positive("Width must be a positive integer").optional(),
    height_cm: z.number().int().positive("Height must be a positive integer").optional(),
    cell_size_cm: z
      .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)], {
        errorMap: () => ({ message: "Cell size must be 10, 25, 50, or 100 cm" }),
      })
      .optional(),
    orientation: z.number().int().min(0, "Orientation must be between 0 and 359").max(359).optional(),
    latitude: z.number().gte(-90, "Latitude must be between -90 and 90").lte(90).optional(),
    longitude: z.number().gte(-180, "Longitude must be between -180and 180").lte(180).optional(),
    hemisphere: z
      .enum(["northern", "southern"], {
        errorMap: () => ({ message: "Hemisphere must be 'northern' or 'southern'" }),
      })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  })
  .refine(
    (data) => {
      // Jeśli podano width_cm i cell_size_cm, sprawdź podzielność
      if (data.width_cm !== undefined && data.cell_size_cm !== undefined) {
        return data.width_cm % data.cell_size_cm === 0;
      }
      return true;
    },
    {
      message: "Width must be divisible by cell size",
      path: ["width_cm"],
    }
  )
  .refine(
    (data) => {
      // Jeśli podano height_cm i cell_size_cm, sprawdź podzielność
      if (data.height_cm !== undefined && data.cell_size_cm !== undefined) {
        return data.height_cm % data.cell_size_cm === 0;
      }
      return true;
    },
    {
      message: "Height must be divisible by cell size",
      path: ["height_cm"],
    }
  )
  .refine(
    (data) => {
      // Jeśli podano wszystkie 3 wartości, sprawdź zakres siatki
      if (data.width_cm !== undefined && data.height_cm !== undefined && data.cell_size_cm !== undefined) {
        const gridWidth = data.width_cm / data.cell_size_cm;
        const gridHeight = data.height_cm / data.cell_size_cm;
        return (
          gridWidth >= 1 &&
          gridWidth <= 200 &&
          gridHeight >= 1 &&
          gridHeight <= 200 &&
          Number.isInteger(gridWidth) &&
          Number.isInteger(gridHeight)
        );
      }
      return true;
    },
    {
      message: "Calculated grid dimensions must be between 1 and 200",
      path: ["width_cm"],
    }
  );

/**
 * Typ wejściowy dla aktualizacji planu (wynikowy z Zod schema)
 */
export type PlanUpdateInput = z.infer<typeof PlanUpdateSchema>;

/**
 * Schemat walidacji dla query parametrów PATCH /api/plans/:plan_id
 */
export const PlanUpdateQuerySchema = z.object({
  confirm_regenerate: z.coerce.boolean().optional().default(false),
});

/**
 * Schemat walidacji dla parametrów ścieżki :plan_id
 * Używany w GET, PATCH i DELETE /api/plans/:plan_id
 */
export const PlanIdParamSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * Typ wejściowy dla parametrów ścieżki planu (wynikowy z Zod schema)
 */
export type PlanIdParams = z.infer<typeof PlanIdParamSchema>;

/**
 * Pomocnicze funkcje dla cursor-based pagination
 */

/**
 * Typ cursor klucza dla paginacji planów (używa updated_at + id)
 */
export interface PlanCursorKey {
  updated_at: string;
  id: string;
}

/**
 * Koduje cursor klucz do Base64 stringa
 * @param key - Klucz zawierający updated_at i id
 * @returns Base64 zakodowany string
 */
export function encodePlanCursor(key: PlanCursorKey): string {
  const json = JSON.stringify(key);
  return Buffer.from(json, "utf-8").toString("base64");
}

/**
 * Dekoduje cursor string do klucza
 * @param cursor - Base64 zakodowany string (może być URL-encoded)
 * @returns Zdekodowany klucz lub null jeśli niepoprawny
 */
export function decodePlanCursor(cursor: string): PlanCursorKey | null {
  try {
    // Najpierw zdekoduj URL-encoding (jeśli występuje)
    // Base64 może zawierać znaki +, /, = które są URL-encoded w query params
    let decodedCursor = cursor;
    try {
      // Spróbuj zdekodować URL - jeśli nie jest URL-encoded, decodeURIComponent zwróci oryginalny string
      decodedCursor = decodeURIComponent(cursor);
    } catch {
      // Jeśli dekodowanie URL się nie powiodło, użyj oryginalnego stringa
      decodedCursor = cursor;
    }

    // Teraz zdekoduj Base64
    const json = Buffer.from(decodedCursor, "base64").toString("utf-8");
    const parsed = JSON.parse(json);

    // Walidacja struktury
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.updated_at === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed as PlanCursorKey;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Schemat walidacji dla query parametrów GET /api/plans
 * Obsługuje cursor-based pagination z sortowaniem po updated_at
 */
export const PlanListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(100, "Limit must be at most 100")
      .optional()
      .default(20),
    cursor: z.string().optional(),
    sort: z.enum(["updated_at"], { errorMap: () => ({ message: "Sort field must be 'updated_at'" }) }).optional(),
    order: z.enum(["asc", "desc"], { errorMap: () => ({ message: "Order must be 'asc' or 'desc'" }) }).optional(),
  })
  .transform((data) => {
    // Dekoduj cursor jeśli obecny
    let cursorKey: PlanCursorKey | null = null;
    if (data.cursor) {
      cursorKey = decodePlanCursor(data.cursor);
      if (!cursorKey) {
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
      isAscending: data.order === "asc",
    };
  });

/**
 * Typ wejściowy dla listowania planów (wynikowy z Zod schema)
 */
export type PlanListQueryInput = z.infer<typeof PlanListQuerySchema>;

/**
 * Schemat walidacji dla parametrów ścieżki GET /api/plans/:plan_id/grid
 * Używany do walidacji plan_id w endpoincie metadanych siatki
 */
export const PlanGridParamsSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * Typ wejściowy dla parametrów ścieżki metadanych siatki (wynikowy z Zod schema)
 */
export type PlanGridParams = z.infer<typeof PlanGridParamsSchema>;

/**
 * Schemat walidacji dla parametrów ścieżki GET /api/plans/:plan_id/weather
 * Używany do walidacji plan_id w endpoincie danych pogodowych
 */
export const PlanWeatherParamsSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * Typ wejściowy dla parametrów ścieżki danych pogodowych (wynikowy z Zod schema)
 */
export type PlanWeatherParams = z.infer<typeof PlanWeatherParamsSchema>;
