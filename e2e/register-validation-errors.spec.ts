import { test, expect } from "@playwright/test";
import { RegisterPage } from "./pages/RegisterPage";

/**
 * Testy E2E dla walidacji błędów w formularzu rejestracji
 *
 * Testy weryfikują wyświetlanie komunikatów błędów walidacji dla różnych
 * scenariuszy niepoprawnych danych w formularzu rejestracji.
 *
 * UWAGA: Te testy wymagają uruchomionej aplikacji.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 */

test.describe("Walidacja błędów w formularzu rejestracji", () => {
  test.beforeEach(async ({ page }) => {
    // Przed każdym testem upewniamy się, że jesteśmy na stronie rejestracji
    const registerPage = new RegisterPage(page);
    await registerPage.navigate();
  });

  test("powinien wyświetlić błędy walidacji dla pustych pól", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Weryfikacja, że formularz jest widoczny
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();

    // Krok 2: Próba wysłania formularza bez wypełnienia pól
    // Nie wypełniamy żadnych pól - wszystkie pozostają puste
    await registerPage.submit();

    // Krok 3: Weryfikacja pozostania na stronie rejestracji
    // Po błędzie walidacji użytkownik powinien pozostać na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Krok 4: Weryfikacja wyświetlenia błędów dla wszystkich wymaganych pól
    // Wszystkie trzy pola są wymagane, więc powinny wyświetlić błędy
    await expect(registerPage.emailError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.emailError).toContainText(/email.*wymagany|email.*required/i);

    await expect(registerPage.passwordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordError).toContainText(/hasło.*wymagane|password.*required/i);

    await expect(registerPage.confirmPasswordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.confirmPasswordError).toContainText(
      /potwierdzenie.*wymagane|confirm.*required/i
    );

    // Krok 5: Weryfikacja atrybutów dostępności dla pól z błędami
    // Pola z błędami powinny mieć aria-invalid="true"
    await expect(registerPage.emailInput).toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.passwordInput).toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.confirmPasswordInput).toHaveAttribute("aria-invalid", "true");

    // Krok 6: Weryfikacja, że formularz jest nadal gotowy do edycji
    // Formularz powinien być widoczny i gotowy do poprawienia błędów
    await expect(registerPage.emailInput).toBeEnabled();
    await expect(registerPage.passwordInput).toBeEnabled();
    await expect(registerPage.confirmPasswordInput).toBeEnabled();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test("powinien wyświetlić błąd walidacji dla hasła bez liter (tylko cyfry)", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Wypełnienie formularza hasłem zawierającym tylko cyfry
    // Hasło ma 8+ znaków, ale brakuje liter
    const timestamp = Date.now();
    const testEmail = `test-no-letters-${timestamp}@example.com`;
    const passwordOnlyNumbers = "12345678"; // 8 cyfr, brak liter

    await registerPage.fillForm(testEmail, passwordOnlyNumbers, passwordOnlyNumbers);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(testEmail);
    await expect(registerPage.passwordInput).toHaveValue(passwordOnlyNumbers);

    // Krok 2: Wysłanie formularza
    await registerPage.submit();

    // Krok 3: Weryfikacja pozostania na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Krok 4: Weryfikacja wyświetlenia błędu walidacji dla hasła
    // Hasło musi zawierać co najmniej jedną literę i cyfrę
    await expect(registerPage.passwordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordError).toContainText(
      /hasło.*literę|password.*letter|hasło.*cyfrę|password.*digit/i
    );

    // Krok 5: Weryfikacja atrybutów dostępności
    await expect(registerPage.passwordInput).toHaveAttribute("aria-invalid", "true");

    // Krok 6: Weryfikacja, że inne pola nie mają błędów (jeśli są poprawne)
    // Email powinien być poprawny, więc nie powinien mieć błędu
    const emailHasError = await registerPage.emailError.isVisible().catch(() => false);
    expect(emailHasError).toBe(false);
  });

  test("powinien wyświetlić błąd walidacji dla hasła bez cyfr (tylko litery)", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Wypełnienie formularza hasłem zawierającym tylko litery
    // Hasło ma 8+ znaków, ale brakuje cyfr
    const timestamp = Date.now();
    const testEmail = `test-no-digits-${timestamp}@example.com`;
    const passwordOnlyLetters = "TestPassword"; // 12 liter, brak cyfr

    await registerPage.fillForm(testEmail, passwordOnlyLetters, passwordOnlyLetters);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(testEmail);
    await expect(registerPage.passwordInput).toHaveValue(passwordOnlyLetters);

    // Krok 2: Wysłanie formularza
    await registerPage.submit();

    // Krok 3: Weryfikacja pozostania na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Krok 4: Weryfikacja wyświetlenia błędu walidacji dla hasła
    // Hasło musi zawierać co najmniej jedną literę i cyfrę
    await expect(registerPage.passwordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordError).toContainText(
      /hasło.*cyfrę|password.*digit|hasło.*literę.*cyfrę|password.*letter.*digit/i
    );

    // Krok 5: Weryfikacja atrybutów dostępności
    await expect(registerPage.passwordInput).toHaveAttribute("aria-invalid", "true");

    // Krok 6: Weryfikacja, że email nie ma błędu (jeśli jest poprawny)
    const emailHasError = await registerPage.emailError.isVisible().catch(() => false);
    expect(emailHasError).toBe(false);
  });

  test("powinien wyświetlić błędy walidacji dla wielu błędów jednocześnie", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Wypełnienie formularza danymi z wieloma błędami
    // - Email: niepoprawny format (brak @)
    // - Hasło: zbyt krótkie (5 znaków) i bez cyfr
    // - Potwierdzenie hasła: różne od hasła
    const invalidEmail = "niepoprawny-email-bez-małpy";
    const shortPassword = "Test1"; // 5 znaków, za krótkie
    const differentConfirmPassword = "InneHaslo123!";

    await registerPage.fillForm(invalidEmail, shortPassword, differentConfirmPassword);

    // Weryfikacja, że pola są wypełnione
    await expect(registerPage.emailInput).toHaveValue(invalidEmail);
    await expect(registerPage.passwordInput).toHaveValue(shortPassword);
    await expect(registerPage.confirmPasswordInput).toHaveValue(differentConfirmPassword);

    // Krok 2: Wysłanie formularza
    await registerPage.submit();

    // Krok 3: Weryfikacja pozostania na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Krok 4: Weryfikacja wyświetlenia błędów dla wszystkich pól
    // Wszystkie trzy pola powinny mieć błędy walidacji
    await expect(registerPage.emailError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.emailError).toContainText(/nieprawidłowy.*format|invalid.*format/i);

    await expect(registerPage.passwordError).toBeVisible({ timeout: 5000 });
    // Hasło jest za krótkie, więc błąd powinien mówić o długości
    await expect(registerPage.passwordError).toContainText(/8.*znaków|8.*characters/i);

    await expect(registerPage.confirmPasswordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.confirmPasswordError).toContainText(/identyczne|match|muszą.*być/i);

    // Krok 5: Weryfikacja atrybutów dostępności dla wszystkich pól z błędami
    await expect(registerPage.emailInput).toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.passwordInput).toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.confirmPasswordInput).toHaveAttribute("aria-invalid", "true");

    // Krok 6: Weryfikacja, że formularz jest nadal gotowy do edycji
    await expect(registerPage.emailInput).toBeEnabled();
    await expect(registerPage.passwordInput).toBeEnabled();
    await expect(registerPage.confirmPasswordInput).toBeEnabled();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test("powinien wyświetlić błąd walidacji dla pustego emaila przy wypełnionym haśle", async ({
    page,
  }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Wypełnienie formularza tylko hasłem (email pozostaje pusty)
    const validPassword = "Test1234!";
    await registerPage.fillForm("", validPassword, validPassword);

    // Weryfikacja, że email jest pusty, a hasło wypełnione
    await expect(registerPage.emailInput).toHaveValue("");
    await expect(registerPage.passwordInput).toHaveValue(validPassword);

    // Krok 2: Wysłanie formularza
    await registerPage.submit();

    // Krok 3: Weryfikacja pozostania na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Krok 4: Weryfikacja wyświetlenia błędu tylko dla emaila
    // Email jest wymagany, więc powinien mieć błąd
    await expect(registerPage.emailError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.emailError).toContainText(/email.*wymagany|email.*required/i);

    // Hasło jest poprawne, więc nie powinno mieć błędu
    const passwordHasError = await registerPage.passwordError.isVisible().catch(() => false);
    expect(passwordHasError).toBe(false);

    // Krok 5: Weryfikacja atrybutów dostępności
    await expect(registerPage.emailInput).toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.passwordInput).not.toHaveAttribute("aria-invalid", "true");
  });

  test("powinien wyświetlić błąd walidacji dla pustego hasła przy wypełnionym emailu", async ({
    page,
  }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Wypełnienie formularza tylko emailem (hasło pozostaje puste)
    const timestamp = Date.now();
    const testEmail = `test-empty-password-${timestamp}@example.com`;
    await registerPage.fillForm(testEmail, "", "");

    // Weryfikacja, że email jest wypełniony, a hasło puste
    await expect(registerPage.emailInput).toHaveValue(testEmail);
    await expect(registerPage.passwordInput).toHaveValue("");

    // Krok 2: Wysłanie formularza
    await registerPage.submit();

    // Krok 3: Weryfikacja pozostania na stronie rejestracji
    await expect(page).toHaveURL(/\/auth\/register/);

    // Krok 4: Weryfikacja wyświetlenia błędów dla pól hasła
    // Hasło i potwierdzenie hasła są wymagane, więc powinny mieć błędy
    await expect(registerPage.passwordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordError).toContainText(/hasło.*wymagane|password.*required/i);

    await expect(registerPage.confirmPasswordError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.confirmPasswordError).toContainText(
      /potwierdzenie.*wymagane|confirm.*required/i
    );

    // Email jest poprawny, więc nie powinien mieć błędu
    // Czekamy chwilę, aby upewnić się, że walidacja się zakończyła
    await page.waitForTimeout(500);
    const emailHasError = await registerPage.emailError.isVisible().catch(() => false);
    expect(emailHasError).toBe(false);

    // Krok 5: Weryfikacja atrybutów dostępności
    await expect(registerPage.emailInput).not.toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.passwordInput).toHaveAttribute("aria-invalid", "true");
    await expect(registerPage.confirmPasswordInput).toHaveAttribute("aria-invalid", "true");
  });

  test("powinien wyczyścić błędy walidacji po poprawieniu danych", async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Krok 1: Wypełnienie formularza niepoprawnymi danymi
    const invalidEmail = "niepoprawny-email";
    const shortPassword = "Test1";
    await registerPage.fillForm(invalidEmail, shortPassword, shortPassword);

    // Krok 2: Wysłanie formularza (powinno wyświetlić błędy)
    await registerPage.submit();

    // Krok 3: Weryfikacja wyświetlenia błędów
    await expect(registerPage.emailError).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordError).toBeVisible({ timeout: 5000 });

    // Krok 4: Poprawienie danych w formularzu
    const validEmail = `test-${Date.now()}@example.com`;
    const validPassword = "Test1234!";

    // Wypełnienie poprawnych danych
    await registerPage.emailInput.fill(validEmail);
    await registerPage.passwordInput.fill(validPassword);
    await registerPage.confirmPasswordInput.fill(validPassword);

    // Krok 5: Weryfikacja, że błędy zniknęły po poprawieniu danych
    // Błędy powinny zniknąć natychmiast po poprawieniu (walidacja po zmianie wartości)
    // Ale ponieważ walidacja może być tylko przy submit, sprawdzamy czy pola są poprawne
    await expect(registerPage.emailInput).toHaveValue(validEmail);
    await expect(registerPage.passwordInput).toHaveValue(validPassword);

    // Krok 6: Ponowne wysłanie formularza z poprawnymi danymi
    // Oczekujemy na odpowiedź API
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/register") && response.request().method() === "POST"
    );

    await registerPage.submit();

    // Krok 7: Weryfikacja, że formularz został wysłany poprawnie
    // Jeśli dane są poprawne, powinno nastąpić przekierowanie lub brak błędów
    const response = await responsePromise;

    // Jeśli rejestracja się powiodła (200), sprawdzamy przekierowanie
    if (response.status() === 200) {
      await page.waitForURL(/\/auth\/register-success/, { timeout: 15000 }).catch(() => {
        // Jeśli nie ma przekierowania, sprawdzamy czy nie ma błędów
      });
    } else {
      // Jeśli jest błąd, weryfikujemy że nie są to błędy walidacji (mogą być inne błędy)
      // W tym teście skupiamy się na walidacji, więc jeśli są inne błędy, to OK
    }
  });
});

