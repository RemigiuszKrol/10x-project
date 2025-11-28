import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleApiError, createApiError, parseHttpError } from "@/lib/utils/toast-error-handler";
import type { ApiErrorResponse } from "@/types";
import * as toastModule from "sonner";
import * as apiErrorMapperModule from "@/lib/utils/api-error-mapper";
import * as loggerModule from "@/lib/utils/logger";

// Mock zewnętrznych zależności
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/utils/api-error-mapper", () => ({
  createErrorMessage: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("toast-error-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createApiError", () => {
    it("powinien utworzyć Error z message zawierającym JSON ApiErrorResponse", () => {
      // Arrange
      const apiError: ApiErrorResponse = {
        error: {
          code: "ValidationError",
          message: "Invalid input",
        },
      };

      // Act
      const error = createApiError(apiError);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(JSON.stringify(apiError));
    });

    it("powinien utworzyć Error z pełnym ApiErrorResponse z details", () => {
      // Arrange
      const apiError: ApiErrorResponse = {
        error: {
          code: "ValidationError",
          message: "Validation failed",
          details: {
            field_errors: {
              name: "Name is required",
              email: "Invalid email format",
            },
          },
        },
      };

      // Act
      const error = createApiError(apiError);

      // Assert
      expect(error).toBeInstanceOf(Error);
      const parsed = JSON.parse(error.message) as ApiErrorResponse;
      expect(parsed.error.code).toBe("ValidationError");
      expect(parsed.error.details?.field_errors).toEqual({
        name: "Name is required",
        email: "Invalid email format",
      });
    });
  });

  describe("parseHttpError", () => {
    it("powinien zwrócić null dla sukcesu (response.ok = true)", async () => {
      // Arrange
      const response = new Response(JSON.stringify({ data: "success" }), {
        status: 200,
        statusText: "OK",
      });

      // Act
      const result = await parseHttpError(response);

      // Assert
      expect(result).toBeNull();
    });

    it("powinien zwrócić Error z ApiErrorResponse dla błędu z JSON", async () => {
      // Arrange
      const apiError: ApiErrorResponse = {
        error: {
          code: "NotFound",
          message: "Resource not found",
        },
      };
      const response = new Response(JSON.stringify(apiError), {
        status: 404,
        statusText: "Not Found",
      });

      // Act
      const error = await parseHttpError(response);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeNull();
      if (error) {
        const parsed = JSON.parse(error.message) as ApiErrorResponse;
        expect(parsed.error.code).toBe("NotFound");
        expect(parsed.error.message).toBe("Resource not found");
      }
    });

    it("powinien zwrócić Error z ApiErrorResponse z field_errors", async () => {
      // Arrange
      const apiError: ApiErrorResponse = {
        error: {
          code: "ValidationError",
          message: "Validation failed",
          details: {
            field_errors: {
              name: "Name is required",
            },
          },
        },
      };
      const response = new Response(JSON.stringify(apiError), {
        status: 400,
        statusText: "Bad Request",
      });

      // Act
      const error = await parseHttpError(response);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeNull();
      if (error) {
        const parsed = JSON.parse(error.message) as ApiErrorResponse;
        expect(parsed.error.details?.field_errors).toEqual({
          name: "Name is required",
        });
      }
    });

    it("powinien zwrócić ogólny Error gdy nie można sparsować JSON", async () => {
      // Arrange
      const response = new Response("Invalid JSON response", {
        status: 500,
        statusText: "Internal Server Error",
      });

      // Act
      const error = await parseHttpError(response);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeNull();
      if (error) {
        expect(error.message).toBe("HTTP 500: Internal Server Error");
      }
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        "Błąd podczas parsowania odpowiedzi błędu HTTP",
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it("powinien zwrócić ogólny Error dla nieoczekiwanego błędu parsowania", async () => {
      // Arrange
      // Symulujemy błąd parsowania przez rzucenie wyjątku w response.json()
      const response = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn().mockRejectedValue(new Error("Unexpected error")),
      } as unknown as Response;

      // Act
      const error = await parseHttpError(response);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeNull();
      if (error) {
        expect(error.message).toBe("HTTP 500: Internal Server Error");
      }
      expect(loggerModule.logger.error).toHaveBeenCalled();
    });
  });

  describe("handleApiError", () => {
    describe("Parsowanie błędów - różne formaty", () => {
      it("powinien obsłużyć ApiErrorResponse bezpośrednio", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Invalid input",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Błędy walidacji",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(apiErrorMapperModule.createErrorMessage).toHaveBeenCalledWith(
          "ValidationError",
          "Invalid input",
          undefined
        );
        expect(toastModule.toast.error).toHaveBeenCalledWith("Błędy walidacji", {});
      });

      it("powinien sparsować Error z message zawierającym JSON ApiErrorResponse", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "NotFound",
            message: "Resource not found",
          },
        };
        const error = new Error(JSON.stringify(apiError));
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Nie znaleziono zasobu",
        });

        // Act
        handleApiError(error);

        // Assert
        expect(apiErrorMapperModule.createErrorMessage).toHaveBeenCalledWith(
          "NotFound",
          "Resource not found",
          undefined
        );
        expect(toastModule.toast.error).toHaveBeenCalledWith("Nie znaleziono zasobu", {});
      });

      it("powinien sparsować string zawierający JSON ApiErrorResponse", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "Forbidden",
            message: "Access denied",
          },
        };
        const errorString = JSON.stringify(apiError);
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Brak uprawnień",
        });

        // Act
        handleApiError(errorString);

        // Assert
        expect(apiErrorMapperModule.createErrorMessage).toHaveBeenCalledWith("Forbidden", "Access denied", undefined);
        expect(toastModule.toast.error).toHaveBeenCalledWith("Brak uprawnień", {});
      });

      it("powinien obsłużyć Error z message nie będącym JSON", () => {
        // Arrange
        const error = new Error("Network fetch failed");

        // Act
        handleApiError(error);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Brak połączenia z serwerem", {
          description: "Sprawdź połączenie internetowe i spróbuj ponownie.",
        });
        expect(apiErrorMapperModule.createErrorMessage).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć Error z message zawierającym 'network'", () => {
        // Arrange
        const error = new Error("Network error occurred");

        // Act
        handleApiError(error);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Brak połączenia z serwerem", {
          description: "Sprawdź połączenie internetowe i spróbuj ponownie.",
        });
      });

      it("powinien obsłużyć unknown error (nie Error, nie string, nie ApiErrorResponse)", () => {
        // Arrange
        const error = { some: "object" };

        // Act
        handleApiError(error);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił nieoczekiwany błąd", {
          description: "[object Object]",
        });
      });

      it("powinien obsłużyć null", () => {
        // Act
        handleApiError(null);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił nieoczekiwany błąd", {
          description: "null",
        });
      });

      it("powinien obsłużyć undefined", () => {
        // Act
        handleApiError(undefined);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił nieoczekiwany błąd", {
          description: "undefined",
        });
      });
    });

    describe("Opcje obsługi błędów", () => {
      it("powinien pominąć toast gdy skipToast = true", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Invalid input",
          },
        };

        // Act
        handleApiError(apiError, { skipToast: true });

        // Assert
        expect(toastModule.toast.error).not.toHaveBeenCalled();
        expect(apiErrorMapperModule.createErrorMessage).not.toHaveBeenCalled();
      });

      it("powinien użyć customMessage zamiast domyślnego komunikatu", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "NotFound",
            message: "Resource not found",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Custom error message",
        });

        // Act
        handleApiError(apiError, { customMessage: "Custom error message" });

        // Assert
        expect(apiErrorMapperModule.createErrorMessage).toHaveBeenCalledWith(
          "NotFound",
          "Custom error message",
          undefined
        );
        expect(toastModule.toast.error).toHaveBeenCalledWith("Custom error message", {});
      });

      it("powinien wywołać onError callback przed wyświetleniem toastu", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Invalid input",
          },
        };
        const onErrorCallback = vi.fn();
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Błędy walidacji",
        });

        // Act
        handleApiError(apiError, { onError: onErrorCallback });

        // Assert
        expect(onErrorCallback).toHaveBeenCalledWith(apiError);
        expect(onErrorCallback).toHaveBeenCalled();
        expect(toastModule.toast.error).toHaveBeenCalled();
        // Sprawdź kolejność wywołań - onError powinien być wywołany przed toast.error
        const onErrorCallOrder = onErrorCallback.mock.invocationCallOrder[0];
        const toastCallOrder = vi.mocked(toastModule.toast.error).mock.invocationCallOrder[0];
        if (onErrorCallOrder !== undefined && toastCallOrder !== undefined) {
          expect(onErrorCallOrder).toBeLessThan(toastCallOrder);
        }
      });

      it("powinien pominąć toast gdy skipToast = true i onError jest zdefiniowany", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Invalid input",
          },
        };
        const onErrorCallback = vi.fn();

        // Act
        handleApiError(apiError, { skipToast: true, onError: onErrorCallback });

        // Assert
        expect(onErrorCallback).toHaveBeenCalledWith(apiError);
        expect(toastModule.toast.error).not.toHaveBeenCalled();
      });
    });

    describe("Obsługa specjalnych kodów błędów", () => {
      it("powinien obsłużyć Unauthorized z odpowiednim komunikatem", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "Unauthorized",
            message: "Session expired",
          },
        };

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Sesja wygasła", {
          description: "Zostaniesz przekierowany do strony logowania.",
        });
        expect(apiErrorMapperModule.createErrorMessage).not.toHaveBeenCalled();
      });

      it("powinien pominąć toast dla Unauthorized gdy skipToast = true", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "Unauthorized",
            message: "Session expired",
          },
        };

        // Act
        handleApiError(apiError, { skipToast: true });

        // Assert
        expect(toastModule.toast.error).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć ValidationError z field_errors", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Validation failed",
            details: {
              field_errors: {
                name: "Name is required",
                email: "Invalid email format",
              },
            },
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Błędy walidacji",
          description: "Name: Name is required\nEmail: Invalid email format",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(apiErrorMapperModule.createErrorMessage).toHaveBeenCalledWith("ValidationError", "Validation failed", {
          name: "Name is required",
          email: "Invalid email format",
        });
        expect(toastModule.toast.error).toHaveBeenCalledWith("Błędy walidacji", {
          description: "Name: Name is required\nEmail: Invalid email format",
        });
      });

      it("powinien obsłużyć ValidationError bez field_errors", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Invalid input",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Nieprawidłowe dane wejściowe",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(apiErrorMapperModule.createErrorMessage).toHaveBeenCalledWith(
          "ValidationError",
          "Invalid input",
          undefined
        );
        expect(toastModule.toast.error).toHaveBeenCalledWith("Nieprawidłowe dane wejściowe", {});
      });

      it("powinien obsłużyć NotFound", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "NotFound",
            message: "Resource not found",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Nie znaleziono zasobu",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Nie znaleziono zasobu", {});
      });

      it("powinien obsłużyć Conflict", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "Conflict",
            message: "Conflict occurred",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Wystąpił konflikt",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił konflikt", {});
      });

      it("powinien obsłużyć InternalError", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "InternalError",
            message: "Internal server error",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Wystąpił błąd serwera",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił błąd serwera", {});
      });

      it("powinien obsłużyć RateLimited", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "RateLimited",
            message: "Too many requests",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Zbyt wiele zapytań",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Zbyt wiele zapytań", {});
      });

      it("powinien obsłużyć UpstreamTimeout", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "UpstreamTimeout",
            message: "Upstream service timeout",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Serwis zewnętrzny nie odpowiada",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Serwis zewnętrzny nie odpowiada", {});
      });

      it("powinien obsłużyć Forbidden", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "Forbidden",
            message: "Access forbidden",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Brak uprawnień",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Brak uprawnień", {});
      });

      it("powinien obsłużyć UnprocessableEntity", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "UnprocessableEntity",
            message: "Cannot process request",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Nie można przetworzyć żądania",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Nie można przetworzyć żądania", {});
      });
    });

    describe("Obsługa błędów bez opisu", () => {
      it("powinien wyświetlić toast bez description gdy createErrorMessage nie zwraca description", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "NotFound",
            message: "Resource not found",
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Nie znaleziono zasobu",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Nie znaleziono zasobu", {});
      });

      it("powinien wyświetlić toast z description gdy createErrorMessage zwraca description", () => {
        // Arrange
        const apiError: ApiErrorResponse = {
          error: {
            code: "ValidationError",
            message: "Validation failed",
            details: {
              field_errors: {
                name: "Name is required",
              },
            },
          },
        };
        vi.mocked(apiErrorMapperModule.createErrorMessage).mockReturnValue({
          title: "Błędy walidacji",
          description: "Name: Name is required",
        });

        // Act
        handleApiError(apiError);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Błędy walidacji", {
          description: "Name: Name is required",
        });
      });
    });

    describe("Edge cases - nieprawidłowe formaty JSON", () => {
      it("powinien obsłużyć Error z message zawierającym nieprawidłowy JSON", () => {
        // Arrange
        const error = new Error('{"invalid": json}');

        // Act
        handleApiError(error);

        // Assert
        // Powinien być obsłużony jako błąd sieciowy lub unknown
        expect(toastModule.toast.error).toHaveBeenCalled();
        expect(apiErrorMapperModule.createErrorMessage).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć string z nieprawidłowym JSON", () => {
        // Arrange
        const errorString = '{"invalid": json}';

        // Act
        handleApiError(errorString);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił nieoczekiwany błąd", {
          description: errorString,
        });
      });

      it("powinien obsłużyć Error z message zawierającym JSON bez pola 'error'", () => {
        // Arrange
        const error = new Error('{"some": "data"}');

        // Act
        handleApiError(error);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalled();
        expect(apiErrorMapperModule.createErrorMessage).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć object z polem 'error' ale nie będący ApiErrorResponse", () => {
        // Arrange
        const error = { error: "not an object" };

        // Act
        handleApiError(error);

        // Assert
        expect(toastModule.toast.error).toHaveBeenCalledWith("Wystąpił nieoczekiwany błąd", {
          description: "[object Object]",
        });
      });
    });
  });
});
