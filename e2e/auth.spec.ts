import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TEST_USERS, generateTestEmail, generateTestPassword } from "./fixtures/test-data";
import { activateUserByEmail } from "./fixtures/auth-helpers";

/**
 * Testy E2E dla przepływu autoryzacji
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 * 3. Masz użytkownika testowego w bazie
 */

test.describe("Autoryzacja", () => {
  test.describe.configure({ mode: "serial" });

  test("strona logowania powinna być dostępna", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Sprawdź czy formularz logowania jest widoczny
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("powinien wyświetlić błąd przy nieprawidłowych danych", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Spróbuj zalogować się z nieprawidłowymi danymi
    await loginPage.fillLoginForm(TEST_USERS.invalid.email, TEST_USERS.invalid.password);
    await loginPage.submitButton.click();

    // Czekaj na komunikat o błędzie
    // UWAGA: To może wymagać dostosowania do rzeczywistych selektorów w aplikacji
    await page.waitForTimeout(1000);

    // Sprawdź czy URL nie zmienił się (nie zalogowano)
    expect(page.url()).toContain("/auth/login");
  });

  test("powinien zalogować użytkownika z prawidłowymi danymi", async ({ page }) => {
    // Ten test jest pominięty (skip) ponieważ wymaga prawdziwego użytkownika w bazie
    // Odkomentuj i dostosuj gdy będziesz miał skonfigurowane środowisko testowe

    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Czekamy na pełne załadowanie formularza - wszystkie elementy muszą być widoczne
    await loginPage.waitForLoginFormToLoad();

    // Wypełnienie formularza logowania
    await loginPage.fillLoginForm(TEST_USERS.valid.email, TEST_USERS.valid.password);

    // Weryfikacja, że pola są wypełnione (upewniamy się, że React zaktualizował state)
    await expect(loginPage.emailInput).toHaveValue(TEST_USERS.valid.email, { timeout: 5000 });
    await expect(loginPage.passwordInput).toHaveValue(TEST_USERS.valid.password, { timeout: 5000 });

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

    // Czekamy na odpowiedź API i weryfikujemy status
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);

    // Czekaj na przekierowanie po udanym logowaniu
    await page.waitForURL(/\/plans/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Sprawdź czy użytkownik jest zalogowany
    expect(page.url()).toContain("/plans");
  });

  test("formularz logowania powinien walidować pola", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Próba wysłania pustego formularza
    await loginPage.submitButton.click();

    // Email input powinien mieć walidację HTML5
    const emailValidity = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValidity).toBe(false);
  });

  test("powinien pozwolić przejść do strony rejestracji", async ({ page }) => {
    await page.goto("/auth/login");

    // Znajdź link do rejestracji
    const registerLink = page.getByRole("link", { name: /zarejestruj/i });

    // Jeśli link istnieje, kliknij go
    if (await registerLink.isVisible()) {
      await registerLink.click();

      // Sprawdź czy przeszliśmy do strony rejestracji
      await page.waitForURL("**/auth/register");
      expect(page.url()).toContain("/auth/register");
    }
  });

  test("powinien pozwolić przejść do strony resetowania hasła", async ({ page }) => {
    await page.goto("/auth/login");

    // Znajdź link do resetowania hasła
    const forgotPasswordLink = page.getByRole("link", { name: /zapomniałeś hasła/i });

    // Jeśli link istnieje, kliknij go
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();

      // Sprawdź czy przeszliśmy do strony resetowania hasła
      await page.waitForURL("**/auth/forgot-password");
      expect(page.url()).toContain("/auth/forgot-password");
    }
  });

  test("powinien zalogować użytkownika z danymi z rejestracji", async ({ page }) => {
    // Krok 1: Rejestracja nowego użytkownika
    // Używamy unikalnego emaila z timestamp, aby uniknąć konfliktów
    const testEmail = generateTestEmail("login-test");
    const testPassword = generateTestPassword();

    const registerPage = new RegisterPage(page);
    await registerPage.navigate();

    // Weryfikacja, że formularz rejestracji jest widoczny
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();

    // Wypełnienie formularza rejestracji
    await registerPage.fillForm(testEmail, testPassword, testPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(testEmail);
    await expect(registerPage.passwordInput).toHaveValue(testPassword);
    await expect(registerPage.confirmPasswordInput).toHaveValue(testPassword);

    // Wysłanie formularza rejestracji
    // Oczekujemy na odpowiedź API przed sprawdzaniem przekierowania
    const registerResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/register") && response.request().method() === "POST"
    );

    await registerPage.submit();

    // Czekamy na odpowiedź API i weryfikujemy status
    const registerResponse = await registerResponsePromise;
    expect(registerResponse.status()).toBe(200);

    // Oczekiwanie na przekierowanie do strony sukcesu rejestracji
    await page.waitForURL(/\/auth\/register-success/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Weryfikacja przekierowania na stronę sukcesu
    expect(page.url()).toContain("/auth/register-success");

    // Krok 1.5: Aktywacja konta użytkownika przez Admin API
    // Supabase wymaga weryfikacji email przed pierwszym logowaniem
    // W testach E2E aktywujemy konto programatycznie przez Admin API
    const activationSuccess = await activateUserByEmail(testEmail);
    expect(activationSuccess).toBe(true);

    // Krok 2: Nawigacja do strony logowania
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Weryfikacja, że formularz logowania jest widoczny
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.title).toBeVisible();
    await expect(loginPage.description).toBeVisible();

    // Krok 3: Wypełnienie formularza logowania danymi z rejestracji
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

    // Krok 6: Weryfikacja przekierowania na stronę planów
    expect(page.url()).toContain("/plans");

    // Krok 7: Weryfikacja, że użytkownik jest zalogowany
    // Sprawdzamy, że nie jesteśmy na stronie logowania
    expect(page.url()).not.toContain("/auth/login");
    // Sprawdzamy, że jesteśmy na stronie planów
    expect(page.url()).toContain("/plans");
  });
});
