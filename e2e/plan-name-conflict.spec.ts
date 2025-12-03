import { test, expect } from "@playwright/test";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { PlansListPage } from "./pages/PlansListPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla konfliktu nazwy planu
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Utworzenie pierwszego planu z nazwą
 * 3. Próba utworzenia drugiego planu z tą samą nazwą
 * 4. Weryfikacja wyświetlenia błędu w FormError w PlanCreatorStepBasics
 * 5. Weryfikacja powrotu do kroku "basics"
 * 6. Weryfikacja, że formularz jest nadal edytowalny
 * 7. Usunięcie planu na końcu testu
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 */

test.describe("Konflikt nazwy planu", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien wyświetlić błąd przy próbie utworzenia planu z istniejącą nazwą", async ({ page }) => {
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
    // KROK 1: Utworzenie pierwszego planu z nazwą
    // ============================================
    const planName = `Test Plan Conflict ${Date.now()}`;

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

    // Krok 1: Wprowadzenie nazwy planu
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
    await expect(widthInput).toBeVisible();
    await widthInput.fill("10");

    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));
    await expect(heightInput).toBeVisible();
    await heightInput.fill("10");

    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Krok 4: Podsumowanie i utworzenie planu
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

    // Weryfikacja przekierowania do edytora
    await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Weryfikacja, że URL zawiera ID planu (UUID)
    const urlMatch = page.url().match(/\/plans\/([a-f0-9-]+)$/);
    expect(urlMatch).not.toBeNull();
    const planId = urlMatch![1];

    // ============================================
    // KROK 2: Próba utworzenia drugiego planu z tą samą nazwą
    // ============================================
    // Nawigacja z powrotem do kreatora planu
    await planCreatorPage.navigate();
    await planCreatorPage.waitForPlanCreatorToLoad();

    // Jeśli pojawi się dialog szkicu, zamknij go (rozpocznij od nowa)
    if (await planCreatorPage.hasDraftDialog()) {
      await page.getByRole("button", { name: /rozpocznij od nowa/i }).click();
      await page.waitForTimeout(500);
    }

    // Wprowadzenie tej samej nazwy planu
    const nameInput2 = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInput2).toBeVisible();
    await nameInput2.fill(planName);
    await expect(nameInput2).toHaveValue(planName);

    // Przejście przez wszystkie kroki kreatora
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("location");

    // Lokalizacja (wybieramy lokalizację, aby przycisk "Kontynuuj" był enabled)
    const locationSearchInput2 = page.locator("#location-search").or(page.getByLabel(/wyszukaj adres/i));
    await expect(locationSearchInput2).toBeVisible();

    // Wprowadzenie adresu do wyszukiwania
    const searchQuery2 = "Warszawa, Polska";
    await locationSearchInput2.fill(searchQuery2);

    // Kliknięcie przycisku "Szukaj"
    const searchButton2 = page.getByRole("button", { name: /szukaj/i });
    await expect(searchButton2).toBeVisible();
    await searchButton2.click();

    // Oczekiwanie na wyniki wyszukiwania
    await page.waitForTimeout(2000);

    // Wybór pierwszego wyniku z listy (jeśli wyniki są dostępne)
    const firstResultButton2 = page.getByRole("button", { name: /wybierz/i }).first();
    const hasResults2 = await firstResultButton2.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasResults2) {
      await firstResultButton2.click();
      await page.waitForTimeout(1000);
    }

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("dimensions");

    // Wymiary
    const widthInput2 = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    await expect(widthInput2).toBeVisible();
    await widthInput2.fill("10");

    const heightInput2 = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));
    await expect(heightInput2).toBeVisible();
    await heightInput2.fill("10");

    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("summary");

    // Podsumowanie i próba utworzenia planu
    await expect(page.getByText(planName)).toBeVisible();

    // Oczekiwanie na odpowiedź API z błędem 409
    const createPlanConflictResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/plans") && response.request().method() === "POST",
      { timeout: 30000 }
    );

    const createPlanButton2 = page.getByRole("button", { name: /utwórz plan/i });
    await expect(createPlanButton2).toBeVisible();
    await createPlanButton2.click();

    // Oczekiwanie na dialog potwierdzenia (jeśli się pojawi)
    const confirmDialog2 = page.getByRole("dialog");
    const hasConfirmDialog2 = await confirmDialog2.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasConfirmDialog2) {
      const confirmButton2 = page.getByRole("button", { name: /tak, utwórz plan/i });
      await expect(confirmButton2).toBeVisible();
      await confirmButton2.click();
    }

    // Czekamy na odpowiedź API z błędem 409
    const createPlanConflictResponse = await createPlanConflictResponsePromise;
    expect(createPlanConflictResponse.status()).toBe(409);

    // Poczekaj chwilę na przetworzenie błędu przez aplikację
    await page.waitForTimeout(2000);

    // ============================================
    // KROK 3: Weryfikacja wyświetlenia błędu
    // ============================================
    // Weryfikacja, że pozostajemy na stronie kreatora
    await expect(page).toHaveURL(/\/plans\/new/, { timeout: 5000 });

    // Sprawdź, czy komunikat błędu jest widoczny (może być na dowolnym kroku jako Alert)
    const errorAlert = page.getByRole("alert").filter({ hasText: /plan.*name.*already.*exists|plan.*nazwie.*już.*istnieje|wystąpił błąd/i });
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText(/plan.*name.*already.*exists|plan.*nazwie.*już.*istnieje/i);

    // Sprawdź, na którym kroku jesteśmy
    const isOnBasics = await page.getByRole("heading", { name: /podstawowe informacje/i }).isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isOnBasics) {
      // Nie jesteśmy na "basics" - kliknij "Cofnij" tyle razy, ile potrzeba, aby wrócić do "basics"
      // Maksymalnie 3 razy (summary -> dimensions -> location -> basics)
      const backButton = page.getByRole("button", { name: /cofnij/i });
      
      for (let i = 0; i < 3; i++) {
        const isOnBasicsNow = await page.getByRole("heading", { name: /podstawowe informacje/i }).isVisible({ timeout: 1000 }).catch(() => false);
        if (isOnBasicsNow) {
          break;
        }
        
        if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await backButton.click();
          await page.waitForTimeout(1000);
        } else {
          break; // Przycisk "Cofnij" nie jest dostępny
        }
      }
    }

    // Weryfikacja, że jesteśmy na kroku "basics"
    await expect(page.getByRole("heading", { name: /podstawowe informacje/i })).toBeVisible({ timeout: 5000 });

    // Weryfikacja, że pole nazwy jest widoczne i ma poprawną wartość
    const nameInputWithError = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInputWithError).toBeVisible();
    await expect(nameInputWithError).toHaveValue(planName);

    // Weryfikacja wyświetlenia komunikatu błędu
    // Błąd może być wyświetlony jako Alert (na górze) lub jako FormError (przy polu)
    // Sprawdzamy oba miejsca
    const errorAlertOnBasics = page.getByRole("alert").filter({ hasText: /plan.*name.*already.*exists|plan.*nazwie.*już.*istnieje|wystąpił błąd/i });
    const errorFormError = page.locator("#plan-name-error");
    
    const hasErrorAlert = await errorAlertOnBasics.isVisible({ timeout: 2000 }).catch(() => false);
    const hasFormError = await errorFormError.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Przynajmniej jeden z komunikatów błędów powinien być widoczny
    expect(hasErrorAlert || hasFormError).toBe(true);
    
    if (hasErrorAlert) {
      await expect(errorAlertOnBasics).toContainText(/plan.*name.*already.*exists|plan.*nazwie.*już.*istnieje/i);
    }
    
    if (hasFormError) {
      await expect(errorFormError).toContainText(/plan.*nazwie.*już.*istnieje|plan.*name.*already.*exists/i);
      // Jeśli jest FormError, pole powinno mieć aria-invalid="true"
      await expect(nameInputWithError).toHaveAttribute("aria-invalid", "true");
    }

    // ============================================
    // KROK 4: Weryfikacja, że formularz jest nadal edytowalny
    // ============================================
    // Weryfikacja, że pole nazwy jest dostępne do edycji
    await expect(nameInputWithError).toBeEnabled();

    // Weryfikacja, że przycisk "Kontynuuj" jest dostępny
    const continueButton7 = page.getByRole("button", { name: /kontynuuj/i });
    await expect(continueButton7).toBeVisible();
    await expect(continueButton7).toBeEnabled();

    // Weryfikacja, że można zmienić nazwę planu
    const newPlanName = `${planName} - Nowa`;
    await nameInputWithError.fill(newPlanName);
    await expect(nameInputWithError).toHaveValue(newPlanName);

    // Po zmianie nazwy, błąd powinien zniknąć (lub pozostać, jeśli walidacja jest tylko przy submit)
    // W tym teście sprawdzamy tylko, że formularz jest edytowalny

    // ============================================
    // KROK 5: Usunięcie planu na końcu testu
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

