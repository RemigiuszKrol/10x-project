# Dokumentacja testowania – PlantsPlaner

Ten dokument zawiera informacje o konfiguracji i używaniu frameworków testowych w projekcie PlantsPlaner.

## 📋 Spis treści

- [Instalacja](#instalacja)
- [Testy jednostkowe (Vitest)](#testy-jednostkowe-vitest)
- [Testy E2E (Playwright)](#testy-e2e-playwright)
- [Struktura katalogów](#struktura-katalogów)
- [Najlepsze praktyki](#najlepsze-praktyki)

## Instalacja

Wszystkie zależności testowe są już zainstalowane. Jeśli potrzebujesz ponownie je zainstalować:

```bash
npm install
```

## Testy jednostkowe (Vitest)

### Uruchamianie testów

```bash
# Uruchom wszystkie testy jednostkowe
npm test

# Uruchom testy w trybie watch (automatyczne ponowne uruchomienie przy zmianach)
npm run test:watch

# Uruchom testy z interfejsem UI
npm run test:ui

# Uruchom testy z pokryciem kodu (coverage)
npm run test:coverage
```

### Pisanie testów jednostkowych

#### Lokalizacja

Testy jednostkowe powinny być umieszczone w katalogu `src/__tests__/` lub obok testowanego pliku z rozszerzeniem `.test.ts` lub `.spec.ts`.

#### Przykład testu funkcji

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/utils';

describe('myFunction', () => {
  it('powinien zwrócić oczekiwaną wartość', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('powinien obsłużyć przypadki brzegowe', () => {
    expect(myFunction('')).toBe('');
    expect(myFunction(null)).toBe(null);
  });
});
```

#### Przykład testu komponentu React

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renderuje się poprawnie', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('obsługuje kliknięcia', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Mockowanie z MSW

Mock Service Worker (MSW) pozwala na mockowanie API requests w testach.

#### Konfiguracja handlerów

Edytuj plik `src/__tests__/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: 'mocked data' });
  }),
];
```

#### Użycie w testach

```typescript
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

// Override konkretnego handlera dla jednego testu
it('powinien obsłużyć błąd API', async () => {
  server.use(
    http.get('/api/endpoint', () => {
      return HttpResponse.json({ error: 'Error' }, { status: 500 });
    })
  );
  
  // ... test code
});
```

### Konfiguracja coverage

Minimalne progi pokrycia są ustawione na 80% dla:
- Statements
- Branches
- Functions
- Lines

Konfiguracja znajduje się w `vitest.config.ts`.

## Testy E2E (Playwright)

### Uruchamianie testów E2E

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# Uruchom testy E2E z interfejsem UI
npm run test:e2e:ui

# Uruchom testy E2E w trybie debug
npm run test:e2e:debug

# Generuj testy używając codegen
npm run test:e2e:codegen

# Pokaż raport z ostatnich testów
npm run test:e2e:report
```

### Pisanie testów E2E

#### Page Object Model

Testy E2E używają wzorca Page Object Model (POM) dla łatwiejszej maintainability.

**Przykład Page Object:**

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  readonly myButton: Locator;

  constructor(page: Page) {
    super(page);
    this.myButton = page.getByRole('button', { name: /kliknij/i });
  }

  async navigate() {
    await this.goto('/my-page');
  }

  async clickMyButton() {
    await this.myButton.click();
  }
}
```

**Użycie w teście:**

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from './pages/MyPage';

test('powinien wykonać akcję', async ({ page }) => {
  const myPage = new MyPage(page);
  await myPage.navigate();
  await myPage.clickMyButton();
  
  // Assertions
  await expect(page.locator('.success')).toBeVisible();
});
```

### Selektory

Używaj w kolejności preferencji:

1. **Role-based selectors** (najlepsze dla accessibility):
   ```typescript
   page.getByRole('button', { name: /submit/i })
   page.getByRole('heading', { level: 1 })
   ```

2. **Label selectors**:
   ```typescript
   page.getByLabel(/email/i)
   ```

3. **Text selectors**:
   ```typescript
   page.getByText('Exact text')
   ```

4. **Test ID selectors** (jako ostateczność):
   ```typescript
   page.getByTestId('my-element')
   ```

### Konfiguracja

Konfiguracja Playwright znajduje się w `playwright.config.ts`:

- Używamy tylko przeglądarki **Chromium** (Desktop Chrome)
- Retry: 2× w CI, 0× lokalnie
- Automatyczne uruchamianie aplikacji przed testami (`npm run preview`)
- Screenshot i video tylko przy błędach

## Struktura katalogów

```
project-root/
├── src/
│   └── __tests__/              # Testy jednostkowe
│       ├── components/         # Testy komponentów React
│       ├── lib/                # Testy funkcji/serwisów
│       └── mocks/              # MSW handlers i server
│           ├── handlers.ts     # API mock handlers
│           └── server.ts       # MSW server setup
├── e2e/                        # Testy E2E
│   ├── pages/                  # Page Objects
│   │   ├── BasePage.ts         # Bazowa klasa POM
│   │   ├── HomePage.ts         # Page Object dla strony głównej
│   │   └── LoginPage.ts        # Page Object dla logowania
│   ├── fixtures/               # Dane testowe
│   │   └── test-data.ts        # Wspólne dane testowe
│   └── *.spec.ts               # Pliki testowe E2E
├── vitest.config.ts            # Konfiguracja Vitest
├── vitest.setup.ts             # Setup dla Vitest
└── playwright.config.ts        # Konfiguracja Playwright
```

## Najlepsze praktyki

### Testy jednostkowe

1. **Testuj zachowanie, nie implementację**
   - Testuj co komponent robi, nie jak to robi
   - Unikaj testowania wewnętrznych stanów

2. **Używaj Arrange-Act-Assert**
   ```typescript
   it('przykład', () => {
     // Arrange - przygotuj dane
     const input = 'test';
     
     // Act - wykonaj akcję
     const result = myFunction(input);
     
     // Assert - sprawdź wynik
     expect(result).toBe('expected');
   });
   ```

3. **Mockuj zewnętrzne zależności**
   - Używaj `vi.fn()` dla funkcji
   - Używaj `vi.mock()` dla modułów
   - Używaj MSW dla API requests

4. **Opisuj testy jasno**
   - Używaj opisowych nazw: `it('powinien wykonać X gdy Y')`
   - Grupuj powiązane testy w `describe`

### Testy E2E

1. **Używaj Page Object Model**
   - Oddziel logikę strony od logiki testów
   - Łatwiejsza maintainability przy zmianach UI

2. **Używaj stabilnych selektorów**
   - Preferuj role, label, text nad CSS/XPath
   - Dodaj `data-testid` gdy to konieczne

3. **Testuj user flow**
   - Testuj kompletne scenariusze użytkownika
   - Nie testuj pojedynczych komponentów (to rola testów jednostkowych)

4. **Izoluj testy**
   - Każdy test powinien być niezależny
   - Używaj `beforeEach` do setupu

5. **Czekaj na asynchroniczne operacje**
   ```typescript
   await expect(element).toBeVisible();
   await page.waitForLoadState('networkidle');
   ```

## Continuous Integration

Testy są automatycznie uruchamiane w GitHub Actions przy każdym commit/PR.

### Lokalnie przed commit

```bash
# Uruchom testy jednostkowe
npm test

# Uruchom testy E2E
npm run test:e2e
```

### Debug

**Vitest:**
```bash
# UI mode - najlepsze do debugowania
npm run test:ui

# Watch mode - automatyczne re-run
npm run test:watch
```

**Playwright:**
```bash
# Debug mode - krok po kroku
npm run test:e2e:debug

# UI mode - wizualna inspekcja
npm run test:e2e:ui

# Codegen - nagrywanie testów
npm run test:e2e:codegen
```

## Przydatne linki

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

