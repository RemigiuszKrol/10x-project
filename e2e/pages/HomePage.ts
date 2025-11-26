import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object dla strony głównej
 */
export class HomePage extends BasePage {
  readonly heading: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { level: 1 });
    this.loginButton = page.getByRole("link", { name: /zaloguj/i });
    this.registerButton = page.getByRole("link", { name: /zarejestruj/i });
  }

  /**
   * Przejdź do strony głównej
   */
  async navigate() {
    await this.goto("/");
  }

  /**
   * Kliknij przycisk logowania
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * Kliknij przycisk rejestracji
   */
  async clickRegister() {
    await this.registerButton.click();
  }

  /**
   * Sprawdź czy strona główna jest załadowana
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
