import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony tworzenia nowego planu
 * Reprezentuje stronę /plans/new z komponentem PlanCreator
 */
export class PlanCreatorPage extends BasePage {
  // Nagłówek strony
  readonly title: Locator;
  readonly description: Locator;

  // Stepper (kroki kreatora)
  readonly stepper: Locator;

  // Przyciski akcji
  readonly backButton: Locator;
  readonly forwardButton: Locator;
  readonly saveDraftButton: Locator;
  readonly submitButton: Locator;

  // Stany komponentu
  readonly errorAlert: Locator;

  // Dialog wznowienia szkicu
  readonly draftDialog: Locator;
  readonly resumeDraftButton: Locator;
  readonly startFreshButton: Locator;

  constructor(page: Page) {
    super(page);

    // Nagłówek strony - używamy getByRole dla h1
    this.title = page.getByRole("heading", { name: /kreator nowego planu/i });
    this.description = page.getByText(/przygotuj plan swojej działki w kilku prostych krokach/i);

    // Stepper - może być trudny do zidentyfikowania, więc używamy bardziej ogólnego selektora
    this.stepper = page.locator('[role="navigation"]').first();

    // Przyciski akcji - używamy getByRole z nazwami przycisków
    this.backButton = page.getByRole("button", { name: /cofnij/i });
    this.forwardButton = page.getByRole("button", { name: /kontynuuj/i });
    this.saveDraftButton = page.getByRole("button", { name: /zapisz szkic/i });
    this.submitButton = page.getByRole("button", { name: /utwórz plan/i });

    // Stany komponentu
    this.errorAlert = page.getByRole("alert").first();

    // Dialog wznowienia szkicu
    this.draftDialog = page.getByRole("dialog");
    this.resumeDraftButton = page.getByRole("button", { name: /kontynuuj szkic/i });
    this.startFreshButton = page.getByRole("button", { name: /rozpocznij od nowa/i });
  }

  /**
   * Nawigacja do strony tworzenia nowego planu
   */
  async navigate() {
    await this.goto("/plans/new");
    await this.waitForLoad();
  }

  /**
   * Oczekiwanie na załadowanie komponentu PlanCreator
   * Czeka aż komponent React się zamontuje
   */
  async waitForPlanCreatorToLoad() {
    // Czekamy aż nagłówek będzie widoczny
    await this.title.waitFor({ state: "visible", timeout: 10000 });

    // Jeśli pojawi się dialog szkicu, możemy go zamknąć lub obsłużyć
    // Ale nie czekamy na niego, bo może się nie pojawić

    // Następnie czekamy na networkidle
    await this.waitForNetworkIdle();
  }

  /**
   * Sprawdzenie, czy strona wyświetla błąd
   */
  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible();
  }

  /**
   * Sprawdzenie, czy dialog szkicu jest widoczny
   */
  async hasDraftDialog(): Promise<boolean> {
    return await this.draftDialog.isVisible();
  }

  /**
   * Kliknięcie przycisku "Dalej" / "Kontynuuj"
   * Czeka aż przycisk będzie enabled i widoczny przed kliknięciem
   */
  async clickNextButton() {
    // Czekamy aż przycisk będzie widoczny - zwiększony timeout do 20s (może być disabled podczas wyszukiwania lokalizacji)
    await this.forwardButton.waitFor({ state: "visible", timeout: 20000 });

    // Czekamy aż przycisk nie będzie disabled (może być disabled podczas ładowania/walidacji/wyszukiwania)
    // Sprawdzamy czy przycisk jest enabled - czekamy maksymalnie 20 sekund
    const maxWaitTime = 20000;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      const isDisabled = await this.forwardButton.evaluate(
        (el) => el.hasAttribute("disabled") || el.classList.contains("disabled")
      );
      if (!isDisabled) {
        break;
      }
      await this.page.waitForTimeout(100); // Czekaj 100ms przed kolejną próbą
    }

    // Sprawdź czy przycisk jest nadal widoczny i enabled przed kliknięciem
    const isDisabled = await this.forwardButton.evaluate(
      (el) => el.hasAttribute("disabled") || el.classList.contains("disabled")
    );
    if (isDisabled) {
      throw new Error('Przycisk "Kontynuuj" jest nadal wyłączony po 20 sekundach oczekiwania');
    }

    await this.forwardButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Oczekiwanie na przejście do określonego kroku kreatora
   * @param step - Nazwa kroku (basics, location, dimensions, summary)
   */
  async waitForStep(step: "basics" | "location" | "dimensions" | "summary") {
    // Czekamy na pojawienie się odpowiednich elementów dla danego kroku
    switch (step) {
      case "basics":
        await this.page.getByLabel(/nazwa planu/i).waitFor({ state: "visible", timeout: 5000 });
        break;
      case "location":
        await this.page.getByLabel(/adres/i).waitFor({ state: "visible", timeout: 5000 });
        break;
      case "dimensions":
        await this.page.getByLabel(/szerokość/i).waitFor({ state: "visible", timeout: 5000 });
        break;
      case "summary":
        // Używamy nagłówka h2 zamiast ogólnego tekstu, aby uniknąć konfliktów z innymi elementami
        await this.page
          .getByRole("heading", { name: /podsumowanie/i, level: 2 })
          .waitFor({ state: "visible", timeout: 5000 });
        break;
    }
  }

  /**
   * Kliknięcie przycisku "Utwórz plan"
   */
  async clickCreateButton() {
    await this.submitButton.click();
    await this.page.waitForTimeout(300);
  }
}
