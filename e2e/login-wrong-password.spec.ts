import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { createAndActivateTestUser } from "./fixtures/auth-helpers";
import { generateTestEmail, generateTestPassword } from "./fixtures/test-data";

/**
 * Testy E2E dla logowania z niepoprawnym hasłem (błąd 401)
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 * 3. Baza danych jest gotowa do przyjmowania nowych użytkowników
 */

test.describe("Logowanie z niepoprawnym hasłem", () => {
  test("powinien wyświetlić błąd 401 przy logowaniu z niepoprawnym hasłem", async ({ page }) => {
    // Krok 1: Przygotowanie danych testowych
    // Utworzenie użytkownika testowego przez Admin API, aby mieć pewność, że istnieje w bazie
    const testEmail = generateTestEmail("login-wrong-password");
    const correctPassword = generateTestPassword();
    const wrongPassword = "WrongPassword123!";

    // Tworzymy użytkownika bezpośrednio przez Admin API (bez rejestracji przez UI)
    const createResult = await createAndActivateTestUser(testEmail, correctPassword);
    expect(createResult.success).toBe(true);

    // Krok 2: Nawigacja do strony logowania
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Weryfikacja, że formularz logowania jest widoczny
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.title).toBeVisible();
    await expect(loginPage.description).toBeVisible();

    // Weryfikacja, że jesteśmy na stronie logowania
    await expect(page).toHaveURL(/\/auth\/login/);

    // Krok 3: Wypełnienie formularza logowania
    // Wpisujemy poprawny email i niepoprawne hasło
    await loginPage.fillLoginForm(testEmail, wrongPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(loginPage.emailInput).toHaveValue(testEmail);
    await expect(loginPage.passwordInput).toHaveValue(wrongPassword);

    // Krok 4: Wysłanie formularza i oczekiwanie na odpowiedź API
    // Oczekujemy na odpowiedź API z błędem 401
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST"
    );

    await loginPage.submitButton.click();

    // Czekamy na odpowiedź API i weryfikujemy status HTTP
    const response = await responsePromise;
    expect(response.status()).toBe(401);

    // Weryfikacja, że odpowiedź zawiera komunikat błędu
    const responseBody = await response.json();
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBeDefined();
    expect(responseBody.error.message).toContain("Nieprawidłowy adres email lub hasło");

    // Krok 5: Weryfikacja pozostania na stronie logowania
    // Po błędzie użytkownik powinien pozostać na stronie logowania (brak przekierowania)
    await expect(page).toHaveURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");

    // Czekamy na zakończenie ładowania formularza (przycisk nie powinien być w stanie loading)
    await page.waitForLoadState("networkidle");

    // Krok 6: Weryfikacja wyświetlenia komunikatu błędu
    // FormError powinien wyświetlić komunikat błędu w div[role="alert"]
    await expect(loginPage.generalError).toBeVisible();
    await expect(loginPage.generalError).toContainText(/nieprawidłowy adres email lub hasło/i);
    await expect(loginPage.generalError).toHaveAttribute("role", "alert");

    // Krok 7: Weryfikacja stanu formularza po błędzie
    // Pola formularza powinny pozostać wypełnione (użytkownik może poprawić hasło)
    await expect(loginPage.emailInput).toHaveValue(testEmail);
    await expect(loginPage.passwordInput).toHaveValue(wrongPassword);

    // Przycisk submit nie powinien być disabled (można spróbować ponownie)
    await expect(loginPage.submitButton).toBeEnabled();
  });
});

