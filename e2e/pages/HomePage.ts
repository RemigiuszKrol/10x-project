import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony głównej
 * Reprezentuje stronę główną aplikacji
 */
export class HomePage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    // Podstawowy selektor dla nagłówka - może wymagać dostosowania do rzeczywistej struktury
    this.heading = page.locator("h1, h2").first();
  }

  /**
   * Nawigacja do strony głównej
   */
  async navigate() {
    await this.goto("/");
    await this.waitForLoad();
  }

  /**
   * Sprawdzenie czy strona jest załadowana
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.page.waitForLoadState("load");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pobranie tytułu strony
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }
}
