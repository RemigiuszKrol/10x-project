import type { APIRoute } from "astro";
import { z } from "zod";

import type { AuthResponse, LoginDto } from "../../../types.ts";
import { loginSchema } from "../../../lib/validation/auth.ts";

export const prerender = false;

/**
 * POST /api/auth/login
 * Logowanie użytkownika
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parsuj body żądania
    const body = await request.json();

    // Walidacja danych wejściowych
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const response: AuthResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: firstError.message,
          field: firstError.path[0] as "email" | "password",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { email, password } = validationResult.data as LoginDto;

    // Próba zalogowania przez Supabase
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Mapowanie błędów Supabase na nasze AuthError
      const response: AuthResponse = {
        success: false,
        error: {
          code: error.name || "AUTH_ERROR",
          // Ogólny komunikat dla bezpieczeństwa - nie ujawniamy czy email istnieje
          message: "Nieprawidłowy adres email lub hasło",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Sukces - zwracamy odpowiedź z redirectTo
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
    // Błąd serwera
    console.error("Login error:", error);

    const response: AuthResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił błąd podczas logowania. Spróbuj ponownie później.",
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
