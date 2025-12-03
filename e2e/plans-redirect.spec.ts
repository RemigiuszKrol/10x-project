import { test, expect } from "@playwright/test";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Testy E2E dla weryfikacji przekierowania na listę planów po logowaniu
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 * 3. Masz użytkownika testowego w bazie
 */

test.describe("Przekierowanie na listę planów po logowaniu", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien przekierować użytkownika na /plans i wyświetlić PlansList po udanym logowaniu", async ({
    page,
  }) => {
    // Krok 1: Przygotowanie - logowanie użytkownika
    const loginSuccess = await loginAsTestUser(
      page,
      TEST_USERS.valid.email,
      TEST_USERS.valid.password
    );
    expect(loginSuccess).toBe(true);

    // Krok 2: Oczekiwanie na przekierowanie po udanym logowaniu
    // Po udanym logowaniu użytkownik powinien zostać przekierowany na /plans
    await page.waitForURL(/\/plans/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Krok 3: Weryfikacja przekierowania na stronę planów
    // Sprawdzamy, że URL zawiera /plans
    await expect(page).toHaveURL(/\/plans/);
    expect(page.url()).toContain("/plans");
    expect(page.url()).not.toContain("/auth/login");

    // Krok 4: Weryfikacja załadowania komponentu PlansList
    const plansListPage = new PlansListPage(page);
    await plansListPage.waitForPlansListToLoad();

    // Krok 5: Weryfikacja zawartości strony planów
    // Sprawdzamy, że nagłówek "Moje plany" jest widoczny
    await expect(plansListPage.title).toBeVisible();
    await expect(plansListPage.title).toHaveText(/moje plany/i);

    // Sprawdzamy, że przycisk "Nowy plan" jest widoczny
    await expect(plansListPage.createNewButton).toBeVisible();
    await expect(plansListPage.createNewButton).toHaveText(/nowy plan/i);

    // Sprawdzamy, że opis strony jest widoczny
    await expect(plansListPage.description).toBeVisible();

    // Krok 6: Weryfikacja stanu komponentu PlansList
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
      await page.waitForFunction(
        () => {
          const statusElement = document.querySelector('[role="status"][aria-label*="Ładowanie planów"]');
          return !statusElement || statusElement.getAttribute("aria-hidden") === "true";
        },
        { timeout: 10000 }
      ).catch(() => {
        // Jeśli timeout, kontynuujemy - może być problem z API
      });

      // Po zakończeniu ładowania, sprawdzamy czy jest empty state lub plans table
      const isInEmptyStateAfterLoad = await plansListPage.isInEmptyState();
      const hasPlansTableAfterLoad = await plansListPage.hasPlansTable();

      // Jeden z tych stanów powinien być widoczny po zakończeniu ładowania
      expect(isInEmptyStateAfterLoad || hasPlansTableAfterLoad).toBe(true);
    }

    // Krok 7: Weryfikacja, że użytkownik jest zalogowany
    // Sprawdzamy, że nie jesteśmy na stronie logowania
    expect(page.url()).not.toContain("/auth/login");
    // Sprawdzamy, że jesteśmy na stronie planów
    expect(page.url()).toContain("/plans");
  });
});

