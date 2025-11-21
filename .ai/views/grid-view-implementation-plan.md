# Plan implementacji widoku Edytora planu - Siatka

## 1. Przegląd

Widok Edytora planu - Siatka jest głównym interfejsem umożliwiającym użytkownikom edycję planu działki. Obejmuje interaktywną siatkę reprezentującą działkę, narzędzia do typowania obszarów (ziemia, ścieżka, woda, zabudowa), dodawanie i zarządzanie roślinami z wykorzystaniem AI, podgląd danych pogodowych oraz edycję parametrów planu.

Widok wykorzystuje pełnoekranowy layout z centralną siatką, bocznym drawerem zawierającym trzy zakładki (Parametry, Rośliny, Pogoda), kontekstowym toolbarem oraz dolnym panelem statusu. Kluczowe wymagania: obsługa klawiatury, ARIA, automatyczna analityka, ostrzeżenia przed operacjami destrukcyjnymi.

## 2. Routing widoku

**Ścieżka:** `/plans/:id`

**Typ routingu:** Strona dynamiczna Astro z SSR

**Middleware:** Wymaga uwierzytelnienia (redirect do `/auth/login` jeśli brak sesji)

**Pobieranie danych na serwerze:**
- GET `/api/plans/:id` - szczegóły planu
- GET `/api/plans/:id/grid` - metadane siatki
- GET `/api/plans/:id/grid/cells` - początkowa partia komórek (bbox pokrywająca viewport)

## 3. Struktura komponentów

```
PlanEditorPage (Astro)
├── EditorLayout (React)
│   ├── EditorTopbar
│   │   ├── PlanNameDisplay
│   │   ├── EditorToolbar
│   │   │   ├── ToolSelector (zaznacz, dodaj roślinę, zmień typ)
│   │   │   ├── GridSaveButton
│   │   │   └── UndoWarningTooltip
│   │   └── EditorStatusIndicators (AI, pogoda, sesja)
│   │
│   ├── GridCanvas (centralna część)
│   │   ├── GridRenderer (canvas)
│   │   ├── SelectionOverlay (zaznaczenie obszaru)
│   │   ├── CellFocusRing (aktywna komórka)
│   │   └── CellTooltip (info o komórce po hover)
│   │
│   ├── SideDrawer (prawy panel)
│   │   ├── DrawerTabs (Parametry, Rośliny, Pogoda)
│   │   ├── ParametersTab
│   │   │   ├── PlanParametersForm
│   │   │   └── RegenerationConfirmDialog
│   │   ├── PlantsTab
│   │   │   ├── PlantsList
│   │   │   ├── PlantSearchForm
│   │   │   ├── PlantFitDisplay
│   │   │   └── AddPlantDialog
│   │   └── WeatherTab
│   │       ├── WeatherMonthlyChart
│   │       ├── WeatherMetricsTable
│   │       └── WeatherRefreshButton
│   │
│   ├── BottomPanel
│   │   ├── OperationLog (aria-live)
│   │   └── StatusBar
│   │
│   └── Modals
│       ├── AreaTypeConfirmDialog (409 - usuwa rośliny)
│       ├── GridRegenerationConfirmDialog (409 - regeneracja siatki)
│       ├── AITimeoutErrorDialog
│       └── CellNotSoilWarningDialog
```

## 4. Szczegóły komponentów

### 4.1. PlanEditorPage (Astro)

**Opis:** Główna strona Astro obsługująca SSR. Pobiera wstępne dane planu i siatki, weryfikuje uprawnienia, przekazuje dane do komponentu React EditorLayout.

**Elementy:**
- Layout z `<EditorLayout>` jako client:load
- Przekazanie wstępnych danych przez props
- Obsługa błędów 404, 403

**Obsługiwane zdarzenia:** brak (statyczna strona Astro)

**Walidacja:** Sprawdzenie UUID plan_id, weryfikacja sesji użytkownika

**Typy:**
- `PlanDto` - szczegóły planu
- `GridMetadataDto` - metadane siatki
- `GridCellDto[]` - początkowa lista komórek

**Propsy:** brak (to strona główna)

### 4.2. EditorLayout (React)

**Opis:** Główny komponent React zarządzający stanem edytora. Kontener dla wszystkich podkomponentów, zarządzanie React Query, customowy hook `useGridEditor`.

**Elementy:**
- `<div className="flex h-screen flex-col">`
- EditorTopbar, GridCanvas, SideDrawer, BottomPanel, Modals

**Obsługiwane zdarzenia:**
- Inicjalizacja stanu edytora
- Synchronizacja z React Query
- Obsługa skrótów klawiaturowych (Escape, Delete, Arrow keys)
- Window resize dla responsive grid

**Walidacja:** brak bezpośredniej (delegowana do child components)

**Typy:**
- `EditorState` (ViewModel) - lokalny stan edytora
- `PlanDto`, `GridMetadataDto`, `GridCellDto[]`

**Propsy:**
```typescript
interface EditorLayoutProps {
  initialPlan: PlanDto;
  initialGridMetadata: GridMetadataDto;
  initialCells: GridCellDto[];
}
```

### 4.3. EditorTopbar

**Opis:** Górny pasek edytora zawierający nazwę planu, toolbar z narzędziami oraz wskaźniki statusu.

**Elementy:**
- `<header className="border-b bg-background px-4 py-2">`
- PlanNameDisplay (h1 z nazwą planu)
- EditorToolbar (środek)
- EditorStatusIndicators (prawo)

**Obsługiwane zdarzenia:** brak (kontener dla innych komponentów)

**Walidacja:** brak

**Typy:** `PlanDto` (nazwa planu)

**Propsy:**
```typescript
interface EditorTopbarProps {
  plan: PlanDto;
  onSave: () => Promise<void>;
  isSaving: boolean;
}
```

### 4.4. EditorToolbar

**Opis:** Toolbar z narzędziami edycji: wybór trybu (zaznacz obszar, dodaj roślinę, zmień typ), przycisk zapisu siatki, tooltip o braku cofania.

**Elementy:**
- ButtonGroup z ToggleButton dla każdego narzędzia
- SaveButton (z ikoną Save, disabled podczas zapisywania)
- Tooltip "Brak możliwości cofnięcia - potwierdź operacje przed zapisem"

**Obsługiwane zdarzenia:**
- `onToolChange(tool: EditorTool)` - zmiana narzędzia
- `onSave()` - zapis siatki (wywołanie PUT/POST + event analytics `grid_saved`)

**Walidacja:** brak (tylko UI state)

**Typy:**
- `EditorTool = 'select' | 'add_plant' | 'change_type'`

**Propsy:**
```typescript
interface EditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}
```

### 4.5. GridCanvas

**Opis:** Komponent renderujący interaktywną siatkę planu. Wykorzystuje Canvas dla wydajności. Obsługuje zaznaczanie obszarów, focus management, hover tooltips.

**Elementy:**
- Container `<div className="relative flex-1 overflow-auto">` (scroll dla dużych siatek)
- Grid layout `<div className="grid">` z dynamicznymi kolumnami/wierszami
- Komórki `<GridCell>` dla każdej pozycji (x, y)
- `<SelectionOverlay>` - wizualizacja zaznaczonego prostokąta
- `<CellFocusRing>` - podświetlenie aktywnej komórki (focus)

**Obsługiwane zdarzenia:**
- `onCellClick(x, y)` - kliknięcie komórki (rozpoczęcie zaznaczania lub akcja w zależności od narzędzia)
- `onCellMouseDown(x, y)` + `onCellMouseEnter(x, y)` + `onCellMouseUp()` - zaznaczanie obszaru drag
- `onCellHover(x, y)` - wyświetlenie tooltipa
- `onKeyDown(event)` - nawigacja strzałkami, Enter (potwierdź zaznaczenie), Escape (anuluj)

**Walidacja:**
- Współrzędne x, y muszą być w granicach [0, grid_width), [0, grid_height)
- Zaznaczony obszar: x1 <= x2, y1 <= y2

**Typy:**
- `GridMetadataDto` - wymiary siatki
- `GridCellDto[]` - dane komórek
- `CellPosition = { x: number; y: number }`
- `CellSelection = { x1: number; y1: number; x2: number; y2: number } | null`

**Propsy:**
```typescript
interface GridCanvasProps {
  gridMetadata: GridMetadataDto;
  cells: GridCellDto[];
  currentTool: EditorTool;
  selectedArea: CellSelection;
  focusedCell: CellPosition | null;
  onCellClick: (x: number, y: number) => void;
  onSelectionChange: (selection: CellSelection | null) => void;
  onFocusChange: (cell: CellPosition | null) => void;
}
```

### 4.6. GridCell (komponent wewnętrzny GridCanvas)

**Opis:** Pojedyncza komórka siatki. Renderuje wizualną reprezentację typu pola oraz ewentualnej rośliny.

**Elementy:**
- `<div className="grid-cell" data-type={type} data-x={x} data-y={y}>`
- Ikona lub kolor tła w zależności od typu (soil=zielony, water=niebieski, path=szary, building=czerwony)
- Ikona rośliny jeśli komórka zawiera roślinę

**Obsługiwane zdarzenia:**
- onClick, onMouseDown, onMouseEnter (przekazywane z GridCanvas)

**Walidacja:** brak

**Typy:** `GridCellDto`, `PlantPlacementDto | null`

**Propsy:**
```typescript
interface GridCellProps {
  x: number;
  y: number;
  type: GridCellType;
  plant?: PlantPlacementDto;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseDown: () => void;
  onMouseEnter: () => void;
}
```

### 4.7. SideDrawer

**Opis:** Prawy panel z zakładkami. Zarządza stanem aktywnej zakładki i renderuje odpowiedni content.

**Elementy:**
- `<aside className="w-96 border-l bg-background">`
- `<Tabs>` z trzema TabsTrigger: "Parametry", "Rośliny", "Pogoda"
- `<TabsContent>` dla każdej zakładki

**Obsługiwane zdarzenia:**
- `onTabChange(tab: 'parameters' | 'plants' | 'weather')` - zmiana aktywnej zakładki

**Walidacja:** brak

**Typy:** `DrawerTab = 'parameters' | 'plants' | 'weather'`

**Propsy:**
```typescript
interface SideDrawerProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  plan: PlanDto;
  gridMetadata: GridMetadataDto;
}
```

### 4.8. ParametersTab

**Opis:** Zakładka z formularzem parametrów planu (nazwa, orientacja, półkula, jednostka kratki). Obsługuje PATCH `/api/plans/:id` z `confirm_regenerate`.

**Elementy:**
- Formularz z polami: name (Input), orientation (Slider 0-359 + mini compass), hemisphere (Select), cell_size_cm (RadioGroup 10/25/50/100)
- Przycisk "Zapisz zmiany"
- Alert jeśli zmiana wymaga regeneracji siatki

**Obsługiwane zdarzenia:**
- `onSubmit(data: PlanUpdateCommand)` - zapis zmian
- Obsługa 409 Conflict (wymaga potwierdzenia) → otwarcie `RegenerationConfirmDialog`

**Walidacja:**
- Nazwa: niepusta
- Orientacja: 0-359
- Jednostka kratki: {10, 25, 50, 100}
- Wymiary: width_cm % cell_size_cm === 0, height_cm % cell_size_cm === 0
- Grid_width, grid_height <= 200

**Typy:**
- `PlanDto` - aktualne dane
- `PlanUpdateCommand` - dane do wysłania

**Propsy:**
```typescript
interface ParametersTabProps {
  plan: PlanDto;
  onUpdate: (command: PlanUpdateCommand, confirmRegenerate: boolean) => Promise<void>;
}
```

### 4.9. PlantsTab

**Opis:** Zakładka zarządzania roślinami. Lista roślin w planie, wyszukiwarka (AI), formularz dodawania/edycji rośliny, wyświetlanie oceny dopasowania.

**Elementy:**
- PlantsList - lista roślin (GET `/api/plans/:id/plants`)
- PlantSearchForm - input + przycisk "Szukaj" (POST `/api/ai/plants/search`)
- PlantFitDisplay - wyniki oceny AI (sunlight_score, humidity_score, precip_score, overall_score, explanation)
- AddPlantDialog - modal do dodania rośliny na zaznaczoną komórkę

**Obsługiwane zdarzenia:**
- `onSearchPlant(query: string)` - wyszukiwanie rośliny
- `onSelectPlantCandidate(candidate: PlantSearchCandidateDto)` - wybór rośliny z wyników AI
- `onCheckFit(plant_name, x, y)` - sprawdzenie dopasowania (POST `/api/ai/plants/fit`)
- `onAddPlant(x, y, plant_name, scores)` - dodanie rośliny (PUT `/api/plans/:id/plants/:x/:y` + event `plant_confirmed`)
- `onRemovePlant(x, y)` - usunięcie rośliny (DELETE `/api/plans/:id/plants/:x/:y`)
- Obsługa błędów: 422 (komórka nie-soil), 504 (timeout AI), 429 (rate limit)

**Walidacja:**
- Dodanie rośliny tylko na komórkę typu 'soil'
- plant_name: niepusty string
- scores: opcjonalne, 1-5 jeśli podane

**Typy:**
- `PlantPlacementDto` - istniejąca roślina
- `PlantSearchCommand`, `PlantSearchResultDto`
- `PlantFitCommand`, `PlantFitResultDto`
- `PlantPlacementUpsertCommand`

**Propsy:**
```typescript
interface PlantsTabProps {
  planId: string;
  selectedCell: CellPosition | null;
  cellType: GridCellType | null;
  onPlantAdded: () => void;
}
```

### 4.10. WeatherTab

**Opis:** Zakładka wyświetlająca dane pogodowe dla planu. Tabela/wykres miesięcznych metryk (nasłonecznienie, wilgotność, opady), data ostatniego odświeżenia, przycisk odświeżania.

**Elementy:**
- WeatherMonthlyChart - wykres trendu (np. Line chart dla 12 miesięcy)
- WeatherMetricsTable - tabela z danymi (rok, miesiąc, sunlight, humidity, precip, last_refreshed_at)
- WeatherRefreshButton - przycisk "Odśwież dane" (POST `/api/plans/:id/weather/refresh`)

**Obsługiwane zdarzenia:**
- `onRefresh(force: boolean)` - odświeżenie cache pogody
- Obsługa błędów: 429 (rate limit), 504 (timeout Open-Meteo)

**Walidacja:** brak (tylko odczyt i refresh)

**Typy:**
- `WeatherMonthlyDto[]` - dane miesięczne
- `WeatherRefreshCommand`, `WeatherRefreshResultDto`

**Propsy:**
```typescript
interface WeatherTabProps {
  planId: string;
}
```

### 4.11. BottomPanel

**Opis:** Dolny panel statusu z logiem operacji i wskaźnikami postępu. Wykorzystuje aria-live dla komunikatów.

**Elementy:**
- OperationLog - lista ostatnich operacji z timestampami (np. "Zapisano siatkę", "Dodano roślinę 'tomato' na (3, 7)")
- StatusBar - wskaźniki: liczba roślin, liczba komórek zaznaczonych, stan AI (idle/loading/error), stan pogody

**Obsługiwane zdarzenia:** brak (tylko wyświetlanie)

**Walidacja:** brak

**Typy:**
- `OperationLogEntry = { timestamp: string; message: string; type: 'info' | 'success' | 'error' }`

**Propsy:**
```typescript
interface BottomPanelProps {
  operations: OperationLogEntry[];
  plantsCount: number;
  selectedCellsCount: number;
  aiStatus: 'idle' | 'loading' | 'error';
  weatherStatus: 'idle' | 'loading' | 'error' | 'stale';
}
```

### 4.12. AreaTypeConfirmDialog

**Opis:** Modal potwierdzenia zmiany typu obszaru, gdy operacja usunie rośliny. Wyświetlany po błędzie 409 z endpointu POST `/api/plans/:id/grid/area-type`.

**Elementy:**
- AlertDialog z tytułem "Usuń rośliny?"
- Opis: "Zmiana typu usunie X roślin z zaznaczonego obszaru. Kontynuować?"
- Przyciski: "Anuluj", "Potwierdź"

**Obsługiwane zdarzenia:**
- `onConfirm()` - ponowne wywołanie POST z `confirm_plant_removal=true` + event `area_typed`
- `onCancel()` - zamknięcie modalu

**Walidacja:** brak

**Typy:**
- `GridAreaTypeCommand` - komenda z potwierdzeniem

**Propsy:**
```typescript
interface AreaTypeConfirmDialogProps {
  isOpen: boolean;
  plantsCount: number;
  area: { x1: number; y1: number; x2: number; y2: number };
  type: GridCellType;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

### 4.13. GridRegenerationConfirmDialog

**Opis:** Modal potwierdzenia regeneracji siatki po zmianie parametrów planu (wymiary, jednostka kratki). Wyświetlany po błędzie 409 z PATCH `/api/plans/:id`.

**Elementy:**
- AlertDialog "Regenerować siatkę?"
- Opis: "Zmiana parametrów spowoduje regenerację siatki i utratę wszystkich roślin. Kontynuować?"
- Przyciski: "Anuluj", "Potwierdź i regeneruj"

**Obsługiwane zdarzenia:**
- `onConfirm()` - PATCH z `confirm_regenerate=true`
- `onCancel()`

**Walidacja:** brak

**Typy:** `PlanUpdateCommand`, `PlanUpdateQuery`

**Propsy:**
```typescript
interface GridRegenerationConfirmDialogProps {
  isOpen: boolean;
  changes: Partial<PlanUpdateCommand>;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

## 5. Typy

### 5.1. DTO (z types.ts)

Wykorzystujemy istniejące typy:
- `PlanDto` - szczegóły planu
- `GridMetadataDto` - metadane siatki
- `GridCellDto` - komórka siatki
- `PlantPlacementDto` - roślina na komórce
- `WeatherMonthlyDto` - dane pogody
- `GridCellType` - enum typów komórek
- `GridCellUpdateCommand` - zmiana typu komórki
- `GridAreaTypeCommand` - zmiana typu obszaru
- `GridAreaTypeResultDto` - wynik operacji obszarowej
- `PlantPlacementUpsertCommand` - dodanie/aktualizacja rośliny
- `PlantSearchCommand`, `PlantSearchResultDto`, `PlantSearchCandidateDto`
- `PlantFitCommand`, `PlantFitResultDto`
- `WeatherRefreshCommand`, `WeatherRefreshResultDto`
- `PlanUpdateCommand`, `PlanUpdateQuery`

### 5.2. ViewModels (nowe typy dla UI)

```typescript
// Stan edytora
export interface EditorState {
  currentTool: EditorTool;
  selectedArea: CellSelection | null;
  focusedCell: CellPosition | null;
  hasUnsavedChanges: boolean;
  clipboardArea: CellSelection | null; // dla przyszłego copy/paste (poza MVP)
}

export type EditorTool = 'select' | 'add_plant' | 'change_type';

export interface CellPosition {
  x: number;
  y: number;
}

export interface CellSelection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Log operacji
export interface OperationLogEntry {
  id: string;
  timestamp: string; // ISO
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// Stan zakładek drawera
export type DrawerTab = 'parameters' | 'plants' | 'weather';

// Rozszerzony stan komórki dla UI (połączenie GridCell + PlantPlacement)
export interface CellViewModel {
  x: number;
  y: number;
  type: GridCellType;
  plant: PlantPlacementDto | null;
  updated_at: string;
}

// Stan AI
export interface AIState {
  status: 'idle' | 'searching' | 'fitting' | 'error';
  searchResults: PlantSearchCandidateDto[] | null;
  fitResult: PlantFitResultDto | null;
  error: string | null;
}

// Stan pogody
export interface WeatherState {
  status: 'idle' | 'loading' | 'error' | 'stale';
  data: WeatherMonthlyDto[] | null;
  lastRefreshedAt: string | null;
  error: string | null;
}
```

## 6. Zarządzanie stanem

### 6.1. React Query

Wykorzystanie React Query do synchronizacji danych z API:

**Queries:**
- `usePlan(planId)` - GET `/api/plans/:id`
- `useGridMetadata(planId)` - GET `/api/plans/:id/grid`
- `useGridCells(planId, filters)` - GET `/api/plans/:id/grid/cells?...`
- `usePlantPlacements(planId, filters)` - GET `/api/plans/:id/plants?...`
- `useWeatherData(planId)` - GET `/api/plans/:id/weather`

**Mutations:**
- `useUpdatePlan()` - PATCH `/api/plans/:id`
- `useUpdateGridCell()` - PUT `/api/plans/:id/grid/cells/:x/:y`
- `useSetAreaType()` - POST `/api/plans/:id/grid/area-type`
- `useAddPlant()` - PUT `/api/plans/:id/plants/:x/:y`
- `useRemovePlant()` - DELETE `/api/plans/:id/plants/:x/:y`
- `useSearchPlants()` - POST `/api/ai/plants/search`
- `useCheckPlantFit()` - POST `/api/ai/plants/fit`
- `useRefreshWeather()` - POST `/api/plans/:id/weather/refresh`

**Konfiguracja:**
- `staleTime: 5 * 60 * 1000` (5 min dla danych planu i siatki)
- `cacheTime: 10 * 60 * 1000` (10 min)
- `retry: 1` dla AI (timeout wrażliwe)
- `refetchOnWindowFocus: false` dla edytora (unikamy konfliktów z lokalną edycją)

### 6.2. Custom Hook: useGridEditor

Centralny hook zarządzający stanem edytora:

```typescript
interface UseGridEditorReturn {
  state: EditorState;
  actions: {
    setTool: (tool: EditorTool) => void;
    selectArea: (selection: CellSelection | null) => void;
    focusCell: (position: CellPosition | null) => void;
    saveGrid: () => Promise<void>;
    setAreaType: (x1, y1, x2, y2, type, confirm?) => Promise<void>;
    addPlant: (x, y, plantData) => Promise<void>;
    removePlant: (x, y) => Promise<void>;
    updatePlan: (command, confirmRegenerate?) => Promise<void>;
  };
  derived: {
    selectedCellsCount: number;
    plantsInSelection: PlantPlacementDto[];
    canAddPlant: boolean; // czy zaznaczona komórka to soil i jest pusta
  };
}

function useGridEditor(planId: string, initialPlan: PlanDto, initialGrid: GridMetadataDto): UseGridEditorReturn {
  // Stan lokalny
  const [state, setState] = useState<EditorState>({
    currentTool: 'select',
    selectedArea: null,
    focusedCell: null,
    hasUnsavedChanges: false,
    clipboardArea: null,
  });

  // React Query hooks
  const { data: plan } = usePlan(planId);
  const { data: gridMetadata } = useGridMetadata(planId);
  const { data: cells } = useGridCells(planId, { /* filters */ });
  const { data: plants } = usePlantPlacements(planId);

  // Mutations
  const updatePlanMutation = useUpdatePlan();
  const setAreaTypeMutation = useSetAreaType();
  const addPlantMutation = useAddPlant();
  // ... inne mutations

  // Actions
  const actions = useMemo(() => ({
    setTool: (tool: EditorTool) => setState(s => ({ ...s, currentTool: tool })),
    // ... inne akcje
  }), [/* dependencies */]);

  // Derived state
  const derived = useMemo(() => ({
    selectedCellsCount: state.selectedArea 
      ? (state.selectedArea.x2 - state.selectedArea.x1 + 1) * (state.selectedArea.y2 - state.selectedArea.y1 + 1)
      : 0,
    // ... inne derived values
  }), [state, plants]);

  return { state, actions, derived };
}
```

### 6.3. Obsługa klawiatury

Hook `useKeyboardNavigation` dla obsługi skrótów w GridCanvas:

```typescript
function useKeyboardNavigation(
  gridWidth: number,
  gridHeight: number,
  focusedCell: CellPosition | null,
  onFocusChange: (cell: CellPosition | null) => void,
  onConfirmSelection: () => void,
  onCancelSelection: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedCell) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (focusedCell.y > 0) {
            onFocusChange({ x: focusedCell.x, y: focusedCell.y - 1 });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (focusedCell.y < gridHeight - 1) {
            onFocusChange({ x: focusedCell.x, y: focusedCell.y + 1 });
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (focusedCell.x > 0) {
            onFocusChange({ x: focusedCell.x - 1, y: focusedCell.y });
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (focusedCell.x < gridWidth - 1) {
            onFocusChange({ x: focusedCell.x + 1, y: focusedCell.y });
          }
          break;
        case 'Enter':
          e.preventDefault();
          onConfirmSelection();
          break;
        case 'Escape':
          e.preventDefault();
          onCancelSelection();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, gridWidth, gridHeight, onFocusChange, onConfirmSelection, onCancelSelection]);
}
```

### 6.4. Analityka

Hook `useAnalyticsEvents` do automatycznego wysyłania zdarzeń:

```typescript
function useAnalyticsEvents(planId: string) {
  const sendEvent = useSendAnalyticsEvent(); // mutacja POST /api/analytics/events

  return {
    trackGridSaved: () => {
      sendEvent.mutate({
        event_type: 'grid_saved',
        plan_id: planId,
        attributes: { timestamp: new Date().toISOString() },
      });
    },
    trackAreaTyped: (area: CellSelection, type: GridCellType) => {
      sendEvent.mutate({
        event_type: 'area_typed',
        plan_id: planId,
        attributes: { area, type },
      });
    },
    trackPlantConfirmed: (x: number, y: number, plantName: string) => {
      sendEvent.mutate({
        event_type: 'plant_confirmed',
        plan_id: planId,
        attributes: { x, y, plant_name: plantName },
      });
    },
  };
}
```

## 7. Integracja API

### 7.1. GET `/api/plans/:plan_id`

**Cel:** Pobranie szczegółów planu

**Request:** brak body, plan_id w path

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Mój ogród",
    "latitude": 52.1,
    "longitude": 21.0,
    "width_cm": 500,
    "height_cm": 400,
    "cell_size_cm": 25,
    "grid_width": 20,
    "grid_height": 16,
    "orientation": 0,
    "hemisphere": "northern",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-15T14:30:00Z"
  }
}
```

**Błędy:** 401, 403, 404

**Wykorzystanie:** Inicjalizacja widoku, aktualizacja po PATCH

### 7.2. GET `/api/plans/:plan_id/grid`

**Cel:** Pobranie metadanych siatki

**Request:** brak body, plan_id w path

**Response 200:**
```json
{
  "data": {
    "grid_width": 20,
    "grid_height": 16,
    "cell_size_cm": 25,
    "orientation": 0
  }
}
```

**Błędy:** 401, 403, 404

**Wykorzystanie:** Inicjalizacja GridCanvas, walidacja współrzędnych

### 7.3. GET `/api/plans/:plan_id/grid/cells`

**Cel:** Pobranie listy komórek siatki z filtrami i paginacją

**Request:**
- Query params: `type`, `x`, `y`, `bbox`, `limit`, `cursor`, `sort`, `order`
- Przykład: `?bbox=0,0,19,15&limit=100`

**Response 200:**
```json
{
  "data": [
    { "x": 0, "y": 0, "type": "soil", "updated_at": "2025-01-15T14:30:00Z" },
    { "x": 0, "y": 1, "type": "soil", "updated_at": "2025-01-15T14:30:00Z" }
  ],
  "pagination": { "next_cursor": "base64string" }
}
```

**Błędy:** 400 (invalid params), 401, 403, 404

**Wykorzystanie:** Renderowanie GridCanvas, filtrowanie komórek po typie

**Uwagi:** Dla dużych siatek używamy bbox do ładowania tylko widocznej części + buffer

### 7.4. PUT `/api/plans/:plan_id/grid/cells/:x/:y`

**Cel:** Zmiana typu pojedynczej komórki

**Request:**
```json
{ "type": "path" }
```

**Response 200:**
```json
{
  "data": { "x": 1, "y": 2, "type": "path", "updated_at": "..." }
}
```

**Błędy:** 400, 401, 403, 404, 422 (poza granicami)

**Wykorzystanie:** Zmiana typu pojedynczej komórki (narzędzie "change_type" z toolbaru)

### 7.5. POST `/api/plans/:plan_id/grid/area-type`

**Cel:** Zmiana typu prostokątnego obszaru siatki

**Request:**
```json
{
  "x1": 0,
  "y1": 0,
  "x2": 5,
  "y2": 5,
  "type": "water",
  "confirm_plant_removal": false
}
```

**Response 200:**
```json
{
  "data": {
    "affected_cells": 36,
    "removed_plants": 4
  }
}
```

**Response 409 (wymaga potwierdzenia):**
```json
{
  "error": {
    "code": "Conflict",
    "message": "There are 4 plant(s) in the selected area. Set confirm_plant_removal=true to proceed.",
    "details": { "field_errors": { "requires_confirmation": "true" } }
  }
}
```

**Błędy:** 400, 401, 403, 404, 409, 422

**Wykorzystanie:** Narzędzie "change_type" dla zaznaczonego obszaru. Po 409 wyświetlamy AreaTypeConfirmDialog.

### 7.6. PUT `/api/plans/:plan_id/plants/:x/:y`

**Cel:** Dodanie lub aktualizacja rośliny na komórce

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
    "updated_at": "..."
  }
}
```

**Błędy:** 400, 401, 403, 404, 422 (komórka nie-soil)

**Wykorzystanie:** Dodanie rośliny z PlantsTab. Po sukcesie wysyłamy event `plant_confirmed`.

### 7.7. DELETE `/api/plans/:plan_id/plants/:x/:y`

**Cel:** Usunięcie rośliny z komórki

**Request:** brak body

**Response 204:** bez treści

**Błędy:** 401, 403, 404

**Wykorzystanie:** Usunięcie rośliny z PlantsList lub GridCanvas

### 7.8. POST `/api/ai/plants/search`

**Cel:** Wyszukiwanie roślin po nazwie przez AI (na ten moment tylko Mock z odpowiedzia na sztywno)

**Request:**
```json
{ "query": "tomato" }
```

**Response 200:**
```json
{
  "data": {
    "candidates": [
      { "name": "tomato", "latin_name": "Solanum lycopersicum", "source": "ai" },
      { "name": "cherry tomato", "latin_name": "Solanum lycopersicum var. cerasiforme", "source": "ai" }
    ]
  }
}
```

**Błędy:** 400, 401, 403, 429 (rate limit), 504 (timeout)

**Wykorzystanie:** PlantSearchForm w PlantsTab. Timeout 10s, po przekroczeniu wyświetlamy AITimeoutErrorDialog z opcją ponowienia.

### 7.9. POST `/api/ai/plants/fit`

**Cel:** Ocena dopasowania rośliny do lokalizacji i warunków pogodowych (mock na sztywno na ten moment)

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
    "explanation": "Tomato requires high sunlight and moderate humidity. Your location provides good conditions."
  }
}
```

**Błędy:** 400, 401, 403, 404, 422, 429, 504

**Wykorzystanie:** PlantFitDisplay w PlantsTab. Wyniki prezentujemy jako karty z gwiazdkami (1-5) + tooltip z explanation.

### 7.10. PATCH `/api/plans/:plan_id`

**Cel:** Aktualizacja parametrów planu

**Request:**
```json
{
  "name": "Nowa nazwa",
  "orientation": 90,
  "cell_size_cm": 50
}
```

**Query:** `?confirm_regenerate=false`

**Response 200:** jak GET `/api/plans/:id`

**Response 409 (wymaga potwierdzenia):**
```json
{
  "error": {
    "code": "Conflict",
    "message": "Changing grid dimensions requires confirmation. This will regenerate the grid and remove all plants.",
    "details": { "field_errors": { "requires_confirmation": "true" } }
  }
}
```

**Błędy:** 400, 401, 403, 404, 409

**Wykorzystanie:** ParametersTab. Po 409 wyświetlamy GridRegenerationConfirmDialog.

### 7.11. GET `/api/plans/:plan_id/weather`

**Cel:** Pobranie danych pogodowych dla planu

**Request:** brak body

**Response 200:**
```json
{
  "data": [
    {
      "year": 2025,
      "month": 1,
      "sunlight": 45,
      "humidity": 75,
      "precip": 60,
      "last_refreshed_at": "2025-01-01T00:00:00Z"
    },
    ...
  ]
}
```

**Błędy:** 401, 403, 404

**Wykorzystanie:** WeatherTab, wyświetlenie w WeatherMonthlyChart i WeatherMetricsTable

### 7.12. POST `/api/plans/:plan_id/weather/refresh`

**Cel:** Odświeżenie cache pogody

**Request:**
```json
{ "force": false }
```

**Response 200:**
```json
{
  "data": {
    "refreshed": true,
    "months": 12
  }
}
```

**Błędy:** 401, 403, 404, 429 (rate limit), 502/504 (upstream error)

**Wykorzystanie:** WeatherRefreshButton. Po 429 informujemy o limicie, po 504 pokazujemy błąd z opcją ponowienia.

## 8. Interakcje użytkownika

### 8.1. Zaznaczanie obszaru siatki

**Scenariusz:**
1. Użytkownik wybiera narzędzie "Zaznacz obszar" z toolbaru
2. Kliknięcie na komórkę (x1, y1) rozpoczyna zaznaczanie
3. Przeciąganie myszą do komórki (x2, y2)
4. Zwolnienie przycisku myszy kończy zaznaczanie
5. Zaznaczony obszar jest podświetlony (overlay)
6. Użytkownik może zmienić typ zaznaczonych komórek (toolbar → dropdown typ → "Zastosuj")

**Alternatywa (klawiatura):**
1. Nawigacja strzałkami do komórki początkowej
2. Shift + strzałki rozszerza zaznaczenie
3. Enter potwierdza zaznaczenie

### 8.2. Zmiana typu obszaru

**Scenariusz:**
1. Użytkownik zaznacza obszar (patrz 8.1)
2. Wybiera typ z dropdownu (np. "woda")
3. Klika "Zastosuj"
4. Jeśli w obszarze są rośliny → wyświetla się AreaTypeConfirmDialog
5. Użytkownik potwierdza → POST `/grid/area-type` z `confirm_plant_removal=true`
6. Sukces → toast "Zmieniono typ X komórek, usunięto Y roślin" + event `area_typed`
7. GridCanvas odświeża się (React Query invalidation)

**Alternatywa (bez roślin):**
1-3. jak wyżej
4. Brak roślin → POST bez potwierdzenia
5. Sukces → toast + event

### 8.3. Dodawanie rośliny

**Scenariusz:**
1. Użytkownik wybiera narzędzie "Dodaj roślinę" z toolbaru
2. Klika na komórkę typu 'soil' (x, y)
3. Otwiera się AddPlantDialog z zakładkami:
   - Tab "Wyszukaj" - PlantSearchForm
   - Tab "Ręcznie" - pole tekstowe nazwa rośliny
4. Użytkownik wpisuje nazwę w wyszukiwarkę → POST `/ai/plants/search`
5. Wyświetla się lista kandydatów (name, latin_name)
6. Użytkownik wybiera kandydata
7. Automatycznie POST `/ai/plants/fit` z wybraną nazwą i (x, y)
8. Wyświetla się PlantFitDisplay z wynikami (scores, explanation)
9. Użytkownik klika "Dodaj roślinę"
10. PUT `/plants/:x/:y` z plant_name i scores
11. Sukces → toast "Dodano roślinę 'tomato'" + event `plant_confirmed`
12. Dialog zamyka się, GridCanvas i PlantsList odświeżają się

**Alternatywa (komórka nie-soil):**
1-2. jak wyżej, ale komórka != 'soil'
3. Wyświetla się CellNotSoilWarningDialog "Rośliny można dodawać tylko na pola typu 'ziemia'"
4. Użytkownik zamyka dialog

**Alternatywa (timeout AI):**
4-5. Timeout po 10s
6. Wyświetla się AITimeoutErrorDialog z przyciskami "Ponów" i "Dodaj bez oceny"
7. "Ponów" → ponowne POST `/ai/plants/fit`
8. "Dodaj bez oceny" → przejście do kroku 9 bez scores (PUT z plant_name tylko)

### 8.4. Usuwanie rośliny

**Scenariusz:**
1. Użytkownik klika na komórkę z rośliną w GridCanvas
2. Wyświetla się kontekstowe menu lub info panel z przyciskiem "Usuń roślinę"
3. Klika "Usuń roślinę"
4. Pojawia się confirmation dialog "Usunąć roślinę 'tomato'?"
5. Użytkownik potwierdza
6. DELETE `/plants/:x/:y`
7. Sukces → toast "Usunięto roślinę"
8. GridCanvas i PlantsList odświeżają się

### 8.5. Edycja parametrów planu

**Scenariusz:**
1. Użytkownik otwiera SideDrawer → zakładka "Parametry"
2. Zmienia orientację z 0 na 90 (slider)
3. Klika "Zapisz zmiany"
4. PATCH `/plans/:id` z `{ orientation: 90 }`
5. Sukces (200, brak wpływu na siatkę) → toast "Zaktualizowano plan"
6. Plan odświeża się w React Query

**Alternatywa (regeneracja siatki):**
2. Zmienia cell_size_cm z 25 na 50
3. Klika "Zapisz zmiany"
4. PATCH `/plans/:id` bez confirm_regenerate
5. Błąd 409 → wyświetla się GridRegenerationConfirmDialog
6. Użytkownik potwierdza
7. PATCH `/plans/:id?confirm_regenerate=true`
8. Sukces → toast "Zregenerowano siatkę", wszystkie dane (grid, cells, plants) odświeżają się

### 8.6. Odświeżanie danych pogodowych

**Scenariusz:**
1. Użytkownik otwiera SideDrawer → zakładka "Pogoda"
2. Widzi tabelę z danymi i datą ostatniego odświeżenia
3. Klika "Odśwież dane"
4. POST `/weather/refresh` z `{ force: false }`
5. Sukces (200) → toast "Dane pogodowe zaktualizowane (12 miesięcy)"
6. WeatherTab odświeża dane

**Alternatywa (rate limit):**
4. Błąd 429 → toast "Zbyt częste odświeżanie. Spróbuj ponownie za X minut"
5. Przycisk "Odśwież" staje się disabled na X minut (countdown w tooltipie)

### 8.7. Nawigacja klawiaturą po siatce

**Scenariusz:**
1. Użytkownik klika na GridCanvas (focus na kontener)
2. Naciska Tab → focus przechodzi na pierwszą komórkę (0, 0)
3. Strzałkami ↑↓←→ porusza się po siatce
4. Focusowana komórka ma widoczny focus ring
5. Naciska Spację → rozpoczyna zaznaczanie od aktualnej komórki
6. Shift + strzałki rozszerza zaznaczenie
7. Enter potwierdza zaznaczenie
8. Escape anuluje zaznaczenie

## 9. Warunki i walidacja

### 9.1. Walidacja współrzędnych

**Warunek:** `0 <= x < grid_width && 0 <= y < grid_height`

**Komponenty:** GridCanvas, wszystkie operacje na komórkach

**Wpływ na UI:**
- Blokada interakcji poza granicami siatki
- Błędy 422 z API mapowane na toast "Współrzędne poza granicami siatki"

### 9.2. Walidacja typu komórki dla dodawania rośliny

**Warunek:** Roślina może być dodana tylko na komórkę typu 'soil'

**Komponenty:** AddPlantDialog, GridCanvas (narzędzie "add_plant")

**Wpływ na UI:**
- Disabled state przycisku "Dodaj roślinę" jeśli `cellType !== 'soil'`
- CellNotSoilWarningDialog po próbie dodania na niewłaściwą komórkę
- Błąd 422 z API → toast "Rośliny można dodawać tylko na pola typu 'ziemia'"

### 9.3. Walidacja obszaru zaznaczenia

**Warunek:** `x1 <= x2 && y1 <= y2`

**Komponenty:** GridCanvas (SelectionOverlay)

**Wpływ na UI:**
- Automatyczna korekta podczas drag (wymuszenie poprawnej kolejności współrzędnych)
- Nie pozwalamy na puste zaznaczenie (min 1 komórka)

### 9.4. Walidacja regeneracji siatki

**Warunek:** Zmiana `width_cm`, `height_cm` lub `cell_size_cm` powodująca zmianę `grid_width` lub `grid_height` wymaga potwierdzenia

**Komponenty:** ParametersTab, GridRegenerationConfirmDialog

**Wpływ na UI:**
- Przed wysłaniem PATCH sprawdzamy czy nowe wymiary różnią się od aktualnych
- Jeśli tak → informujemy użytkownika o wpływie (alert box w formularzu)
- Po błędzie 409 → GridRegenerationConfirmDialog
- Po potwierdzeniu → PATCH z `confirm_regenerate=true`

### 9.5. Walidacja usuwania roślin przy zmianie typu obszaru

**Warunek:** Zmiana typu != 'soil' w obszarze zawierającym rośliny wymaga potwierdzenia

**Komponenty:** GridCanvas (operacje area-type), AreaTypeConfirmDialog

**Wpływ na UI:**
- Przed POST `/grid/area-type` sprawdzamy czy są rośliny w obszarze (query do plants z bbox)
- Jeśli są → informujemy użytkownika (alert w UI) przed wysłaniem
- Po błędzie 409 → AreaTypeConfirmDialog z liczbą roślin do usunięcia
- Po potwierdzeniu → POST z `confirm_plant_removal=true`

### 9.6. Walidacja parametrów planu

**Warunki:**
- `name`: niepuste
- `orientation`: 0-359
- `width_cm`, `height_cm`: > 0, podzielne przez `cell_size_cm`
- `cell_size_cm`: {10, 25, 50, 100}
- `grid_width`, `grid_height`: 1-200

**Komponenty:** ParametersTab (PlanParametersForm)

**Wpływ na UI:**
- Walidacja inline (Zod + React Hook Form)
- Błędy wyświetlane pod polami formularza
- Przycisk "Zapisz" disabled jeśli formularz niepoprawny
- Błędy 400 z API → toast z field_errors

### 9.7. Rate limiting

**Warunki:**
- AI search/fit: max 10/min/user
- Weather refresh: max 2/h/plan

**Komponenty:** PlantSearchForm, PlantFitDisplay, WeatherRefreshButton

**Wpływ na UI:**
- Błąd 429 → toast z komunikatem i czasem oczekiwania
- Disabled state przycisków z countdown w tooltipie
- Lokalny licznik requestów (opcjonalnie, aby uniknąć zbędnych wywołań API)

## 10. Obsługa błędów

### 10.1. Błędy uwierzytelnienia (401)

**Scenariusz:** Utrata sesji podczas pracy w edytorze

**Obsługa:**
- React Query onError → wykrycie 401
- Wyświetlenie globalnego SessionExpiredModal (z `.ai/docs/ui-plan.md`)
- Opcje: "Zaloguj ponownie" (inline form w modalu) lub "Wyloguj"
- Po ponownym zalogowaniu → odświeżenie wszystkich queries bez przeładowania strony

### 10.2. Błędy uprawnień (403)

**Scenariusz:** Próba dostępu do planu innego użytkownika (manipulacja URL)

**Obsługa:**
- Redirect do `/plans` z toast "Brak uprawnień do tego planu"
- Logowanie błędu (opcjonalnie do sentry/logów)

### 10.3. Błędy nie znaleziono (404)

**Scenariusz:** Plan został usunięty przez inną sesję lub nie istnieje

**Obsługa:**
- Redirect do `/plans` z toast "Plan nie istnieje"
- Jeśli błąd dotyczy komórki/rośliny → toast inline bez redirectu

### 10.4. Błędy walidacji (400, 422)

**Scenariusz:** Niepoprawne dane wejściowe lub naruszenie constraintów DB

**Obsługa:**
- Wyświetlenie field_errors pod odpowiednimi polami formularza
- Toast z głównym komunikatem błędu
- Fokus na pierwszym błędnym polu
- Przykład: 422 "Coordinates out of bounds" → toast "Współrzędne poza granicami siatki"

### 10.5. Błędy konfliktu (409)

**Scenariusz:** Operacja wymaga potwierdzenia (usuwa rośliny, regeneruje siatkę)

**Obsługa:**
- Parsowanie `field_errors.requires_confirmation`
- Wyświetlenie odpowiedniego modalu potwierdzenia:
  - AreaTypeConfirmDialog dla `/grid/area-type`
  - GridRegenerationConfirmDialog dla `/plans/:id`
- Po potwierdzeniu → ponowne wywołanie API z flagą potwierdzenia

### 10.6. Błędy rate limit (429)

**Scenariusz:** Przekroczenie limitu wywołań AI lub weather refresh

**Obsługa:**
- Toast "Zbyt wiele żądań. Spróbuj ponownie za X minut"
- Disabled state przycisku z countdown
- Optionally: parsowanie nagłówka `Retry-After` z odpowiedzi

### 10.7. Błędy timeout (504) - AI i погода

**Scenariusz:** AI lub Open-Meteo nie odpowiada w ciągu 10s

**Obsługa:**
- AITimeoutErrorDialog z opcjami:
  - "Ponów" → retry mutation
  - "Dodaj bez oceny" (dla plant fit) → dodanie rośliny z pustymi scores
  - "Anuluj" → zamknięcie dialogu
- WeatherTab: toast "Nie udało się pobrać danych pogodowych. Spróbuj ponownie później"

### 10.8. Błędy nieoczekiwane (500)

**Scenariusz:** Błąd serwera, błąd bazy danych

**Obsługa:**
- Toast "Wystąpił nieoczekiwany błąd. Spróbuj ponownie"
- Logowanie błędu do konsoli (dev) i sentry (prod)
- Opcja "Ponów" w toaście
- Nie tracenie lokalnego stanu edytora (unsaved changes)

### 10.9. Błędy sanity-check AI (niepoprawny JSON)

**Scenariusz:** Odpowiedź AI nie pasuje do schematu (US-027)

**Obsługa:**
- Walidacja odpowiedzi Zodem po stronie klienta (dodatkowy layer bezpieczeństwa)
- Toast "Niepoprawna odpowiedź AI. Spróbuj ponownie lub dodaj roślinę ręcznie"
- Logowanie błędu (developer-facing)
- Opcja dodania rośliny bez AI (ręczne wpisanie nazwy)

### 10.10. Błędy sieciowe (offline, network error)

**Scenariusz:** Utrata połączenia z internetem

**Obsługa:**
- React Query retry z exponential backoff (1s, 2s, 4s)
- Toast "Brak połączenia z internetem" (persistence toast)
- Disabled state przycisków akcji (save, refresh)
- Ponowne włączenie po przywróceniu połączenia (window `online` event)

## 11. Kroki implementacji

### Faza 1: Struktura i routing

1. Utworzyć stronę `src/pages/plans/[id].astro`
   - Dodać middleware uwierzytelnienia
   - Pobrać dane SSR (plan, grid metadata, initial cells)
   - Obsłużyć błędy 404, 403

2. Utworzyć główny komponent React `src/components/editor/EditorLayout.tsx`
   - Struktura layoutu (topbar, canvas, drawer, bottom panel)
   - Integracja z React Query Provider

3. Dodać routing guard w middleware `src/middleware/index.ts`
   - Weryfikacja sesji dla `/plans/*`
   - Redirect do `/auth/login` jeśli brak sesji

### Faza 2: React Query i state management

4. Utworzyć queries w `src/lib/hooks/queries/`
   - `usePlan.ts`
   - `useGridMetadata.ts`
   - `useGridCells.ts`
   - `usePlantPlacements.ts`
   - `useWeatherData.ts`

5. Utworzyć mutations w `src/lib/hooks/mutations/`
   - `useUpdatePlan.ts`
   - `useUpdateGridCell.ts`
   - `useSetAreaType.ts`
   - `useAddPlant.ts`, `useRemovePlant.ts`
   - `useSearchPlants.ts`, `useCheckPlantFit.ts`
   - `useRefreshWeather.ts`

6. Utworzyć custom hook `src/lib/hooks/useGridEditor.ts`
   - Zarządzanie stanem edytora (tool, selection, focus)
   - Agregacja actions i derived state
   - Integracja z React Query

7. Utworzyć hook `src/lib/hooks/useAnalyticsEvents.ts`
   - Funkcje trackGridSaved, trackAreaTyped, trackPlantConfirmed
   - Automatyczne wysyłanie eventów po sukcesie operacji

### Faza 3: GridCanvas i interakcje

8. Utworzyć `src/components/editor/GridCanvas/GridCanvas.tsx`
   - Rendering siatki (CSS Grid layout)
   - Obsługa mouse events (click, drag selection)
   - Focus management

9. Utworzyć `src/components/editor/GridCanvas/GridCell.tsx`
   - Renderowanie pojedynczej komórki
   - Stylowanie w zależności od typu
   - Ikona rośliny jeśli istnieje

10. Utworzyć `src/components/editor/GridCanvas/SelectionOverlay.tsx`
    - Wizualizacja zaznaczonego obszaru
    - Animacje i style

11. Dodać hook `src/lib/hooks/useKeyboardNavigation.ts`
    - Obsługa strzałek, Enter, Escape
    - Integracja z focus state

12. Dodać hook `src/lib/hooks/useGridSelection.ts`
    - Logika drag-to-select
    - Walidacja obszaru (x1 <= x2, y1 <= y2)

### Faza 4: Toolbar i topbar

13. Utworzyć `src/components/editor/EditorTopbar.tsx`
    - Layout z nazwą planu, toolbarem, statusem

14. Utworzyć `src/components/editor/EditorToolbar.tsx`
    - ButtonGroup z narzędziami (select, add_plant, change_type)
    - SaveButton z isSaving state
    - UndoWarningTooltip

15. Utworzyć `src/components/editor/EditorStatusIndicators.tsx`
    - Wskaźniki statusu AI, погоды, sesji
    - Ikony z tooltipami

### Faza 5: SideDrawer - Parametry

16. Utworzyć `src/components/editor/SideDrawer/SideDrawer.tsx`
    - Tabs component (shadcn/ui)
    - Zarządzanie aktywną zakładką

17. Utworzyć `src/components/editor/SideDrawer/ParametersTab.tsx`
    - Formularz z polami: name, orientation, hemisphere, cell_size_cm
    - Integracja z React Hook Form + Zod validation
    - Przycisk "Zapisz zmiany"

18. Utworzyć `src/components/editor/SideDrawer/PlanParametersForm.tsx`
    - Pola formularza z walidacją inline
    - Mini-compass dla orientation (custom component)
    - Alert box informujący o wpływie zmian

19. Utworzyć `src/components/editor/modals/GridRegenerationConfirmDialog.tsx`
    - AlertDialog (shadcn/ui)
    - Obsługa confirm → PATCH z confirm_regenerate=true

### Faza 6: SideDrawer - Rośliny

20. Utworzyć `src/components/editor/SideDrawer/PlantsTab.tsx`
    - Layout z PlantsList, PlantSearchForm, PlantFitDisplay

21. Utworzyć `src/components/editor/SideDrawer/PlantsList.tsx`
    - Lista roślin w planie (useQuery usePlantPlacements)
    - Filtrowanie po nazwie
    - Akcje: usuń roślinę

22. Utworzyć `src/components/editor/SideDrawer/PlantSearchForm.tsx`
    - Input + przycisk "Szukaj"
    - Lista kandydatów (name, latin_name)
    - Obsługa timeout 10s

23. Utworzyć `src/components/editor/SideDrawer/PlantFitDisplay.tsx`
    - Karty z wynikami AI (scores 1-5, gwiazdki)
    - Explanation text
    - Przycisk "Dodaj roślinę"

24. Utworzyć `src/components/editor/modals/AddPlantDialog.tsx`
    - Dialog z zakładkami: "Wyszukaj", "Ręcznie"
    - Integracja z PlantSearchForm i PlantFitDisplay
    - Finalne PUT /plants/:x/:y

25. Utworzyć `src/components/editor/modals/CellNotSoilWarningDialog.tsx`
    - AlertDialog informujący o błędzie (komórka != soil)

26. Utworzyć `src/components/editor/modals/AITimeoutErrorDialog.tsx`
    - Dialog z opcjami: "Ponów", "Dodaj bez oceny", "Anuluj"

### Faza 7: SideDrawer - Pogoda

27. Utworzyć `src/components/editor/SideDrawer/WeatherTab.tsx`
    - Layout z wykresem i tabelą

28. Utworzyć `src/components/editor/SideDrawer/WeatherMonthlyChart.tsx`
    - Line chart dla 3 metryk (sunlight, humidity, precip)
    - Legenda, osie
    - Biblioteka: recharts lub chart.js

29. Utworzyć `src/components/editor/SideDrawer/WeatherMetricsTable.tsx`
    - Tabela z danymi (12 wierszy dla miesięcy)
    - Kolumny: miesiąc, sunlight, humidity, precip

30. Utworzyć `src/components/editor/SideDrawer/WeatherRefreshButton.tsx`
    - Przycisk "Odśwież dane"
    - Disabled state z countdown przy 429
    - Spinner podczas ładowania

### Faza 8: BottomPanel i modals

31. Utworzyć `src/components/editor/BottomPanel.tsx`
    - Layout z OperationLog i StatusBar

32. Utworzyć `src/components/editor/OperationLog.tsx`
    - Lista ostatnich operacji (max 10)
    - Ikony w zależności od typu (info/success/error)
    - aria-live="polite"

33. Utworzyć `src/components/editor/StatusBar.tsx`
    - Wskaźniki: liczba roślin, zaznaczonych komórek, status AI/погоды

34. Utworzyć `src/components/editor/modals/AreaTypeConfirmDialog.tsx`
    - AlertDialog z informacją o liczbie roślin do usunięcia
    - Przyciski: "Anuluj", "Potwierdź"

### Faza 9: Dostępność i UX

35. Dodać aria labels i roles
    - GridCanvas: role="application"
    - GridCell: aria-label="Komórka x:3, y:7, typ: ziemia, roślina: tomato"
    - Modals: aria-modal="true", focus trap

36. Dodać focus management
    - Focus ring dla aktywnej komórki
    - Fokus na pierwszym błędnym polu w formularzach
    - Fokus na pierwszym przycisku w modalach

37. Dodać tooltips
    - Hover na komórkach → info o typie i roślinie
    - Toolbar buttons → nazwy narzędzi
    - Status indicators → szczegóły statusu

38. Dodać high contrast mode support
    - CSS variables dla kolorów
    - Alternatywne style dla @media (prefers-contrast: high)

39. Dodać responsive handling
    - Drawer collapse na mniejszych ekranach (< 1024px)
    - Pionowy scroll dla siatki
    - Dynamiczne skalowanie rozmiaru komórek

### Faza 10: Testy i optymalizacje

40. Dodać React Query devtools (development)

41. Dodać error boundaries
    - Top-level boundary w EditorLayout
    - Fallback UI z opcją "Przeładuj stronę"

42. Optymalizacja renderowania GridCanvas
    - Virtualizacja dla dużych siatek (> 100x100)
    - React.memo dla GridCell
    - useMemo/useCallback dla event handlers

43. Dodać localStorage persistence
    - Zapis unsaved changes (draft)
    - Przywracanie po przeładowaniu strony (z ostrzeżeniem)

44. Testy manualne według `.ai/testing/grid-manual-tests.md` (do utworzenia)
    - Scenariusze: zaznaczanie, typowanie, dodawanie roślin, AI, погода
    - Edge cases: limit siatki, timeout AI, rate limit

### Faza 11: Finalizacja

46. Dodać loading states
    - Skeleton loaders dla GridCanvas podczas initial load
    - Spinners dla operacji API (save, refresh)
    - Progress bar dla długich operacji (batch updates)

47. Dodać success feedback
    - Toasts dla wszystkich operacji
    - Animacje dla zaktualizowanych komórek
    - Dźwięk potwierdzenia (opcjonalnie)

48. Przegląd i refactoring
    - Ekstrakcja powtarzalnych komponentów
    - Optymalizacja importów

---

**Uwagi końcowe:**

- Priorytet: Fazy 1-8 (core functionality)
- Nice-to-have: Fazy 9-10 (dostępność, optymalizacje)
- Post-MVP: Faza 11 (polish, monitoring)

- Szacowany czas implementacji: ~4-6 tygodni (1 developer)

- Dependency risk: AI i Open-Meteo - przygotować fallbacki i graceful degradation

