import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Ścieżki publiczne - dostępne bez logowania
const PUBLIC_PATHS = [
  // Strony autentykacji
  "/auth/login",
  "/auth/register",
  "/auth/register-success",
  "/auth/confirm",
  "/auth/forgot-password",
  "/auth/reset-password",
  // API autentykacji
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Utwórz server-side instance Supabase
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Ustaw supabase w locals dla późniejszego użycia w API routes
  locals.supabase = supabase;

  // Pomiń sprawdzanie autentykacji dla ścieżek publicznych
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Pomiń sprawdzanie dla zasobów statycznych
  if (url.pathname.startsWith("/_astro/") || url.pathname === "/favicon.ico" || url.pathname.startsWith("/assets/")) {
    return next();
  }

  // Pobierz sesję użytkownika
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Użytkownik zalogowany - ustaw dane w locals
    locals.user = {
      id: user.id,
      email: user.email || "",
    };
  } else if (!PUBLIC_PATHS.includes(url.pathname)) {
    // Użytkownik niezalogowany próbuje dostać się do chronionej strony
    // Przekieruj do logowania (po zalogowaniu zawsze idzie na /plans)
    return redirect("/auth/login");
  }

  return next();
});
