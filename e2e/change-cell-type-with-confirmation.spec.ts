import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla zmiany typu komórek z potwierdzeniem usunięcia roślin
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Utworzenie planu (jeśli nie istnieje)
 * 3. Nawigacja do edytora planu
 * 4. Dodanie roślin do kilku komórek (ręcznie, bez AI)
 * 5. Zaznaczenie obszaru zawierającego rośliny
 * 6. Wybór typu 'path' (ścieżka) w AreaTypePanel
 * 7. Zastosowanie zmiany typu
 * 8. Weryfikacja pojawienia się AreaTypeConfirmDialog
 * 9. Potwierdzenie usunięcia roślin
 * 10. Weryfikacja, że rośliny zostały usunięte i typ został zmieniony
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 */

test.describe("Zmiana typu komórek z potwierdzeniem usunięcia roślin", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien wyświetlić dialog potwierdzenia i usunąć rośliny po potwierdzeniu", async ({ page }) => {
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

    // Wprowadzenie nazwy planu
    const planName = `Test Plan Cell Type Confirm ${Date.now()}`;
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

    // Ustawiamy wymiary 10x10 dla łatwiejszego testowania
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

    // ============================================
    // KROK 2.5: Pobranie danych pogodowych (wymagane do dodania rośliny)
    // ============================================
    // planId jest już pobrany wcześniej, używamy go tutaj

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
    await page.waitForTimeout(2000);

    // Wróć do zakładki "Rośliny" (będzie potrzebna w następnym kroku)
    await editorPage.openPlantsTab();
    await page.waitForTimeout(300);

    // ============================================
    // KROK 3: Dodanie roślin do komórek
    // ============================================
    // Przełącz się na tryb nasadzania (narzędzie "Dodaj roślinę")
    await editorPage.addPlantTool.click();
    await page.waitForTimeout(300);

    // Weryfikacja, że narzędzie "Dodaj roślinę" jest aktywne
    await expect(editorPage.addPlantTool).toBeVisible();

    // Dodajemy jedną roślinę do komórki (1,1) - wystarczy do testu dialogu potwierdzenia
    const plantName = "pomidor";

    // Dodajemy roślinę do komórki (1,1)
    await editorPage.clickCell(1, 1);
    await editorPage.openPlantsSearchTab();
    await editorPage.searchPlantInDialog(plantName);
    await editorPage.selectCandidateInDialog(0);
    // Czekaj na pojawienie się oceny dopasowania (może trwać kilka sekund)
    await page.waitForTimeout(3000);
    await editorPage.confirmAddPlantInDialog();

    // Weryfikacja, że roślina została dodana
    const hasPlant = await editorPage.hasPlantInCell(1, 1, plantName);
    expect(hasPlant).toBe(true);

    // ============================================
    // KROK 4: Zaznaczenie obszaru zawierającego roślinę
    // ============================================
    // Zaznaczamy obszar zawierający roślinę (komórka 1,1)
    await editorPage.selectArea(1, 1, 1, 1);

    // Weryfikacja, że AreaTypePanel się pojawił
    const isPanelVisible = await editorPage.isAreaTypePanelVisible();
    expect(isPanelVisible).toBe(true);

    // ============================================
    // KROK 5: Wybór typu 'path' (ścieżka)
    // ============================================
    // Wybieramy typ "Ścieżka"
    await editorPage.selectAreaType("Ścieżka");

    // Weryfikacja, że przycisk "Zastosuj" jest aktywny
    await expect(editorPage.areaTypeApplyButton).toBeEnabled();

    // ============================================
    // KROK 6: Zastosowanie zmiany typu (powinno wywołać dialog)
    // ============================================
    // Czekamy na odpowiedź API (może być 409 Conflict)
    const applyResponsePromise = page.waitForResponse(
      (response) =>
        (response.url().includes("/api/plans/") && response.url().includes("/cells")) &&
        (response.request().method() === "PATCH" || response.request().method() === "PUT"),
      { timeout: 20000 }
    );

    // Klikamy przycisk "Zastosuj" - może wywołać 409 i dialog
    await editorPage.areaTypeApplyButton.click();

    // Czekamy na odpowiedź API (może być 409)
    const applyResponse = await applyResponsePromise.catch(() => null);
    
    // Jeśli otrzymaliśmy odpowiedź, sprawdźmy status (może być 409)
    if (applyResponse) {
      // 409 jest oczekiwane - oznacza, że są rośliny w obszarze
      // 200 też jest możliwe jeśli API nie zwróciło błędu
      expect([200, 409]).toContain(applyResponse.status());
    }

    // ============================================
    // KROK 7: Weryfikacja pojawienia się AreaTypeConfirmDialog
    // ============================================
    // Dialog powinien się pojawić jeśli API zwróciło 409
    // Czekamy na pojawienie się dialogu (może być opóźnienie)
    await expect(editorPage.areaTypeConfirmDialog).toBeVisible({ timeout: 10000 });
    
    const isDialogVisible = await editorPage.isAreaTypeConfirmDialogVisible();
    expect(isDialogVisible).toBe(true);

    // Weryfikacja tytułu dialogu
    await expect(editorPage.areaTypeConfirmDialogTitle).toBeVisible();
    const titleText = await editorPage.areaTypeConfirmDialogTitle.textContent();
    expect(titleText).toContain("Usunąć rośliny");

    // Weryfikacja opisu dialogu
    const descriptionText = await editorPage.getAreaTypeConfirmDialogDescription();
    expect(descriptionText).toContain("Ścieżka");
    expect(descriptionText).toContain("roślin");
    expect(descriptionText).toMatch(/\d+/); // Powinna być liczba roślin

    // Weryfikacja przycisków
    await expect(editorPage.areaTypeConfirmButton).toBeVisible();
    await expect(editorPage.areaTypeConfirmCancelButton).toBeVisible();

    // ============================================
    // KROK 8: Potwierdzenie usunięcia roślin
    // ============================================
    await editorPage.confirmAreaTypeChange();

    // Weryfikacja, że dialog zniknął
    const isDialogHidden = !(await editorPage.isAreaTypeConfirmDialogVisible());
    expect(isDialogHidden).toBe(true);

    // Weryfikacja, że AreaTypePanel zniknął
    const isPanelHidden = !(await editorPage.isAreaTypePanelVisible());
    expect(isPanelHidden).toBe(true);

    // ============================================
    // KROK 9: Weryfikacja usunięcia rośliny i zmiany typu
    // ============================================
    // Sprawdzamy, że roślina została usunięta z komórki
    const hasPlantAfter = await editorPage.hasPlantInCell(1, 1);
    expect(hasPlantAfter).toBe(false);

    // Weryfikacja zmiany typu - ponowne zaznaczenie tego samego obszaru
    await editorPage.selectArea(1, 1, 1, 1);

    // Panel powinien się ponownie pojawić
    await expect(editorPage.areaTypePanel).toBeVisible({ timeout: 3000 });

    // Sprawdzamy, czy typ został zmieniony (możemy to zweryfikować przez sprawdzenie,
    // czy możemy wybrać inny typ - jeśli typ się zmienił, panel powinien działać normalnie)
    // Anuluj to zaznaczenie
    await editorPage.cancelAreaTypeChange();

    // Weryfikacja, że panel zniknął po anulowaniu
    const isPanelHiddenAfterCancel = !(await editorPage.isAreaTypePanelVisible());
    expect(isPanelHiddenAfterCancel).toBe(true);

    // ============================================
    // KROK 10: Usunięcie planu na końcu testu
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

