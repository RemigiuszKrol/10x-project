import type { Page } from "@playwright/test";

/**
 * Bazowa klasa Page Object Model dla wszystkich stron
 * Zawiera wspólne metody i właściwości używane przez wszystkie Page Objects
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Nawigacja do podanego URL
   * @param url - URL do którego chcemy przejść (może być względny lub bezwzględny)
   */
  async goto(url: string) {
    await this.page.goto(url);
  }

  /**
   * Oczekiwanie na załadowanie strony
   * Sprawdza czy strona jest w stanie "load"
   */
  async waitForLoad() {
    await this.page.waitForLoadState("load");
  }

  /**
   * Oczekiwanie na załadowanie sieci
   * Sprawdza czy wszystkie żądania sieciowe zostały zakończone
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Pobranie tytułu strony
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Pobranie aktualnego URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Oczekiwanie na zmianę URL
   * @param urlPattern - Wzorzec URL (może być string lub RegExp)
   */
  async waitForURL(urlPattern: string | RegExp) {
    await this.page.waitForURL(urlPattern);
  }
}
