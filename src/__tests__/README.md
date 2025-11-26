# Testy jednostkowe – Vitest

Ten katalog zawiera testy jednostkowe napisane w Vitest z React Testing Library.

## Struktura katalogów

```
src/__tests__/
├── components/         # Testy komponentów React
├── lib/                # Testy funkcji, serwisów, utility
└── mocks/              # Mock Service Worker (MSW)
    ├── handlers.ts     # Definicje mock API handlers
    └── server.ts       # MSW server setup
```

## Uruchamianie testów

```bash
# Uruchom wszystkie testy
npm test

# Tryb watch - automatyczne ponowne uruchomienie przy zmianach
npm run test:watch

# UI mode - wizualna inspekcja testów
npm run test:ui

# Z pokryciem kodu
npm run test:coverage
```

## Pisanie nowych testów

### Test funkcji/utility

```typescript
// src/lib/myFunction.ts
export function myFunction(input: string): string {
  return input.toUpperCase();
}

// src/__tests__/lib/myFunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/myFunction';

describe('myFunction', () => {
  it('should transform input to uppercase', () => {
    expect(myFunction('hello')).toBe('HELLO');
  });

  it('should handle empty string', () => {
    expect(myFunction('')).toBe('');
  });
});
```

### Test komponentu React

```typescript
// src/__tests__/components/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mockowanie API z MSW

```typescript
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/data', () => {
    return HttpResponse.json({ data: 'mocked' });
  }),
];

// W teście
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

it('handles API error', async () => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );
  
  // ... test code
});
```

## Najlepsze praktyki

1. **Arrange-Act-Assert** - uporządkuj testy w trzech sekcjach
2. **Testuj zachowanie, nie implementację** - testuj co robi komponent, nie jak
3. **Używaj opisowych nazw** - `it('should do X when Y happens')`
4. **Mockuj zależności** - używaj `vi.fn()`, `vi.mock()`, MSW
5. **Izoluj testy** - każdy test powinien być niezależny

## Dostępne narzędzia

### Vitest API
- `describe()` - grupuj powiązane testy
- `it()` / `test()` - pojedynczy test
- `expect()` - asercje
- `vi.fn()` - mock funkcji
- `vi.mock()` - mock modułu
- `beforeEach()` / `afterEach()` - setup/teardown

### React Testing Library
- `render()` - renderuj komponent
- `screen` - zapytania o elementy DOM
- `userEvent` - symulacja interakcji użytkownika
- `waitFor()` - czekaj na asynchroniczne operacje

### Custom matchers (jest-dom)
- `toBeInTheDocument()` - element jest w DOM
- `toBeVisible()` - element jest widoczny
- `toBeDisabled()` - element jest wyłączony
- `toHaveValue()` - pole ma wartość
- i wiele innych...

## Debugowanie

### UI Mode (najlepsze)
```bash
npm run test:ui
```

### Watch Mode
```bash
npm run test:watch
```

### Filtrowanie testów
```bash
# Tylko testy pasujące do wzorca
npm test -- -t "nazwa testu"

# Tylko określony plik
npm test -- src/__tests__/lib/utils.test.ts
```

## Więcej informacji

Zobacz [TESTING.md](../../TESTING.md) w głównym katalogu projektu.

