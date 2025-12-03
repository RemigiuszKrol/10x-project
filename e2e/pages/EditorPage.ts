import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model dla strony edytora planu
 * Reprezentuje stronę /plans/[id] z komponentem EditorLayout
 */
export class EditorPage extends BasePage {
  // Nagłówek strony (EditorTopbar)
  readonly planName: Locator;
  readonly gridInfo: Locator;
  readonly backToPlansButton: Locator;

  // Toolbar
  readonly toolbar: Locator;
  readonly selectTool: Locator;
  readonly addPlantTool: Locator;
  readonly changeTypeTool: Locator;

  // GridCanvas
  readonly gridCanvas: Locator;
  readonly gridContainer: Locator;

  // Status
  readonly statusIndicator: Locator;

  // AreaTypePanel
  areaTypePanel!: Locator;
  areaTypeSelect!: Locator;
  areaTypeApplyButton!: Locator;
  areaTypeCancelButton!: Locator;

  // SideDrawer
  readonly sideDrawer: Locator;
  readonly plantsTab: Locator;
  readonly plantsSearchTab: Locator;
  readonly plantQueryInput: Locator;
  readonly addPlantManuallyButton: Locator;
  readonly weatherTab: Locator;
  readonly parametersTab: Locator;

  // AreaTypeConfirmDialog
  areaTypeConfirmDialog!: Locator;
  areaTypeConfirmDialogTitle!: Locator;
  areaTypeConfirmDialogDescription!: Locator;
  areaTypeConfirmButton!: Locator;
  areaTypeConfirmCancelButton!: Locator;

  // AddPlantDialog
  addPlantDialog!: Locator;
  addPlantDialogTitle!: Locator;
  addPlantDialogSearchInput!: Locator;
  addPlantDialogSearchButton!: Locator;
  addPlantDialogSearchResults!: Locator;
  addPlantDialogPlantFitDisplay!: Locator;
  addPlantDialogConfirmButton!: Locator;
  addPlantDialogCancelButton!: Locator;
  addPlantDialogSkipFitButton!: Locator;

  // CellNotSoilDialog
  cellNotSoilDialog!: Locator;
  cellNotSoilDialogTitle!: Locator;
  cellNotSoilDialogDescription!: Locator;
  cellNotSoilDialogCloseButton!: Locator;

  constructor(page: Page) {
    super(page);

    // Nagłówek - używamy getByRole dla h1
    this.planName = page.getByRole("heading", { level: 1 });
    // Używamy bardziej specyficznego selektora - element <p> z klasą text-muted-foreground
    // zawierający tekst z wymiarami siatki (znak "×" i rozmiar kratki w nawiasach)
    // To unika konfliktu z innymi elementami zawierającymi "Siatka:"
    // Używamy selektora CSS, który wybiera element <p> z klasą i pełnym tekstem
    this.gridInfo = page
      .locator("p.text-muted-foreground")
      .filter({ hasText: /siatka:.*×.*\(/i })
      .first();
    this.backToPlansButton = page.getByRole("link", { name: /plany/i });

    // Toolbar - używamy bardziej ogólnych selektorów
    this.toolbar = page.locator('[role="toolbar"]').first();
    this.selectTool = page.getByRole("button", { name: /zaznacz/i });
    this.addPlantTool = page.getByRole("button", { name: /dodaj roślinę/i });
    this.changeTypeTool = page.getByRole("button", { name: /zmień typ/i });

    // GridCanvas - używamy data-testid jeśli istnieje, w przeciwnym razie bardziej ogólny selektor
    this.gridCanvas = page.locator('[data-testid="grid-canvas"]').or(page.locator('[role="grid"]').first());
    this.gridContainer = page.locator('[data-testid="grid-container"]').or(page.locator(".grid").first());

    // Status
    this.statusIndicator = page.getByText(/status:/i);

    // SideDrawer
    this.sideDrawer = page.locator("aside").first();
    this.plantsTab = page.getByRole("tab", { name: /rośliny/i });
    this.plantsSearchTab = page.locator('button:has-text("Wyszukaj")').or(page.getByRole("tab", { name: /wyszukaj/i }));
    this.plantQueryInput = page.locator("#plant-query").or(page.getByLabel(/nazwa rośliny/i));
    this.addPlantManuallyButton = page.getByRole("button", { name: /dodaj.*bez oceny/i });
    this.weatherTab = page.getByRole("tab", { name: /pogoda/i });
    this.parametersTab = page.getByRole("tab", { name: /parametry/i });

    // Inicjalizacja locatorów dla AreaTypePanel
    this.initializeAreaTypePanelLocators();

    // Inicjalizacja locatorów dla AreaTypeConfirmDialog
    this.initializeAreaTypeConfirmDialogLocators();

    // Inicjalizacja locatorów dla AddPlantDialog
    this.initializeAddPlantDialogLocators();

    // Inicjalizacja locatorów dla CellNotSoilDialog
    this.initializeCellNotSoilDialogLocators();
  }

  private initializeAreaTypePanelLocators() {
    // Panel wyboru typu obszaru - używamy role="dialog" i aria-label
    this.areaTypePanel = this.page.getByRole("dialog", { name: /panel wyboru typu obszaru/i });

    // Select typu obszaru - używamy id="area-type-select"
    this.areaTypeSelect = this.page.locator("#area-type-select");

    // Przyciski w panelu
    this.areaTypeApplyButton = this.areaTypePanel.getByRole("button", { name: /zastosuj/i });
    this.areaTypeCancelButton = this.areaTypePanel.getByRole("button", { name: /anuluj/i });
  }

  private initializeAreaTypeConfirmDialogLocators() {
    // Dialog potwierdzenia - używamy AlertDialog z role="alertdialog"
    this.areaTypeConfirmDialog = this.page.getByRole("alertdialog");
    this.areaTypeConfirmDialogTitle = this.areaTypeConfirmDialog.getByRole("heading", { name: /usunąć rośliny/i });
    this.areaTypeConfirmDialogDescription = this.areaTypeConfirmDialog
      .locator('[role="alert"]')
      .or(this.areaTypeConfirmDialog.getByText(/zmiana typu/i));
    this.areaTypeConfirmButton = this.areaTypeConfirmDialog.getByRole("button", { name: /potwierdź i usuń/i });
    this.areaTypeConfirmCancelButton = this.areaTypeConfirmDialog.getByRole("button", { name: /anuluj/i });
  }

  /**
   * Nawigacja do strony edytora planu
   * @param planId - ID planu (UUID)
   */
  async navigate(planId: string) {
    await this.goto(`/plans/${planId}`);
    await this.waitForLoad();
  }

  /**
   * Oczekiwanie na załadowanie komponentu EditorLayout
   * Czeka aż komponent React się zamontuje i siatka będzie widoczna
   */
  async waitForEditorToLoad() {
    // Czekamy aż nagłówek z nazwą planu będzie widoczny
    await this.planName.waitFor({ state: "visible", timeout: 15000 });

    // Czekamy aż siatka będzie widoczna (może być opóźnienie przy renderowaniu)
    await this.gridCanvas.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
      // Jeśli gridCanvas nie jest widoczny, spróbujmy znaleźć gridContainer
      return this.gridContainer.waitFor({ state: "visible", timeout: 10000 });
    });

    // Następnie czekamy na networkidle
    await this.waitForNetworkIdle();
  }

  /**
   * Sprawdzenie, czy siatka jest widoczna
   */
  async isGridVisible(): Promise<boolean> {
    const canvasVisible = await this.gridCanvas.isVisible().catch(() => false);
    const containerVisible = await this.gridContainer.isVisible().catch(() => false);
    return canvasVisible || containerVisible;
  }

  /**
   * Sprawdzenie, czy nazwa planu jest widoczna
   */
  async isPlanNameVisible(): Promise<boolean> {
    return await this.planName.isVisible();
  }

  /**
   * Pobranie nazwy planu
   */
  async getPlanName(): Promise<string> {
    return (await this.planName.textContent()) || "";
  }

  /**
   * Sprawdzenie, czy informacje o siatce są widoczne
   */
  async isGridInfoVisible(): Promise<boolean> {
    return await this.gridInfo.isVisible();
  }

  /**
   * Pobranie informacji o siatce (tekst)
   */
  async getGridInfo(): Promise<string> {
    return (await this.gridInfo.textContent()) || "";
  }

  /**
   * Sprawdzenie, czy AreaTypePanel jest widoczny
   */
  async isAreaTypePanelVisible(): Promise<boolean> {
    return await this.areaTypePanel.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Zaznaczenie obszaru w siatce przez przeciąganie myszy
   * @param startX - Współrzędna X punktu startowego (w komórkach, 0-indexed)
   * @param startY - Współrzędna Y punktu startowego (w komórkach, 0-indexed)
   * @param endX - Współrzędna X punktu końcowego (w komórkach, 0-indexed)
   * @param endY - Współrzędna Y punktu końcowego (w komórkach, 0-indexed)
   */
  async selectArea(startX: number, startY: number, endX: number, endY: number) {
    // Upewnij się, że narzędzie "select" jest aktywne
    await this.selectTool.click();
    await this.page.waitForTimeout(200); // Krótkie opóźnienie na zmianę narzędzia

    // Znajdź siatkę (role="grid")
    const grid = this.page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible();

    // Znajdź komórki startową i końcową używając aria-label
    // Komórki mają aria-label w formacie: "Komórka x,y, typ: ..."
    // Używamy * zawiera, aby dopasować nawet jeśli jest dodatkowy tekst o roślinie
    const startCell = grid.locator(`[role="gridcell"][aria-label*="Komórka ${startX},${startY}"]`).first();
    const endCell = grid.locator(`[role="gridcell"][aria-label*="Komórka ${endX},${endY}"]`).first();

    await expect(startCell).toBeVisible();
    await expect(endCell).toBeVisible();

    // Pobierz bounding box komórek
    const startBox = await startCell.boundingBox();
    const endBox = await endCell.boundingBox();

    if (!startBox || !endBox) {
      throw new Error("Nie można znaleźć komórek do zaznaczenia");
    }

    // Użyj środka komórek
    const startPixelX = startBox.x + startBox.width / 2;
    const startPixelY = startBox.y + startBox.height / 2;
    const endPixelX = endBox.x + endBox.width / 2;
    const endPixelY = endBox.y + endBox.height / 2;

    // Wykonaj drag: mouseDown -> mouseMove -> mouseUp
    await this.page.mouse.move(startPixelX, startPixelY);
    await this.page.mouse.down();
    await this.page.mouse.move(endPixelX, endPixelY, { steps: 10 });
    await this.page.mouse.up();

    // Czekaj na pojawienie się AreaTypePanel
    await expect(this.areaTypePanel).toBeVisible({ timeout: 3000 });
  }

  /**
   * Wybór typu obszaru w AreaTypePanel
   * @param type - Typ komórki (soil, path, water, building, blocked)
   */
  async selectAreaType(type: "Ziemia" | "Ścieżka" | "Woda" | "Zabudowa" | "Zablokowane") {
    // Kliknij na select
    await this.areaTypeSelect.click();

    // Wybierz opcję z listy
    await this.page.getByRole("option", { name: type }).click();

    // Czekaj na zamknięcie dropdown
    await this.page.waitForTimeout(300);
  }

  /**
   * Zastosowanie wybranego typu obszaru
   */
  async applyAreaType() {
    // Najpierw klikamy przycisk, potem czekamy na odpowiedź API
    // To unika problemu z timeout, gdy odpowiedź przychodzi zbyt szybko
    await this.areaTypeApplyButton.click();

    // Czekaj na odpowiedź API (może być 200 lub 409 jeśli są rośliny)
    const applyResponse = await this.page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/plans/") &&
          response.url().includes("/cells") &&
          (response.request().method() === "PATCH" || response.request().method() === "PUT"),
        { timeout: 15000 }
      )
      .catch(() => null);

    // Jeśli otrzymaliśmy odpowiedź, sprawdźmy status
    // 200 = sukces, 409 = konflikt (rośliny w obszarze - wymaga potwierdzenia)
    if (applyResponse) {
      expect([200, 409]).toContain(applyResponse.status());
    }

    // Czekaj na zamknięcie panelu (zaznaczenie powinno zostać wyczyszczone)
    // Jeśli jest dialog potwierdzenia, panel może pozostać otwarty
    await expect(this.areaTypePanel)
      .toBeHidden({ timeout: 5000 })
      .catch(() => {
        // Panel może pozostać otwarty jeśli pojawił się dialog potwierdzenia
        // To jest OK - dialog będzie obsłużony przez test
      });
  }

  /**
   * Anulowanie zmiany typu obszaru
   */
  async cancelAreaTypeChange() {
    await this.areaTypeCancelButton.click();
    await expect(this.areaTypePanel).toBeHidden({ timeout: 2000 });
  }

  /**
   * Pobranie tekstu informacji o zaznaczeniu z AreaTypePanel
   */
  async getSelectionInfo(): Promise<string> {
    const infoText = await this.areaTypePanel.getByText(/zaznaczono/i).textContent();
    return infoText || "";
  }

  /**
   * Otwarcie zakładki roślin w SideDrawer
   */
  async openPlantsTab() {
    await this.plantsTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Otwarcie podzakładki "Wyszukaj" w zakładce roślin
   */
  async openPlantsSearchTab() {
    await this.openPlantsTab();
    await this.plantsSearchTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Kliknięcie komórki w siatce (do zaznaczenia komórki przed dodaniem rośliny)
   * @param x - Współrzędna X komórki (0-indexed)
   * @param y - Współrzędna Y komórki (0-indexed)
   */
  async clickCell(x: number, y: number) {
    const grid = this.page.locator('[role="grid"]').first();
    const cell = grid.locator(`[role="gridcell"][aria-label*="Komórka ${x},${y}"]`).first();
    await expect(cell).toBeVisible();
    await cell.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Dodanie rośliny ręcznie (bez AI) do zaznaczonej komórki
   * @param plantName - Nazwa rośliny do dodania
   */
  async addPlantManually(plantName: string) {
    // Otwórz zakładkę wyszukiwania roślin
    await this.openPlantsSearchTab();

    // Wpisz nazwę rośliny
    await this.plantQueryInput.fill(plantName);
    await this.page.waitForTimeout(500);

    // Czekaj na odpowiedź API (wyszukiwanie)
    const searchResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/api/ai/plants/search") && response.request().method() === "POST",
      { timeout: 15000 }
    );

    // Kliknij przycisk "Szukaj" w panelu bocznym
    const searchButton = this.sideDrawer
      .getByRole("button", { name: /szukaj/i })
      .or(this.sideDrawer.locator('button[title="Szukaj"]'));
    await searchButton.click();

    // Czekaj na odpowiedź API wyszukiwania
    const searchResponse = await searchResponsePromise;
    expect(searchResponse.status()).toBe(200);

    // Poczekaj chwilę na przetworzenie wyników wyszukiwania
    await this.page.waitForTimeout(1000);

    // Czekaj na odpowiedź API (dodanie rośliny)
    const addPlantResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans/") &&
        response.url().includes("/plants/") &&
        (response.request().method() === "PUT" || response.request().method() === "POST"),
      { timeout: 15000 }
    );

    // Przycisk "Dodaj bez oceny" pojawia się gdy:
    // 1. Wyszukiwanie AI nie zwróci wyników (po timeout lub braku wyników)
    // 2. Format tekstu: "Dodaj "{plantName}" bez oceny"
    // Używamy bardziej elastycznego selektora
    const addButtonText = new RegExp(`dodaj.*${plantName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*bez oceny`, "i");
    const addButton = this.page.getByRole("button", { name: addButtonText });

    // Czekaj na pojawienie się przycisku (może być opóźnienie jeśli wyszukiwanie AI trwa)
    // Jeśli wyszukiwanie AI nie zwróci wyników, przycisk pojawi się automatycznie
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Czekaj na odpowiedź API
    const addPlantResponse = await addPlantResponsePromise;
    expect(addPlantResponse.status()).toBe(200);

    // Czekaj na zniknięcie przycisku lub toast success
    await this.page.waitForTimeout(500);
  }

  /**
   * Sprawdzenie, czy AreaTypeConfirmDialog jest widoczny
   */
  async isAreaTypeConfirmDialogVisible(): Promise<boolean> {
    return await this.areaTypeConfirmDialog.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Pobranie tekstu opisu z AreaTypeConfirmDialog
   */
  async getAreaTypeConfirmDialogDescription(): Promise<string> {
    const description = await this.areaTypeConfirmDialogDescription.textContent();
    return description || "";
  }

  /**
   * Potwierdzenie usunięcia roślin w AreaTypeConfirmDialog
   */
  async confirmAreaTypeChange() {
    // Najpierw klikamy przycisk, potem czekamy na odpowiedź API
    // To unika problemu z timeout, gdy odpowiedź przychodzi zbyt szybko
    await this.areaTypeConfirmButton.click();

    // Czekaj na odpowiedź API (zmiana typu z confirm_plant_removal=true)
    const confirmResponse = await this.page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/plans/") &&
          response.url().includes("/cells") &&
          (response.request().method() === "PATCH" || response.request().method() === "PUT"),
        { timeout: 30000 }
      )
      .catch(() => null);

    // Jeśli otrzymaliśmy odpowiedź, sprawdźmy status
    if (confirmResponse) {
      expect(confirmResponse.status()).toBe(200);
    }

    // Czekaj na zamknięcie dialogu
    await expect(this.areaTypeConfirmDialog).toBeHidden({ timeout: 5000 });
  }

  /**
   * Anulowanie zmiany typu w AreaTypeConfirmDialog
   */
  async cancelAreaTypeChangeDialog() {
    await this.areaTypeConfirmCancelButton.click();
    await expect(this.areaTypeConfirmDialog).toBeHidden({ timeout: 2000 });
  }

  /**
   * Sprawdzenie typu komórki (na podstawie aria-label)
   * @param x - Współrzędna X komórki (0-indexed)
   * @param y - Współrzędna Y komórki (0-indexed)
   * @returns Typ komórki (np. "soil", "path", "water", "building", "blocked") lub null
   */
  async getCellType(x: number, y: number): Promise<string | null> {
    const grid = this.page.locator('[role="grid"]').first();
    const cell = grid.locator(`[role="gridcell"][aria-label*="Komórka ${x},${y}"]`).first();

    // Czekaj na pojawienie się komórki
    await expect(cell).toBeVisible({ timeout: 5000 });

    const ariaLabel = await cell.getAttribute("aria-label");
    if (!ariaLabel) return null;

    // Sprawdź typ komórki w aria-label
    // aria-label może zawierać: "Komórka X,Y, typ: soil/path/water/building/blocked"
    const typeMatch = ariaLabel.match(/typ:\s*(\w+)/i);
    if (typeMatch) {
      return typeMatch[1].toLowerCase();
    }

    // Alternatywnie sprawdź bezpośrednio w tekście
    if (ariaLabel.toLowerCase().includes("path") || ariaLabel.toLowerCase().includes("ścieżka")) {
      return "path";
    }
    if (ariaLabel.toLowerCase().includes("water") || ariaLabel.toLowerCase().includes("woda")) {
      return "water";
    }
    if (ariaLabel.toLowerCase().includes("building") || ariaLabel.toLowerCase().includes("zabudowa")) {
      return "building";
    }
    if (ariaLabel.toLowerCase().includes("blocked") || ariaLabel.toLowerCase().includes("zablokowane")) {
      return "blocked";
    }
    // Domyślnie "soil" (ziemia)
    return "soil";
  }

  /**
   * Sprawdzenie, czy komórka ma określony typ
   * @param x - Współrzędna X komórki (0-indexed)
   * @param y - Współrzędna Y komórki (0-indexed)
   * @param type - Typ do sprawdzenia ("soil", "path", "water", "building", "blocked")
   * @returns true jeśli komórka ma podany typ
   */
  async hasCellType(x: number, y: number, type: "soil" | "path" | "water" | "building" | "blocked"): Promise<boolean> {
    const cellType = await this.getCellType(x, y);
    return cellType === type;
  }

  /**
   * Sprawdzenie, czy komórka zawiera roślinę (na podstawie aria-label)
   * @param x - Współrzędna X komórki (0-indexed)
   * @param y - Współrzędna Y komórki (0-indexed)
   * @param plantName - Nazwa rośliny (opcjonalnie, do weryfikacji)
   */
  async hasPlantInCell(x: number, y: number, plantName?: string): Promise<boolean> {
    const grid = this.page.locator('[role="grid"]').first();
    // aria-label używa 0-based współrzędnych: "Komórka ${x},${y}"
    const cell = grid.locator(`[role="gridcell"][aria-label*="Komórka ${x},${y}"]`).first();

    // Czekaj na pojawienie się komórki
    await expect(cell).toBeVisible({ timeout: 5000 });

    // Czekaj na zaktualizowanie aria-label po dodaniu rośliny (może trwać chwilę)
    // Sprawdzamy czy aria-label zawiera "roślina:" - maksymalnie 5 sekund
    const maxWaitTime = 5000;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      const ariaLabel = await cell.getAttribute("aria-label");
      if (ariaLabel && ariaLabel.includes("roślina:")) {
        // Roślina jest w komórce - sprawdź nazwę jeśli podano
        if (plantName) {
          return ariaLabel.toLowerCase().includes(plantName.toLowerCase());
        }
        return true;
      }
      await this.page.waitForTimeout(200); // Czekaj 200ms przed kolejną próbą
    }

    // Po timeout sprawdź jeszcze raz
    const ariaLabel = await cell.getAttribute("aria-label");
    if (!ariaLabel) return false;

    const hasPlant = ariaLabel.includes("roślina:");
    if (!hasPlant) return false;

    if (plantName) {
      return ariaLabel.toLowerCase().includes(plantName.toLowerCase());
    }

    return true;
  }

  /**
   * Inicjalizacja locatorów dla AddPlantDialog
   */
  private initializeAddPlantDialogLocators() {
    // Dialog - używamy role="dialog" z tytułem "Dodaj roślinę"
    this.addPlantDialog = this.page.getByRole("dialog", { name: /dodaj roślinę/i });

    // Tytuł dialogu
    this.addPlantDialogTitle = this.addPlantDialog.getByRole("heading", { name: /dodaj roślinę/i });

    // Input wyszukiwania - używamy placeholder lub label
    this.addPlantDialogSearchInput = this.addPlantDialog
      .getByPlaceholder(/wpisz nazwę rośliny/i)
      .or(this.addPlantDialog.locator('input[type="text"]').first());

    // Przycisk wyszukiwania
    this.addPlantDialogSearchButton = this.addPlantDialog
      .getByRole("button", { name: /szukaj/i })
      .or(this.addPlantDialog.getByRole("button", { name: /szukam/i }));

    // Lista wyników wyszukiwania
    this.addPlantDialogSearchResults = this.addPlantDialog
      .locator('[role="list"]')
      .or(this.addPlantDialog.locator(".space-y-2").first());

    // PlantFitDisplay - używamy nagłówka "Ocena dopasowania"
    this.addPlantDialogPlantFitDisplay = this.addPlantDialog
      .getByText(/ocena dopasowania/i)
      .locator("..")
      .or(this.addPlantDialog.locator('[data-testid="plant-fit-display"]'));

    // Przyciski w DialogFooter
    this.addPlantDialogCancelButton = this.addPlantDialog.getByRole("button", { name: /anuluj/i });
    this.addPlantDialogConfirmButton = this.addPlantDialog.getByRole("button", { name: /dodaj roślinę/i });
    this.addPlantDialogSkipFitButton = this.addPlantDialog.getByRole("button", { name: /dodaj bez oceny/i });
  }

  /**
   * Inicjalizacja locatorów dla CellNotSoilDialog
   */
  private initializeCellNotSoilDialogLocators() {
    // Komunikat może być wyświetlony jako AlertDialog lub jako Alert w sidebarze
    // Najpierw sprawdzamy sidebar (gdzie zwykle jest wyświetlany jako Alert z role="alert")
    // Komunikat zawiera tekst: "Rośliny można dodawać tylko na pola typu"
    // AlertDescription jest wewnątrz Alert, więc szukamy bezpośrednio tekstu
    this.cellNotSoilDialog = this.sideDrawer
      .getByRole("alert")
      .filter({ hasText: /rośliny można dodawać tylko na pola typu/i })
      .or(this.sideDrawer.getByText(/rośliny można dodawać tylko na pola typu/i).locator(".."))
      .or(this.page.getByRole("alertdialog").filter({ hasText: /rośliny można dodawać tylko/i }))
      .first();

    // Tytuł/komunikat - może być w sidebarze jako zwykły tekst lub jako heading w dialogu
    this.cellNotSoilDialogTitle = this.sideDrawer
      .getByText(/rośliny można dodawać tylko na pola typu/i)
      .or(this.page.getByRole("heading", { name: /nieprawidłowy typ pola/i }))
      .first();

    // Opis dialogu - zawiera informację o typie komórki
    // Używamy tekstu "Rośliny można dodawać tylko na pola typu" jako głównego selektora
    // AlertDescription jest wewnątrz Alert, więc szukamy bezpośrednio tekstu
    this.cellNotSoilDialogDescription = this.sideDrawer
      .getByRole("alert")
      .getByText(/rośliny można dodawać tylko na pola typu/i)
      .or(this.sideDrawer.getByText(/rośliny można dodawać tylko na pola typu/i))
      .or(
        this.page
          .getByRole("alertdialog")
          .filter({ hasText: /rośliny można dodawać tylko/i })
          .locator("div")
          .filter({ hasText: /rośliny można dodawać tylko/i })
          .first()
      )
      .first();

    // Przycisk zamknięcia - może być w sidebarze lub w dialogu (może nie być w sidebarze)
    this.cellNotSoilDialogCloseButton = this.sideDrawer
      .getByRole("button", { name: /rozumiem/i })
      .or(this.page.getByRole("button", { name: /rozumiem/i }))
      .first();
  }

  /**
   * Sprawdzenie, czy AddPlantDialog jest widoczny
   */
  async isAddPlantDialogVisible(): Promise<boolean> {
    return await this.addPlantDialog.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Otwarcie formularza dodawania rośliny przez panel boczny
   * UWAGA: Wymaga przełączenia na zakładkę "Rośliny" -> "Wyszukaj" w panelu bocznym
   * @param x - Współrzędna X komórki (0-indexed)
   * @param y - Współrzędna Y komórki (0-indexed)
   */
  async openAddPlantDialog(x: number, y: number) {
    // Krok 1: Przełącz boczny panel na zakładkę "Rośliny"
    await this.openPlantsTab();

    // Krok 2: Przełącz na zakładkę "Wyszukaj" w PlantsTab
    await this.openPlantsSearchTab();

    // Krok 3: Upewnij się, że narzędzie "add_plant" jest aktywne
    await this.addPlantTool.click();
    await this.page.waitForTimeout(300);

    // Krok 4: Kliknij komórkę, aby ją zaznaczyć (ustawi selectedCell)
    await this.clickCell(x, y);
    await this.page.waitForTimeout(300);

    // Krok 5: Sprawdź czy pojawił się CellNotSoilDialog (jeśli komórka nie jest typu "soil")
    const cellNotSoilDialogVisible = await this.cellNotSoilDialog.isVisible({ timeout: 2000 }).catch(() => false);
    if (cellNotSoilDialogVisible) {
      throw new Error(`Komórka (${x}, ${y}) nie jest typu "soil" - pojawił się CellNotSoilDialog`);
    }

    // Krok 6: Weryfikacja, że formularz wyszukiwania jest widoczny w panelu bocznym
    await expect(this.plantQueryInput).toBeVisible({ timeout: 3000 });
  }

  /**
   * Wyszukiwanie rośliny w formularzu wyszukiwania (panel boczny)
   * @param plantName - Nazwa rośliny do wyszukania
   */
  async searchPlantInDialog(plantName: string) {
    // Wypełnij pole wyszukiwania w panelu bocznym
    await this.plantQueryInput.fill(plantName);

    // Czekaj na odpowiedź API (wyszukiwanie)
    const searchResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/api/ai/plants/search") && response.request().method() === "POST",
      { timeout: 15000 }
    );

    // Kliknij przycisk "Szukaj" (ikona Search w panelu bocznym)
    const searchButton = this.sideDrawer
      .getByRole("button", { name: /szukaj/i })
      .or(this.sideDrawer.locator('button[title="Szukaj"]'));
    await searchButton.click();

    // Czekaj na odpowiedź API
    const searchResponse = await searchResponsePromise;
    expect(searchResponse.status()).toBe(200);

    // Czekaj na pojawienie się wyników (lub komunikatu o braku wyników)
    await this.page.waitForTimeout(500);
  }

  /**
   * Wybór kandydata z wyników wyszukiwania
   * @param candidateIndex - Indeks kandydata w liście (0-indexed)
   */
  async selectCandidateInDialog(candidateIndex: number) {
    // Znajdź wszystkie przyciski kandydatów w panelu bocznym
    // Kandydaci są wyświetlani jako przyciski w sekcji "Wyniki wyszukiwania"
    // Każdy przycisk ma ikonę Sprout i zawiera nazwę rośliny
    const resultsLabel = this.sideDrawer.getByText(/wyniki wyszukiwania/i);
    await expect(resultsLabel).toBeVisible({ timeout: 5000 });

    // Znajdź sekcję z wynikami - przejdź do parent div, który zawiera listę przycisków
    // Struktura: Label -> div (space-y-2) -> div (space-y-2) -> Button[]
    const resultsContainer = resultsLabel.locator("..").locator("..").locator("div.space-y-2").last();

    // Znajdź wszystkie przyciski w sekcji wyników
    // Przyciski kandydatów mają klasę "w-full justify-start" i zawierają ikonę Sprout
    const candidateButtons = resultsContainer.locator("button.w-full.justify-start");

    // Sprawdź ile jest kandydatów
    const candidateCount = await candidateButtons.count();
    if (candidateCount === 0) {
      throw new Error("Nie znaleziono żadnych kandydatów w wynikach wyszukiwania");
    }

    if (candidateIndex >= candidateCount) {
      throw new Error(`Indeks kandydata ${candidateIndex} jest poza zakresem (dostępne: 0-${candidateCount - 1})`);
    }

    // Wybierz kandydata po indeksie
    const candidate = candidateButtons.nth(candidateIndex);
    await expect(candidate).toBeVisible({ timeout: 5000 });

    // Czekaj na odpowiedź API (sprawdzanie dopasowania)
    const fitResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/api/ai/plants/fit") && response.request().method() === "POST",
      { timeout: 40000 }
    );

    // Kliknij kandydata
    await candidate.click();

    // Czekaj na odpowiedź API
    const fitResponse = await fitResponsePromise;
    expect(fitResponse.status()).toBe(200);

    // Czekaj na pojawienie się wyników oceny w panelu bocznym
    await this.page.waitForTimeout(1000);
  }

  /**
   * Potwierdzenie dodania rośliny w AddPlantDialog
   */
  async confirmAddPlantInDialog() {
    // Czekaj na odpowiedź API (dodanie rośliny)
    const addPlantResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans/") &&
        response.url().includes("/plants/") &&
        (response.request().method() === "PUT" || response.request().method() === "POST"),
      { timeout: 15000 }
    );

    // Kliknij przycisk "Dodaj roślinę" w panelu bocznym (w PlantSearchForm)
    // Przycisk pojawia się po wyborze kandydata i otrzymaniu wyników fit
    const addPlantButton = this.sideDrawer.getByRole("button", { name: /dodaj roślinę/i });
    await expect(addPlantButton).toBeVisible({ timeout: 10000 });
    await addPlantButton.click();

    // Czekaj na odpowiedź API
    const addPlantResponse = await addPlantResponsePromise;
    expect(addPlantResponse.status()).toBe(200);

    // Czekaj na zaktualizowanie siatki
    await this.page.waitForTimeout(1000);
  }

  /**
   * Anulowanie dodania rośliny w AddPlantDialog
   */
  async cancelAddPlantDialog() {
    await this.addPlantDialogCancelButton.click();
    await expect(this.addPlantDialog).toBeHidden({ timeout: 2000 });
  }

  /**
   * Otwarcie zakładki "Pogoda" w SideDrawer
   */
  async openWeatherTab() {
    await this.weatherTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Sprawdzenie, czy WeatherTab jest widoczny
   */
  async isWeatherTabVisible(): Promise<boolean> {
    return await this.weatherTab.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Sprawdzenie, czy WeatherTab wyświetla stan loading
   */
  async isWeatherLoading(): Promise<boolean> {
    const loadingText = this.page.getByText(/ładowanie danych pogodowych/i);
    return await loadingText.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Sprawdzenie, czy WeatherTab wyświetla empty state
   */
  async isWeatherEmpty(): Promise<boolean> {
    const emptyText = this.page.getByText(/brak danych pogodowych/i);
    return await emptyText.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Sprawdzenie, czy WeatherTab wyświetla dane (wykres i tabela)
   */
  async hasWeatherData(): Promise<boolean> {
    // Sprawdź czy nagłówek "Dane pogodowe" jest widoczny
    const header = this.page.getByRole("heading", { name: /dane pogodowe/i });
    const hasHeader = await header.isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasHeader) return false;

    // Sprawdź czy wykres (SVG) jest widoczny
    const chart = this.page.locator("svg").first();
    const hasChart = await chart.isVisible({ timeout: 2000 }).catch(() => false);

    // Sprawdź czy tabela jest widoczna
    const table = this.page.getByRole("table");
    const hasTable = await table.isVisible({ timeout: 2000 }).catch(() => false);

    return hasChart && hasTable;
  }

  /**
   * Sprawdzenie, czy WeatherTab wyświetla błąd
   */
  async hasWeatherError(): Promise<boolean> {
    const errorAlert = this.page.getByRole("alert").first();
    return await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Pobranie tekstu błędu z WeatherTab
   */
  async getWeatherError(): Promise<string> {
    const errorAlert = this.page.getByRole("alert").first();
    const description = errorAlert.locator('[role="alert"]').or(errorAlert.getByText(/./));
    return (await description.textContent()) || "";
  }

  /**
   * Sprawdzenie, czy CellNotSoilDialog jest widoczny
   */
  async isCellNotSoilDialogVisible(): Promise<boolean> {
    return await this.cellNotSoilDialog.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Pobranie tekstu opisu z CellNotSoilDialog
   * Zwraca pełny tekst opisu dialogu (wszystkie divy w AlertDialogDescription)
   */
  async getCellNotSoilDialogDescription(): Promise<string> {
    // Pobierz cały tekst z AlertDialogDescription
    // AlertDialogDescription może zawierać wiele divów, więc pobieramy cały tekst z dialogu
    // i filtrujemy tylko część z opisem (pomijamy tytuł i przyciski)
    const descriptionElement = this.cellNotSoilDialog
      .locator("div")
      .filter({ hasText: /rośliny można dodawać tylko/i })
      .first();
    const description = await descriptionElement.textContent();
    return description || "";
  }

  /**
   * Zamknięcie CellNotSoilDialog przez kliknięcie przycisku "Rozumiem"
   */
  async closeCellNotSoilDialog() {
    await this.cellNotSoilDialogCloseButton.click();
    await expect(this.cellNotSoilDialog).toBeHidden({ timeout: 2000 });
  }

  /**
   * Otwarcie podzakładki "Lista" w zakładce roślin
   */
  async openPlantsListTab() {
    await this.openPlantsTab();
    // Znajdź zakładkę "Lista" w PlantsTab
    const listTab = this.page.getByRole("tab", { name: /lista/i });
    await expect(listTab).toBeVisible();
    await listTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Znajdź przycisk usuwania dla rośliny o określonej nazwie
   * @param plantName - Nazwa rośliny (może być częściowa, np. "bazylia" dla "Bazylia pospolita")
   * @returns Locator przycisku usuwania (Button z klasą text-destructive)
   */
  getDeletePlantButton(plantName: string): Locator {
    // Znajdź kartę rośliny po nazwie (PlantCard używa Card component z data-slot="card")
    // Karta zawiera nazwę rośliny (plant.plant_name) i współrzędne (x: y:)
    // Używamy getByText dla bardziej elastycznego wyszukiwania (case-insensitive przez Playwright)
    const plantCard = this.page
      .locator('div[data-slot="card"]')
      .filter({ has: this.page.getByText(plantName, { exact: false }) })
      .filter({ hasText: /x:.*y:/i })
      .first();

    // W PlantCard przycisk usuwania ma klasę "text-destructive" (czerwony kolor)
    // Znajdź bezpośrednio button z tą klasą w kontekście znalezionej karty
    // Button jest wewnątrz TooltipTrigger, ale możemy go znaleźć bezpośrednio po klasie
    return plantCard.locator('button[class*="text-destructive"]').first();
  }

  /**
   * Usunięcie rośliny przez SideDrawer
   * @param plantName - Nazwa rośliny do usunięcia
   */
  async deletePlant(plantName: string) {
    // Otwórz zakładkę "Lista" w PlantsTab
    await this.openPlantsListTab();

    // Znajdź przycisk usuwania dla rośliny
    const deleteButton = this.getDeletePlantButton(plantName);
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    // Czekaj na odpowiedź API (usunięcie rośliny) - PO akceptacji dialogu
    const deleteResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans/") &&
        response.url().includes("/plants/") &&
        response.request().method() === "DELETE",
      { timeout: 15000 }
    );

    // Kliknij przycisk usuwania
    await deleteButton.click();

    // Oczekiwanie na pojawienie się AlertDialog (DeletePlantConfirmDialog)
    const deletePlantDialog = this.page.getByRole("alertdialog");
    await expect(deletePlantDialog).toBeVisible({ timeout: 5000 });

    // Weryfikacja zawartości dialogu (case-insensitive dla nazwy rośliny)
    await expect(deletePlantDialog).toContainText(new RegExp(plantName, "i"));
    await expect(deletePlantDialog).toContainText(/czy na pewno chcesz usunąć/i);

    // Znajdź i kliknij przycisk "Usuń" w dialogu
    const confirmDeleteButton = deletePlantDialog.getByRole("button", { name: /usuń/i });
    await expect(confirmDeleteButton).toBeVisible();
    await confirmDeleteButton.click();

    // Czekaj na odpowiedź API
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(204); // 204 No Content dla DELETE

    // Czekaj na zaktualizowanie listy (roślina powinna zniknąć)
    await this.page.waitForTimeout(1000);
  }

  /**
   * Sprawdzenie, czy roślina jest widoczna w liście roślin
   * @param plantName - Nazwa rośliny
   * @returns true jeśli roślina jest widoczna w liście
   */
  async isPlantInList(plantName: string): Promise<boolean> {
    await this.openPlantsListTab();
    const plantCard = this.page.getByText(plantName).first();
    return await plantCard.isVisible({ timeout: 2000 }).catch(() => false);
  }
}
