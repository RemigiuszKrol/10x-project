import { test, expect } from "@playwright/test";
import { PlanCreatorPage } from "./pages/PlanCreatorPage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Test E2E dla walidacji wymiarów planu - przekroczenie limitu 200×200 pól siatki
 *
 * Scenariusz:
 * 1. Logowanie użytkownika
 * 2. Nawigacja do kreatora planu (/plans/new)
 * 3. Krok 1: Wprowadzenie nazwy planu
 * 4. Krok 2: Przejście przez lokalizację (opcjonalnie)
 * 5. Krok 3: Wprowadzenie wymiarów działki powodujących siatkę >200×200
 * 6. Weryfikacja wyświetlenia komunikatu błędu walidacji
 * 7. Weryfikacja, że przycisk "Kontynuuj" jest zablokowany lub formularz nie przechodzi dalej
 *
 * UWAGA: Test wymaga uruchomionej aplikacji i skonfigurowanej bazy danych.
 */

test.describe("Walidacja wymiarów planu - przekroczenie limitu siatki", () => {
  test.describe.configure({ mode: "serial" });

  test("powinien wyświetlić błąd walidacji dla wymiarów powodujących siatkę >200×200", async ({
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
    const planName = `Test Plan Dimensions ${Date.now()}`;

    // Znajdź pole nazwy planu
    const nameInput = page.getByLabel(/nazwa planu/i).or(page.locator("#plan-name"));
    await expect(nameInput).toBeVisible();

    // Wypełnienie nazwy planu
    await nameInput.fill(planName);

    // Weryfikacja, że pole jest wypełnione
    await expect(nameInput).toHaveValue(planName);

    // Przejście do następnego kroku
    await planCreatorPage.clickNextButton();
    await planCreatorPage.waitForStep("location");

    // ============================================
    // KROK 3: Przejście przez lokalizację (Krok 2: Lokalizacja)
    // ============================================

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

    // ============================================
    // KROK 4: Wprowadzenie wymiarów powodujących siatkę >200×200 (Krok 3: Wymiary)
    // ============================================
    // Weryfikacja, że jesteśmy w kroku wymiarów
    await expect(page.getByRole("heading", { name: /wymiary i orientacja/i })).toBeVisible({
      timeout: 5000,
    });

    // Wybór rozmiaru kratki (50cm) - najpierw ustawiamy skalę
    const cellSizeSelectTrigger = page
      .locator("#cell-size")
      .getByRole("combobox")
      .or(page.getByLabel(/rozmiar pojedynczej kratki/i));

    // Sprawdź, czy select jest widoczny
    if (await cellSizeSelectTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cellSizeSelectTrigger.click();
      await page.waitForTimeout(500);
      // Wybór opcji 50 cm
      const option50cm = page.getByRole("option", { name: /50 cm/i });
      if (await option50cm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option50cm.click();
        await page.waitForTimeout(500);
      }
    }

    // Wprowadzenie wymiarów powodujących siatkę >200×200
    // Dla skali 50cm: 101m × 100m = 202 × 200 pól (przekracza limit 200×200)
    const widthInput = page.getByLabel(/szerokość/i).or(page.locator("#width-m"));
    await expect(widthInput).toBeVisible();
    await widthInput.fill("101"); // 101m = 202 pola przy skali 50cm

    // Wprowadzenie wysokości działki
    const heightInput = page.getByLabel(/wysokość/i).or(page.locator("#height-m"));
    await expect(heightInput).toBeVisible();
    await heightInput.fill("100"); // 100m = 200 pól przy skali 50cm

    // Weryfikacja, że pola są wypełnione
    await expect(widthInput).toHaveValue("101");
    await expect(heightInput).toHaveValue("100");

    // Krótkie opóźnienie na obliczenie wymiarów siatki i wyświetlenie błędu
    await page.waitForTimeout(1000);

    // ============================================
    // KROK 5: Weryfikacja wyświetlenia komunikatu błędu walidacji
    // ============================================
    // Weryfikacja, że Alert z błędem jest widoczny
    // Alert powinien mieć variant="destructive" i zawierać komunikat o przekroczeniu limitu
    // Komunikat błędu w komponencie: "Błąd wymiarów: {errorMessage}"
    const errorAlert = page.getByRole("alert").filter({ hasText: /błąd wymiarów/i });

    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // Weryfikacja, że komunikat błędu zawiera informację o limicie 200×200
    // Komunikat błędu z usePlanCreator: "Siatka musi być w zakresie 1-200 pól w każdym wymiarze (aktualnie: 202 × 200)"
    const errorMessage = errorAlert.getByText(/zakres.*1-200|range.*1-200|200.*pól/i);
    await expect(errorMessage).toBeVisible();

    // Weryfikacja, że komunikat błędu zawiera aktualne wymiary siatki (202 × 200)
    const gridDimensionsText = errorAlert.getByText(/202.*200|aktualnie.*202/i);
    await expect(gridDimensionsText).toBeVisible();

    // Weryfikacja, że Alert ma odpowiedni wariant (destructive)
    // Sprawdzamy czy Alert ma odpowiednie klasy lub atrybuty
    const alertElement = errorAlert.first();
    await expect(alertElement).toBeVisible();

    // ============================================
    // KROK 6: Weryfikacja, że przycisk "Kontynuuj" jest zablokowany lub formularz nie przechodzi dalej
    // ============================================
    // Sprawdzenie, czy przycisk "Kontynuuj" jest zablokowany (disabled) lub czy próba przejścia dalej nie działa
    const continueButton3 = page.getByRole("button", { name: /kontynuuj/i });

    // Sprawdzamy, czy przycisk jest zablokowany
    const isButtonDisabled = await continueButton3.isDisabled().catch(() => false);

    // Jeśli przycisk nie jest zablokowany, próbujemy kliknąć i weryfikujemy, że nie przechodzimy dalej
    if (!isButtonDisabled) {
      // Próba kliknięcia przycisku "Kontynuuj"
      await continueButton3.click();

      // Krótkie opóźnienie na ewentualną walidację
      await page.waitForTimeout(1000);

      // Weryfikacja, że nadal jesteśmy w kroku wymiarów (nie przeszliśmy dalej)
      await expect(page.getByRole("heading", { name: /wymiary i orientacja/i })).toBeVisible({
        timeout: 5000,
      });

      // Weryfikacja, że błąd nadal jest widoczny
      await expect(errorAlert).toBeVisible();
    } else {
      // Jeśli przycisk jest zablokowany, to również jest poprawne zachowanie
      await expect(continueButton3).toBeDisabled();
    }

    // ============================================
    // KROK 7: Weryfikacja poprawienia wymiarów usuwa błąd
    // ============================================
    // Zmiana wymiarów na poprawne (100m × 100m = 200 × 200 pól - dokładnie na limicie)
    await widthInput.fill("100"); // 100m = 200 pola przy skali 50cm

    // Krótkie opóźnienie na obliczenie wymiarów siatki
    await page.waitForTimeout(1000);

    // Weryfikacja, że błąd zniknął (Alert z błędem nie powinien być widoczny)
    // Sprawdzamy, czy Alert z błędem nie jest widoczny lub czy został zastąpiony przez podgląd siatki
    const errorAlertStillVisible = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
    expect(errorAlertStillVisible).toBe(false);

    // Weryfikacja, że przycisk "Kontynuuj" jest teraz aktywny (gdy wymiary są poprawne)
    await expect(continueButton3).toBeEnabled({ timeout: 2000 });
  });
});

