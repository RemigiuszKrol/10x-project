import type { Enums, Tables } from "./db/database.types";

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

export type PaginationQuery = {
  limit?: number; // 1..100
  cursor?: Cursor;
};

export type ApiListResponse<TItem> = {
  data: TItem[];
  pagination: { next_cursor: Cursor | null };
};

export type ApiItemResponse<TItem> = {
  data: TItem;
};

export type ApiErrorResponse = {
  error: {
    code:
      | "ValidationError"
      | "Unauthorized"
      | "Forbidden"
      | "NotFound"
      | "Conflict"
      | "RateLimited"
      | "UpstreamTimeout"
      | "Unprocessable"
      | "InternalError";
    message: string;
    details?: { field_errors?: Record<string, string> };
  };
};

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
export type PlanCreateCommand = {
  name: DbPlan["name"];
  latitude?: NonNullable<DbPlan["latitude"]>;
  longitude?: NonNullable<DbPlan["longitude"]>;
  width_cm: DbPlan["width_cm"];
  height_cm: DbPlan["height_cm"];
  cell_size_cm: DbPlan["cell_size_cm"];
  orientation: DbPlan["orientation"];
  hemisphere?: NonNullable<DbPlan["hemisphere"]>;
};

// PATCH /api/plans/:planId – częściowa aktualizacja
export type PlanUpdateCommand = Partial<PlanCreateCommand>;
export type PlanUpdateQuery = {
  // confirm_regenerate=true aby potwierdzić zmiany wpływające na wymiary siatki
  confirm_regenerate?: boolean;
};

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
export type GridAreaTypeCommand = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: GridCellType;
  confirm_plant_removal?: boolean;
};

// POST /grid/area-type – wynik
export type GridAreaTypeResultDto = {
  affected_cells: number;
  removed_plants: number;
};

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
export type PlantPlacementUpsertCommand = {
  plant_name: DbPlantPlacement["plant_name"];
  sunlight_score?: NonNullable<DbPlantPlacement["sunlight_score"]>;
  humidity_score?: NonNullable<DbPlantPlacement["humidity_score"]>;
  precip_score?: NonNullable<DbPlantPlacement["precip_score"]>;
  overall_score?: NonNullable<DbPlantPlacement["overall_score"]>;
};

/**
 * 2.5 Pogoda miesięczna (WeatherMonthly)
 */
export type WeatherMonthlyDto = Pick<
  DbWeatherMonthly,
  "year" | "month" | "sunlight" | "humidity" | "precip" | "last_refreshed_at"
>;

export type WeatherRefreshCommand = {
  force?: boolean;
};

export type WeatherRefreshResultDto = {
  refreshed: boolean;
  months: number;
};

/**
 * 2.6 AI – wyszukiwanie i ocena dopasowania
 * Typy te nie mają bezpośredniej encji w DB, ale odnoszą się do planu/pozycji i plant_name.
 */
export type PlantSearchCommand = {
  query: string;
};

export type PlantSearchCandidateDto = {
  name: string;
  latin_name?: string;
  source: "ai";
};

export type PlantSearchResultDto = {
  candidates: PlantSearchCandidateDto[];
};

export type PlantFitCommand = {
  plan_id: DbPlan["id"];
  x: DbGridCell["x"];
  y: DbGridCell["y"];
  plant_name: DbPlantPlacement["plant_name"];
};

export type PlantFitResultDto = {
  sunlight_score: NonNullable<DbPlantPlacement["sunlight_score"]>;
  humidity_score: NonNullable<DbPlantPlacement["humidity_score"]>;
  precip_score: NonNullable<DbPlantPlacement["precip_score"]>;
  overall_score: NonNullable<DbPlantPlacement["overall_score"]>;
  explanation?: string;
};

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
export type AuthError = {
  code: string;
  message: string;
  field?: "email" | "password" | "confirmPassword";
};

export type AuthResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: AuthError;
  redirectTo?: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type RegisterDto = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type ForgotPasswordDto = {
  email: string;
};

export type ResetPasswordDto = {
  password: string;
  confirmPassword: string;
};
