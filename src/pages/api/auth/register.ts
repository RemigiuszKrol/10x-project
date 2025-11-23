import type { APIRoute } from "astro";

import type { AuthResponse, RegisterDto } from "../../../types.ts";
import { registerSchema } from "../../../lib/validation/auth.ts";
import { logError } from "../../../lib/utils/logger.ts";

export const prerender = false;

/**
 * POST /api/auth/register
 * Rejestracja nowego użytkownika
 *
 * Po rejestracji Supabase wysyła email weryfikacyjny.
 * Użytkownik musi potwierdzić adres email przed pierwszym logowaniem.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parsuj body żądania
    const body = await request.json();

    // Walidacja danych wejściowych
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const response: AuthResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: firstError.message,
          field: firstError.path[0] as "email" | "password" | "confirmPassword",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { email, password } = validationResult.data as RegisterDto;

    // Próba rejestracji przez Supabase
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        // URL do którego Supabase przekieruje po kliknięciu w link w emailu
        emailRedirectTo: `${new URL(request.url).origin}/auth/confirm`,
      },
    });

    if (error) {
      // Mapowanie błędów Supabase na nasze AuthError
      let errorMessage = "Wystąpił błąd podczas rejestracji";
      let errorField: "email" | "password" | "confirmPassword" | undefined = undefined;

      // Mapowanie specyficznych błędów Supabase
      if (error.message.includes("User already registered")) {
        errorMessage = "Ten adres email jest już zarejestrowany";
        errorField = "email";
      } else if (error.message.includes("Password")) {
        errorMessage = "Hasło nie spełnia wymagań bezpieczeństwa";
        errorField = "password";
      } else if (error.message.includes("Email")) {
        errorMessage = "Nieprawidłowy adres email";
        errorField = "email";
      }

      const response: AuthResponse = {
        success: false,
        error: {
          code: error.name || "AUTH_ERROR",
          message: errorMessage,
          field: errorField,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Sprawdź czy użytkownik został utworzony
    if (!data.user) {
      const response: AuthResponse = {
        success: false,
        error: {
          code: "REGISTRATION_FAILED",
          message: "Nie udało się utworzyć konta. Spróbuj ponownie później.",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Profil jest tworzony automatycznie przez trigger bazy danych (handle_new_user)
    // Nie ma potrzeby ręcznego tworzenia profilu w kodzie aplikacji

    // Sukces - użytkownik został utworzony
    // Supabase automatycznie wysłał email weryfikacyjny
    const response: AuthResponse = {
      success: true,
      redirectTo: "/auth/register-success",
      data: {
        requiresEmailConfirmation: true,
        email: data.user.email,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      logError("Błąd podczas rejestracji", {
        endpoint: "POST /api/auth/register",
        method: "POST",
        error: error.message,
        stack: error.stack,
      });
    } else {
      logError("Nieoczekiwany błąd podczas rejestracji", {
        endpoint: "POST /api/auth/register",
        method: "POST",
        error: String(error),
      });
    }
    const response: AuthResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.",
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
