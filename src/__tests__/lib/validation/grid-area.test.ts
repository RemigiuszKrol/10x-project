import { describe, it, expect } from "vitest";
import {
  gridAreaTypePathSchema,
  gridAreaTypePayloadSchema,
  type GridAreaTypePathParams,
  type GridAreaTypePayload,
} from "@/lib/validation/grid-area";

describe("Grid Area Validation", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  describe("gridAreaTypePathSchema", () => {
    describe("plan_id - walidacja UUID", () => {
      it("powinien zaakceptować poprawny UUID", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: validUUID,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.plan_id).toBe(validUUID);
        }
      });

      it("powinien zaakceptować inny poprawny UUID", () => {
        const anotherUUID = "123e4567-e89b-12d3-a456-426614174000";
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: anotherUUID,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.plan_id).toBe(anotherUUID);
        }
      });

      it("powinien odrzucić nieprawidłowy UUID (brak myślników)", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: "550e8400e29b41d4a716446655440000",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić nieprawidłowy UUID (za krótki)", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: "550e8400-e29b-41d4-a716",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić nieprawidłowy UUID (nieprawidłowe znaki)", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: "550e8400-e29b-41d4-a716-44665544000g",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić pusty string", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: "",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić null", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: null,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić undefined", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: undefined,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić brak pola plan_id", () => {
        const result = gridAreaTypePathSchema.safeParse({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["plan_id"]);
        }
      });

      it("powinien odrzucić nieprawidłowy typ (number)", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: 123,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić nieprawidłowy typ (array)", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: [validUUID],
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić nieprawidłowy typ (object)", () => {
        const result = gridAreaTypePathSchema.safeParse({
          plan_id: { id: validUUID },
        });

        expect(result.success).toBe(false);
      });
    });
  });

  describe("gridAreaTypePayloadSchema", () => {
    const validPayload = {
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      type: "soil" as const,
    };

    describe("happy path", () => {
      it("powinien zaakceptować poprawny payload z wszystkimi polami", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: true,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x1).toBe(0);
          expect(result.data.y1).toBe(0);
          expect(result.data.x2).toBe(10);
          expect(result.data.y2).toBe(10);
          expect(result.data.type).toBe("soil");
          expect(result.data.confirm_plant_removal).toBe(true);
        }
      });

      it("powinien zaakceptować poprawny payload bez confirm_plant_removal", () => {
        const result = gridAreaTypePayloadSchema.safeParse(validPayload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x1).toBe(0);
          expect(result.data.y1).toBe(0);
          expect(result.data.x2).toBe(10);
          expect(result.data.y2).toBe(10);
          expect(result.data.type).toBe("soil");
          expect(result.data.confirm_plant_removal).toBeUndefined();
        }
      });

      it("powinien zaakceptować confirm_plant_removal jako false", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.confirm_plant_removal).toBe(false);
        }
      });
    });

    describe("x1, y1, x2, y2 - walidacja współrzędnych", () => {
      describe("x1", () => {
        it("powinien zaakceptować x1 = 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: 0,
          });

          expect(result.success).toBe(true);
        });

        it("powinien zaakceptować x1 > 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: 5,
            x2: 10,
          });

          expect(result.success).toBe(true);
        });

        it("powinien odrzucić x1 < 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: -1,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toContain("x1 must be a non-negative integer");
          }
        });

        it("powinien odrzucić x1 jako liczbę zmiennoprzecinkową", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: 5.5,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toContain("Expected integer");
          }
        });

        it("powinien odrzucić x1 jako null", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: null,
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić x1 jako undefined", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: undefined,
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić x1 jako string", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x1: "5",
          });

          expect(result.success).toBe(false);
        });
      });

      describe("y1", () => {
        it("powinien zaakceptować y1 = 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y1: 0,
          });

          expect(result.success).toBe(true);
        });

        it("powinien zaakceptować y1 > 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y1: 5,
            y2: 10,
          });

          expect(result.success).toBe(true);
        });

        it("powinien odrzucić y1 < 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y1: -1,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toContain("y1 must be a non-negative integer");
          }
        });

        it("powinien odrzucić y1 jako liczbę zmiennoprzecinkową", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y1: 5.5,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toContain("Expected integer");
          }
        });
      });

      describe("x2", () => {
        it("powinien zaakceptować x2 = 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            type: "soil",
          });

          expect(result.success).toBe(true);
        });

        it("powinien zaakceptować x2 > 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x2: 100,
          });

          expect(result.success).toBe(true);
        });

        it("powinien odrzucić x2 < 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x2: -1,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toContain("x2 must be a non-negative integer");
          }
        });

        it("powinien odrzucić x2 jako liczbę zmiennoprzecinkową", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            x2: 10.5,
          });

          expect(result.success).toBe(false);
        });
      });

      describe("y2", () => {
        it("powinien zaakceptować y2 = 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            type: "soil",
          });

          expect(result.success).toBe(true);
        });

        it("powinien zaakceptować y2 > 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y2: 100,
          });

          expect(result.success).toBe(true);
        });

        it("powinien odrzucić y2 < 0", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y2: -1,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toContain("y2 must be a non-negative integer");
          }
        });

        it("powinien odrzucić y2 jako liczbę zmiennoprzecinkową", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            ...validPayload,
            y2: 10.5,
          });

          expect(result.success).toBe(false);
        });
      });

      describe("refine - walidacja relacji między współrzędnymi", () => {
        it("powinien zaakceptować x1 = x2 (pojedyncza kolumna)", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 5,
            y1: 0,
            x2: 5,
            y2: 10,
            type: "soil",
          });

          expect(result.success).toBe(true);
        });

        it("powinien zaakceptować y1 = y2 (pojedynczy wiersz)", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 0,
            y1: 5,
            x2: 10,
            y2: 5,
            type: "soil",
          });

          expect(result.success).toBe(true);
        });

        it("powinien zaakceptować x1 = x2 i y1 = y2 (pojedyncza komórka)", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 5,
            y1: 5,
            x2: 5,
            y2: 5,
            type: "soil",
          });

          expect(result.success).toBe(true);
        });

        it("powinien odrzucić x1 > x2", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 10,
            y1: 0,
            x2: 5,
            y2: 10,
            type: "soil",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            const refineError = result.error.errors.find((e) => e.message === "x1 must be less than or equal to x2");
            expect(refineError).toBeDefined();
            expect(refineError?.path).toEqual(["x1"]);
          }
        });

        it("powinien odrzucić y1 > y2", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 0,
            y1: 10,
            x2: 10,
            y2: 5,
            type: "soil",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            const refineError = result.error.errors.find((e) => e.message === "y1 must be less than or equal to y2");
            expect(refineError).toBeDefined();
            expect(refineError?.path).toEqual(["y1"]);
          }
        });

        it("powinien odrzucić zarówno x1 > x2 jak i y1 > y2", () => {
          const result = gridAreaTypePayloadSchema.safeParse({
            x1: 10,
            y1: 10,
            x2: 5,
            y2: 5,
            type: "soil",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            const errors = result.error.errors;
            expect(errors.length).toBeGreaterThanOrEqual(2);
            const xError = errors.find((e) => e.message === "x1 must be less than or equal to x2");
            const yError = errors.find((e) => e.message === "y1 must be less than or equal to y2");
            expect(xError).toBeDefined();
            expect(yError).toBeDefined();
          }
        });
      });
    });

    describe("type - walidacja enum", () => {
      it("powinien zaakceptować 'soil'", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: "soil",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("soil");
        }
      });

      it("powinien zaakceptować 'water'", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: "water",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("water");
        }
      });

      it("powinien zaakceptować 'path'", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: "path",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("path");
        }
      });

      it("powinien zaakceptować 'building'", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: "building",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("building");
        }
      });

      it("powinien zaakceptować 'blocked'", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: "blocked",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe("blocked");
        }
      });

      it("powinien odrzucić nieprawidłowy typ", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: "invalid_type",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Type must be one of: soil, water, path, building, blocked");
        }
      });

      it("powinien odrzucić null jako type", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: null,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić undefined jako type", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: undefined,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić brak pola type", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 10,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["type"]);
        }
      });

      it("powinien odrzucić nieprawidłowy typ (number)", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: 123,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić nieprawidłowy typ (array)", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          type: ["soil"],
        });

        expect(result.success).toBe(false);
      });
    });

    describe("confirm_plant_removal - walidacja opcjonalnego pola", () => {
      it("powinien zaakceptować brak pola confirm_plant_removal", () => {
        const result = gridAreaTypePayloadSchema.safeParse(validPayload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.confirm_plant_removal).toBeUndefined();
        }
      });

      it("powinien zaakceptować confirm_plant_removal = true", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: true,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.confirm_plant_removal).toBe(true);
        }
      });

      it("powinien zaakceptować confirm_plant_removal = false", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.confirm_plant_removal).toBe(false);
        }
      });

      it("powinien odrzucić confirm_plant_removal jako null", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: null,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić confirm_plant_removal jako string", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: "true",
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić confirm_plant_removal jako number", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          confirm_plant_removal: 1,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("strict mode - walidacja dodatkowych pól", () => {
      it("powinien odrzucić dodatkowe pole 'extra'", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          extra: "value",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Unrecognized key(s) in object");
        }
      });

      it("powinien odrzucić wiele dodatkowych pól", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          ...validPayload,
          extra1: "value1",
          extra2: "value2",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Unrecognized key(s) in object");
        }
      });
    });

    describe("edge cases - brak wymaganych pól", () => {
      it("powinien odrzucić brak wszystkich pól", () => {
        const result = gridAreaTypePayloadSchema.safeParse({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.length).toBeGreaterThanOrEqual(5); // x1, y1, x2, y2, type
        }
      });

      it("powinien odrzucić brak x1", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          y1: 0,
          x2: 10,
          y2: 10,
          type: "soil",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["x1"]);
        }
      });

      it("powinien odrzucić brak y1", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          x1: 0,
          x2: 10,
          y2: 10,
          type: "soil",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["y1"]);
        }
      });

      it("powinien odrzucić brak x2", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          x1: 0,
          y1: 0,
          y2: 10,
          type: "soil",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["x2"]);
        }
      });

      it("powinien odrzucić brak y2", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          x1: 0,
          y1: 0,
          x2: 10,
          type: "soil",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["y2"]);
        }
      });
    });

    describe("duże wartości współrzędnych", () => {
      it("powinien zaakceptować duże wartości współrzędnych", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          x1: 0,
          y1: 0,
          x2: 199,
          y2: 199,
          type: "soil",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x2).toBe(199);
          expect(result.data.y2).toBe(199);
        }
      });

      it("powinien zaakceptować bardzo duże wartości współrzędnych", () => {
        const result = gridAreaTypePayloadSchema.safeParse({
          x1: 0,
          y1: 0,
          x2: 10000,
          y2: 10000,
          type: "soil",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.x2).toBe(10000);
          expect(result.data.y2).toBe(10000);
        }
      });
    });
  });

  describe("TypeScript types", () => {
    it("GridAreaTypePathParams powinien być poprawnym typem", () => {
      const validParams: GridAreaTypePathParams = {
        plan_id: validUUID,
      };

      expect(validParams.plan_id).toBe(validUUID);
    });

    it("GridAreaTypePayload powinien być poprawnym typem", () => {
      const validPayload: GridAreaTypePayload = {
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        type: "soil",
      };

      expect(validPayload.x1).toBe(0);
      expect(validPayload.type).toBe("soil");
    });

    it("GridAreaTypePayload powinien obsługiwać opcjonalne confirm_plant_removal", () => {
      const payloadWithoutConfirm: GridAreaTypePayload = {
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        type: "soil",
      };

      const payloadWithConfirm: GridAreaTypePayload = {
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        type: "soil",
        confirm_plant_removal: true,
      };

      expect(payloadWithoutConfirm.confirm_plant_removal).toBeUndefined();
      expect(payloadWithConfirm.confirm_plant_removal).toBe(true);
    });
  });
});
