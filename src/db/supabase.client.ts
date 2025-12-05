import type { AstroCookies } from "astro";
import { createBrowserClient, createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "../db/database.types.ts";

// Client-side Supabase client (używany w komponentach React po stronie przeglądarki)
// Tworzymy lazy - tylko gdy jest wywoływany w przeglądarce
let _supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const getSupabaseClient = () => {
  if (!_supabaseClient) {
    const supabaseClientUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
    const supabaseClientAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;
    _supabaseClient = createBrowserClient<Database>(supabaseClientUrl, supabaseClientAnonKey);
  }
  return _supabaseClient;
};

// Typ dla Supabase Client używany w aplikacji
export type SupabaseClient = ReturnType<typeof createSupabaseServerInstance>;

// Opcje cookies dla Supabase Auth
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD, // tylko HTTPS w produkcji, HTTP OK w dev
  httpOnly: true,
  sameSite: "lax",
};

// Helper do parsowania nagłówka Cookie
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

// Server-side Supabase client (używany w API routes i SSR)
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  // Zmienne dla server-side
  const supabaseServerUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseServerAnonKey = import.meta.env.SUPABASE_KEY || import.meta.env.PUBLIC_SUPABASE_KEY;

  // Walidacja zmiennych środowiskowych
  if (!supabaseServerUrl || !supabaseServerAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_KEY (or PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY) in your environment variables."
    );
  }

  const supabase = createServerClient<Database>(supabaseServerUrl, supabaseServerAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        // Sprawdź czy cookies mogą być ustawione przed próbą
        // W Astro, cookies mogą być ustawione tylko przed wysłaniem odpowiedzi
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Sprawdź czy cookie już istnieje - jeśli tak, możemy spróbować go zaktualizować
            // Jeśli nie, ustaw nowy cookie tylko jeśli odpowiedź jeszcze nie została wysłana
            try {
              context.cookies.set(name, value, options);
            } catch (cookieError) {
              // Ignoruj błędy związane z już wysłaną odpowiedzią
              // To może się zdarzyć gdy Supabase próbuje odświeżyć tokeny asynchronicznie
              if (
                cookieError instanceof Error &&
                (cookieError.message.includes("already been sent") ||
                  cookieError.message.includes("cookies had already been sent"))
              ) {
                // Cicho zignoruj - tokeny będą odświeżone przy następnym żądaniu
                return;
              }
              // Re-throw innych błędów
              throw cookieError;
            }
          });
        } catch (error) {
          // Fallback dla błędów na poziomie forEach
          if (
            error instanceof Error &&
            (error.message.includes("already been sent") || error.message.includes("cookies had already been sent"))
          ) {
            // Cicho zignoruj
            return;
          }
          // Re-throw innych błędów
          throw error;
        }
      },
    },
  });

  return supabase;
};
