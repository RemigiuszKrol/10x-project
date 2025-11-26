import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object dla strony logowania
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/hasło/i);
    this.submitButton = page.getByRole("button", { name: /zaloguj/i });
    this.errorMessage = page.getByRole("alert");
  }

  /**
   * Przejdź do strony logowania
   */
  async navigate() {
    await this.goto("/auth/login");
  }

  /**
   * Wypełnij formularz logowania
   */
  async fillLoginForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Zaloguj się
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submitButton.click();
  }

  /**
   * Pobierz tekst błędu
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }
}
