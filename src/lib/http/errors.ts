import type { ApiErrorResponse } from "@/types";

/**
 * Błąd rzucany gdy zmiana wymiarów siatki wymaga potwierdzenia użytkownika
 */
export class GridChangeRequiresConfirmationError extends Error {
  constructor(message = "Grid dimension changes require confirmation") {
    super(message);
    this.name = "GridChangeRequiresConfirmationError";
  }
}

/**
 * Błąd walidacji rzucany w serwisie (powinien być mapowany na 400 ValidationError w endpoincie)
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Tworzy standardową strukturę odpowiedzi błędu API
 * @param code - Kod błędu (ValidationError, Unauthorized, itp.)
 * @param message - Komunikat dla użytkownika
 * @param details - Opcjonalne szczegóły błędu (np. field_errors)
 * @returns Obiekt ApiErrorResponse
 */
export function errorResponse(
  code: ApiErrorResponse["error"]["code"],
  message: string,
  details?: ApiErrorResponse["error"]["details"]
): ApiErrorResponse {
  return { error: { code, message, details } };
}

/**
 * Tworzy Response z JSON i odpowiednim Content-Type
 * @param data - Dane do zwrócenia (mogą być ApiItemResponse, ApiListResponse lub ApiErrorResponse)
 * @param status - Kod statusu HTTP (domyślnie 200)
 * @returns Response z JSON i nagłówkiem Content-Type
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
