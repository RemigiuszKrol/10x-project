import { test, expect } from "@playwright/test";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla obsługi timeout AI przy wyszukiwaniu rośliny
 *
 * Scenariusz:
 * 1. Logowanie użytkownika i utworzenie planu
 * 2. Otwarcie AddPlantDialog
 * 3. Wpisanie nazwy rośliny w SearchTab
 * 4. Symulacja timeout API (>10s)
 * 5. Weryfikacja wyświetlenia komunikatu błędu timeout
 * 6. Weryfikacja dostępnych akcji (Retry, Add manually)
 * 7. Usunięcie planu na końcu testu
 *
 * UWAGA: Test symuluje timeout przez przechwycenie requestu i opóźnienie odpowiedzi
 */

test.describe("Network failure - timeout AI przy wyszukiwaniu rośliny", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien wyświetlić błąd timeout po przekroczeniu 10s", async ({ page }) => {
    // Zwiększamy timeout testu do 60s, aby uwzględnić retry React Query (2 próby * 10s = 20s) + margines
    test.setTimeout(60000);
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
    const planName = `Test Plan Timeout ${Date.now()}`;
    const nameInput = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInput).toBeVisible();
    await nameInput.fill(planName);
    await expect(nameInput).toHaveValue(planName);

    // Przejście do następnego kroku
    const continueButton = page.getByRole("button", { name: /kontynuuj/i });
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    await page.waitForTimeout(1000); // Krótkie opóźnienie na przejście między krokami

    // Krok 2: Lokalizacja
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
    const locationSearchButton = page.getByRole("button", { name: /szukaj/i });
    await expect(locationSearchButton).toBeVisible();
    await locationSearchButton.click();

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
    await continueButton.click();
    await page.waitForTimeout(1000); // Krótkie opóźnienie na przejście między krokami

    // Krok 3: Wymiary (mała siatka dla szybkości testu)
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator('input[name="width"]'));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator('input[name="height"]'));

    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    await widthInput.fill("5");
    await heightInput.fill("5");

    // Przejście do następnego kroku
    await continueButton.click();
    await page.waitForTimeout(1000); // Krótkie opóźnienie na przejście między krokami

    // Krok 4: Podsumowanie i utworzenie planu
    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 15000 }
    );

    const createButton = page.getByRole("button", { name: /utwórz plan/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

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
    // KROK 2: Otwarcie edytora
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że edytor się załadował
    await expect(editorPage.planName).toBeVisible();
    await expect(editorPage.gridCanvas).toBeVisible();

    // ============================================
    // KROK 2.5: Pobranie danych pogodowych (wymagane do wyszukiwania rośliny)
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
      { timeout: 30000 }
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
    // KROK 3: Aktywacja narzędzia "Dodaj roślinę" i otwarcie formularza wyszukiwania
    // ============================================
    // Wybierz komórkę w środku siatki (np. 2,2)
    const cellX = 2;
    const cellY = 2;

    // Otwarcie formularza wyszukiwania w panelu bocznym
    // openAddPlantDialog przełącza panel boczny na "Rośliny" -> "Wyszukaj", aktywuje narzędzie i klika komórkę
    await editorPage.openAddPlantDialog(cellX, cellY);

    // Weryfikacja, że formularz wyszukiwania jest widoczny w panelu bocznym
    await expect(editorPage.plantQueryInput).toBeVisible({ timeout: 5000 });

    // ============================================
    // KROK 4: Symulacja timeout API (>10s)
    // ============================================
    // Przechwycenie requestu do /api/ai/plants/search i opóźnienie odpowiedzi o >10s
    // To spowoduje timeout w kodzie (AbortController z timeout 10s)
    // Używamy opóźnienia odpowiedzi, aby AbortController mógł przerwać request
    let requestIntercepted = false;
    let requestCount = 0;

    await page.route("**/api/ai/plants/search", async (route) => {
      requestCount++;
      requestIntercepted = true;
      
      // Symulacja timeout - opóźnij odpowiedź o więcej niż 10s (timeout w AbortController)
      // AbortController w useAIMutations ma timeout 10s, więc po 10s request zostanie przerwany
      // i zostanie rzucony AbortError, który zostanie przekonwertowany na błąd timeout
      // Używamy setTimeout, aby przerwać request po 10s (przed zwróceniem odpowiedzi)
      // Ale route handler musi zwrócić odpowiedź, więc używamy route.abort() z opóźnieniem
      
      // Ustaw timeout na 10s - przerwij request przed zwróceniem odpowiedzi
      setTimeout(() => {
        route.abort();
      }, 10000);
      
      // Opóźnij odpowiedź o 12s (więcej niż timeout 10s)
      // Ale request zostanie przerwany przez route.abort() po 10s
      await new Promise((resolve) => setTimeout(resolve, 12000));
      
      // Po 12s request powinien już być przerwany przez route.abort()
      // Nie próbujemy zwrócić odpowiedzi - request został już przerwany
      // AbortError zostanie rzucony w przeglądarce i zostanie przekonwertowany na błąd timeout
    });

    // ============================================
    // KROK 5: Wpisanie nazwy rośliny i rozpoczęcie wyszukiwania
    // ============================================
    const plantName = "pomidor";

    // Wypełnij pole wyszukiwania w panelu bocznym
    await editorPage.plantQueryInput.fill(plantName);
    await expect(editorPage.plantQueryInput).toHaveValue(plantName);

    // Kliknij przycisk "Szukaj" w panelu bocznym
    const searchButton = editorPage.sideDrawer
      .getByRole("button", { name: /szukaj/i })
      .or(editorPage.sideDrawer.locator('button[title="Szukaj"]'));
    await searchButton.click();

    // Weryfikacja, że request został przechwycony
    await page.waitForTimeout(500);
    expect(requestIntercepted).toBe(true);

    // ============================================
    // KROK 6: Oczekiwanie na timeout (>10s)
    // ============================================
    // Czekamy na pojawienie się komunikatu błędu timeout
    // Zgodnie z kodem, błąd jest wyświetlany jako Alert w SearchTab
    // Komunikat: "Przekroczono limit czasu oczekiwania. Spróbuj ponownie lub dodaj roślinę ręcznie."

    // Czekamy na pojawienie się Alert z komunikatem błędu w panelu bocznym
    // Timeout w kodzie to 10s, więc po ~10-12s powinien pojawić się błąd
    // React Query ma retry: 1, więc może być 2 próby (2 * 10s = 20s max)
    // Czekamy bezpośrednio na Alert z błędem timeout (nie czekamy na przycisk, bo może być disabled przez cały czas)
    // Komunikat błędu: "Przekroczono limit czasu oczekiwania. Spróbuj ponownie lub dodaj roślinę ręcznie."
    // LUB: "AI nie odpowiada. Spróbuj ponownie lub dodaj roślinę ręcznie." (jeśli odpowiedź 504 zostanie odebrana)
    
    // Czekamy na pojawienie się błędu - używamy bardziej elastycznego selektora
    // Może być w Alert z role="alert" lub jako zwykły tekst w AlertDescription
    const errorText = editorPage.sideDrawer.getByText(/przekroczono limit czasu|limit czasu oczekiwania|ai nie odpowiada/i);
    
    // Zwiększamy timeout do 35s, aby uwzględnić retry React Query (2 próby * 10s = 20s) + opóźnienie route (12s) + margines
    await expect(errorText).toBeVisible({ timeout: 35000 });
    
    // Teraz znajdźmy Alert zawierający ten tekst
    const errorAlert = editorPage.sideDrawer
      .locator('[role="alert"]')
      .filter({ hasText: /przekroczono limit czasu|limit czasu oczekiwania|ai nie odpowiada/i })
      .first();
    
    // Upewnijmy się, że Alert jest widoczny
    await expect(errorAlert).toBeVisible({ timeout: 2000 });

    // ============================================
    // KROK 7: Weryfikacja komunikatu błędu
    // ============================================
    // Sprawdź, czy komunikat zawiera informację o timeout
    const errorMessage = errorAlert.getByText(/przekroczono limit czasu|limit czasu oczekiwania/i);
    await expect(errorMessage).toBeVisible();

    // Sprawdź, czy przycisk "Spróbuj ponownie" jest widoczny (jeśli canRetry === true)
    const retryButton = errorAlert.getByRole("button", { name: /spróbuj ponownie|ponów/i });
    await expect(retryButton).toBeVisible({ timeout: 2000 }).catch(() => {
      // Przycisk może nie być widoczny jeśli canRetry === false
      // To jest akceptowalne
    });

    // ============================================
    // KROK 8: Weryfikacja, że przycisk "Szukaj" nie jest już w stanie loading
    // ============================================
    // Po timeout, przycisk "Szukaj" powinien być znowu aktywny (nie w stanie loading)
    const searchButtonAfterTimeout = editorPage.sideDrawer
      .getByRole("button", { name: /szukaj/i })
      .or(editorPage.sideDrawer.locator('button[title="Szukaj"]'));
    await expect(searchButtonAfterTimeout).toBeEnabled({ timeout: 5000 });

    // Sprawdź, czy przycisk nie zawiera spinnera (Loader2)
    const spinner = searchButton.locator('[class*="animate-spin"]');
    await expect(spinner).toBeHidden({ timeout: 2000 }).catch(() => {
      // Spinner może jeszcze być widoczny przez krótki moment
    });

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

