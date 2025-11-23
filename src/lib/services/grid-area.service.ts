import type { SupabaseClient } from "@/db/supabase.client";
import type { GridAreaTypeResultDto, SetAreaTypeServiceParams } from "@/types";
import { PlantRemovalRequiresConfirmationError, ValidationError } from "@/lib/http/errors";

/**
 * Ustawia typ komórek w prostokątnym obszarze siatki
 *
 * Funkcja wykonuje hurtową zmianę typu dla wybranego prostokąta komórek.
 * Jeśli nowy typ jest różny od 'soil' i w obszarze znajdują się rośliny,
 * wymaga potwierdzenia ich usunięcia.
 *
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika (z sesji)
 * @param params - Parametry operacji (plan_id, współrzędne, typ, potwierdzenie)
 * @returns Wynik operacji z liczbą zmienionych komórek i usuniętych roślin
 * @throws ValidationError - gdy współrzędne wykraczają poza granice siatki
 * @throws PlantRemovalRequiresConfirmationError - gdy wymagane jest potwierdzenie usunięcia roślin
 */
export async function setAreaType(
  supabase: SupabaseClient,
  userId: string,
  params: SetAreaTypeServiceParams
): Promise<GridAreaTypeResultDto> {
  const { planId, x1, y1, x2, y2, type, confirmPlantRemoval = false } = params;

  // 1. Pobierz plan i zweryfikuj wymiary siatki
  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select("id, grid_width, grid_height")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (planError) {
    throw planError;
  }

  if (!planData) {
    // Plan nie istnieje lub nie należy do użytkownika - endpoint powinien zwrócić 404
    return { affected_cells: 0, removed_plants: 0 };
  }

  // Type assertion dla grid dimensions
  const plan = planData as { id: string; grid_width: number | null; grid_height: number | null };

  // 2. Walidacja granic siatki
  if (x1 < 0 || x2 >= (plan.grid_width ?? 0) || y1 < 0 || y2 >= (plan.grid_height ?? 0)) {
    throw new ValidationError(
      `Coordinates out of bounds. Grid dimensions: ${plan.grid_width}x${plan.grid_height}, provided: x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}`,
      "x1"
    );
  }

  // 3. Jeśli nowy typ ≠ 'soil', sprawdź czy są rośliny w obszarze
  let plantCount = 0;
  if (type !== "soil") {
    const { count, error: countError } = await supabase
      .from("plant_placements")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", planId)
      .gte("x", x1)
      .lte("x", x2)
      .gte("y", y1)
      .lte("y", y2);

    if (countError) {
      throw countError;
    }

    plantCount = count ?? 0;

    // Jeśli są rośliny i brak potwierdzenia, rzuć błąd konfliktu
    if (plantCount > 0 && !confirmPlantRemoval) {
      throw new PlantRemovalRequiresConfirmationError(
        `There are ${plantCount} plant(s) in the selected area. Set confirm_plant_removal=true to proceed.`,
        plantCount
      );
    }
  }

  // 4. Wykonaj aktualizację komórek siatki
  const { error: updateError } = await supabase
    .from("grid_cells")
    .update({ type } as never)
    .eq("plan_id", planId)
    .gte("x", x1)
    .lte("x", x2)
    .gte("y", y1)
    .lte("y", y2);

  if (updateError) {
    throw updateError;
  }

  // 5. Oblicz liczbę zmienionych komórek (geometrycznie)
  const affectedCells = (x2 - x1 + 1) * (y2 - y1 + 1);

  // 6. Rośliny są usuwane przez triggery bazy danych gdy typ ≠ 'soil'
  // Zwracamy wcześniej policzoną liczbę roślin
  const removedPlants = type !== "soil" ? plantCount : 0;

  return {
    affected_cells: affectedCells,
    removed_plants: removedPlants,
  };
}
