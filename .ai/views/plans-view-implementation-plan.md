# Plan implementacji widoku Lista planów

## 1. Przegląd

Widok **Lista planów** (`/plans`) jest głównym hubem aplikacji PlantsPlaner, gdzie użytkownik ma dostęp do wszystkich swoich utworzonych planów działki. Widok ten umożliwia przeglądanie istniejących planów z kluczowymi informacjami (nazwa, lokalizacja, data modyfikacji), tworzenie nowych planów oraz zarządzanie istniejącymi (edycja, usuwanie). Widok wymaga autoryzacji – użytkownicy niezalogowani są przekierowywani do strony logowania.

## 2. Routing widoku

- **Ścieżka**: `/plans`
- **Typ**: Strona SSR (Server-Side Rendered) z dynamicznymi komponentami React
- **Middleware**: Weryfikacja sesji użytkownika (redirect do `/login` jeśli brak sesji)
- **Plik**: `src/pages/plans.astro`

## 3. Struktura komponentów

```
PlansListPage (Astro)
└── Layout
    └── main[role="main"]
        └── PlansList (React)
            ├── PlansListHeader
            │   ├── h1 "Moje plany"
            │   └── Button "Nowy plan"
            ├── (stan: loading) LoadingState
            ├── (stan: error) ErrorState
            │   ├── ErrorMessage
            │   └── Button "Spróbuj ponownie"
            ├── (stan: empty) EmptyState
            │   ├── EmptyMessage
            │   └── Button "Utwórz pierwszy plan"
            └── (stan: success) Fragment
                ├── PlansTable
                │   ├── Table (shadcn/ui)
                │   │   ├── TableHeader
                │   │   │   └── TableRow
                │   │   │       ├── TableHead "Nazwa"
                │   │   │       ├── TableHead "Lokalizacja"
                │   │   │       ├── TableHead "Rozmiar siatki"
                │   │   │       ├── TableHead "Ostatnia modyfikacja"
                │   │   │       └── TableHead "Akcje"
                │   │   └── TableBody
                │   │       └── PlanRow[] (dla każdego planu)
                │   │           ├── TableCell (nazwa)
                │   │           ├── TableCell (lokalizacja)
                │   │           ├── TableCell (grid_width × grid_height)
                │   │           ├── TableCell (formatowana data)
                │   │           └── TableCell (akcje)
                │   │               ├── Button "Edytuj" + Pencil icon
                │   │               └── Button "Usuń" + Trash2 icon
                │   └── (hasMore) LoadMoreButton
                └── DeletePlanDialog (conditional)
                    ├── DialogHeader
                    │   └── DialogTitle "Usuń plan"
                    ├── DialogContent
                    │   └── DialogDescription
                    └── DialogFooter
                        ├── Button "Anuluj"
                        └── Button "Usuń" (destructive, loading state)
```

## 4. Szczegóły komponentów

### PlansListPage (Astro)

- **Opis komponentu**: Główna strona Astro renderowana po stronie serwera. Odpowiada za weryfikację sesji użytkownika przed renderowaniem widoku oraz osadzenie głównego komponentu React z hydratacją.

- **Główne elementy**:
  - Sprawdzenie sesji przez `Astro.locals.supabase.auth.getUser()`
  - Przekierowanie do `/login` przy braku sesji
  - Layout aplikacji z nawigacją
  - Komponent `<PlansList client:load />` (React z hydratacją)

- **Obsługiwane interakcje**: Brak (tylko SSR logic)

- **Obsługiwana walidacja**:
  - Weryfikacja istnienia sesji użytkownika

- **Typy**: `User` (z Supabase Auth)

- **Propsy**: Brak (strona Astro)

---

### PlansList (React)

- **Opis komponentu**: Główny komponent React zarządzający stanem listy planów, wywołaniami API oraz orchestracją wszystkich podkomponentów widoku. Obsługuje pełny cykl życia danych: ładowanie, błędy, stan pusty i wyświetlanie listy.

- **Główne elementy**:
  - `PlansListHeader` – nagłówek z tytułem i przyciskiem CTA
  - Warunkowe renderowanie w zależności od stanu:
    - `LoadingState` – spinner podczas ładowania
    - `ErrorState` – komunikat błędu z przyciskiem retry
    - `EmptyState` – informacja o braku planów z CTA
    - `PlansTable` + `LoadMoreButton` – lista planów z paginacją
  - `DeletePlanDialog` – modal potwierdzenia usunięcia

- **Obsługiwane interakcje**:
  - Montowanie komponentu → fetch planów
  - Kliknięcie "Nowy plan" → nawigacja do `/plans/new`
  - Kliknięcie "Spróbuj ponownie" → refetch planów
  - Kliknięcie "Załaduj więcej" → fetch kolejnej strony
  - Kliknięcie "Usuń" → otwarcie dialogu
  - Potwierdzenie usunięcia → DELETE request + refetch

- **Obsługiwana walidacja**:
  - Weryfikacja odpowiedzi API (status 200, 401, 403, 500)
  - Walidacja struktury danych przez typy TypeScript

- **Typy**:
  - `PlanDto` (input z API)
  - `PlanViewModel` (przetworzone dane do wyświetlenia)
  - `ApiListResponse<PlanDto>`
  - `ApiErrorResponse`

- **Propsy**: Brak (top-level component)

---

### PlansListHeader (React)

- **Opis komponentu**: Nagłówek sekcji zawierający tytuł strony oraz główny przycisk CTA do tworzenia nowego planu.

- **Główne elementy**:
  - `<h1>` z tekstem "Moje plany"
  - `Button` (shadcn/ui) z ikoną `Plus` i tekstem "Nowy plan"

- **Obsługiwane interakcje**:
  - Kliknięcie przycisku "Nowy plan" → `onCreateNew()`

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak specyficznych typów

- **Propsy**:
  ```typescript
  interface PlansListHeaderProps {
    onCreateNew: () => void;
  }
  ```

---

### LoadingState (React)

- **Opis komponentu**: Komponent wyświetlający wskaźnik ładowania podczas pobierania danych z API. Używa komponentu Spinner z biblioteki lub prostego animowanego elementu.

- **Główne elementy**:
  - `<div>` kontener z centrowanym contentem
  - Spinner/Loader (np. z `lucide-react` ikona `Loader2` z animacją spin)
  - Tekst "Ładowanie planów..."

- **Obsługiwane interakcje**: Brak

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak

- **Propsy**: Brak

---

### ErrorState (React)

- **Opis komponentu**: Komponent wyświetlający komunikat błędu oraz przycisk umożliwiający ponowienie operacji. Wyświetlany gdy zapytanie API zakończyło się niepowodzeniem.

- **Główne elementy**:
  - `<div>` kontener z ikoną błędu (`AlertCircle` z lucide-react)
  - `<p>` z komunikatem błędu
  - `Button` "Spróbuj ponownie"

- **Obsługiwane interakcje**:
  - Kliknięcie "Spróbuj ponownie" → `onRetry()`

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak specyficznych typów

- **Propsy**:
  ```typescript
  interface ErrorStateProps {
    message: string;
    onRetry: () => void;
  }
  ```

---

### EmptyState (React)

- **Opis komponentu**: Komponent wyświetlany gdy użytkownik nie posiada jeszcze żadnych planów. Zawiera zachętę do utworzenia pierwszego planu.

- **Główne elementy**:
  - `<div>` kontener z ilustracją/ikoną (`FileQuestion` z lucide-react)
  - `<h2>` "Brak planów"
  - `<p>` "Nie masz jeszcze żadnych planów działki. Utwórz pierwszy plan, aby rozpocząć."
  - `Button` "Utwórz pierwszy plan"

- **Obsługiwane interakcje**:
  - Kliknięcie "Utwórz pierwszy plan" → `onCreateNew()`

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak specyficznych typów

- **Propsy**:
  ```typescript
  interface EmptyStateProps {
    onCreateNew: () => void;
  }
  ```

---

### PlansTable (React)

- **Opis komponentu**: Tabela wyświetlająca listę planów użytkownika z kluczowymi informacjami i akcjami. Używa komponentów Table z shadcn/ui dla spójnego stylowania.

- **Główne elementy**:
  - `<Table>` (shadcn/ui)
  - `<TableHeader>` z kolumnami: Nazwa, Lokalizacja, Rozmiar siatki, Ostatnia modyfikacja, Akcje
  - `<TableBody>` z komponentami `PlanRow` dla każdego planu

- **Obsługiwane interakcje**:
  - Delegowane do `PlanRow`

- **Obsługiwana walidacja**: Brak (wyświetlanie)

- **Typy**:
  - `PlanViewModel[]`

- **Propsy**:
  ```typescript
  interface PlansTableProps {
    plans: PlanViewModel[];
    onEdit: (planId: string) => void;
    onDelete: (planId: string) => void;
  }
  ```

---

### PlanRow (React)

- **Opis komponentu**: Pojedynczy wiersz tabeli reprezentujący jeden plan działki. Wyświetla wszystkie kluczowe informacje oraz przyciski akcji.

- **Główne elementy**:
  - `<TableRow>` (shadcn/ui)
  - 5× `<TableCell>`:
    1. Nazwa planu (tekst, pogrubiony)
    2. Lokalizacja (sformatowane koordynaty lub "Brak lokalizacji")
    3. Rozmiar siatki (format: "20 × 16")
    4. Data modyfikacji (relatywna, np. "2 dni temu")
    5. Akcje (przyciski Edytuj, Usuń)

- **Obsługiwane interakcje**:
  - Kliknięcie przycisku "Edytuj" → `onEdit(plan.id)`
  - Kliknięcie przycisku "Usuń" → `onDelete(plan.id)`

- **Obsługiwana walidacja**: Brak (wyświetlanie)

- **Typy**:
  - `PlanViewModel`

- **Propsy**:
  ```typescript
  interface PlanRowProps {
    plan: PlanViewModel;
    onEdit: (planId: string) => void;
    onDelete: (planId: string) => void;
  }
  ```

---

### LoadMoreButton (React)

- **Opis komponentu**: Przycisk umożliwiający załadowanie kolejnej strony planów (cursor-based pagination). Wyświetlany tylko gdy istnieje kolejna strona (`nextCursor !== null`).

- **Główne elementy**:
  - `Button` (shadcn/ui, variant="outline") z tekstem "Załaduj więcej"
  - Stan loading podczas ładowania kolejnej strony

- **Obsługiwane interakcje**:
  - Kliknięcie → `onLoadMore()`

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak specyficznych typów

- **Propsy**:
  ```typescript
  interface LoadMoreButtonProps {
    onLoadMore: () => void;
    isLoading: boolean;
  }
  ```

---

### DeletePlanDialog (React)

- **Opis komponentu**: Modal dialog potwierdzenia usunięcia planu. Informuje użytkownika o konsekwencjach (usunięcie wszystkich danych, roślin, grid cells) i wymaga potwierdzenia akcji.

- **Główne elementy**:
  - `Dialog` (shadcn/ui) kontrolowany przez `open` prop
  - `DialogHeader` z `DialogTitle` "Usuń plan"
  - `DialogContent` z `DialogDescription` wyjaśniającym konsekwencje
  - `DialogFooter` z dwoma przyciskami:
    - "Anuluj" (variant="outline")
    - "Usuń" (variant="destructive", stan loading podczas usuwania)

- **Obsługiwane interakcje**:
  - Kliknięcie "Anuluj" → `onCancel()`
  - Kliknięcie "Usuń" → `onConfirm()`
  - Kliknięcie poza dialogiem → `onCancel()`

- **Obsługiwana walidacja**: Brak (potwierdzenie)

- **Typy**:
  - `PlanViewModel` (opcjonalnie do wyświetlenia nazwy planu w komunikacie)

- **Propsy**:
  ```typescript
  interface DeletePlanDialogProps {
    open: boolean;
    planName: string;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }
  ```

## 5. Typy

### Istniejące typy (z `src/types.ts`):

```typescript
// Już zdefiniowane, używane bez zmian
export type PlanDto = Pick<
  DbPlan,
  | "id"
  | "user_id"
  | "name"
  | "latitude"
  | "longitude"
  | "width_cm"
  | "height_cm"
  | "cell_size_cm"
  | "grid_width"
  | "grid_height"
  | "orientation"
  | "hemisphere"
  | "created_at"
  | "updated_at"
>;

export interface ApiListResponse<TItem> {
  data: TItem[];
  pagination: { next_cursor: Cursor | null };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: { field_errors?: Record<string, string> };
  };
}
```

### Nowe typy ViewModel (do utworzenia w `src/lib/viewmodels/plan.viewmodel.ts`):

```typescript
/**
 * Model widoku dla pojedynczego planu na liście
 * Zawiera przetworzone dane z PlanDto gotowe do wyświetlenia
 */
export interface PlanViewModel {
  /** UUID planu */
  id: string;
  
  /** Nazwa planu */
  name: string;
  
  /** Informacje o lokalizacji */
  location: PlanLocationViewModel;
  
  /** Rozmiar siatki (grid_width × grid_height) */
  gridSize: string;
  
  /** Data ostatniej modyfikacji (ISO string) */
  updatedAt: string;
  
  /** Sformatowana data modyfikacji do wyświetlenia (relatywna) */
  updatedAtDisplay: string;
}

/**
 * Model widoku dla lokalizacji planu
 */
export interface PlanLocationViewModel {
  /** Czy plan ma przypisaną lokalizację */
  hasLocation: boolean;
  
  /** Tekst do wyświetlenia, np. "52.1°N, 21.0°E" lub "Brak lokalizacji" */
  displayText: string;
  
  /** Szerokość geograficzna */
  latitude: number | null;
  
  /** Długość geograficzna */
  longitude: number | null;
}

/**
 * Funkcja konwertująca PlanDto do PlanViewModel
 */
export function planDtoToViewModel(dto: PlanDto): PlanViewModel {
  return {
    id: dto.id,
    name: dto.name,
    location: formatPlanLocation(dto.latitude, dto.longitude),
    gridSize: `${dto.grid_width} × ${dto.grid_height}`,
    updatedAt: dto.updated_at,
    updatedAtDisplay: formatRelativeDate(dto.updated_at),
  };
}

/**
 * Pomocnicza funkcja formatująca lokalizację
 */
function formatPlanLocation(
  latitude: number | null,
  longitude: number | null
): PlanLocationViewModel {
  if (latitude === null || longitude === null) {
    return {
      hasLocation: false,
      displayText: "Brak lokalizacji",
      latitude: null,
      longitude: null,
    };
  }

  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  const displayText = `${Math.abs(latitude).toFixed(1)}°${latDir}, ${Math.abs(longitude).toFixed(1)}°${lonDir}`;

  return {
    hasLocation: true,
    displayText,
    latitude,
    longitude,
  };
}

/**
 * Pomocnicza funkcja formatująca datę relatywną
 * Przykład: "2 dni temu", "wczoraj", "dziś"
 */
function formatRelativeDate(isoDate: string): string {
  // Implementacja z wykorzystaniem date-fns lub własnej logiki
  // np. formatDistanceToNow(parseISO(isoDate), { addSuffix: true, locale: pl })
}
```

### Typy stanu komponentu:

```typescript
/**
 * Stan ładowania listy planów
 */
type PlansListState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; plans: PlanViewModel[]; nextCursor: string | null };

/**
 * Stan dialogu usuwania
 */
interface DeleteDialogState {
  open: boolean;
  planId: string | null;
  planName: string | null;
  isDeleting: boolean;
}
```

## 6. Zarządzanie stanem

### Strategia zarządzania stanem:

Widok używa prostego zarządzania stanem lokalnym w komponencie `PlansList` przy użyciu hooków React (`useState`, `useEffect`). Nie ma potrzeby wykorzystania zaawansowanych bibliotek state management (Redux, Zustand) dla MVP, ponieważ stan jest lokalny dla widoku i niewspółdzielony.

### Stan w komponencie PlansList:

```typescript
// Stan listy planów
const [plansState, setPlansState] = useState<PlansListState>({ 
  status: 'loading' 
});

// Cursor dla paginacji
const [nextCursor, setNextCursor] = useState<string | null>(null);

// Stan dialogu usuwania
const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
  open: false,
  planId: null,
  planName: null,
  isDeleting: false,
});
```

### Custom Hook: `usePlansApi` (opcjonalnie, dla reużywalności):

Można wyodrębnić logikę API do custom hooka:

```typescript
/**
 * Hook zarządzający komunikacją z API planów
 */
function usePlansApi() {
  const [plansState, setPlansState] = useState<PlansListState>({ 
    status: 'loading' 
  });
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  /**
   * Pobiera pierwszą stronę planów
   */
  const fetchPlans = async () => {
    setPlansState({ status: 'loading' });
    try {
      const response = await fetch('/api/plans?limit=20&order=desc');
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Nie udało się pobrać planów');
      }

      const data: ApiListResponse<PlanDto> = await response.json();
      const viewModels = data.data.map(planDtoToViewModel);
      
      setPlansState({ 
        status: 'success', 
        plans: viewModels,
        nextCursor: data.pagination.next_cursor 
      });
      setNextCursor(data.pagination.next_cursor);
    } catch (error) {
      setPlansState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd' 
      });
    }
  };

  /**
   * Ładuje kolejną stronę planów
   */
  const loadMorePlans = async () => {
    if (!nextCursor || plansState.status !== 'success') return;

    try {
      const response = await fetch(
        `/api/plans?limit=20&order=desc&cursor=${encodeURIComponent(nextCursor)}`
      );

      if (!response.ok) {
        throw new Error('Nie udało się załadować więcej planów');
      }

      const data: ApiListResponse<PlanDto> = await response.json();
      const newViewModels = data.data.map(planDtoToViewModel);
      
      setPlansState({ 
        status: 'success', 
        plans: [...plansState.plans, ...newViewModels],
        nextCursor: data.pagination.next_cursor 
      });
      setNextCursor(data.pagination.next_cursor);
    } catch (error) {
      // Błąd podczas ładowania więcej - można pokazać toast
      console.error('Error loading more plans:', error);
    }
  };

  /**
   * Usuwa plan
   */
  const deletePlan = async (planId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return false;
      }

      if (!response.ok) {
        throw new Error('Nie udało się usunąć planu');
      }

      // Refetch planów po usunięciu
      await fetchPlans();
      return true;
    } catch (error) {
      console.error('Error deleting plan:', error);
      return false;
    }
  };

  // Fetch przy montowaniu
  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plansState,
    hasMore: !!nextCursor,
    fetchPlans,
    loadMorePlans,
    deletePlan,
  };
}
```

## 7. Integracja API

### Endpoint: GET /api/plans

**URL**: `/api/plans`

**Metoda**: GET

**Query parametry**:
- `limit` (optional, number, 1-100, default: 20) - liczba planów na stronę
- `cursor` (optional, string) - zakodowany cursor dla paginacji
- `sort` (optional, enum: 'updated_at') - pole sortowania
- `order` (optional, enum: 'asc' | 'desc', default: 'desc') - kierunek sortowania

**Request headers**:
- Cookie z sesją Supabase (automatycznie dołączany przez przeglądarkę)

**Typ żądania**: Brak body (GET)

**Typ odpowiedzi sukces (200)**:
```typescript
ApiListResponse<PlanDto> = {
  data: PlanDto[];
  pagination: {
    next_cursor: string | null;
  };
}
```

**Typy odpowiedzi błąd**:
- **401 Unauthorized**: `ApiErrorResponse` - brak sesji, redirect do `/login`
- **403 Forbidden**: `ApiErrorResponse` - problem z uprawnieniami RLS
- **500 Internal Error**: `ApiErrorResponse` - błąd serwera

**Przykład użycia w komponencie**:
```typescript
const fetchPlans = async () => {
  const response = await fetch('/api/plans?limit=20&order=desc', {
    credentials: 'include', // Ważne dla cookies
  });

  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json();
    throw new Error(errorData.error.message);
  }

  const data: ApiListResponse<PlanDto> = await response.json();
  return data;
};
```

### Endpoint: DELETE /api/plans/:plan_id

**URL**: `/api/plans/{planId}`

**Metoda**: DELETE

**Path parametry**:
- `plan_id` (required, UUID) - ID planu do usunięcia

**Request headers**:
- Cookie z sesją Supabase

**Typ żądania**: Brak body

**Typ odpowiedzi sukces (204)**:
- No Content (brak body)

**Typy odpowiedzi błąd**:
- **401 Unauthorized**: `ApiErrorResponse` - brak sesji
- **403 Forbidden**: `ApiErrorResponse` - plan nie należy do użytkownika
- **404 Not Found**: `ApiErrorResponse` - plan nie istnieje
- **500 Internal Error**: `ApiErrorResponse` - błąd serwera

**Przykład użycia w komponencie**:
```typescript
const deletePlan = async (planId: string) => {
  const response = await fetch(`/api/plans/${planId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (response.status === 401) {
    window.location.href = '/login';
    return false;
  }

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json();
    throw new Error(errorData.error.message);
  }

  return true;
};
```

## 8. Interakcje użytkownika

### 1. Wejście na stronę `/plans`

**Przepływ**:
1. Astro SSR sprawdza sesję użytkownika
2. Jeśli brak sesji → redirect 302 do `/login`
3. Jeśli sesja OK → renderowanie strony z komponentem `PlansList`
4. `PlansList` montuje się i automatycznie wywołuje `fetchPlans()`
5. Wyświetlenie stanu loading (spinner)
6. Po otrzymaniu odpowiedzi → przejście do stanu success/error

### 2. Kliknięcie "Nowy plan"

**Element**: Przycisk w `PlansListHeader`

**Akcja**:
```typescript
const handleCreateNew = () => {
  window.location.href = '/plans/new'; // Lub Astro.navigate() jeśli dostępne
};
```

**Rezultat**: Nawigacja do widoku tworzenia nowego planu

### 3. Kliknięcie "Edytuj" przy planie

**Element**: Przycisk w `PlanRow`

**Akcja**:
```typescript
const handleEdit = (planId: string) => {
  window.location.href = `/plans/${planId}/edit`;
};
```

**Rezultat**: Nawigacja do widoku edycji planu

### 4. Kliknięcie "Usuń" przy planie

**Element**: Przycisk w `PlanRow`

**Akcja**:
```typescript
const handleDeleteClick = (planId: string, planName: string) => {
  setDeleteDialog({
    open: true,
    planId,
    planName,
    isDeleting: false,
  });
};
```

**Rezultat**: Otwarcie dialogu potwierdzenia usunięcia

### 5. Potwierdzenie usunięcia w dialogu

**Element**: Przycisk "Usuń" w `DeletePlanDialog`

**Akcja**:
```typescript
const handleConfirmDelete = async () => {
  if (!deleteDialog.planId) return;

  setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

  const success = await deletePlan(deleteDialog.planId);

  if (success) {
    setDeleteDialog({
      open: false,
      planId: null,
      planName: null,
      isDeleting: false,
    });
    // fetchPlans() wywoływane automatycznie w deletePlan
  } else {
    // Pokazanie błędu (toast lub inline message)
    setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
  }
};
```

**Rezultat**: 
- Usunięcie planu z bazy
- Odświeżenie listy planów
- Zamknięcie dialogu

### 6. Anulowanie usunięcia w dialogu

**Element**: Przycisk "Anuluj" lub kliknięcie poza dialog

**Akcja**:
```typescript
const handleCancelDelete = () => {
  setDeleteDialog({
    open: false,
    planId: null,
    planName: null,
    isDeleting: false,
  });
};
```

**Rezultat**: Zamknięcie dialogu bez zmian

### 7. Kliknięcie "Załaduj więcej"

**Element**: `LoadMoreButton`

**Akcja**:
```typescript
const handleLoadMore = () => {
  loadMorePlans();
};
```

**Rezultat**: 
- Fetch kolejnej strony planów z `cursor`
- Append nowych planów do istniejącej listy
- Update `nextCursor`

### 8. Kliknięcie "Spróbuj ponownie" po błędzie

**Element**: Przycisk w `ErrorState`

**Akcja**:
```typescript
const handleRetry = () => {
  fetchPlans();
};
```

**Rezultat**: Ponowne wywołanie API i przejście do stanu loading

## 9. Warunki i walidacja

### Warunki weryfikowane na poziomie strony Astro:

1. **Istnienie sesji użytkownika**:
   - **Gdzie**: `src/pages/plans.astro`
   - **Warunek**: `user !== null`
   - **Akcja jeśli false**: `return Astro.redirect('/login')`
   - **Wpływ**: Brak dostępu do widoku bez logowania

### Warunki weryfikowane na poziomie komponentu PlansList:

2. **Status odpowiedzi API (401)**:
   - **Gdzie**: `PlansList`, funkcja `fetchPlans()`
   - **Warunek**: `response.status === 401`
   - **Akcja**: `window.location.href = '/login'`
   - **Wpływ**: Przekierowanie do logowania przy wygaśnięciu sesji

3. **Status odpowiedzi API (403)**:
   - **Gdzie**: `PlansList`, funkcja `fetchPlans()`
   - **Warunek**: `response.status === 403`
   - **Akcja**: Wyświetlenie stanu error z komunikatem "Brak uprawnień"
   - **Wpływ**: Informacja o problemie z dostępem (RLS)

4. **Status odpowiedzi API (500)**:
   - **Gdzie**: `PlansList`, funkcja `fetchPlans()`
   - **Warunek**: `response.status === 500`
   - **Akcja**: Wyświetlenie stanu error z komunikatem "Błąd serwera"
   - **Wpływ**: Informacja o błędzie + możliwość retry

5. **Pusta lista planów**:
   - **Gdzie**: `PlansList`, renderowanie warunkowe
   - **Warunek**: `plansState.status === 'success' && plansState.plans.length === 0`
   - **Akcja**: Renderowanie `EmptyState`
   - **Wpływ**: Zachęta do utworzenia pierwszego planu

6. **Istnienie kolejnej strony (paginacja)**:
   - **Gdzie**: `PlansList`, renderowanie `LoadMoreButton`
   - **Warunek**: `nextCursor !== null`
   - **Akcja**: Wyświetlenie przycisku "Załaduj więcej"
   - **Wpływ**: Możliwość paginacji

7. **Potwierdzenie usunięcia planu**:
   - **Gdzie**: `DeletePlanDialog`
   - **Warunek**: `deleteDialog.open === true`
   - **Akcja**: Wyświetlenie dialogu z wymuszeniem potwierdzenia
   - **Wpływ**: Zabezpieczenie przed przypadkowym usunięciem

### Walidacja danych z API:

8. **Struktura odpowiedzi API**:
   - **Gdzie**: `PlansList`, funkcje `fetchPlans()` i `loadMorePlans()`
   - **Warunek**: Sprawdzenie czy `data.data` jest tablicą, czy `data.pagination` istnieje
   - **Akcja**: W przypadku nieprawidłowej struktury → błąd
   - **Wpływ**: Odporność na zmiany w API

9. **Walidacja UUID planId**:
   - **Gdzie**: Przed wywołaniem `DELETE /api/plans/:plan_id`
   - **Warunek**: `deleteDialog.planId !== null`
   - **Akcja**: Wywołanie API tylko jeśli ID istnieje
   - **Wpływ**: Zabezpieczenie przed błędnymi requestami

## 10. Obsługa błędów

### 1. Błąd 401 Unauthorized (sesja wygasła)

**Scenariusz**: Użytkownik zalogował się, ale sesja wygasła podczas przeglądania

**Obsługa**:
- Detekcja: `response.status === 401`
- Akcja: Automatyczne przekierowanie do `/login`
- Komunikat: Brak (redirect natychmiastowy)

**Implementacja**:
```typescript
if (response.status === 401) {
  window.location.href = '/login';
  return;
}
```

### 2. Błąd 403 Forbidden (problem z RLS)

**Scenariusz**: Problem z uprawnieniami Row Level Security w Supabase

**Obsługa**:
- Detekcja: `response.status === 403`
- Akcja: Wyświetlenie `ErrorState` z komunikatem
- Komunikat: "Brak uprawnień do wyświetlenia planów. Skontaktuj się z administratorem."
- Przycisk: Brak (nie ma sensu retry)

### 3. Błąd 500 Internal Server Error

**Scenariusz**: Błąd po stronie serwera lub bazy danych

**Obsługa**:
- Detekcja: `response.status === 500`
- Akcja: Wyświetlenie `ErrorState` z komunikatem
- Komunikat: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."
- Przycisk: "Spróbuj ponownie" → wywołanie `fetchPlans()`

### 4. Błąd sieciowy (Network Error)

**Scenariusz**: Brak połączenia z internetem, timeout

**Obsługa**:
- Detekcja: `catch` block w `fetchPlans()`, sprawdzenie typu błędu
- Akcja: Wyświetlenie `ErrorState` z komunikatem
- Komunikat: "Brak połączenia z serwerem. Sprawdź połączenie internetowe."
- Przycisk: "Spróbuj ponownie"

**Implementacja**:
```typescript
try {
  const response = await fetch('/api/plans');
  // ...
} catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    setPlansState({ 
      status: 'error', 
      message: 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.' 
    });
  } else {
    setPlansState({ 
      status: 'error', 
      message: 'Wystąpił nieoczekiwany błąd.' 
    });
  }
}
```

### 5. Błąd podczas usuwania planu

**Scenariusz**: Niepowodzenie DELETE request

**Obsługa**:
- Detekcja: `!response.ok` w `deletePlan()`
- Akcja: Pokazanie komunikatu błędu (toast notification lub inline)
- Komunikat: "Nie udało się usunąć planu. Spróbuj ponownie."
- Dialog: Pozostaje otwarty, użytkownik może spróbować ponownie lub anulować

**Implementacja**:
```typescript
const handleConfirmDelete = async () => {
  setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

  try {
    const success = await deletePlan(deleteDialog.planId!);
    
    if (success) {
      setDeleteDialog({ open: false, planId: null, planName: null, isDeleting: false });
    } else {
      // Pokazanie błędu, np. przez toast lub state
      setDeleteError("Nie udało się usunąć planu");
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  } catch (error) {
    setDeleteError("Wystąpił nieoczekiwany błąd");
    setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
  }
};
```

### 6. Błąd nieprawidłowej struktury odpowiedzi

**Scenariusz**: API zwróciło dane w nieoczekiwanym formacie

**Obsługa**:
- Detekcja: TypeScript type guards + runtime check
- Akcja: Wyświetlenie `ErrorState` z ogólnym komunikatem
- Komunikat: "Otrzymano nieprawidłowe dane z serwera."
- Logging: `console.error()` z szczegółami dla debugowania

### 7. Błąd podczas ładowania kolejnej strony

**Scenariusz**: Niepowodzenie przy "Załaduj więcej"

**Obsługa**:
- Detekcja: `catch` w `loadMorePlans()`
- Akcja: Pokazanie toast notification (nie zmieniamy głównego stanu na error)
- Komunikat: "Nie udało się załadować więcej planów"
- Lista: Pozostaje bez zmian, użytkownik może spróbować ponownie

### 8. Graceful degradation

**Scenariusz**: Brak niektórych danych w odpowiedzi (np. latitude/longitude)

**Obsługa**:
- Sprawdzenie `null` values w `formatPlanLocation()`
- Wyświetlenie fallback text: "Brak lokalizacji"
- Aplikacja działa normalnie bez tych danych

## 11. Kroki implementacji

### Krok 1: Utworzenie typów ViewModel i funkcji pomocniczych

**Pliki do utworzenia**:
- `src/lib/viewmodels/plan.viewmodel.ts`
- `src/lib/utils/date-format.ts` (dla formatowania dat)

**Działania**:
1. Zdefiniować interfejsy `PlanViewModel`, `PlanLocationViewModel`
2. Implementować funkcję `planDtoToViewModel()`
3. Implementować funkcję `formatPlanLocation()`
4. Implementować funkcję `formatRelativeDate()` (można użyć biblioteki `date-fns`)

**Zależności do zainstalacji** (jeśli używamy date-fns):
```bash
npm install date-fns
```

### Krok 2: Utworzenie komponentów UI (bottom-up approach)

**Pliki do utworzenia w `src/components/plans/`**:

1. `LoadingState.tsx` - komponent wyświetlający spinner
2. `ErrorState.tsx` - komponent błędu z przyciskiem retry
3. `EmptyState.tsx` - komponent pustej listy
4. `PlanRow.tsx` - wiersz tabeli z danymi planu
5. `PlansTable.tsx` - tabela opakowująca wiersze
6. `LoadMoreButton.tsx` - przycisk paginacji
7. `DeletePlanDialog.tsx` - modal potwierdzenia usunięcia
8. `PlansListHeader.tsx` - nagłówek z przyciskiem CTA

**Kolejność implementacji**: Od najprostszych (LoadingState) do najbardziej złożonych (DeletePlanDialog)

**Użycie komponentów shadcn/ui**:
- `Button` - dla wszystkich przycisków
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` - dla tabeli
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` - dla modala
- Ikony z `lucide-react`: `Plus`, `Pencil`, `Trash2`, `Loader2`, `AlertCircle`, `FileQuestion`

### Krok 3: Utworzenie custom hooka do komunikacji z API

**Plik do utworzenia**:
- `src/lib/hooks/usePlansApi.ts`

**Działania**:
1. Zaimportować typy z `src/types.ts` i `src/lib/viewmodels/plan.viewmodel.ts`
2. Zdefiniować typ `PlansListState`
3. Zaimplementować hook `usePlansApi()` z funkcjami:
   - `fetchPlans()` - GET /api/plans
   - `loadMorePlans()` - GET /api/plans?cursor=...
   - `deletePlan()` - DELETE /api/plans/:id
4. Obsłużyć wszystkie scenariusze błędów (401, 403, 500, network)
5. Dodać `useEffect` do automatycznego fetch przy montowaniu

### Krok 4: Utworzenie głównego komponentu PlansList

**Plik do utworzenia**:
- `src/components/plans/PlansList.tsx`

**Działania**:
1. Zaimportować wszystkie podkomponenty z kroku 2
2. Użyć hooka `usePlansApi()` z kroku 3
3. Zdefiniować stan dialogu usuwania: `useState<DeleteDialogState>`
4. Zaimplementować handlery:
   - `handleCreateNew()` - nawigacja do `/plans/new`
   - `handleEdit()` - nawigacja do `/plans/{id}/edit`
   - `handleDeleteClick()` - otwarcie dialogu
   - `handleConfirmDelete()` - wywołanie `deletePlan()` + zamknięcie dialogu
   - `handleCancelDelete()` - zamknięcie dialogu
   - `handleLoadMore()` - wywołanie `loadMorePlans()`
   - `handleRetry()` - wywołanie `fetchPlans()`
5. Zaimplementować warunkowe renderowanie w zależności od `plansState.status`:
   - 'loading' → `<LoadingState />`
   - 'error' → `<ErrorState message={...} onRetry={...} />`
   - 'success' + pusta lista → `<EmptyState onCreateNew={...} />`
   - 'success' + dane → `<PlansTable />` + `<LoadMoreButton />` + `<DeletePlanDialog />`

### Krok 5: Utworzenie strony Astro

**Plik do utworzenia**:
- `src/pages/plans.astro`

**Działania**:
1. Zaimportować Layout aplikacji
2. W sekcji frontmatter:
   - Pobrać klienta Supabase: `const supabase = Astro.locals.supabase`
   - Sprawdzić sesję: `const { data } = await supabase.auth.getUser()`
   - Jeśli `!data.user` → `return Astro.redirect('/login')`
3. W sekcji template:
   - Użyć `<Layout>`
   - Dodać `<main role="main">` z odpowiednimi klasami Tailwind
   - Osadzić `<PlansList client:load />`
4. Dodać metadata strony (title, description)

**Przykład struktury**:
```astro
---
import Layout from '@/layouts/Layout.astro';
import PlansList from '@/components/plans/PlansList';

// Weryfikacja sesji
const supabase = Astro.locals.supabase;
if (!supabase) {
  return Astro.redirect('/login');
}

const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return Astro.redirect('/login');
}
---

<Layout title="Moje plany - PlantsPlaner">
  <main role="main" class="container mx-auto px-4 py-8">
    <PlansList client:load />
  </main>
</Layout>
```

### Krok 7: Testowanie manualne

**Scenariusze testowe**:

1. **Test autoryzacji**:
   - Wyloguj się → przejdź do `/plans` → sprawdź redirect do `/login`
   - Zaloguj się → przejdź do `/plans` → sprawdź dostęp

2. **Test pustej listy**:
   - Jako nowy użytkownik bez planów → sprawdź wyświetlenie `EmptyState`
   - Kliknij "Utwórz pierwszy plan" → sprawdź nawigację

3. **Test listy z danymi**:
   - Utwórz kilka planów testowych (przez API lub UI)
   - Sprawdź wyświetlenie wszystkich pól: nazwa, lokalizacja, rozmiar, data
   - Sprawdź formatowanie daty relatywnej

4. **Test edycji**:
   - Kliknij "Edytuj" przy planie → sprawdź nawigację do `/plans/{id}/edit`

5. **Test usuwania**:
   - Kliknij "Usuń" → sprawdź otwarcie dialogu
   - Kliknij "Anuluj" → sprawdź zamknięcie bez zmian
   - Kliknij "Usuń" → sprawdź potwierdzenie → sprawdź usunięcie i odświeżenie listy

6. **Test paginacji** (jeśli >20 planów):
   - Utwórz >20 planów testowych
   - Sprawdź wyświetlenie przycisku "Załaduj więcej"
   - Kliknij przycisk → sprawdź załadowanie kolejnej strony
   - Sprawdź brak duplikatów w liście

7. **Test błędów**:
   - Symuluj błąd 500 (np. zatrzymując backend) → sprawdź `ErrorState`
   - Kliknij "Spróbuj ponownie" → sprawdź ponowne ładowanie
   - Symuluj wygaśnięcie sesji (usunięcie cookies) → sprawdź redirect do logowania

### Krok 8: Implementacja dostępności (a11y)

**Działania**:

1. **Semantyczne HTML**:
   - Sprawdzić użycie `<main>`, `<table>`, `<button>` (nie `<div>` z onClick)
   - Sprawdzić hierarchię nagłówków (`<h1>`, `<h2>`)

2. **ARIA labels**:
   - Dodać `aria-label` do przycisków z samą ikoną
   - Dodać `aria-describedby` do dialogu usuwania
   - Dodać `role="status"` dla loading state
   - Dodać `role="alert"` dla error state

3. **Zarządzanie fokusem**:
   - Sprawdzić czy fokus przenosi się do dialogu po otwarciu
   - Sprawdzić czy fokus wraca do przycisku "Usuń" po zamknięciu dialogu
   - Sprawdzić czy można nawigować tabulatorem przez całą tabelę

4. **Kontrasty kolorów**:
   - Sprawdzić kontrast tekstu na tle (minimum WCAG AA: 4.5:1)
   - Sprawdzić widoczność fokusa na elementach interaktywnych

5. **Responsywność** (opcjonalnie dla MVP desktop-only):
   - Sprawdzić czy tabela nie wykracza poza ekran na małych rozdzielczościach
   - Rozważyć użycie horizontal scroll dla małych ekranów

### Krok 9: Refactoring i czyszczenie kodu

**Działania**:
1. Sprawdzić linter (ESLint) → naprawić wszystkie błędy
2. Sprawdzić TypeScript errors → naprawić wszystkie błędy typów
3. Usunąć console.log() z kodu produkcyjnego (zachować tylko console.error dla błędów)
4. Sprawdzić czy wszystkie stringi UI są wyodrębnione (przygotowanie pod i18n)
5. Dodać komentarze JSDoc do funkcji pomocniczych i komponentów
6. Sprawdzić spójność nazewnictwa (camelCase dla zmiennych, PascalCase dla komponentów)

### Krok 10: Dokumentacja i commit

**Działania**:
1. Zaktualizować dokumentację w `.ai/docs/` jeśli potrzebne
2. Dodać przykłady użycia w komentarzach komponentów
3. Utworzyć commit z opisowym komunikatem:
   ```
   feat: implement plans list view
   
   - Add PlansList React component with pagination
   - Add DELETE endpoint for plans
   - Add plan ViewModel with location and date formatting
   - Add empty state, error handling, and delete confirmation dialog
   - Implement SSR auth check with redirect to login
   
   Resolves US-021, US-032
   ```
4. Ewentualnie: Utworzyć Pull Request z opisem zmian i screenshotami

---

**Koniec planu implementacji**

