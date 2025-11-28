import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { PlanDto, PlanCreateCommand, PlanUpdateCommand, GridMetadataDto, PlanListQuery } from "@/types";
import {
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  listPlans,
  getPlanGridMetadata,
} from "@/lib/services/plans.service";
import { GridChangeRequiresConfirmationError, ValidationError } from "@/lib/http/errors";

/**
 * Helper do tworzenia mocka Supabase clienta
 * Symuluje chainable API Supabase (from().select().eq().single() etc.)
 */
function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    // limit() może być również wywołany jako ostatnia metoda (zwraca Promise)
    then: undefined as unknown,
  };

  // Dodaj then() do mockQueryBuilder dla obsługi await na chainie
  Object.defineProperty(mockQueryBuilder, "then", {
    get: () => undefined,
    configurable: true,
  });

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  } as unknown as SupabaseClient;

  return { mockSupabase, mockQueryBuilder };
}

describe("plans.service", () => {
  const userId = "user-123";
  const planId = "plan-456";
  const mockPlan: PlanDto = {
    id: planId,
    user_id: userId,
    name: "Testowy ogród",
    latitude: 52.23,
    longitude: 21.01,
    width_cm: 1000,
    height_cm: 1000,
    cell_size_cm: 50,
    grid_width: 20,
    grid_height: 20,
    orientation: 0,
    hemisphere: "northern",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  describe("getPlanById", () => {
    it("powinien zwrócić plan gdy istnieje i należy do użytkownika", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: mockPlan,
        error: null,
      });

      const result = await getPlanById(mockSupabase, userId, planId);

      expect(result).toEqual(mockPlan);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", planId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockQueryBuilder.maybeSingle).toHaveBeenCalled();
    });

    it("powinien zwrócić null gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getPlanById(mockSupabase, userId, planId);

      expect(result).toBeNull();
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Database error");

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(getPlanById(mockSupabase, userId, planId)).rejects.toThrow("Database error");
    });
  });

  describe("createPlan", () => {
    const createCommand: PlanCreateCommand = {
      name: "Nowy ogród",
      width_cm: 1000,
      height_cm: 1000,
      cell_size_cm: 50,
      orientation: 90,
      latitude: 52.23,
      longitude: 21.01,
      hemisphere: "northern",
    };

    it("powinien utworzyć plan z poprawnymi danymi", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const createdPlan: PlanDto = {
        ...mockPlan,
        name: createCommand.name,
        orientation: createCommand.orientation,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: createdPlan,
        error: null,
      });

      const result = await createPlan(mockSupabase, userId, createCommand);

      expect(result).toEqual(createdPlan);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          name: createCommand.name.trim(),
          width_cm: createCommand.width_cm,
          height_cm: createCommand.height_cm,
          cell_size_cm: createCommand.cell_size_cm,
          orientation: createCommand.orientation,
          latitude: createCommand.latitude,
          longitude: createCommand.longitude,
          hemisphere: createCommand.hemisphere,
        })
      );
    });

    it("powinien obsłużyć opcjonalne pola (latitude, longitude, hemisphere)", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const commandWithoutOptional: PlanCreateCommand = {
        name: "Ogród bez lokalizacji",
        width_cm: 500,
        height_cm: 500,
        cell_size_cm: 25,
        orientation: 0,
      };

      const createdPlan: PlanDto = {
        ...mockPlan,
        name: commandWithoutOptional.name,
        latitude: null,
        longitude: null,
        hemisphere: null,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: createdPlan,
        error: null,
      });

      const result = await createPlan(mockSupabase, userId, commandWithoutOptional);

      expect(result).toEqual(createdPlan);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: null,
          longitude: null,
          hemisphere: null,
        })
      );
    });

    it("powinien przyciąć białe znaki z nazwy", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const commandWithWhitespace: PlanCreateCommand = {
        ...createCommand,
        name: "  Ogród z białymi znakami  ",
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPlan,
        error: null,
      });

      await createPlan(mockSupabase, userId, commandWithWhitespace);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ogród z białymi znakami",
        })
      );
    });

    it("powinien rzucić błąd gdy utworzenie planu się nie powiedzie", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Unique constraint violation");

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(createPlan(mockSupabase, userId, createCommand)).rejects.toThrow("Unique constraint violation");
    });

    it("powinien rzucić błąd gdy brak danych zwróconych", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(createPlan(mockSupabase, userId, createCommand)).rejects.toThrow(
        "Failed to create plan: no data returned"
      );
    });
  });

  describe("updatePlan", () => {
    it("powinien zaktualizować plan gdy zmiany nie wpływają na wymiary siatki", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        name: "Zaktualizowana nazwa",
        orientation: 180,
      };

      const updatedPlan: PlanDto = {
        ...mockPlan,
        name: updateCommand.name ?? "",
        orientation: updateCommand.orientation ?? 0,
        updated_at: "2024-01-02T00:00:00Z",
      };

      // Mock dla pobrania aktualnego planu
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla aktualizacji
      mockQueryBuilder.single.mockResolvedValue({
        data: updatedPlan,
        error: null,
      });

      const result = await updatePlan(mockSupabase, userId, planId, updateCommand);

      expect(result).toEqual(updatedPlan);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: updateCommand.name?.trim(),
          orientation: updateCommand.orientation,
          updated_at: expect.any(String),
        })
      );
    });

    it("powinien rzucić GridChangeRequiresConfirmationError gdy zmiana wymiarów siatki bez potwierdzenia", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        width_cm: 2000, // Zmiana z 1000 na 2000 (grid_width z 20 na 40)
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      await expect(updatePlan(mockSupabase, userId, planId, updateCommand)).rejects.toThrow(
        GridChangeRequiresConfirmationError
      );
    });

    it("powinien pozwolić na zmianę wymiarów siatki z potwierdzeniem", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        width_cm: 2000, // grid_width: 20 -> 40
      };

      const updatedPlan: PlanDto = {
        ...mockPlan,
        width_cm: 2000,
        grid_width: 40,
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: updatedPlan,
        error: null,
      });

      const result = await updatePlan(mockSupabase, userId, planId, updateCommand, {
        confirmRegenerate: true,
      });

      expect(result).toEqual(updatedPlan);
    });

    it("powinien rzucić ValidationError gdy wymiary siatki są poza zakresem", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        width_cm: 10000, // grid_width: 20 -> 200 (max), ale cell_size_cm=50, więc 10000/50=200 OK
        // Ale jeśli zmienimy cell_size_cm na 10, to 10000/10=1000 (za dużo)
        cell_size_cm: 10,
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      await expect(updatePlan(mockSupabase, userId, planId, updateCommand)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy wymiary siatki nie są liczbami całkowitymi", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        width_cm: 1050, // 1050/50 = 21 (OK), ale jeśli cell_size_cm=30, to 1050/30=35 (OK)
        // Ale jeśli width_cm=1050 i cell_size_cm=40, to 1050/40=26.25 (nie całkowite)
        cell_size_cm: 40,
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      await expect(updatePlan(mockSupabase, userId, planId, updateCommand)).rejects.toThrow(ValidationError);
    });

    it("powinien zwrócić null gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        name: "Nowa nazwa",
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await updatePlan(mockSupabase, userId, planId, updateCommand);

      expect(result).toBeNull();
    });

    it("powinien zaktualizować tylko podane pola", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        name: "Tylko nazwa",
      };

      const updatedPlan: PlanDto = {
        ...mockPlan,
        name: updateCommand.name ?? "",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: updatedPlan,
        error: null,
      });

      const result = await updatePlan(mockSupabase, userId, planId, updateCommand);

      expect(result).toEqual(updatedPlan);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: updateCommand.name?.trim(),
          updated_at: expect.any(String),
        })
      );
      // Sprawdź że inne pola nie są w updateData
      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall.latitude).toBeUndefined();
      expect(updateCall.longitude).toBeUndefined();
    });

    it("powinien rzucić błąd gdy aktualizacja się nie powiedzie", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        name: "Nowa nazwa",
      };
      const dbError = new Error("Update failed");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(updatePlan(mockSupabase, userId, planId, updateCommand)).rejects.toThrow("Update failed");
    });

    it("powinien rzucić błąd gdy pobieranie planu się nie powiedzie", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        name: "Nowa nazwa",
      };
      const fetchError = new Error("Fetch failed");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: fetchError,
      });

      await expect(updatePlan(mockSupabase, userId, planId, updateCommand)).rejects.toThrow("Fetch failed");
    });

    it("powinien rzucić błąd gdy brak danych po aktualizacji", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        name: "Nowa nazwa",
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(updatePlan(mockSupabase, userId, planId, updateCommand)).rejects.toThrow(
        "Failed to update plan: no data returned"
      );
    });

    it("powinien zaktualizować wszystkie opcjonalne pola bez zmiany wymiarów siatki", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        latitude: 53.0,
        longitude: 22.0,
        hemisphere: "southern",
      };

      const updatedPlan: PlanDto = {
        ...mockPlan,
        latitude: updateCommand.latitude ?? null,
        longitude: updateCommand.longitude ?? null,
        hemisphere: updateCommand.hemisphere ?? null,
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: updatedPlan,
        error: null,
      });

      const result = await updatePlan(mockSupabase, userId, planId, updateCommand);

      expect(result).toEqual(updatedPlan);
      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall.latitude).toBe(updateCommand.latitude);
      expect(updateCall.longitude).toBe(updateCommand.longitude);
      expect(updateCall.hemisphere).toBe(updateCommand.hemisphere);
    });

    it("powinien zaktualizować wszystkie opcjonalne pola z potwierdzeniem zmiany wymiarów", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const updateCommand: PlanUpdateCommand = {
        latitude: 53.0,
        longitude: 22.0,
        height_cm: 1500, // Zmiana wymiarów siatki: 20 -> 30 (1500/50)
        cell_size_cm: 50, // Bez zmiany
        hemisphere: "southern",
      };

      const updatedPlan: PlanDto = {
        ...mockPlan,
        latitude: updateCommand.latitude ?? null,
        longitude: updateCommand.longitude ?? null,
        height_cm: updateCommand.height_cm ?? 0,
        hemisphere: updateCommand.hemisphere ?? null,
        grid_height: 30, // 1500/50 = 30
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: updatedPlan,
        error: null,
      });

      const result = await updatePlan(mockSupabase, userId, planId, updateCommand, {
        confirmRegenerate: true,
      });

      expect(result).toEqual(updatedPlan);
      const updateCall = mockQueryBuilder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateCall.latitude).toBe(updateCommand.latitude);
      expect(updateCall.longitude).toBe(updateCommand.longitude);
      expect(updateCall.height_cm).toBe(updateCommand.height_cm);
      expect(updateCall.cell_size_cm).toBe(updateCommand.cell_size_cm);
      expect(updateCall.hemisphere).toBe(updateCommand.hemisphere);
    });
  });

  describe("deletePlan", () => {
    it("powinien usunąć plan gdy istnieje i należy do użytkownika", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: planId },
        error: null,
      });

      const result = await deletePlan(mockSupabase, userId, planId);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", planId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("powinien zwrócić false gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deletePlan(mockSupabase, userId, planId);

      expect(result).toBe(false);
    });

    it("powinien rzucić błąd gdy operacja usunięcia się nie powiedzie", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Delete failed");

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(deletePlan(mockSupabase, userId, planId)).rejects.toThrow("Delete failed");
    });
  });

  describe("listPlans", () => {
    const mockPlans: PlanDto[] = [
      mockPlan,
      {
        ...mockPlan,
        id: "plan-789",
        name: "Drugi plan",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];

    it("powinien zwrócić listę planów bez cursor", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const query: PlanListQuery = {
        limit: 20,
        cursorKey: null,
        isAscending: false,
      };

      // limit() zwraca Promise, więc musimy zmockować then() na obiekcie zwracanym przez limit()
      const limitPromise = Promise.resolve({
        data: mockPlans.slice(0, 2),
        error: null,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      const result = await listPlans(mockSupabase, userId, query);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("updated_at", { ascending: false });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("id", { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(21); // limit + 1
    });

    it("powinien zwrócić listę z cursor gdy są kolejne strony", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const query: PlanListQuery = {
        limit: 1,
        cursorKey: null,
        isAscending: false,
      };

      // Zwróć limit + 1 elementów (2 elementy, limit=1)
      const limitPromise = Promise.resolve({
        data: mockPlans,
        error: null,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      const result = await listPlans(mockSupabase, userId, query);

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).not.toBeNull();
      expect(result.items[0]).toEqual(mockPlans[0]);
    });

    it("powinien zastosować cursor do filtrowania", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const cursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "plan-456",
      };
      const query: PlanListQuery = {
        limit: 20,
        cursorKey,
        isAscending: false,
      };

      const limitPromise = Promise.resolve({
        data: mockPlans.slice(1),
        error: null,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      const result = await listPlans(mockSupabase, userId, query);

      expect(result.items).toHaveLength(1);
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(expect.stringContaining("updated_at.lt"));
    });

    it("powinien zwrócić pustą listę gdy brak planów", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const query: PlanListQuery = {
        limit: 20,
        cursorKey: null,
        isAscending: false,
      };

      const limitPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      const result = await listPlans(mockSupabase, userId, query);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it("powinien obsłużyć sortowanie rosnące", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const query: PlanListQuery = {
        limit: 20,
        cursorKey: null,
        isAscending: true,
      };

      const limitPromise = Promise.resolve({
        data: mockPlans,
        error: null,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      await listPlans(mockSupabase, userId, query);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith("updated_at", { ascending: true });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("id", { ascending: true });
    });

    it("powinien rzucić błąd gdy zapytanie się nie powiedzie", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const query: PlanListQuery = {
        limit: 20,
        cursorKey: null,
        isAscending: false,
      };
      const dbError = new Error("Query failed");

      const limitPromise = Promise.resolve({
        data: null,
        error: dbError,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      await expect(listPlans(mockSupabase, userId, query)).rejects.toThrow("Query failed");
    });

    it("powinien zwrócić pustą listę gdy data jest null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const query: PlanListQuery = {
        limit: 20,
        cursorKey: null,
        isAscending: false,
      };

      const limitPromise = Promise.resolve({
        data: null,
        error: null,
      });
      mockQueryBuilder.limit.mockReturnValue(limitPromise);

      const result = await listPlans(mockSupabase, userId, query);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe("getPlanGridMetadata", () => {
    const mockMetadata: GridMetadataDto = {
      grid_width: 20,
      grid_height: 20,
      cell_size_cm: 50,
      orientation: 0,
    };

    it("powinien zwrócić metadane siatki gdy plan istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: mockMetadata,
        error: null,
      });

      const result = await getPlanGridMetadata(mockSupabase, userId, planId);

      expect(result).toEqual(mockMetadata);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("grid_width, grid_height, cell_size_cm, orientation");
    });

    it("powinien zwrócić null gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getPlanGridMetadata(mockSupabase, userId, planId);

      expect(result).toBeNull();
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Database error");

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(getPlanGridMetadata(mockSupabase, userId, planId)).rejects.toThrow("Database error");
    });
  });
});
