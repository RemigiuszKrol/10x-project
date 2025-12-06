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
  try {
    // Utwórz server-side instance Supabase
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Ustaw supabase w locals dla późniejszego użycia w API routes
    locals.supabase = supabase;

    // Pomiń sprawdzanie dla zasobów statycznych
    if (url.pathname.startsWith("/_astro/") || url.pathname === "/favicon.ico" || url.pathname.startsWith("/assets/")) {
      return next();
    }

    // Pomiń sprawdzanie autentykacji dla ścieżek publicznych (ale sprawdź sesję dla ustawienia locals.user)
    if (PUBLIC_PATHS.includes(url.pathname)) {
      // Dla ścieżek publicznych, sprawdź sesję tylko jeśli potrzebna (np. dla przekierowania zalogowanych)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          locals.user = {
            id: user.id,
            email: user.email || "",
          };
        }
      } catch (error) {
        // Jeśli wystąpi błąd podczas sprawdzania użytkownika, kontynuuj bez ustawiania user
        // To pozwala na dostęp do publicznych ścieżek nawet jeśli Supabase nie działa
        console.error("Error checking user in middleware:", error);
      }
      return next();
    }

    // Dla strony głównej, sprawdź autentykację ale nie przekierowuj - pozwól index.astro obsłużyć przekierowanie
    if (url.pathname === "/") {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          locals.user = {
            id: user.id,
            email: user.email || "",
          };
        }
      } catch (error) {
        // Jeśli wystąpi błąd podczas sprawdzania użytkownika, kontynuuj bez ustawiania user
        console.error("Error checking user in middleware:", error);
      }
      return next();
    }

    // Dla pozostałych ścieżek - wymagana autentykacja
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Użytkownik zalogowany - ustaw dane w locals
        locals.user = {
          id: user.id,
          email: user.email || "",
        };
        return next();
      } else {
        // Użytkownik niezalogowany próbuje dostać się do chronionej strony
        // Przekieruj do logowania (po zalogowaniu zawsze idzie na /plans)
        return redirect("/auth/login");
      }
    } catch (error) {
      // Jeśli wystąpi błąd podczas sprawdzania autentykacji, przekieruj do logowania
      console.error("Error checking authentication in middleware:", error);
      return redirect("/auth/login");
    }
  } catch (error) {
    // Jeśli wystąpi błąd podczas tworzenia instancji Supabase (np. brak zmiennych środowiskowych)
    // Dla ścieżek publicznych, pozwól kontynuować (strona może wyświetlić błąd)
    if (PUBLIC_PATHS.includes(url.pathname)) {
      console.error("Error creating Supabase instance in middleware:", error);
      return next();
    }
    // Dla chronionych ścieżek, przekieruj do logowania
    console.error("Error creating Supabase instance in middleware:", error);
    return redirect("/auth/login");
  }
});
