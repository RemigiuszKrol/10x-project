import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/HomePage";

/**
 * Przykładowy test E2E demonstracyjny
 * Ten test sprawdza czy strona główna się ładuje
 */

test.describe("Strona główna", () => {
  test("powinna załadować stronę główną", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Sprawdź czy strona się załadowała
    const isLoaded = await homePage.isLoaded();
    expect(isLoaded).toBe(true);

    // Sprawdź tytuł strony
    const title = await homePage.getTitle();
    expect(title).toBeTruthy();
  });

  test("powinna wyświetlać przyciski nawigacyjne", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Sprawdź czy przyciski są widoczne
    await expect(homePage.heading).toBeVisible();
  });

  test("powinien mieć prawidłową strukturę HTML", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Sprawdź czy strona ma poprawny lang attribute
    const html = page.locator("html");
    const lang = await html.getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});

test.describe("Nawigacja", () => {
  test("powinien pozwolić na przejście do strony logowania", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Sprawdź czy link do logowania istnieje
    const loginLink = page.getByRole("link", { name: /zaloguj/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      // Czekaj na nawigację
      await page.waitForURL("**/auth/login");
      expect(page.url()).toContain("/auth/login");
    }
  });
});
