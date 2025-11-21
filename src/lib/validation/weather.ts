/**
 * Weather API Validation Schemas
 *
 * Schematy walidacji Zod dla endpointów pogodowych.
 */

import { z } from "zod";

/**
 * Schema dla parametru plan_id w URL
 */
export const planIdParamSchema = z.string().uuid({
  message: "Invalid plan_id format",
});

/**
 * Schema dla body żądania POST /api/plans/:plan_id/weather/refresh
 */
export const weatherRefreshCommandSchema = z.object({
  force: z.boolean().optional().default(false),
});
