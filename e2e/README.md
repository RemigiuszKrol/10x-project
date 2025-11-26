# Testy E2E – Playwright

Ten katalog zawiera testy End-to-End napisane w Playwright.

## Struktura katalogów

```
e2e/
├── pages/              # Page Object Model - klasy reprezentujące strony
│   ├── BasePage.ts     # Bazowa klasa z wspólnymi metodami
│   ├── HomePage.ts     # Strona główna
│   └── LoginPage.ts    # Strona logowania
├── fixtures/           # Dane testowe i konfiguracja
│   └── test-data.ts    # Wspólne dane testowe (użytkownicy, plany)
└── *.spec.ts           # Pliki z testami E2E
```

## Uruchamianie testów

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# Tryb UI - wizualna inspekcja testów
npm run test:e2e:ui

# Tryb debug - krok po kroku
npm run test:e2e:debug

# Generowanie testów za pomocą codegen
npm run test:e2e:codegen

# Pokaż raport z ostatnich testów
npm run test:e2e:report
```

## Pisanie nowych testów

### 1. Utwórz Page Object (jeśli potrzebny)

```typescript
// e2e/pages/MyPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  readonly myElement: Locator;

  constructor(page: Page) {
    super(page);
    this.myElement = page.getByRole('button', { name: /click me/i });
  }

  async navigate() {
    await this.goto('/my-page');
  }

  async performAction() {
    await this.myElement.click();
  }
}
```

### 2. Napisz test

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { MyPage } from './pages/MyPage';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.navigate();
    await myPage.performAction();
    
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

## Najlepsze praktyki

1. **Używaj Page Object Model** - oddziel logikę strony od testów
2. **Stable selectors** - używaj role, label, text zamiast CSS/XPath
3. **Czekaj na elementy** - używaj `await expect(element).toBeVisible()`
4. **Izoluj testy** - każdy test powinien być niezależny
5. **Testuj user flows** - testuj kompletne scenariusze użytkownika

## Debugowanie

### Debug mode
```bash
npm run test:e2e:debug
```

### UI mode
```bash
npm run test:e2e:ui
```

### Codegen - nagrywanie testów
```bash
npm run test:e2e:codegen http://localhost:4321
```

## Więcej informacji

Zobacz [TESTING.md](../TESTING.md) w głównym katalogu projektu.

