import type { APIRoute } from "astro";

import type { AuthResponse, ResetPasswordDto } from "../../../types.ts";
import { resetPasswordSchema } from "../../../lib/validation/auth.ts";
import { logError } from "../../../lib/utils/logger.ts";

export const prerender = false;

/**
 * POST /api/auth/reset-password
 * Ustawia nowe hasło użytkownika (po kliknięciu w link w emailu lub z profilu)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parsuj body żądania
    const body = await request.json();

    // Walidacja danych wejściowych
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const response: AuthResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: firstError.message,
          field: firstError.path[0] as "password" | "confirmPassword",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { password } = validationResult.data as ResetPasswordDto;

    // Sprawdź czy użytkownik ma aktywną sesję (z tokena w linku resetującym)
    const {
      data: { user },
    } = await locals.supabase.auth.getUser();

    if (!user) {
      const response: AuthResponse = {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Link resetujący wygasł lub jest nieprawidłowy. Spróbuj ponownie zresetować hasło.",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Zaktualizuj hasło użytkownika
    const { error } = await locals.supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      const response: AuthResponse = {
        success: false,
        error: {
          code: error.name || "AUTH_ERROR",
          message: "Nie udało się zresetować hasła. Spróbuj ponownie.",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Sukces - przekieruj na plans
    const response: AuthResponse = {
      success: true,
      redirectTo: "/plans",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError("Błąd podczas resetowania hasła", {
        endpoint: "POST /api/auth/reset-password",
        method: "POST",
        error: error.message,
        stack: error.stack,
      });
    } else {
      logError("Nieoczekiwany błąd podczas resetowania hasła", {
        endpoint: "POST /api/auth/reset-password",
        method: "POST",
        error: String(error),
      });
    }
    const response: AuthResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił błąd podczas resetowania hasła. Spróbuj ponownie później.",
      },
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
