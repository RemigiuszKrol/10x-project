import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { GridCellDto, GridCellUpdateCommand, ListGridCellsParams } from "@/types";
import { listGridCells, getPlanGridMetadata, updateGridCellType } from "@/lib/services/grid-cells.service";
import { ValidationError } from "@/lib/http/errors";
import { PlanNotFoundError } from "@/lib/http/weather.errors";
import { encodeGridCursor } from "@/lib/validation/grid";

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
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
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

describe("grid-cells.service", () => {
  const userId = "user-123";
  const planId = "plan-456";
  const mockPlan = {
    id: planId,
    user_id: userId,
    grid_width: 20,
    grid_height: 20,
  };
  const mockMetadata = {
    grid_width: 20,
    grid_height: 20,
    cell_size_cm: 50,
  };
  const mockCell: GridCellDto = {
    x: 5,
    y: 5,
    type: "soil",
    updated_at: "2024-01-01T00:00:00Z",
  };

  describe("listGridCells", () => {
    it("powinien zwrócić listę komórek gdy plan istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      // Mock dla pobrania planu
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Mock dla pobrania komórek - ostatnie order() zwraca Promise gdy limit nie jest podany
      const mockCells = [mockCell];
      const orderPromise = Promise.resolve({
        data: mockCells,
        error: null,
      });
      // Pierwsze 2 wywołania order() zwracają this, ostatnie zwraca Promise
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // updated_at
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // x
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise); // y (ostatnie)

      const params: ListGridCellsParams = {
        planId,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockCell);
      expect(result.pagination.next_cursor).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockSupabase.from).toHaveBeenCalledWith("grid_cells");
    });

    it("powinien rzucić PlanNotFoundError gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const params: ListGridCellsParams = {
        planId,
        sort: "updated_at",
        order: "desc",
      };

      await expect(listGridCells(mockSupabase, userId, params)).rejects.toThrow(PlanNotFoundError);
    });

    it("powinien rzucić błąd gdy wystąpi błąd bazy danych przy pobieraniu planu", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      const dbError = new Error("Database error");
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      const params: ListGridCellsParams = {
        planId,
        sort: "updated_at",
        order: "desc",
      };

      await expect(listGridCells(mockSupabase, userId, params)).rejects.toThrow("Database error");
    });

    it("powinien zastosować filtr po typie komórki", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const filteredCell: GridCellDto = { ...mockCell, type: "water" };
      const orderPromise = Promise.resolve({
        data: [filteredCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        type: "water",
        sort: "updated_at",
        order: "desc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data[0].type).toBe("water");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("type", "water");
    });

    it("powinien zastosować filtr po pojedynczej pozycji (x, y)", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const orderPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        x: 5,
        y: 5,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("x", 5);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("y", 5);
    });

    it("powinien zastosować filtr po bbox", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const orderPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        bbox: [0, 0, 10, 10],
        sort: "updated_at",
        order: "desc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("x", 0);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("x", 10);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("y", 0);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("y", 10);
    });

    it("powinien rzucić ValidationError gdy współrzędne x,y są poza zakresem", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: ListGridCellsParams = {
        planId,
        x: 25, // Poza zakresem (grid_width = 20)
        y: 5,
        sort: "updated_at",
        order: "desc",
      };

      await expect(listGridCells(mockSupabase, userId, params)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy bbox jest poza zakresem", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: ListGridCellsParams = {
        planId,
        bbox: [0, 0, 25, 10], // x2 poza zakresem
        sort: "updated_at",
        order: "desc",
      };

      await expect(listGridCells(mockSupabase, userId, params)).rejects.toThrow(ValidationError);
    });

    it("powinien zastosować kursor do paginacji dla sortowania DESC", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cursorPayload = {
        updated_at: "2024-01-01T00:00:00Z",
        x: 5,
        y: 5,
      };
      const cursor = encodeGridCursor(cursorPayload);

      const orderPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        cursor,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.lt).toHaveBeenCalledWith("updated_at", cursorPayload.updated_at);
    });

    it("powinien zastosować kursor do paginacji dla sortowania ASC", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cursorPayload = {
        updated_at: "2024-01-01T00:00:00Z",
        x: 5,
        y: 5,
      };
      const cursor = encodeGridCursor(cursorPayload);

      const orderPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        cursor,
        sort: "updated_at",
        order: "asc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.gt).toHaveBeenCalledWith("updated_at", cursorPayload.updated_at);
    });

    it("powinien rzucić ValidationError gdy kursor jest niepoprawny", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const params: ListGridCellsParams = {
        planId,
        cursor: "invalid-cursor",
        sort: "updated_at",
        order: "desc",
      };

      await expect(listGridCells(mockSupabase, userId, params)).rejects.toThrow(ValidationError);
    });

    it("powinien zastosować sortowanie po updated_at", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const orderPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        sort: "updated_at",
        order: "desc",
      };

      await listGridCells(mockSupabase, userId, params);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith("updated_at", { ascending: false });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("x", { ascending: true });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("y", { ascending: true });
    });

    it("powinien zastosować sortowanie po x", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const orderPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        sort: "x",
        order: "asc",
      };

      await listGridCells(mockSupabase, userId, params);

      expect(mockQueryBuilder.order).toHaveBeenCalledWith("x", { ascending: true });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("y", { ascending: true });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    });

    it("powinien zastosować limit", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      // Gdy limit jest podany, limit() jest ostatnią metodą i zwraca Promise
      const limitPromise = Promise.resolve({
        data: [mockCell],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // updated_at
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // x
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder); // y
      mockQueryBuilder.limit.mockReturnValueOnce(limitPromise);

      const params: ListGridCellsParams = {
        planId,
        limit: 10,
        sort: "updated_at",
        order: "desc",
      };

      await listGridCells(mockSupabase, userId, params);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it("powinien zwrócić pustą listę gdy brak komórek", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const orderPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        sort: "updated_at",
        order: "desc",
      };

      const result = await listGridCells(mockSupabase, userId, params);

      expect(result.data).toEqual([]);
      expect(result.pagination.next_cursor).toBeNull();
    });

    it("powinien rzucić błąd gdy wystąpi błąd przy pobieraniu komórek", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockPlan,
        error: null,
      });

      const cellsError = new Error("Cells query error");
      const orderPromise = Promise.resolve({
        data: null,
        error: cellsError,
      });
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValueOnce(orderPromise);

      const params: ListGridCellsParams = {
        planId,
        sort: "updated_at",
        order: "desc",
      };

      await expect(listGridCells(mockSupabase, userId, params)).rejects.toThrow("Cells query error");
    });
  });

  describe("getPlanGridMetadata", () => {
    it("powinien zwrócić metadane gdy plan istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: mockMetadata,
        error: null,
      });

      const result = await getPlanGridMetadata(mockSupabase, userId, planId);

      expect(result).toEqual(mockMetadata);
      expect(mockSupabase.from).toHaveBeenCalledWith("plans");
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("grid_width, grid_height, cell_size_cm");
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", planId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", userId);
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

  describe("updateGridCellType", () => {
    const command: GridCellUpdateCommand = {
      type: "water",
    };

    it("powinien zaktualizować typ komórki gdy wszystko jest poprawne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      // Mock dla getPlanGridMetadata (wywoływane wewnątrz updateGridCellType)
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      // Mock dla upsert
      const updatedCell: GridCellDto = {
        x: 5,
        y: 5,
        type: "water",
        updated_at: "2024-01-01T00:00:00Z",
      };
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: updatedCell,
        error: null,
      });

      const result = await updateGridCellType(mockSupabase, userId, planId, 5, 5, command);

      expect(result).toEqual(updatedCell);
      expect(result.type).toBe("water");
      expect(mockSupabase.from).toHaveBeenCalledWith("grid_cells");
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: planId,
          x: 5,
          y: 5,
          type: "water",
        }),
        expect.objectContaining({
          onConflict: "plan_id,x,y",
          ignoreDuplicates: false,
        })
      );
    });

    it("powinien rzucić PlanNotFoundError gdy plan nie istnieje", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, 5, 5, command)).rejects.toThrow(PlanNotFoundError);
    });

    it("powinien rzucić ValidationError gdy współrzędne są poza zakresem", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, 25, 5, command)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy x jest ujemne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, -1, 5, command)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić ValidationError gdy y jest ujemne", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, 5, -1, command)).rejects.toThrow(ValidationError);
    });

    it("powinien zmapować błąd RLS na Error z kodem PGRST301", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      const rlsError = {
        message: "new row violates row-level security policy",
        code: "PGRST301",
      };
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: rlsError,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, 5, 5, command)).rejects.toThrow();
    });

    it("powinien zmapować błąd constraint na ValidationError", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      const constraintError = {
        message: "check constraint violation",
        code: "23514",
        details: "Some constraint details",
      };
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: constraintError,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, 5, 5, command)).rejects.toThrow(ValidationError);
    });

    it("powinien rzucić błąd gdy upsert nie zwraca danych", async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabaseClient();

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockMetadata,
        error: null,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(updateGridCellType(mockSupabase, userId, planId, 5, 5, command)).rejects.toThrow(
        "Failed to update grid cell: no data returned"
      );
    });
  });
});
