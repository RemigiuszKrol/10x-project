import { describe, it, expect } from "vitest";
import {
  gridCellsPathSchema,
  gridCellsQuerySchema,
  gridCellUpdatePathSchema,
  gridCellUpdateSchema,
  parseGridCursor,
  encodeGridCursor,
  type GridCellCursorPayload,
} from "@/lib/validation/grid";

describe("Grid Validation", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  describe("gridCellsPathSchema", () => {
    it("powinien zaakceptować poprawny UUID", () => {
      const result = gridCellsPathSchema.safeParse({
        plan_id: validUUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID format", () => {
      const result = gridCellsPathSchema.safeParse({
        plan_id: "invalid-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plan ID must be a valid UUID");
      }
    });

    it("powinien odrzucić pusty string", () => {
      const result = gridCellsPathSchema.safeParse({
        plan_id: "",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null", () => {
      const result = gridCellsPathSchema.safeParse({
        plan_id: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined", () => {
      const result = gridCellsPathSchema.safeParse({
        plan_id: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak pola plan_id", () => {
      const result = gridCellsPathSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ (number)", () => {
      const result = gridCellsPathSchema.safeParse({
        plan_id: 123,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("gridCellsQuerySchema", () => {
    describe("type - walidacja opcjonalnego enum", () => {
      it("powinien zaakceptować 'soil'", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "soil",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("soil");
        }
      });

      it("powinien zaakceptować 'water'", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "water",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("water");
        }
      });

      it("powinien zaakceptować 'path'", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "path",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("path");
        }
      });

      it("powinien zaakceptować 'building'", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "building",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("building");
        }
      });

      it("powinien zaakceptować 'blocked'", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "blocked",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("blocked");
        }
      });

      it("powinien odrzucić nieprawidłowy typ", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "invalid",
        });

        expect(result.success).toBe(false);
      });

      it("powinien zaakceptować undefined jako type", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBeUndefined();
        }
      });
    });

    describe("x i y - walidacja współrzędnych", () => {
      it("powinien zaakceptować poprawne x i y razem", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: "5",
          y: "10",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x).toBe(5);
          expect(result.data.y).toBe(10);
        }
      });

      it("powinien skonwertować stringi na liczby (coerce)", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: "0",
          y: "0",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x).toBe(0);
          expect(result.data.y).toBe(0);
        }
      });

      it("powinien zaakceptować x=0 i y=0", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: 0,
          y: 0,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x).toBe(0);
          expect(result.data.y).toBe(0);
        }
      });

      it("powinien odrzucić ujemne x", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: -1,
          y: 5,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("x must be a non-negative integer");
        }
      });

      it("powinien odrzucić ujemne y", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: 5,
          y: -1,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("y must be a non-negative integer");
        }
      });

      it("powinien odrzucić x bez y", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: 5,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.some((e) => e.message.includes("Both x and y must be provided together"))).toBe(
            true
          );
        }
      });

      it("powinien odrzucić y bez x", () => {
        const result = gridCellsQuerySchema.safeParse({
          y: 5,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.some((e) => e.message.includes("Both x and y must be provided together"))).toBe(
            true
          );
        }
      });

      it("powinien zaakceptować brak x i y", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x).toBeUndefined();
          expect(result.data.y).toBeUndefined();
        }
      });

      it("powinien odrzucić niecałkowite x", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: 5.5,
          y: 10,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić niecałkowite y", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: 5,
          y: 10.5,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("bbox - walidacja prostokątnego obszaru", () => {
      it("powinien zaakceptować poprawny bbox", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "0,0,10,10",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bbox).toEqual([0, 0, 10, 10]);
        }
      });

      it("powinien ztransformować bbox string na krotkę liczb", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "5,10,15,20",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bbox).toEqual([5, 10, 15, 20]);
        }
      });

      it("powinien odrzucić nieprawidłowy format bbox (za mało wartości)", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "0,0,10",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("bbox must be in format 'x1,y1,x2,y2'");
        }
      });

      it("powinien odrzucić nieprawidłowy format bbox (za dużo wartości)", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "0,0,10,10,20",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("bbox must be in format 'x1,y1,x2,y2'");
        }
      });

      it("powinien odrzucić bbox z literami", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "a,b,c,d",
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić bbox gdzie x1 > x2", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "10,0,5,10",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.some((e) => e.message.includes("bbox must have x1 <= x2"))).toBe(true);
        }
      });

      it("powinien odrzucić bbox gdzie y1 > y2", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "0,10,10,5",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.some((e) => e.message.includes("bbox must have y1 <= y2"))).toBe(true);
        }
      });

      it("powinien zaakceptować bbox gdzie x1 = x2 i y1 = y2", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "5,5,5,5",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bbox).toEqual([5, 5, 5, 5]);
        }
      });

      it("powinien zaakceptować undefined jako bbox", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bbox).toBeUndefined();
        }
      });

      it("powinien odrzucić jednoczesne użycie x/y i bbox", () => {
        const result = gridCellsQuerySchema.safeParse({
          x: 5,
          y: 10,
          bbox: "0,0,10,10",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(
            result.error.errors.some((e) => e.message.includes("Cannot use both x/y and bbox filters together"))
          ).toBe(true);
        }
      });
    });

    describe("limit - walidacja paginacji", () => {
      it("powinien zaakceptować poprawny limit jako liczbę", () => {
        const result = gridCellsQuerySchema.safeParse({
          limit: 50,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
        }
      });

      it("powinien skonwertować string na liczbę (coerce)", () => {
        const result = gridCellsQuerySchema.safeParse({
          limit: "25",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(25);
        }
      });

      it("powinien zaakceptować undefined jako limit", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBeUndefined();
        }
      });

      it("powinien odrzucić niecałkowity limit", () => {
        const result = gridCellsQuerySchema.safeParse({
          limit: 50.5,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("cursor - walidacja kursora paginacji", () => {
      it("powinien zaakceptować poprawny cursor string", () => {
        const result = gridCellsQuerySchema.safeParse({
          cursor: "eyJ1cGRhdGVkX2F0IjoiMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwieCI6NSwieSI6MTB9",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBe("eyJ1cGRhdGVkX2F0IjoiMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwieCI6NSwieSI6MTB9");
        }
      });

      it("powinien zaakceptować undefined jako cursor", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBeUndefined();
        }
      });
    });

    describe("sort i order - walidacja sortowania", () => {
      it("powinien ustawić domyślny sort na 'updated_at'", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("updated_at");
        }
      });

      it("powinien ustawić domyślny order na 'desc'", () => {
        const result = gridCellsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("desc");
        }
      });

      it("powinien zaakceptować sort='x'", () => {
        const result = gridCellsQuerySchema.safeParse({
          sort: "x",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe("x");
        }
      });

      it("powinien zaakceptować order='asc'", () => {
        const result = gridCellsQuerySchema.safeParse({
          order: "asc",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("asc");
        }
      });

      it("powinien odrzucić nieprawidłowy sort", () => {
        const result = gridCellsQuerySchema.safeParse({
          sort: "invalid",
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić nieprawidłowy order", () => {
        const result = gridCellsQuerySchema.safeParse({
          order: "invalid",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("strict mode - odrzucanie dodatkowych pól", () => {
      it("powinien odrzucić dodatkowe pola", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "soil",
          invalid_field: "value",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("kombinacje filtrów", () => {
      it("powinien zaakceptować type i limit razem", () => {
        const result = gridCellsQuerySchema.safeParse({
          type: "soil",
          limit: 50,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("soil");
          expect(result.data.limit).toBe(50);
        }
      });

      it("powinien zaakceptować bbox z sort i order", () => {
        const result = gridCellsQuerySchema.safeParse({
          bbox: "0,0,10,10",
          sort: "x",
          order: "asc",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.bbox).toEqual([0, 0, 10, 10]);
          expect(result.data.sort).toBe("x");
          expect(result.data.order).toBe("asc");
        }
      });
    });
  });

  describe("gridCellUpdatePathSchema", () => {
    it("powinien zaakceptować poprawne parametry", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: "5",
        y: "10",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
        expect(result.data.x).toBe(5);
        expect(result.data.y).toBe(10);
      }
    });

    it("powinien skonwertować stringi x i y na liczby", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: "0",
        y: "0",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(0);
        expect(result.data.y).toBe(0);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: "invalid-uuid",
        x: 5,
        y: 10,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plan ID must be a valid UUID");
      }
    });

    it("powinien odrzucić ujemne x", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: -1,
        y: 10,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("x must be a non-negative integer");
      }
    });

    it("powinien odrzucić ujemne y", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: -1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("y must be a non-negative integer");
      }
    });

    it("powinien zaakceptować x=0 i y=0", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: 0,
        y: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(0);
        expect(result.data.y).toBe(0);
      }
    });

    it("powinien odrzucić brak plan_id", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        x: 5,
        y: 10,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak x", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        y: 10,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak y", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: 5,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić niecałkowite x", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: 5.5,
        y: 10,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić niecałkowite y", () => {
      const result = gridCellUpdatePathSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: 10.5,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("gridCellUpdateSchema", () => {
    it("powinien zaakceptować type='soil'", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "soil",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("soil");
      }
    });

    it("powinien zaakceptować type='path'", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "path",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("path");
      }
    });

    it("powinien zaakceptować type='water'", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "water",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("water");
      }
    });

    it("powinien zaakceptować type='building'", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "building",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("building");
      }
    });

    it("powinien zaakceptować type='blocked'", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "blocked",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("blocked");
      }
    });

    it("powinien odrzucić nieprawidłowy type", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "invalid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Type must be one of: soil, path, water, building, blocked");
      }
    });

    it("powinien odrzucić brak pola type", () => {
      const result = gridCellUpdateSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null jako type", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako type", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ (number)", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: 123,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić dodatkowe pola (strict mode)", () => {
      const result = gridCellUpdateSchema.safeParse({
        type: "soil",
        invalid_field: "value",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("parseGridCursor", () => {
    it("powinien poprawnie sparsować poprawny kursor Base64", () => {
      const payload: GridCellCursorPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: 5,
        y: 10,
      };
      const cursor = encodeGridCursor(payload);

      const result = parseGridCursor(cursor);

      expect(result).toEqual(payload);
      expect(result.updated_at).toBe("2024-01-01T00:00:00.000Z");
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });

    it("powinien poprawnie sparsować kursor z różnymi współrzędnymi", () => {
      const payload: GridCellCursorPayload = {
        updated_at: "2024-12-31T23:59:59.999Z",
        x: 0,
        y: 0,
      };
      const cursor = encodeGridCursor(payload);

      const result = parseGridCursor(cursor);

      expect(result).toEqual(payload);
    });

    it("powinien rzucić błąd dla nieprawidłowego formatu Base64", () => {
      expect(() => parseGridCursor("invalid-base64!!!")).toThrow("Invalid cursor format");
    });

    it("powinien rzucić błąd dla nieprawidłowego JSON w kursorze", () => {
      const invalidJson = Buffer.from("invalid json", "utf-8").toString("base64");
      expect(() => parseGridCursor(invalidJson)).toThrow("Invalid cursor format");
    });

    it("powinien rzucić błąd dla kursora bez pola updated_at", () => {
      const invalidPayload = { x: 5, y: 10 };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid cursor structure");
    });

    it("powinien rzucić błąd dla kursora bez pola x", () => {
      const invalidPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        y: 10,
      };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid cursor structure");
    });

    it("powinien rzucić błąd dla kursora bez pola y", () => {
      const invalidPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: 5,
      };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid cursor structure");
    });

    it("powinien rzucić błąd dla nieprawidłowego typu updated_at", () => {
      const invalidPayload = {
        updated_at: 123,
        x: 5,
        y: 10,
      };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid cursor structure");
    });

    it("powinien rzucić błąd dla nieprawidłowego typu x", () => {
      const invalidPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: "5",
        y: 10,
      };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid cursor structure");
    });

    it("powinien rzucić błąd dla nieprawidłowego typu y", () => {
      const invalidPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: 5,
        y: "10",
      };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid cursor structure");
    });

    it("powinien rzucić błąd dla nieprawidłowego ISO timestamp", () => {
      const invalidPayload = {
        updated_at: "invalid-date",
        x: 5,
        y: 10,
      };
      const cursor = Buffer.from(JSON.stringify(invalidPayload), "utf-8").toString("base64");

      expect(() => parseGridCursor(cursor)).toThrow("Invalid updated_at timestamp in cursor");
    });

    it("powinien rzucić błąd dla pustego stringa", () => {
      expect(() => parseGridCursor("")).toThrow("Invalid cursor format");
    });

    it("powinien rzucić błąd dla null", () => {
      // @ts-expect-error - testowanie nieprawidłowego typu
      expect(() => parseGridCursor(null)).toThrow();
    });
  });

  describe("encodeGridCursor", () => {
    it("powinien zakodować poprawny payload do Base64", () => {
      const payload: GridCellCursorPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: 5,
        y: 10,
      };

      const cursor = encodeGridCursor(payload);

      expect(typeof cursor).toBe("string");
      expect(cursor.length).toBeGreaterThan(0);
      // Sprawdź czy można zdekodować
      const decoded = parseGridCursor(cursor);
      expect(decoded).toEqual(payload);
    });

    it("powinien zakodować payload z zerowymi współrzędnymi", () => {
      const payload: GridCellCursorPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: 0,
        y: 0,
      };

      const cursor = encodeGridCursor(payload);
      const decoded = parseGridCursor(cursor);

      expect(decoded).toEqual(payload);
    });

    it("powinien zakodować payload z dużymi współrzędnymi", () => {
      const payload: GridCellCursorPayload = {
        updated_at: "2024-12-31T23:59:59.999Z",
        x: 199,
        y: 199,
      };

      const cursor = encodeGridCursor(payload);
      const decoded = parseGridCursor(cursor);

      expect(decoded).toEqual(payload);
    });

    it("powinien zakodować payload z różnymi timestampami", () => {
      const payload: GridCellCursorPayload = {
        updated_at: "2023-06-15T12:30:45.123Z",
        x: 50,
        y: 75,
      };

      const cursor = encodeGridCursor(payload);
      const decoded = parseGridCursor(cursor);

      expect(decoded).toEqual(payload);
    });
  });

  describe("encodeGridCursor i parseGridCursor - roundtrip", () => {
    it("powinien zachować dane po zakodowaniu i dekodowaniu", () => {
      const original: GridCellCursorPayload = {
        updated_at: "2024-01-01T00:00:00.000Z",
        x: 42,
        y: 84,
      };

      const cursor = encodeGridCursor(original);
      const decoded = parseGridCursor(cursor);

      expect(decoded).toEqual(original);
    });

    it("powinien działać dla wielu różnych payloadów", () => {
      const testCases: GridCellCursorPayload[] = [
        { updated_at: "2024-01-01T00:00:00.000Z", x: 0, y: 0 },
        { updated_at: "2024-06-15T12:30:45.123Z", x: 50, y: 75 },
        { updated_at: "2024-12-31T23:59:59.999Z", x: 199, y: 199 },
      ];

      testCases.forEach((payload) => {
        const cursor = encodeGridCursor(payload);
        const decoded = parseGridCursor(cursor);
        expect(decoded).toEqual(payload);
      });
    });
  });
});
