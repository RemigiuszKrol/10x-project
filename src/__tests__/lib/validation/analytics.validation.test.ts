import { describe, it, expect } from "vitest";
import { AnalyticsEventCreateSchema, type AnalyticsEventCreateInput } from "@/lib/validation/analytics";

describe("Analytics Validation", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  describe("AnalyticsEventCreateSchema", () => {
    describe("event_type - walidacja wymaganego pola", () => {
      it("powinien zaakceptować 'plan_created'", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("plan_created");
        }
      });

      it("powinien zaakceptować 'grid_saved'", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "grid_saved",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("grid_saved");
        }
      });

      it("powinien zaakceptować 'area_typed'", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "area_typed",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("area_typed");
        }
      });

      it("powinien zaakceptować 'plant_confirmed'", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plant_confirmed",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("plant_confirmed");
        }
      });

      it("powinien odrzucić nieprawidłowy event_type", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "invalid_event",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain(
            "Event type must be one of: plan_created, grid_saved, area_typed, plant_confirmed"
          );
        }
      });

      it("powinien odrzucić null jako event_type", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: null,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić undefined jako event_type", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: undefined,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić brak pola event_type", () => {
        const result = AnalyticsEventCreateSchema.safeParse({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual(["event_type"]);
        }
      });

      it("powinien odrzucić nieprawidłowy typ (number)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: 123,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić nieprawidłowy typ (array)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: ["plan_created"],
        });

        expect(result.success).toBe(false);
      });
    });

    describe("plan_id - walidacja opcjonalnego UUID", () => {
      it("powinien zaakceptować poprawny UUID", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: validUUID,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.plan_id).toBe(validUUID);
        }
      });

      it("powinien zaakceptować null jako plan_id i ztransformować do null", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.plan_id).toBe(null);
        }
      });

      it("powinien zaakceptować undefined jako plan_id i ztransformować do null", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: undefined,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.plan_id).toBe(null);
        }
      });

      it("powinien zaakceptować brak pola plan_id i ztransformować do null", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.plan_id).toBe(null);
        }
      });

      it("powinien odrzucić nieprawidłowy UUID (za krótki)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: "not-a-uuid",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić nieprawidłowy UUID (nieprawidłowy format)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: "550e8400-e29b-41d4-a716",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić pusty string jako plan_id", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: "",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toContain("Plan ID must be a valid UUID");
        }
      });

      it("powinien odrzucić nieprawidłowy typ (number)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: 123,
        });

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić nieprawidłowy typ (array)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: [validUUID],
        });

        expect(result.success).toBe(false);
      });
    });

    describe("attributes - walidacja opcjonalnego obiektu JSON", () => {
      it("powinien zaakceptować prosty obiekt JSON", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes: { key: "value" },
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual({ key: "value" });
        }
      });

      it("powinien zaakceptować zagnieżdżony obiekt JSON", () => {
        const attributes = {
          nested: {
            level1: {
              level2: "value",
            },
          },
          array: [1, 2, 3],
        };

        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual(attributes);
        }
      });

      it("powinien zaakceptować obiekt z tablicami", () => {
        const attributes = {
          items: ["item1", "item2", "item3"],
          numbers: [1, 2, 3, 4, 5],
        };

        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual(attributes);
        }
      });

      it("powinien zaakceptować pusty obiekt", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes: {},
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual({});
        }
      });

      it("powinien zaakceptować null jako attributes i ztransformować do {}", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual({});
        }
      });

      it("powinien zaakceptować undefined jako attributes i ztransformować do {}", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes: undefined,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual({});
        }
      });

      it("powinien zaakceptować brak pola attributes i ztransformować do {}", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual({});
        }
      });

      it("powinien zaakceptować obiekt z wartościami różnych typów", () => {
        const attributes = {
          string: "text",
          number: 123,
          boolean: true,
          nullValue: null,
          array: [1, "two", { three: 3 }],
          nested: {
            deep: {
              value: "nested",
            },
          },
        };

        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual(attributes);
        }
      });
    });

    describe("Kombinacje wszystkich pól", () => {
      it("powinien zaakceptować wszystkie pola z poprawnymi wartościami", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plant_confirmed",
          plan_id: validUUID,
          attributes: {
            plant_name: "Róża",
            coordinates: { x: 10, y: 20 },
          },
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("plant_confirmed");
          expect(result.data.plan_id).toBe(validUUID);
          expect(result.data.attributes).toEqual({
            plant_name: "Róża",
            coordinates: { x: 10, y: 20 },
          });
        }
      });

      it("powinien zaakceptować tylko wymagane pole (event_type)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("plan_created");
          expect(result.data.plan_id).toBe(null);
          expect(result.data.attributes).toEqual({});
        }
      });

      it("powinien zaakceptować event_type z plan_id (bez attributes)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "grid_saved",
          plan_id: validUUID,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("grid_saved");
          expect(result.data.plan_id).toBe(validUUID);
          expect(result.data.attributes).toEqual({});
        }
      });

      it("powinien zaakceptować event_type z attributes (bez plan_id)", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "area_typed",
          attributes: { area_type: "soil" },
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("area_typed");
          expect(result.data.plan_id).toBe(null);
          expect(result.data.attributes).toEqual({ area_type: "soil" });
        }
      });

      it("powinien zaakceptować event_type z null plan_id i null attributes", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: null,
          attributes: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.event_type).toBe("plan_created");
          expect(result.data.plan_id).toBe(null);
          expect(result.data.attributes).toEqual({});
        }
      });
    });

    describe("Edge cases i wartości graniczne", () => {
      it("powinien zaakceptować bardzo duży obiekt attributes", () => {
        const largeAttributes: Record<string, unknown> = {};
        for (let i = 0; i < 1000; i++) {
          largeAttributes[`key_${i}`] = `value_${i}`;
        }

        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes: largeAttributes,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(Object.keys(result.data.attributes as Record<string, unknown>)).toHaveLength(1000);
        }
      });

      it("powinien zaakceptować attributes z bardzo głębokim zagnieżdżeniem", () => {
        let deepObject: Record<string, unknown> = { value: "deep" };
        for (let i = 0; i < 10; i++) {
          deepObject = { nested: deepObject };
        }

        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          attributes: deepObject,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attributes).toEqual(deepObject);
        }
      });

      it("powinien zaakceptować wszystkie 4 typy zdarzeń z tym samym plan_id", () => {
        const eventTypes = ["plan_created", "grid_saved", "area_typed", "plant_confirmed"] as const;

        for (const eventType of eventTypes) {
          const result = AnalyticsEventCreateSchema.safeParse({
            event_type: eventType,
            plan_id: validUUID,
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.event_type).toBe(eventType);
            expect(result.data.plan_id).toBe(validUUID);
          }
        }
      });
    });

    describe("Type inference - AnalyticsEventCreateInput", () => {
      it("powinien zwrócić poprawny typ po walidacji", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: validUUID,
          attributes: { test: "value" },
        });

        expect(result.success).toBe(true);
        if (result.success) {
          // TypeScript powinien poprawnie wywnioskować typ
          const validated: AnalyticsEventCreateInput = result.data;
          expect(validated.event_type).toBe("plan_created");
          expect(validated.plan_id).toBe(validUUID);
          expect(validated.attributes).toEqual({ test: "value" });
        }
      });

      it("powinien zwrócić poprawny typ z null plan_id", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "grid_saved",
          plan_id: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          const validated: AnalyticsEventCreateInput = result.data;
          expect(validated.plan_id).toBe(null);
        }
      });
    });

    describe("Walidacja błędów - komunikaty", () => {
      it("powinien zwrócić czytelny komunikat błędu dla nieprawidłowego event_type", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "wrong_type",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const error = result.error.errors[0];
          expect(error.message).toContain(
            "Event type must be one of: plan_created, grid_saved, area_typed, plant_confirmed"
          );
          expect(error.path).toEqual(["event_type"]);
        }
      });

      it("powinien zwrócić czytelny komunikat błędu dla nieprawidłowego UUID", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "plan_created",
          plan_id: "invalid-uuid",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const error = result.error.errors[0];
          expect(error.message).toContain("Plan ID must be a valid UUID");
          expect(error.path).toEqual(["plan_id"]);
        }
      });

      it("powinien zwrócić wszystkie błędy walidacji jednocześnie", () => {
        const result = AnalyticsEventCreateSchema.safeParse({
          event_type: "invalid_event",
          plan_id: "not-a-uuid",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors).toHaveLength(2);
          const paths = result.error.errors.map((e) => e.path[0]);
          expect(paths).toContain("event_type");
          expect(paths).toContain("plan_id");
        }
      });
    });
  });
});
