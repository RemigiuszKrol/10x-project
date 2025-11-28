# Plan testów – PlantsPlaner

**Data utworzenia:** 2025-11-26  
**Wersja:** 1.0  
**Status:** Zatwierdzony do realizacji  
**Autor:** QA Team

---

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Niniejszy plan testów definiuje strategię, zakres i podejście do testowania aplikacji **PlantsPlaner** w fazie MVP, skupiając się na **testach jednostkowych (Unit Tests)** i **testach End-to-End (E2E Tests)**. Dokument określa typy testów, scenariusze testowe, środowisko, narzędzia, harmonogram oraz kryteria akceptacji.

### 1.2 Cele testowania

1. **Weryfikacja funkcjonalności** – potwierdzenie, że wszystkie wymagania funkcjonalne zostały zaimplementowane zgodnie z PRD poprzez testy jednostkowe i E2E
2. **Zapewnienie jakości kodu** – wykrycie błędów i defektów na poziomie jednostkowym (funkcje, komponenty) przed integracją
3. **Walidacja przepływów użytkownika** – weryfikacja kompletnych scenariuszy użytkownika od początku do końca (E2E)
4. **Osiągnięcie wysokiego pokrycia** – zapewnienie min. 80% coverage testów jednostkowych dla całej bazy kodu
5. **Stabilność i utrzymywalność** – tworzenie stabilnych, szybkich i łatwych w utrzymaniu testów
6. **Wczesne wykrywanie regresji** – uruchamianie testów w CI/CD przy każdym commit/PR dla natychmiastowej informacji zwrotnej

### 1.3 Dokumenty referencyjne

- **PRD (Product Requirements Document)**: `.ai/docs/prd.md`
- **Tech Stack**: `.ai/docs/tech-stack.md`
- **Specyfikacja API**: katalog `.ai/endpoints/`
- **Testy manualne istniejące**: katalog `.ai/testing/`
- **Schemat bazy danych**: `supabase/migrations/`

---

## 2. Zakres testów

### 2.1 Funkcjonalności w zakresie testów

#### A. Moduł Autentykacji i Profilu

- Rejestracja użytkownika (email/hasło)
- Logowanie i wylogowanie
- Zarządzanie sesją (Supabase Auth)
- Profil użytkownika (język, motyw)
- Weryfikacja emaila (Inbucket w środowisku dev)
- Reset hasła

#### B. Moduł Planów Działki

- Tworzenie nowego planu (nazwa, lokalizacja, orientacja, wymiary)
- Listowanie planów z paginacją (cursor-based)
- Pobieranie szczegółów planu
- Edycja planu (z potwierdzeniem regeneracji siatki)
- Usuwanie planu
- Walidacja wymiarów siatki (max 200×200, cell_size: 10/25/50/100 cm)

#### C. Moduł Siatki (Grid)

- Generowanie siatki na podstawie wymiarów planu
- Wyświetlanie metadanych siatki
- Listowanie komórek siatki z filtrowaniem (typ, bbox, paginacja)
- Aktualizacja typu pojedynczej komórki
- Zaznaczanie i ustawianie typu dla obszaru komórek
- Potwierdzenie przy usuwaniu roślin (409 Conflict flow)

#### D. Moduł Nasadzeń Roślin

- Dodawanie rośliny do komórki (tylko typ 'soil')
- Listowanie nasadzeń z filtrowaniem (nazwa, paginacja)
- Aktualizacja nasadzenia (upsert)
- Usuwanie rośliny z komórki
- Walidacja reguły 1 roślina = 1 komórka
- Scoring roślin (sunlight, humidity, precipitation, temperature, overall: 1-5)

#### E. Moduł Pogody (Open-Meteo)

- Pobieranie danych pogodowych dla lokalizacji planu
- Cache miesięczny danych pogodowych
- Odświeżanie danych z wymuszeniem (force refresh)
- Normalizacja metryk (nasłonecznienie, wilgotność, opady, temperatura)

#### F. Moduł AI (OpenRouter)

- Wyszukiwanie roślin po nazwie (search)
- Ocena dopasowania rośliny do lokalizacji (fit)
- Walidacja odpowiedzi AI (strict JSON schema)
- Obsługa timeout (10s)
- Obsługa błędów AI (rate limit, network, bad JSON)
- Tryb mock (PUBLIC_USE_MOCK_AI=true)

#### G. Moduł Lokalizacji (Leaflet + OSM)

- Geokodowanie adresu (Nominatim API)
- Wyświetlanie mapy z pinezką lokalizacji
- Wybór lokalizacji na mapie

#### H. Moduł Analityki

- Rejestrowanie zdarzeń (plan_created, grid_saved, area_typed, plant_confirmed)
- Listowanie zdarzeń z filtrowaniem (plan_id, paginacja)

### 2.2 Funkcjonalności poza zakresem testów MVP

- Współdzielenie planów między użytkownikami
- Wewnętrzna baza wymagań hodowlanych roślin
- Zaawansowany asystent przesadzania
- Asystent tworzenia planów pielęgnacji
- Undo/Redo operacji
- Drag & drop roślin
- Warstwy edycji
- CAPTCHA przy rejestracji
- Weryfikacja 2FA

---

## 3. Typy testów do przeprowadzenia

### 3.1 Testy jednostkowe (Unit Tests)

**Cel:** Weryfikacja poprawności działania pojedynczych funkcji, komponentów i modułów w izolacji.

**Zakres:**

#### Serwisy (`src/lib/services/`)

- **`plans.service.ts`**
  - Tworzenie planu z walidacją wymiarów
  - Obliczanie grid_width i grid_height
  - Walidacja maksymalnego rozmiaru siatki (200×200)
  - Walidacja podzielności wymiarów przez cell_size
  - Aktualizacja planu (z/bez regeneracji siatki)
  - Usuwanie planu

- **`grid-cells.service.ts`**
  - Generowanie komórek siatki
  - Aktualizacja typu pojedynczej komórki
  - Walidacja współrzędnych (0-199, w granicach siatki)
  - Walidacja typu komórki (soil, path, water, building, blocked)

- **`grid-area.service.ts`**
  - Ustawianie typu dla obszaru komórek
  - Walidacja obszaru (x1≤x2, y1≤y2)
  - Walidacja granic obszaru (w obrębie siatki)
  - Wykrywanie konfliktów z roślinami

- **`plant-placements.service.ts`**
  - Dodawanie rośliny (upsert)
  - Walidacja nazwy rośliny (1-100 znaków)
  - Walidacja scoring (1-5, nullable)
  - Walidacja typu komórki (tylko 'soil')
  - Usuwanie rośliny

- **`weather.service.ts`**
  - Pobieranie danych z Open-Meteo
  - Normalizacja metryk (nasłonecznienie, wilgotność, opady, temperatura)
  - Cache miesięczny (sprawdzanie last_refreshed_at)
  - Parsowanie odpowiedzi API

- **`openrouter.service.ts`**
  - Wyszukiwanie roślin (search)
  - Ocena dopasowania (fit)
  - Walidacja odpowiedzi JSON (strict schema)
  - Timeout handling (10s)
  - Tryb mock

- **`profile.service.ts`**
  - Aktualizacja preferencji (język, motyw)
  - Walidacja language_code
  - Walidacja theme (light, dark, system)

- **`analytics-events.service.ts`**
  - Rejestrowanie zdarzeń (plan_created, grid_saved, area_typed, plant_confirmed)
  - Walidacja atrybutów zdarzeń

#### Walidacja (`src/lib/validation/`)

- **Schematy Zod**
  - Walidacja wymiarów planów
  - Walidacja współrzędnych (x, y, bbox)
  - Walidacja UUID
  - Walidacja email, latitude, longitude
  - Walidacja scoring (1-5)
  - Walidacja paginacji (limit 1-100, cursor)

#### Utilities (`src/lib/utils/`)

- **`temperature.ts`** – konwersje Celsius/Fahrenheit
- **`date-format.ts`** – formatowanie dat ISO 8601
- **`rate-limiter.ts`** – throttling zapytań
- **`logger.ts`** – logowanie z poziomami (debug, info, warn, error)
- **`toast-error-handler.ts`** – mapowanie błędów na komunikaty użytkownika

#### Komponenty React (`src/components/`)

**Priorytet P0 (Krytyczne - wymagane):**

- `auth/LoginForm.tsx`
- `auth/RegisterForm.tsx`
- `auth/ForgotPasswordForm.tsx`
- `auth/ResetPasswordForm.tsx`
- `auth/FormField.tsx`
- `auth/FormError.tsx`
- `auth/SubmitButton.tsx`
- `plans/PlanCreator.tsx`
- `plans/steps/PlanCreatorStepBasics.tsx`
- `plans/steps/PlanCreatorStepLocation.tsx`
- `plans/steps/PlanCreatorStepDimensions.tsx`
- `plans/steps/PlanCreatorStepSummary.tsx`
- `plans/OrientationCompass.tsx`
- `profile/ProfileForm.tsx`
- `profile/ThemeSelector.tsx`
- `profile/ThemePreview.tsx`
- `editor/GridCanvas/GridCanvas.tsx`
- `editor/GridCanvas/PlantIcon.tsx`
- `editor/GridCanvas/SelectionOverlay.tsx`
- `editor/modals/AddPlantDialog.tsx`
- `editor/modals/SearchTab.tsx`
- `editor/modals/ManualTab.tsx`
- `editor/modals/PlantFitDisplay.tsx`
- `editor/modals/AreaTypeConfirmDialog.tsx`
- `editor/modals/DeletePlantConfirmDialog.tsx`
- `editor/modals/CellNotSoilDialog.tsx`
- `editor/modals/AIErrorDialog.tsx`
- `editor/SideDrawer/SideDrawer.tsx`
- `editor/SideDrawer/PlantsTab.tsx`
- `editor/SideDrawer/PlantsList.tsx`
- `editor/SideDrawer/PlantCard.tsx`
- `editor/SideDrawer/PlantSearchForm.tsx`
- `editor/SideDrawer/WeatherTab.tsx`
- `editor/SideDrawer/WeatherMonthlyChart.tsx`
- `editor/SideDrawer/WeatherMetricsTable.tsx`
- `editor/SideDrawer/ParametersTab.tsx`
- `location/LocationSearch.tsx`
- `location/LocationResultsList.tsx`
- `location/LocationMap.tsx`

**Priorytet P1 (Wysoki - zalecane):**

- `AutoRefresh.tsx`
- `editor/QueryProvider.tsx`
- `editor/ToastProvider.tsx`
- `editor/EditorLayout.tsx`
- `editor/EditorToolbar.tsx`
- `editor/EditorTopbar.tsx`
- `editor/EditorStatusIndicators.tsx`
- `editor/AreaTypePanel.tsx`
- `editor/BottomPanel.tsx`
- `editor/modals/CellInfoBadge.tsx`
- `editor/modals/GridRegenerationConfirmDialog.tsx`
- `plans/PlansList.tsx`
- `plans/PlanRow.tsx`
- `plans/DeletePlanDialog.tsx`
- `plans/EmptyState.tsx`
- `plans/ErrorState.tsx`
- `plans/LoadingState.tsx`
- `plans/GridPreview.tsx`
- `profile/ProfilePageWrapper.tsx`
- `profile/ProfileSkeleton.tsx`
- `profile/ProfileErrorFallback.tsx`
- `profile/PreferenceSummary.tsx`
- `profile/FormActions.tsx`

**Narzędzia:**

- **Vitest** – runner testowy dla Vite
- **React Testing Library** – testy komponentów React
- **@testing-library/jest-dom** – matchery DOM
- **@testing-library/user-event** – symulacja interakcji użytkownika
- **msw** (Mock Service Worker) – mockowanie API

**Przykładowe scenariusze:**

```typescript
// Przykład 1: plans.service.ts - walidacja wymiarów
describe('createPlan', () => {
  it('should calculate grid dimensions correctly', async () => {
    const result = await createPlan({
      name: 'Test Plan',
      width_cm: 1000,
      height_cm: 800,
      cell_size_cm: 50,
      orientation: 0
    });

    expect(result.grid_width).toBe(20);  // 1000 / 50
    expect(result.grid_height).toBe(16); // 800 / 50
  });

  it('should throw ValidationError for grid > 200x200', async () => {
    await expect(createPlan({
      name: 'Too Large',
      width_cm: 20100,
      height_cm: 20100,
      cell_size_cm: 100,
      orientation: 0
    })).rejects.toThrow('Grid dimensions must be between 1 and 200');
  });

  it('should throw ValidationError for non-divisible dimensions', async () => {
    await expect(createPlan({
      name: 'Invalid',
      width_cm: 503,  // nie dzieli się przez 25
      height_cm: 500,
      cell_size_cm: 25,
      orientation: 0
    })).rejects.toThrow('Width must be divisible by cell size');
  });
});

// Przykład 2: plant-placements.service.ts - walidacja
describe('addPlantPlacement', () => {
  it('should add plant to soil cell', async () => {
    const result = await addPlantPlacement({
      planId: 'test-plan-id',
      x: 5,
      y: 5,
      payload: { plant_name: 'Pomidor' },
      userId: 'test-user-id'
    });

    expect(result.plant_name).toBe('Pomidor');
    expect(result.x).toBe(5);
    expect(result.y).toBe(5);
  });

  it('should throw error when cell is not soil', async () => {
    await expect(addPlantPlacement({
      planId: 'test-plan-id',
      x: 5,
      y: 5,  // komórka typu 'path'
      payload: { plant_name: 'Pomidor' },
      userId: 'test-user-id'
    })).rejects.toThrow('Only soil cells can contain plants');
  });

  it('should validate plant name length', async () => {
    await expect(addPlantPlacement({
      planId: 'test-plan-id',
      x: 5,
      y: 5,
      payload: { plant_name: 'A'.repeat(101) },  // za długie
      userId: 'test-user-id'
    })).rejects.toThrow('Plant name must be at most 100 characters');
  });

  it('should validate scoring range', async () => {
    await expect(addPlantPlacement({
      planId: 'test-plan-id',
      x: 5,
      y: 5,
      payload: {
        plant_name: 'Pomidor',
        sunlight_score: 10  // poza zakresem 1-5
      },
      userId: 'test-user-id'
    })).rejects.toThrow('Score must be between 1 and 5');
  });
});

// Przykład 3: Komponenty React - LoginForm
describe('LoginForm', () => {
  it('should render email and password inputs', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();  // blur

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it('should call onSubmit with form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Test1234!');
    await user.click(screen.getByRole('button', { name: /zaloguj/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Test1234!'
    });
  });
});

// Przykład 4: Utilities - temperature.ts
describe('temperature conversion', () => {
  it('should convert Celsius to Fahrenheit', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it('should convert Fahrenheit to Celsius', () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });
});
```

**Kryteria pokrycia:**

- **Minimalny coverage: 80%** dla wszystkich kategorii (statements, branches, functions, lines)
- **Priorytet: 100% coverage** dla funkcji krytycznych:
  - Walidacja danych wejściowych (Zod schemas)
  - Operacje związane z bezpieczeństwem (auth, RLS checks)
  - Obliczenia biznesowe (grid dimensions, scoring)

**Best practices:**

- Testy są niezależne (każdy test może działać w izolacji)
- Używamy fixtures i factory functions dla danych testowych
- Mockujemy zewnętrzne zależności (API, baza danych)
- Testy są szybkie (< 1s per test suite)
- Nazwy testów są deskryptywne (describe what, it should...)

---

### 3.2 Testy End-to-End (E2E Tests)

**Cel:** Weryfikacja kompletnych przepływów użytkownika od początku do końca, testowanie integracji wszystkich komponentów systemu w środowisku zbliżonym do produkcyjnego.

**Zakres:**

#### Przepływy autentykacji

- **Rejestracja i pierwsze logowanie**
  1. Rejestracja nowego użytkownika z poprawnymi danymi
  2. Weryfikacja przekierowania na stronę sukcesu
  3. (Opcjonalnie) Weryfikacja emaila przez Inbucket
  4. Pierwsze logowanie z nowymi danymi
  5. Weryfikacja przekierowania na listę planów

- **Logowanie i wylogowanie**
  1. Logowanie z poprawnymi danymi
  2. Weryfikacja dostępu do chronionych stron
  3. Wylogowanie
  4. Weryfikacja przekierowania na stronę logowania
  5. Weryfikacja braku dostępu do chronionych stron

- **Reset hasła**
  1. Kliknięcie "Forgot password"
  2. Wprowadzenie emaila
  3. Sprawdzenie emaila w Inbucket
  4. Kliknięcie linku resetującego
  5. Ustawienie nowego hasła
  6. Logowanie z nowym hasłem

#### Przepływy zarządzania planami

- **Tworzenie nowego planu (pełny przepływ kreatora)**
  1. Przejście do `/plans/new`
  2. **Krok 1 - Podstawy:**
     - Wprowadzenie nazwy planu
     - Przejście do następnego kroku
  3. **Krok 2 - Lokalizacja:**
     - Wyszukanie adresu (geokodowanie)
     - Wybór lokalizacji na mapie
     - Weryfikacja współrzędnych
     - Przejście do następnego kroku
  4. **Krok 3 - Wymiary:**
     - Ustawienie wymiarów (width, height)
     - Wybór rozmiaru komórki (10/25/50/100 cm)
     - Ustawienie orientacji (kompas)
     - Wybór półkuli (northern/southern)
     - Weryfikacja podglądu wymiarów siatki
  5. **Krok 4 - Podsumowanie:**
     - Przegląd wszystkich danych
     - Kliknięcie "Utwórz plan"
  6. **Weryfikacja:**
     - Przekierowanie na stronę edytora `/plans/:id`
     - Wyświetlenie siatki
     - Poprawne wymiary siatki

- **Edycja istniejącego planu**
  1. Otworzenie listy planów
  2. Wybór planu do edycji
  3. Kliknięcie "Edytuj parametry"
  4. Zmiana nazwy planu
  5. Zmiana lokalizacji
  6. Zapisanie zmian
  7. Weryfikacja aktualizacji danych

- **Usuwanie planu**
  1. Otworzenie listy planów
  2. Kliknięcie "Usuń" przy wybranym planie
  3. Potwierdzenie usunięcia w dialogu
  4. Weryfikacja usunięcia z listy

#### Przepływy pracy z siatką

- **Edycja typu komórek**
  1. Otworzenie planu w edytorze
  2. Wybór narzędzia "Select"
  3. Zaznaczenie obszaru komórek (przeciągnięcie myszą)
  4. Wybór typu z panelu (soil, path, water, building)
  5. Kliknięcie "Zastosuj"
  6. Weryfikacja zmiany kolorów komórek

- **Edycja z potwierdzeniem usunięcia roślin**
  1. Dodanie roślin do obszaru 'soil'
  2. Zaznaczenie obszaru zawierającego rośliny
  3. Zmiana typu na 'path'
  4. Weryfikacja wyświetlenia dialogu potwierdzenia
  5. Potwierdzenie usunięcia roślin
  6. Weryfikacja zmiany typu i usunięcia roślin

#### Przepływy pracy z roślinami

- **Dodawanie rośliny z AI (pełny przepływ)**
  1. Otworzenie planu w edytorze
  2. Wybór narzędzia "Add plant"
  3. Kliknięcie na komórkę typu 'soil'
  4. Otwarcie dialogu dodawania rośliny
  5. **Zakładka "Wyszukaj":**
     - Wprowadzenie nazwy rośliny (np. "Pomidor")
     - Kliknięcie "Szukaj"
     - Weryfikacja loading state
     - Wyświetlenie listy kandydatów
  6. **Wybór rośliny:**
     - Kliknięcie na wybraną roślinę z listy
     - Automatyczne przejście do oceny dopasowania
  7. **Ocena dopasowania:**
     - Weryfikacja loading state
     - Wyświetlenie scoring (sunlight, humidity, precip, temperature, overall)
     - Wyświetlenie wyjaśnienia AI
  8. **Potwierdzenie:**
     - Kliknięcie "Dodaj roślinę"
     - Zamknięcie dialogu
     - Weryfikacja ikony rośliny na siatce
  9. **Weryfikacja w liście roślin:**
     - Otwarcie zakładki "Rośliny" w panelu bocznym
     - Sprawdzenie czy roślina jest na liście

- **Dodawanie rośliny ręcznie (bez AI)**
  1. Otworzenie dialogu dodawania rośliny
  2. Przełączenie na zakładkę "Dodaj ręcznie"
  3. Wprowadzenie nazwy rośliny
  4. Kliknięcie "Dodaj"
  5. Weryfikacja dodania rośliny (bez scoring)

- **Usuwanie rośliny**
  1. Kliknięcie prawym przyciskiem na komórkę z rośliną
  2. Wybór "Usuń roślinę" z menu kontekstowego
  3. Potwierdzenie usunięcia w dialogu
  4. Weryfikacja usunięcia ikony
  5. Weryfikacja usunięcia z listy roślin

- **Przeglądanie listy roślin**
  1. Otwarcie zakładki "Rośliny" w panelu bocznym
  2. Weryfikacja wyświetlenia wszystkich roślin
  3. Filtrowanie po nazwie
  4. Sortowanie listy
  5. Kliknięcie na roślinę w liście (highlight na siatce)

#### Przepływy pracy z pogodą

- **Automatyczne pobieranie danych pogodowych**
  1. Utworzenie planu z lokalizacją
  2. Otwarcie zakładki "Pogoda" w panelu bocznym
  3. Weryfikacja automatycznego pobrania danych
  4. Weryfikacja wyświetlenia wykresu miesięcznego
  5. Weryfikacja metryk (nasłonecznienie, wilgotność, opady, temperatura)

- **Ręczne odświeżanie danych pogodowych**
  1. Otwarcie zakładki "Pogoda"
  2. Kliknięcie "Odśwież dane"
  3. Weryfikacja loading state
  4. Weryfikacja aktualizacji danych
  5. Weryfikacja updated timestamp

#### Przepływy zarządzania profilem

- **Zmiana języka interfejsu**
  1. Przejście do `/profile`
  2. Wybór języka z listy rozwijanej
  3. Kliknięcie "Zapisz"
  4. Weryfikacja zmiany języka (etykiety, komunikaty)
  5. Odświeżenie strony – weryfikacja persistencji

- **Zmiana motywu kolorystycznego**
  1. Przejście do `/profile`
  2. Wybór motywu (light/dark/system)
  3. Weryfikacja live preview zmian
  4. Kliknięcie "Zapisz"
  5. Weryfikacja zastosowania motywu
  6. Odświeżenie strony – weryfikacja persistencji

**Narzędzia:**

- **Playwright** – framework E2E (wsparcie dla Chrome, Firefox, WebKit)
- **Local Supabase** – środowisko testowe z Docker
- **Inbucket** – przechwytywanie emaili (localhost:54324)
- **MSW** (opcjonalnie) – mockowanie zewnętrznych API dla stabilnych testów

**Przykładowe scenariusze:**

```typescript
// Przykład 1: Pełny przepływ rejestracji i logowania
test("User can register and login", async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "Test1234!";

  // Rejestracja
  await page.goto("/auth/register");
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="password"]', testPassword);
  await page.fill('[name="confirmPassword"]', testPassword);
  await page.click('button:has-text("Zarejestruj się")');

  // Weryfikacja przekierowania
  await expect(page).toHaveURL("/auth/register-success");

  // Logowanie
  await page.goto("/auth/login");
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="password"]', testPassword);
  await page.click('button:has-text("Zaloguj")');

  // Weryfikacja zalogowania
  await expect(page).toHaveURL("/plans");
  await expect(page.locator("text=Wyloguj")).toBeVisible();
});

// Przykład 2: Tworzenie planu (kreator wieloetapowy)
test("User can create a new plan via wizard", async ({ page }) => {
  // Zaloguj się
  await loginAsTestUser(page);

  // Rozpocznij tworzenie planu
  await page.goto("/plans/new");

  // Krok 1: Podstawy
  await page.fill('[name="name"]', "Mój ogród testowy");
  await page.click('button:has-text("Dalej")');

  // Krok 2: Lokalizacja
  await page.fill('[name="address"]', "Warszawa, Polska");
  await page.click('button:has-text("Szukaj")');
  await page.waitForSelector(".map-marker", { timeout: 5000 });
  await page.click('button:has-text("Dalej")');

  // Krok 3: Wymiary
  await page.fill('[name="width_m"]', "10");
  await page.fill('[name="height_m"]', "10");
  await page.selectOption('[name="cell_size_cm"]', "50");
  await page.fill('[name="orientation"]', "0");
  await page.selectOption('[name="hemisphere"]', "northern");

  // Weryfikacja podglądu wymiarów
  await expect(page.locator("text=Siatka: 20 × 20")).toBeVisible();

  await page.click('button:has-text("Dalej")');

  // Krok 4: Podsumowanie
  await expect(page.locator("text=Mój ogród testowy")).toBeVisible();
  await expect(page.locator("text=10m × 10m")).toBeVisible();

  await page.click('button:has-text("Utwórz plan")');

  // Weryfikacja przekierowania i wyświetlenia edytora
  await expect(page).toHaveURL(/\/plans\/[a-f0-9-]+$/);
  await expect(page.locator(".grid-canvas")).toBeVisible();
  await expect(page.locator(".grid-cell")).toHaveCount(400); // 20 × 20
});

// Przykład 3: Dodawanie rośliny z AI
test("User can add plant with AI assistance", async ({ page }) => {
  // Przygotowanie: zaloguj się i otwórz plan
  await loginAsTestUser(page);
  const planId = await createTestPlan(page);
  await page.goto(`/plans/${planId}`);

  // Wybierz narzędzie dodawania rośliny
  await page.click('[data-tool="add_plant"]');

  // Kliknij na komórkę typu 'soil'
  await page.click('.grid-cell[data-x="5"][data-y="5"]');

  // Weryfikacja otwarcia dialogu
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Wyszukaj roślinę
  await page.fill('[name="searchQuery"]', "Pomidor");
  await page.click('button:has-text("Szukaj")');

  // Oczekuj na wyniki (loading state)
  await expect(page.locator("text=Wyszukiwanie...")).toBeVisible();
  await expect(page.locator("text=Wyszukiwanie...")).not.toBeVisible({ timeout: 15000 });

  // Wybierz pierwszą roślinę z listy
  await page.click(".plant-candidate:first-child");

  // Oczekuj na ocenę dopasowania
  await expect(page.locator("text=Ocena dopasowania...")).toBeVisible();
  await expect(page.locator("text=Ocena dopasowania...")).not.toBeVisible({ timeout: 15000 });

  // Weryfikacja wyświetlenia scoring
  await expect(page.locator('[data-score-type="sunlight"]')).toBeVisible();
  await expect(page.locator('[data-score-type="overall"]')).toBeVisible();

  // Dodaj roślinę
  await page.click('button:has-text("Dodaj roślinę")');

  // Weryfikacja zamknięcia dialogu i wyświetlenia rośliny
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.locator('.grid-cell[data-x="5"][data-y="5"] .plant-icon')).toBeVisible();

  // Weryfikacja w liście roślin
  await page.click('[data-tab="plants"]');
  await expect(page.locator('.plant-list-item:has-text("Pomidor")')).toBeVisible();
});

// Przykład 4: Edycja obszaru z potwierdzeniem usunięcia roślin
test("User must confirm when changing area type removes plants", async ({ page }) => {
  // Przygotowanie
  await loginAsTestUser(page);
  const planId = await createTestPlan(page);
  await addTestPlant(page, planId, 5, 5, "Pomidor");
  await page.goto(`/plans/${planId}`);

  // Wybierz narzędzie select
  await page.click('[data-tool="select"]');

  // Zaznacz obszar zawierający roślinę (drag)
  await page.hover('.grid-cell[data-x="4"][data-y="4"]');
  await page.mouse.down();
  await page.hover('.grid-cell[data-x="6"][data-y="6"]');
  await page.mouse.up();

  // Wybierz typ 'path' (usuwa rośliny)
  await page.click('[data-area-type="path"]');
  await page.click('button:has-text("Zastosuj")');

  // Weryfikacja dialogu potwierdzenia
  await expect(page.locator('[role="alertdialog"]')).toBeVisible();
  await expect(page.locator("text=1 roślina zostanie usunięta")).toBeVisible();

  // Anuluj
  await page.click('button:has-text("Anuluj")');
  await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();

  // Powtórz operację i potwierdź
  await page.click('button:has-text("Zastosuj")');
  await page.click('button:has-text("Potwierdź")');

  // Weryfikacja usunięcia rośliny i zmiany typu
  await expect(page.locator('.grid-cell[data-x="5"][data-y="5"] .plant-icon')).not.toBeVisible();
  await expect(page.locator('.grid-cell[data-x="5"][data-y="5"][data-type="path"]')).toBeVisible();
});

// Przykład 5: Zmiana motywu w profilu
test("User can change theme and see it persist", async ({ page }) => {
  await loginAsTestUser(page);

  // Przejdź do profilu
  await page.goto("/profile");

  // Sprawdź aktualny motyw (domyślnie light)
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Zmień na dark
  await page.click('[data-theme-option="dark"]');

  // Weryfikacja live preview
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Zapisz
  await page.click('button:has-text("Zapisz")');
  await expect(page.locator("text=Profil zaktualizowany")).toBeVisible();

  // Odśwież stronę
  await page.reload();

  // Weryfikacja persistencji
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
```

**Kryteria pokrycia:**

- **Wszystkie kluczowe przepływy użytkownika (happy paths)** – 100% pokrycie głównych scenariuszy
- **Scenariusze błędów:**
  - Validation errors (niepoprawne dane w formularzach)
  - Network failures (timeout AI, błędy API)
  - Konflikty (duplicate names, area type conflicts)
- **Responsywność UI:**
  - Loading states (spinners, skeletons)
  - Error messages (toasts, inline errors)
  - Success confirmations (toasts, redirects)
  - Empty states (brak danych)

**Best practices:**

- **Test isolation** – każdy test jest niezależny (setup + cleanup)
- **Page Object Model** – enkapsulacja selektorów i akcji w helper functions
- **Stable selectors** – używamy `data-testid`, `aria-label`, `role`
- **Timeouts** – odpowiednie timeouts dla operacji (AI: 15s, API: 5s)
- **Retry logic** – automatyczne retry w CI (max 2×)
- **Parallel execution** – testy mogą być uruchamiane równolegle
- **Visual snapshots** – screenshot comparisons dla krytycznych widoków

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Rejestracja i logowanie

| ID       | Scenariusz                        | Kroki                                                                                                              | Oczekiwany wynik                                       | Priorytet |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------- |
| AUTH-001 | Rejestracja z poprawnymi danymi   | 1. Otwórz /auth/register<br>2. Wypełnij email i hasło<br>3. Kliknij "Zarejestruj się"                              | Status 201, przekierowanie na /auth/register-success   | P0        |
| AUTH-002 | Rejestracja z istniejącym emailem | 1. Zarejestruj użytkownika<br>2. Spróbuj zarejestrować ponownie z tym samym emailem                                | Status 409, komunikat "User already exists"            | P1        |
| AUTH-003 | Logowanie z poprawnymi danymi     | 1. Otwórz /auth/login<br>2. Wprowadź email i hasło<br>3. Kliknij "Zaloguj"                                         | Status 200, przekierowanie na /plans, cookie ustawione | P0        |
| AUTH-004 | Logowanie z niepoprawnym hasłem   | 1. Otwórz /auth/login<br>2. Wprowadź poprawny email i błędne hasło                                                 | Status 401, komunikat "Invalid credentials"            | P1        |
| AUTH-005 | Wylogowanie                       | 1. Zaloguj się<br>2. Kliknij "Wyloguj"                                                                             | Cookie usunięte, przekierowanie na /auth/login         | P0        |
| AUTH-006 | Reset hasła                       | 1. Kliknij "Forgot password"<br>2. Wprowadź email<br>3. Sprawdź Inbucket<br>4. Kliknij link<br>5. Ustaw nowe hasło | Email wysłany, hasło zmienione, możliwość zalogowania  | P2        |

### 4.2 Tworzenie i zarządzanie planami

| ID       | Scenariusz                                       | Kroki                                                                         | Oczekiwany wynik                                               | Priorytet |
| -------- | ------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- |
| PLAN-001 | Utworzenie minimalnego planu                     | 1. POST /api/plans z name, width_cm, height_cm, cell_size_cm, orientation     | Status 201, plan utworzony, grid_width i grid_height obliczone | P0        |
| PLAN-002 | Utworzenie planu z lokalizacją                   | 1. POST /api/plans z danymi + latitude, longitude, hemisphere                 | Status 201, lokalizacja zapisana                               | P0        |
| PLAN-003 | Walidacja: za duża siatka (>200×200)             | 1. POST /api/plans z width_cm=20100, cell_size_cm=100                         | Status 400, błąd "Grid dimensions must be ≤200"                | P0        |
| PLAN-004 | Walidacja: niepodzielne wymiary                  | 1. POST /api/plans z width_cm=503, cell_size_cm=25                            | Status 400, błąd "Width must be divisible by cell_size"        | P1        |
| PLAN-005 | Walidacja: konflikt nazwy                        | 1. Utwórz plan "Test"<br>2. Utwórz drugi plan "Test"                          | Status 409, błąd "Plan with this name already exists"          | P1        |
| PLAN-006 | Edycja nazwy planu                               | 1. PATCH /api/plans/:id z { name: "Nowa nazwa" }                              | Status 200, nazwa zaktualizowana                               | P0        |
| PLAN-007 | Edycja wymiarów BEZ zmiany siatki                | 1. PATCH /api/plans/:id z proporcjonalnymi wymiarami                          | Status 200, grid_width i grid_height bez zmian                 | P1        |
| PLAN-008 | Edycja wymiarów Z zmianą siatki (conflict)       | 1. PATCH /api/plans/:id z nowymi wymiarami (bez confirm_regenerate)           | Status 409, błąd "Set confirm_regenerate=true"                 | P0        |
| PLAN-009 | Edycja wymiarów Z zmianą siatki (confirmed)      | 1. PATCH /api/plans/:id?confirm_regenerate=true                               | Status 200, siatka zregenerowana, rośliny usunięte             | P0        |
| PLAN-010 | Usunięcie planu                                  | 1. DELETE /api/plans/:id                                                      | Status 204, plan usunięty (wraz z grid_cells, plants)          | P0        |
| PLAN-011 | Listowanie planów z paginacją                    | 1. GET /api/plans?limit=5                                                     | Status 200, max 5 planów, next_cursor present (jeśli więcej)   | P0        |
| PLAN-012 | RLS: użytkownik A nie widzi planów użytkownika B | 1. Utwórz plan jako user A<br>2. Zaloguj się jako user B<br>3. GET /api/plans | Status 200, lista nie zawiera planu user A                     | P0        |

### 4.3 Operacje na siatce

| ID       | Scenariusz                                   | Kroki                                                                               | Oczekiwany wynik                                               | Priorytet |
| -------- | -------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- |
| GRID-001 | Pobieranie metadanych siatki                 | 1. GET /api/plans/:id/grid                                                          | Status 200, grid_width, grid_height, cell_size_cm, orientation | P0        |
| GRID-002 | Listowanie komórek siatki                    | 1. GET /api/plans/:id/grid/cells                                                    | Status 200, lista komórek z x, y, type                         | P0        |
| GRID-003 | Filtrowanie komórek po typie                 | 1. GET /api/plans/:id/grid/cells?type=soil                                          | Status 200, tylko komórki typu "soil"                          | P1        |
| GRID-004 | Filtrowanie komórek po bbox                  | 1. GET /api/plans/:id/grid/cells?bbox=0,0,10,10                                     | Status 200, komórki w zakresie 0-10, 0-10                      | P1        |
| GRID-005 | Aktualizacja typu pojedynczej komórki        | 1. PUT /api/plans/:id/grid/cells/5/5 z { type: "path" }                             | Status 200, type zaktualizowany                                | P0        |
| GRID-006 | Aktualizacja typu obszaru komórek            | 1. POST /api/plans/:id/grid/area-type z x1, y1, x2, y2, type                        | Status 200, affected_cells count                               | P0        |
| GRID-007 | Aktualizacja obszaru z roślinami (conflict)  | 1. Dodaj rośliny w obszarze<br>2. POST /grid/area-type z type != soil (bez confirm) | Status 409, komunikat o usunięciu roślin                       | P0        |
| GRID-008 | Aktualizacja obszaru z roślinami (confirmed) | 1. POST /grid/area-type z confirm_plant_removal=true                                | Status 200, rośliny usunięte, typ zmieniony                    | P0        |
| GRID-009 | Walidacja: współrzędne poza siatką           | 1. PUT /grid/cells/200/200 (dla siatki 40×40)                                       | Status 422, błąd "Coordinates out of bounds"                   | P1        |

### 4.4 Nasadzenia roślin

| ID        | Scenariusz                                          | Kroki                                                                             | Oczekiwany wynik                                        | Priorytet |
| --------- | --------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- | --------- |
| PLANT-001 | Dodanie rośliny do komórki typu 'soil'              | 1. PUT /api/plans/:id/plants/5/5 z { plant_name: "Pomidor" }                      | Status 200, roślina dodana                              | P0        |
| PLANT-002 | Dodanie rośliny z wszystkimi score'ami              | 1. PUT z plant_name + sunlight_score, humidity_score, precip_score, overall_score | Status 200, wszystkie score zapisane                    | P0        |
| PLANT-003 | Aktualizacja istniejącej rośliny (upsert)           | 1. PUT na pozycję z istniejącą rośliną                                            | Status 200, roślina zaktualizowana, updated_at nowe     | P0        |
| PLANT-004 | Próba dodania rośliny do komórki typu 'path'        | 1. Ustaw komórkę jako 'path'<br>2. PUT /plants/x/y                                | Status 422, błąd "Only 'soil' cells can contain plants" | P0        |
| PLANT-005 | Walidacja: brak plant_name                          | 1. PUT /plants/x/y z {}                                                           | Status 400, błąd "Plant name is required"               | P1        |
| PLANT-006 | Walidacja: score poza zakresem (1-5)                | 1. PUT z sunlight_score=10                                                        | Status 400, błąd "Score must be between 1 and 5"        | P1        |
| PLANT-007 | Walidacja: nazwa rośliny > 100 znaków               | 1. PUT z plant_name="A".repeat(101)                                               | Status 400, błąd "Plant name max 100 characters"        | P1        |
| PLANT-008 | Listowanie nasadzeń                                 | 1. GET /api/plans/:id/plants                                                      | Status 200, lista roślin posortowana po plant_name      | P0        |
| PLANT-009 | Filtrowanie nasadzeń po nazwie                      | 1. GET /plants?name=Pomidor                                                       | Status 200, tylko rośliny zaczynające się na "Pomidor"  | P1        |
| PLANT-010 | Usunięcie rośliny                                   | 1. DELETE /api/plans/:id/plants/5/5                                               | Status 204, roślina usunięta, komórka pozostaje 'soil'  | P0        |
| PLANT-011 | RLS: użytkownik A nie może dodać rośliny do planu B | 1. Zaloguj się jako user A<br>2. PUT /plants do planu user B                      | Status 404, brak dostępu                                | P0        |

### 4.5 Integracja z AI (OpenRouter)

| ID     | Scenariusz                          | Kroki                                                  | Oczekiwany wynik                                       | Priorytet |
| ------ | ----------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | --------- |
| AI-001 | Wyszukiwanie rośliny                | 1. POST /api/ai/plants/search z { query: "Pomidor" }   | Status 200, candidates zawiera rośliny                 | P0        |
| AI-002 | Ocena dopasowania rośliny           | 1. POST /api/ai/plants/fit z plan_id, x, y, plant_name | Status 200, scoring (1-5) + explanation                | P0        |
| AI-003 | Timeout AI (>10s)                   | 1. Symuluj wolne API<br>2. POST /search lub /fit       | Status 504, błąd "AI request timeout"                  | P1        |
| AI-004 | Błąd: niepoprawna odpowiedź JSON    | 1. Mock AI zwraca invalid JSON<br>2. POST /search      | Status 502, błąd "Invalid AI response"                 | P1        |
| AI-005 | Rate limit AI                       | 1. Wyślij >100 żądań w minutę                          | Status 429, błąd "Rate limit exceeded"                 | P2        |
| AI-006 | Tryb mock (PUBLIC_USE_MOCK_AI=true) | 1. Ustaw env var<br>2. POST /search lub /fit           | Status 200, mock data zamiast prawdziwej odpowiedzi AI | P1        |

### 4.6 Integracja z Open-Meteo

| ID          | Scenariusz                             | Kroki                                                    | Oczekiwany wynik                                                | Priorytet |
| ----------- | -------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | --------- |
| WEATHER-001 | Pobieranie danych pogodowych dla planu | 1. GET /api/plans/:id/weather                            | Status 200, 12 rekordów (miesiące), metryki znormalizowane      | P0        |
| WEATHER-002 | Cache miesięczny                       | 1. GET /weather dwukrotnie w odstępie < 1 miesiąca       | Drugi GET zwraca cache (last_refreshed_at bez zmian)            | P1        |
| WEATHER-003 | Odświeżenie danych (force)             | 1. POST /api/plans/:id/weather/refresh z { force: true } | Status 200, nowe dane pobrane, last_refreshed_at zaktualizowane | P1        |
| WEATHER-004 | Błąd: plan bez lokalizacji             | 1. Utwórz plan bez latitude/longitude<br>2. GET /weather | Status 422, błąd "Plan location required"                       | P1        |
| WEATHER-005 | Timeout Open-Meteo (>5s)               | 1. Symuluj wolne API<br>2. GET /weather                  | Status 504, błąd "Weather service timeout"                      | P2        |

### 4.7 Geokodowanie (OpenStreetMap)

| ID      | Scenariusz                        | Kroki                             | Oczekiwany wynik                                      | Priorytet |
| ------- | --------------------------------- | --------------------------------- | ----------------------------------------------------- | --------- |
| GEO-001 | Geokodowanie poprawnego adresu    | 1. Wyszukaj "Warszawa, Polska"    | Zwrócone współrzędne (52.2297, 21.0122), display_name | P0        |
| GEO-002 | Geokodowanie niepoprawnego adresu | 1. Wyszukaj "asdfghjkl123"        | Pusta lista wyników, komunikat "Nie znaleziono"       | P1        |
| GEO-003 | Rate limit Nominatim (1 req/s)    | 1. Wyślij >1 zapytanie na sekundę | Throttling, niektóre żądania opóźnione                | P2        |

### 4.8 Analityka

| ID            | Scenariusz                              | Kroki                         | Oczekiwany wynik                             | Priorytet |
| ------------- | --------------------------------------- | ----------------------------- | -------------------------------------------- | --------- |
| ANALYTICS-001 | Rejestrowanie zdarzenia plan_created    | 1. Utwórz nowy plan           | Event zapisany w analytics_events            | P1        |
| ANALYTICS-002 | Rejestrowanie zdarzenia grid_saved      | 1. Edytuj siatką<br>2. Zapisz | Event zapisany                               | P1        |
| ANALYTICS-003 | Rejestrowanie zdarzenia area_typed      | 1. Zmień typ obszaru          | Event zapisany                               | P2        |
| ANALYTICS-004 | Rejestrowanie zdarzenia plant_confirmed | 1. Dodaj roślinę po ocenie AI | Event zapisany                               | P1        |
| ANALYTICS-005 | Listowanie zdarzeń użytkownika          | 1. GET /api/analytics/events  | Status 200, lista zdarzeń użytkownika        | P2        |
| ANALYTICS-006 | Filtrowanie zdarzeń po plan_id          | 1. GET /events?plan_id=uuid   | Status 200, tylko zdarzenia dla danego planu | P2        |

---

## 5. Środowisko testowe

### 5.1 Środowiska

| Środowisko                 | Cel                                  | URL                              | Baza danych                    | AI Mode                          |
| -------------------------- | ------------------------------------ | -------------------------------- | ------------------------------ | -------------------------------- |
| **Local Development**      | Rozwój i testy jednostkowe           | http://localhost:4321            | Local Supabase (Docker)        | Mock (PUBLIC_USE_MOCK_AI=true)   |
| **CI/CD (GitHub Actions)** | Testy automatyczne przy każdym PR    | -                                | Ephemeral Supabase (in-memory) | Mock                             |
| **Staging**                | Testy manualne i E2E przed produkcją | https://staging.plantsplaner.app | Staging Supabase               | Real AI (test key, lower limits) |
| **Production**             | Środowisko produkcyjne               | https://plantsplaner.app         | Production Supabase            | Real AI (prod key)               |

### 5.2 Konfiguracja Local Development

**Wymagania:**

- Node.js 22.14.0 (nvm)
- npm 10+
- Docker Desktop (dla Supabase)
- Git

**Setup:**

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/org/plantsplaner.git
cd plantsplaner

# 2. Instalacja zależności
npm install

# 3. Uruchomienie Supabase lokalnie
npx supabase start

# 4. Konfiguracja zmiennych środowiskowych
cp .env.example .env
# Edytuj .env: ustaw SUPABASE_URL, SUPABASE_ANON_KEY z outputu `supabase start`
# Ustaw PUBLIC_USE_MOCK_AI=true dla testów bez prawdziwego AI

# 5. Uruchomienie dev server
npm run dev
# Aplikacja: http://localhost:4321
# Supabase Studio: http://localhost:54323
# Inbucket (email): http://localhost:54324

# 6. Uruchomienie testów
npm run test          # Testy jednostkowe
npm run test:integration # Testy integracyjne
npm run test:e2e      # Testy E2E (wymaga uruchomionego dev server)
```

### 5.3 Dane testowe

**Fixture users:**

- `test@example.com` / `Test1234!` (użytkownik testowy 1)
- `test2@example.com` / `Test1234!` (użytkownik testowy 2, do testów RLS)

**Fixture plans:**

- "Testowy ogród" – plan 10m × 10m, siatka 20×20 (cell_size 50cm)
- "Duża działka" – plan 20m × 20m, siatka 200×200 (cell_size 10cm, max size)

**Fixture plants:**

- Pomidor Cherry (5, 5) – sunlight: 5, humidity: 3, precip: 4, temperature: 4, overall: 4
- Bazylia (5, 6) – brak scores (null)

**Reset danych:**

```bash
npx supabase db reset # Usuwa wszystkie dane i wykonuje migracje od nowa
```

---

## 6. Narzędzia do testowania

### 6.1 Narzędzia testowe

| Narzędzie                     | Przeznaczenie                                | Instalacja                                                                              |
| ----------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Vitest**                    | Runner testowy dla testów jednostkowych      | `npm i -D vitest @vitest/ui`                                                            |
| **React Testing Library**     | Testowanie komponentów React                 | `npm i -D @testing-library/react @testing-library/jest-dom @testing-library/user-event` |
| **Playwright**                | Testy E2E (Chrome, Firefox, WebKit)          | `npm i -D @playwright/test`                                                             |
| **MSW (Mock Service Worker)** | Mockowanie API w testach jednostkowych i E2E | `npm i -D msw`                                                                          |
| **@vitest/coverage-v8**       | Code coverage dla testów jednostkowych       | `npm i -D @vitest/coverage-v8`                                                          |

### 6.2 Konfiguracja narzędzi

**Vitest (`vitest.config.ts`):**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", ".astro/"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

**Playwright (`playwright.config.ts`):**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
```

### 6.3 Skrypty testowe

**package.json:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test && npm run test:e2e",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

---

## 7. Harmonogram testów

### 7.1 Cykl życia testów w sprincie (Agile)

| Faza                | Aktywność                                       | Czas                         | Odpowiedzialny |
| ------------------- | ----------------------------------------------- | ---------------------------- | -------------- |
| **Sprint Planning** | Review testów dla User Stories, definicja DoD   | 1h                           | QA + Dev       |
| **Development**     | Pisanie testów jednostkowych równolegle z kodem | Cały sprint                  | Dev            |
| **Code Review**     | Weryfikacja testów w PR (coverage, quality)     | Per PR                       | Dev + QA       |
| **Integration**     | Uruchomienie testów integracyjnych w CI         | Per commit                   | CI/CD          |
| **Manual Testing**  | Testy eksploracyjne, UX, edge cases             | 2 dni przed końcem sprintu   | QA             |
| **Regression**      | Pełny zestaw testów automatycznych + E2E        | 1 dzień przed końcem sprintu | CI/CD + QA     |
| **Sprint Review**   | Demo funkcjonalności, raport testów             | 1h                           | QA + Dev + PO  |

### 7.2 Harmonogram testów MVP

**Założenia:**

- Sprint 2-tygodniowy
- 3 sprinty na MVP (6 tygodni)
- Continuous testing (testy równolegle z rozwojem)
- TDD approach: testy jednostkowe przed/podczas implementacji
- E2E tests: po zakończeniu funkcjonalności w sprincie

**Sprint 1 (Tydzień 1-2): Foundation**

- **Moduły:** Auth, Profile, Plans (CRUD)
- **Testy jednostkowe:**
  - `auth.validation.ts` - walidacja email/hasło
  - `plans.service.ts` - CRUD, walidacja wymiarów
  - `profile.service.ts` - aktualizacja preferencji
  - Komponenty: LoginForm, RegisterForm, ProfileForm
- **Testy E2E:**
  - Przepływ rejestracji i logowania
  - Przepływ tworzenia planu (kreator)
  - Przepływ edycji profilu
- **Cel:** 80% coverage dla auth, profile, plans

**Sprint 2 (Tydzień 3-4): Grid & Plants**

- **Moduły:** Grid (cells, area), Plants (CRUD), Weather, Geokodowanie
- **Testy jednostkowe:**
  - `grid-cells.service.ts` - operacje na komórkach
  - `grid-area.service.ts` - operacje na obszarach
  - `plant-placements.service.ts` - CRUD nasadzeń
  - `weather.service.ts` - pobieranie i cache pogody
  - Komponenty: GridCanvas, SideDrawer, PlantCard
- **Testy E2E:**
  - Przepływ edycji siatki (zaznaczanie, zmiana typu)
  - Przepływ dodawania roślin (ręcznie + AI)
  - Przepływ pracy z pogodą
- **Cel:** 80% coverage dla grid, plants, weather

**Sprint 3 (Tydzień 5-6): AI & Analytics**

- **Moduły:** AI (search, fit), Analytics
- **Testy jednostkowe:**
  - `openrouter.service.ts` - komunikacja z AI
  - `analytics-events.service.ts` - rejestrowanie zdarzeń
  - Walidacja odpowiedzi AI (strict JSON schema)
  - Komponenty: AddPlantDialog, WeatherChart
- **Testy E2E:**
  - Przepływ wyszukiwania i oceny roślin (AI)
  - Pełne przepływy użytkownika (end-to-end scenarios)
  - Scenariusze błędów (timeouts, validation)
- **Cel:** 80% coverage dla AI, analytics; wszystkie kluczowe przepływy E2E zielone

**Tydzień 7: Stabilizacja i testy regresji**

- Bug fixing wykrytych defektów
- Uruchomienie pełnego zestawu testów jednostkowych (regression)
- Uruchomienie pełnego zestawu testów E2E (wszystkie przeglądarki)
- Weryfikacja coverage (≥80%)
- Code review i refactoring testów

**Tydzień 8: Pre-production**

- Deploy na środowisko staging
- Smoke tests na staging (kluczowe przepływy)
- Testy akceptacyjne z Product Ownerem
- Finalna weryfikacja przed produkcją
- Przygotowanie dokumentacji testowej

### 7.3 Regresja przed wdrożeniem produkcyjnym

**Checklist:**

- [ ] Wszystkie testy jednostkowe przechodzą (0 failures)
- [ ] Wszystkie testy E2E przechodzą (Chrome, Firefox)
- [ ] Coverage ≥80% (statements, branches, functions, lines) dla testów jednostkowych
- [ ] Brak błędów linter (ESLint, TypeScript)
- [ ] Wszystkie krytyczne scenariusze E2E (P0) przechodzą
- [ ] Smoke tests na staging OK (podstawowe przepływy)
- [ ] Brak otwartych defektów krytycznych (P0, P1)
- [ ] Weryfikacja wydajności UI (siatka 200×200 renderuje się bez problemów)
- [ ] Weryfikacja timeout AI (10s działa poprawnie)
- [ ] Akceptacja Product Ownera

---

## 8. Kryteria akceptacji testów

### 8.1 Kryteria wejścia (Entry Criteria)

Testy mogą zostać rozpoczęte, gdy:

1. **Środowisko testowe jest gotowe** (Local Supabase, dev server, Inbucket)
2. **Kod jest code-review'owany** i zmergowany do `develop`
3. **Dokumentacja API jest aktualna** (`.ai/endpoints/`)
4. **Dane testowe są dostępne** (fixture users, plans, plants)
5. **Zależności zewnętrzne działają** (Open-Meteo, OpenRouter mock, OSM)

### 8.2 Kryteria wyjścia (Exit Criteria)

Testy są zakończone, gdy:

1. **Wszystkie zaplanowane testy zostały wykonane** (100% planned test cases)
2. **Coverage ≥80%** dla testów jednostkowych (statements, branches, functions, lines)
3. **Wszystkie testy krytyczne (P0) przechodzą** (0 failures)
4. **Nie ma otwartych defektów krytycznych** (P0, P1 – must fix before production)
5. **Testy E2E przechodzą na ≥2 przeglądarkach** (Chrome, Firefox)
6. **Brak błędów linter** (ESLint, TypeScript, Prettier)
7. **Akceptacja stakeholdera** (Product Owner, Tech Lead)

### 8.3 Definicja "Done" (DoD) dla User Story

User Story jest uznana za ukończoną, gdy:

1. ✅ Kod jest napisany i przechodzi code review (min. 1 reviewer)
2. ✅ Testy jednostkowe napisane (coverage ≥80% dla nowego kodu)
3. ✅ Testy E2E napisane dla kluczowych przepływów (happy path + error scenarios)
4. ✅ Wszystkie testy przechodzą lokalnie i w CI/CD
5. ✅ Brak błędów linter (ESLint, Prettier, TypeScript)
6. ✅ Brak console errors/warnings w przeglądarce
7. ✅ Dokumentacja API zaktualizowana (jeśli dotyczy endpointów)
8. ✅ Manualne testy eksploracyjne wykonane przez QA (smoke testing, edge cases)
9. ✅ UI/UX zgodne z designem (jeśli dotyczy komponentów UI)
10. ✅ Akceptacja Product Ownera (demo podczas Sprint Review)

### 8.4 Priorytety defektów

| Priorytet          | Definicja                                            | Przykład                                            | SLA Fix                |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------- | ---------------------- |
| **P0 – Krytyczny** | Blokuje kluczową funkcjonalność, brak workaround     | Nie można zalogować się do aplikacji                | Natychmiast (same day) |
| **P1 – Wysoki**    | Poważny wpływ na funkcjonalność, istnieje workaround | Nie można usunąć planu (można ręcznie w DB)         | 1-2 dni                |
| **P2 – Średni**    | Umiarkowany wpływ, nie blokuje głównych przepływów   | Filtr po nazwie rośliny nie działa case-insensitive | 3-5 dni                |
| **P3 – Niski**     | Kosmetyczne, edge case, minimal impact               | Tooltip na przycisku nie wyświetla się              | Po MVP                 |

---

## 9. Role i odpowiedzialności w procesie testowania

| Rola                   | Odpowiedzialności                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QA Engineer**        | - Tworzenie i utrzymanie planu testów<br>- Pisanie i wykonywanie testów manualnych<br>- Pisanie testów E2E (Playwright)<br>- Review testów jednostkowych/integracyjnych<br>- Raportowanie defektów<br>- Audyty (accessibility, security, performance)<br>- Akceptacja funkcjonalności przed merge |
| **Developer**          | - Pisanie testów jednostkowych i integracyjnych<br>- Fixing defektów<br>- Code review testów<br>- Współpraca z QA przy reprodukcji błędów<br>- Utrzymanie coverage ≥80%                                                                                                                           |
| **Tech Lead**          | - Review planu testów<br>- Decyzje o strategii testowania<br>- Priorytetyzacja defektów<br>- Weryfikacja gotowości do wdrożenia (Exit Criteria)                                                                                                                                                   |
| **Product Owner**      | - Akceptacja funkcjonalności (demo)<br>- Priorytetyzacja defektów (business impact)<br>- Finalna akceptacja przed wdrożeniem produkcyjnym                                                                                                                                                         |
| **DevOps/CI Engineer** | - Konfiguracja CI/CD pipeline (GitHub Actions)<br>- Automatyzacja uruchamiania testów<br>- Monitorowanie wydajności testów<br>- Konfiguracja środowisk testowych (staging)                                                                                                                        |

---

## 10. Procedury raportowania błędów

### 10.1 Format raportu błędu (GitHub Issue)

**Szablon Issue:**

```markdown
## [BUG] Krótki opis problemu

**Priorytet:** P0 / P1 / P2 / P3  
**Środowisko:** Local / Staging / Production  
**Moduł:** Auth / Plans / Grid / Plants / Weather / AI / Profile / Analytics  
**Przeglądarki:** Chrome 131 / Firefox 120 / Safari 17

### Kroki reprodukcji

1. Przejdź do `/plans/new`
2. Wypełnij formularz: nazwa="Test", wymiary=1000×1000, cell_size=50
3. Kliknij "Utwórz plan"

### Aktualny wynik

- Status 500 Internal Server Error
- Komunikat w konsoli: "TypeError: Cannot read property 'grid_width' of undefined"

### Oczekiwany wynik

- Status 201 Created
- Plan utworzony, przekierowanie na `/plans/:id`

### Dodatkowe informacje

- **Logs:** (załącz logi z terminala/konsoli)
- **Screenshots:** (załącz screenshot błędu)
- **Network:** (załącz HAR file lub screenshot Network tab)
- **Supabase logs:** (jeśli dotyczy)

### Możliwa przyczyna (opcjonalnie)

Brak walidacji `grid_width` przed zwróceniem odpowiedzi.

### Workaround (opcjonalnie)

Brak.
```

**Labels:**

- `bug` – błąd funkcjonalny
- `regression` – regresja (wcześniej działało)
- `security` – luka bezpieczeństwa
- `performance` – problem wydajnościowy
- `a11y` – problem dostępności
- `P0`, `P1`, `P2`, `P3` – priorytet
- `module:auth`, `module:plans`, etc. – moduł

### 10.2 Workflow raportowania

1. **Wykrycie błędu** przez QA/Dev/Usera
2. **Weryfikacja reprodukcji** (czy błąd jest powtarzalny?)
3. **Utworzenie GitHub Issue** (według szablonu)
4. **Przypisanie priorytetu** (QA + PO)
5. **Przypisanie do developera** (Tech Lead)
6. **Fixing** (Developer tworzy PR z fix + testy regresji)
7. **Code Review** (QA + inny Developer)
8. **Weryfikacja fix** (QA testuje na branchu PR)
9. **Merge** (po akceptacji QA)
10. **Zamknięcie Issue** (automatyczne po merge)

### 10.3 Raportowanie wyników testów

**Weekly Test Report (wysyłany co piątek):**

- **Test Execution Summary:**
  - Total tests: 250
  - Passed: 245
  - Failed: 3
  - Skipped: 2
  - Pass rate: 98%

- **Coverage:**
  - Statements: 82%
  - Branches: 79%
  - Functions: 85%
  - Lines: 83%

- **Defects:**
  - New bugs found: 5 (P0: 0, P1: 2, P2: 3)
  - Bugs fixed: 7
  - Open bugs: 8 (P0: 0, P1: 1, P2: 5, P3: 2)

- **Blockers:**
  - None

- **Next Week Focus:**
  - AI integration tests (Sprint 3)
  - Performance testing (k6)
  - Accessibility audit (axe-core)

**Sprint Review Demo:**

- Live demo przepływów użytkownika
- Prezentacja metryk testów (dashboards)
- Omówienie znalezionych błędów i ich statusu

---

## 11. Podsumowanie i zalecenia

### 11.1 Kluczowe ryzyka i mitigacje

| Ryzyko                       | Prawdopodobieństwo | Wpływ     | Mitigacja                                                                                                                                                       |
| ---------------------------- | ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Timeout AI (>10s)**        | Średnie            | Wysoki    | - Testy jednostkowe timeout handling<br>- Testy E2E z symulacją wolnego AI<br>- Graceful degradation (tryb mock)<br>- Retry mechanism (max 1×)                  |
| **Wydajność siatki 200×200** | Średnie            | Wysoki    | - Testy E2E renderowania dużej siatki<br>- Virtualizacja renderowania (react-window)<br>- Lazy loading komórek<br>- Monitoring w przeglądarce (Chrome DevTools) |
| **RLS bypass**               | Niskie             | Krytyczny | - Testy jednostkowe walidacji user_id<br>- Testy E2E z wieloma użytkownikami<br>- Code review polityk RLS<br>- Manualne testy penetracyjne                      |
| **Flaky E2E tests**          | Średnie            | Średni    | - Stable selectors (data-testid, role, aria-label)<br>- Odpowiednie timeouts i waits<br>- Retry logic w CI (max 2×)<br>- Test isolation (cleanup)               |
| **Niskie pokrycie testów**   | Średnie            | Wysoki    | - Wymóg 80% coverage w CI<br>- Code review testów<br>- TDD approach dla funkcji krytycznych<br>- Coverage reports w PR                                          |

### 11.2 Zalecenia dla zespołu

1. **Test-Driven Development (TDD)** – pisanie testów jednostkowych przed kodem (dla funkcji krytycznych)
2. **Continuous Testing** – uruchamianie testów w CI/CD przy każdym commit/PR
3. **Shift-Left Testing** – wczesne wykrywanie błędów (testy już w fazie developmentu)
4. **Pair Testing** – współpraca QA + Developer przy testowaniu złożonych funkcjonalności
5. **Monitoring w produkcji** – Sentry/LogRocket dla błędów runtime, Plausible/Mixpanel dla analityki użytkowania
6. **Retrospekcje testowe** – co sprint: co poszło dobrze/źle w testach, jak możemy się poprawić?

### 11.3 Metryki sukcesu projektu (MVP)

**Kryteria sukcesu testowania:**

- ✅ **Coverage ≥80%** dla testów jednostkowych (statements, branches, functions, lines)
- ✅ **0 defektów P0/P1** otwartych przed wdrożeniem produkcyjnym
- ✅ **Wszystkie testy jednostkowe przechodzą** (0 failures)
- ✅ **Wszystkie kluczowe E2E testy przechodzą** (Chrome, Firefox) – min. 8 głównych przepływów
- ✅ **Czas wykonania testów jednostkowych < 2 min** (lokalne + CI)
- ✅ **Czas wykonania testów E2E < 10 min** (CI)
- ✅ **Flaky tests < 5%** (stabilność testów E2E)

**Metryki jakościowe:**

- ✅ **Test-to-code ratio:** min. 1:2 (1 linia testu na 2 linie kodu produkcyjnego)
- ✅ **Defect detection rate:** >80% błędów wykrytych przed produkcją
- ✅ **Code review coverage:** 100% kodu i testów przechodzi przez review

**Kryteria sukcesu biznesowego (z PRD):**

- 90% użytkowników posiada co najmniej jeden w pełni wypełniony plan działki z minimum 5 roślinami
- 75% użytkowników generuje plan, a następnie wprowadza w nim 5 lub więcej roślin na rok

---

## 12. Załączniki

### 12.1 Dokumenty referencyjne

- **PRD**: `.ai/docs/prd.md` – Dokument wymagań produktu
- **Tech Stack**: `.ai/docs/tech-stack.md` – Stos technologiczny
- **API Endpoints**: `.ai/endpoints/` – Specyfikacje endpointów API
- **Database Schema**: `supabase/migrations/` – Migracje bazy danych
- **Existing Manual Tests**: `.ai/testing/` – Istniejące testy manualne (plans, plants, grid, weather, profiles, analytics)

### 12.2 Narzędzia i linki

**Narzędzia testowe:**

- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/
- **React Testing Library**: https://testing-library.com/react
- **MSW (Mock Service Worker)**: https://mswjs.io/

**Technologie projektu:**

- **Supabase**: https://supabase.com/docs
- **Astro**: https://astro.build/
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/

**Integracje zewnętrzne:**

- **OpenRouter**: https://openrouter.ai/docs
- **Open-Meteo**: https://open-meteo.com/en/docs
- **Leaflet**: https://leafletjs.com/
- **OpenStreetMap Nominatim**: https://nominatim.org/release-docs/latest/api/Search/

### 12.3 Kontakty

- **QA Lead**: qa-lead@plantsplaner.app
- **Tech Lead**: tech-lead@plantsplaner.app
- **Product Owner**: po@plantsplaner.app
- **DevOps**: devops@plantsplaner.app

---

**Koniec dokumentu**  
**Data ostatniej aktualizacji:** 2025-11-26  
**Wersja:** 1.0  
**Status:** ✅ Zatwierdzony
