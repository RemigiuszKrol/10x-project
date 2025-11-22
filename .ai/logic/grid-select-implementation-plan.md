# Plan implementacji: Zaznaczanie obszaru i przypisywanie typu pól

## 1. Przegląd

Ten plan opisuje implementację funkcjonalności zaznaczania prostokątnego obszaru siatki planu i przypisywania mu typu (ziemia/ścieżka/woda/zabudowa). Funkcjonalność rozszerza istniejący edytor siatki o możliwość masowej edycji komórek z obsługą konfliktów (usuwanie roślin) oraz automatyczne rejestrowanie zdarzeń analitycznych.

**User Stories:**
- US-009: Zaznaczanie obszaru i przypisywanie typu pól
- US-010: Potwierdzenie usunięcia roślin przy zmianie typu

**Zakres:**
- Drag-to-select na siatce (mysz + klawiatura)
- Selektor typu dla zaznaczonego obszaru
- Wizualizacja zaznaczenia (overlay)
- Obsługa konfliktu 409 (rośliny w obszarze)
- Modal potwierdzenia usunięcia roślin
- Event analytics `area_typed`

## 2. Routing widoku

Funkcjonalność jest częścią istniejącego widoku edytora siatki:

**Ścieżka:** `/plans/:id` (istniejąca)

**Brak zmian w routingu** - rozszerzamy funkcjonalność komponentów w `EditorLayout`.

## 3. Struktura komponentów

Rozszerzamy istniejący `EditorLayout` o nowe komponenty:

```
EditorLayout (ISTNIEJĄCY - bez zmian w strukturze)
├── EditorTopbar
│   ├── EditorToolbar (ISTNIEJĄCY - bez zmian)
│   └── EditorStatusIndicators
├── GridCanvas (ROZSZERZONY)
│   ├── GridCell[] (dla każdej komórki)
│   ├── SelectionOverlay (NOWY) ← gdy selectedArea != null
│   └── CellFocusRing
├── AreaTypePanel (NOWY) ← floating panel nad canvas
│   ├── AreaTypeSelector (dropdown)
│   ├── SelectionInfo (wymiary, liczba komórek)
│   └── ApplyButton
├── SideDrawer (ISTNIEJĄCY - bez zmian)
├── BottomPanel (ISTNIEJĄCY - bez zmian)
└── Modals
    ├── AreaTypeConfirmDialog (NOWY)
    └── [inne istniejące dialogi]
```

**Nowe komponenty:**
1. `SelectionOverlay` - wizualizacja zaznaczonego obszaru
2. `AreaTypePanel` - panel z selektorem typu i przyciskiem zastosowania
3. `AreaTypeConfirmDialog` - modal potwierdzenia usunięcia roślin

**Rozszerzone komponenty:**
1. `GridCanvas` - dodanie logiki drag-to-select
2. `useGridEditor` hook - rozszerzenie o akcje związane z zaznaczaniem

**Nowe hooki:**
1. `useGridSelection` - logika zarządzania zaznaczeniem
2. `useAreaTypeWithConfirmation` - logika zmiany typu z obsługą 409

## 4. Szczegóły komponentów

### 4.1. GridCanvas (ROZSZERZONY)

**Opis:**
Istniejący komponent renderujący siatkę. Rozszerzamy go o obsługę drag-to-select dla zaznaczania prostokątnego obszaru komórek.

**Główne elementy:**
- `<div className="relative flex-1 overflow-auto">` - kontener z scrollem
- `<div className="grid" style={{ gridTemplateColumns, gridTemplateRows }}>` - CSS Grid layout
- `GridCell[]` - komponenty poszczególnych komórek (ISTNIEJĄCE)
- `SelectionOverlay` - overlay dla zaznaczonego obszaru (NOWY)
- `CellFocusRing` - focus indicator (ISTNIEJĄCY)

**Nowe obsługiwane zdarzenia:**
- `onMouseDown(x, y)` - rozpoczęcie zaznaczania (gdy currentTool === 'select')
- `onMouseMove(x, y)` - aktualizacja zaznaczenia podczas drag
- `onMouseUp()` - zakończenie zaznaczania
- `onMouseLeave()` - przerwanie zaznaczania jeśli mysz opuści canvas
- `onKeyDown(Space)` - rozpoczęcie zaznaczania klawiaturą
- `onKeyDown(Shift+Arrows)` - rozszerzanie zaznaczenia
- `onKeyDown(Enter)` - potwierdzenie zaznaczenia
- `onKeyDown(Escape)` - anulowanie zaznaczenia

**Walidacja:**
- Współrzędne zaznaczenia muszą być w granicach `[0, grid_width) x [0, grid_height)`
- Automatyczna korekja kolejności: `x1 = min(startX, endX)`, `x2 = max(startX, endX)`
- Minimalna wielkość zaznaczenia: 1x1 (przynajmniej jedna komórka)

**Typy:**
- `GridMetadataDto` - wymiary siatki (ISTNIEJĄCY)
- `GridCellDto[]` - dane komórek (ISTNIEJĄCY)
- `CellSelection | null` - zaznaczony obszar (ISTNIEJĄCY)
- `EditorTool` - aktywne narzędzie (ISTNIEJĄCY)

**Propsy (rozszerzone):**
```typescript
interface GridCanvasProps {
  // ISTNIEJĄCE
  gridMetadata: GridMetadataDto;
  cells: GridCellDto[];
  currentTool: EditorTool;
  focusedCell: CellPosition | null;
  onFocusChange: (cell: CellPosition | null) => void;
  
  // NOWE
  selectedArea: CellSelection | null;
  onSelectionChange: (selection: CellSelection | null) => void;
  onSelectionComplete: () => void; // callback gdy zaznaczenie zakończone
}
```

### 4.2. SelectionOverlay (NOWY)

**Opis:**
Komponent wizualizujący zaznaczony prostokątny obszar na siatce. Renderowany jako absolute positioned div nad GridCanvas.

**Główne elementy:**
- `<div className="absolute pointer-events-none border-2 border-primary bg-primary/10">` - semi-transparent overlay
- `<span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-1">` - badge z wymiarami (np. "5×3")

**Obsługiwane zdarzenia:**
- Brak (pointer-events-none, tylko wizualizacja)

**Walidacja:**
- Brak (komponent tylko renderuje, walidacja w GridCanvas)

**Typy:**
- `CellSelection` - współrzędne obszaru
- `number` - rozmiar pojedynczej komórki w px (do obliczeń pozycji)

**Propsy:**
```typescript
interface SelectionOverlayProps {
  selection: CellSelection;
  cellSizePx: number; // rozmiar komórki w pikselach na ekranie
  gapPx: number; // odstęp między komórkami (gap w CSS Grid)
  gridOffsetX: number; // offset canvas (dla scroll + padding kontenera)
  gridOffsetY: number;
}
```

**Style (obliczane dynamicznie):**
```typescript
// UWAGA: Musi uwzględniać gap między komórkami i padding kontenera!
const width = selection.x2 - selection.x1 + 1;
const height = selection.y2 - selection.y1 + 1;

const style = {
  left: `${selection.x1 * (cellSizePx + gapPx) + gridOffsetX}px`,
  top: `${selection.y1 * (cellSizePx + gapPx) + gridOffsetY}px`,
  width: `${width * cellSizePx + (width - 1) * gapPx}px`,
  height: `${height * cellSizePx + (height - 1) * gapPx}px`,
};
```

### 4.3. AreaTypePanel (NOWY)

**Opis:**
Floating panel wyświetlany nad GridCanvas gdy jest aktywne zaznaczenie. Zawiera selektor typu komórek i przycisk do zastosowania zmiany.

**Główne elementy:**
- `<div className="absolute top-4 right-4 bg-background border rounded-lg shadow-lg p-4">` - floating card
- `<div className="text-sm text-muted-foreground mb-2">` - info o zaznaczeniu (np. "Zaznaczono 15 komórek")
- `<Select>` - dropdown z typami (shadcn/ui)
  - Option: "Ziemia" (soil)
  - Option: "Ścieżka" (path)
  - Option: "Woda" (water)
  - Option: "Zabudowa" (building)
- `<Button onClick={handleApply} disabled={!selectedType || isApplying}>` - przycisk "Zastosuj"
- `<Button variant="ghost" onClick={handleCancel}>` - przycisk "Anuluj"

**Obsługiwane zdarzenia:**
- `onTypeChange(type: GridCellType)` - zmiana wybranego typu w select
- `onApply()` - kliknięcie "Zastosuj" → wywołanie setAreaType
- `onCancel()` - kliknięcie "Anuluj" → czyszczenie zaznaczenia

**Walidacja:**
- Przycisk "Zastosuj" disabled gdy:
  - `!selectedType` (nie wybrano typu)
  - `isApplying` (trwa operacja)
  - `!selection` (brak zaznaczenia - ale wtedy panel nie jest renderowany)

**Typy:**
- `CellSelection` - zaznaczony obszar
- `GridCellType | null` - wybrany typ
- `boolean` - stan ładowania

**Propsy:**
```typescript
interface AreaTypePanelProps {
  selection: CellSelection;
  cellCount: number; // liczba komórek w zaznaczeniu
  onApply: (type: GridCellType) => Promise<void>;
  onCancel: () => void;
  isApplying: boolean;
}
```

### 4.4. AreaTypeConfirmDialog (NOWY)

**Opis:**
Modal potwierdzenia wyświetlany gdy zmiana typu obszaru usunie rośliny (obsługa błędu 409 Conflict z API). Wykorzystuje `AlertDialog` z shadcn/ui.

**Główne elementy:**
- `<AlertDialog open={isOpen}>` - modal container
- `<AlertDialogContent>`
  - `<AlertDialogHeader>`
    - `<AlertDialogTitle>` - "Usunąć rośliny?"
    - `<AlertDialogDescription>` - "Zmiana typu usunie {plantsCount} roślin z zaznaczonego obszaru. Czy chcesz kontynuować?"
  - `<AlertDialogFooter>`
    - `<AlertDialogCancel onClick={onCancel}>` - "Anuluj"
    - `<AlertDialogAction onClick={onConfirm}>` - "Potwierdź i usuń"

**Obsługiwane zdarzenia:**
- `onConfirm()` - potwierdzenie → wywołanie setAreaType z `confirm_plant_removal=true`
- `onCancel()` - anulowanie → zamknięcie dialogu, anulowanie operacji

**Walidacja:**
- Brak (tylko potwierdzenie akcji)

**Typy:**
- `CellSelection` - obszar do zmiany
- `GridCellType` - docelowy typ
- `number` - liczba roślin do usunięcia

**Propsy:**
```typescript
interface AreaTypeConfirmDialogProps {
  isOpen: boolean;
  plantsCount: number;
  area: CellSelection;
  targetType: GridCellType;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

## 5. Typy

### 5.1. Istniejące typy (z src/types.ts)

Wykorzystujemy istniejące typy bez zmian:

```typescript
// Enum typu komórki
export type GridCellType = "soil" | "path" | "water" | "building";

// Zaznaczenie obszaru
export interface CellSelection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Komenda zmiany typu obszaru
export interface GridAreaTypeCommand {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: GridCellType;
  confirm_plant_removal?: boolean;
}

// Wynik operacji zmiany typu
export interface GridAreaTypeResultDto {
  affected_cells: number;
  removed_plants: number;
}

// Stan edytora (ISTNIEJĄCY)
export interface EditorState {
  currentTool: EditorTool;
  selectedArea: CellSelection | null;
  focusedCell: CellPosition | null;
  hasUnsavedChanges: boolean;
  clipboardArea: CellSelection | null;
}
```

### 5.2. Nowe ViewModels

Dodajemy nowe typy do `src/types.ts`:

```typescript
/**
 * Informacje o zaznaczonym obszarze (derived state)
 */
export interface SelectionInfo {
  selection: CellSelection;
  cellCount: number; // (x2 - x1 + 1) * (y2 - y1 + 1)
  width: number; // x2 - x1 + 1
  height: number; // y2 - y1 + 1
}

/**
 * Stan operacji zmiany typu (dla obsługi 409 confirmation flow)
 */
export interface AreaTypeOperation {
  selection: CellSelection;
  targetType: GridCellType;
  plantsCount: number; // z odpowiedzi 409
  requiresConfirmation: true;
}

/**
 * Opcje wywołania setAreaType
 */
export interface SetAreaTypeOptions {
  selection: CellSelection;
  type: GridCellType;
  confirmPlantRemoval?: boolean;
}
```

### 5.3. Etykiety typów (dla UI)

Dodajemy helper do tłumaczenia typów na czytelne nazwy:

```typescript
export const GRID_CELL_TYPE_LABELS: Record<GridCellType, string> = {
  soil: "Ziemia",
  path: "Ścieżka",
  water: "Woda",
  building: "Zabudowa",
};
```

## 6. Zarządzanie stanem

### 6.1. Rozszerzenie useGridEditor (ISTNIEJĄCY HOOK)

Hook `useGridEditor` (w `src/lib/hooks/useGridEditor.ts`) jest rozszerzany o nowe akcje i derived state:

**Nowe akcje:**
```typescript
interface UseGridEditorActions {
  // ISTNIEJĄCE (bez zmian)
  setTool: (tool: EditorTool) => void;
  focusCell: (position: CellPosition | null) => void;
  updatePlan: (command: PlanUpdateCommand, confirmRegenerate?: boolean) => Promise<void>;
  
  // NOWE
  selectArea: (selection: CellSelection | null) => void;
  clearSelection: () => void;
  setAreaType: (type: GridCellType) => Promise<void>;
}
```

**Nowy derived state:**
```typescript
interface UseGridEditorDerived {
  // ISTNIEJĄCE
  selectedCellsCount: number;
  plantsInSelection: PlantPlacementDto[];
  canAddPlant: boolean;
  
  // NOWE
  selectionInfo: SelectionInfo | null; // obliczone z selectedArea
  hasActiveSelection: boolean; // selectedArea !== null
}
```

**Implementacja `setAreaType`:**
```typescript
const setAreaType = async (type: GridCellType) => {
  if (!state.selectedArea) return;
  
  try {
    const result = await setAreaTypeMutation.mutateAsync({
      planId,
      command: {
        x1: state.selectedArea.x1,
        y1: state.selectedArea.y1,
        x2: state.selectedArea.x2,
        y2: state.selectedArea.y2,
        type,
        confirm_plant_removal: false,
      },
    });
    
    // Sukces
    toast.success(`Zmieniono typ ${result.affected_cells} komórek`);
    
    // Event analytics
    sendAnalyticsEvent({
      event_type: "area_typed",
      plan_id: planId,
      attributes: {
        area: state.selectedArea,
        type,
        affected_cells: result.affected_cells,
        removed_plants: result.removed_plants,
      },
    });
    
    // Wyczyść zaznaczenie
    clearSelection();
    
  } catch (error) {
    if (error.status === 409) {
      // Obsługa w useAreaTypeWithConfirmation
      throw error;
    }
    // Inne błędy
    toast.error("Nie udało się zmienić typu komórek");
  }
};
```

### 6.2. useGridSelection (NOWY HOOK)

Hook zarządzający logiką drag-to-select. Plik: `src/lib/hooks/useGridSelection.ts`

**Interfejs:**
```typescript
interface UseGridSelectionProps {
  gridWidth: number;
  gridHeight: number;
  enabled: boolean; // aktywny tylko gdy currentTool === 'select'
  onSelectionChange: (selection: CellSelection | null) => void;
  onSelectionComplete?: () => void; // callback po zakończeniu zaznaczania
}

interface UseGridSelectionReturn {
  isDragging: boolean;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  cancelSelection: () => void;
}
```

**Logika:**
1. `startSelection(x, y)` - zapisuje punkt początkowy, ustawia isDragging=true
2. `updateSelection(x, y)` - oblicza CellSelection z korekją kolejności współrzędnych
3. `endSelection()` - ustawia isDragging=false, wywołuje onSelectionComplete
4. `cancelSelection()` - czyści zaznaczenie, ustawia isDragging=false

**Obsługa klawiatury:**
- Integracja z `useKeyboardNavigation` (ISTNIEJĄCY)
- Spacja - start selection z focusedCell
- Shift + Arrows - update selection
- Enter - end selection
- Escape - cancel selection

### 6.3. useAreaTypeWithConfirmation (NOWY HOOK)

Hook wysokopoziomowy zarządzający całym flow zmiany typu z obsługą 409 confirmation. Plik: `src/lib/hooks/useAreaTypeWithConfirmation.ts`

**Interfejs:**
```typescript
interface UseAreaTypeWithConfirmationProps {
  planId: string;
  onSuccess?: (result: GridAreaTypeResultDto) => void;
}

interface UseAreaTypeWithConfirmationReturn {
  setAreaType: (options: SetAreaTypeOptions) => Promise<void>;
  isLoading: boolean;
  pendingOperation: AreaTypeOperation | null; // dla dialogu
  confirmOperation: () => Promise<void>;
  cancelOperation: () => void;
}
```

**Logika:**
```typescript
const setAreaType = async ({ selection, type, confirmPlantRemoval = false }) => {
  try {
    const result = await setAreaTypeMutation.mutateAsync({
      planId,
      command: { ...selection, type, confirm_plant_removal: confirmPlantRemoval },
    });
    
    // Sukces
    onSuccess?.(result);
    
  } catch (error) {
    if (error.status === 409) {
      // Parsuj liczbę roślin z error message
      const plantsCount = extractPlantsCountFromError(error);
      
      // Zapisz pending operation
      setPendingOperation({
        selection,
        targetType: type,
        plantsCount,
        requiresConfirmation: true,
      });
      
      // Dialog otworzy się automatycznie (pendingOperation !== null)
    } else {
      throw error; // inne błędy propagujemy wyżej
    }
  }
};

const confirmOperation = async () => {
  if (!pendingOperation) return;
  
  await setAreaType({
    selection: pendingOperation.selection,
    type: pendingOperation.targetType,
    confirmPlantRemoval: true,
  });
  
  setPendingOperation(null); // zamknij dialog
};

const cancelOperation = () => {
  setPendingOperation(null); // zamknij dialog
};
```

## 7. Integracja API

### 7.1. Endpoint: POST /api/plans/:plan_id/grid/area-type

**Opis:**
Zmiana typu prostokątnego obszaru komórek siatki. Jeśli w obszarze znajdują się rośliny i `confirm_plant_removal=false`, zwraca błąd 409 Conflict.

**Request:**
```typescript
// Path param
planId: string

// Body (GridAreaTypeCommand)
{
  x1: number;          // 0 <= x1 < grid_width
  y1: number;          // 0 <= y1 < grid_height
  x2: number;          // x1 <= x2 < grid_width
  y2: number;          // y1 <= y2 < grid_height
  type: GridCellType;  // "soil" | "path" | "water" | "building"
  confirm_plant_removal?: boolean; // default: false
}
```

**Response 200 OK:**
```typescript
// Body (ApiItemResponse<GridAreaTypeResultDto>)
{
  data: {
    affected_cells: number;  // liczba zmienionych komórek
    removed_plants: number;  // liczba usuniętych roślin
  }
}
```

**Response 409 Conflict:**
```typescript
// Body (ApiErrorResponse)
{
  error: {
    code: "Conflict",
    message: "There are 4 plant(s) in the selected area. Set confirm_plant_removal=true to proceed.",
    details: {
      field_errors: {
        requires_confirmation: "true"
      }
    }
  }
}
```

**Inne błędy:**
- 400 Bad Request - nieprawidłowe parametry (x1 > x2, błędny typ)
- 401 Unauthorized - brak sesji
- 403 Forbidden - plan należy do innego użytkownika
- 404 Not Found - plan nie istnieje
- 422 Unprocessable Entity - współrzędne poza granicami siatki

**Mutation (React Query):**

Wykorzystujemy istniejącą mutation `useSetAreaType` (jeśli istnieje) lub tworzymy nową w `src/lib/hooks/mutations/useSetAreaType.ts`:

```typescript
interface UseSetAreaTypeParams {
  planId: string;
  command: GridAreaTypeCommand;
}

export function useSetAreaType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planId, command }: UseSetAreaTypeParams) => {
      const response = await fetch(`/api/plans/${planId}/grid/area-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { status: response.status, ...error };
      }
      
      const result: ApiItemResponse<GridAreaTypeResultDto> = await response.json();
      return result.data;
    },
    onSuccess: (_, { planId }) => {
      // Invalidate grid cells i plants
      queryClient.invalidateQueries({ queryKey: ["gridCells", planId] });
      queryClient.invalidateQueries({ queryKey: ["plants", planId] });
    },
  });
}
```

### 7.2. Analytics Event

Po sukcesie operacji wysyłamy event `area_typed`:

**Endpoint:** POST /api/analytics/events

**Request:**
```typescript
{
  event_type: "area_typed",
  plan_id: string,
  attributes: {
    area: {
      x1: number,
      y1: number,
      x2: number,
      y2: number
    },
    type: GridCellType,
    affected_cells: number,
    removed_plants: number
  }
}
```

Wykorzystujemy istniejący hook `useAnalyticsEvents` lub dodajemy metodę `trackAreaTyped`.

## 8. Interakcje użytkownika

### 8.1. Scenariusz: Zaznaczanie obszaru myszką

**Kroki:**
1. Użytkownik ma wybrany tool "select" w EditorToolbar
2. Użytkownik klika na komórkę (5, 3) na GridCanvas
   - Event: `onMouseDown(5, 3)`
   - Akcja: `startSelection(5, 3)`
   - Stan: `isDragging = true`, `selectedArea = { x1: 5, y1: 3, x2: 5, y2: 3 }`
3. Użytkownik przeciąga mysz do komórki (8, 7), trzymając przycisk
   - Event: `onMouseMove` → `onMouseEnter(8, 7)` na kolejnych komórkach
   - Akcja: `updateSelection(8, 7)` (throttled co ~50ms)
   - Stan: `selectedArea = { x1: 5, y1: 3, x2: 8, y2: 7 }`
4. `SelectionOverlay` renderuje się na bieżąco, pokazując zaznaczony obszar 4×5
5. Użytkownik puszcza przycisk myszy
   - Event: `onMouseUp()`
   - Akcja: `endSelection()`
   - Stan: `isDragging = false`
6. `AreaTypePanel` pojawia się nad canvas (floating)

**Rezultat:**
- Zaznaczono obszar 4×5 komórek (20 komórek)
- Panel wyboru typu jest aktywny

### 8.2. Scenariusz: Zaznaczanie klawiaturą

**Kroki:**
1. Użytkownik ma tool "select" aktywny
2. Użytkownik nawiguje strzałkami do komórki (5, 3)
   - Stan: `focusedCell = { x: 5, y: 3 }`
3. Użytkownik naciska **Spację**
   - Event: `onKeyDown(Space)`
   - Akcja: `startSelection(5, 3)`
   - Stan: `selectedArea = { x1: 5, y1: 3, x2: 5, y2: 3 }`
4. Użytkownik naciska **Shift + Arrow Right** (3 razy)
   - Event: `onKeyDown(Shift+ArrowRight)`
   - Akcja: `focusCell({ x: 6, y: 3 })`, następnie `updateSelection(6, 3)`, itd.
   - Stan: `focusedCell = { x: 8, y: 3 }`, `selectedArea = { x1: 5, y1: 3, x2: 8, y2: 3 }`
5. Użytkownik naciska **Shift + Arrow Down** (4 razy)
   - Stan: `selectedArea = { x1: 5, y1: 3, x2: 8, y2: 7 }`
6. Użytkownik naciska **Enter**
   - Event: `onKeyDown(Enter)`
   - Akcja: `endSelection()`
7. `AreaTypePanel` pojawia się

**Rezultat:**
- Zaznaczono ten sam obszar 4×5 komórek (20 komórek)

### 8.3. Scenariusz: Zmiana typu bez roślin (sukces 200)

**Kroki:**
1. Użytkownik ma zaznaczony obszar (20 komórek)
2. `AreaTypePanel` jest widoczny
3. Użytkownik otwiera dropdown i wybiera "Woda" (water)
   - Event: `onTypeChange('water')`
   - Stan: `selectedType = 'water'`
4. Użytkownik klika przycisk "Zastosuj"
   - Event: `onClick` na ApplyButton
   - Akcja: `setAreaType('water')`
   - Stan: `isApplying = true`
5. Request: `POST /api/plans/:id/grid/area-type` z body:
   ```json
   {
     "x1": 5, "y1": 3, "x2": 8, "y2": 7,
     "type": "water",
     "confirm_plant_removal": false
   }
   ```
6. Response 200:
   ```json
   {
     "data": {
       "affected_cells": 20,
       "removed_plants": 0
     }
   }
   ```
7. Akcje po sukcesie:
   - Toast: "Zmieniono typ 20 komórek"
   - Analytics event: `area_typed`
   - Invalidate queries: `gridCells`, `plants`
   - `clearSelection()` → AreaTypePanel znika
   - Stan: `selectedArea = null`, `isApplying = false`

**Rezultat:**
- 20 komórek zmieniło typ na "water"
- Siatka odświeżyła się (React Query refetch)
- Zaznaczenie wyczyszczone

### 8.4. Scenariusz: Zmiana typu z roślinami (konflikt 409)

**Kroki:**
1-4. Jak w scenariuszu 8.3
5. Request: `POST /api/plans/:id/grid/area-type` (j.w.)
6. Response 409 Conflict:
   ```json
   {
     "error": {
       "code": "Conflict",
       "message": "There are 4 plant(s) in the selected area. Set confirm_plant_removal=true to proceed.",
       "details": {
         "field_errors": {
           "requires_confirmation": "true"
         }
       }
     }
   }
   ```
7. Akcje w `useAreaTypeWithConfirmation`:
   - Parsowanie liczby roślin z message (4)
   - Stan: `pendingOperation = { selection: {...}, targetType: 'water', plantsCount: 4, requiresConfirmation: true }`
   - Stan: `isApplying = false`
8. `AreaTypeConfirmDialog` otwiera się automatycznie (pendingOperation !== null)
9. Dialog wyświetla:
   - Tytuł: "Usunąć rośliny?"
   - Opis: "Zmiana typu usunie 4 rośliny z zaznaczonego obszaru. Czy chcesz kontynuować?"
   - Przyciski: "Anuluj" | "Potwierdź i usuń"

**Ścieżka A - Użytkownik klika "Anuluj":**
10. Event: `onClick` na AlertDialogCancel
11. Akcja: `cancelOperation()`
12. Stan: `pendingOperation = null`
13. Dialog zamyka się
14. Zaznaczenie pozostaje aktywne (user może zmienić typ na inny)

**Ścieżka B - Użytkownik klika "Potwierdź i usuń":**
10. Event: `onClick` na AlertDialogAction
11. Akcja: `confirmOperation()`
12. Request: `POST /api/plans/:id/grid/area-type` z body:
    ```json
    {
      "x1": 5, "y1": 3, "x2": 8, "y2": 7,
      "type": "water",
      "confirm_plant_removal": true
    }
    ```
13. Response 200:
    ```json
    {
      "data": {
        "affected_cells": 20,
        "removed_plants": 4
      }
    }
    ```
14. Akcje po sukcesie:
    - Toast: "Zmieniono typ 20 komórek i usunięto 4 rośliny"
    - Analytics event: `area_typed`
    - Invalidate queries
    - `clearSelection()`
    - Stan: `pendingOperation = null`, dialog zamyka się

**Rezultat (ścieżka B):**
- 20 komórek zmieniło typ na "water"
- 4 rośliny zostały usunięte
- Siatka odświeżyła się

### 8.5. Scenariusz: Anulowanie zaznaczenia

**Kroki:**
1. Użytkownik ma aktywne zaznaczenie
2. Użytkownik naciska **Escape** LUB klika przycisk "Anuluj" w AreaTypePanel
   - Event: `onKeyDown(Escape)` lub `onClick` na CancelButton
   - Akcja: `clearSelection()`
   - Stan: `selectedArea = null`
3. `SelectionOverlay` znika
4. `AreaTypePanel` znika

**Rezultat:**
- Zaznaczenie wyczyszczone, siatka bez zmian

## 9. Warunki i walidacja

### 9.1. Walidacja zaznaczenia (GridCanvas + useGridSelection)

**Warunki:**
- **W granicach siatki:** `0 <= x1, x2 < grid_width` oraz `0 <= y1, y2 < grid_height`
- **Poprawna kolejność:** `x1 <= x2` i `y1 <= y2`
- **Minimalna wielkość:** Przynajmniej jedna komórka (nie może być puste zaznaczenie)

**Wpływ na UI:**
- **useGridSelection** automatycznie koryguje kolejność współrzędnych podczas drag:
  ```typescript
  const x1 = Math.min(startX, currentX);
  const x2 = Math.max(startX, currentX);
  const y1 = Math.min(startY, currentY);
  const y2 = Math.max(startY, currentY);
  ```
- Współrzędne poza granicami są clamped do zakresu `[0, grid_width - 1]` i `[0, grid_height - 1]`
- Jeśli po clamping zaznaczenie jest puste, nie tworzymy CellSelection

**Komponenty dotknięte:**
- `GridCanvas` - walidacja podczas mouse events
- `useGridSelection` - normalizacja współrzędnych

### 9.2. Walidacja przed wysłaniem (AreaTypePanel)

**Warunki:**
- `selectedArea !== null`
- `selectedType !== null` (użytkownik wybrał typ z dropdown)
- `!isApplying` (nie trwa już inna operacja)

**Wpływ na UI:**
- Przycisk "Zastosuj" ma `disabled={!selectedType || isApplying}`
- Jeśli `isApplying`, przycisk pokazuje spinner i tekst "Zastosowanie..."

**Komponenty dotknięte:**
- `AreaTypePanel` - disabled state przycisku

### 9.3. Walidacja backend (API)

**Warunki weryfikowane przez backend:**
- Współrzędne w granicach: `0 <= x1 <= x2 < grid_width`, `0 <= y1 <= y2 < grid_height`
- Typ należy do dozwolonych wartości: `soil | path | water | building`
- Plan istnieje i należy do użytkownika
- Jeśli `confirm_plant_removal=false` i są rośliny w obszarze → zwróć 409

**Mapowanie błędów na UI:**
- **400 Bad Request** → Toast: "Nieprawidłowe parametry zaznaczenia"
- **422 Unprocessable Entity** → Toast: "Współrzędne poza granicami siatki"
- **409 Conflict** → Otwórz `AreaTypeConfirmDialog`
- **404 Not Found** → Redirect do `/plans` z komunikatem "Plan nie istnieje"
- **500 Internal Error** → Toast: "Wystąpił błąd. Spróbuj ponownie"

**Komponenty dotknięte:**
- `useAreaTypeWithConfirmation` - obsługa błędów z mutation

### 9.4. Walidacja narzędzia (EditorToolbar)

**Warunki:**
- Zaznaczanie obszaru możliwe tylko gdy `currentTool === 'select'`
- Gdy wybrany inny tool (np. `add_plant`), istniejące zaznaczenie pozostaje, ale nie można go rozszerzać

**Wpływ na UI:**
- `useGridSelection` ma prop `enabled = currentTool === 'select'`
- Gdy `!enabled`, mouse events na GridCanvas nie wywołują `startSelection`/`updateSelection`

**Komponenty dotknięte:**
- `GridCanvas` - conditional event handling
- `useGridSelection` - enabled flag

## 10. Obsługa błędów

### 10.1. Błąd 409 Conflict - Rośliny w obszarze

**Scenariusz:**
API zwraca 409 gdy w zaznaczonym obszarze znajdują się rośliny i `confirm_plant_removal=false`.

**Obsługa:**
1. `useAreaTypeWithConfirmation` catch'uje błąd 409
2. Parsuje liczbę roślin z `error.message` (regex: `/(\d+) plant\(s\)/`)
3. Ustawia `pendingOperation` z danymi dla dialogu
4. `AreaTypeConfirmDialog` renderuje się automatycznie (controlled przez `isOpen={pendingOperation !== null}`)
5. User ma wybór:
   - **Anuluj** → `cancelOperation()` → `pendingOperation = null` → dialog zamyka się
   - **Potwierdź** → `confirmOperation()` → retry z `confirm_plant_removal=true`

**Komponenty:**
- `useAreaTypeWithConfirmation` - logika
- `AreaTypeConfirmDialog` - UI

### 10.2. Błąd 400/422 - Nieprawidłowe parametry

**Scenariusz:**
Błąd walidacji backend (np. współrzędne poza granicami, błędny typ).

**Obsługa:**
1. Catch w mutation `useSetAreaType`
2. Toast error: "Nieprawidłowe parametry zaznaczenia"
3. Opcjonalnie: log do konsoli w dev mode
4. Zaznaczenie pozostaje (user może je skorygować)

**Komponenty:**
- `useAreaTypeWithConfirmation` - error handling
- Toast notification (globalna)

### 10.3. Błąd 404 - Plan nie istnieje

**Scenariusz:**
Plan został usunięty przez inną sesję lub URL manipulacja.

**Obsługa:**
1. Catch w mutation
2. Redirect do `/plans` z toast: "Plan nie istnieje"
3. Możliwe przez `window.location.href = '/plans'` lub `navigate('/plans')` z Astro

**Komponenty:**
- Global error handler w `useSetAreaType` mutation

### 10.4. Błąd 401 - Sesja wygasła

**Scenariusz:**
Token sesji wygasł podczas pracy w edytorze.

**Obsługa:**
1. Global interceptor w React Query (onError)
2. Wyświetlenie `SessionExpiredModal` (z `.ai/docs/ui-plan.md`)
3. Opcje: "Zaloguj ponownie" lub "Wyloguj"
4. Po relogowaniu: retry mutation

**Komponenty:**
- Global error boundary/interceptor
- `SessionExpiredModal` (ISTNIEJĄCY)

### 10.5. Błąd 500 - Błąd serwera

**Scenariusz:**
Nieoczekiwany błąd serwera lub bazy danych.

**Obsługa:**
1. Toast error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie"
2. Button "Ponów" w toaście → retry mutation
3. Zaznaczenie pozostaje (nie tracimy stanu)
4. Log do konsoli/Sentry w production

**Komponenty:**
- Global error handler
- Retry mechanism w React Query

### 10.6. Błąd sieciowy - Offline

**Scenariusz:**
Utrata połączenia z internetem.

**Obsługa:**
1. React Query automatyczny retry z exponential backoff (1s, 2s, 4s)
2. Toast persistent: "Brak połączenia z internetem"
3. Disabled state przycisków akcji
4. Po przywróceniu połączenia (window `online` event) → auto retry

**Komponenty:**
- React Query retry config
- Global network status listener

### 10.7. Race condition - Concurrent edits

**Scenariusz:**
Dwie sesje edytują ten sam obszar równocześnie.

**Obsługa:**
1. Backend używa row-level locks w DB (optimistic locking)
2. Jeśli konflikt, zwróć 409 lub 500
3. UI: Toast "Nie udało się zapisać zmian. Odśwież stronę"
4. Możliwe: Refetch danych przed ponowną próbą

**Komponenty:**
- Backend (DB transactions)
- UI error handling

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów i struktur

**Czas:** 30 min

**Zadania:**
1. Dodać nowe ViewModels do `src/types.ts`:
   - `SelectionInfo`
   - `AreaTypeOperation`
   - `SetAreaTypeOptions`
   - `GRID_CELL_TYPE_LABELS`
2. Zweryfikować istniejące typy: `GridAreaTypeCommand`, `GridAreaTypeResultDto`, `CellSelection`

**Pliki:**
- `src/types.ts`

### Krok 2: Utworzenie mutation useSetAreaType

**Czas:** 45 min

**Zadania:**
1. Utworzyć (lub zweryfikować istniejący) `src/lib/hooks/mutations/useSetAreaType.ts`
2. Zaimplementować mutation z obsługą błędów
3. Dodać invalidation queries: `gridCells`, `plants`
4. Dodać obsługę statusu 409 (throw error z parsed data)

**Pliki:**
- `src/lib/hooks/mutations/useSetAreaType.ts`
- `src/lib/hooks/mutations/index.ts` (export)

**Test:**
- Wywołać mutation ręcznie z mock data
- Zweryfikować że cache invalidation działa

### Krok 3: Utworzenie hooka useGridSelection

**Czas:** 1h

**Zadania:**
1. Utworzyć `src/lib/hooks/useGridSelection.ts`
2. Zaimplementować stan: `isDragging`, `startPoint`, `currentPoint`
3. Zaimplementować akcje: `startSelection`, `updateSelection`, `endSelection`, `cancelSelection`
4. Dodać normalizację współrzędnych (min/max, clamping)
5. Dodać throttle dla `updateSelection` (50ms)
6. Dodać obsługę klawiatury (integracja z `useKeyboardNavigation`)

**Pliki:**
- `src/lib/hooks/useGridSelection.ts`

**Test:**
- Testować zaznaczanie w różnych kierunkach (LTR, RTL, TTB, BTT)
- Testować clamping na granicach siatki
- Testować keyboard flow (Spacja, Shift+Arrows, Enter, Escape)

### Krok 4: Utworzenie hooka useAreaTypeWithConfirmation

**Czas:** 1h 15min

**Zadania:**
1. Utworzyć `src/lib/hooks/useAreaTypeWithConfirmation.ts`
2. Zaimplementować stan: `pendingOperation`, `isLoading`
3. Zaimplementować `setAreaType` z obsługą 409:
   - Try/catch mutation
   - Parsowanie liczby roślin z error message
   - Ustawienie `pendingOperation`
4. Zaimplementować `confirmOperation`:
   - Retry mutation z `confirm_plant_removal=true`
   - Clear `pendingOperation` po sukcesie
5. Zaimplementować `cancelOperation`:
   - Clear `pendingOperation`
6. Dodać callback `onSuccess` dla analytics event

**Pliki:**
- `src/lib/hooks/useAreaTypeWithConfirmation.ts`

**Test:**
- Mock mutation zwracająca 409
- Zweryfikować że `pendingOperation` jest ustawiane
- Zweryfikować retry z flagą confirmation

### Krok 5: Rozszerzenie useGridEditor

**Czas:** 45 min

**Zadania:**
1. Otworzyć `src/lib/hooks/useGridEditor.ts`
2. Dodać do actions:
   - `selectArea(selection: CellSelection | null)`
   - `clearSelection()`
   - `setAreaTypeForSelection(type: GridCellType)` - wrapper dla `useAreaTypeWithConfirmation.setAreaType`
3. Dodać do derived state:
   - `selectionInfo: SelectionInfo | null` - obliczone z `state.selectedArea`
   - `hasActiveSelection: boolean`

**Pliki:**
- `src/lib/hooks/useGridEditor.ts`

**Test:**
- Wywołać `selectArea` i zweryfikować że derived state `selectionInfo` się aktualizuje
- Wywołać `clearSelection` i zweryfikować że `hasActiveSelection = false`

### Krok 6: Utworzenie komponentu SelectionOverlay

**Czas:** 45 min

**Zadania:**
1. Utworzyć `src/components/editor/GridCanvas/SelectionOverlay.tsx`
2. Zaimplementować absolute positioned div z:
   - Border 2px primary
   - Background primary/10 (semi-transparent)
   - Pointer-events-none
3. Dodać badge z wymiarami w prawym górnym rogu (np. "5×3")
4. **KRYTYCZNE:** Obliczyć pozycję i rozmiar z uwzględnieniem gap i padding:
   ```typescript
   // Każda komórka zajmuje (cellSizePx + gapPx) przestrzeni
   left: selection.x1 * (cellSizePx + gapPx) + gridOffsetX
   top: selection.y1 * (cellSizePx + gapPx) + gridOffsetY
   // Rozmiar: width komórek + (width-1) gap między nimi
   width: width * cellSizePx + (width - 1) * gapPx
   height: height * cellSizePx + (height - 1) * gapPx
   ```

**Pliki:**
- `src/components/editor/GridCanvas/SelectionOverlay.tsx`

**Test:**
- Renderować z różnymi selection coordinates
- Zweryfikować że pozycja i rozmiar są poprawne

### Krok 7: Rozszerzenie GridCanvas o drag-to-select

**Czas:** 1h 30min

**Zadania:**
1. Otworzyć `src/components/editor/GridCanvas/GridCanvas.tsx`
2. Zintegrować `useGridSelection`:
   ```typescript
   const { isDragging, startSelection, updateSelection, endSelection, cancelSelection } 
     = useGridSelection({
       gridWidth: gridMetadata.grid_width,
       gridHeight: gridMetadata.grid_height,
       enabled: currentTool === 'select',
       onSelectionChange: (sel) => { /* update parent */ },
     });
   ```
3. Dodać event handlers:
   - `onMouseDown` na GridCell → `startSelection(x, y)` (gdy `currentTool === 'select'`)
   - `onMouseEnter` na GridCell → `updateSelection(x, y)` (gdy `isDragging`)
   - `onMouseUp` na kontenerze → `endSelection()`
   - `onMouseLeave` na kontenerze → `cancelSelection()`
4. Dodać renderowanie `SelectionOverlay` gdy `selectedArea !== null`:
   ```tsx
   {selectedArea && (
     <SelectionOverlay
       selection={selectedArea}
       cellSizePx={CELL_SIZE_PX}
       gapPx={GAP_PX}
       gridOffsetX={CONTAINER_PADDING_PX}
       gridOffsetY={CONTAINER_PADDING_PX}
     />
   )}
   ```
5. Dodać integrację z keyboard navigation (Spacja, Shift+Arrows, Enter, Escape)

**Pliki:**
- `src/components/editor/GridCanvas/GridCanvas.tsx`

**Test:**
- Zaznaczać obszary myszką w różnych kierunkach
- Zweryfikować że overlay renderuje się poprawnie
- Testować keyboard flow

### Krok 8: Utworzenie komponentu AreaTypePanel

**Czas:** 1h

**Zadania:**
1. Utworzyć `src/components/editor/AreaTypePanel.tsx`
2. Zaimplementować floating panel z:
   - Info o zaznaczeniu: "Zaznaczono X komórek (WxH)"
   - `<Select>` z opcjami typów (użyć `GRID_CELL_TYPE_LABELS`)
   - Przycisk "Zastosuj" (disabled gdy `!selectedType || isApplying`)
   - Przycisk "Anuluj"
3. Dodać state: `selectedType: GridCellType | null`
4. Dodać handlers:
   - `onTypeChange(type)` → update `selectedType`
   - `onApply()` → wywołać `props.onApply(selectedType)`
   - `onCancel()` → wywołać `props.onCancel()`
5. Stylowanie:
   - Absolute positioned: `top-4 right-4`
   - Card z shadow: `bg-background border rounded-lg shadow-lg p-4`
   - Responsywność: na małych ekranach przenieść do bottom sheet?

**Pliki:**
- `src/components/editor/AreaTypePanel.tsx`

**Test:**
- Renderować z mock selection
- Testować zmianę typu i kliknięcie "Zastosuj"
- Zweryfikować disabled states

### Krok 9: Utworzenie komponentu AreaTypeConfirmDialog

**Czas:** 45 min

**Zadania:**
1. Utworzyć `src/components/editor/modals/AreaTypeConfirmDialog.tsx`
2. Użyć `AlertDialog` z shadcn/ui
3. Zaimplementować:
   - `<AlertDialogTitle>`: "Usunąć rośliny?"
   - `<AlertDialogDescription>`: "Zmiana typu usunie {plantsCount} roślin..."
   - `<AlertDialogCancel>`: "Anuluj" → `props.onCancel()`
   - `<AlertDialogAction>`: "Potwierdź i usuń" → `props.onConfirm()`
4. Controlled przez prop `isOpen` (= `pendingOperation !== null`)

**Pliki:**
- `src/components/editor/modals/AreaTypeConfirmDialog.tsx`

**Test:**
- Renderować z mock data (plantsCount=4)
- Testować kliknięcia na obu przyciskach

### Krok 10: Integracja w EditorLayout

**Czas:** 1h

**Zadania:**
1. Otworzyć `src/components/editor/EditorLayout.tsx`
2. Zintegrować `useAreaTypeWithConfirmation`:
   ```typescript
   const { setAreaType, isLoading, pendingOperation, confirmOperation, cancelOperation }
     = useAreaTypeWithConfirmation({
       planId,
       onSuccess: (result) => {
         toast.success(`Zmieniono typ ${result.affected_cells} komórek`);
         // Send analytics event
         sendAnalyticsEvent({ ... });
         // Clear selection
         actions.clearSelection();
       },
     });
   ```
3. Przekazać odpowiednie propsy do komponentów:
   - `GridCanvas`: `selectedArea`, `onSelectionChange`, `onSelectionComplete`
   - `AreaTypePanel`: `selection`, `cellCount`, `onApply={setAreaType}`, `onCancel={actions.clearSelection}`, `isApplying={isLoading}`
   - `AreaTypeConfirmDialog`: `isOpen={!!pendingOperation}`, `plantsCount={pendingOperation?.plantsCount}`, `onConfirm={confirmOperation}`, `onCancel={cancelOperation}`
4. Conditional rendering:
   - `AreaTypePanel` tylko gdy `hasActiveSelection && currentTool === 'select'`
   - `AreaTypeConfirmDialog` zawsze (controlled przez `isOpen`)

**Pliki:**
- `src/components/editor/EditorLayout.tsx`

**Test:**
- End-to-end flow: zaznacz → wybierz typ → zastosuj
- Testować sukces 200
- Testować konflikt 409 → dialog → confirm

### Krok 11: Dodanie analytics event

**Czas:** 30 min

**Zadania:**
1. Otworzyć `src/lib/hooks/useAnalyticsEvents.ts` (lub utworzyć jeśli nie istnieje)
2. Dodać metodę `trackAreaTyped`:
   ```typescript
   trackAreaTyped: (area: CellSelection, type: GridCellType, result: GridAreaTypeResultDto) => {
     sendEvent.mutate({
       event_type: "area_typed",
       plan_id: planId,
       attributes: {
         area: { x1: area.x1, y1: area.y1, x2: area.x2, y2: area.y2 },
         type,
         affected_cells: result.affected_cells,
         removed_plants: result.removed_plants,
       },
     });
   }
   ```
3. Wywołać w `onSuccess` callback w `useAreaTypeWithConfirmation`

**Pliki:**
- `src/lib/hooks/useAnalyticsEvents.ts`
- `src/components/editor/EditorLayout.tsx` (wywołanie)

**Test:**
- Wykonać operację area-type
- Zweryfikować w network tab że event został wysłany

### Krok 12: Stylowanie i UX polish

**Czas:** 1h

**Zadania:**
1. Dodać animacje:
   - Fade-in dla `SelectionOverlay` (transition opacity)
   - Slide-in dla `AreaTypePanel` (transition transform)
2. Dodać hover states:
   - GridCell ma lekki highlight gdy `currentTool === 'select' && !isDragging`
3. Dodać cursor styles:
   - `cursor: crosshair` na GridCanvas gdy `currentTool === 'select'`
   - `cursor: grabbing` gdy `isDragging`
4. Dodać loading spinners:
   - Spinner w przycisku "Zastosuj" gdy `isApplying`
5. Tooltips:
   - Tooltip na przyciskach w AreaTypePanel
   - Tooltip na SelectionOverlay badge (hover pokazuje szczegóły)

**Pliki:**
- `src/components/editor/GridCanvas/GridCanvas.tsx`
- `src/components/editor/GridCanvas/SelectionOverlay.tsx`
- `src/components/editor/AreaTypePanel.tsx`

### Krok 13: Accessibility

**Czas:** 45 min

**Zadania:**
1. Dodać ARIA labels:
   - GridCanvas: `aria-label="Siatka planu, naciśnij Spację aby zaznaczyć obszar"`
   - SelectionOverlay: `role="region"` `aria-label="Zaznaczony obszar: {width}×{height}"`
2. Focus management:
   - Po otwarciu `AreaTypePanel` fokus na dropdown
   - Po otwarciu `AreaTypeConfirmDialog` fokus na "Anuluj"
3. Screen reader announcements:
   - aria-live region w AreaTypePanel: "Zaznaczono X komórek"
4. Keyboard shortcuts description:
   - Tooltip w toolbar dla tool "select": "Spacja - zaznacz, Shift+Strzałki - rozszerz, Enter - potwierdź, Escape - anuluj"

**Pliki:**
- Wszystkie komponenty UI

### Krok 14: Testy manualne

**Czas:** 1h 30min

**Zadania:**
1. **Scenariusz 1:** Zaznacz obszar 5×3 myszką, zmień typ na "water", zweryfikuj sukces
2. **Scenariusz 2:** Zaznacz obszar klawiaturą (Spacja + Shift+Arrows), zmień typ na "path"
3. **Scenariusz 3:** Zaznacz obszar z roślinami, zmień typ na "building", zweryfikuj dialog 409, potwierdź
4. **Scenariusz 4:** Zaznacz obszar z roślinami, zmień typ, w dialogu kliknij "Anuluj"
5. **Scenariusz 5:** Zaznacz obszar, naciśnij Escape, zweryfikuj że zaznaczenie wyczyszczone
6. **Edge cases:**
   - Zaznacz cały obszar siatki (0,0) do (grid_width-1, grid_height-1)
   - Zaznacz pojedynczą komórkę (1×1)
   - Przeciągnij mysz poza granice canvas podczas zaznaczania
   - Zmień tool podczas aktywnego zaznaczania
   - Symuluj błąd 500 (mock network error)

**Checklist:**
- [ ] Drag-to-select działa we wszystkich kierunkach
- [ ] Keyboard selection działa poprawnie
- [ ] SelectionOverlay renderuje się w odpowiednim miejscu
- [ ] AreaTypePanel pokazuje poprawne wymiary
- [ ] Zmiana typu sukces 200 → toast + refresh
- [ ] Zmiana typu konflikt 409 → dialog → confirm → sukces
- [ ] Event analytics jest wysyłany
- [ ] Błędy są obsługiwane (toasty, dialogi)
- [ ] Accessibility: keyboard navigation, ARIA labels, focus management

### Krok 15: Dokumentacja i finalizacja

**Czas:** 30 min

**Zadania:**
1. Zaktualizować `grid-view-implementation-report.md`:
   - Dodać sekcję "US-009 i US-010: Zaznaczanie obszaru i przypisywanie typu"
   - Wymienić nowe komponenty i hooki
   - Zaktualizować status faz implementacji
2. Utworzyć changelog entry (jeśli używane):
   - "Added: Area selection and type assignment"
   - "Added: Conflict dialog for plant removal"
3. Code review checklist:
   - [ ] Wszystkie nowe pliki mają odpowiednie typy
   - [ ] Brak console.log (tylko w dev)
   - [ ] Error handling komplentny
   - [ ] Accessibility compliant
   - [ ] Testy manualne przeszły

**Pliki:**
- `.ai/implementations/views/grid-view-implementation-report.md`

---

## Podsumowanie implementacji

**Szacowany całkowity czas:** ~13-15 godzin (1 developer)

**Nowe pliki:** 8
- `src/lib/hooks/useGridSelection.ts`
- `src/lib/hooks/useAreaTypeWithConfirmation.ts`
- `src/lib/hooks/mutations/useSetAreaType.ts`
- `src/components/editor/GridCanvas/SelectionOverlay.tsx`
- `src/components/editor/AreaTypePanel.tsx`
- `src/components/editor/modals/AreaTypeConfirmDialog.tsx`
- `src/lib/hooks/useAnalyticsEvents.ts` (jeśli nie istnieje)

**Rozszerzone pliki:** 4
- `src/types.ts` - nowe ViewModels
- `src/lib/hooks/useGridEditor.ts` - nowe akcje
- `src/components/editor/GridCanvas/GridCanvas.tsx` - drag-to-select
- `src/components/editor/EditorLayout.tsx` - integracja

**Zależności:**
- Wszystkie istniejące zależności wystarczają (React Query, shadcn/ui, Tailwind)
- Brak potrzeby instalacji nowych pakietów

**Ryzyka:**
- Performance drag-to-select na dużych siatkach (>100×100) → throttle events, consider virtualization
- Race conditions przy concurrent edits → backend transaction handling
- Accessibility keyboard flow → dokładne testy z screen readerem

