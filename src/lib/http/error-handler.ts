/**
 * Error Handler - Helper do logowania błędów API
 *
 * Funkcje pomocnicze do rejestrowania błędów w endpointach API
 * z odpowiednim kontekstem (endpoint, user_id, params, itp.)
 */

import { logError, type LogContext } from "@/lib/utils/logger";
import { GridChangeRequiresConfirmationError, PlantRemovalRequiresConfirmationError, ValidationError } from "./errors";
import {
  PlanNotFoundError,
  PlanMissingLocationError,
  UpstreamError,
  UpstreamTimeoutError,
  WeatherServiceError,
} from "./weather.errors";

/**
 * Kontekst błędu dla logowania
 */
export interface ErrorContext {
  endpoint: string; // np. "POST /api/plans/:plan_id/weather/refresh"
  method: string; // "GET" | "POST" | "PATCH" | "DELETE"
  user_id?: string; // UUID użytkownika
  params?: Record<string, unknown>; // Parametry endpointu (plan_id, x, y, itp.)
  request_id?: string; // Opcjonalny ID requestu (dla przyszłości)
}

/**
 * Loguje błąd API z odpowiednim kontekstem
 *
 * Parsuje różne typy błędów i loguje je z pełnym kontekstem:
 * - Custom error classes (ValidationError, PlanNotFoundError, itp.)
 * - Supabase errors (RLS, foreign key, itp.)
 * - Unknown errors (z stack trace)
 *
 * @param error - Błąd do zalogowania
 * @param context - Kontekst błędu (endpoint, method, user_id, params)
 */
export function logApiError(error: unknown, context: ErrorContext): void {
  const logContext: LogContext = {
    endpoint: context.endpoint,
    method: context.method,
    ...(context.user_id && { user_id: context.user_id }),
    ...(context.params && { params: context.params }),
    ...(context.request_id && { request_id: context.request_id }),
  };

  // Custom error classes z naszego kodu
  if (error instanceof ValidationError) {
    logError(`ValidationError: ${error.message}`, {
      ...logContext,
      error_code: "ValidationError",
      field: error.field,
    });
    return;
  }

  if (error instanceof GridChangeRequiresConfirmationError) {
    logError(`GridChangeRequiresConfirmationError: ${error.message}`, {
      ...logContext,
      error_code: "Conflict",
    });
    return;
  }

  if (error instanceof PlantRemovalRequiresConfirmationError) {
    logError(`PlantRemovalRequiresConfirmationError: ${error.message}`, {
      ...logContext,
      error_code: "Conflict",
      plant_count: error.plantCount,
    });
    return;
  }

  // Weather Service errors
  if (error instanceof PlanNotFoundError) {
    logError(`PlanNotFoundError: ${error.message}`, {
      ...logContext,
      error_code: "NotFound",
    });
    return;
  }

  if (error instanceof PlanMissingLocationError) {
    logError(`PlanMissingLocationError: ${error.message}`, {
      ...logContext,
      error_code: "UnprocessableEntity",
    });
    return;
  }

  if (error instanceof UpstreamTimeoutError) {
    logError(`UpstreamTimeoutError: ${error.message}`, {
      ...logContext,
      error_code: "UpstreamTimeout",
    });
    return;
  }

  if (error instanceof UpstreamError) {
    logError(`UpstreamError: ${error.message}`, {
      ...logContext,
      error_code: "UpstreamError",
      status_code: error.statusCode,
    });
    return;
  }

  if (error instanceof WeatherServiceError) {
    logError(`WeatherServiceError: ${error.message}`, {
      ...logContext,
      error_code: "WeatherServiceError",
    });
    return;
  }

  // Supabase errors
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const supabaseError = error as { code?: string; message?: string };
    const errorCode = supabaseError.code || "Unknown";
    const errorMessage = supabaseError.message || "Unknown error";

    // Mapowanie kodów błędów Supabase
    let mappedCode = "InternalError";
    if (errorCode === "23503") {
      mappedCode = "ForeignKeyViolation";
    } else if (errorCode === "23505") {
      mappedCode = "UniqueViolation";
    } else if (errorCode === "PGRST301" || errorCode === "42501") {
      mappedCode = "RLSViolation";
    }

    logError(`Supabase Error [${errorCode}]: ${errorMessage}`, {
      ...logContext,
      error_code: mappedCode,
      supabase_code: errorCode,
    });
    return;
  }

  // Unknown errors - loguj z stack trace
  if (error instanceof Error) {
    logError(`Unknown Error: ${error.message}`, {
      ...logContext,
      error_code: "UnknownError",
      stack: error.stack,
    });
    return;
  }

  // Fallback dla nieznanych typów błędów
  logError(`Unexpected error type: ${String(error)}`, {
    ...logContext,
    error_code: "UnexpectedError",
  });
}
