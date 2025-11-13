import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDto, ProfileUpdateCommand } from "@/types";

/**
 * Tworzy nowy profil dla użytkownika z wartościami domyślnymi
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika
 * @returns Utworzony profil
 * @throws Błąd jeśli profil nie mógł zostać utworzony
 */
export async function createProfileForUser(supabase: SupabaseClient, userId: string): Promise<ProfileDto> {
  const insertData = {
    id: userId,
    language_code: "pl",
    theme: "light" as const,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(insertData as never)
    .select("id, language_code, theme, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create profile: no data returned");
  }

  return data as ProfileDto;
}

/**
 * Pobiera profil użytkownika po ID
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika
 * @returns Profil użytkownika lub null jeśli nie znaleziono
 */
export async function getProfileByUserId(supabase: SupabaseClient, userId: string): Promise<ProfileDto | null> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("id, language_code, theme, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error && status !== 406) {
    throw error;
  }

  return data as ProfileDto | null;
}

/**
 * Aktualizuje profil użytkownika (partial update)
 * Jeśli profil nie istnieje, tworzy nowy z wartościami domyślnymi
 * @param supabase - Klient Supabase z kontekstu
 * @param userId - UUID użytkownika
 * @param command - Dane do aktualizacji (language_code i/lub theme)
 * @returns Zaktualizowany lub nowo utworzony profil
 */
export async function updateProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
  command: ProfileUpdateCommand
): Promise<ProfileDto | null> {
  // Najpierw sprawdź czy profil istnieje
  const existing = await getProfileByUserId(supabase, userId);

  if (existing) {
    // Profil istnieje - wykonaj UPDATE
    const updateData: Partial<{
      language_code: string;
      theme: string;
      updated_at: string;
    }> = {
      updated_at: new Date().toISOString(), // explicit set
    };

    if (command.language_code !== undefined) {
      updateData.language_code = command.language_code;
    }

    if (command.theme !== undefined) {
      updateData.theme = command.theme;
    }

    const { data, error, status } = await supabase
      .from("profiles")
      .update(updateData as never)
      .eq("id", userId)
      .select("id, language_code, theme, created_at, updated_at")
      .maybeSingle();

    if (error && status !== 406) {
      throw error;
    }

    return data as ProfileDto | null;
  } else {
    // Profil nie istnieje - stwórz nowy z wartościami z command lub domyślnymi
    const insertData = {
      id: userId,
      language_code: command.language_code ?? "pl",
      theme: command.theme ?? "light",
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(insertData as never)
      .select("id, language_code, theme, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return data as ProfileDto | null;
  }
}
