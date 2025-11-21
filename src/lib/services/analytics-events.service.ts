import type { SupabaseClient } from "@/db/supabase.client";
import type { AnalyticsEventCreateCommand, AnalyticsEventDto } from "@/types";

/**
 * Tworzy nowe zdarzenie analityczne dla użytkownika
 *
 * @param supabase - Instancja klienta Supabase
 * @param userId - ID użytkownika (UUID)
 * @param command - Komenda tworzenia zdarzenia (event_type, plan_id, attributes)
 * @returns DTO zdarzenia analitycznego z ID, timestampem i wszystkimi polami
 * @throws Rzuca błędy Supabase w przypadku problemów z bazą danych
 */
export async function createAnalyticsEvent(
  supabase: SupabaseClient,
  userId: string,
  command: AnalyticsEventCreateCommand
): Promise<AnalyticsEventDto> {
  // Normalizacja danych wejściowych
  const insertData = {
    user_id: userId,
    event_type: command.event_type,
    plan_id: command.plan_id ?? null,
    // Fallback attributes na {} jeśli nie podano lub null
    attributes: command.attributes ?? {},
  };

  // Insert do analytics_events z pełnym select
  const { data, error } = await supabase
    .from("analytics_events")
    .insert(insertData as never)
    .select("id, user_id, plan_id, event_type, attributes, created_at")
    .single();

  // Obsługa błędów z bazy danych
  if (error) {
    throw error;
  }

  // Zwracamy pełne DTO zdarzenia
  return data as AnalyticsEventDto;
}
