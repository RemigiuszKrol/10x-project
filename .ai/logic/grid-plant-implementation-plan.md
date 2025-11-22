# Plan implementacji: Zarządzanie roślinami w edytorze planu

## 1. Przegląd

Plan implementacji funkcjonalności dodawania, wyszukiwania i zarządzania roślinami w edytorze siatki planu działki. Obejmuje integrację z AI do wyszukiwania i oceny dopasowania roślin, obsługę timeout'ów i błędów, walidację typu komórek oraz system potwierdzania operacji. Implementacja rozszerza istniejący widok edytora o pełną funkcjonalność zakładki "Rośliny" (PlantsTab).

## 2. Routing widoku

Funkcjonalność jest częścią istniejącego widoku edytora:

**Ścieżka:** `/plans/:id` (istniejąca)

**Rozszerzenie:** Zakładka "Rośliny" w SideDrawer (prawy panel edytora)

**Warunki dostępu:**
- Wymaga uwierzytelnienia (istniejący middleware)
- Plan musi należeć do zalogowanego użytkownika
- Plan musi mieć ustawioną lokalizację (dla AI fit)

## 3. Struktura komponentów

```
EditorLayout (istniejący)
└── SideDrawer (istniejący)
    └── PlantsTab (NOWY - zastępuje placeholder)
        ├── PlantsTabHeader
        │   ├── PlantsCount
        │   └── AddPlantButton
        │
        ├── PlantsList
        │   └── PlantCard (multiple)
        │       ├── PlantInfo (nazwa, pozycja)
        │       ├── PlantScores (gwiazdki 1-5)
        │       ├── JumpToButton
        │       └── DeleteButton
        │
        └── EmptyState (gdy brak roślin)

Modals (globalne, nowe):
├── AddPlantDialog
│   ├── DialogHeader
│   ├── CellInfoBadge (x, y, type)
│   ├── Tabs
│   │   ├── SearchTab
│   │   │   ├── PlantSearchForm
│   │   │   │   ├── SearchInput
│   │   │   │   └── SearchButton
│   │   │   ├── SearchLoadingState
│   │   │   ├── PlantSearchResults
│   │   │   │   └── CandidateItem (multiple)
│   │   │   │       ├── PlantName
│   │   │   │       ├── LatinName
│   │   │   │       └── SelectButton
│   │   │   └── NoResultsMessage
│   │   │
│   │   └── ManualTab
│   │       ├── ManualNameInput
│   │       └── InfoTooltip
│   │
│   ├── PlantFitDisplay (po wyborze kandydata)
│   │   ├── FitLoadingState
│   │   ├── ScoreCards
│   │   │   ├── SunlightScore (★★★★☆)
│   │   │   ├── HumidityScore
│   │   │   ├── PrecipScore
│   │   │   └── OverallScore
│   │   ├── ExplanationText
│   │   └── SeasonInfoTooltip
│   │
│   └── DialogFooter
│       ├── CancelButton
│       ├── SkipScoresButton (przy timeout fit)
│       └── ConfirmButton
│
├── AIErrorDialog
│   ├── ErrorIcon
│   ├── ErrorMessage
│   ├── ErrorDetails (timeout/bad JSON/rate limit)
│   └── Actions
│       ├── RetryButton
│       ├── AddWithoutScoresButton (dla fit error)
│       ├── AddManuallyButton (dla search error)
│       └── CancelButton
│
├── CellNotSoilDialog
│   ├── WarningIcon
│   ├── WarningMessage
│   └── OkButton
│
└── DeletePlantConfirmDialog
    ├── ConfirmMessage (nazwa rośliny)
    └── Actions
        ├── CancelButton
        └── ConfirmDeleteButton
```

## 4. Szczegóły komponentów

### 4.1. PlantsTab

**Opis:** Główny kontener zakładki "Rośliny" w SideDrawer. Wyświetla listę wszystkich roślin w planie oraz przycisk dodawania nowej rośliny. Zarządza stanem AddPlantDialog.

**Główne elementy:**
- `<div className="flex flex-col h-full">`
- PlantsTabHeader z licznikiem i przyciskiem
- ScrollArea z PlantsList
- EmptyState (gdy brak roślin)
- AddPlantDialog (warunkowe renderowanie)

**Obsługiwane zdarzenia:**
- `onAddPlantClick()` - otwarcie dialogu dodawania (sprawdza czy jest zaznaczona komórka)
- `onPlantAdded()` - zamknięcie dialogu po sukcesie
- `onPlantDeleted(x, y)` - usunięcie rośliny z listy

**Walidacja:**
- Przycisk "Dodaj roślinę" disabled jeśli brak zaznaczonej komórki LUB komórka !== 'soil'
- Tooltip wyjaśniający dlaczego disabled

**Typy:**
- `PlantPlacementDto[]` - lista roślin z query
- `CellPosition | null` - zaznaczona komórka z EditorState
- `GridCellType | null` - typ zaznaczonej komórki

**Propsy:**
```typescript
interface PlantsTabProps {
  planId: string;
  selectedCell: CellPosition | null;
  cellType: GridCellType | null;
  onJumpToCell: (x: number, y: number) => void;
}
```

### 4.2. PlantsList

**Opis:** Lista wszystkich roślin w planie. Wyświetla PlantCard dla każdej rośliny. Obsługuje filtrowanie i sortowanie (opcjonalnie).

**Główne elementy:**
- `<div className="space-y-2">`
- Array.map PlantCard
- EmptyState jeśli pusta lista

**Obsługiwane zdarzenia:**
- `onPlantClick(x, y)` - focus na komórce w GridCanvas
- `onDeleteClick(x, y)` - otwarcie DeletePlantConfirmDialog

**Walidacja:** brak

**Typy:**
- `PlantPlacementDto[]`
- `PlantCardViewModel[]` (derived)

**Propsy:**
```typescript
interface PlantsListProps {
  planId: string;
  plants: PlantPlacementDto[];
  onJumpToCell: (x: number, y: number) => void;
  onDeletePlant: (x: number, y: number) => Promise<void>;
}
```

### 4.3. PlantCard

**Opis:** Pojedyncza karta rośliny w liście. Wyświetla nazwę, pozycję, oceny dopasowania (gwiazdki) oraz akcje (przejdź do, usuń).

**Główne elementy:**
- `<Card className="p-4">`
- Flex layout: Info (left) + Actions (right)
- PlantName + LatinName (jeśli dostępna)
- Position badge `(x: 3, y: 7)`
- Scores row (4 gwiazdki, każda z tooltipem)
- Button group: JumpTo, Delete

**Obsługiwane zdarzenia:**
- `onJumpToClick()` - fokus na komórce
- `onDeleteClick()` - potwierdzenie usunięcia

**Walidacja:** brak

**Typy:**
- `PlantPlacementDto`

**Propsy:**
```typescript
interface PlantCardProps {
  plant: PlantPlacementDto;
  onJumpTo: (x: number, y: number) => void;
  onDelete: (x: number, y: number) => void;
}
```

### 4.4. AddPlantDialog

**Opis:** Modal do dodawania nowej rośliny. Zawiera dwie zakładki: "Wyszukaj" (AI) i "Ręcznie". Zarządza przepływem: wyszukiwanie → wybór kandydata → ocena dopasowania → potwierdzenie.

**Główne elementy:**
- `<Dialog>` z shadcn/ui
- DialogHeader z tytułem i CellInfoBadge
- `<Tabs>` z dwoma TabsTrigger
- TabsContent: SearchTab, ManualTab
- PlantFitDisplay (warunkowe, po wyborze kandydata)
- DialogFooter z akcjami

**Obsługiwane zdarzenia:**
- `onOpenChange(open)` - otwarcie/zamknięcie dialogu
- `onSearchSubmit(query)` - wyszukiwanie AI
- `onCandidateSelect(candidate)` - wybór kandydata → trigger fit
- `onManualNameChange(name)` - wpisanie nazwy ręcznie
- `onConfirm()` - zapis rośliny PUT /plants/:x/:y
- `onCancel()` - zamknięcie bez zmian
- `onRetry()` - ponowienie zapytania AI po błędzie
- `onSkipScores()` - dodanie bez oceny (po timeout fit)

**Walidacja:**
- SearchTab: query.length > 0
- ManualTab: manualName.length > 0
- ConfirmButton enabled jeśli (selectedCandidate !== null) LUB (manualName !== '')
- ConfirmButton disabled podczas isSubmitting

**Typy:**
- `AddPlantDialogState` (ViewModel)
- `PlantSearchCommand`, `PlantSearchResultDto`
- `PlantFitCommand`, `PlantFitResultDto`
- `PlantPlacementUpsertCommand`
- `AIError` (ViewModel)

**Propsy:**
```typescript
interface AddPlantDialogProps {
  isOpen: boolean;
  planId: string;
  cell: CellPosition;
  cellType: GridCellType;
  onSuccess: () => void;
  onCancel: () => void;
}
```

### 4.5. PlantSearchForm

**Opis:** Formularz wyszukiwania roślin z input i przyciskiem. Obsługuje wysyłanie zapytania do AI.

**Główne elementy:**
- `<form onSubmit={handleSearch}>`
- `<Input>` z placeholder "Wpisz nazwę rośliny..."
- `<Button type="submit">` "Szukaj" z ikoną Search
- LoadingSpinner (podczas wyszukiwania)

**Obsługiwane zdarzenia:**
- `onSubmit(query)` - wysłanie POST /ai/plants/search

**Walidacja:**
- query.length > 0 (disabled button)

**Typy:**
- `PlantSearchCommand`

**Propsy:**
```typescript
interface PlantSearchFormProps {
  onSearch: (query: string) => Promise<void>;
  isLoading: boolean;
}
```

### 4.6. PlantSearchResults

**Opis:** Lista kandydatów zwróconych przez AI. Każdy kandydat to przycisk z nazwą i nazwą łacińską.

**Główne elementy:**
- `<div className="space-y-2">`
- Array.map CandidateItem
- NoResultsMessage (jeśli candidates.length === 0)

**Obsługiwane zdarzenia:**
- `onCandidateClick(candidate)` - wybór kandydata

**Walidacja:** brak

**Typy:**
- `PlantSearchCandidateDto[]`

**Propsy:**
```typescript
interface PlantSearchResultsProps {
  candidates: PlantSearchCandidateDto[];
  onSelect: (candidate: PlantSearchCandidateDto) => Promise<void>;
}
```

### 4.7. PlantFitDisplay

**Opis:** Wyświetlanie wyników oceny dopasowania rośliny. Pokazuje 4 scores jako gwiazdki (1-5) oraz explanation text.

**Główne elementy:**
- `<div className="space-y-4">`
- Grid 2x2 dla 4 ScoreCard (sunlight, humidity, precip, overall)
- ExplanationText (jeśli dostępne)
- SeasonInfoTooltip (info o wagach sezonów)

**Obsługiwane zdarzenia:** brak (tylko wyświetlanie)

**Walidacja:** brak

**Typy:**
- `PlantFitResultDto`

**Propsy:**
```typescript
interface PlantFitDisplayProps {
  fitResult: PlantFitResultDto;
  isLoading: boolean;
}
```

### 4.8. ScoreCard

**Opis:** Pojedyncza karta z oceną parametru (np. nasłonecznienie). Wyświetla nazwę, gwiazdki (1-5) oraz tooltip z wyjaśnieniem.

**Główne elementy:**
- `<Card className="p-3">`
- Label (np. "Nasłonecznienie")
- Stars row (★★★★☆)
- Tooltip z opisem co oznacza score

**Obsługiwane zdarzenia:** brak

**Walidacja:** score 1-5

**Typy:**
- `score: number` (1-5)

**Propsy:**
```typescript
interface ScoreCardProps {
  label: string;
  score: number;
  icon?: React.ReactNode;
  description?: string;
}
```

### 4.9. AIErrorDialog

**Opis:** Modal wyświetlający błędy związane z AI (timeout, bad JSON, rate limit). Oferuje akcje: ponowienie, dodanie bez oceny, anulowanie.

**Główne elementy:**
- `<AlertDialog>` z shadcn/ui
- AlertDialogHeader z ikoną błędu
- ErrorMessage (zależnie od typu)
- ErrorDetails (np. "Spróbuj ponownie za 60s")
- AlertDialogFooter z akcjami

**Obsługiwane zdarzenia:**
- `onRetry()` - ponowienie zapytania AI
- `onAddWithoutScores()` - dodanie rośliny bez oceny (tylko dla fit error)
- `onAddManually()` - przejście do ManualTab (tylko dla search error)
- `onCancel()` - zamknięcie dialogu

**Walidacja:** brak

**Typy:**
- `AIError` (ViewModel)

**Propsy:**
```typescript
interface AIErrorDialogProps {
  isOpen: boolean;
  error: AIError;
  context: 'search' | 'fit';
  onRetry: () => Promise<void>;
  onAddWithoutScores?: () => void;
  onAddManually?: () => void;
  onCancel: () => void;
}
```

### 4.10. CellNotSoilDialog

**Opis:** Prosty modal informujący, że rośliny można dodawać tylko na pola typu 'ziemia'.

**Główne elementy:**
- `<AlertDialog>`
- WarningIcon
- WarningMessage: "Rośliny można dodawać tylko na pola typu 'ziemia'"
- OkButton

**Obsługiwane zdarzenia:**
- `onOk()` - zamknięcie dialogu

**Walidacja:** brak

**Typy:** brak

**Propsy:**
```typescript
interface CellNotSoilDialogProps {
  isOpen: boolean;
  cellType: GridCellType;
  onClose: () => void;
}
```

### 4.11. DeletePlantConfirmDialog

**Opis:** Potwierdzenie usunięcia rośliny z pola.

**Główne elementy:**
- `<AlertDialog>`
- ConfirmMessage: "Czy na pewno chcesz usunąć roślinę '{plantName}'?"
- Position info: "Pole (x: 3, y: 7)"
- Actions: Cancel, Confirm

**Obsługiwane zdarzenia:**
- `onConfirm()` - DELETE /plants/:x/:y
- `onCancel()` - zamknięcie bez zmian

**Walidacja:** brak

**Typy:**
- `PlantPlacementDto` (nazwa rośliny)

**Propsy:**
```typescript
interface DeletePlantConfirmDialogProps {
  isOpen: boolean;
  plant: PlantPlacementDto;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

## 5. Typy

### 5.1. Istniejące DTO (z types.ts)

Wykorzystujemy bez zmian:
- `PlantPlacementDto` - roślina w bazie
- `PlantSearchCommand` - zapytanie wyszukiwania
- `PlantSearchCandidateDto` - kandydat z AI
- `PlantSearchResultDto` - wyniki wyszukiwania
- `PlantFitCommand` - zapytanie o dopasowanie
- `PlantFitResultDto` - ocena dopasowania
- `PlantPlacementUpsertCommand` - komenda zapisu rośliny

### 5.2. Nowe ViewModels

```typescript
/**
 * Stan dialogu dodawania rośliny
 */
export interface AddPlantDialogState {
  step: 'search' | 'candidate_selected' | 'fit_loading' | 'fit_ready' | 'manual';
  activeTab: 'search' | 'manual';
  searchQuery: string;
  searchResults: PlantSearchCandidateDto[] | null;
  isSearching: boolean;
  selectedCandidate: PlantSearchCandidateDto | null;
  fitResult: PlantFitResultDto | null;
  isFitting: boolean;
  manualName: string;
  isSubmitting: boolean;
  error: AIError | null;
}

/**
 * Błąd AI
 */
export interface AIError {
  type: 'timeout' | 'bad_json' | 'rate_limit' | 'network' | 'unknown';
  message: string;
  context: 'search' | 'fit';
  canRetry: boolean;
  retryAfter?: number; // dla rate_limit, w sekundach
  details?: string;
}

/**
 * Konfiguracja progów scoring (dla dokumentacji/tooltipów)
 */
export interface ScoreThresholds {
  excellent: { min: number; score: 5 }; // ≥90
  good: { min: number; score: 4 };      // 80-89
  fair: { min: number; score: 3 };      // 70-79
  poor: { min: number; score: 2 };      // 60-69
  bad: { min: number; score: 1 };       // <60
}

/**
 * Konfiguracja wag sezonów (dla tooltipów)
 */
export interface SeasonWeights {
  growingSeason: { months: number[]; weight: 2 }; // IV-IX (northern)
  offSeason: { months: number[]; weight: 1 };     // X-III
  hemisphere: 'northern' | 'southern';
}

/**
 * ViewModel dla karty rośliny w liście
 */
export interface PlantCardViewModel {
  placement: PlantPlacementDto;
  displayName: string; // plant_name sformatowana
  position: string;    // "x: 3, y: 7"
  hasScores: boolean;  // czy ma wypełnione scores
}
```

### 5.3. Typy pomocnicze

```typescript
/**
 * Parametry modułu AI
 */
export interface AIServiceConfig {
  searchEndpoint: string;
  fitEndpoint: string;
  timeout: number; // 10000ms
  maxRetries: number; // 1
}

/**
 * Wynik walidacji odpowiedzi AI
 */
export type AIValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: AIError };
```

## 6. Zarządzanie stanem

### 6.1. Lokalny stan komponentów

**PlantsTab:**
- `isAddDialogOpen: boolean` - czy AddPlantDialog jest otwarty
- `isDeleteDialogOpen: boolean` - czy DeletePlantConfirmDialog jest otwarty
- `plantToDelete: PlantPlacementDto | null` - roślina do usunięcia

**AddPlantDialog:**
- Stan zarządzany przez `useAddPlantFlow` (custom hook)

### 6.2. Custom Hook: useAddPlantFlow

Centralny hook zarządzający przepływem dodawania rośliny:

```typescript
interface UseAddPlantFlowReturn {
  state: AddPlantDialogState;
  actions: {
    // Wyszukiwanie
    searchPlants: (query: string) => Promise<void>;
    selectCandidate: (candidate: PlantSearchCandidateDto) => Promise<void>;
    retrySearch: () => Promise<void>;
    
    // Ocena dopasowania
    checkFit: (plantName: string) => Promise<void>;
    retryFit: () => Promise<void>;
    skipFit: () => void;
    
    // Ręczne dodanie
    setManualName: (name: string) => void;
    
    // Finalizacja
    confirmAdd: () => Promise<void>;
    cancel: () => void;
    
    // Obsługa błędów
    dismissError: () => void;
  };
}

function useAddPlantFlow(
  planId: string,
  cell: CellPosition,
  onSuccess: () => void
): UseAddPlantFlowReturn {
  const [state, setState] = useState<AddPlantDialogState>(initialState);
  
  // Mutations z React Query (już istniejące)
  const searchMutation = useAIMutations().search;
  const fitMutation = useAIMutations().fit;
  const addPlantMutation = usePlantMutations().add;
  
  // Tracking analityczny
  const { trackPlantConfirmed } = useAnalyticsEvents(planId);
  
  // AI service z timeout i walidacją
  const aiService = useAIService();
  
  // Implementacja actions...
  
  return { state, actions };
}
```

### 6.3. Custom Hook: useAIService

Wrapper dla komunikacji z AI z obsługą timeout i walidacji:

```typescript
interface UseAIServiceReturn {
  searchPlants: (query: string) => Promise<PlantSearchResultDto>;
  checkPlantFit: (command: PlantFitCommand) => Promise<PlantFitResultDto>;
}

function useAIService(config?: Partial<AIServiceConfig>): UseAIServiceReturn {
  const defaultConfig: AIServiceConfig = {
    searchEndpoint: '/api/ai/plants/search',
    fitEndpoint: '/api/ai/plants/fit',
    timeout: 10000,
    maxRetries: 1,
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  const validator = useAIValidation();
  
  const searchPlants = async (query: string) => {
    // 1. Timeout wrapper
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);
    
    try {
      // 2. Fetch z timeout
      const response = await fetch(finalConfig.searchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 3. Obsługa błędów HTTP
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          throw createAIError('rate_limit', 'search', retryAfter);
        }
        throw createAIError('unknown', 'search');
      }
      
      // 4. Walidacja JSON
      const data = await response.json();
      const validation = validator.validateSearchResult(data);
      
      if (!validation.success) {
        throw validation.error;
      }
      
      return validation.data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 5. Obsługa timeout
      if (error.name === 'AbortError') {
        throw createAIError('timeout', 'search');
      }
      
      // 6. Obsługa błędów sieciowych
      if (error instanceof TypeError) {
        throw createAIError('network', 'search');
      }
      
      throw error;
    }
  };
  
  // checkPlantFit - analogiczna implementacja
  
  return { searchPlants, checkPlantFit };
}
```

### 6.4. Custom Hook: useAIValidation

Walidacja odpowiedzi AI z użyciem Zod:

```typescript
function useAIValidation() {
  // Zod schemas
  const PlantSearchCandidateSchema = z.object({
    name: z.string().min(1),
    latin_name: z.string().optional(),
    source: z.literal('ai'),
  });
  
  const PlantSearchResultSchema = z.object({
    candidates: z.array(PlantSearchCandidateSchema),
  });
  
  const PlantFitResultSchema = z.object({
    sunlight_score: z.number().int().min(1).max(5),
    humidity_score: z.number().int().min(1).max(5),
    precip_score: z.number().int().min(1).max(5),
    overall_score: z.number().int().min(1).max(5),
    explanation: z.string().optional(),
  });
  
  return {
    validateSearchResult: (data: unknown): AIValidationResult<PlantSearchResultDto> => {
      const result = PlantSearchResultSchema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return {
        success: false,
        error: createAIError('bad_json', 'search', undefined, result.error.message),
      };
    },
    
    validateFitResult: (data: unknown): AIValidationResult<PlantFitResultDto> => {
      const result = PlantFitResultSchema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return {
        success: false,
        error: createAIError('bad_json', 'fit', undefined, result.error.message),
      };
    },
  };
}
```

### 6.5. React Query

**Wykorzystanie istniejących hooks:**
- `usePlantPlacements(planId)` - GET /api/plans/:id/plants
- `usePlantMutations()` - PUT/DELETE /plants/:x/:y (już zaimplementowane)
- `useAIMutations()` - POST /ai/plants/search, /fit (już zaimplementowane)

**Uwagi:**
- Istniejące mutations mają timeout, ale bez sanity-check
- useAIService dodaje warstwę walidacji

## 7. Integracja API

### 7.1. POST /api/ai/plants/search

**Cel:** Wyszukiwanie roślin po nazwie przez AI

**Request:**
```json
{
  "query": "tomato"
}
```

**Response 200:**
```json
{
  "data": {
    "candidates": [
      {
        "name": "tomato",
        "latin_name": "Solanum lycopersicum",
        "source": "ai"
      },
      {
        "name": "cherry tomato",
        "latin_name": "Solanum lycopersicum var. cerasiforme",
        "source": "ai"
      }
    ]
  }
}
```

**Response 429 (rate limit):**
```json
{
  "error": {
    "code": "RateLimited",
    "message": "Too many requests. Please try again later."
  }
}
```
Headers: `Retry-After: 60`

**Response 504 (timeout):**
```json
{
  "error": {
    "code": "UpstreamTimeout",
    "message": "AI service did not respond in time."
  }
}
```

**Frontend handling:**
- Timeout 10s: AbortController + setTimeout
- Bad JSON: Zod validation → AIErrorDialog
- Rate limit: Parse Retry-After → disable button z countdown
- No results: `candidates: []` → message "Nie znaleziono. Spróbuj ponownie."

### 7.2. POST /api/ai/plants/fit

**Cel:** Ocena dopasowania rośliny do lokalizacji

**Request:**
```json
{
  "plan_id": "uuid",
  "x": 3,
  "y": 7,
  "plant_name": "tomato"
}
```

**Response 200:**
```json
{
  "data": {
    "sunlight_score": 4,
    "humidity_score": 3,
    "precip_score": 5,
    "overall_score": 4,
    "explanation": "Tomato requires high sunlight (achieved) and moderate humidity. Your location provides good conditions for growth in months IV-IX."
  }
}
```

**Błędy:** jak search (429, 504)

**Frontend handling:**
- Jak search
- Dodatkowa opcja przy timeout: "Dodaj bez oceny" → PUT z plant_name tylko

### 7.3. PUT /api/plans/:plan_id/plants/:x/:y

**Cel:** Dodanie/aktualizacja rośliny na komórce

**Request:**
```json
{
  "plant_name": "tomato",
  "sunlight_score": 4,
  "humidity_score": 3,
  "precip_score": 5,
  "overall_score": 4
}
```

**Response 200:**
```json
{
  "data": {
    "x": 3,
    "y": 7,
    "plant_name": "tomato",
    "sunlight_score": 4,
    "humidity_score": 3,
    "precip_score": 5,
    "overall_score": 4,
    "created_at": "2025-01-21T12:00:00Z",
    "updated_at": "2025-01-21T12:00:00Z"
  }
}
```

**Response 422 (komórka nie-soil):**
```json
{
  "error": {
    "code": "UnprocessableEntity",
    "message": "Cannot place plant on non-soil cell.",
    "details": {
      "field_errors": {
        "cell_type": "Cell must be of type 'soil'."
      }
    }
  }
}
```

**Frontend handling:**
- Success → trackPlantConfirmed, invalidate queries, toast, zamknij dialog
- 422 → toast "Nie można dodać rośliny na to pole"

### 7.4. DELETE /api/plans/:plan_id/plants/:x/:y

**Cel:** Usunięcie rośliny z komórki

**Request:** brak body

**Response 204:** brak treści

**Frontend handling:**
- Success → invalidate queries, toast "Usunięto roślinę"

## 8. Interakcje użytkownika

### 8.1. Dodawanie rośliny - happy path

**Scenariusz:**
1. User otwiera PlantsTab w SideDrawer
2. Klika pole ziemi (3, 7) w GridCanvas → focusedCell = (3, 7)
3. Klika przycisk "Dodaj roślinę" w PlantsTab
4. Otwiera się AddPlantDialog, domyślnie zakładka "Wyszukaj"
5. User wpisuje "tomato" i klika "Szukaj"
6. Loading spinner 2s
7. Wyświetlają się 2 kandydaci:
   - "tomato (Solanum lycopersicum)"
   - "cherry tomato (Solanum lycopersicum var. cerasiforme)"
8. User klika pierwszy kandydat
9. Loading spinner 3s (checkFit)
10. Wyświetla się PlantFitDisplay:
    - Nasłonecznienie: ★★★★☆ (4)
    - Wilgotność: ★★★☆☆ (3)
    - Opady: ★★★★★ (5)
    - Ogólna ocena: ★★★★☆ (4)
    - Wyjaśnienie: "Tomato requires high sunlight..."
11. User klika "Dodaj roślinę"
12. Loading spinner 1s (PUT /plants/3/7)
13. Success toast "Dodano roślinę 'tomato'"
14. Dialog zamyka się
15. GridCanvas pokazuje ikonę rośliny na (3, 7)
16. PlantsList dodaje nową kartę rośliny
17. Event `plant_confirmed` zapisany w analityce

### 8.2. Dodawanie rośliny - timeout AI search

**Scenariusz:**
1-5. jak happy path
6. Loading spinner 10s → timeout
7. AIErrorDialog otwiera się:
   - Tytuł: "AI nie odpowiedziało"
   - Message: "Wyszukiwanie rośliny przekroczyło limit czasu (10s)."
   - Akcje:
     - "Ponów wyszukiwanie"
     - "Dodaj ręcznie"
     - "Anuluj"
8. User klika "Ponów wyszukiwanie"
9. Powrót do kroku 5, ponowne wywołanie search

**Alternatywa:**
8. User klika "Dodaj ręcznie"
9. Przejście do zakładki "Ręcznie"
10. User wpisuje "tomato" i klika "Dodaj roślinę"
11. PUT /plants/3/7 z plant_name tylko (bez scores)
12. Success jak w happy path

### 8.3. Dodawanie rośliny - timeout AI fit

**Scenariusz:**
1-8. jak happy path
9. Loading spinner 10s → timeout
10. AIErrorDialog:
    - Message: "Ocena dopasowania przekroczyła limit czasu."
    - Akcje:
      - "Ponów ocenę"
      - "Dodaj bez oceny"
      - "Anuluj"
11. User klika "Dodaj bez oceny"
12. PUT /plants/3/7 z plant_name="tomato" (bez scores)
13. Success jak w happy path

### 8.4. Dodawanie rośliny - bad JSON

**Scenariusz:**
1-6. jak happy path
7. Response z AI nie pasuje do schematu (np. brak pola `candidates`)
8. AIErrorDialog:
   - Message: "Otrzymano niepoprawną odpowiedź od AI."
   - Details: "Schema validation failed: ..."
   - Akcje: "Ponów", "Dodaj ręcznie", "Anuluj"
9. User klika "Ponów" → powrót do kroku 5

### 8.5. Dodawanie rośliny - brak wyników

**Scenariusz:**
1-6. jak happy path
7. Response: `{ candidates: [] }`
8. NoResultsMessage: "Nie znaleziono rośliny. Spróbuj ponownie lub dodaj ręcznie."
9. User może:
   - Zmienić query i ponownie wyszukać
   - Przełączyć się na zakładkę "Ręcznie"

### 8.6. Dodawanie rośliny - pole nie-soil

**Scenariusz:**
1. User klika pole typu 'path' (ścieżka)
2. Klika "Dodaj roślinę"
3. CellNotSoilDialog otwiera się:
   - Message: "Rośliny można dodawać tylko na pola typu 'ziemia'."
   - Info: "Zaznaczone pole to: ścieżka"
   - Przycisk: "OK"
4. User klika "OK" → dialog zamyka się

**Alternatywa (prewencja):**
1. User klika pole typu 'path'
2. Przycisk "Dodaj roślinę" jest disabled
3. Tooltip: "Wybierz pole typu 'ziemia' aby dodać roślinę"

### 8.7. Usuwanie rośliny

**Scenariusz:**
1. User widzi listę roślin w PlantsTab
2. Znajduje kartę rośliny "tomato" na pozycji (3, 7)
3. Klika przycisk "Usuń" (ikona Trash)
4. DeletePlantConfirmDialog:
   - Message: "Czy na pewno chcesz usunąć roślinę 'tomato'?"
   - Info: "Pole (x: 3, y: 7)"
   - Akcje: "Anuluj", "Usuń"
5. User klika "Usuń"
6. Loading spinner 1s (DELETE /plants/3/7)
7. Success toast "Usunięto roślinę 'tomato'"
8. Dialog zamyka się
9. PlantsList usuwa kartę rośliny
10. GridCanvas usuwa ikonę z (3, 7)

### 8.8. Przejście do rośliny na siatce

**Scenariusz:**
1. User widzi listę roślin w PlantsTab
2. Klika przycisk "Przejdź" (ikona ArrowRight) na karcie rośliny "tomato" (3, 7)
3. GridCanvas fokusuje komórkę (3, 7) (focus ring)
4. Jeśli komórka poza viewport → scroll do komórki
5. Drawer może zostać zwinięty (opcjonalnie) dla lepszej widoczności

## 9. Warunki i walidacja

### 9.1. Walidacja typu komórki dla dodawania

**Warunek:** `cellType === 'soil'`

**Komponenty:** PlantsTab, AddPlantDialog

**Wpływ na UI:**
- Przycisk "Dodaj roślinę" w PlantsTab:
  - Disabled jeśli `cellType !== 'soil'`
  - Tooltip: "Wybierz pole typu 'ziemia'"
- Próba otwarcia dialogu z nie-soil → CellNotSoilDialog

**Backend:** PUT /plants/:x/:y zwraca 422 jeśli cell.type !== 'soil'

### 9.2. Walidacja jednej rośliny na pole

**Warunek:** Pole może mieć maksymalnie jedną roślinę

**Komponenty:** PlantsTab

**Wpływ na UI:**
- Przycisk "Dodaj roślinę" disabled jeśli komórka ma już roślinę
- Tooltip: "Pole już zajęte przez roślinę '{name}'"

**Backend:** PUT /plants/:x/:y to upsert → nadpisuje istniejącą roślinę

### 9.3. Walidacja query wyszukiwania

**Warunek:** `query.length > 0`

**Komponenty:** PlantSearchForm

**Wpływ na UI:**
- Przycisk "Szukaj" disabled jeśli input pusty

### 9.4. Walidacja nazwy ręcznej

**Warunek:** `manualName.length > 0`

**Komponenty:** AddPlantDialog (ManualTab)

**Wpływ na UI:**
- Przycisk "Dodaj roślinę" disabled jeśli input pusty

### 9.5. Walidacja scores z AI

**Warunek:** Każdy score musi być 1-5 (integer)

**Komponenty:** useAIValidation (Zod schema)

**Wpływ na UI:**
- Jeśli scores poza zakresem → AIError 'bad_json'
- AIErrorDialog z opcją retry

### 9.6. Timeout AI

**Warunek:** Zapytanie AI musi zakończyć się w ciągu 10s

**Komponenty:** useAIService (AbortController + setTimeout)

**Wpływ na UI:**
- Po 10s → AbortError
- AIErrorDialog z opcją retry lub skip

### 9.7. Rate limiting

**Warunek:** Max 10 zapytań AI/min/user

**Komponenty:** useAIService (obsługa 429)

**Wpływ na UI:**
- Błąd 429 → parse Retry-After header
- Przycisk "Szukaj" disabled na X sekund
- Toast: "Zbyt wiele zapytań. Spróbuj za Xs"
- Countdown w przycisku

## 10. Obsługa błędów

### 10.1. Timeout AI (504 lub AbortError)

**Scenariusz:** AI nie odpowiada w 10s

**Obsługa:**
- useAIService catch AbortError → throw AIError { type: 'timeout' }
- useAddPlantFlow catch → set state.error
- Otwarcie AIErrorDialog
- Akcje:
  - **Search timeout:** Retry / Add manually / Cancel
  - **Fit timeout:** Retry / Add without scores / Cancel

**UI:**
- Dialog z wyraźnym komunikatem
- Ikona zegara (Clock icon)
- Highlight przycisku "Ponów"

### 10.2. Bad JSON (niepoprawna struktura odpowiedzi)

**Scenariusz:** Odpowiedź AI nie pasuje do schematu

**Obsługa:**
- useAIValidation → Zod safeParse fail
- Return AIError { type: 'bad_json', details: zodError.message }
- useAddPlantFlow catch → set state.error
- AIErrorDialog

**UI:**
- Message: "Otrzymano niepoprawną odpowiedź od AI"
- Details (collapsed): Zod error message (dla developera)
- Akcje: Retry / Add manually / Cancel

**Logging:**
- Console.error w development
- Sentry/monitoring w production (TODO)

### 10.3. Rate limit (429)

**Scenariusz:** Przekroczono limit zapytań AI

**Obsługa:**
- useAIService catch 429
- Parse `Retry-After` header (seconds)
- Throw AIError { type: 'rate_limit', retryAfter: 60 }
- useAddPlantFlow → set state.error
- Toast notification (zamiast modal)
- Disable przycisk "Szukaj" na retryAfter sekund

**UI:**
- Toast: "Zbyt wiele zapytań. Spróbuj ponownie za 60s"
- Przycisk "Szukaj" disabled z countdown: "Szukaj (59s)"
- Po upływie czasu → przycisk enabled

### 10.4. Network error

**Scenariusz:** Brak połączenia z internetem

**Obsługa:**
- useAIService catch TypeError (fetch failure)
- Throw AIError { type: 'network' }
- Toast: "Brak połączenia z internetem"
- Przycisk retry

**UI:**
- Toast z ikoną WifiOff
- Akcja retry w toast
- React Query retry automatyczny (exponential backoff)

### 10.5. Komórka nie-soil (422)

**Scenariusz:** Próba dodania rośliny na pole != 'soil'

**Obsługa:**
- PUT /plants/:x/:y → 422
- Toast: "Nie można dodać rośliny na to pole"
- Dialog zamyka się (operacja anulowana)

**Prewencja:**
- Walidacja cellType przed otwarciem dialogu
- CellNotSoilDialog jako early warning

### 10.6. Nieoczekiwany błąd (500)

**Scenariusz:** Błąd serwera

**Obsługa:**
- Catch w mutation
- Toast: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie"
- Akcja retry w toast
- Logging do konsoli/sentry

**UI:**
- Error boundary (top-level, już istniejący)
- Toast z opcją retry
- Dialog pozostaje otwarty (nie tracić danych)

## 11. Moduł komunikacji z AI

### 11.1. Struktura modułu

Moduł AI składa się z:

1. **Service Layer** (`src/lib/services/ai.service.ts`)
   - Encapsulacja logiki komunikacji z AI
   - Timeout handling
   - Error transformation

2. **Validation Layer** (`src/lib/validation/ai.validation.ts`)
   - Zod schemas dla request/response
   - Sanity-check odpowiedzi

3. **Hook Layer** (`src/lib/hooks/useAIService.ts`)
   - React hook wrapper
   - Integration z React Query
   - State management dla błędów

4. **Config** (`src/lib/integrations/ai.config.ts`)
   - Konfiguracja endpointów
   - Timeout values
   - Retry policies

### 11.2. AIService (Service Layer)

```typescript
// src/lib/services/ai.service.ts

export interface AIServiceConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  headers?: Record<string, string>;
}

export class AIService {
  constructor(private config: AIServiceConfig) {}

  async search(query: string): Promise<PlantSearchResultDto> {
    return this.request<PlantSearchResultDto>(
      'POST',
      '/api/ai/plants/search',
      { query }
    );
  }

  async checkFit(command: PlantFitCommand): Promise<PlantFitResultDto> {
    return this.request<PlantFitResultDto>(
      'POST',
      '/api/ai/plants/fit',
      command
    );
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    // Implementacja z timeout i error handling
    // Placeholder na ten moment
    throw new Error('Not implemented');
  }
}
```

### 11.3. AI Validation (Validation Layer)

```typescript
// src/lib/validation/ai.validation.ts

import { z } from 'zod';

export const PlantSearchCandidateSchema = z.object({
  name: z.string().min(1),
  latin_name: z.string().optional(),
  source: z.literal('ai'),
});

export const PlantSearchResultSchema = z.object({
  data: z.object({
    candidates: z.array(PlantSearchCandidateSchema),
  }),
});

export const PlantFitResultSchema = z.object({
  data: z.object({
    sunlight_score: z.number().int().min(1).max(5),
    humidity_score: z.number().int().min(1).max(5),
    precip_score: z.number().int().min(1).max(5),
    overall_score: z.number().int().min(1).max(5),
    explanation: z.string().optional(),
  }),
});

export function validateSearchResult(data: unknown) {
  return PlantSearchResultSchema.safeParse(data);
}

export function validateFitResult(data: unknown) {
  return PlantFitResultSchema.safeParse(data);
}
```

### 11.4. AI Config

```typescript
// src/lib/integrations/ai.config.ts

export const AI_CONFIG = {
  baseUrl: import.meta.env.PUBLIC_API_URL || '',
  endpoints: {
    search: '/api/ai/plants/search',
    fit: '/api/ai/plants/fit',
  },
  timeout: 10000, // 10s zgodnie z PRD
  maxRetries: 1,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

export type AIConfig = typeof AI_CONFIG;
```

### 11.5. Uwagi dotyczące modułu

**Na ten moment:**
- Moduł zawiera strukturę i konfigurację
- Placeholder implementacja
- Schemas Zod dla walidacji
- Typy TypeScript

**TODO (poza zakresem tego planu):**
- Faktyczna implementacja fetch z timeout
- Integracja z konkretnym dostawcą AI (OpenAI, Claude, etc.)
- Prompt engineering dla search i fit
- Caching odpowiedzi AI (opcjonalnie)
- Monitoring i logging

## 12. Kroki implementacji

### Faza 1: Setup modułu AI i typów (kroki 1-5)

1. **Utworzyć strukturę folderów dla modułu AI**
   - `src/lib/services/ai.service.ts`
   - `src/lib/validation/ai.validation.ts`
   - `src/lib/integrations/ai.config.ts`

2. **Dodać nowe typy do `src/types.ts`**
   - `AddPlantDialogState`
   - `AIError`
   - `AIServiceConfig`
   - `AIValidationResult<T>`
   - `ScoreThresholds`
   - `SeasonWeights`
   - `PlantCardViewModel`

3. **Utworzyć Zod schemas w `ai.validation.ts`**
   - `PlantSearchCandidateSchema`
   - `PlantSearchResultSchema`
   - `PlantFitResultSchema`
   - Funkcje: `validateSearchResult`, `validateFitResult`

4. **Utworzyć konfigurację w `ai.config.ts`**
   - `AI_CONFIG` z endpointami, timeout, retry
   - Export typu `AIConfig`

5. **Utworzyć placeholder AIService w `ai.service.ts`**
   - Class `AIService` z metodami `search`, `checkFit`
   - Metoda `request` z placeholder implementation
   - JSDoc comments z TODO dla przyszłej implementacji

### Faza 2: Custom hooks dla AI (kroki 6-9)

6. **Utworzyć `src/lib/hooks/useAIService.ts`**
   - Hook wrapper dla AIService
   - Implementacja timeout z AbortController
   - Obsługa błędów (timeout, bad_json, rate_limit, network)
   - Funkcje: `searchPlants`, `checkPlantFit`

7. **Utworzyć `src/lib/hooks/useAIValidation.ts`**
   - Hook z funkcjami walidacji
   - Wrapper dla Zod schemas
   - Return `AIValidationResult<T>`

8. **Utworzyć `src/lib/hooks/useAddPlantFlow.ts`**
   - Zarządzanie stanem `AddPlantDialogState`
   - Actions: search, select, retry, skip, confirm, cancel
   - Integration z `useAIService`, `usePlantMutations`, `useAnalyticsEvents`
   - Error handling i state transitions

9. **Rozszerzyć `src/lib/hooks/useAnalyticsEvents.ts`** (jeśli nie istnieje)
   - Funkcja `trackPlantConfirmed(x, y, plantName)`
   - POST `/api/analytics/events` z `event_type: 'plant_confirmed'`

### Faza 3: Komponenty listy roślin (kroki 10-14)

10. **Utworzyć `src/components/editor/SideDrawer/PlantsTab.tsx`**
    - Layout: header + lista + empty state
    - State: `isAddDialogOpen`, `isDeleteDialogOpen`, `plantToDelete`
    - Integration z `usePlantPlacements` query
    - Przycisk "Dodaj roślinę" z walidacją cellType

11. **Utworzyć `src/components/editor/SideDrawer/PlantsList.tsx`**
    - ScrollArea z listą PlantCard
    - Sortowanie po created_at desc
    - Empty state component

12. **Utworzyć `src/components/editor/SideDrawer/PlantCard.tsx`**
    - Card layout z nazwą, pozycją, scores
    - PlantInfo section
    - ScoreCard row (4 karty)
    - Action buttons: JumpTo, Delete
    - Hover effects, tooltips

13. **Utworzyć `src/components/editor/SideDrawer/ScoreCard.tsx`**
    - Mini card z label i gwiazdkami
    - Props: label, score, icon, description
    - Stars rendering (1-5)
    - Tooltip z opisem

14. **Utworzyć `src/components/editor/SideDrawer/EmptyState.tsx`**
    - Illustration (opcjonalnie)
    - Message: "Brak roślin w planie"
    - Podpowiedź: "Kliknij pole ziemi i wybierz 'Dodaj roślinę'"

### Faza 4: Dialog dodawania - struktura (kroki 15-18)

15. **Utworzyć `src/components/editor/modals/AddPlantDialog.tsx`**
    - Dialog z shadcn/ui
    - DialogHeader z CellInfoBadge
    - Tabs: SearchTab, ManualTab
    - Conditional PlantFitDisplay
    - DialogFooter z akcjami
    - Integration z `useAddPlantFlow`

16. **Utworzyć `src/components/editor/modals/CellInfoBadge.tsx`**
    - Badge z info o komórce: "x: 3, y: 7, typ: ziemia"
    - Color-coded według typu
    - Ikona typu komórki

17. **Utworzyć `src/components/editor/modals/SearchTab.tsx`**
    - Container dla PlantSearchForm + Results
    - Conditional rendering: form / loading / results / error

18. **Utworzyć `src/components/editor/modals/ManualTab.tsx`**
    - Input dla ręcznej nazwy
    - InfoTooltip: "Wpisz dokładną nazwę rośliny"
    - Walidacja inline (required)

### Faza 5: Dialog dodawania - wyszukiwanie (kroki 19-23)

19. **Utworzyć `src/components/editor/modals/PlantSearchForm.tsx`**
    - Form z Input + SearchButton
    - Loading state (spinner w przycisku)
    - Disabled state dla pustego query
    - onSubmit → useAddPlantFlow.searchPlants

20. **Utworzyć `src/components/editor/modals/PlantSearchResults.tsx`**
    - Lista CandidateItem
    - NoResultsMessage (jeśli pusta lista)
    - Loading skeleton podczas wyszukiwania

21. **Utworzyć `src/components/editor/modals/CandidateItem.tsx`**
    - Card z nazwą i nazwą łacińską
    - SelectButton
    - Hover effect
    - onClick → useAddPlantFlow.selectCandidate

22. **Utworzyć `src/components/editor/modals/NoResultsMessage.tsx`**
    - Message: "Nie znaleziono rośliny"
    - Suggestion: "Spróbuj ponownie lub dodaj ręcznie"
    - Ikona SearchX

23. **Utworzyć `src/components/editor/modals/SearchLoadingState.tsx`**
    - Skeleton loaders dla 3 kandydatów
    - Spinner z tekstem "Wyszukuję..."

### Faza 6: Dialog dodawania - ocena dopasowania (kroki 24-27)

24. **Utworzyć `src/components/editor/modals/PlantFitDisplay.tsx`**
    - Container dla scores i explanation
    - Grid 2x2 dla 4 ScoreCard
    - ExplanationText section
    - SeasonInfoTooltip
    - FitLoadingState (conditional)

25. **Utworzyć `src/components/editor/modals/FitLoadingState.tsx`**
    - Skeleton dla score cards
    - Spinner z tekstem "Sprawdzam dopasowanie..."

26. **Utworzyć `src/components/editor/modals/ExplanationText.tsx`**
    - Collapsible text area
    - Props: explanation (string)
    - Ikona Info

27. **Utworzyć `src/components/editor/modals/SeasonInfoTooltip.tsx`**
    - Tooltip z info o wagach sezonów
    - Content: "Miesiące IV-IX (wzrost) mają wagę 2, pozostałe 1"
    - Ikona HelpCircle
    - Trigger: mały przycisk z ?

### Faza 7: Modals błędów (kroki 28-31)

28. **Utworzyć `src/components/editor/modals/AIErrorDialog.tsx`**
    - AlertDialog z shadcn/ui
    - Props: error (AIError), context ('search' | 'fit')
    - Conditional actions w zależności od error.type i context
    - Error icon (zależnie od typu)
    - Details collapsible (dla bad_json)

29. **Utworzyć `src/components/editor/modals/CellNotSoilDialog.tsx`**
    - AlertDialog
    - Warning icon
    - Message: "Rośliny można dodawać tylko na pola typu 'ziemia'"
    - Info o aktualnym typie komórki
    - OkButton

30. **Utworzyć `src/components/editor/modals/DeletePlantConfirmDialog.tsx`**
    - AlertDialog
    - Props: plant (PlantPlacementDto)
    - ConfirmMessage z nazwą rośliny
    - Position info
    - Actions: Cancel, ConfirmDelete (destructive style)

31. **Rozszerzyć `src/components/ui/alert-dialog.tsx`** (jeśli potrzebne)
    - Sprawdzić czy istniejący komponent wspiera wszystkie warianty
    - Dodać style dla destructive action

### Faza 8: Integracja z GridCanvas (kroki 32-34)

32. **Rozszerzyć `src/components/editor/GridCanvas/GridCanvas.tsx`**
    - Dodać renderowanie ikon roślin na komórkach z plants
    - Komórka z rośliną: overlay z ikoną Leaf + tooltip z nazwą
    - Hover effect dla komórek z roślinami

33. **Utworzyć `src/components/editor/GridCanvas/PlantIcon.tsx`**
    - SVG icon lub ikona Lucide (Leaf)
    - Pozycja: center komórki
    - Color: zielony (#22c55e)
    - Size: responsive do rozmiaru komórki

34. **Rozszerzyć `src/lib/hooks/useGridEditor.ts`**
    - Dodać derived value: `cellHasPlant(x, y)` → boolean
    - Dodać action: `jumpToCell(x, y)` → focus + scroll

### Faza 9: Integration testing i poprawki (kroki 35-40)

35. **Dodać ToastProvider dla komunikatów**
    - Sprawdzić czy `src/components/editor/ToastProvider.tsx` istnieje
    - Jeśli nie, utworzyć wrapper dla Sonner (już zainstalowane)

36. **Dodać React Query invalidation po mutacjach**
    - useAddPlantFlow: invalidate ['plants', planId], ['cells', planId]
    - useDeletePlant: invalidate j.w.

37. **Dodać loading states w PlantsTab**
    - Skeleton loaders dla PlantsList podczas initial load
    - Infinite scroll (opcjonalnie, jeśli >50 roślin)

38. **Dodać error boundaries**
    - Sprawdzić top-level boundary w EditorLayout
    - Dodać lokalny boundary w AddPlantDialog (opcjonalnie)

39. **Accessibility audit**
    - ARIA labels dla wszystkich interaktywnych elementów
    - Focus trap w modals (AlertDialog ma to domyślnie)
    - Keyboard navigation (Tab, Enter, Escape)
    - Screen reader testing (optionally)

40. **Manual testing według scenariuszy**
    - Happy path dodawania rośliny
    - Timeout search, timeout fit
    - Bad JSON response
    - Rate limit (trigger 10 searches)
    - Komórka nie-soil
    - Usuwanie rośliny
    - Jump to cell

### Faza 10: Polish i dokumentacja (kroki 41-44)

41. **Dodać animacje transitions**
    - Dialog enter/exit animations (już z shadcn)
    - Toast slide-in animations
    - PlantCard hover effects
    - Score cards pulse na update

42. **Optymalizacja performance**
    - React.memo dla PlantCard
    - useMemo dla filtered/sorted plants
    - Virtualizacja PlantsList jeśli >100 roślin (opcjonalnie)

43. **Dodać tooltips pomocnicze**
    - Scores: wyjaśnienie co oznacza każda ocena
    - Buttons: shortcuts klawiaturowe (jeśli applicable)
    - EmptyState: tips jak zacząć

44. **Utworzyć dokumentację w `.ai/implementations/`**
    - Status implementacji
    - Known issues
    - TODO items
    - Testing checklist

### Faza 11: Przygotowanie do integracji AI (kroki 45-47)

45. **Dokumentacja AIService placeholder**
    - JSDoc comments z opisem oczekiwanej implementacji
    - Przykłady request/response
    - Punkty integracji z dostawcą AI

46. **Utworzyć mock data dla developmentu**
    - Mock responses dla search (kilka przykładów roślin)
    - Mock responses dla fit (różne score combinations)
    - Toggle w config: `USE_MOCK_AI = true`

47. **Environment variables setup**
    - `.env.example` z AI_API_KEY (placeholder)
    - Dokumentacja konfiguracji w README

---

## 13. Podsumowanie

### Zakres implementacji

Plan obejmuje kompletną implementację funkcjonalności zarządzania roślinami:
- ✅ Dodawanie roślin z wyszukiwaniem AI
- ✅ Ocena dopasowania rośliny (scoring 1-5)
- ✅ Walidacja typu komórki (tylko 'soil')
- ✅ Obsługa timeout'ów (10s)
- ✅ Sanity-check JSON z AI
- ✅ Rate limiting handling
- ✅ Usuwanie roślin
- ✅ Lista roślin w planie
- ✅ Event tracking (plant_confirmed)

### Moduł AI

Na ten moment:
- Struktura folderów i plików
- Typy i interfejsy
- Zod schemas dla walidacji
- Konfiguracja (endpoints, timeout)
- Placeholder implementation

TODO (poza zakresem):
- Faktyczna integracja z AI provider
- Prompt engineering
- Caching strategia

### Szacowany czas implementacji

- Faza 1-2 (Setup + hooks): 1-2 dni
- Faza 3-4 (Lista + dialog struktura): 2-3 dni
- Faza 5-7 (Wyszukiwanie + fit + modals): 3-4 dni
- Faza 8-9 (Integracja + testing): 2-3 dni
- Faza 10-11 (Polish + AI prep): 1-2 dni

**Łącznie:** ~9-14 dni (1 developer)

### Zależności

- ✅ EditorLayout (już zaimplementowane)
- ✅ GridCanvas (już zaimplementowane)
- ✅ usePlantMutations (już zaimplementowane)
- ✅ useAIMutations (już zaimplementowane, wymaga rozszerzenia)
- ✅ SideDrawer (już zaimplementowane)
- ✅ Shadcn/ui components (już zainstalowane)

### Риски

1. **AI provider integration** - wymaga późniejszej konfiguracji
2. **Timeout handling** - może wymagać dostrojenia dla różnych dostawców
3. **Rate limiting** - zależy od limitów API dostawcy
4. **Performance** - dla dużej liczby roślin (>100) może wymagać virtualizacji

### Następne kroki

Po ukończeniu implementacji:
1. Integracja z rzeczywistym AI provider
2. Testy end-to-end z prawdziwymi danymi
3. Performance optimization dla dużych planów
4. Dodatkowe features (poza MVP): drag&drop roślin, copy/paste, bulk operations

