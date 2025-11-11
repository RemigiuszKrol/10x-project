import type { APIRoute } from "astro";

import type { AuthResponse } from "../../../types.ts";

export const prerender = false;

/**
 * POST /api/auth/logout
 * Wylogowanie użytkownika
 */
export const POST: APIRoute = async ({ locals, redirect }) => {
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
  } catch {
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
