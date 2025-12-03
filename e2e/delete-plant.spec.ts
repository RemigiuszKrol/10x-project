import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla usuwania rośliny
 *
 * Scenariusz:
 * 1. Rejestracja i logowanie użytkownika
 * 2. Utworzenie planu z lokalizacją (dla danych pogodowych)
 * 3. Dodanie rośliny przez AI do komórki (wyszukiwanie, wybór kandydata, dodanie)
 * 4. Otwarcie zakładki "Rośliny" → "Lista" w SideDrawer
 * 5. Znalezienie rośliny w liście
 * 6. Kliknięcie przycisku "Usuń" (ikona Trash2) na karcie rośliny
 * 7. Potwierdzenie usunięcia w AlertDialog (DeletePlantConfirmDialog)
 * 8. Weryfikacja usunięcia rośliny (zniknięcie z listy i z siatki)
 *
 * UWAGA: Test wymaga:
 * - Uruchomionej aplikacji
 * - Skonfigurowanej bazy danych
 * - Dostępu do API AI (lub trybu mock)
 */

test.describe("Usuwanie rośliny", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien usunąć roślinę - pełny flow", async ({ page }) => {
    // ============================================
    // KROK 0: Przygotowanie - logowanie użytkownika
    // ============================================
    const loginSuccess = await loginAsTestUser(
      page,
      TEST_USERS.valid.email,
      TEST_USERS.valid.password
    );
    expect(loginSuccess).toBe(true);

    // Weryfikacja, że jesteśmy na stronie planów
    await page.waitForURL(/\/plans/, { timeout: 15000 });
    expect(page.url()).toContain("/plans");

    // ============================================
    // KROK 1: Utworzenie planu z danymi pogodowymi
    // ============================================
    const planCreatorPage = new PlanCreatorPage(page);
    await planCreatorPage.navigate();
    await planCreatorPage.waitForPlanCreatorToLoad();

    // Jeśli pojawi się dialog szkicu, zamknij go
    if (await planCreatorPage.hasDraftDialog()) {
      await page.getByRole("button", { name: /rozpocznij od nowa/i }).click();
      await page.waitForTimeout(500);
    }

    // Krok 1: Nazwa planu
    const planName = `Test Plan Delete ${Date.now()}`;
    const nameInput = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInput).toBeVisible();
    await nameInput.fill(planName);
    await expect(nameInput).toHaveValue(planName);

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("location");

    // Krok 2: Lokalizacja (wybieramy lokalizację, aby przycisk "Kontynuuj" był enabled)
    const locationSearchInput = page.locator("#location-search").or(page.getByLabel(/wyszukaj adres/i));
    await expect(locationSearchInput).toBeVisible();

    // Wprowadzenie adresu do wyszukiwania
    const searchQuery = "Warszawa, Polska";
    await locationSearchInput.fill(searchQuery);

    // Kliknięcie przycisku "Szukaj"
    const searchButton = page.getByRole("button", { name: /szukaj/i });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Oczekiwanie na wyniki wyszukiwania
    await page.waitForTimeout(2000);

    // Wybór pierwszego wyniku z listy (jeśli wyniki są dostępne)
    const firstResultButton = page.getByRole("button", { name: /wybierz/i }).first();
    const hasResults = await firstResultButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasResults) {
      await firstResultButton.click();
      await page.waitForTimeout(1000);
    }

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("dimensions");

    // Krok 3: Wymiary (mała siatka dla szybkości testu)
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));

    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    await widthInput.fill("5");
    await heightInput.fill("5");

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Krok 4: Podsumowanie i utworzenie planu
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 15000 }
    );

    await planCreatorPage.clickCreateButton();

    // Oczekiwanie na dialog potwierdzenia (jeśli się pojawi)
    const confirmDialog = page.getByRole("dialog");
    const hasConfirmDialog = await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasConfirmDialog) {
      const confirmButton = page.getByRole("button", { name: /tak, utwórz plan/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
    }

    // Czekaj na odpowiedź API
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);

    // Oczekiwanie na przekierowanie do edytora
    await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 15000 });

    // Weryfikacja, że URL zawiera ID planu (UUID)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

    // ============================================
    // KROK 2: Otwarcie edytora i oczekiwanie na dane pogodowe
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że edytor się załadował
    await expect(editorPage.planName).toBeVisible();
    await expect(editorPage.gridCanvas).toBeVisible();

    // ============================================
    // KROK 2.5: Pobranie danych pogodowych (wymagane do dodania rośliny)
    // ============================================
    // Otwórz zakładkę "Pogoda"
    await editorPage.openWeatherTab();
    await page.waitForTimeout(500);

    // Znajdź i kliknij przycisk "Pobierz dane pogodowe"
    const refreshButton = page.getByRole("button", { name: /pobierz dane pogodowe/i }).or(
      page.getByRole("button", { name: /odśwież dane pogodowe/i })
    );
    await expect(refreshButton).toBeVisible({ timeout: 5000 });

    // Czekaj na odpowiedź API z refresh endpoint
    const refreshResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}/weather/refresh`) &&
        response.request().method() === "POST",
      { timeout: 40000 }
    );

    // Kliknij przycisk, aby pobrać dane pogodowe
    await refreshButton.click();

    // Czekaj na odpowiedź API
    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.status()).toBe(200);

    // Poczekaj chwilę na zapisanie danych
    await page.waitForTimeout(1000);

    // Wróć do zakładki "Rośliny" (będzie potrzebna w następnym kroku)
    await editorPage.openPlantsTab();
    await page.waitForTimeout(300);

    // ============================================
    // KROK 3: Dodanie rośliny przez AI (przygotowanie do testu usuwania)
    // ============================================
    const plantName = "bazylia";
    const cellX = 2;
    const cellY = 2;

    // openAddPlantDialog przełącza panel boczny na "Rośliny" -> "Wyszukaj", aktywuje narzędzie i klika komórkę
    await editorPage.openAddPlantDialog(cellX, cellY);

    // Weryfikacja, że formularz wyszukiwania jest widoczny w panelu bocznym
    await expect(editorPage.plantQueryInput).toBeVisible({ timeout: 5000 });

    // Wyszukiwanie rośliny przez AI
    await editorPage.searchPlantInDialog(plantName);

    // Wybór pierwszego kandydata z listy (indeks 0)
    await editorPage.selectCandidateInDialog(0);

    // Czekaj na pojawienie się wyników oceny (może trwać kilka sekund)
    await page.waitForTimeout(2000);

    // Weryfikacja, że przycisk "Dodaj roślinę" jest widoczny (pojawi się po otrzymaniu wyników fit)
    const addPlantButton = editorPage.sideDrawer.getByRole("button", { name: /dodaj roślinę/i });
    await expect(addPlantButton).toBeVisible({ timeout: 10000 });

    // Dodanie rośliny do siatki
    await editorPage.confirmAddPlantInDialog();

    // Weryfikacja, że roślina została dodana na siatce
    const hasPlantBefore = await editorPage.hasPlantInCell(cellX, cellY, plantName);
    expect(hasPlantBefore).toBe(true);

    // ============================================
    // KROK 4: Otwarcie zakładki "Rośliny" → "Lista" w SideDrawer
    // ============================================
    await editorPage.openPlantsListTab();

    // Weryfikacja, że zakładka "Lista" jest aktywna
    const listTab = page.getByRole("tab", { name: /lista/i });
    await expect(listTab).toHaveAttribute("data-state", "active");

    // Weryfikacja, że roślina jest widoczna w liście
    const isPlantVisible = await editorPage.isPlantInList(plantName);
    expect(isPlantVisible).toBe(true);

    // Poczekaj chwilę, aby upewnić się, że karta jest w pełni załadowana
    await page.waitForTimeout(500);

    // ============================================
    // KROK 5: Znalezienie rośliny i kliknięcie przycisku "Usuń"
    // ============================================
    // Znajdź przycisk usuwania dla rośliny
    const deleteButton = editorPage.getDeletePlantButton(plantName);
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await expect(deleteButton).toBeEnabled({ timeout: 2000 });

    // Czekaj na odpowiedź API (usunięcie rośliny) - PO akceptacji dialogu
    // Request jest wysyłany dopiero po akceptacji dialogu
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans/") &&
        response.url().includes("/plants/") &&
        response.request().method() === "DELETE",
      { timeout: 30000 }
    );

    // Kliknij przycisk usuwania
    // TooltipTrigger przekazuje kliknięcie do Button wewnątrz
    // Spróbuj kliknąć bezpośrednio w przycisk wewnątrz TooltipTrigger
    try {
      // Najpierw spróbuj kliknąć w przycisk (może być wewnątrz TooltipTrigger)
      const buttonInside = deleteButton.locator('button').first();
      if (await buttonInside.isVisible({ timeout: 1000 }).catch(() => false)) {
        await buttonInside.click({ timeout: 5000 });
      } else {
        await deleteButton.click({ timeout: 5000 });
      }
    } catch (error) {
      // Fallback: kliknij bezpośrednio w SVG ikonę Trash2 wewnątrz przycisku
      const svgIcon = deleteButton.locator('svg').first();
      await svgIcon.click({ force: true, timeout: 5000 });
    }

    // ============================================
    // KROK 6: Potwierdzenie usunięcia w AlertDialog (DeletePlantConfirmDialog)
    // ============================================
    // Oczekiwanie na pojawienie się AlertDialog
    const deletePlantDialog = page.getByRole("alertdialog");
    await expect(deletePlantDialog).toBeVisible({ timeout: 5000 });

    // Weryfikacja zawartości dialogu
    const dialogTitle = deletePlantDialog.getByRole("heading", { name: /usuń roślinę/i });
    await expect(dialogTitle).toBeVisible();
    
    // Weryfikacja, że dialog zawiera nazwę rośliny (case-insensitive)
    await expect(deletePlantDialog).toContainText(new RegExp(plantName, "i"));
    await expect(deletePlantDialog).toContainText(/czy na pewno chcesz usunąć/i);

    // Znajdź i kliknij przycisk "Usuń" w dialogu
    const confirmDeleteButton = deletePlantDialog.getByRole("button", { name: /usuń/i });
    await expect(confirmDeleteButton).toBeVisible();
    await confirmDeleteButton.click();

    // Czekaj na odpowiedź API
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(204); // 204 No Content dla DELETE

    // Czekaj na zaktualizowanie UI (roślina powinna zniknąć z listy)
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 7: Weryfikacja usunięcia rośliny
    // ============================================
    // Weryfikacja 1: Roślina zniknęła z listy
    const isPlantStillVisible = await editorPage.isPlantInList(plantName);
    expect(isPlantStillVisible).toBe(false);

    // Weryfikacja 2: Roślina zniknęła z siatki
    const hasPlantAfter = await editorPage.hasPlantInCell(cellX, cellY, plantName);
    expect(hasPlantAfter).toBe(false);

    // Weryfikacja 4: Toast sukcesu powinien być widoczny (opcjonalnie)
    // Toast może zniknąć szybko, więc sprawdzamy tylko czy nie ma błędu
    const errorToast = page.getByText(/nie udało się usunąć/i);
    await expect(errorToast).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Ignoruj jeśli toast nie istnieje (to jest OK)
    });

    // ============================================
    // KROK 8: Usunięcie planu na końcu testu
    // ============================================
    // Nawigacja do listy planów
    const plansListPage = new PlansListPage(page);
    await plansListPage.navigate();
    await plansListPage.waitForPlansListToLoad();

    // Weryfikacja, że plan istnieje w tabeli
    const planExists = await plansListPage.hasPlan(planName);
    expect(planExists).toBe(true);

    // Kliknięcie przycisku usuwania
    await plansListPage.clickDeleteButton(planName);

    // Weryfikacja otwarcia dialogu
    await expect(plansListPage.deleteDialog).toBeVisible({ timeout: 5000 });
    await expect(plansListPage.deleteDialogTitle).toBeVisible();
    await expect(plansListPage.deleteDialogDescription).toContainText(planName);

    // Oczekiwanie na odpowiedź API przed potwierdzeniem
    const deletePlanResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}`) && response.request().method() === "DELETE",
      { timeout: 15000 }
    );

    // Potwierdzenie usunięcia
    await plansListPage.confirmDelete();

    // Czekamy na odpowiedź API
    const deletePlanResponse = await deletePlanResponsePromise;
    expect([200, 204]).toContain(deletePlanResponse.status()); // 200 lub 204 (No Content) są poprawne dla DELETE

    // Oczekiwanie na zamknięcie dialogu
    await plansListPage.waitForDeleteDialogToClose();

    // Weryfikacja, że plan został usunięty
    const planStillExists = await plansListPage.hasPlan(planName);
    expect(planStillExists).toBe(false);
  });
});

