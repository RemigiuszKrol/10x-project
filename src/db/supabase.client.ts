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

  const supabase = createServerClient<Database>(supabaseServerUrl, supabaseServerAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
