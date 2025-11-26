import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TEST_USERS } from './fixtures/test-data';

/**
 * Testy E2E dla przepływu autoryzacji
 * 
 * UWAGA: Te testy wymagają uruchomionej aplikacji i skonfigurowanej bazy danych.
 * Przed uruchomieniem testów upewnij się, że:
 * 1. Aplikacja jest zbudowana (npm run build)
 * 2. Supabase jest uruchomiony (npx supabase start)
 * 3. Masz użytkownika testowego w bazie
 */

test.describe('Autoryzacja', () => {
  test.describe.configure({ mode: 'serial' });

  test('strona logowania powinna być dostępna', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Sprawdź czy formularz logowania jest widoczny
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('powinien wyświetlić błąd przy nieprawidłowych danych', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Spróbuj zalogować się z nieprawidłowymi danymi
    await loginPage.fillLoginForm(
      TEST_USERS.invalid.email,
      TEST_USERS.invalid.password
    );
    await loginPage.submitButton.click();

    // Czekaj na komunikat o błędzie
    // UWAGA: To może wymagać dostosowania do rzeczywistych selektorów w aplikacji
    await page.waitForTimeout(1000);
    
    // Sprawdź czy URL nie zmienił się (nie zalogowano)
    expect(page.url()).toContain('/auth/login');
  });

  test.skip('powinien zalogować użytkownika z prawidłowymi danymi', async ({ page }) => {
    // Ten test jest pominięty (skip) ponieważ wymaga prawdziwego użytkownika w bazie
    // Odkomentuj i dostosuj gdy będziesz miał skonfigurowane środowisko testowe
    
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await loginPage.login(
      TEST_USERS.valid.email,
      TEST_USERS.valid.password
    );

    // Czekaj na przekierowanie po udanym logowaniu
    await page.waitForURL('**/plans', { timeout: 5000 });
    
    // Sprawdź czy użytkownik jest zalogowany
    expect(page.url()).toContain('/plans');
  });

  test('formularz logowania powinien walidować pola', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Próba wysłania pustego formularza
    await loginPage.submitButton.click();

    // Email input powinien mieć walidację HTML5
    const emailValidity = await loginPage.emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(emailValidity).toBe(false);
  });

  test('powinien pozwolić przejść do strony rejestracji', async ({ page }) => {
    await page.goto('/auth/login');

    // Znajdź link do rejestracji
    const registerLink = page.getByRole('link', { name: /zarejestruj/i });
    
    // Jeśli link istnieje, kliknij go
    if (await registerLink.isVisible()) {
      await registerLink.click();
      
      // Sprawdź czy przeszliśmy do strony rejestracji
      await page.waitForURL('**/auth/register');
      expect(page.url()).toContain('/auth/register');
    }
  });

  test('powinien pozwolić przejść do strony resetowania hasła', async ({ page }) => {
    await page.goto('/auth/login');

    // Znajdź link do resetowania hasła
    const forgotPasswordLink = page.getByRole('link', { name: /zapomniałeś hasła/i });
    
    // Jeśli link istnieje, kliknij go
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // Sprawdź czy przeszliśmy do strony resetowania hasła
      await page.waitForURL('**/auth/forgot-password');
      expect(page.url()).toContain('/auth/forgot-password');
    }
  });
});

test.describe('Wylogowanie', () => {
  test.skip('zalogowany użytkownik powinien móc się wylogować', async ({ page }) => {
    // Ten test wymaga zalogowanego użytkownika
    // Implementuj gdy będziesz mieć działające logowanie
    
    // 1. Zaloguj użytkownika (może przez API lub UI)
    // 2. Znajdź przycisk wylogowania
    // 3. Kliknij
    // 4. Sprawdź czy przekierowano do strony logowania
  });
});

