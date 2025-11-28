import { z } from "zod";

/**
 * Schemat walidacji dla parametrów ścieżki endpointa GET /api/plans/:plan_id/grid/cells
 * Weryfikuje, że plan_id jest poprawnym UUID
 */
export const gridCellsPathSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * Typ wejściowy dla parametrów ścieżki (wynikowy z Zod schema)
 */
export type GridCellsPathParams = z.infer<typeof gridCellsPathSchema>;

/**
 * Schemat walidacji dla query params endpointa GET /api/plans/:plan_id/grid/cells
 * Obsługuje filtry: type, x/y, bbox oraz paginację kursorową
 */
export const gridCellsQuerySchema = z
  .object({
    // Filtr po typie komórki
    type: z.enum(["soil", "water", "path", "building", "blocked"]).optional(),

    // Filtr po pojedynczej pozycji (x,y) - oba wymagane jeśli któreś jest podane
    x: z.coerce.number().int().min(0, "x must be a non-negative integer").optional(),
    y: z.coerce.number().int().min(0, "y must be a non-negative integer").optional(),

    // Filtr po prostokątnym obszarze (bbox) w formacie "x1,y1,x2,y2"
    bbox: z
      .string()
      .regex(/^\d+,\d+,\d+,\d+$/, "bbox must be in format 'x1,y1,x2,y2'")
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const [x1, y1, x2, y2] = val.split(",").map(Number);
        return [x1, y1, x2, y2] as [number, number, number, number];
      }),

    // Paginacja
    limit: z.coerce.number().int().optional(),
    cursor: z.string().optional(),

    // Sortowanie
    sort: z.enum(["updated_at", "x"]).default("updated_at"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  // Walidacja: jeśli x jest podane, y musi być podane i odwrotnie
  .refine((data) => (data.x !== undefined) === (data.y !== undefined), {
    message: "Both x and y must be provided together, or neither",
    path: ["x"],
  })
  // Walidacja: nie można mieszać x/y z bbox
  .refine((data) => !(data.x !== undefined && data.bbox !== undefined), {
    message: "Cannot use both x/y and bbox filters together",
    path: ["x"],
  })
  // Walidacja: bbox musi mieć x1 <= x2
  .refine(
    (data) => {
      if (!data.bbox) return true;
      const [x1, , x2] = data.bbox;
      return x1 <= x2;
    },
    {
      message: "bbox must have x1 <= x2",
      path: ["bbox"],
    }
  )
  // Walidacja: bbox musi mieć y1 <= y2
  .refine(
    (data) => {
      if (!data.bbox) return true;
      const [, y1, , y2] = data.bbox;
      return y1 <= y2;
    },
    {
      message: "bbox must have y1 <= y2",
      path: ["bbox"],
    }
  );

/**
 * Typ wejściowy dla query params (wynikowy z Zod schema)
 */
export type GridCellsQuery = z.infer<typeof gridCellsQuerySchema>;

/**
 * Payload kursora paginacji (JSON zakodowany w Base64)
 */
export interface GridCellCursorPayload {
  updated_at: string; // ISO timestamp
  x: number;
  y: number;
}

/**
 * Parsuje i waliduje kursor paginacji
 *
 * @param cursor - Zakodowany kursor Base64
 * @returns Zdekodowany payload kursora
 * @throws Error jeśli kursor jest niepoprawny
 */
export function parseGridCursor(cursor: string): GridCellCursorPayload {
  try {
    // Dekoduj Base64
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const payload = JSON.parse(decoded);

    // Waliduj strukturę
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.updated_at !== "string" ||
      typeof payload.x !== "number" ||
      typeof payload.y !== "number"
    ) {
      throw new Error("Invalid cursor structure");
    }

    // Waliduj że updated_at jest poprawnym ISO timestamp
    const date = new Date(payload.updated_at);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid updated_at timestamp in cursor");
    }

    return payload as GridCellCursorPayload;
  } catch (error) {
    throw new Error(`Invalid cursor format: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generuje kursor paginacji z payloadu
 *
 * @param payload - Dane kursora
 * @returns Zakodowany kursor Base64
 */
export function encodeGridCursor(payload: GridCellCursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf-8").toString("base64");
}

/**
 * Schemat walidacji dla parametrów ścieżki endpointa PUT /api/plans/:plan_id/grid/cells/:x/:y
 * Weryfikuje plan_id jako UUID oraz x,y jako nieujemne liczby całkowite
 */
export const gridCellUpdatePathSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
  x: z.coerce.number().int().min(0, "x must be a non-negative integer"),
  y: z.coerce.number().int().min(0, "y must be a non-negative integer"),
});

/**
 * Typ wejściowy dla parametrów ścieżki PUT /grid/cells/:x/:y
 */
export type GridCellUpdatePathParams = z.infer<typeof gridCellUpdatePathSchema>;

/**
 * Schemat walidacji dla body endpointa PUT /api/plans/:plan_id/grid/cells/:x/:y
 * Weryfikuje że type jest jednym z dozwolonych typów komórki siatki
 */
export const gridCellUpdateSchema = z
  .object({
    type: z.enum(["soil", "path", "water", "building", "blocked"], {
      errorMap: () => ({ message: "Type must be one of: soil, path, water, building, blocked" }),
    }),
  })
  .strict();

/**
 * Typ wejściowy dla body (wynikowy z Zod schema)
 */
export type GridCellUpdateInput = z.infer<typeof gridCellUpdateSchema>;
