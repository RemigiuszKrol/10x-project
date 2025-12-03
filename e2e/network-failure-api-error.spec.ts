import { test, expect } from "@playwright/test";
import { PlansListPage } from "./pages/PlansListPage";
import { EditorPage } from "./pages/EditorPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla obsługi błędów API (500, 503)
 *
 * Scenariusz 1: PlansList - ErrorState
 * 1. Logowanie użytkownika
 * 2. Nawigacja do /plans
 * 3. Symulacja błędu 500/503 na endpoint /api/plans
 * 4. Weryfikacja wyświetlenia ErrorState z komunikatem błędu
 * 5. Weryfikacja przycisku "Spróbuj ponownie"
 * 6. Kliknięcie "Spróbuj ponownie" i weryfikacja ponownego zapytania
 *
 * Scenariusz 2: EditorLayout - ToastProvider
 * 1. Logowanie użytkownika i utworzenie planu
 * 2. Nawigacja do /plans/[id]
 * 3. Wykonanie akcji powodującej zapytanie API (np. zmiana typu komórki)
 * 4. Symulacja błędu 500/503 na endpoint API
 * 5. Weryfikacja wyświetlenia toast notification z komunikatem błędu
 *
 * UWAGA: Test symuluje błędy przez przechwycenie requestów i zwrócenie odpowiedzi z błędem
 */

test.describe("Network failure - błąd API (500, 503)", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien wyświetlić ErrorState w PlansList przy błędzie 500", async ({ page }) => {
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
    // KROK 1: Przechwycenie requestu do /api/plans i zwrócenie błędu 500
    // ============================================
    // Przechwytujemy request do /api/plans i zwracamy błąd 500
    // Używamy licznika, aby śledzić liczbę requestów
    let requestCount = 0;
    await page.route("**/api/plans*", async (route) => {
      const url = route.request().url();
      // Jeśli to request GET do listy planów, zwróć błąd 500
      if (route.request().method() === "GET" && url.includes("/api/plans") && !url.includes("/cells") && !url.includes("/plants")) {
        requestCount++;
        // Przy pierwszym requestcie, zwróć błąd 500
        // Przy drugim requestcie (retry), zwróć sukces (żeby test się zakończył)
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: "InternalError",
                message: "Unexpected server error.",
              },
            }),
          });
        } else {
          // Zwróć sukces przy kolejnych requestach (retry)
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: [],
              pagination: {
                next_cursor: null,
              },
            }),
          });
        }
      } else {
        // Dla innych requestów, kontynuuj normalnie
        await route.continue();
      }
    });

    // ============================================
    // KROK 2: Nawigacja do /plans i oczekiwanie na błąd
    // ============================================
    const plansListPage = new PlansListPage(page);
    await plansListPage.navigate();

    // Czekamy na załadowanie komponentu PlansList
    await plansListPage.waitForPlansListToLoad();

    // ============================================
    // KROK 3: Weryfikacja wyświetlenia ErrorState
    // ============================================
    // Sprawdź, czy ErrorState jest widoczny
    await expect(plansListPage.errorState).toBeVisible({ timeout: 10000 });

    // Sprawdź, czy komunikat błędu zawiera odpowiedni tekst
    // ErrorState wyświetla komunikat z plansState.message
    // Dla błędu 500, usePlansApi ustawia message z error.message
    const errorMessage = plansListPage.errorState.getByText(/wystąpił błąd/i);
    await expect(errorMessage).toBeVisible();

    // Sprawdź, czy przycisk "Spróbuj ponownie" jest widoczny
    const retryButton = plansListPage.errorState.getByRole("button", { name: /spróbuj ponownie/i });
    await expect(retryButton).toBeVisible();

    // ============================================
    // KROK 4: Kliknięcie "Spróbuj ponownie" i weryfikacja ponownego zapytania
    // ============================================
    // Kliknij przycisk "Spróbuj ponownie"
    await retryButton.click();

    // Czekamy na ponowne załadowanie (może być loading state, potem success state)
    await page.waitForTimeout(2000);

    // Weryfikacja, że request został ponowiony (requestCount powinien być > 1)
    expect(requestCount).toBeGreaterThan(1);
  });

  test("powinien wyświetlić ErrorState w PlansList przy błędzie 503", async ({ page }) => {
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
    // KROK 1: Przechwycenie requestu do /api/plans i zwrócenie błędu 503
    // ============================================
    await page.route("**/api/plans*", async (route) => {
      const url = route.request().url();
      if (route.request().method() === "GET" && url.includes("/api/plans") && !url.includes("/cells") && !url.includes("/plants")) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "InternalError",
              message: "Service unavailable. Please try again later.",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // ============================================
    // KROK 2: Nawigacja do /plans i oczekiwanie na błąd
    // ============================================
    const plansListPage = new PlansListPage(page);
    await plansListPage.navigate();

    // Czekamy na załadowanie komponentu PlansList
    await plansListPage.waitForPlansListToLoad();

    // ============================================
    // KROK 3: Weryfikacja wyświetlenia ErrorState
    // ============================================
    await expect(plansListPage.errorState).toBeVisible({ timeout: 10000 });

    const errorMessage = plansListPage.errorState.getByText(/wystąpił błąd/i);
    await expect(errorMessage).toBeVisible();

    const retryButton = plansListPage.errorState.getByRole("button", { name: /spróbuj ponownie/i });
    await expect(retryButton).toBeVisible();
  });

  test("powinien wyświetlić toast notification w EditorLayout przy błędzie 500", async ({ page }) => {
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
    const planName = `Test Plan Error 500 ${Date.now()}`;
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

    // Krok 3: Wymiary
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));
    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    await widthInput.fill("10");
    await heightInput.fill("10");
    await expect(widthInput).toHaveValue("10");
    await expect(heightInput).toHaveValue("10");

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Wysłanie formularza tworzenia planu
    const createPlanResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST"
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

    // Pobranie ID planu z URL
    const planIdMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(planIdMatch).not.toBeNull();
    const planId = planIdMatch![1];

    // ============================================
    // KROK 2: Nawigacja do edytora i oczekiwanie na załadowanie
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że siatka jest widoczna
    await expect(editorPage.gridCanvas).toBeVisible({ timeout: 10000 });

    // ============================================
    // KROK 3: Przechwycenie requestu do API i zwrócenie błędu 500
    // ============================================
    // Przechwytujemy request do zmiany typu obszaru i zwracamy błąd 500
    // Endpoint: POST /api/plans/:plan_id/grid/area-type
    await page.route(`**/api/plans/${planId}/grid/area-type*`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "InternalError",
              message: "Unexpected server error.",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // ============================================
    // KROK 4: Wykonanie akcji powodującej zapytanie API (zmiana typu komórki)
    // ============================================
    // Zaznacz obszar w siatce
    await editorPage.selectArea(0, 0, 2, 2);

    // Wybierz typ obszaru
    await editorPage.selectAreaType("Ścieżka");

    // Oczekiwanie na request API przed kliknięciem
    const apiRequestPromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}/grid/area-type`) &&
        response.request().method() === "POST",
      { timeout: 10000 }
    );

    // Zastosuj zmianę (to spowoduje request API z błędem 500)
    await editorPage.areaTypeApplyButton.click();

    // Czekamy na odpowiedź API z błędem
    const apiResponse = await apiRequestPromise;
    expect(apiResponse.status()).toBe(500);

    // Poczekaj chwilę na przetworzenie błędu i wyświetlenie toastu
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 5: Weryfikacja wyświetlenia toast notification
    // ============================================
    // Toast notification powinien się pojawić
    // Sonner używa role="status" dla toastów
    // Toast error powinien zawierać komunikat błędu
    const toast = page.locator('[role="status"]').or(page.locator('[data-sonner-toast]')).first();
    await expect(toast).toBeVisible({ timeout: 10000 });

    // Sprawdź, czy toast zawiera komunikat błędu
    // Dla błędu 500, handleApiError wyświetla toast z komunikatem "Wystąpił błąd serwera. Spróbuj ponownie później."
    const toastErrorText = page.getByText(/błąd serwera|nieoczekiwany błąd|wystąpił błąd/i);
    await expect(toastErrorText.first()).toBeVisible({ timeout: 5000 });

    // ============================================
    // KROK 6: Usunięcie planu na końcu testu
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

  test("powinien wyświetlić toast notification w EditorLayout przy błędzie 503", async ({ page }) => {
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
    const planName = `Test Plan Error 503 ${Date.now()}`;
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

    // Krok 3: Wymiary
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));
    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    await widthInput.fill("10");
    await heightInput.fill("10");
    await expect(widthInput).toHaveValue("10");
    await expect(heightInput).toHaveValue("10");

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Wysłanie formularza tworzenia planu
    const createPlanResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST"
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

    // Pobranie ID planu z URL
    const planIdMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(planIdMatch).not.toBeNull();
    const planId = planIdMatch![1];

    // ============================================
    // KROK 2: Nawigacja do edytora i oczekiwanie na załadowanie
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że siatka jest widoczna
    await expect(editorPage.gridCanvas).toBeVisible({ timeout: 10000 });

    // ============================================
    // KROK 3: Przechwycenie requestu do API i zwrócenie błędu 503
    // ============================================
    // Przechwytujemy request do zmiany typu obszaru i zwracamy błąd 503
    // Endpoint: POST /api/plans/:plan_id/grid/area-type
    await page.route(`**/api/plans/${planId}/grid/area-type*`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "InternalError",
              message: "Service unavailable. Please try again later.",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // ============================================
    // KROK 4: Wykonanie akcji powodującej zapytanie API (zmiana typu komórki)
    // ============================================
    // Zaznacz obszar w siatce
    await editorPage.selectArea(0, 0, 2, 2);

    // Wybierz typ obszaru
    await editorPage.selectAreaType("Ścieżka");

    // Oczekiwanie na request API przed kliknięciem
    const apiRequestPromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}/grid/area-type`) &&
        response.request().method() === "POST",
      { timeout: 10000 }
    );

    // Zastosuj zmianę (to spowoduje request API z błędem 503)
    await editorPage.areaTypeApplyButton.click();

    // Czekamy na odpowiedź API z błędem
    const apiResponse = await apiRequestPromise;
    expect(apiResponse.status()).toBe(503);

    // Poczekaj chwilę na przetworzenie błędu i wyświetlenie toastu
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 5: Weryfikacja wyświetlenia toast notification
    // ============================================
    // Toast notification powinien się pojawić
    const toast = page.locator('[role="status"]').or(page.locator('[data-sonner-toast]')).first();
    await expect(toast).toBeVisible({ timeout: 10000 });

    // Sprawdź, czy toast zawiera komunikat błędu
    const toastErrorText = page.getByText(/błąd serwera|nieoczekiwany błąd|wystąpił błąd|service unavailable/i);
    await expect(toastErrorText.first()).toBeVisible({ timeout: 5000 });

    // ============================================
    // KROK 6: Usunięcie planu na końcu testu
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

