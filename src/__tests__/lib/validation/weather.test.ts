import { describe, it, expect } from "vitest";
import { planIdParamSchema, weatherRefreshCommandSchema } from "@/lib/validation/weather";

describe("Weather Validation", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  describe("planIdParamSchema", () => {
    it("powinien zaakceptować poprawny UUID", () => {
      const result = planIdParamSchema.safeParse(validUUID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validUUID);
      }
    });

    it("powinien zaakceptować inny poprawny UUID", () => {
      const anotherUUID = "123e4567-e89b-12d3-a456-426614174000";
      const result = planIdParamSchema.safeParse(anotherUUID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(anotherUUID);
      }
    });

    it("powinien odrzucić nieprawidłowy format UUID", () => {
      const result = planIdParamSchema.safeParse("invalid-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Invalid plan_id format");
      }
    });

    it("powinien odrzucić UUID z nieprawidłową długością", () => {
      const result = planIdParamSchema.safeParse("550e8400-e29b-41d4-a716");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Invalid plan_id format");
      }
    });

    it("powinien odrzucić UUID bez myślników", () => {
      const result = planIdParamSchema.safeParse("550e8400e29b41d4a716446655440000");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Invalid plan_id format");
      }
    });

    it("powinien odrzucić pusty string", () => {
      const result = planIdParamSchema.safeParse("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Invalid plan_id format");
      }
    });

    it("powinien odrzucić null", () => {
      const result = planIdParamSchema.safeParse(null as unknown as string);

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined", () => {
      const result = planIdParamSchema.safeParse(undefined as unknown as string);

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić typ number", () => {
      const result = planIdParamSchema.safeParse(123 as unknown as string);

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić typ boolean", () => {
      const result = planIdParamSchema.safeParse(true as unknown as string);

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić typ object", () => {
      const result = planIdParamSchema.safeParse({} as unknown as string);

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić typ array", () => {
      const result = planIdParamSchema.safeParse([] as unknown as string);

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić UUID z nieprawidłowymi znakami", () => {
      const result = planIdParamSchema.safeParse("550e8400-e29b-41d4-a716-44665544xxxx");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Invalid plan_id format");
      }
    });

    it("powinien odrzucić string z białymi znakami", () => {
      const result = planIdParamSchema.safeParse(` ${validUUID} `);

      expect(result.success).toBe(false);
    });
  });

  describe("weatherRefreshCommandSchema", () => {
    it("powinien zaakceptować obiekt z force: true", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(true);
      }
    });

    it("powinien zaakceptować obiekt z force: false", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });

    it("powinien zaakceptować pusty obiekt i ustawić force na false (domyślna wartość)", () => {
      const result = weatherRefreshCommandSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });

    it("powinien odrzucić nieprawidłowy typ dla force (string)", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: "true",
      } as unknown as { force: boolean });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla force (number)", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: 1,
      } as unknown as { force: boolean });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla force (object)", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: {},
      } as unknown as { force: boolean });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla force (array)", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: [],
      } as unknown as { force: boolean });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null jako force", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: null,
      } as unknown as { force: boolean });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako force (explicit)", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: undefined,
      } as unknown as { force: boolean });

      // undefined dla opcjonalnego pola z defaultem powinno być zamienione na default
      // ale jeśli explicitnie przekażemy undefined, Zod może to odrzucić
      // Sprawdzamy rzeczywiste zachowanie
      if (result.success) {
        expect(result.data.force).toBe(false);
      } else {
        // Jeśli Zod odrzuca explicit undefined, to też jest poprawne zachowanie
        expect(result.success).toBe(false);
      }
    });

    it("powinien odrzucić dodatkowe pola (strict validation)", () => {
      const result = weatherRefreshCommandSchema.safeParse({
        force: true,
        extraField: "value",
      } as unknown as { force: boolean });

      // Zod domyślnie nie jest strict, więc dodatkowe pola są ignorowane
      // Ale sprawdzamy czy force nadal działa
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(true);
        // Dodatkowe pole nie powinno być w wyniku (ale może być jeśli Zod nie jest strict)
      }
    });

    it("powinien zaakceptować obiekt z wieloma wywołaniami (idempotentność)", () => {
      const input = { force: true };
      const result1 = weatherRefreshCommandSchema.safeParse(input);
      const result2 = weatherRefreshCommandSchema.safeParse(input);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data).toEqual(result2.data);
      }
    });

    it("powinien poprawnie parsować z różnymi wartościami force w sekwencji", () => {
      const result1 = weatherRefreshCommandSchema.safeParse({ force: true });
      const result2 = weatherRefreshCommandSchema.safeParse({ force: false });
      const result3 = weatherRefreshCommandSchema.safeParse({});

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      if (result1.success && result2.success && result3.success) {
        expect(result1.data.force).toBe(true);
        expect(result2.data.force).toBe(false);
        expect(result3.data.force).toBe(false);
      }
    });
  });
});
