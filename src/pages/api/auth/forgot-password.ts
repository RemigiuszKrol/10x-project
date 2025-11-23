import type { APIRoute } from "astro";

import type { AuthResponse, ForgotPasswordDto } from "../../../types.ts";
import { forgotPasswordSchema } from "../../../lib/validation/auth.ts";
import { logError } from "../../../lib/utils/logger.ts";

export const prerender = false;

/**
 * POST /api/auth/forgot-password
 * Wysyła link do resetowania hasła na podany adres email
 *
 * UWAGA: Supabase wyśle email z linkiem do resetowania hasła.
 * Link przekieruje użytkownika do /auth/reset-password, gdzie będzie mógł ustawić nowe hasło.
 * Token resetowania będzie zawarty w URL jako fragment (#access_token=...).
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    // Parsuj body żądania
    const body = await request.json();

    // Walidacja danych wejściowych
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const response: AuthResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: firstError.message,
          field: "email",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { email } = validationResult.data as ForgotPasswordDto;

    // Konstruuj URL do strony resetowania hasła
    const origin = url.origin;
    const resetPasswordUrl = `${origin}/auth/reset-password`;

    // Wyślij email z linkiem do resetowania hasła
    await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordUrl,
    });

    // UWAGA: Ze względów bezpieczeństwa, zawsze zwracamy sukces,
    // nawet jeśli email nie istnieje w systemie.
    // To zapobiega wyciekowi informacji o tym, które adresy email są zarejestrowane.
    const response: AuthResponse = {
      success: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError("Błąd podczas wysyłania linku resetującego hasło", {
        endpoint: "POST /api/auth/forgot-password",
        method: "POST",
        error: error.message,
        stack: error.stack,
      });
    } else {
      logError("Nieoczekiwany błąd podczas wysyłania linku resetującego hasło", {
        endpoint: "POST /api/auth/forgot-password",
        method: "POST",
        error: String(error),
      });
    }
    const response: AuthResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił błąd podczas wysyłania linku resetującego. Spróbuj ponownie później.",
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
