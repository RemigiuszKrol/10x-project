import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { SetAreaTypeServiceParams } from "@/types";
import { setAreaType } from "@/lib/services/grid-area.service";
import { NotFoundError, PlantRemovalRequiresConfirmationError, ValidationError } from "@/lib/http/errors";

/**
 * Helper do tworzenia mocka Supabase clienta
 * Symuluje chainable API Supabase (from().select().eq().maybeSingle() etc.)
 */
function createMockSupabaseClient() {
  // Query builder dla select/update queries
  const createQueryBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
    };
    return builder;
  };

  const mockQueryBuilder = createQueryBuilder();

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder) as unknown as typeof mockQueryBuilder,
  } as unknown as SupabaseClient;

  return { mockSupabase, mockQueryBuilder, createQueryBuilder };
}

describe("grid-area.service", () => {
  const userId = "user-123";
  const planId = "plan-456";
  const mockPlan = {
    id: planId,
    grid_width: 20,
    grid_height: 20,
  };

  describe("setAreaType", () => {
    it("powinien ustawić typ obszaru gdy wszystko jest poprawne", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla aktualizacji komórek - update zwraca nowy query builder
      // Chain: update() -> eq() -> gte("x") -> lte("x") -> gte("y") -> lte("y")
      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      // Chain: gte("x") -> lte("x") -> gte("y") -> lte("y") -> Promise
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      const result = await setAreaType(mockSupabase, userId, params);

      expect(result.affected_cells).toBe(36); // (5-0+1) * (5-0+1) = 6 * 6 = 36
      expect(result.removed_plants).toBe(0);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockSupabase.from).toHaveBeenCalledWith("grid_cells");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("plan_id", planId);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("x", 0);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("x", 5);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("y", 0);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("y", 5);
    });

    it("powinien ustawić typ 'soil' bez sprawdzania roślin", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 2,
        y1: 2,
        x2: 4,
        y2: 4,
        type: "soil",
      };

      const result = await setAreaType(mockSupabase, userId, params);

      expect(result.affected_cells).toBe(9); // (4-2+1) * (4-2+1) = 3 * 3 = 9
      expect(result.removed_plants).toBe(0);
      // Nie powinno sprawdzać plant_placements dla typu 'soil'
      expect(mockSupabase.from).not.toHaveBeenCalledWith("plant_placements");
    });

    it("powinien rzucić NotFoundError gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(NotFoundError);
      await expect(promise).rejects.toThrow("Plan not found or access denied");
    });

    it("powinien rzucić ValidationError gdy wymiary siatki są null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          id: planId,
          grid_width: null,
          grid_height: null,
        },
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Grid dimensions are not set for this plan");
    });

    it("powinien rzucić ValidationError gdy grid_width jest null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          id: planId,
          grid_width: null,
          grid_height: 20,
        },
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      await expect(setAreaType(mockSupabase, userId, params)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy grid_height jest null", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          id: planId,
          grid_width: 20,
          grid_height: null,
        },
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      await expect(setAreaType(mockSupabase, userId, params)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy x1 > x2", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 5,
        y1: 0,
        x2: 2,
        y2: 5,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Invalid coordinate order");
    });

    it("powinien rzucić ValidationError gdy y1 > y2", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 5,
        x2: 5,
        y2: 2,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Invalid coordinate order");
    });

    it("powinien rzucić ValidationError gdy x1 < 0", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: -1,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy y1 < 0", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: -1,
        x2: 5,
        y2: 5,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy x2 >= grid_width", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 20, // grid_width = 20, więc x2 >= 20 jest poza zakresem
        y2: 5,
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić ValidationError gdy y2 >= grid_height", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 20, // grid_height = 20, więc y2 >= 20 jest poza zakresem
        type: "path",
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow("Coordinates out of bounds");
    });

    it("powinien rzucić PlantRemovalRequiresConfirmationError gdy są rośliny i brak potwierdzenia", async () => {
      const { mockSupabase, createQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const planQueryBuilder = createQueryBuilder();
      planQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it
      mockSupabase.from.mockReturnValueOnce(planQueryBuilder);

      // Mock dla sprawdzenia liczby roślin - select z count zwraca Promise
      const countQueryBuilder = createQueryBuilder();
      const countPromise = Promise.resolve({
        count: 3,
        error: null,
      });
      // Chain: gte("x") -> lte("x") -> gte("y") -> lte("y") -> Promise
      countQueryBuilder.gte.mockReturnValueOnce(countQueryBuilder); // gte("x")
      countQueryBuilder.lte.mockReturnValueOnce(countQueryBuilder); // lte("x")
      countQueryBuilder.gte.mockReturnValueOnce(countQueryBuilder); // gte("y")
      countQueryBuilder.lte.mockReturnValueOnce(countPromise); // lte("y") -> Promise
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it

      mockSupabase.from.mockReturnValueOnce(countQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
        confirmPlantRemoval: false,
      };

      const promise = setAreaType(mockSupabase, userId, params);
      await expect(promise).rejects.toThrow(PlantRemovalRequiresConfirmationError);
      await expect(promise).rejects.toThrow("There are 3 plant(s) in the selected area");
    });

    it("powinien usunąć rośliny gdy są rośliny i jest potwierdzenie", async () => {
      const { mockSupabase, createQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const planQueryBuilder = createQueryBuilder();
      planQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it
      mockSupabase.from.mockReturnValueOnce(planQueryBuilder);

      // Mock dla sprawdzenia liczby roślin
      const countQueryBuilder = createQueryBuilder();
      const countPromise = Promise.resolve({
        count: 2,
        error: null,
      });
      countQueryBuilder.gte.mockReturnValueOnce(countQueryBuilder); // gte("x")
      countQueryBuilder.lte.mockReturnValueOnce(countQueryBuilder); // lte("x")
      countQueryBuilder.gte.mockReturnValueOnce(countQueryBuilder); // gte("y")
      countQueryBuilder.lte.mockReturnValueOnce(countPromise); // lte("y") -> Promise
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it

      mockSupabase.from.mockReturnValueOnce(countQueryBuilder);

      // Mock dla aktualizacji komórek
      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it

      mockSupabase.from.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "water",
        confirmPlantRemoval: true,
      };

      const result = await setAreaType(mockSupabase, userId, params);

      expect(result.affected_cells).toBe(36);
      expect(result.removed_plants).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("plant_placements");
    });

    it("powinien poprawnie obliczyć liczbę zmienionych komórek dla prostokąta", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 3,
        y1: 7,
        x2: 8,
        y2: 12,
        type: "building",
      };

      const result = await setAreaType(mockSupabase, userId, params);

      // (8-3+1) * (12-7+1) = 6 * 6 = 36
      expect(result.affected_cells).toBe(36);
      expect(result.removed_plants).toBe(0);
    });

    it("powinien rzucić błąd gdy wystąpi błąd podczas pobierania planu", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      const dbError = new Error("Database connection error");
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      await expect(setAreaType(mockSupabase, userId, params)).rejects.toThrow("Database connection error");
    });

    it("powinien rzucić błąd gdy wystąpi błąd podczas liczenia roślin", async () => {
      const { mockSupabase, createQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      const planQueryBuilder = createQueryBuilder();
      planQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it
      mockSupabase.from.mockReturnValueOnce(planQueryBuilder);

      const countError = new Error("Count query failed");
      const countQueryBuilder = createQueryBuilder();
      const countPromise = Promise.resolve({
        count: null,
        error: countError,
      });
      countQueryBuilder.gte.mockReturnValueOnce(countQueryBuilder); // gte("x")
      countQueryBuilder.lte.mockReturnValueOnce(countQueryBuilder); // lte("x")
      countQueryBuilder.gte.mockReturnValueOnce(countQueryBuilder); // gte("y")
      countQueryBuilder.lte.mockReturnValueOnce(countPromise); // lte("y") -> Promise
      // @ts-expect-error - mockReturnValueOnce is available on vi.fn() but TypeScript doesn't recognize it

      mockSupabase.from.mockReturnValueOnce(countQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      await expect(setAreaType(mockSupabase, userId, params)).rejects.toThrow("Count query failed");
    });

    it("powinien rzucić błąd gdy wystąpi błąd podczas aktualizacji komórek", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const updateError = new Error("Update failed");
      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: updateError,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "path",
      };

      await expect(setAreaType(mockSupabase, userId, params)).rejects.toThrow("Update failed");
    });

    it("powinien zaakceptować współrzędne na granicach siatki", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      // x2 = 19, y2 = 19 (grid_width = 20, grid_height = 20, więc x2 < 20 i y2 < 20)
      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 19,
        y2: 19,
        type: "path",
      };

      const result = await setAreaType(mockSupabase, userId, params);

      expect(result.affected_cells).toBe(400); // (19-0+1) * (19-0+1) = 20 * 20 = 400
      expect(result.removed_plants).toBe(0);
    });

    it("powinien zaakceptować pojedynczą komórkę (x1 === x2, y1 === y2)", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 5,
        y1: 5,
        x2: 5,
        y2: 5,
        type: "water",
      };

      const result = await setAreaType(mockSupabase, userId, params);

      expect(result.affected_cells).toBe(1); // (5-5+1) * (5-5+1) = 1 * 1 = 1
      expect(result.removed_plants).toBe(0);
    });

    it("powinien zwrócić 0 usuniętych roślin gdy typ to 'soil' nawet jeśli są rośliny", async () => {
      const { mockSupabase, mockQueryBuilder, createQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const updateQueryBuilder = createQueryBuilder();
      const updatePromise = Promise.resolve({
        data: null,
        error: null,
      });
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("x")
      updateQueryBuilder.lte.mockReturnValueOnce(updateQueryBuilder); // lte("x")
      updateQueryBuilder.gte.mockReturnValueOnce(updateQueryBuilder); // gte("y")
      updateQueryBuilder.lte.mockReturnValueOnce(updatePromise); // lte("y") -> Promise
      mockQueryBuilder.update.mockReturnValueOnce(updateQueryBuilder);

      const params: SetAreaTypeServiceParams = {
        planId,
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
        type: "soil",
      };

      const result = await setAreaType(mockSupabase, userId, params);

      expect(result.affected_cells).toBe(36);
      expect(result.removed_plants).toBe(0);
      // Nie powinno sprawdzać plant_placements dla typu 'soil'
      expect(mockSupabase.from).not.toHaveBeenCalledWith("plant_placements");
    });
  });
});
