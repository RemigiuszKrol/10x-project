import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony profilu użytkownika
 * Reprezentuje stronę /profile z komponentem ProfilePageWrapper
 */
export class ProfilePage extends BasePage {
  // Nagłówek strony
  readonly title: Locator;

  // Formularz profilu
  readonly themeSelect: Locator;
  readonly submitButton: Locator;

  // Sekcja bezpieczeństwa
  readonly securitySection: Locator;
  readonly changePasswordButton: Locator;

  // Stany komponentu
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly errorRetryButton: Locator;

  constructor(page: Page) {
    super(page);

    // Nagłówek strony - używamy getByRole dla h1
    this.title = page.getByRole("heading", { name: /preferencje profilu/i });

    // Formularz - używamy getByLabel dla selectów
    this.themeSelect = page.getByLabel(/motyw/i);
    this.submitButton = page.getByRole("button", { name: /zapisz/i });

    // Sekcja bezpieczeństwa
    this.securitySection = page.getByRole("heading", { name: /bezpieczeństwo/i });
    this.changePasswordButton = page.getByRole("link", { name: /zmień hasło/i });

    // Stany komponentu
    // Loading state - skeleton może być trudny do zidentyfikowania, więc sprawdzamy czy title nie jest widoczny
    this.loadingState = page.locator('[role="status"]').first();
    // Error state - używamy getByRole dla alertu
    this.errorState = page.getByRole("alert").first();
    this.errorRetryButton = page.getByRole("button", { name: /spróbuj ponownie/i });
  }

  /**
   * Nawigacja do strony profilu
   */
  async navigate() {
    await this.goto("/profile");
    await this.waitForLoad();
  }

  /**
   * Oczekiwanie na załadowanie komponentu ProfilePage
   * Czeka aż komponent React się zamontuje i wyświetli jeden ze stanów
   */
  async waitForProfileToLoad() {
    // Czekamy aż jeden ze stanów będzie widoczny:
    // - loading state (skeleton)
    // - error state
    // - success state (title widoczny)
    await Promise.race([
      this.title.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
        return undefined;
      }),
      this.errorState.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
        return undefined;
      }),
      this.loadingState.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
        return undefined;
      }),
    ]);

    // Następnie czekamy na networkidle, aby upewnić się, że wszystkie żądania API zakończyły się
    await this.waitForNetworkIdle();
  }

  /**
   * Sprawdzenie, czy strona jest w stanie ładowania
   */
  async isInLoadingState(): Promise<boolean> {
    return await this.loadingState.isVisible();
  }

  /**
   * Sprawdzenie, czy strona jest w stanie błędu
   */
  async isInErrorState(): Promise<boolean> {
    return await this.errorState.isVisible();
  }

  /**
   * Sprawdzenie, czy strona jest w stanie sukcesu (dane załadowane)
   */
  async isInSuccessState(): Promise<boolean> {
    return await this.title.isVisible();
  }
}
