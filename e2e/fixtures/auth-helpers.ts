import { createClient } from "@supabase/supabase-js";

/**
 * Helper functions do zarządzania autentykacją w testach E2E
 */

/**
 * Pobiera Supabase Admin Client używając service_role key
 * Service role key ma pełne uprawnienia i może aktywować konta użytkowników
 *
 * UWAGA: Dla lokalnego Supabase, service_role key można uzyskać z:
 * `npx supabase status` - w output znajdziesz "service_role key"
 *
 * Możesz też ustawić zmienną środowiskową SUPABASE_SERVICE_ROLE_KEY w .env
 */
function getSupabaseAdminClient() {
  // Dla lokalnego Supabase domyślnie używamy localhost
  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

  // Service role key - można ustawić w .env lub użyć domyślnego dla lokalnego Supabase
  // Domyślny service_role key dla lokalnego Supabase (demo project)
  const defaultServiceRoleKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultServiceRoleKey;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Aktywuje konto użytkownika przez Supabase Admin API
 * To jest potrzebne, ponieważ Supabase wymaga weryfikacji email przed pierwszym logowaniem
 *
 * @param email - Email użytkownika do aktywacji
 * @returns Promise<boolean> - true jeśli aktywacja się powiodła
 */
export async function activateUserByEmail(email: string): Promise<boolean> {
  try {
    const adminClient = getSupabaseAdminClient();

    // Znajdź użytkownika po emailu
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      return false;
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return false;
    }

    // Aktywuj konto użytkownika
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Tworzy i aktywuje użytkownika testowego przez Admin API
 * Przydatne do tworzenia użytkowników bezpośrednio w testach
 *
 * @param email - Email użytkownika
 * @param password - Hasło użytkownika
 * @returns Promise<{ success: boolean; userId?: string; error?: string }>
 */
export async function createAndActivateTestUser(
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const adminClient = getSupabaseAdminClient();

    // Utwórz użytkownika przez Admin API
    const { data, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatycznie potwierdź email
    });

    if (createError) {
      return {
        success: false,
        error: createError.message,
      };
    }

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper do logowania użytkownika w testach E2E przez UI
 * Używa LoginPage do wykonania pełnego przepływu logowania
 * Automatycznie tworzy i aktywuje użytkownika, jeśli nie istnieje
 *
 * @param page - Playwright Page object
 * @param email - Email użytkownika
 * @param password - Hasło użytkownika
 * @param createIfNotExists - Czy tworzyć użytkownika, jeśli nie istnieje (domyślnie true)
 * @returns Promise<boolean> - true jeśli logowanie się powiodło
 */
export async function loginAsTestUser(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  createIfNotExists = true
): Promise<boolean> {
  try {
    // Dynamiczny import, aby uniknąć circular dependencies
    const { LoginPage } = await import("../pages/LoginPage");
    const { expect } = await import("@playwright/test");

    // Próba logowania - jeśli się nie powiedzie i createIfNotExists jest true, utworzymy użytkownika
    let loginSucceeded = false;

    // Najpierw próbujemy zalogować się
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Czekamy na pełne załadowanie formularza - wszystkie elementy muszą być widoczne
    await loginPage.waitForLoginFormToLoad();

    // Wypełnienie formularza logowania
    await loginPage.fillLoginForm(email, password);

    // Weryfikacja, że pola są wypełnione (upewniamy się, że React zaktualizował state)
    await expect(loginPage.emailInput).toHaveValue(email, { timeout: 5000 });
    await expect(loginPage.passwordInput).toHaveValue(password, { timeout: 5000 });

    // Czekamy na brak błędów walidacji (upewniamy się, że formularz jest gotowy)
    await expect(loginPage.emailError)
      .not.toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Ignoruj jeśli błąd nie jest widoczny (to jest OK)
      });
    await expect(loginPage.passwordError)
      .not.toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Ignoruj jeśli błąd nie jest widoczny (to jest OK)
      });

    // Upewniamy się, że przycisk jest aktywny
    await expect(loginPage.submitButton).toBeEnabled({ timeout: 5000 });

    // Oczekiwanie na odpowiedź API z timeoutem
    const loginResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
      { timeout: 15000 }
    );

    // Wysłanie formularza
    await loginPage.submitButton.click();

    // Czekamy na odpowiedź API
    const loginResponse = await loginResponsePromise;

    if (loginResponse.status() === 200) {
      // Oczekiwanie na przekierowanie po udanym logowaniu
      await page.waitForURL(/\/plans/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");

      // Weryfikacja, że jesteśmy na stronie planów
      loginSucceeded = page.url().includes("/plans");
    } else if (createIfNotExists && loginResponse.status() === 401) {
      // Jeśli logowanie się nie powiodło (401) i createIfNotExists jest true, utworzymy użytkownika
      const createResult = await createAndActivateTestUser(email, password);
      if (createResult.success) {
        // Ponowna próba logowania po utworzeniu użytkownika
        await loginPage.navigate();
        await loginPage.waitForLoginFormToLoad();
        await loginPage.fillLoginForm(email, password);

        const retryLoginResponsePromise = page.waitForResponse(
          (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
          { timeout: 15000 }
        );

        await loginPage.submitButton.click();
        const retryLoginResponse = await retryLoginResponsePromise;

        if (retryLoginResponse.status() === 200) {
          await page.waitForURL(/\/plans/, { timeout: 15000 });
          await page.waitForLoadState("networkidle");
          loginSucceeded = page.url().includes("/plans");
        }
      }
    }

    return loginSucceeded;
  } catch {
    // Jeśli wystąpił błąd (np. timeout na odpowiedź API) i createIfNotExists jest true,
    // spróbujmy utworzyć użytkownika i ponownie zalogować
    if (createIfNotExists) {
      try {
        // Sprawdźmy, czy użytkownik już istnieje - jeśli nie, utworzymy go
        const createResult = await createAndActivateTestUser(email, password);
        if (createResult.success) {
          // Rekurencyjne wywołanie z createIfNotExists=false, aby uniknąć nieskończonej pętli
          return await loginAsTestUser(page, email, password, false);
        }
      } catch {
        // Jeśli użytkownik już istnieje (błąd przy tworzeniu), spróbujmy ponownie zalogować
        // Może to być problem z timing'iem - spróbujmy jeszcze raz
        try {
          const { LoginPage } = await import("../pages/LoginPage");
          const loginPage = new LoginPage(page);
          await loginPage.navigate();
          await loginPage.waitForLoginFormToLoad();
          await loginPage.fillLoginForm(email, password);

          const retryResponsePromise = page.waitForResponse(
            (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
            { timeout: 15000 }
          );

          await loginPage.submitButton.click();
          const retryResponse = await retryResponsePromise;

          if (retryResponse.status() === 200) {
            await page.waitForURL(/\/plans/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");
            return page.url().includes("/plans");
          }
        } catch {
          // Ignoruj błędy przy ponownej próbie
        }
      }
    }
    return false;
  }
}
