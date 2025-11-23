import type { APIRoute } from "astro";

import type { AuthResponse } from "../../../types.ts";
import { logError } from "../../../lib/utils/logger.ts";

export const prerender = false;

/**
 * Wylogowanie użytkownika
 * Obsługuje GET i POST
 */
const handleLogout = async ({ locals, redirect }: Parameters<APIRoute>[0]) => {
  try {
    // Wylogowanie przez Supabase
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      const response: AuthResponse = {
        success: false,
        error: {
          code: "LOGOUT_ERROR",
          message: "Wystąpił błąd podczas wylogowania",
        },
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Sukces - przekieruj do strony logowania
    return redirect("/auth/login");
  } catch (error) {
    if (error instanceof Error) {
      logError("Błąd podczas wylogowania", {
        endpoint: "GET/POST /api/auth/logout",
        method: "GET/POST",
        error: error.message,
        stack: error.stack,
      });
    } else {
      logError("Nieoczekiwany błąd podczas wylogowania", {
        endpoint: "GET/POST /api/auth/logout",
        method: "GET/POST",
        error: String(error),
      });
    }
    const response: AuthResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił błąd podczas wylogowania",
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

/**
 * GET /api/auth/logout
 * Wylogowanie użytkownika (link z nawigacji)
 */
export const GET: APIRoute = handleLogout;

/**
 * POST /api/auth/logout
 * Wylogowanie użytkownika (programatyczne)
 */
export const POST: APIRoute = handleLogout;
