import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { PlansListPage } from "./pages/PlansListPage";
import { generateTestEmail, generateTestPassword } from "./fixtures/test-data";
import { createAndActivateTestUser } from "./fixtures/auth-helpers";

/**
 * Testy E2E dla logowania z poprawnymi danymi i przekierowania na listę planów
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 */
test.describe("Logowanie i przekierowanie na listę planów", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien zalogować użytkownika z poprawnymi danymi i przekierować na /plans z wyświetleniem PlansList", async ({
    page,
  }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    // Utworzenie i aktywacja użytkownika przez Admin API
    // Używamy unikalnego emaila z timestamp, aby uniknąć konfliktów
    const testEmail = generateTestEmail("login-redirect");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Nawigacja do strony logowania
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Weryfikacja, że formularz logowania jest widoczny
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.title).toBeVisible();
    await expect(loginPage.description).toBeVisible();

    // Krok 3: Wypełnienie formularza logowania
    await loginPage.fillLoginForm(testEmail, testPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(loginPage.emailInput).toHaveValue(testEmail);
    await expect(loginPage.passwordInput).toHaveValue(testPassword);

    // Krok 4: Wysłanie formularza logowania
    // Oczekujemy na odpowiedź API przed sprawdzaniem przekierowania
    const loginResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST"
    );

    await loginPage.submitButton.click();

    // Czekamy na odpowiedź API i weryfikujemy status
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);

    // Krok 5: Oczekiwanie na przekierowanie po udanym logowaniu
    // Po udanym logowaniu użytkownik powinien zostać przekierowany na /plans
    await page.waitForURL(/\/plans/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Weryfikacja przekierowania na stronę planów
    // Sprawdzamy, że URL zawiera /plans
    await expect(page).toHaveURL(/\/plans/);
    expect(page.url()).toContain("/plans");
    expect(page.url()).not.toContain("/auth/login");

    // Krok 6: Weryfikacja załadowania komponentu PlansList
    const plansListPage = new PlansListPage(page);
    await plansListPage.waitForPlansListToLoad();

    // Krok 7: Weryfikacja zawartości strony planów
    // Sprawdzamy, że nagłówek "Moje plany" jest widoczny
    await expect(plansListPage.title).toBeVisible();
    await expect(plansListPage.title).toHaveText(/moje plany/i);

    // Sprawdzamy, że przycisk "Nowy plan" jest widoczny
    await expect(plansListPage.createNewButton).toBeVisible();
    await expect(plansListPage.createNewButton).toHaveText(/nowy plan/i);

    // Sprawdzamy, że opis strony jest widoczny
    await expect(plansListPage.description).toBeVisible();

    // Krok 8: Weryfikacja stanu komponentu PlansList
    // Komponent może być w jednym z trzech stanów:
    // - loading (dane się ładują)
    // - empty (brak planów)
    // - success (są plany)
    // Sprawdzamy, że przynajmniej jeden z tych stanów jest widoczny

    const isInLoadingState = await plansListPage.isInLoadingState();
    const isInEmptyState = await plansListPage.isInEmptyState();
    const hasPlansTable = await plansListPage.hasPlansTable();

    // Jeden ze stanów musi być widoczny
    expect(isInLoadingState || isInEmptyState || hasPlansTable).toBe(true);

    // Jeśli komponent jest w stanie ładowania, czekamy aż się zakończy
    if (isInLoadingState) {
      // Czekamy aż stan loading zniknie (maksymalnie 10 sekund)
      await page
        .waitForFunction(
          () => {
            const statusElement = document.querySelector('[role="status"][aria-label*="Ładowanie planów"]');
            return !statusElement || statusElement.getAttribute("aria-hidden") === "true";
          },
          { timeout: 10000 }
        )
        .catch(() => {
          // Jeśli timeout, kontynuujemy - może być problem z API
        });

      // Po zakończeniu ładowania, sprawdzamy czy jest empty state lub plans table
      const isInEmptyStateAfterLoad = await plansListPage.isInEmptyState();
      const hasPlansTableAfterLoad = await plansListPage.hasPlansTable();

      // Jeden z tych stanów powinien być widoczny po zakończeniu ładowania
      expect(isInEmptyStateAfterLoad || hasPlansTableAfterLoad).toBe(true);
    }

    // Krok 9: Weryfikacja, że użytkownik jest zalogowany
    // Sprawdzamy, że nie jesteśmy na stronie logowania
    expect(page.url()).not.toContain("/auth/login");
    // Sprawdzamy, że jesteśmy na stronie planów
    expect(page.url()).toContain("/plans");
  });
});

