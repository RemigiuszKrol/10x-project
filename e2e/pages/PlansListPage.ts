import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony listy planów
 * Reprezentuje stronę /plans z komponentem PlansList
 */
export class PlansListPage extends BasePage {
  // Nagłówek strony
  readonly title: Locator;
  readonly description: Locator;

  // Przyciski akcji
  readonly createNewButton: Locator;

  // Stany komponentu
  readonly loadingState: Locator;
  readonly loadingText: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateCreateButton: Locator;
  readonly plansTable: Locator;

  constructor(page: Page) {
    super(page);

    // Nagłówek strony - używamy getByRole dla h1
    this.title = page.getByRole("heading", { name: /moje plany/i });
    this.description = page.getByText(/zarządzaj swoimi planami działek ogrodowych/i);

    // Przycisk tworzenia nowego planu - używamy getByRole z nazwą przycisku
    this.createNewButton = page.getByRole("button", { name: /nowy plan/i });

    // Stan ładowania - używamy role="status" z LoadingState
    this.loadingState = page.getByRole("status", { name: /ładowanie planów/i });
    this.loadingText = page.getByText(/ładowanie planów/i);

    // Stan błędu - używamy getByText dla komunikatu błędu
    // UWAGA: Może wymagać dostosowania w zależności od implementacji ErrorState
    this.errorState = page.locator('[role="alert"]').first();

    // Stan pusty - używamy getByRole dla h2
    this.emptyStateTitle = page.getByRole("heading", { name: /brak planów/i });
    this.emptyStateCreateButton = page.getByRole("button", { name: /utwórz pierwszy plan/i });
    // Kontener EmptyState można znaleźć przez tekst
    this.emptyState = page.getByText(/nie masz jeszcze żadnych planów/i).locator("..");

    // Tabela planów - używamy getByRole dla table
    // UWAGA: Może wymagać dostosowania w zależności od implementacji PlansTable
    this.plansTable = page.getByRole("table").first();
  }

  /**
   * Nawigacja do strony listy planów
   */
  async navigate() {
    await this.goto("/plans");
    await this.waitForLoad();
  }

  /**
   * Oczekiwanie na załadowanie komponentu PlansList
   * Czeka aż komponent React się zamontuje i wyświetli jeden ze stanów
   */
  async waitForPlansListToLoad() {
    // Czekamy aż jeden ze stanów będzie widoczny:
    // - loading state
    // - empty state
    // - plans table
    // - error state
    // Czekamy aż któryś ze stanów będzie widoczny; logujemy błędy, by nie tłumić wyjątków bezpowrotnie
    await Promise.race([
      this.loadingState.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
        return undefined;
      }),
      this.emptyStateTitle.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
        return undefined;
      }),
      this.plansTable.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
        return undefined;
      }),
      this.errorState.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
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
   * Sprawdzenie, czy strona jest w stanie pustym (brak planów)
   */
  async isInEmptyState(): Promise<boolean> {
    return await this.emptyStateTitle.isVisible();
  }

  /**
   * Sprawdzenie, czy strona wyświetla tabelę planów
   */
  async hasPlansTable(): Promise<boolean> {
    return await this.plansTable.isVisible();
  }

  /**
   * Sprawdzenie, czy strona jest w stanie błędu
   */
  async isInErrorState(): Promise<boolean> {
    return await this.errorState.isVisible();
  }

  /**
   * Znajduje przycisk usuwania dla planu o podanej nazwie
   * @param planName - Nazwa planu do usunięcia
   * @returns Locator przycisku usuwania
   */
  getDeleteButtonForPlan(planName: string): Locator {
    // Używamy aria-label z PlanRow: `Usuń plan ${plan.name}`
    // Escapujemy znaki specjalne w nazwie planu dla regex
    const escapedPlanName = planName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.page.getByRole("button", { name: new RegExp(`Usuń plan ${escapedPlanName}`, "i") });
  }

  /**
   * Znajduje wiersz tabeli dla planu o podanej nazwie
   * @param planName - Nazwa planu
   * @returns Locator wiersza tabeli
   */
  getPlanRow(planName: string): Locator {
    return this.plansTable.getByRole("row").filter({ hasText: planName });
  }

  /**
   * Sprawdza, czy plan o podanej nazwie jest widoczny w tabeli
   * @param planName - Nazwa planu
   * @returns Promise<boolean>
   */
  async hasPlan(planName: string): Promise<boolean> {
    const row = this.getPlanRow(planName);
    return await row.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Kliknięcie przycisku usuwania dla planu o podanej nazwie
   * @param planName - Nazwa planu do usunięcia
   */
  async clickDeleteButton(planName: string) {
    const deleteButton = this.getDeleteButtonForPlan(planName);
    await deleteButton.click();
  }

  /**
   * Locator dla dialogu usuwania planu
   */
  get deleteDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  /**
   * Locator dla tytułu dialogu usuwania
   */
  get deleteDialogTitle(): Locator {
    return this.page.getByRole("heading", { name: /usuń plan/i });
  }

  /**
   * Locator dla opisu dialogu usuwania
   */
  get deleteDialogDescription(): Locator {
    return this.page.getByRole("dialog").getByText(/czy na pewno chcesz usunąć plan/i);
  }

  /**
   * Locator dla przycisku "Anuluj" w dialogu usuwania
   */
  get deleteDialogCancelButton(): Locator {
    return this.page.getByRole("button", { name: /anuluj/i });
  }

  /**
   * Locator dla przycisku "Usuń" w dialogu usuwania
   */
  get deleteDialogConfirmButton(): Locator {
    return this.page.getByRole("button", { name: /usuń/i });
  }

  /**
   * Sprawdza, czy dialog usuwania jest widoczny
   * @returns Promise<boolean>
   */
  async isDeleteDialogVisible(): Promise<boolean> {
    return await this.deleteDialog.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Potwierdza usunięcie planu w dialogu
   */
  async confirmDelete() {
    await this.deleteDialogConfirmButton.click();
  }

  /**
   * Anuluje usunięcie planu w dialogu
   */
  async cancelDelete() {
    await this.deleteDialogCancelButton.click();
  }

  /**
   * Oczekuje na zamknięcie dialogu usuwania
   */
  async waitForDeleteDialogToClose() {
    await this.deleteDialog.waitFor({ state: "hidden", timeout: 5000 });
  }
}
