import { z } from "zod";

/**
 * Schemat walidacji dla parametrów ścieżki endpointa POST /api/plans/:plan_id/grid/area-type
 * Weryfikuje, że plan_id jest poprawnym UUID
 */
export const gridAreaTypePathSchema = z.object({
  plan_id: z.string().uuid("Plan ID must be a valid UUID"),
});

/**
 * Typ wejściowy dla parametrów ścieżki (wynikowy z Zod schema)
 */
export type GridAreaTypePathParams = z.infer<typeof gridAreaTypePathSchema>;

/**
 * Schemat walidacji dla body endpointa POST /api/plans/:plan_id/grid/area-type
 * Weryfikuje współrzędne prostokąta i typ komórek siatki
 */
export const gridAreaTypePayloadSchema = z
  .object({
    x1: z.number().int().min(0, "x1 must be a non-negative integer"),
    y1: z.number().int().min(0, "y1 must be a non-negative integer"),
    x2: z.number().int().min(0, "x2 must be a non-negative integer"),
    y2: z.number().int().min(0, "y2 must be a non-negative integer"),
    type: z.enum(["soil", "water", "path", "building", "blocked"], {
      errorMap: () => ({ message: "Type must be one of: soil, water, path, building, blocked" }),
    }),
    confirm_plant_removal: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.x1 <= data.x2, {
    message: "x1 must be less than or equal to x2",
    path: ["x1"],
  })
  .refine((data) => data.y1 <= data.y2, {
    message: "y1 must be less than or equal to y2",
    path: ["y1"],
  });

/**
 * Typ wejściowy dla payload (wynikowy z Zod schema)
 */
export type GridAreaTypePayload = z.infer<typeof gridAreaTypePayloadSchema>;
