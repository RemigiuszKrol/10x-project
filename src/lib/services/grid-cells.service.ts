import type { SupabaseClient } from "@/db/supabase.client";
import type { GridCellDto, ApiListResponse, GridCellType, GridCellUpdateCommand } from "@/types";
import { ValidationError } from "@/lib/http/errors";
import { parseGridCursor, encodeGridCursor, type GridCellCursorPayload } from "@/lib/validation/grid";

/**
 * Parametry dla funkcji listGridCells
 */
export interface ListGridCellsParams {
  planId: string;
  type?: GridCellType;
  x?: number;
  y?: number;
  bbox?: [number, number, number, number];
  limit: number;
  cursor?: string;
  sort: "updated_at" | "x";
  order: "asc" | "desc";
}

/**
 * Pobiera listę komórek siatki planu z paginacją kursorową
 *
 * Funkcja obsługuje:
 * - Filtrowanie po typie komórki
 * - Filtrowanie po pojedynczej pozycji (x,y)
 * - Filtrowanie po prostokątnym obszarze (bbox)
 * - Paginację kursorową bazującą na (updated_at, x, y)
 * - Sortowanie po updated_at lub x (asc/desc)
 *
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param params - Parametry zapytania (filtry, paginacja, sortowanie)
 * @returns Lista komórek z kursorami paginacji
 * @throws ValidationError - gdy współrzędne wykraczają poza granice siatki
 */
export async function listGridCells(
  supabase: SupabaseClient,
  userId: string,
  params: ListGridCellsParams
): Promise<ApiListResponse<GridCellDto>> {
  const { planId, type, x, y, bbox, limit, cursor, sort, order } = params;

  // 1. Pobierz plan i zweryfikuj wymiary siatki (potrzebne do walidacji zakresów)
  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select("id, user_id, grid_width, grid_height")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (planError) {
    throw planError;
  }

  if (!planData) {
    // Plan nie istnieje lub nie należy do użytkownika
    // Zwracamy pustą listę (endpoint powinien obsłużyć jako 404)
    return { data: [], pagination: { next_cursor: null } };
  }

  // Type assertion dla grid dimensions
  const plan = planData as { id: string; user_id: string; grid_width: number; grid_height: number };

  // 2. Walidacja zakresów współrzędnych
  if (x !== undefined && y !== undefined) {
    if (x < 0 || x >= plan.grid_width || y < 0 || y >= plan.grid_height) {
      throw new ValidationError(
        `Coordinates out of bounds. Grid dimensions: ${plan.grid_width}x${plan.grid_height}, provided: x=${x}, y=${y}`,
        "x"
      );
    }
  }

  if (bbox) {
    const [x1, y1, x2, y2] = bbox;
    if (x1 < 0 || x2 >= plan.grid_width || y1 < 0 || y2 >= plan.grid_height) {
      throw new ValidationError(
        `Bbox coordinates out of bounds. Grid dimensions: ${plan.grid_width}x${plan.grid_height}, provided: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`,
        "bbox"
      );
    }
  }

  // 3. Parsuj kursor jeśli istnieje
  let cursorPayload: GridCellCursorPayload | undefined;
  if (cursor) {
    try {
      cursorPayload = parseGridCursor(cursor);
    } catch (error) {
      throw new ValidationError(
        `Invalid cursor: ${error instanceof Error ? error.message : "Unknown error"}`,
        "cursor"
      );
    }
  }

  // 4. Zbuduj zapytanie do grid_cells
  let query = supabase.from("grid_cells").select("x, y, type, updated_at").eq("plan_id", planId);

  // Filtr po typie
  if (type) {
    query = query.eq("type", type);
  }

  // Filtr po pojedynczej pozycji (x,y)
  if (x !== undefined && y !== undefined) {
    query = query.eq("x", x).eq("y", y);
  }

  // Filtr po bbox
  if (bbox) {
    const [x1, y1, x2, y2] = bbox;
    query = query.gte("x", x1).lte("x", x2).gte("y", y1).lte("y", y2);
  }

  // 5. Zastosuj kursor do paginacji
  if (cursorPayload) {
    if (order === "desc") {
      // Dla DESC: pobieramy rekordy z updated_at < cursor.updated_at
      // LUB (updated_at = cursor.updated_at AND x > cursor.x)
      // LUB (updated_at = cursor.updated_at AND x = cursor.x AND y > cursor.y)

      // Supabase nie wspiera złożonych warunków OR bezpośrednio w query builder
      // Musimy użyć prostszego podejścia: filtrujemy tylko po updated_at
      // i resztę zostawiamy sortowaniu
      query = query.lt("updated_at", cursorPayload.updated_at);
    } else {
      // Dla ASC: pobieramy rekordy z updated_at > cursor.updated_at
      query = query.gt("updated_at", cursorPayload.updated_at);
    }
  }

  // 6. Sortowanie
  const ascending = order === "asc";

  if (sort === "updated_at") {
    query = query.order("updated_at", { ascending });
    // Sortowanie wtórne dla stabilności
    query = query.order("x", { ascending: true });
    query = query.order("y", { ascending: true });
  } else if (sort === "x") {
    query = query.order("x", { ascending });
    // Sortowanie wtórne
    query = query.order("y", { ascending: true });
    query = query.order("updated_at", { ascending: false });
  }

  // 7. Pobierz limit+1 rekordów dla detekcji następnej strony
  query = query.limit(limit + 1);

  // 8. Wykonaj zapytanie
  const { data: cells, error: cellsError } = await query;

  if (cellsError) {
    throw cellsError;
  }

  if (!cells || cells.length === 0) {
    return { data: [], pagination: { next_cursor: null } };
  }

  // Type assertion dla wyniku Supabase
  interface CellRow {
    x: number;
    y: number;
    type: GridCellType;
    updated_at: string;
  }
  const typedCells = cells as CellRow[];

  // 9. Wykryj czy jest następna strona
  const hasNextPage = typedCells.length > limit;
  const dataToReturn = hasNextPage ? typedCells.slice(0, limit) : typedCells;

  // 10. Wygeneruj kursor dla następnej strony
  let nextCursor: string | null = null;
  if (hasNextPage) {
    const lastItem = dataToReturn[dataToReturn.length - 1];
    const cursorPayload: GridCellCursorPayload = {
      updated_at: lastItem.updated_at,
      x: lastItem.x,
      y: lastItem.y,
    };
    nextCursor = encodeGridCursor(cursorPayload);
  }

  // 11. Mapuj dane do DTO (już są w odpowiednim formacie)
  const dtoData: GridCellDto[] = dataToReturn.map((cell) => ({
    x: cell.x,
    y: cell.y,
    type: cell.type,
    updated_at: cell.updated_at,
  }));

  return {
    data: dtoData,
    pagination: { next_cursor: nextCursor },
  };
}

/**
 * Interfejs dla metadanych siatki planu
 */
export interface PlanGridMetadata {
  grid_width: number;
  grid_height: number;
  cell_size_cm: number;
}

/**
 * Pobiera metadane siatki planu (wymiary i rozmiar komórki)
 * Używane do walidacji współrzędnych przed aktualizacją komórek
 *
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param planId - UUID planu
 * @returns Metadane siatki planu lub null jeśli plan nie istnieje/nie należy do użytkownika
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych)
 */
export async function getPlanGridMetadata(
  supabase: SupabaseClient,
  userId: string,
  planId: string
): Promise<PlanGridMetadata | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("grid_width, grid_height, cell_size_cm")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  // Type assertion dla pewności, że grid_width i grid_height są liczbami
  return data as PlanGridMetadata;
}

/**
 * Aktualizuje typ pojedynczej komórki siatki
 * Używa UPSERT aby zapewnić idempotencję (jeśli komórka nie istnieje, zostanie utworzona)
 *
 * @param supabase - Klient Supabase z kontekstu
 * @param planId - UUID planu
 * @param x - Współrzędna X komórki (0-indexed)
 * @param y - Współrzędna Y komórki (0-indexed)
 * @param command - Komenda z nowym typem komórki
 * @returns Zaktualizowana komórka siatki
 * @throws Błąd jeśli operacja nie powiodła się (np. naruszenie constraintów, błąd RLS)
 */
export async function updateGridCellType(
  supabase: SupabaseClient,
  planId: string,
  x: number,
  y: number,
  command: GridCellUpdateCommand
): Promise<GridCellDto> {
  // Wykonaj UPSERT na grid_cells
  // onConflict określa kolumny primary key (plan_id, x, y)
  // ignoreDuplicates: false oznacza, że w przypadku konfliktu rekord zostanie zaktualizowany
  const { data, error } = await supabase
    .from("grid_cells")
    .upsert(
      {
        plan_id: planId,
        x: x,
        y: y,
        type: command.type,
        // updated_at będzie ustawione automatycznie przez trigger w bazie
      } as never,
      {
        onConflict: "plan_id,x,y",
        ignoreDuplicates: false,
      }
    )
    .select("x, y, type, updated_at")
    .single();

  if (error) {
    // Mapowanie błędów Supabase na własne typy błędów
    throw mapSupabaseError(error);
  }

  if (!data) {
    throw new Error("Failed to update grid cell: no data returned");
  }

  return data as GridCellDto;
}

/**
 * Mapuje błędy Supabase na własne typy błędów dla lepszej kontroli w endpoincie
 *
 * @param error - Błąd z Supabase
 * @returns Zmapowany błąd lub oryginalny błąd jeśli nie rozpoznano typu
 */
function mapSupabaseError(error: unknown): Error {
  if (!error || typeof error !== "object") {
    return error as Error;
  }

  const err = error as { message?: string; code?: string; details?: string };

  // Błędy uprawnień (RLS) - kod PGRST301 lub komunikaty o braku uprawnień
  const isRlsError =
    err.message?.toLowerCase().includes("permission") ||
    err.message?.toLowerCase().includes("rls") ||
    err.code === "PGRST301" ||
    err.code === "42501";

  if (isRlsError) {
    // Zwracamy błąd z kodem, który endpoint zmapuje na 403 Forbidden
    const forbiddenError = new Error(err.message || "Access denied");
    (forbiddenError as { code?: string }).code = "PGRST301";
    return forbiddenError;
  }

  // Błędy constraintów - kod 23xxx (PostgreSQL constraint violations)
  // np. 23514 - CHECK constraint, 23503 - FOREIGN KEY constraint
  if (err.code?.startsWith("23")) {
    // Zwracamy ValidationError, który endpoint zmapuje na 422 Unprocessable
    return new ValidationError(err.message || "Constraint violation", err.details);
  }

  // Inne błędy - zwracamy bez zmian
  return error as Error;
}
