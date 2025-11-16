# Plan implementacji widoku Kreatora Nowego Planu

## 1. Przegląd

Widok kreatora nowego planu (`/plans/new`) to wieloetapowy proces tworzenia planu działki w aplikacji PlantsPlaner. Użytkownik jest prowadzony przez sekwencję kroków, w których definiuje nazwę planu, lokalizację geograficzną (za pomocą mapy i geokodowania), wymiary działki, jednostkę kratki, orientację i półkulę. Przed finalnym zapisem użytkownik otrzymuje podsumowanie i może zapisać szkic lokalnie (IndexedDB/localStorage). Celem widoku jest zgromadzenie wszystkich niezbędnych danych do utworzenia planu z poprawnie wygenerowaną siatką, która spełnia ograniczenia techniczne (maksymalnie 200 × 200 pól).

## 2. Routing widoku

**Ścieżka:** `/plans/new`

**Wymagania dostępu:**
- Widok wymaga aktywnej sesji użytkownika (middleware Astro/Supabase)
- Brak sesji → przekierowanie do `/login`

**Nawigacja:**
- Dostęp z listy planów (`/plans`) poprzez przycisk "Nowy plan"
- Po zapisie planu przekierowanie do `/plans/{plan_id}` (widok edytora siatki)

## 3. Struktura komponentów

```
PlanCreatePage (strona Astro: src/pages/plans/new.astro)
  └── PlanCreator (React: src/components/plans/PlanCreator.tsx)
      ├── PlanCreatorStepper (React: src/components/plans/PlanCreatorStepper.tsx)
      ├── PlanCreatorStepBasics (React: src/components/plans/steps/PlanCreatorStepBasics.tsx)
      │   ├── Input (shadcn/ui)
      │   └── ValidationMessage (helper component)
      ├── PlanCreatorStepLocation (React: src/components/plans/steps/PlanCreatorStepLocation.tsx)
      │   ├── LocationMap (React: src/components/location/LocationMap.tsx)
      │   │   └── Leaflet Map Instance
      │   ├── LocationSearch (React: src/components/location/LocationSearch.tsx)
      │   │   └── Input + Search Button (shadcn/ui)
      │   └── LocationResultsList (React: src/components/location/LocationResultsList.tsx)
      ├── PlanCreatorStepDimensions (React: src/components/plans/steps/PlanCreatorStepDimensions.tsx)
      │   ├── Input (width, height - shadcn/ui)
      │   ├── Select (cell size - shadcn/ui)
      │   ├── OrientationCompass (React: src/components/plans/OrientationCompass.tsx)
      │   ├── Select (hemisphere - shadcn/ui)
      │   └── GridPreview (React: src/components/plans/GridPreview.tsx)
      ├── PlanCreatorStepSummary (React: src/components/plans/steps/PlanCreatorStepSummary.tsx)
      │   └── SummaryCard (display all collected data)
      └── PlanCreatorActions (React: src/components/plans/PlanCreatorActions.tsx)
          ├── Button (Cofnij)
          ├── Button (Zapisz szkic)
          ├── Button (Kontynuuj / Utwórz plan)
          └── ConfirmDialog (shadcn/ui Dialog)
```

## 4. Szczegóły komponentów

### PlanCreator

**Opis:**
Główny kontener dla całego procesu tworzenia planu. Zarządza stanem formularza, krokami wizarda, walidacją oraz zapisem lokalnym i wysyłką do API.

**Główne elementy:**
- `PlanCreatorStepper` - wskaźnik postępu kroków
- Komponenty kroków (warunkowe renderowanie na podstawie `currentStep`)
- `PlanCreatorActions` - nawigacja między krokami i zapis

**Obsługiwane interakcje:**
- Przełączanie między krokami (poprzedni/następny)
- Zapisywanie danych kroku do stanu formularza
- Walidacja danych przed przejściem do następnego kroku
- Zapisywanie szkicu lokalnie (localStorage/IndexedDB)
- Wczytywanie szkicu przy montowaniu komponentu
- Finalne wysłanie żądania POST do API
- Obsługa sukcesu i błędów z API

**Obsługiwana walidacja:**
- Walidacja każdego kroku przed umożliwieniem przejścia dalej
- Walidacja globalna przed finałem (wszystkie wymagane pola)
- Walidacja limitu siatki (200 × 200) w kroku wymiarów
- Sprawdzenie podzielności wymiarów przez rozmiar kratki

**Typy:**
- `PlanCreateFormData` (ViewModel)
- `PlanCreateCommand` (DTO do API)
- `ApiItemResponse<PlanDto>` (odpowiedź API)
- `ApiErrorResponse` (błąd API)

**Propsy:**
Komponent główny nie przyjmuje propsów - jest to top-level komponent dla strony.

### PlanCreatorStepper

**Opis:**
Komponent wizualizujący postęp w kreatorze w formie poziomego/pionowego paska kroków. Wyświetla numery kroków, etykiety i status (aktywny, ukończony, nieaktywny).

**Główne elementy:**
- Lista kroków z numerami (1, 2, 3, 4)
- Etykiety kroków ("Podstawy", "Lokalizacja", "Wymiary", "Podsumowanie")
- Ikonki statusu (checkmark dla ukończonych, numer dla aktywnego/nieaktywnego)
- Linia łącząca kroki

**Obsługiwane interakcje:**
- Kliknięcie na ukończony krok pozwala wrócić do niego (jeśli wcześniej był wypełniony)
- Kliknięcie na nieukończony krok jest zablokowane

**Obsługiwana walidacja:**
- Brak - komponent tylko wyświetla

**Typy:**
- `PlanCreatorStep` (enum lub type union: 'basics' | 'location' | 'dimensions' | 'summary')
- `StepConfig` (interfejs: `{ key: PlanCreatorStep, label: string, order: number }`)

**Propsy:**
```typescript
interface PlanCreatorStepperProps {
  currentStep: PlanCreatorStep;
  completedSteps: Set<PlanCreatorStep>;
  onStepClick: (step: PlanCreatorStep) => void;
}
```

### PlanCreatorStepBasics

**Opis:**
Pierwszy krok kreatora - zbiera podstawowe dane: nazwę planu. Może zawierać również placeholder na opis (opcjonalny w przyszłości).

**Główne elementy:**
- `<Input>` dla nazwy planu (wymagane)
- `<Label>` z opisem pola
- `ValidationMessage` - komunikat o błędzie walidacji

**Obsługiwane interakcje:**
- Wpisywanie nazwy planu
- Walidacja w czasie rzeczywistym (onChange/onBlur)
- Automatyczne trimowanie białych znaków
- Focus na input przy montowaniu komponentu

**Obsługiwana walidacja:**
- Nazwa jest wymagana (min. 1 znak po trim)
- Maksymalna długość nazwy (np. 100 znaków)

**Typy:**
- `PlanBasicsFormData` (ViewModel: `{ name: string }`)

**Propsy:**
```typescript
interface PlanCreatorStepBasicsProps {
  data: PlanBasicsFormData;
  onChange: (data: PlanBasicsFormData) => void;
  errors: Partial<Record<keyof PlanBasicsFormData, string>>;
}
```

### PlanCreatorStepLocation

**Opis:**
Drugi krok kreatora - ustawienie lokalizacji działki za pomocą mapy i wyszukiwarki adresu (geokodowanie). Pozwala na ręczne przesunięcie pinezki lub wyszukanie adresu.

**Główne elementy:**
- `LocationSearch` - pole wyszukiwania adresu
- `LocationResultsList` - lista wyników geokodowania (jeśli wiele)
- `LocationMap` - mapa Leaflet z pinezką
- Komunikat informacyjny o możliwej niskiej dokładności danych mapowych
- Alert aria-live dla błędów geokodowania

**Obsługiwane interakcje:**
- Wpisywanie adresu w pole wyszukiwania
- Wysłanie zapytania geokodowania (Enter / klik przycisku)
- Wybór wyniku z listy kandydatów (jeśli wiele)
- Ręczne przesunięcie pinezki na mapie
- Centrowanie mapy na wybranej lokalizacji

**Obsługiwana walidacja:**
- Lokalizacja jest opcjonalna (ale zalecana - ostrzeżenie)
- Sprawdzenie czy współrzędne są w poprawnym zakresie (lat: -90..90, lon: -180..180)
- Wyświetlanie błędów geokodowania (brak wyników, błąd API)

**Typy:**
- `PlanLocationFormData` (ViewModel: `{ latitude?: number, longitude?: number, address?: string }`)
- `GeocodeResult` (ViewModel: `{ lat: number, lon: number, display_name: string }`)

**Propsy:**
```typescript
interface PlanCreatorStepLocationProps {
  data: PlanLocationFormData;
  onChange: (data: PlanLocationFormData) => void;
  errors: Partial<Record<keyof PlanLocationFormData, string>>;
}
```

### LocationMap

**Opis:**
Komponent renderujący mapę Leaflet z możliwością ustawienia pinezki. Używa `react-leaflet` do integracji.

**Główne elementy:**
- `<MapContainer>` (react-leaflet)
- `<TileLayer>` (OpenStreetMap)
- `<Marker>` - pinezka użytkownika (draggable)
- Kontrolki mapy (zoom, full screen)

**Obsługiwane interakcje:**
- Przeciąganie pinezki
- Kliknięcie na mapę (ustawia pinezką w tym miejscu)
- Zoom i przewijanie mapy

**Obsługiwana walidacja:**
- Brak - komponent przyjmuje współrzędne i emituje zmiany

**Typy:**
- `LatLng` (z leaflet: `{ lat: number, lng: number }`)

**Propsy:**
```typescript
interface LocationMapProps {
  center: { lat: number; lng: number };
  markerPosition?: { lat: number; lng: number };
  onMarkerMove: (position: { lat: number; lng: number }) => void;
  className?: string;
}
```

### LocationSearch

**Opis:**
Pole wyszukiwania adresu z przyciskiem. Wysyła zapytanie do API geokodowania (OpenStreetMap Nominatim).

**Główne elementy:**
- `<Input>` dla adresu
- `<Button>` do wysłania zapytania
- Ikona wyszukiwania (lucide-react)
- Spinner podczas ładowania

**Obsługiwane interakcje:**
- Wpisywanie adresu
- Wysłanie zapytania (Enter / klik)
- Wyświetlanie stanu ładowania

**Obsługiwana walidacja:**
- Minimalna długość zapytania (np. 3 znaki) przed wysłaniem

**Typy:**
- `GeocodeResult[]` (wynik z API)

**Propsy:**
```typescript
interface LocationSearchProps {
  onSearchResults: (results: GeocodeResult[]) => void;
  onSearchError: (error: string) => void;
  isLoading: boolean;
}
```

### LocationResultsList

**Opis:**
Lista wyników geokodowania (gdy jest więcej niż jeden wynik). Pozwala użytkownikowi wybrać właściwy adres.

**Główne elementy:**
- Lista `<ul>` z wynikami
- Każdy wynik: adres (display_name), koordynaty
- Przycisk "Wybierz" dla każdego wyniku

**Obsługiwane interakcje:**
- Kliknięcie na wynik wybiera ten adres
- Hover podświetla wynik

**Obsługiwana walidacja:**
- Brak - komponent tylko wyświetla

**Typy:**
- `GeocodeResult[]`

**Propsy:**
```typescript
interface LocationResultsListProps {
  results: GeocodeResult[];
  onSelect: (result: GeocodeResult) => void;
}
```

### PlanCreatorStepDimensions

**Opis:**
Trzeci krok kreatora - definicja wymiarów działki, jednostki kratki, orientacji i półkuli. Wyświetla podgląd siatki i waliduje limit 200 × 200.

**Główne elementy:**
- `<Input>` dla szerokości (width_cm)
- `<Input>` dla wysokości (height_cm)
- `<Select>` dla jednostki kratki (cell_size_cm: 10/25/50/100)
- `OrientationCompass` - mini-kompas do ustawienia orientacji (0-359°)
- `<Select>` dla półkuli (hemisphere: northern/southern)
- `GridPreview` - wizualizacja siatki
- Komunikat o limicie siatki (200 × 200)
- Alert dla błędów walidacji

**Obsługiwane interakcje:**
- Wpisywanie wymiarów (width_cm, height_cm)
- Wybór jednostki kratki z listy
- Ustawienie orientacji (input numeryczny lub przeciąganie wskaźnika kompasu)
- Wybór półkuli z listy
- Automatyczne przeliczanie wymiarów siatki (grid_width, grid_height) w czasie rzeczywistym
- Wyświetlanie ostrzeżenia gdy siatka przekracza 200 × 200

**Obsługiwana walidacja:**
- Wymiary muszą być liczbami całkowitymi > 0
- Wymiary muszą być podzielne przez cell_size_cm
- Obliczone grid_width i grid_height muszą być w zakresie 1..200
- Orientacja musi być w zakresie 0..359
- Komunikaty błędów z field_errors z API

**Typy:**
- `PlanDimensionsFormData` (ViewModel)
- `GridDimensions` (obliczone: `{ gridWidth: number, gridHeight: number }`)

**Propsy:**
```typescript
interface PlanCreatorStepDimensionsProps {
  data: PlanDimensionsFormData;
  onChange: (data: PlanDimensionsFormData) => void;
  errors: Partial<Record<keyof PlanDimensionsFormData, string>>;
  gridDimensions: GridDimensions;
}
```

### OrientationCompass

**Opis:**
Mini-kompas wizualizujący orientację działki. Pokazuje wskaźnik północy i aktualną orientację. Pozwala ustawić orientację poprzez input lub interakcję.

**Główne elementy:**
- SVG kompasu (okrąg, kierunki świata: N, S, E, W)
- Wskaźnik kierunku (linia/strzałka) rotowana według `orientation`
- Input numeryczny (0-359)
- Przyciski +/- do inkrementacji orientacji

**Obsługiwane interakcje:**
- Wpisywanie orientacji w input
- Kliknięcie +/- do zmiany orientacji o 15° (lub 1°)
- Opcjonalnie: przeciąganie wskaźnika na kompasie (drag)

**Obsługiwana walidacja:**
- Orientacja 0..359, zaokrąglenie do liczby całkowitej
- Automatyczne przejście z 359 → 0 i 0 → 359

**Typy:**
- Nie wymaga dodatkowych typów (operuje na `number`)

**Propsy:**
```typescript
interface OrientationCompassProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}
```

### GridPreview

**Opis:**
Miniaturowy podgląd siatki pokazujący proporcje działki i liczbę pól. Używany do wizualizacji wymiarów przed finalnym zapisem.

**Główne elementy:**
- Canvas lub SVG z siatką
- Etykiety wymiarów (szerokość × wysokość)
- Informacja o liczbie pól (grid_width × grid_height)

**Obsługiwane interakcje:**
- Brak - komponent tylko wyświetla

**Obsługiwana walidacja:**
- Brak - komponent przyjmuje dane i renderuje

**Typy:**
- `GridDimensions`

**Propsy:**
```typescript
interface GridPreviewProps {
  gridWidth: number;
  gridHeight: number;
  cellSizeCm: number;
  orientation: number;
  className?: string;
}
```

### PlanCreatorStepSummary

**Opis:**
Czwarty (ostatni) krok - podsumowanie wszystkich wprowadzonych danych przed finałem. Pozwala użytkownikowi przejrzeć wszystkie informacje i wrócić do edycji.

**Główne elementy:**
- Sekcje z danymi:
  - Podstawy (nazwa)
  - Lokalizacja (współrzędne, adres jeśli dostępny)
  - Wymiary (width_cm, height_cm, cell_size_cm, grid_width × grid_height)
  - Orientacja (stopnie + wizualizacja)
  - Półkula (northern/southern)
- Przyciski edycji dla każdej sekcji (powrót do kroku)
- Ostrzeżenie: "Operacja jest nieodwracalna po zapisie"

**Obsługiwane interakcje:**
- Kliknięcie "Edytuj" przy sekcji → powrót do odpowiedniego kroku
- Przejrzenie danych
- Przejście do finału (przycisk w PlanCreatorActions)

**Obsługiwana walidacja:**
- Brak - wszystkie dane są już zwalidowane w poprzednich krokach

**Typy:**
- `PlanCreateFormData` (kompletne dane)

**Propsy:**
```typescript
interface PlanCreatorStepSummaryProps {
  data: PlanCreateFormData;
  onEditStep: (step: PlanCreatorStep) => void;
}
```

### PlanCreatorActions

**Opis:**
Pasek akcji na dole kreatora. Zawiera przyciski nawigacji (cofnij, dalej), zapisywania szkicu i finału. Wyświetla confirm dialog przed wysłaniem.

**Główne elementy:**
- `<Button>` Cofnij (disabled na pierwszym kroku)
- `<Button>` Zapisz szkic (zapisuje do localStorage/IndexedDB)
- `<Button>` Kontynuuj / Utwórz plan (na ostatnim kroku: wysyłka)
- `<Dialog>` Confirm - potwierdzenie utworzenia planu

**Obsługiwane interakcje:**
- Cofnij → poprzedni krok
- Kontynuuj → następny krok (jeśli walidacja OK)
- Zapisz szkic → zapis do local storage, wyświetlenie toastu
- Utwórz plan → otwarcie dialogu potwierdzenia
- Potwierdzenie w dialogu → POST do API
- Anulowanie w dialogu → zamknięcie dialogu

**Obsługiwana walidacja:**
- Blokada "Kontynuuj" jeśli bieżący krok ma błędy walidacji
- Blokada "Utwórz plan" jeśli globalna walidacja się nie powiodła

**Typy:**
- Nie wymaga dodatkowych typów (operuje na propsach z rodzica)

**Propsy:**
```typescript
interface PlanCreatorActionsProps {
  currentStep: PlanCreatorStep;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}
```

## 5. Typy

### DTO (z API, zdefiniowane w `src/types.ts`)

```typescript
// Wejście do API (POST /api/plans)
interface PlanCreateCommand {
  name: string;
  latitude?: number;
  longitude?: number;
  width_cm: number;
  height_cm: number;
  cell_size_cm: 10 | 25 | 50 | 100;
  orientation: number; // 0..359
  hemisphere?: "northern" | "southern";
}

// Odpowiedź z API (201 Created)
interface ApiItemResponse<PlanDto> {
  data: PlanDto;
}

// PlanDto z bazy (po utworzeniu)
interface PlanDto {
  id: string;
  user_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  width_cm: number;
  height_cm: number;
  cell_size_cm: number;
  grid_width: number;
  grid_height: number;
  orientation: number;
  hemisphere: "northern" | "southern" | null;
  created_at: string;
  updated_at: string;
}

// Błąd z API
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      field_errors?: Record<string, string>;
    };
  };
}
```

### ViewModel (nowe typy specyficzne dla widoku)

```typescript
// Typ dla pojedynczego kroku kreatora
type PlanCreatorStep = "basics" | "location" | "dimensions" | "summary";

// Konfiguracja kroków
interface StepConfig {
  key: PlanCreatorStep;
  label: string;
  order: number;
  description?: string;
}

// Dane z kroku "Podstawy"
interface PlanBasicsFormData {
  name: string;
}

// Dane z kroku "Lokalizacja"
interface PlanLocationFormData {
  latitude?: number;
  longitude?: number;
  address?: string; // Opcjonalny, tylko dla wyświetlania
}

// Dane z kroku "Wymiary"
interface PlanDimensionsFormData {
  width_cm: number;
  height_cm: number;
  cell_size_cm: 10 | 25 | 50 | 100;
  orientation: number;
  hemisphere: "northern" | "southern";
}

// Pełne dane formularza (suma wszystkich kroków)
interface PlanCreateFormData
  extends PlanBasicsFormData,
    PlanLocationFormData,
    PlanDimensionsFormData {}

// Obliczone wymiary siatki (do walidacji i podglądu)
interface GridDimensions {
  gridWidth: number;
  gridHeight: number;
  isValid: boolean;
  errorMessage?: string;
}

// Wynik geokodowania (z OpenStreetMap Nominatim)
interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  type?: string;
  importance?: number;
}

// Stan kreatora (dla hooka)
interface PlanCreatorState {
  currentStep: PlanCreatorStep;
  completedSteps: Set<PlanCreatorStep>;
  formData: PlanCreateFormData;
  errors: Partial<Record<keyof PlanCreateFormData, string>>;
  isSubmitting: boolean;
  apiError: string | null;
}

// Draft zapisywany w localStorage
interface PlanDraft {
  formData: PlanCreateFormData;
  savedAt: string; // ISO timestamp
  version: number; // Wersja schematu (dla przyszłych migracji)
}
```

## 6. Zarządzanie stanem

Stan widoku kreatora jest zarządzany przez niestandardowy hook **`usePlanCreator`**, który enkapsuluje logikę kroków, walidacji, zapisu lokalnego i komunikacji z API.

### Hook: `usePlanCreator`

**Lokalizacja:** `src/hooks/usePlanCreator.ts`

**Opis:**
Hook zarządza całym stanem kreatora, walidacją między krokami, zapisem szkicu i wysyłką do API.

**Zwracane wartości:**

```typescript
interface UsePlanCreatorReturn {
  // Stan
  state: PlanCreatorState;
  gridDimensions: GridDimensions;

  // Akcje nawigacji
  goToStep: (step: PlanCreatorStep) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  // Akcje danych
  updateFormData: (data: Partial<PlanCreateFormData>) => void;
  validateCurrentStep: () => boolean;
  validateAllSteps: () => boolean;

  // Akcje zapisu
  saveDraft: () => void;
  loadDraft: () => PlanDraft | null;
  clearDraft: () => void;
  hasDraft: boolean;

  // Akcje API
  submitPlan: () => Promise<PlanDto | null>;
  clearApiError: () => void;
}
```

**Logika:**

1. **Inicjalizacja:**
   - Przy montowaniu sprawdza czy istnieje szkic w localStorage
   - Jeśli tak, wyświetla dialog z opcją wznowienia lub rozpoczęcia od nowa
   - Ładuje dane szkicu jeśli użytkownik wybierze wznowienie

2. **Nawigacja między krokami:**
   - `goForward`: waliduje bieżący krok, jeśli OK → przechodzi dalej i dodaje krok do `completedSteps`
   - `goBack`: przechodzi do poprzedniego kroku (bez walidacji)
   - `goToStep`: pozwala wrócić do ukończonego kroku

3. **Walidacja:**
   - `validateCurrentStep`: uruchamia walidację dla pól aktywnego kroku
   - `validateAllSteps`: waliduje wszystkie pola przed finałem (używane przed submitPlan)
   - Walidacja używa Zod schema (z `src/lib/validation/plans.ts`)

4. **Zapis szkicu:**
   - `saveDraft`: zapisuje `formData` do localStorage pod kluczem `plan_draft_{userId}`
   - `loadDraft`: wczytuje szkic z localStorage
   - `clearDraft`: usuwa szkic z localStorage
   - Format: `{ formData, savedAt, version }`

5. **Wysyłka do API:**
   - `submitPlan`: 
     - Waliduje wszystkie pola
     - Mapuje `PlanCreateFormData` → `PlanCreateCommand`
     - Wysyła POST do `/api/plans`
     - W razie sukcesu: czyści szkic, zapisuje event `plan_created` (telemetria), przekierowuje do edytora
     - W razie błędu: parsuje `field_errors` i ustawia `errors` w stanie

### Dodatkowy hook: `useGeocoding`

**Lokalizacja:** `src/hooks/useGeocoding.ts`

**Opis:**
Hook do komunikacji z OpenStreetMap Nominatim API dla geokodowania adresów.

**Zwracane wartości:**

```typescript
interface UseGeocodingReturn {
  results: GeocodeResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}
```

**Logika:**
- `search`: wysyła zapytanie do Nominatim API, obsługuje limity rate-limiting
- Timeout: 5s
- W razie wielu wyników zwraca listę (sortowaną po `importance`)
- W razie braku wyników ustawia komunikat "Nie znaleziono wyników"
- W razie błędu API ustawia komunikat błędu

## 7. Integracja API

### Endpoint: `POST /api/plans`

**Lokalizacja:** `src/pages/api/plans/index.ts`

**Żądanie:**

```typescript
// Request body
const requestBody: PlanCreateCommand = {
  name: "Mój ogród",
  latitude: 52.1,
  longitude: 21.0,
  width_cm: 1000,
  height_cm: 1000,
  cell_size_cm: 25,
  orientation: 90,
  hemisphere: "northern"
};

// Headers
{
  "Content-Type": "application/json"
}
```

**Odpowiedź sukcesu (201 Created):**

```typescript
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user-uuid",
    "name": "Mój ogród",
    "latitude": 52.1,
    "longitude": 21.0,
    "width_cm": 1000,
    "height_cm": 1000,
    "cell_size_cm": 25,
    "grid_width": 40,
    "grid_height": 40,
    "orientation": 90,
    "hemisphere": "northern",
    "created_at": "2025-11-16T10:00:00Z",
    "updated_at": "2025-11-16T10:00:00Z"
  }
}
```

**Odpowiedź błędu (400 ValidationError):**

```typescript
{
  "error": {
    "code": "ValidationError",
    "message": "Width must be divisible by cell size",
    "details": {
      "field_errors": {
        "width_cm": "Width must be divisible by cell size",
        "cell_size_cm": "Cell size must be 10, 25, 50, or 100 cm"
      }
    }
  }
}
```

**Odpowiedź błędu (409 Conflict - duplikat nazwy):**

```typescript
{
  "error": {
    "code": "Conflict",
    "message": "Plan with this name already exists.",
    "details": {}
  }
}
```

**Mapowanie:**

```typescript
// Funkcja mapująca ViewModel → DTO
function mapFormDataToCommand(formData: PlanCreateFormData): PlanCreateCommand {
  return {
    name: formData.name.trim(),
    latitude: formData.latitude ?? undefined,
    longitude: formData.longitude ?? undefined,
    width_cm: formData.width_cm,
    height_cm: formData.height_cm,
    cell_size_cm: formData.cell_size_cm,
    orientation: formData.orientation,
    hemisphere: formData.hemisphere ?? undefined,
  };
}
```

**Obsługa błędów w komponencie:**

```typescript
try {
  const response = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json();
    
    // Jeśli są field_errors, mapuj je na state.errors
    if (errorData.error.details?.field_errors) {
      setErrors(errorData.error.details.field_errors);
    } else {
      setApiError(errorData.error.message);
    }
    return null;
  }

  const data: ApiItemResponse<PlanDto> = await response.json();
  return data.data;
} catch (e) {
  setApiError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
  return null;
}
```

## 8. Interakcje użytkownika

### Krok 1: Podstawy

1. Użytkownik wpisuje nazwę planu
2. Walidacja w czasie rzeczywistym (onChange) - wyświetla błąd jeśli puste
3. Kliknięcie "Kontynuuj" → walidacja → przejście do kroku 2

### Krok 2: Lokalizacja

1. **Scenariusz A: Wyszukiwanie adresu**
   - Użytkownik wpisuje adres w pole wyszukiwania
   - Kliknięcie przycisku "Szukaj" lub Enter
   - Wysłanie zapytania do Nominatim (loading state)
   - **A1: Wiele wyników** → wyświetlenie listy, użytkownik wybiera jeden → pinezka ustawiana na mapie
   - **A2: Jeden wynik** → automatyczne ustawienie pinezki
   - **A3: Brak wyników** → komunikat "Nie znaleziono wyników" + opcja ponowienia
   - **A4: Błąd API** → komunikat błędu + opcja ponowienia

2. **Scenariusz B: Ręczne ustawienie na mapie**
   - Użytkownik przesuwa pinezkę lub klika w miejsce na mapie
   - Współrzędne aktualizowane w state

3. **Scenariusz C: Pominięcie lokalizacji**
   - Użytkownik klika "Kontynuuj" bez ustawienia lokalizacji
   - Wyświetlenie ostrzeżenia: "Bez lokalizacji nie będzie możliwe pobranie danych pogodowych"
   - Opcja kontynuowania lub powrotu

4. Kliknięcie "Kontynuuj" → przejście do kroku 3

### Krok 3: Wymiary

1. Użytkownik wpisuje szerokość działki (width_cm)
2. Użytkownik wpisuje wysokość działki (height_cm)
3. Użytkownik wybiera jednostkę kratki z listy (cell_size_cm: 10/25/50/100)
4. **W czasie rzeczywistym:**
   - Obliczanie grid_width = width_cm / cell_size_cm
   - Obliczanie grid_height = height_cm / cell_size_cm
   - Walidacja: czy w zakresie 1..200 i czy liczby całkowite
   - Wyświetlanie podglądu siatki (GridPreview)
   - **Jeśli przekroczony limit:** wyświetlenie komunikatu błędu "Siatka nie może przekroczyć 200 × 200 pól"

5. Użytkownik ustawia orientację:
   - **Opcja A:** Wpisuje wartość w input (0-359)
   - **Opcja B:** Klika +/- do zmiany o 15°
   - **Opcja C:** (opcjonalnie) Przeciąga wskaźnik na kompasie

6. Użytkownik wybiera półkulę z listy (northern/southern)

7. Kliknięcie "Kontynuuj" → walidacja → jeśli OK przejście do kroku 4, jeśli błąd → komunikat + blokada

### Krok 4: Podsumowanie

1. Użytkownik przegląda wszystkie wprowadzone dane
2. **Opcja A:** Kliknięcie "Edytuj" przy sekcji → powrót do odpowiedniego kroku
3. **Opcja B:** Kliknięcie "Utwórz plan"
   - Wyświetlenie dialogu potwierdzenia: "Czy na pewno chcesz utworzyć plan? Operacja jest nieodwracalna."
   - **B1: Potwierdzenie** → wysłanie POST do API
     - Loading state (spinner, disabled buttons)
     - **Sukces:** zapis telemetrii (`plan_created`), czyszczenie szkicu, przekierowanie do `/plans/{plan_id}`
     - **Błąd 400 ValidationError:** wyświetlenie field_errors przy odpowiednich polach, automatyczny powrót do kroku z błędem
     - **Błąd 409 Conflict:** komunikat "Plan o tej nazwie już istnieje", powrót do kroku 1
     - **Błąd 500:** komunikat "Wystąpił błąd serwera. Spróbuj ponownie."
   - **B2: Anulowanie** → zamknięcie dialogu

### Zapis szkicu (dostępny na każdym kroku)

1. Użytkownik klika "Zapisz szkic"
2. Dane zapisywane w localStorage
3. Wyświetlenie toastu: "Szkic zapisany"
4. Użytkownik może opuścić widok i wrócić później

### Wznowienie szkicu (przy montowaniu komponentu)

1. Jeśli wykryty szkic w localStorage:
   - Wyświetlenie dialogu: "Znaleziono zapisany szkic z [data]. Czy chcesz kontynuować?"
   - **Opcja A:** "Kontynuuj" → załadowanie danych szkicu, przejście do ostatniego ukończonego kroku
   - **Opcja B:** "Rozpocznij od nowa" → czyszczenie szkicu, rozpoczęcie od kroku 1

## 9. Warunki i walidacja

### Warunki walidacji API (z `PlanCreateSchema`, `src/lib/validation/plans.ts`)

| Pole | Warunki | Komponent | Wpływ na UI |
|------|---------|-----------|-------------|
| `name` | - Wymagane (non-empty po trim)<br>- Min. 1 znak | PlanCreatorStepBasics | - Blokada "Kontynuuj" jeśli puste<br>- Czerwona ramka + komunikat pod inputem |
| `width_cm` | - Liczba całkowita > 0<br>- Podzielna przez `cell_size_cm`<br>- `width_cm / cell_size_cm` w zakresie 1..200 | PlanCreatorStepDimensions | - Walidacja w czasie rzeczywistym<br>- Komunikat błędu pod inputem<br>- Blokada "Kontynuuj" jeśli niepoprawne |
| `height_cm` | - Liczba całkowita > 0<br>- Podzielna przez `cell_size_cm`<br>- `height_cm / cell_size_cm` w zakresie 1..200 | PlanCreatorStepDimensions | - Walidacja w czasie rzeczywistym<br>- Komunikat błędu pod inputem<br>- Blokada "Kontynuuj" jeśli niepoprawne |
| `cell_size_cm` | - Wartość: 10, 25, 50 lub 100 | PlanCreatorStepDimensions | - Select z predefiniowanymi opcjami<br>- Zmiana przelicza siatko |
| `orientation` | - Liczba całkowita 0..359 | PlanCreatorStepDimensions | - Input numeryczny + OrientationCompass<br>- Automatyczne zaokrąglanie<br>- Automatyczne przejście 359↔0 |
| `latitude` | - Opcjonalne<br>- Jeśli podane: -90..90 | PlanCreatorStepLocation | - Ostrzeżenie jeśli nie podane<br>- Walidacja zakresu przy ustawianiu |
| `longitude` | - Opcjonalne<br>- Jeśli podane: -180..180 | PlanCreatorStepLocation | - Ostrzeżenie jeśli nie podane<br>- Walidacja zakresu przy ustawianiu |
| `hemisphere` | - Opcjonalne<br>- Wartość: "northern" lub "southern" | PlanCreatorStepDimensions | - Select z dwiema opcjami<br>- Domyślna wartość: "northern" |

### Warunki blokujące przejście między krokami

| Krok | Warunki przejścia | Komunikat błędu |
|------|-------------------|-----------------|
| Podstawy → Lokalizacja | `name` nie może być puste | "Nazwa planu jest wymagana" |
| Lokalizacja → Wymiary | Brak warunków (lokalizacja opcjonalna) | - |
| Wymiary → Podsumowanie | - `width_cm`, `height_cm`, `cell_size_cm` poprawne<br>- Siatka w zakresie 1..200<br>- `orientation` 0..359 | - "Wymiary muszą być podzielne przez rozmiar kratki"<br>- "Siatka nie może przekroczyć 200 × 200 pól"<br>- "Orientacja musi być w zakresie 0-359" |
| Podsumowanie → Finał | Wszystkie powyższe warunki + confirm dialog | - |

### Warunki globalnej walidacji (przed POST)

1. Wszystkie warunki z tabeli powyżej muszą być spełnione
2. Schema Zod (`PlanCreateSchema`) musi przejść bez błędów
3. Jeśli walidacja nie przechodzi:
   - Wyświetlenie komunikatu: "Popraw błędy przed utworzeniem planu"
   - Automatyczne przejście do pierwszego kroku z błędem
   - Podświetlenie pól z błędami

## 10. Obsługa błędów

### Błędy walidacji (frontend)

**Scenariusz:** Użytkownik wprowadza niepoprawne dane w formularzu.

**Obsługa:**
- Walidacja w czasie rzeczywistym (onChange/onBlur) z Zod
- Wyświetlenie komunikatu błędu pod polem (czerwony tekst, ikona)
- Czerwona ramka wokół inputu
- Blokada przycisku "Kontynuuj" dopóki błąd nie zostanie naprawiony
- Focus automatyczny na pierwsze pole z błędem przy próbie przejścia dalej

### Błędy API (backend)

#### 400 ValidationError

**Przykład:** Siatka przekracza 200 × 200 (wykryte przez DB CHECK constraint).

**Obsługa:**
- Parsowanie `field_errors` z odpowiedzi
- Mapowanie błędów na odpowiednie pola w state
- Automatyczny powrót do kroku z błędnymi polami
- Wyświetlenie komunikatów przy polach
- Wyświetlenie głównego komunikatu błędu w alert banner

#### 409 Conflict

**Przykład:** Plan o tej nazwie już istnieje (unikatowość `user_id + name`).

**Obsługa:**
- Wyświetlenie komunikatu: "Plan o tej nazwie już istnieje. Wybierz inną nazwę."
- Automatyczny powrót do kroku "Podstawy"
- Focus na polu nazwy
- Sugestia: dodanie sufiksu z datą (np. "Mój ogród 2025-11-16")

#### 401 Unauthorized

**Przykład:** Sesja wygasła podczas wypełniania formularza.

**Obsługa:**
- Automatyczny zapis szkicu przed przekierowaniem
- Wyświetlenie komunikatu: "Sesja wygasła. Zaloguj się ponownie."
- Przekierowanie do `/login` z parametrem `?redirectTo=/plans/new`
- Po zalogowaniu: automatyczne wznowienie szkicu

#### 500 Internal Server Error

**Przykład:** Nieoczekiwany błąd bazy danych.

**Obsługa:**
- Wyświetlenie komunikatu: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."
- Opcja "Spróbuj ponownie" (retry submit)
- Automatyczny zapis szkicu (dane nie są tracone)
- Logowanie błędu do konsoli (dla deweloperów)

### Błędy geokodowania (OpenStreetMap Nominatim)

#### Brak wyników

**Obsługa:**
- Komunikat: "Nie znaleziono lokalizacji dla podanego adresu. Spróbuj innego zapytania lub ustaw lokalizację ręcznie na mapie."
- Aria-live announcement dla screen readers
- Pozostawienie pola wyszukiwania aktywnego (możliwość ponowienia)
- Opcja ustawienia lokalizacji ręcznie

#### Wiele wyników

**Obsługa:**
- Wyświetlenie listy wyników (sortowana po `importance`)
- Każdy wynik: adres + typ (miasto, ulica, etc.)
- Użytkownik wybiera klikając na wynik
- Wybrany wynik ustawia pinezką na mapie i wypełnia współrzędne

#### Timeout / błąd API

**Obsługa:**
- Komunikat: "Nie udało się połączyć z usługą geokodowania. Spróbuj ponownie."
- Przycisk "Spróbuj ponownie"
- Opcja pominięcia lokalizacji (z ostrzeżeniem)

### Błędy ładowania mapy (Leaflet)

**Obsługa:**
- Fallback na tekstowy input dla współrzędnych (lat, lon)
- Komunikat: "Nie udało się załadować mapy. Możesz wprowadzić współrzędne ręcznie."
- Link do pomocy (jak znaleźć współrzędne)

### Błędy zapisu szkicu (localStorage)

**Scenariusz:** Pełne localStorage lub zablokowane przez przeglądarkę.

**Obsługa:**
- Wyświetlenie komunikatu: "Nie udało się zapisać szkicu lokalnie. Uzupełnij formularz i utwórz plan."
- Ukrycie przycisku "Zapisz szkic"
- Dane pozostają w stanie React (nie są tracone podczas sesji)

## 11. Kroki implementacji

### Faza 1: Struktura i typy

1. **Utworzenie typów ViewModel**
   - Utworzyć plik `src/types/plan-creator.types.ts`
   - Zdefiniować wszystkie typy z sekcji 5 (PlanCreatorStep, FormData, GridDimensions, etc.)
   - Wyeksportować typy do użycia w komponentach

2. **Utworzenie katalogu komponentów**
   - Utworzyć `src/components/plans/` dla komponentów planu
   - Utworzyć `src/components/plans/steps/` dla kroków kreatora
   - Utworzyć `src/components/location/` dla komponentów mapy

### Faza 2: Hook zarządzania stanem

3. **Implementacja hooka `usePlanCreator`**
   - Utworzyć `src/hooks/usePlanCreator.ts`
   - Implementować logikę nawigacji między krokami
   - Implementować walidację (integracja z Zod schema)
   - Implementować zapis/wczytywanie szkicu z localStorage
   - Implementować komunikację z API (POST /api/plans)
   - Implementować obsługę błędów API

4. **Implementacja hooka `useGeocoding`**
   - Utworzyć `src/hooks/useGeocoding.ts`
   - Implementować komunikację z Nominatim API
   - Implementować obsługę timeoutu i błędów
   - Implementować rate limiting (1 zapytanie / sekunda)

### Faza 3: Komponenty pomocnicze

5. **Implementacja `OrientationCompass`**
   - Utworzyć `src/components/plans/OrientationCompass.tsx`
   - Narysować SVG kompasu (okrąg, kierunki, wskaźnik)
   - Implementować input numeryczny
   - Implementować przyciski +/-
   - Dodać animacje rotacji wskaźnika

6. **Implementacja `GridPreview`**
   - Utworzyć `src/components/plans/GridPreview.tsx`
   - Renderować siatko w Canvas
   - Pokazać proporcje i wymiary
   - Dodać etykiety

### Faza 4: Komponenty mapy i lokalizacji

7. **Instalacja i konfiguracja Leaflet**
   - Zainstalować: `npm install leaflet react-leaflet`
   - Zainstalować typy: `npm install -D @types/leaflet`
   - Dodać CSS Leaflet do layoutu

8. **Implementacja `LocationMap`**
   - Utworzyć `src/components/location/LocationMap.tsx`
   - Zintegrować react-leaflet (MapContainer, TileLayer, Marker)
   - Implementować draggable marker
   - Implementować onClick na mapie
   - Obsłużyć błędy ładowania mapy

9. **Implementacja `LocationSearch`**
   - Utworzyć `src/components/location/LocationSearch.tsx`
   - Input + przycisk szukaj
   - Integracja z hookiem `useGeocoding`
   - Wyświetlanie stanu loading

10. **Implementacja `LocationResultsList`**
    - Utworzyć `src/components/location/LocationResultsList.tsx`
    - Lista wyników z adresami
    - Obsługa kliknięcia na wynik

### Faza 5: Komponenty kroków

11. **Implementacja `PlanCreatorStepBasics`**
    - Utworzyć `src/components/plans/steps/PlanCreatorStepBasics.tsx`
    - Input dla nazwy planu
    - Walidacja w czasie rzeczywistym
    - Integracja z hookiem `usePlanCreator`

12. **Implementacja `PlanCreatorStepLocation`**
    - Utworzyć `src/components/plans/steps/PlanCreatorStepLocation.tsx`
    - Kompozycja: LocationSearch + LocationResultsList + LocationMap
    - Obsługa wyboru lokalizacji (z wyszukiwania lub mapy)
    - Wyświetlanie ostrzeżeń (brak lokalizacji, błędy geokodowania)

13. **Implementacja `PlanCreatorStepDimensions`**
    - Utworzyć `src/components/plans/steps/PlanCreatorStepDimensions.tsx`
    - Inputy dla wymiarów (width_cm, height_cm)
    - Select dla cell_size_cm
    - OrientationCompass
    - Select dla hemisphere
    - GridPreview
    - Walidacja w czasie rzeczywistym (obliczanie siatki)
    - Wyświetlanie komunikatu o limicie 200 × 200

14. **Implementacja `PlanCreatorStepSummary`**
    - Utworzyć `src/components/plans/steps/PlanCreatorStepSummary.tsx`
    - Wyświetlenie wszystkich danych w sekcjach
    - Przyciski "Edytuj" przy każdej sekcji
    - Ostrzeżenie o nieodwracalności operacji

### Faza 6: Komponenty nawigacji i główny kreator

15. **Implementacja `PlanCreatorStepper`**
    - Utworzyć `src/components/plans/PlanCreatorStepper.tsx`
    - Wizualizacja kroków (1, 2, 3, 4)
    - Wyświetlanie statusu (aktywny, ukończony, nieaktywny)
    - Obsługa kliknięcia na ukończony krok

16. **Implementacja `PlanCreatorActions`**
    - Utworzyć `src/components/plans/PlanCreatorActions.tsx`
    - Przyciski: Cofnij, Zapisz szkic, Kontynuuj/Utwórz plan
    - Confirm dialog (shadcn/ui Dialog)
    - Obsługa stanów: disabled, loading

17. **Implementacja `PlanCreator`**
    - Utworzyć `src/components/plans/PlanCreator.tsx`
    - Integracja hooka `usePlanCreator`
    - Warunkowe renderowanie kroków na podstawie `currentStep`
    - Kompozycja wszystkich komponentów (Stepper, Steps, Actions)
    - Obsługa szkicu przy montowaniu (dialog wznowienia)

### Faza 7: Strona Astro

18. **Utworzenie strony `/plans/new`**
    - Utworzyć `src/pages/plans/new.astro`
    - Dodać middleware sprawdzający sesję (redirect do /login jeśli brak)
    - Zintegrować komponent PlanCreator z dyrektywą `client:only="react"`
    - Dodać layout (nagłówek, nawigacja)

### Faza 8: Telemetria

19. **Integracja z analityką**
    - Dodać funkcję `trackEvent` w `src/lib/analytics.ts`
    - W `usePlanCreator.submitPlan`: po sukcesie zapisać event `plan_created`
    - Wysłać POST do `/api/analytics` z danymi: `{ event_type: "plan_created", plan_id, attributes: {} }`

### Faza 9: Stylowanie i UX

20. **Stylowanie komponentów**
    - Użyć Tailwind CSS do wszystkich komponentów
    - Użyć shadcn/ui dla prymitywów (Button, Input, Select, Dialog, Alert)
    - Dodać responsywność (mobile: vertical stepper, desktop: horizontal)
    - Dodać animacje przejść między krokami (fade in/out)
    - Zrobić kolorystykę aplikacji pasującą do pozostałych komponentów

21. **Dostępność (a11y)**
    - Dodać aria-live dla komunikatów błędów
    - Dodać aria-labels do przycisków i inputów
    - Zapewnić focus management (auto-focus na błędy, przechodzenie między krokami)
    - Dodać skip links

### Faza 10: Testowanie i finalizacja

23. **Optymalizacja**
    - Lazy loading mapy (tylko gdy użytkownik przechodzi do kroku 2)
    - Memoizacja komponentów (React.memo dla kroków)
    - Debounce dla walidacji w czasie rzeczywistym

24. **Dokumentacja**
    - Dodać plik raportu .ai/implementations/views/new-implementation-report.md

---

**Koniec planu implementacji**

