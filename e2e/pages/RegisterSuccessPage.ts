import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony sukcesu rejestracji
 * Reprezentuje stronę /auth/register-success z informacją o wysłaniu emaila weryfikacyjnego
 */
export class RegisterSuccessPage extends BasePage {
  // Nagłówek strony
  readonly heading: Locator;

  // Komunikat o wysłaniu linku aktywacyjnego
  readonly message: Locator;

  // Sekcja instrukcji "Co dalej?"
  readonly instructionsHeading: Locator;
  readonly instructionsList: Locator;

  // Sekcja troubleshooting "Nie otrzymałeś wiadomości?"
  readonly troubleshootingHeading: Locator;
  readonly troubleshootingList: Locator;

  // Linki nawigacyjne
  readonly loginLink: Locator;
  readonly retryLink: Locator;

  // Ikona sukcesu
  readonly successIcon: Locator;

  constructor(page: Page) {
    super(page);

    // Nagłówek h1
    this.heading = page.getByRole("heading", { name: /sprawdź swoją skrzynkę pocztową/i });

    // Komunikat o wysłaniu linku aktywacyjnego
    this.message = page.getByText(/wysłaliśmy link aktywacyjny/i);

    // Sekcja instrukcji
    this.instructionsHeading = page.getByText(/co dalej\?/i);
    this.instructionsList = page.locator('div:has-text("Co dalej?")').locator("ol");

    // Sekcja troubleshooting
    this.troubleshootingHeading = page.getByText(/nie otrzymałeś wiadomości\?/i);
    this.troubleshootingList = page.locator('div:has-text("Nie otrzymałeś wiadomości?")').locator("ul");

    // Linki nawigacyjne
    this.loginLink = page.getByRole("link", { name: /przejdź do logowania/i });
    this.retryLink = page.getByRole("link", { name: /spróbuj ponownie/i });

    // Ikona sukcesu
    this.successIcon = page.locator('[role="img"][aria-label="Ikona sukcesu"]');
  }

  /**
   * Nawigacja do strony sukcesu rejestracji
   * @param email - Opcjonalny parametr email do dodania w URL
   */
  async navigate(email?: string) {
    const url = email ? `/auth/register-success?email=${encodeURIComponent(email)}` : "/auth/register-success";
    await this.goto(url);
    await this.waitForLoad();
  }

  /**
   * Sprawdzenie czy strona jest załadowana
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pobranie emaila z parametru URL
   */
  getEmailFromUrl(): string | null {
    const url = new URL(this.page.url());
    return url.searchParams.get("email");
  }

  /**
   * Sprawdzenie czy email jest wyświetlony w komunikacie
   * @param email - Email do sprawdzenia
   */
  async isEmailDisplayed(email: string): Promise<boolean> {
    try {
      const emailElement = this.page.getByText(email);
      return await emailElement.isVisible();
    } catch {
      return false;
    }
  }
}
