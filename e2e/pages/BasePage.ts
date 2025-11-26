import { Page, Locator } from "@playwright/test";

/**
 * Bazowa klasa dla Page Object Model
 * Zawiera wspólne metody używane przez wszystkie strony
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Przejdź do określonego URL
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Czekaj aż element będzie widoczny
   */
  async waitForElement(locator: Locator) {
    await locator.waitFor({ state: "visible" });
  }

  /**
   * Kliknij element i czekaj na nawigację
   */
  async clickAndWaitForNavigation(locator: Locator) {
    await Promise.all([this.page.waitForLoadState("networkidle"), locator.click()]);
  }

  /**
   * Wypełnij pole formularza
   */
  async fillField(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /**
   * Pobierz tytuł strony
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Zrób screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
