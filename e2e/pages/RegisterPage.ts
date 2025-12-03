import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony rejestracji użytkownika
 * Reprezentuje stronę /auth/register z komponentem RegisterForm
 */
export class RegisterPage extends BasePage {
  // Pola formularza
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  // Komunikaty błędów
  readonly generalError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;

  // Linki nawigacyjne
  readonly loginLink: Locator;

  // Tytuł i opis formularza
  readonly title: Locator;
  readonly description: Locator;

  // Informacja o wymaganiach hasła
  readonly passwordRequirements: Locator;

  constructor(page: Page) {
    super(page);

    // Pola formularza - używamy getByLabel dla lepszej dostępności
    // Dla pola hasła używamy ID, ponieważ label może zawierać gwiazdkę (required indicator)
    this.emailInput = page.getByLabel(/adres email/i);
    this.passwordInput = page.locator("#password"); // Używamy ID dla stabilności
    this.confirmPasswordInput = page.getByLabel(/potwierdź hasło/i);

    // Przycisk submit - używamy getByRole z nazwą przycisku
    this.submitButton = page.getByRole("button", { name: /zarejestruj się/i });

    // Komunikaty błędów
    // Ogólny błąd to FormError - div z role="alert" zawierający tekst błędu
    // Używamy selektora, który znajdzie div z role="alert" i klasą bg-red-50 (FormError)
    this.generalError = page.locator('div[role="alert"]').first();
    // Błędy pól formularza są wyświetlane pod polami jako <p> z id="{field}-error" i role="alert"
    this.emailError = page.locator("#email-error");
    this.passwordError = page.locator("#password-error");
    this.confirmPasswordError = page.locator("#confirmPassword-error");

    // Link do logowania
    this.loginLink = page.getByRole("link", { name: /zaloguj się/i });

    // Tytuł i opis
    this.title = page.getByText(/utwórz konto/i);
    this.description = page.getByText(/rozpocznij planowanie swojego ogrodu/i);

    // Informacja o wymaganiach hasła
    this.passwordRequirements = page.getByText(
      /hasło musi zawierać co najmniej 8 znaków, w tym co najmniej jedną literę i jedną cyfrę/i
    );
  }

  /**
   * Nawigacja do strony rejestracji
   */
  async navigate() {
    await this.goto("/auth/register");
    await this.waitForLoad();
  }

  /**
   * Wypełnienie formularza rejestracji
   * @param email - Adres email użytkownika
   * @param password - Hasło użytkownika
   * @param confirmPassword - Potwierdzenie hasła (domyślnie takie samo jak password)
   */
  async fillForm(email: string, password: string, confirmPassword?: string) {
    // Wypełnienie pól i oczekiwanie na ustawienie wartości
    // Dla pola email używamy kombinacji metod, aby upewnić się, że wartość jest ustawiona
    if (email !== undefined) {
      // Najpierw wyczyść pole i ustaw focus
      await this.emailInput.clear();
      await this.emailInput.focus();
      // Krótkie opóźnienie, aby upewnić się, że pole jest gotowe
      await this.page.waitForTimeout(100);

      // Próbujemy najpierw fill(), a jeśli to nie zadziała, używamy type()
      try {
        await this.emailInput.fill(email);
        // Czekamy na ustawienie wartości z dłuższym timeoutem
        await expect(this.emailInput).toHaveValue(email, { timeout: 10000 });
      } catch {
        // Jeśli fill() nie zadziałał (np. dla nieprawidłowych emaili), używamy type()
        await this.emailInput.clear();
        await this.emailInput.focus();
        await this.emailInput.type(email, { delay: 10 });
        // Czekamy na ustawienie wartości z dłuższym timeoutem
        await expect(this.emailInput).toHaveValue(email, { timeout: 10000 });
      }

      // Dodatkowe oczekiwanie, aby upewnić się, że React zaktualizował state
      await this.page.waitForTimeout(200);
    }

    if (password !== undefined) {
      if (password === "") {
        // Dla pustego hasła wyczyść pole
        await this.passwordInput.clear();
        await expect(this.passwordInput).toHaveValue("", { timeout: 10000 });
      } else {
        await this.passwordInput.fill(password);
        await expect(this.passwordInput).toHaveValue(password, { timeout: 10000 });
        // Dodatkowe oczekiwanie, aby upewnić się, że React zaktualizował state
        await this.page.waitForTimeout(200);
      }
    }

    const finalConfirmPassword = confirmPassword !== undefined ? confirmPassword : password;
    if (finalConfirmPassword !== undefined) {
      if (finalConfirmPassword === "") {
        // Dla pustego potwierdzenia hasła wyczyść pole
        await this.confirmPasswordInput.clear();
        await expect(this.confirmPasswordInput).toHaveValue("", { timeout: 10000 });
      } else {
        await this.confirmPasswordInput.fill(finalConfirmPassword);
        await expect(this.confirmPasswordInput).toHaveValue(finalConfirmPassword, { timeout: 10000 });
        // Dodatkowe oczekiwanie, aby upewnić się, że React zaktualizował state
        await this.page.waitForTimeout(200);
      }
    }
  }

  /**
   * Wysłanie formularza rejestracji
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Pełny przepływ rejestracji - wypełnienie i wysłanie formularza
   * @param email - Adres email użytkownika
   * @param password - Hasło użytkownika
   * @param confirmPassword - Potwierdzenie hasła (domyślnie takie samo jak password)
   */
  async register(email: string, password: string, confirmPassword?: string) {
    await this.fillForm(email, password, confirmPassword);
    await this.submit();
  }

  /**
   * Sprawdzenie czy formularz jest widoczny i gotowy do użycia
   */
  async isFormVisible(): Promise<boolean> {
    return (
      (await this.emailInput.isVisible()) &&
      (await this.passwordInput.isVisible()) &&
      (await this.confirmPasswordInput.isVisible()) &&
      (await this.submitButton.isVisible())
    );
  }

  /**
   * Sprawdzenie czy przycisk submit jest w stanie loading
   */
  async isSubmitting(): Promise<boolean> {
    const buttonText = await this.submitButton.textContent();
    return buttonText?.includes("Przetwarzanie") || false;
  }
}
