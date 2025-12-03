import { test, expect } from "@playwright/test";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { EditorPage } from "./pages/EditorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla pełnego flow tworzenia planu
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Nawigacja do kreatora planu (/plans/new)
 * 3. Krok 1: Wprowadzenie nazwy planu
 * 4. Krok 2: Ustawienie lokalizacji (wyszukiwanie adresu)
 * 5. Krok 3: Wprowadzenie wymiarów działki
 * 6. Krok 4: Podsumowanie i utworzenie planu
 * 7. Weryfikacja przekierowania do edytora (/plans/[id])
 * 8. Weryfikacja wyświetlenia siatki w edytorze
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 */

test.describe("Tworzenie planu - pełny flow", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien utworzyć plan i wyświetlić siatkę w edytorze", async ({ page }) => {
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
    // KROK 1: Nawigacja do kreatora planu
    // ============================================
    const planCreatorPage = new PlanCreatorPage(page);
    await planCreatorPage.navigate();
    await planCreatorPage.waitForPlanCreatorToLoad();

    // Weryfikacja, że kreator się załadował
    await expect(planCreatorPage.title).toBeVisible();
    await expect(planCreatorPage.description).toBeVisible();

    // Jeśli pojawi się dialog szkicu, zamknij go (rozpocznij od nowa)
    if (await planCreatorPage.hasDraftDialog()) {
      await page.getByRole("button", { name: /rozpocznij od nowa/i }).click();
      await page.waitForTimeout(500); // Krótkie opóźnienie na zamknięcie dialogu
    }

    // ============================================
    // KROK 2: Wprowadzenie nazwy planu (Krok 1: Podstawy)
    // ============================================
    const planName = `Test Plan ${Date.now()}`;

    // Znajdź pole nazwy planu
    const nameInput = page.getByLabel(/nazwa planu/i).or(page.locator('#plan-name'));
    await expect(nameInput).toBeVisible();

    // Wypełnienie nazwy planu
    await nameInput.fill(planName);

    // Weryfikacja, że pole jest wypełnione
    await expect(nameInput).toHaveValue(planName);

    // Przejście do następnego kroku
    const continueButton = page.getByRole("button", { name: /kontynuuj/i });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // Oczekiwanie na przejście do kroku lokalizacji
    await page.waitForTimeout(1000); // Krótkie opóźnienie na przejście między krokami

    // ============================================
    // KROK 3: Ustawienie lokalizacji (Krok 2: Lokalizacja)
    // ============================================
    // Weryfikacja, że jesteśmy w kroku lokalizacji
    await expect(page.getByRole("heading", { name: /lokalizacja działki/i })).toBeVisible({ timeout: 5000 });

    // Wyszukiwanie lokalizacji
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

    // ============================================
    // KROK 4: Wprowadzenie wymiarów (Krok 3: Wymiary)
    // ============================================
    // Weryfikacja, że jesteśmy w kroku wymiarów
    await expect(page.getByRole("heading", { name: /wymiary i orientacja/i })).toBeVisible({ timeout: 5000 });

    // Wprowadzenie szerokości działki
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator('#width-m'));
    await expect(widthInput).toBeVisible();
    await widthInput.fill("10");

    // Wprowadzenie wysokości działki
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator('#height-m'));
    await expect(heightInput).toBeVisible();
    await heightInput.fill("10");

    // Wybór rozmiaru kratki (jeśli nie jest domyślnie ustawiony)
    const cellSizeSelectTrigger = page.locator('#cell-size').getByRole("combobox").or(
      page.getByLabel(/rozmiar pojedynczej kratki/i)
    );
    
    // Sprawdź, czy select jest widoczny i czy wartość nie jest ustawiona
    if (await cellSizeSelectTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cellSizeSelectTrigger.click();
      await page.waitForTimeout(500);
      // Wybór opcji 50 cm (standardowe)
      const option50cm = page.getByRole("option", { name: /50 cm/i });
      if (await option50cm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option50cm.click();
        await page.waitForTimeout(500);
      }
    }

    // Weryfikacja, że pola są wypełnione
    await expect(widthInput).toHaveValue("10");
    await expect(heightInput).toHaveValue("10");

    // Przejście do następnego kroku
    const continueButton3 = page.getByRole("button", { name: /kontynuuj/i });
    await expect(continueButton3).toBeVisible();
    await continueButton3.click();

    // Oczekiwanie na przejście do kroku podsumowania
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 5: Podsumowanie i utworzenie planu (Krok 4: Podsumowanie)
    // ============================================
    // Weryfikacja, że jesteśmy w kroku podsumowania
    await expect(page.getByRole("heading", { name: /podsumowanie/i })).toBeVisible({ timeout: 5000 });

    // Weryfikacja, że dane są wyświetlone w podsumowaniu
    await expect(page.getByText(planName)).toBeVisible();

    // Kliknięcie przycisku "Utwórz plan"
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
      // Potwierdzenie utworzenia planu
      const confirmButton = page.getByRole("button", { name: /tak, utwórz plan/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
    }

    // Czekamy na odpowiedź API
    const createPlanResponse = await createPlanResponsePromise;
    expect(createPlanResponse.status()).toBe(201);

    // ============================================
    // KROK 6: Weryfikacja przekierowania do edytora
    // ============================================
    // Oczekiwanie na przekierowanie do edytora planu
    await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Weryfikacja, że URL zawiera ID planu (UUID)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

    // ============================================
    // KROK 7: Weryfikacja wyświetlenia siatki w edytorze
    // ============================================
    const editorPage = new EditorPage(page);
    await editorPage.waitForEditorToLoad();

    // Weryfikacja, że nazwa planu jest wyświetlona
    await expect(editorPage.planName).toBeVisible();
    const displayedPlanName = await editorPage.getPlanName();
    expect(displayedPlanName).toBe(planName);

    // Weryfikacja, że informacje o siatce są wyświetlone
    await expect(editorPage.gridInfo).toBeVisible();
    const gridInfoText = await editorPage.getGridInfo();
    expect(gridInfoText).toContain("Siatka:");

    // Weryfikacja, że siatka jest widoczna
    const isGridVisible = await editorPage.isGridVisible();
    expect(isGridVisible).toBe(true);

    // Plan został pomyślnie utworzony i siatka jest widoczna - test zakończony sukcesem
    // Przechodzimy do usuwania planu na końcu testu

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

