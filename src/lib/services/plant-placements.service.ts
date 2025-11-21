import type { SupabaseClient } from "@/db/supabase.client";
import type { PlantPlacementDto } from "@/types";
import type { PlantPlacementUpsertBody, PlantPlacementCursorKey } from "@/lib/validation/plant-placements";
import { encodePlantPlacementCursor } from "@/lib/validation/plant-placements";

/**
 * Interfejs serwisowy dla upsert rośliny
 */
export interface UpsertPlantPlacementCommand {
  planId: string;
  x: number;
  y: number;
  payload: PlantPlacementUpsertBody;
  userId: string;
}

/**
 * Tworzy lub aktualizuje nasadzenie rośliny w danej komórce siatki
 * @param supabase - Klient Supabase z kontekstu
 * @param command - Dane polecenia zawierające plan_id, współrzędne, payload i user_id
 * @returns Utworzone lub zaktualizowane nasadzenie rośliny
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych, naruszenie RLS)
 */
export async function upsertPlantPlacement(
  supabase: SupabaseClient,
  command: UpsertPlantPlacementCommand
): Promise<PlantPlacementDto> {
  const { planId, x, y, payload } = command;

  // Przygotuj dane do upsert
  const upsertData = {
    plan_id: planId,
    x,
    y,
    plant_name: payload.plant_name,
    sunlight_score: payload.sunlight_score ?? null,
    humidity_score: payload.humidity_score ?? null,
    precip_score: payload.precip_score ?? null,
    overall_score: payload.overall_score ?? null,
    updated_at: new Date().toISOString(),
  };

  // Wykonaj upsert (insert lub update przy konflikcie na kluczu plan_id, x, y)
  const { data, error } = await supabase
    .from("plant_placements")
    .upsert(upsertData as never, {
      onConflict: "plan_id,x,y",
    })
    .select("x, y, plant_name, sunlight_score, humidity_score, precip_score, overall_score, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to upsert plant placement: no data returned");
  }

  return data as PlantPlacementDto;
}

/**
 * Interfejs serwisowy dla listowania nasadzeń
 */
export interface ListPlantPlacementsCommand {
  planId: string;
  userId: string;
  limit: number;
  cursorKey: PlantPlacementCursorKey | null;
  name?: string;
}

/**
 * Wynik listowania nasadzeń
 */
export interface ListPlantPlacementsResult {
  items: PlantPlacementDto[];
  nextCursor: string | null;
}

/**
 * Escape'uje znaki specjalne ILIKE (%, _) w wyszukiwanym ciągu
 * @param str - Ciąg do escape'owania
 * @returns Ciąg z escape'owanymi znakami specjalnymi
 */
function escapeILike(str: string): string {
  return str.replace(/[%_]/g, "\\$&");
}

/**
 * Pobiera stronicowaną listę nasadzeń rośliny dla danego planu
 * @param supabase - Klient Supabase z kontekstu
 * @param command - Dane polecenia zawierające plan_id, user_id, limit, cursor i opcjonalny filtr po nazwie
 * @returns Lista nasadzeń i następny kursor paginacji
 * @throws Błąd jeśli operacja nie powiodła się (np. błąd bazy danych, naruszenie RLS)
 */
export async function listPlantPlacements(
  supabase: SupabaseClient,
  command: ListPlantPlacementsCommand
): Promise<ListPlantPlacementsResult> {
  const { planId, limit, cursorKey, name } = command;

  // Buduj bazowe zapytanie z limitowanymi kolumnami
  let query = supabase
    .from("plant_placements")
    .select("x, y, plant_name, sunlight_score, humidity_score, precip_score, overall_score, created_at, updated_at")
    .eq("plan_id", planId)
    .order("plant_name", { ascending: true })
    .order("x", { ascending: true })
    .order("y", { ascending: true });

  // Dodaj filtr po nazwie rośliny (prefiks ILIKE)
  if (name) {
    const escapedName = escapeILike(name);
    query = query.ilike("plant_name", `${escapedName}%`);
  }

  // Obsługuj kursor klucza złożonego (plant_name, x, y)
  if (cursorKey) {
    // Tworzymy warunek OR z trzema gałęziami:
    // 1. plant_name > cursorKey.plant_name
    // 2. plant_name = cursorKey.plant_name AND x > cursorKey.x
    // 3. plant_name = cursorKey.plant_name AND x = cursorKey.x AND y > cursorKey.y
    query = query.or(
      `plant_name.gt.${cursorKey.plant_name},and(plant_name.eq.${cursorKey.plant_name},x.gt.${cursorKey.x}),and(plant_name.eq.${cursorKey.plant_name},x.eq.${cursorKey.x},y.gt.${cursorKey.y})`
    );
  }

  // Pobierz limit+1 rekordów dla detekcji next_cursor
  query = query.limit(limit + 1);

  const { data, error } = await query;

  // Obsługa błędu PGRST116 (brak dostępu/plan nie istnieje)
  if (error) {
    if (error.code === "PGRST116") {
      // Plan nie istnieje lub brak dostępu - rzuć błąd który zostanie zmapowany na 404
      throw new Error("Plan not found");
    }
    throw error;
  }

  if (!data) {
    return { items: [], nextCursor: null };
  }

  // Sprawdź czy jest więcej wyników (czy data.length > limit)
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  // Jeśli jest więcej wyników, ostatni element z listy służy do wygenerowania kursora
  let nextCursor: string | null = null;
  if (hasMore && data[limit]) {
    const lastItem = data[limit] as PlantPlacementDto;
    nextCursor = encodePlantPlacementCursor({
      plant_name: lastItem.plant_name,
      x: lastItem.x,
      y: lastItem.y,
    });
  }

  return {
    items: items as PlantPlacementDto[],
    nextCursor,
  };
}

/**
 * Interfejs serwisowy dla usuwania nasadzenia rośliny
 */
export interface DeletePlantPlacementCommand {
  planId: string;
  x: number;
  y: number;
  userId: string;
}

/**
 * Wynik operacji usunięcia nasadzenia
 */
export interface DeletePlantPlacementResult {
  deleted: boolean;
}

/**
 * Usuwa nasadzenie rośliny z konkretnej komórki siatki
 * @param supabase - Klient Supabase z kontekstu
 * @param command - Dane polecenia zawierające plan_id, współrzędne i user_id
 * @returns Informację o sukcesie operacji
 * @throws Błąd jeśli operacja nie powiodła się lub nie znaleziono nasadzenia
 */
export async function deletePlantPlacement(
  supabase: SupabaseClient,
  command: DeletePlantPlacementCommand
): Promise<DeletePlantPlacementResult> {
  const { planId, x, y } = command;

  // Wykonaj usunięcie nasadzenia
  const { error, count } = await supabase
    .from("plant_placements")
    .delete({ count: "exact" })
    .eq("plan_id", planId)
    .eq("x", x)
    .eq("y", y);

  if (error) {
    throw error;
  }

  // Sprawdź czy usunięto dokładnie jeden rekord
  if (count === null || count === 0) {
    throw new Error("Plant placement not found");
  }

  if (count > 1) {
    // To nie powinno się zdarzyć przy poprawnym kluczu głównym (plan_id, x, y)
    throw new Error(`Unexpected: deleted ${count} records instead of 1`);
  }

  return { deleted: true };
}
