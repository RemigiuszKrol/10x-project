import { test, expect } from "@playwright/test";
import { RegisterPage } from "./pages/RegisterPage";
import { RegisterSuccessPage } from "./pages/RegisterSuccessPage";
import { createAndActivateTestUser } from "./fixtures/auth-helpers";
import { generateTestEmail, generateTestPassword } from "./fixtures/test-data";

/**
 * Testy E2E dla rejestracji nowego użytkownika
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 * 3. Baza danych jest gotowa do przyjmowania nowych użytkowników
 */

test.describe("Rejestracja użytkownika", () => {
  test.beforeEach(async ({ page }) => {
    // Przed każdym testem upewniamy się, że jesteśmy na stronie rejestracji
    const registerPage = new RegisterPage(page);
    await registerPage.navigate();
  });

  test("powinien zarejestrować nowego użytkownika z poprawnymi danymi", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Weryfikacja, że formularz jest widoczny
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
    await expect(registerPage.title).toBeVisible();
    await expect(registerPage.description).toBeVisible();

    // Krok 2: Wypełnienie formularza poprawnymi danymi
    // Używamy unikalnego emaila z timestamp, aby uniknąć konfliktów
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = "Test1234!";

    await registerPage.fillForm(testEmail, testPassword, testPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(testEmail);
    await expect(registerPage.passwordInput).toHaveValue(testPassword);
    await expect(registerPage.confirmPasswordInput).toHaveValue(testPassword);

    // Krok 3: Wysłanie formularza
    // Oczekujemy na odpowiedź API przed sprawdzaniem przekierowania
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/register") && response.request().method() === "POST"
    );

    await registerPage.submit();

    // Czekamy na odpowiedź API i weryfikujemy status (bez odczytywania body, które może być już zamknięte)
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Krok 4: Oczekiwanie na przekierowanie do strony sukcesu
    // Po udanej rejestracji użytkownik powinien zostać przekierowany na /auth/register-success
    // Używamy waitForLoadState, aby upewnić się, że strona się załadowała
    try {
      await page.waitForURL(/\/auth\/register-success/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
    } catch (error) {
      // Jeśli przekierowanie nie nastąpiło, sprawdź czy nie ma błędów na stronie
      const currentUrl = page.url();
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await page.locator('[role="alert"]').textContent();
        throw new Error(`Rejestracja nie powiodła się. URL: ${currentUrl}, Błąd: ${errorText}`);
      }
      
      throw new Error(`Przekierowanie nie nastąpiło. Aktualny URL: ${currentUrl}, Oczekiwany: /auth/register-success`);
    }

    // Krok 5: Weryfikacja przekierowania
    expect(page.url()).toContain("/auth/register-success");

    // Krok 6: Weryfikacja komunikatu sukcesu na stronie
    // Strona sukcesu powinna zawierać informację o sprawdzeniu skrzynki pocztowej
    // Używamy getByRole('heading') dla nagłówka h1, aby uniknąć konfliktu z paragrafem
    await expect(page.getByRole("heading", { name: /sprawdź swoją skrzynkę pocztową/i })).toBeVisible();
    await expect(page.getByText(/wysłaliśmy link aktywacyjny/i)).toBeVisible();

    // Krok 7: Weryfikacja, że email jest wyświetlony w komunikacie (jeśli został przekazany)
    // Email może być wyświetlony w parametrze URL lub w komunikacie
    const url = new URL(page.url());
    const emailParam = url.searchParams.get("email");
    if (emailParam) {
      await expect(page.getByText(emailParam)).toBeVisible();
    }
  });

  test("powinien wyświetlić formularz rejestracji z wszystkimi elementami", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Weryfikacja wszystkich elementów formularza
    await expect(registerPage.title).toHaveText(/utwórz konto/i);
    await expect(registerPage.description).toContainText(/rozpocznij planowanie swojego ogrodu/i);
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
    await expect(registerPage.passwordRequirements).toBeVisible();
    await expect(registerPage.loginLink).toBeVisible();
    await expect(registerPage.loginLink).toHaveAttribute("href", "/auth/login");
  });

  test("powinien wyświetlić błąd przy próbie rejestracji z istniejącym emailem (błąd 400/409)", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Utworzenie użytkownika testowego przez Admin API
    // Używamy helpera, aby mieć pewność, że użytkownik jest już w bazie
    const testEmail = generateTestEmail("existing");
    const testPassword = generateTestPassword();

    // Tworzymy użytkownika bezpośrednio przez Admin API (bez rejestracji przez UI)
    const createResult = await createAndActivateTestUser(testEmail, testPassword);
    expect(createResult.success).toBe(true);

    // Krok 2: Nawigacja do strony rejestracji ponownie
    await registerPage.navigate();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();

    // Krok 3: Wypełnienie formularza istniejącym emailem
    await registerPage.fillForm(testEmail, testPassword, testPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(testEmail);
    await expect(registerPage.passwordInput).toHaveValue(testPassword);

    // Krok 4: Wysłanie formularza i oczekiwanie na odpowiedź API
    // Oczekujemy na odpowiedź API z błędem (400 lub 409)
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/register") && response.request().method() === "POST"
    );

    await registerPage.submit();

    // Krok 5: Weryfikacja statusu HTTP odpowiedzi
    // API zwraca 400 dla istniejącego użytkownika (może być zmienione na 409)
    const response = await responsePromise;
    // Sprawdzamy czy status to 400 (aktualne zachowanie) lub 409 (jeśli API zostanie zmienione)
    expect([400, 409]).toContain(response.status());

    // Krok 6: Weryfikacja pozostania na stronie rejestracji
    // Po błędzie użytkownik powinien pozostać na stronie rejestracji (brak przekierowania)
    await expect(page).toHaveURL(/\/auth\/register/);
    
    // Czekamy na zakończenie ładowania formularza (przycisk nie powinien być w stanie loading)
    await expect(registerPage.submitButton).not.toBeDisabled({ timeout: 5000 });

    // Krok 7: Weryfikacja wyświetlenia błędu
    // API może zwrócić błąd jako błąd pola email LUB jako ogólny błąd
    // W zależności od tego, jak Supabase zwraca błąd dla istniejącego użytkownika
    // Sprawdzamy oba scenariusze
    
    // Czekamy na pojawienie się jakiegokolwiek komunikatu błędu
    // Może to być błąd w polu email (#email-error) lub ogólny błąd (FormError)
    // Używamy dłuższego timeout, ponieważ błąd może pojawić się z opóźnieniem
    const emailErrorVisible = await registerPage.emailError.isVisible({ timeout: 10000 }).catch(() => false);
    const generalErrorVisible = await registerPage.generalError.isVisible({ timeout: 10000 }).catch(() => false);
    
    // Przynajmniej jeden z błędów powinien być widoczny
    if (!emailErrorVisible && !generalErrorVisible) {
      // Jeśli żaden błąd nie jest widoczny, sprawdźmy, co jest na stronie
      const pageContent = await page.content();
      const allAlerts = await page.locator('[role="alert"]').all();
      console.log("Liczba elementów z role='alert':", allAlerts.length);
      for (const alert of allAlerts) {
        const text = await alert.textContent();
        console.log("Alert text:", text);
      }
      throw new Error("Oczekiwano wyświetlenia błędu (w polu email lub ogólnego), ale żaden błąd nie jest widoczny");
    }
    
    expect(emailErrorVisible || generalErrorVisible).toBe(true);
    
    // Jeśli błąd jest w polu email, weryfikujemy szczegóły
    if (emailErrorVisible) {
      await expect(registerPage.emailError).toContainText(/już zarejestrowany|istnieje|email.*już|użytkownik.*istnieje|already.*registered|email.*already/i);
      
      // Weryfikacja, że pole email ma atrybut aria-invalid="true"
      await expect(registerPage.emailInput).toHaveAttribute("aria-invalid", "true");
      
      // Weryfikacja, że pole email ma aria-describedby wskazujące na błąd
      const errorId = await registerPage.emailInput.getAttribute("aria-describedby");
      expect(errorId).toBe("email-error");
    }
    
    // Jeśli błąd jest ogólny, weryfikujemy komunikat
    if (generalErrorVisible) {
      await expect(registerPage.generalError).toContainText(/już zarejestrowany|istnieje|email.*już|użytkownik.*istnieje|błąd.*rejestracji|already.*registered|email.*already/i);
    }

    // Krok 8: Weryfikacja stanu formularza
    // Formularz powinien być nadal widoczny i gotowy do edycji
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test("powinien wyświetlić błąd walidacji przy niepoprawnym formacie emaila", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Próba rejestracji z niepoprawnym formatem emaila
    await registerPage.fillForm("niepoprawny-email", "Test1234!", "Test1234!");
    await registerPage.submit();

    // Powinniśmy pozostać na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Powinien być wyświetlony błąd walidacji dla pola email
    // Może być wyświetlony jako błąd pola lub ogólny błąd
    const hasEmailError = (await registerPage.emailError.isVisible()) || false;
    const hasGeneralError = (await registerPage.generalError.isVisible()) || false;

    expect(hasEmailError || hasGeneralError).toBe(true);
  });

  test("powinien wyświetlić błąd walidacji przy zbyt krótkim haśle", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Próba rejestracji z hasłem krótszym niż 8 znaków
    const timestamp = Date.now();
    const testEmail = `test-short-password-${timestamp}@example.com`;
    await registerPage.fillForm(testEmail, "Test1!", "Test1!");
    await registerPage.submit();

    // Powinniśmy pozostać na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Powinien być wyświetlony błąd walidacji dla pola hasła
    const hasPasswordError = (await registerPage.passwordError.isVisible()) || false;
    expect(hasPasswordError).toBe(true);
  });

  test("powinien wyświetlić błąd walidacji przy niezgodnych hasłach", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Próba rejestracji z różnymi hasłami
    const timestamp = Date.now();
    const testEmail = `test-mismatch-${timestamp}@example.com`;
    await registerPage.fillForm(testEmail, "Test1234!", "InneHaslo123!");
    await registerPage.submit();

    // Powinniśmy pozostać na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Powinien być wyświetlony błąd walidacji dla pola potwierdzenia hasła
    const hasConfirmPasswordError = (await registerPage.confirmPasswordError.isVisible()) || false;
    expect(hasConfirmPasswordError).toBe(true);
  });

  test("powinien pozwolić przejść do strony logowania przez link", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Kliknięcie w link "Zaloguj się"
    await registerPage.loginLink.click();

    // Weryfikacja przekierowania na stronę logowania
    await page.waitForURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
  });

  test("powinien przekierować na stronę sukcesu po rejestracji i wyświetlić wszystkie elementy", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const successPage = new RegisterSuccessPage(page);

    // Krok 1: Weryfikacja, że formularz jest widoczny
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();

    // Krok 2: Wypełnienie formularza poprawnymi danymi
    // Używamy unikalnego emaila z timestamp, aby uniknąć konfliktów
    const timestamp = Date.now();
    const testEmail = `test-success-${timestamp}@example.com`;
    const testPassword = "Test1234!";

    await registerPage.fillForm(testEmail, testPassword, testPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(testEmail);

    // Krok 3: Wysłanie formularza
    // Oczekujemy na odpowiedź API przed sprawdzaniem przekierowania
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/register") && response.request().method() === "POST"
    );

    await registerPage.submit();

    // Czekamy na odpowiedź API i weryfikujemy status
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Krok 4: Oczekiwanie na przekierowanie do strony sukcesu
    // Po udanej rejestracji użytkownik powinien zostać przekierowany na /auth/register-success
    await page.waitForURL(/\/auth\/register-success/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Krok 5: Weryfikacja przekierowania
    await expect(page).toHaveURL(/\/auth\/register-success/);

    // Krok 6: Weryfikacja wszystkich elementów strony sukcesu
    // Nagłówek h1
    await expect(successPage.heading).toBeVisible();
    await expect(successPage.heading).toHaveText(/sprawdź swoją skrzynkę pocztową/i);

    // Komunikat o wysłaniu linku aktywacyjnego
    await expect(successPage.message).toBeVisible();
    await expect(successPage.message).toContainText(/wysłaliśmy link aktywacyjny/i);

    // Ikona sukcesu
    await expect(successPage.successIcon).toBeVisible();

    // Sekcja instrukcji "Co dalej?"
    await expect(successPage.instructionsHeading).toBeVisible();
    await expect(successPage.instructionsList).toBeVisible();

    // Sekcja troubleshooting "Nie otrzymałeś wiadomości?"
    await expect(successPage.troubleshootingHeading).toBeVisible();
    await expect(successPage.troubleshootingList).toBeVisible();

    // Linki nawigacyjne
    await expect(successPage.loginLink).toBeVisible();
    await expect(successPage.loginLink).toHaveAttribute("href", "/auth/login");
    await expect(successPage.retryLink).toBeVisible();
    await expect(successPage.retryLink).toHaveAttribute("href", "/auth/register");

    // Krok 7: Weryfikacja wyświetlenia emaila (jeśli jest w URL)
    const emailFromUrl = successPage.getEmailFromUrl();
    if (emailFromUrl) {
      // Sprawdzamy czy email jest wyświetlony w komunikacie
      await expect(page.getByText(emailFromUrl)).toBeVisible();
    }
  });
});

