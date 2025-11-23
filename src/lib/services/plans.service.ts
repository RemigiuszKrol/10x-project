import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PlanDto,
  PlanCreateCommand,
  PlanUpdateCommand,
  GridMetadataDto,
  UpdatePlanOptions,
  PlanListQuery,
  PlanListResult,
} from "@/types";
import { GridChangeRequiresConfirmationError, ValidationError } from "@/lib/http/errors";
import { encodePlanCursor } from "@/lib/validation/plans";

/**
 * Pobiera pojedynczy plan działki należący do użytkownika
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param planId - UUID planu do pobrania
 * @returns Plan lub null jeśli plan nie istnieje/nie należy do użytkownika
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych, naruszenie RLS)
 */
export async function getPlanById(supabase: SupabaseClient, userId: string, planId: string): Promise<PlanDto | null> {
  // Pobierz plan z weryfikacją własności (user_id)
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, user_id, name, latitude, longitude, width_cm, height_cm, cell_size_cm, grid_width, grid_height, orientation, hemisphere, created_at, updated_at"
    )
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Jeśli data jest null, plan nie istnieje lub nie należy do użytkownika
  if (!data) {
    return null;
  }

  return data as PlanDto;
}

/**
 * Tworzy nowy plan działki dla użytkownika
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param command - Dane planu do utworzenia
 * @returns Utworzony plan z obliczonymi wymiarami siatki
 * @throws Błąd jeśli plan nie mógł zostać utworzony (np. konflikt nazwy, naruszenie RLS)
 */
export async function createPlan(
  supabase: SupabaseClient,
  userId: string,
  command: PlanCreateCommand
): Promise<PlanDto> {
  // Przygotuj dane do wstawienia
  // Uwaga: grid_width i grid_height są kolumnami generowanymi w bazie danych,
  // więc nie wstawiamy ich bezpośrednio - są automatycznie obliczane z width_cm / cell_size_cm
  const insertData = {
    user_id: userId,
    name: command.name.trim(),
    width_cm: command.width_cm,
    height_cm: command.height_cm,
    cell_size_cm: command.cell_size_cm,
    orientation: command.orientation,
    latitude: command.latitude ?? null,
    longitude: command.longitude ?? null,
    hemisphere: command.hemisphere ?? null,
  };

  // Wykonaj INSERT i pobierz utworzony rekord
  const { data, error } = await supabase
    .from("plans")
    .insert(insertData as never)
    .select(
      "id, user_id, name, latitude, longitude, width_cm, height_cm, cell_size_cm, grid_width, grid_height, orientation, hemisphere, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create plan: no data returned");
  }

  return data as PlanDto;
}

/**
 * Aktualizuje istniejący plan działki użytkownika
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param planId - UUID planu do aktualizacji
 * @param command - Dane do aktualizacji (częściowe)
 * @param options - Opcje aktualizacji (np. confirmRegenerate)
 * @returns Zaktualizowany plan lub null jeśli plan nie istnieje/nie należy do użytkownika
 * @throws GridChangeRequiresConfirmationError jeśli zmiana wymiarów siatki wymaga potwierdzenia
 * @throws Błąd jeśli aktualizacja nie powiodła się (np. konflikt nazwy, naruszenie RLS)
 */
export async function updatePlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  command: PlanUpdateCommand,
  options: UpdatePlanOptions = {}
): Promise<PlanDto | null> {
  // 1. Pobierz aktualny plan
  const { data: currentPlan, error: fetchError } = await supabase
    .from("plans")
    .select(
      "id, user_id, name, latitude, longitude, width_cm, height_cm, cell_size_cm, grid_width, grid_height, orientation, hemisphere, created_at, updated_at"
    )
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!currentPlan) {
    return null;
  }

  // Rzutowanie na PlanDto dla poprawnych typów
  const plan = currentPlan as PlanDto;

  // 2. Oblicz nowe wartości (merguj z aktualnymi)
  const nextWidthCm = command.width_cm ?? plan.width_cm;
  const nextHeightCm = command.height_cm ?? plan.height_cm;
  const nextCellSizeCm = command.cell_size_cm ?? plan.cell_size_cm;

  // 3. Wylicz nowe wymiary siatki
  const nextGridWidth = nextWidthCm / nextCellSizeCm;
  const nextGridHeight = nextHeightCm / nextCellSizeCm;

  // 4. Sprawdź zakresy siatki (1-200)
  if (
    nextGridWidth < 1 ||
    nextGridWidth > 200 ||
    nextGridHeight < 1 ||
    nextGridHeight > 200 ||
    !Number.isInteger(nextGridWidth) ||
    !Number.isInteger(nextGridHeight)
  ) {
    throw new ValidationError("Calculated grid dimensions must be between 1 and 200 and must be integers", "width_cm");
  }

  // 5. Sprawdź czy następuje zmiana wymiarów siatki
  const gridChanged = nextGridWidth !== plan.grid_width || nextGridHeight !== plan.grid_height;

  if (gridChanged && !options.confirmRegenerate) {
    throw new GridChangeRequiresConfirmationError(
      "Changing grid dimensions will reset all cells and plants. Set confirm_regenerate=true to proceed."
    );
  }

  // 6. Przygotuj dane do aktualizacji
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (command.name !== undefined) {
    updateData.name = command.name.trim();
  }
  if (command.latitude !== undefined) {
    updateData.latitude = command.latitude;
  }
  if (command.longitude !== undefined) {
    updateData.longitude = command.longitude;
  }
  if (command.width_cm !== undefined) {
    updateData.width_cm = command.width_cm;
  }
  if (command.height_cm !== undefined) {
    updateData.height_cm = command.height_cm;
  }
  if (command.cell_size_cm !== undefined) {
    updateData.cell_size_cm = command.cell_size_cm;
  }
  if (command.orientation !== undefined) {
    updateData.orientation = command.orientation;
  }
  if (command.hemisphere !== undefined) {
    updateData.hemisphere = command.hemisphere;
  }

  // Uwaga: grid_width i grid_height są kolumnami generowanymi w bazie danych,
  // więc nie aktualizujemy ich bezpośrednio - są automatycznie przeliczane gdy zmieniamy
  // width_cm, height_cm lub cell_size_cm

  // 7. Wykonaj UPDATE i pobierz zaktualizowany rekord
  const { data, error } = await supabase
    .from("plans")
    .update(updateData as never)
    .eq("id", planId)
    .eq("user_id", userId)
    .select(
      "id, user_id, name, latitude, longitude, width_cm, height_cm, cell_size_cm, grid_width, grid_height, orientation, hemisphere, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to update plan: no data returned");
  }

  return data as PlanDto;
}

/**
 * Usuwa plan działki użytkownika wraz z powiązanymi danymi (grid_cells, plant_placements)
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param planId - UUID planu do usunięcia
 * @returns true jeśli plan został usunięty, false jeśli plan nie istnieje/nie należy do użytkownika
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych, naruszenie RLS)
 */
export async function deletePlan(supabase: SupabaseClient, userId: string, planId: string): Promise<boolean> {
  // Wykonaj DELETE z weryfikacją własności (user_id)
  // Kaskadowe usunięcie grid_cells i plant_placements obsługuje baza danych
  const { data, error } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Jeśli data jest null, plan nie istniał lub nie należał do użytkownika
  return data !== null;
}

/**
 * Pobiera paginowaną listę planów działki należących do użytkownika
 * Używa keyset pagination (cursor-based) z sortowaniem po updated_at + id
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param query - Parametry zapytania (limit, cursor, kierunek sortowania)
 * @returns Lista planów z cursor do następnej strony (jeśli istnieje)
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych, naruszenie RLS)
 */
export async function listPlans(
  supabase: SupabaseClient,
  userId: string,
  query: PlanListQuery
): Promise<PlanListResult> {
  const { limit, cursorKey, isAscending } = query;

  // Buduj zapytanie
  let dbQuery = supabase
    .from("plans")
    .select(
      "id, user_id, name, latitude, longitude, width_cm, height_cm, cell_size_cm, grid_width, grid_height, orientation, hemisphere, created_at, updated_at"
    )
    .eq("user_id", userId);

  // Sortowanie stabilne: updated_at + id
  dbQuery = dbQuery.order("updated_at", { ascending: isAscending });
  dbQuery = dbQuery.order("id", { ascending: isAscending });

  // Keyset pagination: filtrowanie po cursorze jeśli obecny
  if (cursorKey) {
    const { updated_at: updatedAt, id } = cursorKey;

    // Dla desc: updated_at < cursorUpdatedAt OR (updated_at = cursorUpdatedAt AND id < cursorId)
    // Dla asc: updated_at > cursorUpdatedAt OR (updated_at = cursorUpdatedAt AND id > cursorId)
    const timeOp = isAscending ? "gt" : "lt";
    const idOp = isAscending ? "gt" : "lt";

    // Supabase PostgREST wspiera operator `.or()` z parametrami
    // Potrzebujemy: updated_at.timeOp.updatedAt OR (updated_at.eq.updatedAt AND id.idOp.id)
    dbQuery = dbQuery.or(`updated_at.${timeOp}.${updatedAt},and(updated_at.eq.${updatedAt},id.${idOp}.${id})`);
  }

  // Pobierz limit + 1 rekordów dla detekcji hasMore
  dbQuery = dbQuery.limit(limit + 1);

  // Wykonaj zapytanie
  const { data, error } = await dbQuery;

  if (error) {
    throw error;
  }

  if (!data) {
    return { items: [], nextCursor: null };
  }

  // Rzutowanie na PlanDto[] dla poprawnych typów
  const plans = data as PlanDto[];

  // Sprawdź czy są kolejne strony
  const hasMore = plans.length > limit;
  const items = hasMore ? plans.slice(0, limit) : plans;

  // Oblicz nextCursor z ostatniego elementu
  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodePlanCursor({
      updated_at: lastItem.updated_at,
      id: lastItem.id,
    });
  }

  return {
    items,
    nextCursor,
  };
}

/**
 * Pobiera metadane siatki dla planu działki należącego do użytkownika
 * Zwraca grid_width, grid_height, cell_size_cm, orientation
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param planId - UUID planu do pobrania
 * @returns Metadane siatki lub null jeśli plan nie istnieje/nie należy do użytkownika
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych, naruszenie RLS)
 */
export async function getPlanGridMetadata(
  supabase: SupabaseClient,
  userId: string,
  planId: string
): Promise<GridMetadataDto | null> {
  // Pobierz tylko metadane siatki z weryfikacją własności (user_id)
  const { data, error } = await supabase
    .from("plans")
    .select("grid_width, grid_height, cell_size_cm, orientation")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Jeśli data jest null, plan nie istnieje lub nie należy do użytkownika
  if (!data) {
    return null;
  }

  return data as GridMetadataDto;
}
