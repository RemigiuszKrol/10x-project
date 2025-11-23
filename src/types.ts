import type { Enums, Tables } from "./db/database.types.ts";

/**
 * Alias'y do typów encji z bazy danych (Row)
 * Utrzymujemy bezpośrednie powiązanie DTO z modelami DB.
 */
export type DbProfile = Tables<"profiles">;
export type DbPlan = Tables<"plans">;
export type DbGridCell = Tables<"grid_cells">;
export type DbPlantPlacement = Tables<"plant_placements">;
export type DbWeatherMonthly = Tables<"weather_monthly">;
export type DbAnalyticsEvent = Tables<"analytics_events">;

/**
 * Alias'y do enumów z bazy
 */
export type UiTheme = Enums<"ui_theme">;
export type GridCellType = Enums<"grid_cell_type">;
export type AnalyticsEventType = Enums<"analytics_event_type">;

/**
 * Wspólne typy dla paginacji/odpowiedzi
 */
export type Cursor = string;
export type SortOrder = "asc" | "desc";

export interface PaginationQuery {
  limit?: number; // 1..100
  cursor?: Cursor;
}

export interface ApiListResponse<TItem> {
  data: TItem[];
  pagination: { next_cursor: Cursor | null };
}

export interface ApiItemResponse<TItem> {
  data: TItem;
}

export interface ApiErrorResponse {
  error: {
    code:
      | "ValidationError"
      | "Unauthorized"
      | "Forbidden"
      | "NotFound"
      | "Conflict"
      | "RateLimited"
      | "UpstreamTimeout"
      | "UnprocessableEntity"
      | "InternalError";
    message: string;
    details?: {
      field_errors?: Record<string, string>;
    };
  };
}

/**
 * 2.1 Profile
 */
export type ProfileDto = Pick<DbProfile, "id" | "language_code" | "theme" | "created_at" | "updated_at">;

// PUT /api/profile – aktualizacja preferencji; oba pola opcjonalne
export type ProfileUpdateCommand = Partial<Pick<DbProfile, "language_code" | "theme">>;

/**
 * 2.2 Plany działki (Plans)
 */
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

// POST /api/plans – dane wejściowe od klienta (bez user_id, id, grid_*)
// Używamy typów z DbPlan dla zachowania spójności; zawężamy nullability tam gdzie ma sens biznesowy.
export interface PlanCreateCommand {
  name: DbPlan["name"];
  latitude?: NonNullable<DbPlan["latitude"]>;
  longitude?: NonNullable<DbPlan["longitude"]>;
  width_cm: DbPlan["width_cm"];
  height_cm: DbPlan["height_cm"];
  cell_size_cm: DbPlan["cell_size_cm"];
  orientation: DbPlan["orientation"];
  hemisphere?: NonNullable<DbPlan["hemisphere"]>;
}

// PATCH /api/plans/:planId – częściowa aktualizacja
export type PlanUpdateCommand = Partial<PlanCreateCommand>;
export interface PlanUpdateQuery {
  // confirm_regenerate=true aby potwierdzić zmiany wpływające na wymiary siatki
  confirm_regenerate?: boolean;
}

/**
 * 2.3 Komórki siatki (GridCells)
 */
// GET /api/plans/:planId/grid – metadane siatki pochodzą bezpośrednio z planu
export type GridMetadataDto = Pick<PlanDto, "grid_width" | "grid_height" | "cell_size_cm" | "orientation">;

// GET /grid/cells – element listy
export type GridCellDto = Pick<DbGridCell, "x" | "y" | "type" | "updated_at">;

// Filtry zapytania listującego komórki
export type GridCellListQuery = PaginationQuery & {
  type?: GridCellType;
  // pojedyncza pozycja (x,y) LUB bbox
  x?: number;
  y?: number;
  // bbox w formacie [x1, y1, x2, y2]
  bbox?: [number, number, number, number];
};

// PUT /grid/cells/:x/:y – body
export type GridCellUpdateCommand = Pick<DbGridCell, "type">;

// POST /grid/area-type – body
export interface GridAreaTypeCommand {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: GridCellType;
  confirm_plant_removal?: boolean;
}

// POST /grid/area-type – wynik
export interface GridAreaTypeResultDto {
  affected_cells: number;
  removed_plants: number;
}

/**
 * 2.4 Nasadzenia (PlantPlacements)
 */
export type PlantPlacementDto = Pick<
  DbPlantPlacement,
  | "x"
  | "y"
  | "plant_name"
  | "sunlight_score"
  | "humidity_score"
  | "precip_score"
  | "overall_score"
  | "created_at"
  | "updated_at"
>;

export type PlantPlacementListQuery = PaginationQuery & {
  // prefiks/ILIKE po nazwie rośliny
  name?: string;
};

// PUT /plants/:x/:y – body
export interface PlantPlacementUpsertCommand {
  plant_name: DbPlantPlacement["plant_name"];
  sunlight_score?: NonNullable<DbPlantPlacement["sunlight_score"]>;
  humidity_score?: NonNullable<DbPlantPlacement["humidity_score"]>;
  precip_score?: NonNullable<DbPlantPlacement["precip_score"]>;
  overall_score?: NonNullable<DbPlantPlacement["overall_score"]>;
}

/**
 * 2.5 Pogoda miesięczna (WeatherMonthly)
 */
export type WeatherMonthlyDto = Pick<
  DbWeatherMonthly,
  "year" | "month" | "sunlight" | "humidity" | "precip" | "temperature" | "last_refreshed_at"
>;

export interface WeatherRefreshCommand {
  force?: boolean;
}

export interface WeatherRefreshResultDto {
  refreshed: boolean;
  months: number;
}

/**
 * 2.6 AI – wyszukiwanie i ocena dopasowania
 * Typy te nie mają bezpośredniej encji w DB, ale odnoszą się do planu/pozycji i plant_name.
 */
export interface PlantSearchCommand {
  query: string;
}

export interface PlantSearchCandidateDto {
  name: string;
  latin_name?: string;
  source: "ai";
}

export interface PlantSearchResultDto {
  candidates: PlantSearchCandidateDto[];
}

export interface PlantFitCommand {
  plan_id: DbPlan["id"];
  x: DbGridCell["x"];
  y: DbGridCell["y"];
  plant_name: DbPlantPlacement["plant_name"];
}

export interface PlantFitResultDto {
  sunlight_score: NonNullable<DbPlantPlacement["sunlight_score"]>;
  humidity_score: NonNullable<DbPlantPlacement["humidity_score"]>;
  precip_score: NonNullable<DbPlantPlacement["precip_score"]>;
  overall_score: NonNullable<DbPlantPlacement["overall_score"]>;
  explanation?: string;
}

/**
 * 2.7 Zdarzenia analityczne (AnalyticsEvents)
 */
export type AnalyticsEventDto = Pick<
  DbAnalyticsEvent,
  "id" | "user_id" | "plan_id" | "event_type" | "attributes" | "created_at"
>;

export type AnalyticsEventCreateCommand = Pick<DbAnalyticsEvent, "event_type" | "plan_id" | "attributes">;

export type AnalyticsEventListQuery = PaginationQuery & {
  plan_id?: DbPlan["id"];
};

/**
 * 2.8 Autentykacja (Auth)
 */
export interface AuthError {
  code: string;
  message: string;
  field?: "email" | "password" | "confirmPassword";
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: AuthError;
  redirectTo?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  password: string;
  confirmPassword: string;
}

/**
 * 2.9 Typy ViewModeli dla kreatora planu
 * Typy specyficzne dla komponentów frontendu kreatora planu, służące do zarządzania stanem formularza.
 */

/**
 * Typ dla pojedynczego kroku kreatora
 */
export type PlanCreatorStep = "basics" | "location" | "dimensions" | "summary";

/**
 * Konfiguracja kroków kreatora
 */
export interface StepConfig {
  key: PlanCreatorStep;
  label: string;
  order: number;
  description?: string;
}

/**
 * Dane z kroku "Podstawy"
 */
export interface PlanBasicsFormData {
  name: string;
}

/**
 * Dane z kroku "Lokalizacja"
 */
export interface PlanLocationFormData {
  latitude?: number;
  longitude?: number;
  address?: string; // Opcjonalny, tylko dla wyświetlania
}

/**
 * Dane z kroku "Wymiary"
 */
export interface PlanDimensionsFormData {
  width_m: number;
  height_m: number;
  cell_size_cm: 10 | 25 | 50 | 100;
  orientation: number; // 0..359
  hemisphere: "northern" | "southern";
}

/**
 * Pełne dane formularza (suma wszystkich kroków)
 */
export interface PlanCreateFormData extends PlanBasicsFormData, PlanLocationFormData, PlanDimensionsFormData {}

/**
 * Obliczone wymiary siatki (do walidacji i podglądu)
 */
export interface GridDimensions {
  gridWidth: number;
  gridHeight: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Wynik geokodowania (z OpenStreetMap Nominatim)
 */
export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  type?: string;
  importance?: number;
}

/**
 * Stan kreatora (dla hooka)
 */
export interface PlanCreatorState {
  currentStep: PlanCreatorStep;
  completedSteps: Set<PlanCreatorStep>;
  formData: Partial<PlanCreateFormData>;
  errors: Partial<Record<keyof PlanCreateFormData, string>>;
  isSubmitting: boolean;
  apiError: string | null;
}

/**
 * Draft zapisywany w localStorage
 */
export interface PlanDraft {
  formData: Partial<PlanCreateFormData>;
  savedAt: string; // ISO timestamp
  version: number; // Wersja schematu (dla przyszłych migracji)
}

/**
 * Konfiguracja kroków kreatora
 */
export const STEP_CONFIGS: StepConfig[] = [
  {
    key: "basics",
    label: "Podstawy",
    order: 1,
    description: "Nazwa planu",
  },
  {
    key: "location",
    label: "Lokalizacja",
    order: 2,
    description: "Położenie działki",
  },
  {
    key: "dimensions",
    label: "Wymiary",
    order: 3,
    description: "Rozmiar i orientacja",
  },
  {
    key: "summary",
    label: "Podsumowanie",
    order: 4,
    description: "Przegląd danych",
  },
];

/**
 * Domyślne wartości formularza
 */
export const DEFAULT_FORM_DATA: Partial<PlanCreateFormData> = {
  name: "",
  latitude: undefined,
  longitude: undefined,
  address: undefined,
  width_m: 10,
  height_m: 10,
  cell_size_cm: 25,
  orientation: 0,
  hemisphere: "northern",
};

/**
 * Wersja schematu draftu (dla przyszłych migracji)
 */
export const DRAFT_VERSION = 1;

/**
 * 2.10 Typy ViewModeli dla edytora planu - Siatka
 * Typy specyficzne dla komponentów frontendu edytora siatki, służące do zarządzania stanem edytora.
 */

/**
 * Narzędzie edytora
 */
export type EditorTool = "select" | "add_plant";

/**
 * Pozycja komórki
 */
export interface CellPosition {
  x: number;
  y: number;
}

/**
 * Zaznaczenie obszaru komórek
 */
export interface CellSelection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Stan edytora
 */
export interface EditorState {
  currentTool: EditorTool;
  selectedArea: CellSelection | null;
  focusedCell: CellPosition | null;
  hasUnsavedChanges: boolean;
  clipboardArea: CellSelection | null; // dla przyszłego copy/paste (poza MVP)
}

/**
 * Wpis w logu operacji
 */
export interface OperationLogEntry {
  id: string;
  timestamp: string; // ISO
  message: string;
  type: "info" | "success" | "error" | "warning";
}

/**
 * Zakładka prawego panelu
 */
export type DrawerTab = "parameters" | "plants" | "weather";

/**
 * Rozszerzony stan komórki dla UI (połączenie GridCell + PlantPlacement)
 */
export interface CellViewModel {
  x: number;
  y: number;
  type: GridCellType;
  plant: PlantPlacementDto | null;
  updated_at: string;
}

/**
 * Stan AI
 */
export interface AIState {
  status: "idle" | "searching" | "fitting" | "error";
  searchResults: PlantSearchCandidateDto[] | null;
  fitResult: PlantFitResultDto | null;
  error: string | null;
}

/**
 * Stan pogody
 */
export interface WeatherState {
  status: "idle" | "loading" | "error" | "stale";
  data: WeatherMonthlyDto[] | null;
  lastRefreshedAt: string | null;
  error: string | null;
}

/**
 * 2.11 Typy ViewModeli dla zaznaczania obszaru i przypisywania typu
 */

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

/**
 * Etykiety typów komórek (dla UI)
 */
export const GRID_CELL_TYPE_LABELS: Record<GridCellType, string> = {
  soil: "Ziemia",
  path: "Ścieżka",
  water: "Woda",
  building: "Zabudowa",
  blocked: "Zablokowane",
};

/**
 * 2.12 Typy ViewModeli dla zarządzania roślinami w edytorze
 */

/**
 * Stan dialogu dodawania rośliny
 *
 * Zarządza przepływem: wyszukiwanie → wybór kandydata → ocena dopasowania → potwierdzenie
 */
export interface AddPlantDialogState {
  /** Aktualny krok w przepływie */
  step: "search" | "candidate_selected" | "fit_loading" | "fit_ready" | "manual";
  /** Aktywna zakładka: wyszukiwanie AI lub ręczne dodanie */
  activeTab: "search" | "manual";
  /** Query wyszukiwania */
  searchQuery: string;
  /** Wyniki wyszukiwania AI */
  searchResults: PlantSearchCandidateDto[] | null;
  /** Czy trwa wyszukiwanie */
  isSearching: boolean;
  /** Wybrany kandydat z wyników */
  selectedCandidate: PlantSearchCandidateDto | null;
  /** Wynik oceny dopasowania */
  fitResult: PlantFitResultDto | null;
  /** Czy trwa ocena dopasowania */
  isFitting: boolean;
  /** Ręcznie wpisana nazwa rośliny */
  manualName: string;
  /** Czy trwa zapisywanie */
  isSubmitting: boolean;
  /** Błąd AI (jeśli wystąpił) */
  error: AIError | null;
}

/**
 * Błąd AI
 *
 * Reprezentuje różne typy błędów komunikacji z AI:
 * - timeout: Przekroczenie limitu czasu (10s)
 * - bad_json: Niepoprawna struktura odpowiedzi
 * - rate_limit: Przekroczenie limitu zapytań
 * - network: Brak połączenia
 * - unknown: Nieznany błąd
 */
export interface AIError {
  /** Typ błędu */
  type: "timeout" | "bad_json" | "rate_limit" | "network" | "unknown";
  /** Komunikat dla użytkownika */
  message: string;
  /** Kontekst: wyszukiwanie czy ocena */
  context: "search" | "fit";
  /** Czy można ponowić operację */
  canRetry: boolean;
  /** Czas oczekiwania przed retry (dla rate_limit), w sekundach */
  retryAfter?: number;
  /** Szczegóły techniczne (dla deweloperów) */
  details?: string;
}

/**
 * Konfiguracja progów scoring (dla dokumentacji/tooltipów)
 */
export interface ScoreThresholds {
  excellent: { min: number; score: 5 };
  good: { min: number; score: 4 };
  fair: { min: number; score: 3 };
  poor: { min: number; score: 2 };
  bad: { min: number; score: 1 };
}

/**
 * Konfiguracja wag sezonów (dla tooltipów)
 */
export interface SeasonWeights {
  growingSeason: { months: number[]; weight: 2 };
  offSeason: { months: number[]; weight: 1 };
  hemisphere: "northern" | "southern";
}

/**
 * ViewModel dla karty rośliny w liście
 */
export interface PlantCardViewModel {
  /** Pełne dane rośliny z bazy */
  placement: PlantPlacementDto;
  /** Nazwa rośliny sformatowana dla wyświetlenia */
  displayName: string;
  /** Pozycja sformatowana: "x: 3, y: 7" */
  position: string;
  /** Czy roślina ma wypełnione scores (z AI) */
  hasScores: boolean;
}

/**
 * Parametry modułu AI
 */
export interface AIServiceConfig {
  searchEndpoint: string;
  fitEndpoint: string;
  timeout: number;
  maxRetries: number;
}

/**
 * Wynik walidacji odpowiedzi AI
 */
export type AIValidationResult<T> = { success: true; data: T } | { success: false; error: AIError };
