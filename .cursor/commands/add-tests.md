Przygotuj kompleksowe testy jednostkowe dla pliku {{file}} zgodnie z dokumentacją w `.ai/test/test-plan.md` i `.cursor/rules/testing-unit-vitest.mdc`.

## Kroki do wykonania:
1. **Przeanalizuj plik źródłowy:**
- Zidentyfikuj wszystkie eksportowane funkcje, komponenty, klasy lub hooks
- Zidentyfikuj zależności zewnętrzne (API, baza danych, inne serwisy)
- Zidentyfikuj przypadki brzegowe i walidacje
- Określ typ pliku (serwis, komponent React, utility, hook, itp.)

2. **Określ lokalizację pliku testowego:**
- Dla plików w `src/lib/services/` → `src/__tests__/lib/services/`
- Dla plików w `src/lib/utils/` → `src/__tests__/lib/utils/`
- Dla plików w `src/lib/validation/` → `src/__tests__/lib/validation/`
- Dla komponentów w `src/components/` → `src/__tests__/components/`
- Dla hooks w `src/lib/hooks/` → `src/__tests__/lib/hooks/`
- Nazwa pliku testowego: `[nazwa-pliku].test.ts` lub `[nazwa-pliku].test.tsx` (dla komponentów React)

3. **Stwórz plik testowy z następującą strukturą:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Dodatkowe importy w zależności od typu pliku

// // Dla komponentów React:
// import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';

// // Dla serwisów z Supabase:
// import { createClient } from '@supabase/supabase-js';

// // Mocki zewnętrznych zależności na początku pliku
// vi.mock('path/to/external/dependency', () => ({
//   // mock implementation
// }));

// describe('[Nazwa modułu/funkcji]', () => {
//   beforeEach(() => {
//     // Setup przed każdym testem
//   });

//   afterEach(() => {
//     // Cleanup po każdym teście\n    vi.clearAllMocks();
//   });

//   describe('[Funkcja/Komponent 1]', () => {
//     it('should [oczekiwane zachowanie]', () => {
//       // Arrange
//       // Act
//       // Assert
//     });

//     it('should handle [edge case]', () => {
//       // Test edge case
//     });
//   });
// });
```

4. **Zasady pisania testów (zgodnie z dokumentacją):**
**Dla serwisów:**
- Testuj wszystkie eksportowane funkcje
- Testuj walidację danych wejściowych (Zod schemas)
- Testuj obsługę błędów (try-catch, error handling)
- Mockuj zewnętrzne zależności (Supabase, API) używając `vi.mock()`
- Testuj edge cases (null, undefined, puste wartości, wartości poza zakresem)
- Używaj `vi.spyOn()` do monitorowania wywołań funkcji
- Testuj RLS (Row Level Security) dla operacji na bazie danych

**Dla komponentów React:**
- Używaj React Testing Library (`render`, `screen`, `userEvent`)
- Testuj renderowanie komponentu z różnymi props
- Testuj interakcje użytkownika (kliknięcia, wpisywanie tekstu)
- Testuj walidację formularzy
- Testuj wyświetlanie błędów i komunikatów
- Testuj loading states
- Używaj `data-testid` lub `aria-label` dla selektorów

**Dla utilities:**
- Testuj wszystkie funkcje pomocnicze
- Testuj edge cases (null, undefined, wartości graniczne)
- Testuj konwersje i transformacje danych

**Dla hooks:**
- Używaj `@testing-library/react-hooks` lub `renderHook`
- Testuj zwracane wartości
- Testuj efekty uboczne (side effects)
- Testuj cleanup funkcji\n\n

5. **Best practices (z test-plan.md i testing-unit-vitest.mdc):**
- **Test isolation:** Każdy test jest niezależny (setup + cleanup)
- **Arrange-Act-Assert pattern:** Czytelna struktura testów
- **Descriptive names:** Nazwy testów opisują co testują (\"should calculate grid dimensions correctly\")
- **Mock external dependencies:** Używaj `vi.mock()` dla API, bazy danych, zewnętrznych serwisów
- **Use fixtures:** Stwórz helper functions/fixtures dla danych testowych
- **Fast tests:** Testy powinny być szybkie (< 1s per test suite)
- **Coverage ≥80%:** Dąż do pokrycia wszystkich ścieżek kodu
- **Type safety:** Używaj TypeScript, zachowaj typy w mockach
- **Use vi.fn() for mocks:** Dla funkcji mockowych
- **Use vi.spyOn() for spies:** Gdy chcesz monitorować istniejące funkcje
- **jsdom environment:** Dla testów komponentów React\n\n

6. **Przykłady testów (z test-plan.md):**
**Dla serwisu z walidacją:**
```typescript
  it('should throw ValidationError for invalid input', async () => {
    await expect(serviceFunction({
      invalid: 'data'
    })).rejects.toThrow('Validation error message');
  });
```

**Dla komponentu z formularzem:**
```typescript
  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<Component />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
```

7. **Po utworzeniu pliku testowego:**
- Uruchom testy: `npm run test [nazwa-pliku].test.ts`
- Sprawdź czy wszystkie testy przechodzą
- Sprawdź coverage: `npm run test:coverage`
- Upewnij się, że coverage dla tego pliku jest ≥80%

## Ważne uwagi:
- Używaj `describe` do grupowania powiązanych testów
- Każdy test powinien testować jedną rzecz
- Mockuj wszystkie zewnętrzne zależności (nie testuj rzeczywistych API/bazy danych)
- Testuj zarówno happy paths jak i error scenarios
- Dla funkcji krytycznych (walidacja, bezpieczeństwo, obliczenia biznesowe) dąż do 100% coverage
- Jeśli plik jest bardzo duży, skup się na najważniejszych funkcjach najpierw
- Sprawdź czy istnieją już jakieś testy dla tego pliku - jeśli tak, rozszerz je zamiast tworzyć nowe