import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { PlansListPage } from "./pages/PlansListPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { generateTestEmail, generateTestPassword } from "./fixtures/test-data";
import { createAndActivateTestUser, loginAsTestUser } from "./fixtures/auth-helpers";

/**
 * Testy E2E dla wylogowania użytkownika
 *
 * Testuje:
 * - Wylogowanie użytkownika przez Navbar (link "Wyloguj")
 * - Przekierowanie do strony logowania po wylogowaniu
 * - Brak dostępu do chronionych stron po wylogowaniu
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 */

test.describe("Wylogowanie użytkownika", () => {
  test.describe.configure({ mode: "serial" });

  test("zalogowany użytkownik powinien móc się wylogować przez Navbar i zostać przekierowany na stronę logowania", async ({
    page,
  }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("logout-test");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja, że użytkownik jest zalogowany (jesteśmy na /plans)
    await expect(page).toHaveURL(/\/plans/);
    expect(page.url()).toContain("/plans");

    // Krok 4: Weryfikacja, że Navbar jest widoczny i zawiera link wylogowania
    // Link "Wyloguj" jest widoczny jako tekst na większych ekranach lub jako ikona na mniejszych
    const logoutLink = page.getByRole("link", { name: /wyloguj/i });
    await expect(logoutLink).toBeVisible();

    // Krok 5: Weryfikacja, że link wylogowania ma poprawny href
    await expect(logoutLink).toHaveAttribute("href", "/api/auth/logout");

    // Krok 6: Oczekiwanie na request do endpointu logout i nawigację
    // Endpoint zwraca redirect (302), więc czekamy na request i następnie na nawigację
    const logoutRequestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/auth/logout") && request.method() === "GET"
    );

    // Krok 7: Kliknięcie linku wylogowania
    await logoutLink.click();

    // Krok 8: Czekamy na request do endpointu
    await logoutRequestPromise;

    // Krok 9: Weryfikacja przekierowania na stronę logowania
    // Endpoint zwraca redirect, więc czekamy na nawigację
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/plans");

    // Krok 10: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("po wylogowaniu użytkownik nie powinien mieć dostępu do chronionych stron - /plans", async ({
    page,
  }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("logout-protected-plans");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja, że użytkownik jest zalogowany
    await expect(page).toHaveURL(/\/plans/);

    // Krok 4: Wylogowanie użytkownika
    const logoutLink = page.getByRole("link", { name: /wyloguj/i });
    await expect(logoutLink).toBeVisible();

    const logoutRequestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/auth/logout") && request.method() === "GET"
    );

    await logoutLink.click();
    await logoutRequestPromise;

    // Krok 5: Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);

    // Krok 6: Próba dostępu do chronionej strony /plans
    await page.goto("/plans");

    // Krok 7: Weryfikacja przekierowania na stronę logowania (middleware powinien przekierować)
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/plans");

    // Krok 8: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("po wylogowaniu użytkownik nie powinien mieć dostępu do chronionych stron - /profile", async ({
    page,
  }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("logout-protected-profile");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja, że użytkownik jest zalogowany
    await expect(page).toHaveURL(/\/plans/);

    // Krok 4: Wylogowanie użytkownika
    const logoutLink = page.getByRole("link", { name: /wyloguj/i });
    await expect(logoutLink).toBeVisible();

    const logoutRequestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/auth/logout") && request.method() === "GET"
    );

    await logoutLink.click();
    await logoutRequestPromise;

    // Krok 5: Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);

    // Krok 6: Próba dostępu do chronionej strony /profile
    await page.goto("/profile");

    // Krok 7: Weryfikacja przekierowania na stronę logowania (middleware powinien przekierować)
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/profile");

    // Krok 8: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("po wylogowaniu użytkownik nie powinien mieć dostępu do chronionych stron - /plans/new", async ({
    page,
  }) => {
    // Krok 1: Przygotowanie użytkownika testowego
    const testEmail = generateTestEmail("logout-protected-new-plan");
    const testPassword = generateTestPassword();

    const userCreationResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(userCreationResult.success).toBe(true);
    expect(userCreationResult.userId).toBeDefined();

    // Krok 2: Logowanie użytkownika
    const loginSuccess = await loginAsTestUser(page, testEmail, testPassword);
    expect(loginSuccess).toBe(true);

    // Krok 3: Weryfikacja, że użytkownik jest zalogowany
    await expect(page).toHaveURL(/\/plans/);

    // Krok 4: Wylogowanie użytkownika
    const logoutLink = page.getByRole("link", { name: /wyloguj/i });
    await expect(logoutLink).toBeVisible();

    const logoutRequestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/auth/logout") && request.method() === "GET"
    );

    await logoutLink.click();
    await logoutRequestPromise;

    // Krok 5: Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);

    // Krok 6: Próba dostępu do chronionej strony /plans/new
    await page.goto("/plans/new");

    // Krok 7: Weryfikacja przekierowania na stronę logowania (middleware powinien przekierować)
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).not.toContain("/plans/new");

    // Krok 8: Weryfikacja, że formularz logowania jest widoczny
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });
});

