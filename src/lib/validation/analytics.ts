import { z } from "zod";
import type { Json } from "@/db/database.types";

/**
 * Schemat walidacji dla tworzenia zdarzenia analitycznego
 * Wspiera cztery typy zdarzeń MVP: plan_created, grid_saved, area_typed, plant_confirmed
 */
export const AnalyticsEventCreateSchema = z.object({
  // event_type: wymagany enum z czterech dozwolonych wartości
  event_type: z.enum(["plan_created", "grid_saved", "area_typed", "plant_confirmed"], {
    errorMap: () => ({
      message: "Event type must be one of: plan_created, grid_saved, area_typed, plant_confirmed",
    }),
  }),

  // plan_id: opcjonalny UUID lub null; wymagany gdy zdarzenie dotyczy konkretnego planu
  plan_id: z
    .string()
    .uuid({ message: "Plan ID must be a valid UUID" })
    .nullable()
    .optional()
    .transform((val) => val ?? null),

  // attributes: opcjonalny obiekt JSON (dowolna zagnieżdżona struktura); domyślnie {}
  // Używamy z.any() dla Json, ponieważ Json jest bardzo złożonym typem rekurencyjnym
  attributes: z
    .any()
    .nullable()
    .optional()
    .transform((val): Json => (val ?? {}) as Json),
});

/**
 * Typ wynikowy walidacji (po transformacji)
 */
export type AnalyticsEventCreateInput = z.infer<typeof AnalyticsEventCreateSchema>;
