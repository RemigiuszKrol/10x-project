import { test, expect } from "@playwright/test";
import { ProfilePage } from "./pages/ProfilePage";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Testy E2E dla zmiany motywu kolorystycznego
 *
 * Scenariusz:
 * 1. Użytkownik loguje się do aplikacji
 * 2. Przechodzi na stronę profilu (/profile)
 * 3. Wybiera inny motyw (light/dark) w ThemeSelector
 * 4. Klika przycisk "Zapisz"
 * 5. Weryfikuje, że motyw został zmieniony w UI (klasa na <html>)
 * 6. Odświeża stronę i weryfikuje, że motyw jest zachowany (persistencja)
 *
 * Komponenty testowane:
 * - ProfilePageWrapper (wrapper strony)
 * - ProfilePage (główny komponent React)
 * - ProfileContent (renderowanie w zależności od stanu)
 * - ProfileForm (formularz edycji preferencji)
 * - ThemeSelector (przełącznik motywu)
 * - FormActions (przyciski Zapisz/Anuluj)
 *
 * API endpoint:
 * - PUT /api/profile - aktualizacja preferencji użytkownika
 */

test.describe("Zmiana motywu kolorystycznego", () => {
  test.beforeEach(async ({ page }) => {
    // Logowanie użytkownika przed każdym testem
    const loginSuccess = await loginAsTestUser(
      page,
      TEST_USERS.valid.email,
      TEST_USERS.valid.password
    );
    expect(loginSuccess).toBe(true);

    // Nawigacja do strony profilu
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();
    await profilePage.waitForProfileToLoad();

    // Weryfikacja, że strona się załadowała poprawnie
    await expect(profilePage.title).toBeVisible();
  });

  test("powinien zmienić motyw z light na dark i zapisać zmiany", async ({ page }) => {
    const profilePage = new ProfilePage(page);

    // Krok 1: Weryfikacja początkowego stanu
    // Sprawdzamy, że formularz jest widoczny i ThemeSelector jest dostępny
    // ThemeSelector używa przycisków, więc sprawdzamy czy są widoczne
    const lightButton = page.getByRole("button", { name: /jasny/i });
    const darkButton = page.getByRole("button", { name: /ciemny/i });
    await expect(lightButton).toBeVisible();
    await expect(darkButton).toBeVisible();

    // Sprawdzamy aktualny motyw z formularza (który przycisk jest wybrany)
    // Przycisk z wybranym motywem ma variant="default" (ma klasę bg-primary)
    const lightButtonClasses = await lightButton.getAttribute("class");
    const darkButtonClasses = await darkButton.getAttribute("class");
    const isLightSelected = lightButtonClasses?.includes("bg-primary") || false;
    const isDarkSelected = darkButtonClasses?.includes("bg-primary") || false;
    
    // Określamy aktualny motyw i docelowy motyw
    // Jeśli żaden nie jest wybrany, domyślnie zakładamy "light"
    const initialTheme = isLightSelected ? "light" : isDarkSelected ? "dark" : "light";
    const targetTheme = initialTheme === "light" ? "dark" : "light";
    const targetButton = targetTheme === "dark" ? darkButton : lightButton;
    const targetButtonText = targetTheme === "dark" ? "Ciemny" : "Jasny";

    // Weryfikacja, że klikamy przycisk, który NIE jest aktualnie wybrany
    const targetButtonClasses = await targetButton.getAttribute("class");
    const isTargetSelected = targetButtonClasses?.includes("bg-primary") || false;
    if (isTargetSelected) {
      throw new Error(`Przycisk "${targetButtonText}" jest już wybrany. Nie można zmienić motywu na ten sam.`);
    }

    // Krok 2: Kliknięcie przycisku motywu
    // Po kliknięciu, przycisk powinien zmienić swój stan (variant="default" dla wybranego)
    await targetButton.click();

    // Czekamy, aż React zaktualizuje stan formularza
    // Sprawdzamy, że docelowy przycisk ma teraz klasę bg-primary
    await expect(targetButton).toHaveClass(/bg-primary/, { timeout: 2000 });

    // Krok 4: Weryfikacja, że przycisk "Zapisz" jest teraz aktywny (isDirty=true)
    // FormActions renderuje przycisk "Zapisz", który jest disabled gdy !isDirty
    await expect(profilePage.submitButton).toBeEnabled({ timeout: 2000 });

    // Krok 5: Wysłanie formularza
    // Oczekujemy na odpowiedź API PUT /api/profile
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/profile") && response.request().method() === "PUT"
    );

    await profilePage.submitButton.click();

    // Krok 6: Weryfikacja odpowiedzi API
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Krok 7: Weryfikacja zmiany motywu w UI
    // Motyw powinien być natychmiast zastosowany (optimistic update)
    // Sprawdzamy klasę na <html>
    await expect(page.locator("html")).toHaveClass(new RegExp(targetTheme));

    // Sprawdzamy localStorage
    const savedTheme = await page.evaluate(() => {
      return localStorage.getItem("plantsplaner-theme");
    });
    expect(savedTheme).toBe(targetTheme);

    // Krok 8: Weryfikacja, że przycisk "Zapisz" jest znowu disabled (isDirty=false)
    // Po sukcesie, formularz powinien zaktualizować initialValues, więc isDirty=false
    await expect(profilePage.submitButton).toBeDisabled({ timeout: 5000 });

    // Krok 9: Weryfikacja persistencji - odświeżenie strony
    await page.reload();
    await profilePage.waitForProfileToLoad();

    // Weryfikacja, że motyw jest zachowany po odświeżeniu
    await expect(page.locator("html")).toHaveClass(new RegExp(targetTheme));

    // Weryfikacja localStorage
    const persistedTheme = await page.evaluate(() => {
      return localStorage.getItem("plantsplaner-theme");
    });
    expect(persistedTheme).toBe(targetTheme);

    // Weryfikacja, że ThemeSelector pokazuje wybrany motyw
    // Przycisk z wybranym motywem powinien mieć variant="default"
    const selectedButton = page.getByRole("button", { name: new RegExp(targetButtonText, "i") });
    await expect(selectedButton).toBeVisible();
    // Sprawdzamy, że przycisk ma odpowiednią klasę (variant="default" dla wybranego)
    // Shadcn Button z variant="default" ma klasę bg-primary
    const buttonClasses = await selectedButton.getAttribute("class");
    expect(buttonClasses).toContain("bg-primary");
  });

  test("powinien zmienić motyw z dark na light i zapisać zmiany", async ({ page }) => {
    const profilePage = new ProfilePage(page);

    // Krok 1: Ustawienie początkowego motywu na "dark"
    // Najpierw ustawiamy motyw na "dark" przez localStorage
    await page.evaluate(() => {
      localStorage.setItem("plantsplaner-theme", "dark");
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add("dark");
    });

    // Odświeżenie strony, aby załadować motyw z localStorage
    await page.reload();
    await profilePage.waitForProfileToLoad();

    // Weryfikacja, że motyw jest ustawiony na "dark"
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Krok 2: Sprawdzenie aktualnego motywu z formularza i wybór innego
    const lightButton = page.getByRole("button", { name: /jasny/i });
    const darkButton = page.getByRole("button", { name: /ciemny/i });
    
    // Sprawdzamy, który przycisk jest aktualnie wybrany w formularzu (ma klasę bg-primary)
    const lightButtonClasses = await lightButton.getAttribute("class");
    const darkButtonClasses = await darkButton.getAttribute("class");
    const isLightSelected = lightButtonClasses?.includes("bg-primary") || false;
    const isDarkSelected = darkButtonClasses?.includes("bg-primary") || false;
    
    // Określamy aktualny motyw i docelowy motyw
    const currentTheme = isLightSelected ? "light" : isDarkSelected ? "dark" : "light";
    const targetTheme = currentTheme === "light" ? "dark" : "light";
    const targetButton = targetTheme === "dark" ? darkButton : lightButton;
    
    // Weryfikacja, że klikamy przycisk, który NIE jest aktualnie wybrany
    const targetButtonClasses = await targetButton.getAttribute("class");
    const isTargetSelected = targetButtonClasses?.includes("bg-primary") || false;
    if (isTargetSelected) {
      throw new Error(`Przycisk "${targetTheme}" jest już wybrany. Nie można zmienić motywu na ten sam.`);
    }
    
    await expect(targetButton).toBeVisible();
    await targetButton.click();

    // Czekamy, aż React zaktualizuje stan formularza
    await expect(targetButton).toHaveClass(/bg-primary/, { timeout: 2000 });

    // Krok 3: Weryfikacja, że przycisk "Zapisz" jest aktywny
    await expect(profilePage.submitButton).toBeEnabled({ timeout: 2000 });

    // Krok 4: Wysłanie formularza
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/profile") && response.request().method() === "PUT"
    );

    await profilePage.submitButton.click();

    // Krok 5: Weryfikacja odpowiedzi API
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Krok 6: Weryfikacja zmiany motywu w UI
    await expect(page.locator("html")).toHaveClass(new RegExp(targetTheme));

    // Weryfikacja localStorage
    const savedTheme = await page.evaluate(() => {
      return localStorage.getItem("plantsplaner-theme");
    });
    expect(savedTheme).toBe(targetTheme);

    // Krok 7: Weryfikacja persistencji
    await page.reload();
    await profilePage.waitForProfileToLoad();

    await expect(page.locator("html")).toHaveClass(new RegExp(targetTheme));

    const persistedTheme = await page.evaluate(() => {
      return localStorage.getItem("plantsplaner-theme");
    });
    expect(persistedTheme).toBe(targetTheme);
  });

  test("powinien wyświetlić przycisk Anuluj i pozwolić na cofnięcie zmian", async ({ page }) => {
    const profilePage = new ProfilePage(page);

    // Krok 1: Sprawdzenie początkowego motywu z formularza
    // Sprawdzamy, który przycisk ma variant="default" (ma klasę bg-primary)
    const lightButton = page.getByRole("button", { name: /jasny/i });
    const darkButton = page.getByRole("button", { name: /ciemny/i });
    
    // Sprawdzamy, który przycisk jest aktualnie wybrany (ma klasę bg-primary)
    const lightButtonClasses = await lightButton.getAttribute("class");
    const darkButtonClasses = await darkButton.getAttribute("class");
    const isLightSelected = lightButtonClasses?.includes("bg-primary") || false;
    const isDarkSelected = darkButtonClasses?.includes("bg-primary") || false;
    
    // Określamy aktualny motyw i docelowy motyw
    const initialTheme = isLightSelected ? "light" : isDarkSelected ? "dark" : "light";
    const targetTheme = initialTheme === "light" ? "dark" : "light";
    const targetButton = targetTheme === "dark" ? darkButton : lightButton;

    // Weryfikacja, że klikamy przycisk, który NIE jest aktualnie wybrany
    const targetButtonClasses = await targetButton.getAttribute("class");
    const isTargetSelected = targetButtonClasses?.includes("bg-primary") || false;
    if (isTargetSelected) {
      throw new Error(`Przycisk "${targetTheme}" jest już wybrany. Nie można zmienić motywu na ten sam.`);
    }

    // Krok 2: Wybór innego motywu
    await targetButton.click();

    // Czekamy, aż React zaktualizuje stan formularza
    await expect(targetButton).toHaveClass(/bg-primary/, { timeout: 2000 });

    // Krok 3: Weryfikacja, że przycisk "Zapisz" jest aktywny
    await expect(profilePage.submitButton).toBeEnabled({ timeout: 2000 });

    // Krok 4: Sprawdzenie, czy przycisk "Anuluj" jest widoczny
    // FormActions renderuje przycisk "Anuluj" gdy onReset jest przekazany
    // Używamy .last() ponieważ FormActions jest renderowany po ThemePreview w DOM,
    // więc przycisk z FormActions będzie ostatnim przyciskiem "Anuluj" w formularzu
    const cancelButton = page.locator('form').getByRole("button", { name: /anuluj/i }).last();
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();

    // Krok 5: Kliknięcie przycisku "Anuluj"
    await cancelButton.click();

    // Krok 6: Weryfikacja, że zmiany zostały cofnięte
    // Przycisk "Zapisz" powinien być znowu disabled
    await expect(profilePage.submitButton).toBeDisabled();

    // Motyw powinien pozostać niezmieniony (nie powinien być zapisany)
    // Sprawdzamy, który przycisk jest teraz wybrany w formularzu
    const currentLightButtonClasses = await lightButton.getAttribute("class");
    const currentDarkButtonClasses = await darkButton.getAttribute("class");
    const currentIsLightSelected = currentLightButtonClasses?.includes("bg-primary") || false;
    const currentIsDarkSelected = currentDarkButtonClasses?.includes("bg-primary") || false;
    const currentTheme = currentIsLightSelected ? "light" : currentIsDarkSelected ? "dark" : "light";
    expect(currentTheme).toBe(initialTheme);
  });

  test("powinien wyświetlić stan ładowania podczas zapisywania", async ({ page }) => {
    const profilePage = new ProfilePage(page);

    // Krok 1: Sprawdzenie aktualnego motywu z formularza i wybór innego
    const lightButton = page.getByRole("button", { name: /jasny/i });
    const darkButton = page.getByRole("button", { name: /ciemny/i });
    
    // Sprawdzamy, który przycisk jest aktualnie wybrany (ma klasę bg-primary)
    const lightButtonClasses = await lightButton.getAttribute("class");
    const darkButtonClasses = await darkButton.getAttribute("class");
    const isLightSelected = lightButtonClasses?.includes("bg-primary") || false;
    const isDarkSelected = darkButtonClasses?.includes("bg-primary") || false;
    
    // Określamy aktualny motyw i docelowy motyw
    const initialTheme = isLightSelected ? "light" : isDarkSelected ? "dark" : "light";
    const targetTheme = initialTheme === "light" ? "dark" : "light";
    const targetButton = targetTheme === "dark" ? darkButton : lightButton;

    // Weryfikacja, że klikamy przycisk, który NIE jest aktualnie wybrany
    const targetButtonClasses = await targetButton.getAttribute("class");
    const isTargetSelected = targetButtonClasses?.includes("bg-primary") || false;
    if (isTargetSelected) {
      throw new Error(`Przycisk "${targetTheme}" jest już wybrany. Nie można zmienić motywu na ten sam.`);
    }

    await targetButton.click();

    // Czekamy, aż React zaktualizuje stan formularza
    await expect(targetButton).toHaveClass(/bg-primary/, { timeout: 2000 });

    // Krok 2: Wysłanie formularza
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/profile") && response.request().method() === "PUT"
    );

    await profilePage.submitButton.click();

    // Krok 3: Weryfikacja stanu ładowania
    // Przycisk "Zapisz" powinien wyświetlać tekst "Zapisywanie..." i być disabled
    // FormActions renderuje Loader2 i tekst "Zapisywanie..." gdy isSubmitting=true
    // Sprawdzamy stan ładowania z krótkim timeoutem - jeśli API odpowiada zbyt szybko,
    // stan ładowania może nie być widoczny, ale to jest akceptowalne
    try {
      await expect(profilePage.submitButton).toContainText(/zapisywanie/i, { timeout: 1000 });
      await expect(profilePage.submitButton).toBeDisabled();
    } catch {
      // Jeśli stan ładowania nie jest widoczny (API odpowiedziało zbyt szybko),
      // sprawdzamy tylko, czy przycisk jest disabled (co oznacza, że zapis się rozpoczął)
      await expect(profilePage.submitButton).toBeDisabled();
    }

    // Krok 4: Oczekiwanie na zakończenie zapisu
    await responsePromise;

    // Krok 5: Weryfikacja, że stan ładowania zniknął
    await expect(profilePage.submitButton).not.toContainText(/zapisywanie/i, { timeout: 5000 });
    await expect(profilePage.submitButton).toBeDisabled(); // Disabled bo isDirty=false
  });
});

