import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla zmiany typu komórek w siatce planu
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Utworzenie planu (jeśli nie istnieje)
 * 3. Nawigacja do edytora planu
 * 4. Zaznaczenie obszaru w siatce (drag-to-select)
 * 5. Wybór typu komórki w AreaTypePanel
 * 6. Zastosowanie zmiany typu
 * 7. Weryfikacja, że zmiana została zastosowana (panel znika, komórki mają nowy typ)
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 */

test.describe("Zmiana typu komórek - zaznaczenie obszaru i weryfikacja", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien zmienić typ komórek po zaznaczeniu obszaru i wyborze typu", async ({ page }) => {
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
    // KROK 1: Utworzenie planu (jeśli nie istnieje)
    // ============================================
    const planCreatorPage = new PlanCreatorPage(page);
    await planCreatorPage.navigate();
    await planCreatorPage.waitForPlanCreatorToLoad();

    // Jeśli pojawi się dialog szkicu, zamknij go
    if (await planCreatorPage.hasDraftDialog()) {
      await page.getByRole("button", { name: /rozpocznij od nowa/i }).click();
      await page.waitForTimeout(500);
    }

    // Wprowadzenie nazwy planu
    const planName = `Test Plan Cell Type ${Date.now()}`;
    const nameInput = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInput).toBeVisible();
    await nameInput.fill(planName);
    await expect(nameInput).toHaveValue(planName);

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("location");

    // Krok lokalizacji (wybieramy lokalizację, aby przycisk "Kontynuuj" był enabled)
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

    // Krok wymiarów
    await expect(page.getByRole("heading", { name: /wymiary i orientacja/i })).toBeVisible({ timeout: 5000 });

    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));

    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    // Ustawiamy małe wymiary dla łatwiejszego testowania (10x10)
    await widthInput.fill("10");
    await heightInput.fill("10");

    // Wybór rozmiaru kratki (jeśli nie jest domyślnie ustawiony)
    const cellSizeSelectTrigger = page.locator("#cell-size").getByRole("combobox").or(
      page.getByLabel(/rozmiar pojedynczej kratki/i)
    );

    if (await cellSizeSelectTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cellSizeSelectTrigger.click();
      await page.waitForTimeout(500);
      const option50cm = page.getByRole("option", { name: /50 cm/i });
      if (await option50cm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option50cm.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(widthInput).toHaveValue("10");
    await expect(heightInput).toHaveValue("10");

    // Przejście do podsumowania
    const continueButton3 = page.getByRole("button", { name: /kontynuuj/i });
    await expect(continueButton3).toBeVisible();
    await continueButton3.click();
    await page.waitForTimeout(1000);

    // Podsumowanie i utworzenie planu
    await expect(page.getByRole("heading", { name: /podsumowanie/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(planName)).toBeVisible();

    const createPlanResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 30000 }
    );

    const createPlanButton = page.getByRole("button", { name: /utwórz plan/i });
    await expect(createPlanButton).toBeVisible();
    await createPlanButton.click();

    // Oczekiwanie na dialog potwierdzenia (jeśli się pojawi)
    const confirmDialog = page.getByRole("dialog");
    const hasConfirmDialog = await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasConfirmDialog) {
      const confirmButton = page.getByRole("button", { name: /tak, utwórz plan/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
    }

    // Czekamy na odpowiedź API
    const createPlanResponse = await createPlanResponsePromise;
    expect(createPlanResponse.status()).toBe(201);

    // Oczekiwanie na przekierowanie do edytora
    await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Pobranie ID planu z URL
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

    // ============================================
    // KROK 2: Nawigacja do edytora i weryfikacja załadowania
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że edytor się załadował
    await expect(editorPage.planName).toBeVisible();
    const displayedPlanName = await editorPage.getPlanName();
    expect(displayedPlanName).toBe(planName);

    // Weryfikacja, że siatka jest widoczna
    const isGridVisible = await editorPage.isGridVisible();
    expect(isGridVisible).toBe(true);

    // Weryfikacja, że narzędzie "select" jest dostępne
    await expect(editorPage.selectTool).toBeVisible();

    // ============================================
    // KROK 3: Zaznaczenie obszaru w siatce
    // ============================================
    // Zaznaczamy obszar 3x3 komórek (od komórki 0,0 do 2,2)
    await editorPage.selectArea(0, 0, 2, 2);

    // Weryfikacja, że AreaTypePanel się pojawił
    const isPanelVisible = await editorPage.isAreaTypePanelVisible();
    expect(isPanelVisible).toBe(true);

    // Weryfikacja informacji o zaznaczeniu
    const selectionInfo = await editorPage.getSelectionInfo();
    expect(selectionInfo).toContain("Zaznaczono");
    expect(selectionInfo).toContain("komórek");
    // Powinno być 9 komórek (3x3)
    expect(selectionInfo).toMatch(/\d+/);
    const cellCountMatch = selectionInfo.match(/(\d+)/);
    if (cellCountMatch) {
      const cellCount = parseInt(cellCountMatch[1], 10);
      expect(cellCount).toBeGreaterThanOrEqual(9);
    }

    // ============================================
    // KROK 4: Wybór typu komórki
    // ============================================
    // Wybieramy typ "Ścieżka"
    await editorPage.selectAreaType("Ścieżka");

    // Weryfikacja, że przycisk "Zastosuj" jest aktywny
    await expect(editorPage.areaTypeApplyButton).toBeEnabled();

    // ============================================
    // KROK 5: Zastosowanie zmiany typu
    // ============================================
    await editorPage.applyAreaType();

    // Weryfikacja, że panel zniknął po zastosowaniu
    const isPanelHidden = !(await editorPage.isAreaTypePanelVisible());
    expect(isPanelHidden).toBe(true);

    // Krótkie opóźnienie na aktualizację siatki
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 6: Weryfikacja zmiany typu komórek
    // ============================================
    // Sprawdzamy, czy komórki faktycznie mają typ "path" (ścieżka)
    const hasPathType0_0 = await editorPage.hasCellType(0, 0, "path");
    expect(hasPathType0_0).toBe(true);

    const hasPathType1_1 = await editorPage.hasCellType(1, 1, "path");
    expect(hasPathType1_1).toBe(true);

    const hasPathType2_2 = await editorPage.hasCellType(2, 2, "path");
    expect(hasPathType2_2).toBe(true);

    // Ponowne zaznaczenie tego samego obszaru, aby sprawdzić czy typ się zmienił
    await editorPage.selectArea(0, 0, 2, 2);

    // Panel powinien się ponownie pojawić
    await expect(editorPage.areaTypePanel).toBeVisible({ timeout: 3000 });

    // Sprawdź, czy możemy wybrać inny typ (weryfikacja, że zmiana została zapisana)
    // Anuluj to zaznaczenie
    await editorPage.cancelAreaTypeChange();

    // Weryfikacja, że panel zniknął po anulowaniu
    const isPanelHiddenAfterCancel = !(await editorPage.isAreaTypePanelVisible());
    expect(isPanelHiddenAfterCancel).toBe(true);

    // ============================================
    // KROK 7: Dodatkowa weryfikacja - zmiana na inny typ
    // ============================================
    // Zaznaczamy inny obszar (4,4 do 6,6) i zmieniamy na "Woda"
    await editorPage.selectArea(4, 4, 6, 6);

    // Wybieramy typ "Woda"
    await editorPage.selectAreaType("Woda");

    // Zastosuj zmianę
    await editorPage.applyAreaType();

    // Weryfikacja, że panel zniknął
    const isPanelHiddenAfterSecondChange = !(await editorPage.isAreaTypePanelVisible());
    expect(isPanelHiddenAfterSecondChange).toBe(true);

    // Krótkie opóźnienie na aktualizację siatki
    await page.waitForTimeout(1000);

    // Weryfikacja, że komórki mają typ "water" (woda)
    const hasWaterType4_4 = await editorPage.hasCellType(4, 4, "water");
    expect(hasWaterType4_4).toBe(true);

    const hasWaterType6_6 = await editorPage.hasCellType(6, 6, "water");
    expect(hasWaterType6_6).toBe(true);

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

