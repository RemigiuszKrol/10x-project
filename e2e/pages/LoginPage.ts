import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony logowania użytkownika
 * Reprezentuje stronę /auth/login z komponentem LoginForm
 */
export class LoginPage extends BasePage {
  // Pola formularza
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  // Komunikaty błędów
  readonly generalError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  // Linki nawigacyjne
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  // Tytuł i opis formularza
  readonly title: Locator;
  readonly description: Locator;

  constructor(page: Page) {
    super(page);

    // Pola formularza - używamy getByLabel dla lepszej dostępności
    this.emailInput = page.getByLabel(/adres email/i);
    this.passwordInput = page.getByLabel(/hasło/i);

    // Przycisk submit - używamy getByRole z nazwą przycisku
    this.submitButton = page.getByRole("button", { name: /zaloguj się/i });

    // Komunikaty błędów
    this.generalError = page.locator('[role="alert"]').first();
    this.emailError = page.locator("#email-error");
    this.passwordError = page.locator("#password-error");

    // Linki nawigacyjne
    this.registerLink = page.getByRole("link", { name: /zarejestruj się/i });
    this.forgotPasswordLink = page.getByRole("link", { name: /zapomniałeś hasła/i });

    // Tytuł i opis
    this.title = page.getByText(/witaj ponownie/i);
    this.description = page.getByText(/zaloguj się na swoje konto/i);
  }

  /**
   * Nawigacja do strony logowania
   */
  async navigate() {
    await this.goto("/auth/login");
    await this.waitForLoad();
  }

  /**
   * Oczekiwanie na pełne załadowanie formularza logowania
   * Czeka aż wszystkie elementy formularza są widoczne i gotowe do użycia
   */
  async waitForLoginFormToLoad() {
    // Czekamy aż wszystkie kluczowe elementy są widoczne
    await this.emailInput.waitFor({ state: "visible", timeout: 10000 });
    await this.passwordInput.waitFor({ state: "visible", timeout: 10000 });
    await this.submitButton.waitFor({ state: "visible", timeout: 10000 });

    // Dodatkowe czekanie na stabilność React (hydration)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(300); // Krótkie opóźnienie dla React state
  }

  /**
   * Wypełnienie formularza logowania
   * @param email - Adres email użytkownika
   * @param password - Hasło użytkownika
   */
  async fillLoginForm(email: string, password: string) {
    // Wypełnienie pól i oczekiwanie na ustawienie wartości
    if (email) {
      await this.emailInput.fill(email);
      await expect(this.emailInput).toHaveValue(email);
    }

    if (password) {
      await this.passwordInput.fill(password);
      await expect(this.passwordInput).toHaveValue(password);
    }
  }

  /**
   * Pełny przepływ logowania - wypełnienie i wysłanie formularza
   * @param email - Adres email użytkownika
   * @param password - Hasło użytkownika
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submitButton.click();
  }
}
