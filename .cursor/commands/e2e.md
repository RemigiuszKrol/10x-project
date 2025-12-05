# Generowanie testu E2E dla PlantsPlaner

## Kontekst projektu

Jesteś w projekcie **PlantsPlaner** - aplikacji do planowania rozmieszczenia roślin ogrodowych. Projekt używa:
- **Astro 5** + **TypeScript 5** + **React 19** + **Tailwind 4** + **Shadcn/ui**
- **Playwright** do testów E2E (tylko Chromium/Desktop Chrome)
- **Supabase** jako backend (auth, baza danych)
- **Page Object Model** dla testów E2E

## Zadanie

Przygotuj kompletny test E2E dla następującego scenariusza:
{{linia}}


## Wymagania i instrukcje

### Krok 1: Analiza i doprecyzowanie

**WAŻNE:** Jeśli do wykonania implementacji testu konieczne jest doprecyzowanie szczegółów (np. brakujące selektory, niejasne zachowanie komponentu, brakujące dane testowe), **ZATRZYMAJ SIĘ** i zadaj użytkownikowi listę pytań wraz z rekomendacjami. **NIE ROZPOCZYNAJ** implementacji testu dopóki nie otrzymasz feedbacku od użytkownika.

Przykładowe pytania:
- Czy komponent używa konkretnych `data-testid` atrybutów?
- Jakie są dokładne teksty przycisków/etykiet w interfejsie?
- Czy istnieją helper functions do logowania użytkownika?
- Jakie są oczekiwane komunikaty błędów/sukcesu?

### Krok 2: Generowanie planu ASCII komponentu

Przeanalizuj strukturę komponentu wskazanego w scenariuszu (np. `RegisterForm`, `PlanCreator`, `GridCanvas`) i wygeneruj **plan ASCII** przedstawiający:

1. **Hierarchię komponentów** - jak komponenty są zagnieżdżone
2. **Elementy interaktywne** - przyciski, pola formularza, linki
3. **Stany komponentu** - loading, error, success, empty
4. **Przepływ danych** - skąd dane pochodzą, gdzie są wyświetlane

Format przykładu:
```
┌─────────────────────────────────────┐
│ RegisterForm                        │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ FormField (email)             │   │
│ │ └─ Input[type="email"]       │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ FormField (password)          │   │
│ │ └─ Input[type="password"]    │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ SubmitButton                  │   │
│ │ └─ Button["Zarejestruj się"] │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ FormError (opcjonalnie)       │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Krok 3: Opis kroków scenariusza testowego

Przygotuj szczegółowy opis kroków do wykonania w teście, zgodnie z formatem z `.ai/test/test-plan.md` (sekcja 3.2 Testy End-to-End). Każdy krok powinien zawierać:

1. **Akcję użytkownika** - co użytkownik robi (kliknięcie, wpisanie tekstu, nawigacja)
2. **Oczekiwany rezultat** - co powinno się wydarzyć po akcji
3. **Weryfikację** - jak sprawdzić, że akcja zakończyła się sukcesem

Przykład:
```
Krok 1: Nawigacja do strony rejestracji
  - Akcja: Przejście na URL `/auth/register`
  - Oczekiwany rezultat: Strona się ładuje, formularz rejestracji jest widoczny
  - Weryfikacja: `await expect(page.locator('form')).toBeVisible()`

Krok 2: Wypełnienie formularza
  - Akcja: Wpisanie emaila i hasła w odpowiednie pola
  - Oczekiwany rezultat: Pola są wypełnione
  - Weryfikacja: `await expect(emailInput).toHaveValue('test@example.com')`
```

### Krok 4: Przygotowanie konfiguracji w komponentach

Określ, jakie zmiany/konfiguracje są potrzebne w komponentach, aby test mógł działać poprawnie:

1. **Selektory testowe** - czy komponenty mają `data-testid` atrybuty?
   - Jeśli nie, zaproponuj dodanie ich w odpowiednich miejscach
   - Użyj formatu: `data-testid="component-name-element"`

2. **Dostępność (a11y)** - czy elementy mają odpowiednie `role`, `aria-label`?
   - To pomoże w tworzeniu stabilnych selektorów

3. **Stany komponentów** - czy komponenty mają odpowiednie klasy/stany dla loading/error/success?
   - Zaproponuj dodanie klas pomocniczych jeśli potrzeba

4. **Helper functions** - czy potrzebne są funkcje pomocnicze w Page Objects?
   - Np. `loginAsTestUser()`, `createTestPlan()`, `waitForGridToLoad()`

### Krok 5: Implementacja testu E2E

Napisz kompletny test E2E zgodnie z następującymi wytycznymi:

#### 5.1 Zgodność z regułami projektu

- **Przeczytaj i zastosuj** reguły z `.cursor/rules/testing-e2e-playwright.mdc`:
  - Używaj tylko Chromium/Desktop Chrome
  - Implementuj Page Object Model
  - Używaj locators zamiast selektorów CSS/XPath
  - Używaj `expect(page).toHaveScreenshot()` dla porównań wizualnych (opcjonalnie)
  - Implementuj test hooks dla setup/teardown
  - Używaj expect assertions z konkretnymi matcher'ami

#### 5.2 Struktura pliku testowego

```typescript
import { test, expect } from "@playwright/test";
// Import Page Objects jeśli istnieją
// Import helper functions jeśli istnieją

test.describe("Nazwa funkcjonalności", () => {
  // Setup/teardown hooks jeśli potrzebne
  test.beforeEach(async ({ page }) => {
    // Setup przed każdym testem
  });

  test("Opis scenariusza testowego", async ({ page }) => {
    // Implementacja testu
  });
});
```

#### 5.3 Użycie danych testowych

**WAŻNE - Autentykacja:**

Jeśli test wymaga zalogowanego użytkownika, **UŻYJ zmiennych środowiskowych** z pliku `.env.test`:

```typescript
// Pobierz dane z .env.test
const testUserEmail = process.env.E2E_USER_EMAIL || "test@example.com";
const testUserPassword = process.env.E2E_USER_PASSWORD || "Test1234!";

// Użyj w teście
await page.fill('[name="email"]', testUserEmail);
await page.fill('[name="password"]', testUserPassword);
```

**UWAGA:** Jeśli plik `.env.test` nie istnieje, utwórz go z przykładowymi wartościami:
```
E2E_USER_EMAIL=test@example.com
E2E_USER_PASSWORD=Test1234!
```

#### 5.4 Page Object Model

Jeśli Page Object dla danej strony nie istnieje, utwórz go w `e2e/pages/`:

```typescript
// e2e/pages/RegisterPage.ts
import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage"; // jeśli istnieje

export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page); // lub bezpośrednio this.page = page
    this.emailInput = page.getByLabel(/email/i); // preferuj role/label
    this.passwordInput = page.getByLabel(/hasło/i);
    this.submitButton = page.getByRole("button", { name: /zarejestruj/i });
    this.errorMessage = page.locator('[role="alert"]');
  }

  async navigate() {
    await this.page.goto("/auth/register");
  }

  async fillForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

#### 5.5 Stabilne selektory

**PRIORYTET SELEKTORÓW (od najlepszych do najgorszych):**
1. `getByRole()` - role, name
2. `getByLabel()` - label text
3. `getByText()` - tekst widoczny
4. `getByTestId()` - data-testid (jeśli dodane)
5. `locator()` z CSS selector (ostatnia opcja)

**Przykłady:**
```typescript
// ✅ DOBRZE
page.getByRole("button", { name: /zaloguj/i })
page.getByLabel(/email/i)
page.getByText("Rejestracja zakończona")

// ⚠️ AKCEPTOWALNE (jeśli data-testid istnieje)
page.getByTestId("register-submit-button")

// ❌ UNIKAJ (chyba że absolutnie konieczne)
page.locator(".btn-primary")
page.locator("#submit-btn")
```

#### 5.6 Oczekiwania i asercje

Używaj konkretnych matcher'ów:
```typescript
// Widoczność
await expect(element).toBeVisible();
await expect(element).toBeHidden();

// Tekst
await expect(element).toHaveText("Oczekiwany tekst");
await expect(element).toContainText("część tekstu");

// Atrybuty
await expect(element).toHaveAttribute("href", "/plans");
await expect(element).toHaveClass("active");

// URL
await expect(page).toHaveURL(/\/plans\/[a-f0-9-]+$/);

// Stan formularza
await expect(input).toHaveValue("wartość");
await expect(input).toBeEnabled();
await expect(input).toBeDisabled();
```

#### 5.7 Obsługa asynchroniczności

- Używaj `await` dla wszystkich operacji asynchronicznych
- Używaj `waitForURL()` dla nawigacji
- Używaj `waitForSelector()` tylko gdy konieczne (preferuj `expect().toBeVisible()`)
- Unikaj `waitForTimeout()` - używaj tylko w wyjątkowych przypadkach

#### 5.8 Izolacja testów

Każdy test powinien być niezależny:
- Używaj `test.beforeEach()` do setupu
- Używaj `test.afterEach()` do cleanupu jeśli potrzeba
- Nie polegaj na stanie z poprzednich testów
- Jeśli test wymaga danych (np. plan), utwórz je w teście lub użyj fixture

#### 5.9 Obsługa błędów i edge cases

Testuj również scenariusze błędów jeśli są częścią wymagań:
- Walidacja formularzy
- Komunikaty błędów
- Stany loading
- Empty states

### Krok 6: Dokumentacja i komentarze

Dodaj komentarze w kodzie wyjaśniające:
- **Cel testu** - co test weryfikuje
- **Kroki testu** - numerowane kroki w komentarzach
- **Oczekiwane rezultaty** - co powinno się wydarzyć
- **Uwagi** - szczególne przypadki, zależności, wymagania

Przykład:
```typescript
test("powinien zarejestrować nowego użytkownika", async ({ page }) => {
  // Krok 1: Nawigacja do strony rejestracji
  const registerPage = new RegisterPage(page);
  await registerPage.navigate();

  // Krok 2: Wypełnienie formularza poprawnymi danymi
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "Test1234!";
  await registerPage.fillForm(testEmail, testPassword);

  // Krok 3: Wysłanie formularza
  await registerPage.submit();

  // Krok 4: Weryfikacja przekierowania na stronę sukcesu
  await expect(page).toHaveURL("/auth/register-success");
  
  // Krok 5: Weryfikacja komunikatu sukcesu
  await expect(page.getByText(/rejestracja zakończona/i)).toBeVisible();
});
```

## Format wyjściowy

Przygotuj następujące pliki/zmiany:

1. **Plan ASCII komponentu** - w formacie markdown
2. **Opis kroków scenariusza** - w formacie markdown
3. **Lista wymaganych zmian w komponentach** - w formacie markdown (selektory, atrybuty)
4. **Plik testowy** - `e2e/[nazwa-funkcjonalnosci].spec.ts`
5. **Page Object** (jeśli potrzebny) - `e2e/pages/[NazwaPage].ts`
6. **Helper functions** (jeśli potrzebne) - `e2e/fixtures/helpers.ts` lub podobny
7. **Raport końcowy** - nie twórz plików z raportem końcowym z implementacji, masz zrobic tylko implementację testu
8. **Plan implementacji** - nie twórz pliku z planem implementacji
9. **Oznaczenie** - oznacz wykonany test w pliku @TODO-E2E-TESTS-List.md
