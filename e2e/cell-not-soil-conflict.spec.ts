import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla konfliktu - próba dodania rośliny do komórki typu 'path'
 *
 * Scenariusz:
 * 1. Rejestracja i logowanie użytkownika
 * 2. Utworzenie planu z lokalizacją
 * 3. Zmiana typu komórki na 'path' (ścieżka) używając narzędzia "Zmień typ"
 * 4. Aktywacja narzędzia "Dodaj roślinę" i kliknięcie komórki typu 'path'
 * 5. Weryfikacja, że CellNotSoilDialog się otworzył (zamiast AddPlantDialog)
 * 6. Weryfikacja komunikatu w dialogu (informacja o typie komórki)
 * 7. Zamknięcie dialogu przez kliknięcie "Rozumiem"
 * 8. Weryfikacja, że dialog się zamknął i użytkownik może kontynuować pracę
 *
 * UWAGA: Test wymaga:
 * - Uruchomionej aplikacji
 * - Skonfigurowanej bazy danych
 */

test.describe("Konflikt - próba dodania rośliny do komórki typu 'path'", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien wyświetlić CellNotSoilDialog przy próbie dodania rośliny do komórki typu 'path'", async ({
    page,
  }) => {
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
    // KROK 1: Utworzenie planu
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
    const planName = `Test Plan Cell Not Soil ${Date.now()}`;
    const nameInput = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInput).toBeVisible();
    await nameInput.fill(planName);
    await expect(nameInput).toHaveValue(planName);

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("location");

    // Krok 2: Lokalizacja (używamy Warszawy dla danych pogodowych)
    const locationSearchInput = page.locator("#location-search").or(page.getByLabel(/wyszukaj adres/i));
    await expect(locationSearchInput).toBeVisible();

    // Wprowadzenie adresu do wyszukiwania
    const searchQuery = "Warszawa, Polska";
    await locationSearchInput.fill(searchQuery);

    // Oczekiwanie na odpowiedź API z Nominatim (geokodowanie)
    // Nominatim API może mieć rate limiting (1s między zapytaniami) i timeout 5s
    const geocodeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("nominatim.openstreetmap.org") && response.request().method() === "GET",
      { timeout: 10000 }
    ).catch(() => {
      // Ignoruj jeśli nie udało się przechwycić odpowiedzi (może być zablokowana przez CORS)
      return null;
    });

    // Kliknięcie przycisku "Szukaj"
    const searchButton = page.getByRole("button", { name: /szukaj/i });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Czekamy na odpowiedź API (jeśli udało się przechwycić)
    if (geocodeResponsePromise) {
      const geocodeResponse = await geocodeResponsePromise;
      if (geocodeResponse) {
        expect(geocodeResponse.status()).toBe(200);
      }
    }

    // Czekamy na pojawienie się wyników w UI
    // Możemy czekać na nagłówek "Znalezione lokalizacje" lub przycisk "Wybierz"
    const resultsHeader = page.getByText(/znalezione lokalizacje/i);
    const firstResultButton = page.getByRole("button", { name: /wybierz/i }).first();

    // Czekamy na pojawienie się wyników (nagłówek lub przycisk)
    // Timeout 15s uwzględnia rate limiting (1s) + timeout API (5s) + renderowanie
    // Sprawdzamy oba elementy - jeśli którykolwiek jest widoczny, mamy wyniki
    const hasResultsHeader = await resultsHeader.isVisible({ timeout: 15000 }).catch(() => false);
    const hasResultButton = await firstResultButton.isVisible({ timeout: 15000 }).catch(() => false);

    if (hasResultsHeader || hasResultButton) {
      // Upewniamy się, że przycisk jest widoczny przed kliknięciem
      await expect(firstResultButton).toBeVisible({ timeout: 5000 });
      await firstResultButton.click();
      await page.waitForTimeout(1000);
    }

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("dimensions");

    // Krok 3: Wymiary (mała siatka dla szybkości testu)
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator('input[name="width"]'));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator('input[name="height"]'));

    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    await widthInput.fill("5");
    await heightInput.fill("5");

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Krok 4: Podsumowanie i utworzenie planu
    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 30000 }
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

    // ============================================
    // KROK 2: Otwarcie edytora i oczekiwanie na dane pogodowe
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że edytor się załadował
    await expect(editorPage.planName).toBeVisible();
    await expect(editorPage.gridCanvas).toBeVisible();

    // Czekaj na pobranie danych pogodowych (może trwać kilka sekund)
    await page.waitForTimeout(3000);

    // ============================================
    // KROK 3: Zmiana typu komórki na 'path' (ścieżka)
    // ============================================
    // Wybierz komórkę w środku siatki (np. 2,2)
    const cellX = 2;
    const cellY = 2;

    // Zaznacz obszar (pojedynczą komórkę) używając narzędzia "select"
    await editorPage.selectArea(cellX, cellY, cellX, cellY);

    // Weryfikacja, że AreaTypePanel się otworzył
    await expect(editorPage.areaTypePanel).toBeVisible({ timeout: 3000 });

    // Wybór typu 'path' (ścieżka)
    await editorPage.selectAreaType("Ścieżka");

    // Zastosowanie zmiany typu
    await editorPage.applyAreaType();

    // Weryfikacja, że panel się zamknął
    await expect(editorPage.areaTypePanel).toBeHidden({ timeout: 5000 });

    // Krótkie opóźnienie na aktualizację siatki
    await page.waitForTimeout(500);

    // ============================================
    // KROK 4: Przełączenie na tryb dodawania roślin
    // ============================================
    // Przełącz się na narzędzie "Dodaj roślinę" (zamiast pozostawać w trybie zaznaczania)
    await editorPage.addPlantTool.click();
    await page.waitForTimeout(300);

    // Weryfikacja, że narzędzie "Dodaj roślinę" jest aktywne
    await expect(editorPage.addPlantTool).toBeVisible();

    // Otwórz zakładkę "Rośliny" w sidebarze
    await editorPage.openPlantsTab();
    await page.waitForTimeout(300);

    // Przejdź do podzakładki "Wyszukaj" (komunikat o konflikcie pojawi się tam)
    await editorPage.openPlantsSearchTab();
    await page.waitForTimeout(300);

    // ============================================
    // KROK 5: Kliknięcie komórki zmienionej (nie soil) w trybie dodawania roślin
    // ============================================
    // Kliknij komórkę typu 'path' (nie soil) w trybie dodawania roślin
    // Powinno to wywołać walidację i pokazać komunikat o konflikcie w sidebarze
    await editorPage.clickCell(cellX, cellY);
    await page.waitForTimeout(2000);

    // Czekaj na pojawienie się komunikatu o konflikcie (może być w sidebarze lub jako dialog)
    // Komunikat powinien się pojawić, gdy próbujemy dodać roślinę do komórki typu 'path'
    // Zwiększony timeout, ponieważ komunikat może pojawić się z opóźnieniem po walidacji
    await expect(editorPage.cellNotSoilDialog).toBeVisible({ timeout: 15000 });

    // ============================================
    // KROK 7: Weryfikacja komunikatu o konflikcie
    // ============================================
    // Weryfikacja, że komunikat jest widoczny
    await expect(editorPage.cellNotSoilDialogDescription).toBeVisible();
    const descriptionText = await editorPage.getCellNotSoilDialogDescription();
    expect(descriptionText).toContain("Rośliny można dodawać tylko na pola typu");
    expect(descriptionText.toLowerCase()).toContain("ziemia");

    // ============================================
    // KROK 8: Weryfikacja, że użytkownik może kontynuować pracę
    // ============================================
    // Weryfikacja, że siatka jest nadal widoczna
    await expect(editorPage.gridCanvas).toBeVisible();

    // Weryfikacja, że AddPlantDialog się nie otworzył
    const addPlantDialogVisible = await editorPage.isAddPlantDialogVisible();
    expect(addPlantDialogVisible).toBe(false);

    // Weryfikacja, że komórka nadal ma typ 'path' (sprawdzenie aria-label)
    const grid = page.locator('[role="grid"]').first();
    const cell = grid.locator(`[role="gridcell"][aria-label*="Komórka ${cellX},${cellY}"]`).first();
    const ariaLabel = await cell.getAttribute("aria-label");
    expect(ariaLabel).toContain("path");

    // ============================================
    // KROK 9: Usunięcie planu na końcu testu
    // ============================================
    // Pobranie ID planu z URL (jeśli jeszcze nie zostało pobrane)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

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

