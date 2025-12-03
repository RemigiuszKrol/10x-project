import { test, expect } from "@playwright/test";
import { PlansListPage } from "./pages/PlansListPage";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla usuwania planu
 *
 * Scenariusz:
 * 1. Rejestracja i logowanie użytkownika
 * 2. Utworzenie planu (minimalne dane)
 * 3. Nawigacja do listy planów (/plans)
 * 4. Kliknięcie przycisku usuwania dla planu
 * 5. Weryfikacja otwarcia dialogu potwierdzenia
 * 6. Potwierdzenie usunięcia w dialogu
 * 7. Weryfikacja usunięcia planu z listy
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 */

test.describe("Usuwanie planu", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien usunąć plan z listy po potwierdzeniu w dialogu", async ({ page }) => {
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
    // KROK 1: Utworzenie planu do usunięcia
    // ============================================
    const planName = `Plan do usunięcia ${Date.now()}`;

    // Nawigacja do kreatora planu
    const planCreatorPage = new PlanCreatorPage(page);
    await planCreatorPage.navigate();
    await planCreatorPage.waitForPlanCreatorToLoad();

    // Weryfikacja, że kreator się załadował
    await expect(planCreatorPage.title).toBeVisible();
    await expect(planCreatorPage.description).toBeVisible();

    // Jeśli pojawi się dialog szkicu, zamknij go (rozpocznij od nowa)
    if (await planCreatorPage.hasDraftDialog()) {
      await page.getByRole("button", { name: /rozpocznij od nowa/i }).click();
      await page.waitForTimeout(500);
    }

    // Wprowadzenie nazwy planu
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

    // Krok 3: Wymiary (mała siatka dla szybkości testu)
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));

    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();

    await widthInput.fill("10");
    await heightInput.fill("10");

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Podsumowanie i utworzenie planu
    await expect(page.getByRole("heading", { name: /podsumowanie/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(planName)).toBeVisible();

    const createPlanButton = page.getByRole("button", { name: /utwórz plan/i });
    await expect(createPlanButton).toBeVisible();

    // Oczekiwanie na odpowiedź API przed kliknięciem
    const createPlanResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 30000 }
    );

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
    
    // Weryfikacja, że URL zawiera ID planu (UUID)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];
    
    await page.waitForLoadState("networkidle");

    // ============================================
    // KROK 2: Nawigacja do listy planów
    // ============================================
    const plansListPage = new PlansListPage(page);
    await plansListPage.navigate();
    await plansListPage.waitForPlansListToLoad();

    // Weryfikacja, że lista planów się załadowała
    await expect(plansListPage.title).toBeVisible();
    await expect(plansListPage.hasPlansTable()).resolves.toBe(true);

    // Weryfikacja, że utworzony plan jest widoczny w tabeli
    const planExists = await plansListPage.hasPlan(planName);
    expect(planExists).toBe(true);

    // ============================================
    // KROK 3: Kliknięcie przycisku usuwania
    // ============================================
    // Oczekiwanie na odpowiedź API DELETE przed kliknięciem
    const deletePlanResponsePromise = page.waitForResponse(
      (response) =>
        response.url().match(/\/api\/plans\/[a-f0-9-]+$/) !== null && response.request().method() === "DELETE",
      { timeout: 30000 }
    );

    // Kliknięcie przycisku usuwania
    await plansListPage.clickDeleteButton(planName);

    // ============================================
    // KROK 4: Weryfikacja otwarcia dialogu potwierdzenia
    // ============================================
    // Oczekiwanie na pojawienie się dialogu
    await expect(plansListPage.deleteDialog).toBeVisible({ timeout: 5000 });
    await expect(plansListPage.deleteDialogTitle).toBeVisible();
    await expect(plansListPage.deleteDialogDescription).toBeVisible();

    // Weryfikacja, że nazwa planu jest wyświetlona w dialogu
    await expect(plansListPage.deleteDialogDescription).toContainText(planName);

    // Weryfikacja, że przyciski są widoczne
    await expect(plansListPage.deleteDialogCancelButton).toBeVisible();
    await expect(plansListPage.deleteDialogConfirmButton).toBeVisible();

    // ============================================
    // KROK 5: Potwierdzenie usunięcia w dialogu
    // ============================================
    // Kliknięcie przycisku "Usuń"
    await plansListPage.confirmDelete();

    // Czekamy na odpowiedź API DELETE
    const deletePlanResponse = await deletePlanResponsePromise;
    expect([200, 204]).toContain(deletePlanResponse.status()); // 200 lub 204 (No Content) są poprawne dla DELETE

    // Oczekiwanie na zamknięcie dialogu
    await plansListPage.waitForDeleteDialogToClose();

    // ============================================
    // KROK 6: Weryfikacja usunięcia planu z listy
    // ============================================
    // Oczekiwanie na odświeżenie listy planów (może być automatyczne po usunięciu)
    await page.waitForTimeout(1000); // Krótkie opóźnienie na odświeżenie listy

    // Weryfikacja, że plan nie jest już widoczny w tabeli
    const planStillExists = await plansListPage.hasPlan(planName);
    expect(planStillExists).toBe(false);

    // Weryfikacja, że dialog został zamknięty
    const dialogStillVisible = await plansListPage.isDeleteDialogVisible();
    expect(dialogStillVisible).toBe(false);
  });

  test("powinien anulować usuwanie planu po kliknięciu Anuluj", async ({ page }) => {
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
    const planName = `Plan do anulowania ${Date.now()}`;

    const planCreatorPage = new PlanCreatorPage(page);
    await planCreatorPage.navigate();
    await planCreatorPage.waitForPlanCreatorToLoad();

    if (await planCreatorPage.hasDraftDialog()) {
      await page.getByRole("button", { name: /rozpocznij od nowa/i }).click();
      await page.waitForTimeout(500);
    }

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

    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    if (await widthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await widthInput.fill("10");
      const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));
      await heightInput.fill("10");

      const continueButton3 = page.getByRole("button", { name: /kontynuuj/i });
      await expect(continueButton3).toBeVisible();
      await continueButton3.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.getByRole("heading", { name: /podsumowanie/i })).toBeVisible({ timeout: 5000 });

    const createPlanButton = page.getByRole("button", { name: /utwórz plan/i });
    await expect(createPlanButton).toBeVisible();

    const createPlanResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 30000 }
    );

    await createPlanButton.click();

    const confirmDialog = page.getByRole("dialog");
    const hasConfirmDialog = await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasConfirmDialog) {
      const confirmButton = page.getByRole("button", { name: /tak, utwórz plan/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
    }

    const createPlanResponse = await createPlanResponsePromise;
    expect(createPlanResponse.status()).toBe(201);

    await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 15000 });
    
    // Weryfikacja, że URL zawiera ID planu (UUID)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];
    
    await page.waitForLoadState("networkidle");

    // ============================================
    // KROK 2: Nawigacja do listy planów
    // ============================================
    const plansListPage = new PlansListPage(page);
    await plansListPage.navigate();
    await plansListPage.waitForPlansListToLoad();

    await expect(plansListPage.title).toBeVisible();
    await expect(plansListPage.hasPlansTable()).resolves.toBe(true);

    const planExists = await plansListPage.hasPlan(planName);
    expect(planExists).toBe(true);

    // ============================================
    // KROK 3: Kliknięcie przycisku usuwania
    // ============================================
    await plansListPage.clickDeleteButton(planName);

    // ============================================
    // KROK 4: Weryfikacja otwarcia dialogu
    // ============================================
    await expect(plansListPage.deleteDialog).toBeVisible({ timeout: 5000 });
    await expect(plansListPage.deleteDialogTitle).toBeVisible();
    await expect(plansListPage.deleteDialogDescription).toContainText(planName);

    // ============================================
    // KROK 5: Anulowanie usunięcia
    // ============================================
    await plansListPage.cancelDelete();

    // ============================================
    // KROK 6: Weryfikacja, że plan nadal istnieje
    // ============================================
    await plansListPage.waitForDeleteDialogToClose();

    // Weryfikacja, że dialog został zamknięty
    const dialogStillVisible = await plansListPage.isDeleteDialogVisible();
    expect(dialogStillVisible).toBe(false);

    // Weryfikacja, że plan nadal jest widoczny w tabeli
    const planStillExists = await plansListPage.hasPlan(planName);
    expect(planStillExists).toBe(true);

    // ============================================
    // KROK 7: Usunięcie planu na końcu testu
    // ============================================
    // Oczekiwanie na odpowiedź API DELETE przed kliknięciem
    const deletePlanResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/plans/${planId}`) && response.request().method() === "DELETE",
      { timeout: 15000 }
    );

    // Kliknięcie przycisku usuwania
    await plansListPage.clickDeleteButton(planName);

    // Weryfikacja otwarcia dialogu
    await expect(plansListPage.deleteDialog).toBeVisible({ timeout: 5000 });
    await expect(plansListPage.deleteDialogTitle).toBeVisible();
    await expect(plansListPage.deleteDialogDescription).toContainText(planName);

    // Potwierdzenie usunięcia
    await plansListPage.confirmDelete();

    // Czekamy na odpowiedź API
    const deletePlanResponse = await deletePlanResponsePromise;
    expect([200, 204]).toContain(deletePlanResponse.status()); // 200 lub 204 (No Content) są poprawne dla DELETE

    // Oczekiwanie na zamknięcie dialogu
    await plansListPage.waitForDeleteDialogToClose();

    // Weryfikacja, że plan został usunięty
    const planDeleted = await plansListPage.hasPlan(planName);
    expect(planDeleted).toBe(false);
  });
});

