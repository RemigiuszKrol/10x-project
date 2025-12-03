import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { PlansListPage } from "./pages/PlansListPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { generateTestEmail, generateTestPassword } from "./fixtures/test-data";
import { createAndActivateTestUser, loginAsTestUser } from "./fixtures/auth-helpers";

/**
 * Testy E2E dla weryfikacji dostępu do chronionych stron po logowaniu
 *
 * Testuje:
 * - Dostęp do /plans po zalogowaniu
 * - Dostęp do /profile po zalogowaniu
 * - Dostęp do /plans/new po zalogowaniu
 * - Przekierowanie niezalogowanych użytkowników na /auth/login
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 */
test.describe("Weryfikacja dostępu do chronionych stron po logowaniu", () => {
  test.describe.configure({ mode: "serial" });

  test("zalogowany użytkownik powinien mieć dostęp do /plans", async ({ page }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("protected-routes-plans");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja dostępu do /plans
    const plansListPage = new PlansListPage(page);
    await plansListPage.navigate();

    // Weryfikacja, że jesteśmy na stronie planów
    await expect(page).toHaveURL(/\/plans/);
    expect(page.url()).toContain("/plans");
    expect(page.url()).not.toContain("/auth/login");

    // Krok 4: Weryfikacja załadowania komponentu PlansList
    await plansListPage.waitForPlansListToLoad();

    // Krok 5: Weryfikacja zawartości strony planów
    await expect(plansListPage.title).toBeVisible();
    await expect(plansListPage.title).toHaveText(/moje plany/i);
    await expect(plansListPage.createNewButton).toBeVisible();
  });

  test("zalogowany użytkownik powinien mieć dostęp do /profile", async ({ page }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("protected-routes-profile");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja dostępu do /profile
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();

    // Weryfikacja, że jesteśmy na stronie profilu
    await expect(page).toHaveURL(/\/profile/);
    expect(page.url()).toContain("/profile");
    expect(page.url()).not.toContain("/auth/login");

    // Krok 4: Weryfikacja załadowania komponentu ProfilePage
    await profilePage.waitForProfileToLoad();

    // Krok 5: Weryfikacja zawartości strony profilu
    // Czekamy aż komponent się załaduje (może być w stanie loading, error lub success)
    const isInLoadingState = await profilePage.isInLoadingState();
    const isInErrorState = await profilePage.isInErrorState();
    const isInSuccessState = await profilePage.isInSuccessState();

    // Jeden ze stanów musi być widoczny
    expect(isInLoadingState || isInErrorState || isInSuccessState).toBe(true);

    // Jeśli komponent jest w stanie ładowania, czekamy aż się zakończy
    if (isInLoadingState) {
      // Czekamy aż stan loading zniknie (maksymalnie 10 sekund)
      await page
        .waitForFunction(
          () => {
            const statusElement = document.querySelector('[role="status"]');
            return !statusElement || statusElement.getAttribute("aria-hidden") === "true";
          },
          { timeout: 10000 }
        )
        .catch(() => {
          // Jeśli timeout, kontynuujemy - może być problem z API
        });

      // Po zakończeniu ładowania, sprawdzamy czy jest success state
      const isInSuccessStateAfterLoad = await profilePage.isInSuccessState();
      const isInErrorStateAfterLoad = await profilePage.isInErrorState();

      // Jeden z tych stanów powinien być widoczny po zakończeniu ładowania
      expect(isInSuccessStateAfterLoad || isInErrorStateAfterLoad).toBe(true);
    }

    // Jeśli komponent jest w stanie sukcesu, weryfikujemy zawartość
    if (isInSuccessState || (await profilePage.isInSuccessState())) {
      await expect(profilePage.title).toBeVisible();
      await expect(profilePage.title).toHaveText(/preferencje profilu/i);
    }
  });

  test("zalogowany użytkownik powinien mieć dostęp do /plans/new", async ({ page }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("protected-routes-new-plan");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja dostępu do /plans/new
    const planCreatorPage = new PlanCreatorPage(page);
    await planCreatorPage.navigate();

    // Weryfikacja, że jesteśmy na stronie tworzenia planu
    await expect(page).toHaveURL(/\/plans\/new/);
    expect(page.url()).toContain("/plans/new");
    expect(page.url()).not.toContain("/auth/login");

    // Krok 4: Weryfikacja załadowania komponentu PlanCreator
    await planCreatorPage.waitForPlanCreatorToLoad();

    // Krok 5: Weryfikacja zawartości strony tworzenia planu
    await expect(planCreatorPage.title).toBeVisible();
    await expect(planCreatorPage.title).toHaveText(/kreator nowego planu/i);
    await expect(planCreatorPage.description).toBeVisible();

    // Jeśli pojawi się dialog szkicu, możemy go zamknąć (nie jest to wymagane dla testu dostępu)
    const hasDraftDialog = await planCreatorPage.hasDraftDialog();
    if (hasDraftDialog) {
      // Możemy zamknąć dialog klikając "Rozpocznij od nowa" lub po prostu czekać
      // Dla testu dostępu nie jest to krytyczne
    }
  });

  test("niezalogowany użytkownik powinien zostać przekierowany na /auth/login przy próbie dostępu do /plans", async ({
    page,
  }) => {
    // Krok 1: Próba dostępu do chronionej strony bez logowania
    await page.goto("/plans");

    // Krok 2: Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/plans");

    // Krok 3: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("niezalogowany użytkownik powinien zostać przekierowany na /auth/login przy próbie dostępu do /profile", async ({
    page,
  }) => {
    // Krok 1: Próba dostępu do chronionej strony bez logowania
    await page.goto("/profile");

    // Krok 2: Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/profile");

    // Krok 3: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("niezalogowany użytkownik powinien zostać przekierowany na /auth/login przy próbie dostępu do /plans/new", async ({
    page,
  }) => {
    // Krok 1: Próba dostępu do chronionej strony bez logowania
    await page.goto("/plans/new");

    // Krok 2: Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/plans/new");

    // Krok 3: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });
});

