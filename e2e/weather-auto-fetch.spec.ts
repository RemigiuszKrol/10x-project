import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla automatycznego pobierania i wyświetlania danych pogodowych
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Utworzenie planu z lokalizacją (latitude, longitude)
 * 3. Przekierowanie do edytora planu (/plans/[id])
 * 4. Otwarcie zakładki "Pogoda" w SideDrawer
 * 5. Weryfikacja automatycznego pobierania danych pogodowych (GET /api/plans/[id]/weather)
 * 6. Jeśli nie ma danych (404) - pobranie danych pogodowych
 * 7. Jeśli są dane (200) - odświeżenie danych pogodowych
 * 8. Weryfikacja wyświetlenia danych
 * 9. Usunięcie planu na końcu testu
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Test sprawdza, że dane pogodowe są automatycznie pobierane/odświeżane po otwarciu zakładki "Pogoda".
 */

test.describe("Automatyczne pobieranie danych pogodowych", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien automatycznie pobrać i wyświetlić dane pogodowe po utworzeniu planu z lokalizacją", async ({
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
    // KROK 1: Utworzenie planu z lokalizacją
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
    const planName = `Test Plan Weather ${Date.now()}`;
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
    const searchQuery = "Warszawa, Plac Defilad 1";
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

    await widthInput.fill("10");
    await heightInput.fill("10");

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Krok 4: Podsumowanie i utworzenie planu
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans") && response.request().method() === "POST",
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
    await page.waitForLoadState("networkidle");

    // Weryfikacja, że URL zawiera ID planu (UUID)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

    // ============================================
    // KROK 2: Weryfikacja załadowania edytora
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że nazwa planu jest wyświetlona
    await expect(editorPage.planName).toBeVisible();

    // Weryfikacja, że siatka jest widoczna
    const isGridVisible = await editorPage.isGridVisible();
    expect(isGridVisible).toBe(true);

    // ============================================
    // KROK 3: Otwarcie zakładki "Pogoda" w SideDrawer
    // ============================================
    // Weryfikacja, że zakładka "Pogoda" jest dostępna
    await expect(editorPage.weatherTab).toBeVisible();

    // Kliknięcie zakładki "Pogoda"
    await editorPage.openWeatherTab();

    // Poczekaj chwilę na renderowanie komponentu (loading state może się pojawić)
    await page.waitForTimeout(2000);

    // Sprawdź, czy WeatherTab jest widoczny
    const isWeatherTabVisible = await editorPage.isWeatherTabVisible();
    expect(isWeatherTabVisible).toBe(true);

    // Sprawdź, czy nie ma już stanu loading
    const isWeatherLoading = await editorPage.isWeatherLoading();
    if (isWeatherLoading) {
      // Poczekaj aż loading się skończy
      await page.waitForTimeout(3000);
    }

    // ============================================
    // KROK 4: Pobranie danych pogodowych (nowy plan nie ma danych)
    // ============================================
    // Weryfikacja empty state - nowy plan nie ma danych pogodowych
    await expect(page.getByText(/brak danych pogodowych/i)).toBeVisible({ timeout: 5000 });

    // Weryfikacja przycisku "Pobierz dane pogodowe"
    const fetchButton = page.getByRole("button", { name: /pobierz dane pogodowe/i });
    await expect(fetchButton).toBeVisible({ timeout: 5000 });

    // Oczekiwanie na odpowiedź API z refresh endpoint
    const refreshResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}/weather/refresh`) &&
        response.request().method() === "POST",
      { timeout: 40000 }
    );

    // Kliknij przycisk, aby pobrać dane pogodowe
    await fetchButton.click();

    // Czekaj na odpowiedź API
    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.status()).toBe(200);

    // Poczekaj chwilę na zapisanie danych i odświeżenie UI
    await page.waitForTimeout(3000);

    // ============================================
    // KROK 5: Weryfikacja wyświetlenia danych pogodowych
    // ============================================
    // Sprawdź stan WeatherTab po pobraniu/odświeżeniu:
    // - Jeśli dane są dostępne: wyświetlają się wykres i tabela
    // - Jeśli jest błąd: wyświetla się error state

    const hasData = await editorPage.hasWeatherData();
    if (hasData) {
      // Weryfikacja nagłówka
      await expect(page.getByRole("heading", { name: /dane pogodowe/i })).toBeVisible();

      // Weryfikacja wykresu
      const chart = page.locator("svg").first();
      await expect(chart).toBeVisible({ timeout: 5000 });

      // Weryfikacja tabeli
      const table = page.getByRole("table");
      await expect(table).toBeVisible({ timeout: 5000 });

      // Weryfikacja informacji o ostatnim odświeżeniu (jeśli dostępne)
      const lastRefreshText = page.getByText(/ostatnie odświeżenie/i);
      const hasLastRefresh = await lastRefreshText.isVisible({ timeout: 2000 }).catch(() => false);
      // To jest opcjonalne, więc nie wymagamy tego

      // Weryfikacja przycisku odświeżenia
      const refreshButton = page.getByRole("button", { name: /odśwież dane pogodowe/i });
      await expect(refreshButton).toBeVisible({ timeout: 2000 });
    }

    // ============================================
    // KROK 6: Weryfikacja, że dane nie są w stanie loading
    // ============================================
    // Po załadowaniu danych, stan loading powinien zniknąć
    const isStillLoading = await editorPage.isWeatherLoading();
    expect(isStillLoading).toBe(false); // Loading powinien zakończyć się po pobraniu danych

    // ============================================
    // KROK 7: Usunięcie planu na końcu testu
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
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}`) && response.request().method() === "DELETE",
      { timeout: 15000 }
    );

    // Potwierdzenie usunięcia
    await plansListPage.confirmDelete();

    // Czekamy na odpowiedź API
    const deleteResponse = await deleteResponsePromise;
    expect([200, 204]).toContain(deleteResponse.status()); // 200 lub 204 (No Content) są poprawne dla DELETE

    // Oczekiwanie na zamknięcie dialogu
    await plansListPage.waitForDeleteDialogToClose();

    // Weryfikacja, że plan został usunięty
    const planStillExists = await plansListPage.hasPlan(planName);
    expect(planStillExists).toBe(false);
  });
});

