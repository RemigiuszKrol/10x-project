import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDto, ProfileUpdateCommand } from "@/types";
import { createProfileForUser, getProfileByUserId, updateProfileByUserId } from "@/lib/services/profile.service";

/**
 * Helper do tworzenia mocka Supabase clienta
 * Symuluje chainable API Supabase (from().select().eq().single() etc.)
 */
function createMockSupabaseClient() {
  const createQueryBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    };
    return builder;
  };

  const mockQueryBuilder = createQueryBuilder();
  const mockFrom = vi.fn().mockReturnValue(mockQueryBuilder);

  const mockSupabase = {
    from: mockFrom,
  } as unknown as SupabaseClient;

  return { mockSupabase, mockQueryBuilder, createQueryBuilder, mockFrom };
}

/**
 * Helper do tworzenia mockowego profilu
 */
function createMockProfile(overrides?: Partial<ProfileDto>): ProfileDto {
  const now = new Date().toISOString();
  return {
    id: "user-123",
    language_code: "pl",
    theme: "light",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("profile.service", () => {
  const userId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createProfileForUser", () => {
    it("powinien utworzyć profil z wartościami domyślnymi", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();
      const mockProfile = createMockProfile();

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      const result = await createProfileForUser(mockSupabase, userId);

      expect(result).toEqual(mockProfile);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          language_code: "pl",
          theme: "light",
        })
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("id, language_code, theme, created_at, updated_at");
      expect(mockQueryBuilder.single).toHaveBeenCalledTimes(1);
    });

    it("powinien rzucić błąd gdy Supabase zwraca error", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();
      const supabaseError = { message: "Database error", code: "23505" };

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: supabaseError,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      await expect(createProfileForUser(mockSupabase, userId)).rejects.toEqual(supabaseError);
    });

    it("powinien rzucić błąd gdy data jest null", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      await expect(createProfileForUser(mockSupabase, userId)).rejects.toThrow(
        "Failed to create profile: no data returned"
      );
    });
  });

  describe("getProfileByUserId", () => {
    it("powinien zwrócić profil gdy istnieje", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();
      const mockProfile = createMockProfile();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
        status: 200,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      const result = await getProfileByUserId(mockSupabase, userId);

      expect(result).toEqual(mockProfile);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("id, language_code, theme, created_at, updated_at");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", userId);
      expect(mockQueryBuilder.maybeSingle).toHaveBeenCalledTimes(1);
    });

    it("powinien zwrócić null gdy profil nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      const result = await getProfileByUserId(mockSupabase, userId);

      expect(result).toBeNull();
    });

    it("powinien zignorować błąd 406 (Not Acceptable) i zwrócić null", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not Acceptable", code: "406" },
        status: 406,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      const result = await getProfileByUserId(mockSupabase, userId);

      expect(result).toBeNull();
    });

    it("powinien rzucić błąd gdy status nie jest 406", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom } = createMockSupabaseClient();
      const supabaseError = { message: "Database error", code: "500" };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: supabaseError,
        status: 500,
      });

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      await expect(getProfileByUserId(mockSupabase, userId)).rejects.toEqual(supabaseError);
    });
  });

  describe("updateProfileByUserId", () => {
    it("powinien zaktualizować istniejący profil - tylko language_code", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();
      const updatedProfile = createMockProfile({ language_code: "en" });

      // Mock dla getProfileByUserId (sprawdzenie czy profil istnieje)
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
        status: 200,
      });

      mockFrom
        .mockReturnValueOnce(getProfileBuilder) // dla getProfileByUserId
        .mockReturnValueOnce(mockQueryBuilder); // dla update

      const command: ProfileUpdateCommand = { language_code: "en" };
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(updatedProfile);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          language_code: "en",
          updated_at: expect.any(String),
        })
      );
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", userId);
    });

    it("powinien zaktualizować istniejący profil - tylko theme", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();
      const updatedProfile = createMockProfile({ theme: "dark" });

      // Mock dla getProfileByUserId
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
        status: 200,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { theme: "dark" };
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(updatedProfile);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: "dark",
          updated_at: expect.any(String),
        })
      );
    });

    it("powinien zaktualizować istniejący profil - oba pola", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();
      const updatedProfile = createMockProfile({ language_code: "en", theme: "dark" });

      // Mock dla getProfileByUserId
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
        status: 200,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en", theme: "dark" };
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(updatedProfile);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          language_code: "en",
          theme: "dark",
          updated_at: expect.any(String),
        })
      );
    });

    it("powinien zaktualizować istniejący profil - puste command (tylko updated_at)", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();
      const updatedProfile = createMockProfile();

      // Mock dla getProfileByUserId
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
        status: 200,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = {};
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(updatedProfile);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      );
      // Sprawdź, że nie zawiera language_code ani theme jeśli nie były podane
      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall).not.toHaveProperty("language_code");
      expect(updateCall).not.toHaveProperty("theme");
    });

    it("powinien utworzyć nowy profil gdy nie istnieje - z wartościami z command", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const newProfile = createMockProfile({ language_code: "en", theme: "dark" });

      // Mock dla getProfileByUserId (profil nie istnieje)
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      // Mock dla insert
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: newProfile,
        error: null,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en", theme: "dark" };
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(newProfile);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          language_code: "en",
          theme: "dark",
        })
      );
      expect(mockQueryBuilder.single).toHaveBeenCalledTimes(1);
    });

    it("powinien utworzyć nowy profil gdy nie istnieje - z wartościami domyślnymi", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const newProfile = createMockProfile();

      // Mock dla getProfileByUserId (profil nie istnieje)
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      // Mock dla insert
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: newProfile,
        error: null,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = {};
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(newProfile);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          language_code: "pl",
          theme: "light",
        })
      );
    });

    it("powinien utworzyć nowy profil gdy nie istnieje - częściowe wartości z command", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const newProfile = createMockProfile({ language_code: "en" });

      // Mock dla getProfileByUserId (profil nie istnieje)
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      // Mock dla insert
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: newProfile,
        error: null,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en" };
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toEqual(newProfile);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          language_code: "en",
          theme: "light", // domyślna wartość
        })
      );
    });

    it("powinien rzucić błąd gdy update zwraca error (status != 406)", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();
      const supabaseError = { message: "Database error", code: "500" };

      // Mock dla getProfileByUserId
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update z błędem
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: supabaseError,
        status: 500,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en" };

      await expect(updateProfileByUserId(mockSupabase, userId, command)).rejects.toEqual(supabaseError);
    });

    it("powinien zignorować błąd 406 przy update i zwrócić null", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();

      // Mock dla getProfileByUserId
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update z błędem 406
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not Acceptable", code: "406" },
        status: 406,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en" };
      const result = await updateProfileByUserId(mockSupabase, userId, command);

      expect(result).toBeNull();
    });

    it("powinien rzucić błąd gdy insert zwraca error", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const supabaseError = { message: "Database error", code: "23505" };

      // Mock dla getProfileByUserId (profil nie istnieje)
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
        status: 200,
      });

      // Mock dla insert z błędem
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: supabaseError,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en" };

      await expect(updateProfileByUserId(mockSupabase, userId, command)).rejects.toEqual(supabaseError);
    });

    it("powinien ustawić updated_at przy aktualizacji", async () => {
      const { mockSupabase, mockQueryBuilder, mockFrom, createQueryBuilder } = createMockSupabaseClient();
      const existingProfile = createMockProfile();
      const updatedProfile = createMockProfile({ language_code: "en" });

      // Mock dla getProfileByUserId
      const getProfileBuilder = createQueryBuilder();
      getProfileBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingProfile,
        error: null,
        status: 200,
      });

      // Mock dla update
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
        status: 200,
      });

      mockFrom.mockReturnValueOnce(getProfileBuilder).mockReturnValueOnce(mockQueryBuilder);

      const command: ProfileUpdateCommand = { language_code: "en" };
      const beforeUpdate = new Date().toISOString();

      await updateProfileByUserId(mockSupabase, userId, command);

      const afterUpdate = new Date().toISOString();
      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as { updated_at: string };

      expect(updateCall.updated_at).toBeDefined();
      expect(updateCall.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(updateCall.updated_at >= beforeUpdate).toBe(true);
      expect(updateCall.updated_at <= afterUpdate).toBe(true);
    });
  });
});
