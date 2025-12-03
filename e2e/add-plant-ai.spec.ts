import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla dodawania rośliny z AI
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Utworzenie planu z lokalizacją (dla danych pogodowych)
 * 3. Otwarcie edytora i oczekiwanie na dane pogodowe
 * 4. Aktywacja narzędzia "Dodaj roślinę" i otwarcie AddPlantDialog
 * 5. Wyszukiwanie rośliny przez AI
 * 6. Wybór kandydata z wyników
 * 7. Oczekiwanie na ocenę dopasowania (PlantFitDisplay)
 * 8. Weryfikacja wyników oceny (5 score cards)
 * 9. Dodanie rośliny do siatki
 * 10. Weryfikacja dodania rośliny na siatce
 * 11. Usunięcie planu na końcu testu
 *
 * UWAGA: Test wymaga:
 * - Uruchomionej aplikacji
 * - Skonfigurowanej bazy danych
 * - Dostępu do API AI (lub trybu mock)
 */

test.describe("Dodawanie rośliny z AI", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien dodać roślinę z AI - pełny flow", async ({ page }) => {
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
    const planName = `Test Plan AI ${Date.now()}`;
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
      await page.waitForTimeout(5000);
    } else {
      throw new Error("Nie znaleziono wyników wyszukiwania lokalizacji");
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
    expect(createResponse.status()).toBe(201); // 201 Created - właściwy kod dla utworzenia nowego zasobu

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

    // ============================================
    // KROK 2.5: Pobranie danych pogodowych (wymagane do oceny dopasowania rośliny)
    // ============================================
    // Pobierz planId z URL
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

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
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 3: Aktywacja narzędzia "Dodaj roślinę" i otwarcie formularza w panelu bocznym
    // ============================================
    // Wybierz komórkę w środku siatki (np. 2,2)
    const cellX = 2;
    const cellY = 2;

    // openAddPlantDialog przełącza panel boczny na "Rośliny" -> "Wyszukaj", aktywuje narzędzie i klika komórkę
    await editorPage.openAddPlantDialog(cellX, cellY);

    // Weryfikacja, że formularz wyszukiwania jest widoczny w panelu bocznym
    await expect(editorPage.plantQueryInput).toBeVisible({ timeout: 5000 });

    // ============================================
    // KROK 4: Wyszukiwanie rośliny przez AI
    // ============================================
    const plantName = "pomidor";

    await editorPage.searchPlantInDialog(plantName);

    // ============================================
    // KROK 5: Wybór kandydata z wyników
    // ============================================
    // Wybierz pierwszego kandydata z listy (indeks 0)
    await editorPage.selectCandidateInDialog(0);

    // ============================================
    // KROK 6: Weryfikacja oceny dopasowania (PlantFitDisplay w panelu bocznym)
    // ============================================
    // Sprawdź, czy PlantFitDisplay jest widoczny w panelu bocznym
    // Czekaj na pojawienie się wyników oceny (może trwać kilka sekund)
    await page.waitForTimeout(5000);

    // Weryfikacja, że wszystkie 5 score cards są widoczne w panelu bocznym
    // Używamy bardziej precyzyjnych selektorów, aby uniknąć konfliktów z tekstem wyjaśnienia
    // Szukamy elementów z klasą "text-muted-foreground" zawierających etykiety score
    const sunlightScore = editorPage.sideDrawer
      .locator('span.text-muted-foreground')
      .filter({ hasText: /^nasłonecznienie:/i })
      .first();
    const humidityScore = editorPage.sideDrawer
      .locator('span.text-muted-foreground')
      .filter({ hasText: /^wilgotność:/i })
      .first();
    const precipScore = editorPage.sideDrawer
      .locator('span.text-muted-foreground')
      .filter({ hasText: /^opady:/i })
      .first();
    const temperatureScore = editorPage.sideDrawer
      .locator('span.text-muted-foreground')
      .filter({ hasText: /^temperatura:/i })
      .first();
    const overallScore = editorPage.sideDrawer
      .locator('div')
      .filter({ hasText: /^ogólna ocena:/i })
      .first();

    await expect(sunlightScore).toBeVisible({ timeout: 15000 });
    await expect(humidityScore).toBeVisible({ timeout: 5000 });
    await expect(precipScore).toBeVisible({ timeout: 5000 });
    await expect(temperatureScore).toBeVisible({ timeout: 5000 });
    await expect(overallScore).toBeVisible({ timeout: 5000 });

    // Weryfikacja, że przycisk "Dodaj roślinę" jest widoczny (pojawi się po otrzymaniu wyników fit)
    const addPlantButton = editorPage.sideDrawer.getByRole("button", { name: /dodaj roślinę/i });
    await expect(addPlantButton).toBeVisible({ timeout: 5000 });

    // ============================================
    // KROK 7: Dodanie rośliny do siatki
    // ============================================
    await editorPage.confirmAddPlantInDialog();

    // ============================================
    // KROK 8: Weryfikacja dodania rośliny na siatce
    // ============================================
    // Sprawdź, czy komórka zawiera roślinę
    const hasPlant = await editorPage.hasPlantInCell(cellX, cellY, plantName);
    expect(hasPlant).toBe(true);

    // ============================================
    // KROK 9: Usunięcie planu na końcu testu
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

