import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PlantPlacementDto,
  UpsertPlantPlacementCommand,
  ListPlantPlacementsCommand,
  DeletePlantPlacementCommand,
  PlantPlacementCursorKey,
} from "@/types";
import {
  upsertPlantPlacement,
  listPlantPlacements,
  deletePlantPlacement,
} from "@/lib/services/plant-placements.service";

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
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    };
    return builder;
  };

  const mockQueryBuilder = createQueryBuilder();

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder) as unknown as typeof mockQueryBuilder,
  } as unknown as SupabaseClient;

  return { mockSupabase, mockQueryBuilder, createQueryBuilder };
}

describe("plant-placements.service", () => {
  const userId = "user-123";
  const planId = "plan-456";
  const mockPlan = {
    id: planId,
    grid_width: 20,
    grid_height: 20,
  };
  const mockPlantPlacement: PlantPlacementDto = {
    x: 5,
    y: 7,
    plant_name: "Pomidor",
    sunlight_score: 4,
    humidity_score: 3,
    precip_score: 4,
    temperature_score: 4,
    overall_score: 4,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  describe("upsertPlantPlacement", () => {
    const command: UpsertPlantPlacementCommand = {
      planId,
      x: 5,
      y: 7,
      userId,
      payload: {
        plant_name: "Pomidor",
        sunlight_score: 4,
        humidity_score: 3,
        precip_score: 4,
        temperature_score: 4,
        overall_score: 4,
      },
    };

    it("powinien utworzyć nasadzenie gdy wszystko jest poprawne", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla upsert - tworzymy osobny query builder dla plant_placements
      const plantPlacementsBuilder = createQueryBuilder();
      plantPlacementsBuilder.single.mockResolvedValueOnce({
        data: mockPlantPlacement,
        error: null,
      });
      mockQueryBuilder.upsert.mockReturnValueOnce(plantPlacementsBuilder);

      const result = await upsertPlantPlacement(mockSupabase, command);

      expect(result).toEqual(mockPlantPlacement);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockSupabase.from).toHaveBeenCalledWith("plant_placements");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", planId);
      expect(mockQueryBuilder.upsert).toHaveBeenCalled();
      expect(plantPlacementsBuilder.single).toHaveBeenCalled();
    });

    it("powinien rzucić błąd gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(upsertPlantPlacement(mockSupabase, command)).rejects.toThrow("Plan not found");
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy pobieraniu planu", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Database error");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      await expect(upsertPlantPlacement(mockSupabase, command)).rejects.toThrow("Database error");
    });

    it("powinien rzucić ValidationError gdy wymiary siatki są null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId, grid_width: null, grid_height: null },
        error: null,
      });

      await expect(upsertPlantPlacement(mockSupabase, command)).rejects.toThrow(
        "Grid dimensions are not set for this plan"
      );
    });

    it("powinien rzucić ValidationError gdy x jest ujemne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, x: -1 };

      await expect(upsertPlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy x jest >= gridWidth", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, x: 20 }; // gridWidth = 20, więc x >= 20 jest nieprawidłowe

      await expect(upsertPlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy y jest ujemne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, y: -1 };

      await expect(upsertPlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy y jest >= gridHeight", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, y: 20 }; // gridHeight = 20, więc y >= 20 jest nieprawidłowe

      await expect(upsertPlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy upsert", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Upsert error");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const plantPlacementsBuilder = createQueryBuilder();
      plantPlacementsBuilder.single.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });
      mockQueryBuilder.upsert.mockReturnValueOnce(plantPlacementsBuilder);

      await expect(upsertPlantPlacement(mockSupabase, command)).rejects.toThrow("Upsert error");
    });

    it("powinien rzucić błąd gdy upsert nie zwróci danych", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const plantPlacementsBuilder = createQueryBuilder();
      plantPlacementsBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockQueryBuilder.upsert.mockReturnValueOnce(plantPlacementsBuilder);

      await expect(upsertPlantPlacement(mockSupabase, command)).rejects.toThrow(
        "Failed to upsert plant placement: no data returned"
      );
    });

    it("powinien obsłużyć opcjonalne score'y jako null", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const placementWithoutScores: PlantPlacementDto = {
        ...mockPlantPlacement,
        sunlight_score: null,
        humidity_score: null,
        precip_score: null,
        temperature_score: null,
        overall_score: null,
      };

      const plantPlacementsBuilder = createQueryBuilder();
      plantPlacementsBuilder.single.mockResolvedValueOnce({
        data: placementWithoutScores,
        error: null,
      });
      mockQueryBuilder.upsert.mockReturnValueOnce(plantPlacementsBuilder);

      const commandWithoutScores: UpsertPlantPlacementCommand = {
        ...command,
        payload: {
          plant_name: "Bazylia",
        },
      };

      const result = await upsertPlantPlacement(mockSupabase, commandWithoutScores);

      expect(result.sunlight_score).toBeNull();
      expect(result.humidity_score).toBeNull();
      expect(result.precip_score).toBeNull();
      expect(result.temperature_score).toBeNull();
      expect(result.overall_score).toBeNull();
    });
  });

  describe("listPlantPlacements", () => {
    const command: ListPlantPlacementsCommand = {
      planId,
      userId,
      limit: 10,
      cursorKey: null,
      name: undefined,
    };

    it("powinien zwrócić pustą listę gdy brak nasadzeń", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      // Mock dla listowania - limit() zwraca Promise
      const limitPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // plant_name
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // x
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // y
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise); // limit (ostatnie)

      const result = await listPlantPlacements(mockSupabase, command);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockSupabase.from).toHaveBeenCalledWith("plant_placements");
    });

    it("powinien zwrócić listę nasadzeń gdy istnieją", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const mockPlacements = [mockPlantPlacement];
      const limitPromise = Promise.resolve({
        data: mockPlacements,
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const result = await listPlantPlacements(mockSupabase, command);

      expect(result.items).toEqual(mockPlacements);
      expect(result.nextCursor).toBeNull();
    });

    it("powinien zwrócić nextCursor gdy jest więcej wyników", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      // limit = 10, więc zwracamy 11 elementów (limit + 1)
      const mockPlacements = Array.from({ length: 11 }, (_, i) => ({
        ...mockPlantPlacement,
        x: i,
        y: i,
      }));
      const limitPromise = Promise.resolve({
        data: mockPlacements,
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const result = await listPlantPlacements(mockSupabase, command);

      expect(result.items).toHaveLength(10); // Tylko pierwsze 10
      expect(result.nextCursor).not.toBeNull();
    });

    it("powinien zastosować filtr po nazwie rośliny", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const limitPromise = Promise.resolve({
        data: [mockPlantPlacement],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const commandWithName: ListPlantPlacementsCommand = {
        ...command,
        name: "Pomidor",
      };

      await listPlantPlacements(mockSupabase, commandWithName);

      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("plant_name", "Pomidor%");
    });

    it("powinien zastosować kursor paginacji", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const cursorKey: PlantPlacementCursorKey = {
        plant_name: "Bazylia",
        x: 3,
        y: 4,
      };

      const limitPromise = Promise.resolve({
        data: [mockPlantPlacement],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const commandWithCursor: ListPlantPlacementsCommand = {
        ...command,
        cursorKey,
      };

      await listPlantPlacements(mockSupabase, commandWithCursor);

      expect(mockQueryBuilder.or).toHaveBeenCalled();
      expect(mockQueryBuilder.or.mock.calls[0][0]).toContain("plant_name.gt.Bazylia");
    });

    it("powinien rzucić błąd gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(listPlantPlacements(mockSupabase, command)).rejects.toThrow("Plan not found");
    });

    it("powinien zwrócić pustą listę gdy data jest null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const limitPromise = Promise.resolve({
        data: null,
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const result = await listPlantPlacements(mockSupabase, command);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy pobieraniu planu", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Database error");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      await expect(listPlantPlacements(mockSupabase, command)).rejects.toThrow("Database error");
    });

    it("powinien zmapować błąd PGRST116 na 'Plan not found'", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const pgrstError = {
        code: "PGRST116",
        message: "No rows found",
      };

      const limitPromise = Promise.resolve({
        data: null,
        error: pgrstError,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      await expect(listPlantPlacements(mockSupabase, command)).rejects.toThrow("Plan not found");
    });

    it("powinien rzucić błąd gdy wystąpi inny błąd bazy danych", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const dbError = {
        code: "PGRST301",
        message: "Permission denied",
      };

      const limitPromise = Promise.resolve({
        data: null,
        error: dbError,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      await expect(listPlantPlacements(mockSupabase, command)).rejects.toEqual(dbError);
    });

    it("powinien escape'ować znaki specjalne w filtrze nazwy", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId },
        error: null,
      });

      const limitPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const commandWithSpecialChars: ListPlantPlacementsCommand = {
        ...command,
        name: "Test%_Name",
      };

      await listPlantPlacements(mockSupabase, commandWithSpecialChars);

      // Sprawdź czy znaki % i _ zostały escape'owane
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("plant_name", expect.stringContaining("\\%"));
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("plant_name", expect.stringContaining("\\_"));
    });
  });

  describe("deletePlantPlacement", () => {
    const command: DeletePlantPlacementCommand = {
      planId,
      x: 5,
      y: 7,
      userId,
    };

    it("powinien usunąć nasadzenie gdy wszystko jest poprawne", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla delete - tworzymy osobny query builder dla plant_placements
      const plantPlacementsBuilder = createQueryBuilder();
      const deletePromise = Promise.resolve({
        error: null,
        count: 1,
      });
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder); // plan_id
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder); // x
      plantPlacementsBuilder.eq.mockReturnValueOnce(deletePromise); // y (ostatnie)
      mockQueryBuilder.delete.mockReturnValueOnce(plantPlacementsBuilder);

      const result = await deletePlantPlacement(mockSupabase, command);

      expect(result.deleted).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockSupabase.from).toHaveBeenCalledWith("plant_placements");
      expect(mockQueryBuilder.delete).toHaveBeenCalledWith({ count: "exact" });
      expect(plantPlacementsBuilder.eq).toHaveBeenCalledWith("plan_id", planId);
      expect(plantPlacementsBuilder.eq).toHaveBeenCalledWith("x", 5);
      expect(plantPlacementsBuilder.eq).toHaveBeenCalledWith("y", 7);
    });

    it("powinien rzucić błąd gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow("Plan not found");
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy pobieraniu planu", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Database error");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow("Database error");
    });

    it("powinien rzucić ValidationError gdy wymiary siatki są null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: planId, grid_width: null, grid_height: null },
        error: null,
      });

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow(
        "Grid dimensions are not set for this plan"
      );
    });

    it("powinien rzucić ValidationError gdy x jest ujemne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, x: -1 };

      await expect(deletePlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy x jest >= gridWidth", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, x: 20 };

      await expect(deletePlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy y jest ujemne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, y: -1 };

      await expect(deletePlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy y jest >= gridHeight", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const invalidCommand = { ...command, y: 20 };

      await expect(deletePlantPlacement(mockSupabase, invalidCommand)).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić błąd gdy plant placement nie istnieje (count === 0)", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const plantPlacementsBuilder = createQueryBuilder();
      const deletePromise = Promise.resolve({
        error: null,
        count: 0,
      });
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(deletePromise);
      mockQueryBuilder.delete.mockReturnValueOnce(plantPlacementsBuilder);

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow("Plant placement not found");
    });

    it("powinien rzucić błąd gdy count jest null", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const plantPlacementsBuilder = createQueryBuilder();
      const deletePromise = Promise.resolve({
        error: null,
        count: null,
      });
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(deletePromise);
      mockQueryBuilder.delete.mockReturnValueOnce(plantPlacementsBuilder);

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow("Plant placement not found");
    });

    it("powinien rzucić błąd gdy usunięto więcej niż 1 rekord", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const plantPlacementsBuilder = createQueryBuilder();
      const deletePromise = Promise.resolve({
        error: null,
        count: 2,
      });
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(deletePromise);
      mockQueryBuilder.delete.mockReturnValueOnce(plantPlacementsBuilder);

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow(
        "Unexpected: deleted 2 records instead of 1"
      );
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy delete", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();
      const dbError = new Error("Delete error");

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const plantPlacementsBuilder = createQueryBuilder();
      const deletePromise = Promise.resolve({
        error: dbError,
        count: null,
      });
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(plantPlacementsBuilder);
      plantPlacementsBuilder.eq.mockReturnValueOnce(deletePromise);
      mockQueryBuilder.delete.mockReturnValueOnce(plantPlacementsBuilder);

      await expect(deletePlantPlacement(mockSupabase, command)).rejects.toThrow("Delete error");
    });
  });
});
