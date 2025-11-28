import { describe, it, expect } from "vitest";
import {
  PlantSearchCommandSchema,
  PlantFitCommandSchema,
  PlantSearchCandidateSchema,
  PlantSearchResultSchema,
  PlantFitResultSchema,
  validateSearchResult,
  validateFitResult,
  type ValidatedSearchResult,
  type ValidatedFitResult,
} from "@/lib/validation/ai.validation";

describe("AI Validation", () => {
  describe("PlantSearchCommandSchema", () => {
    it("powinien zaakceptować poprawny query", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: "róża",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe("róża");
      }
    });

    it("powinien przyciąć spacje na początku i końcu query", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: "  róża  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe("róża");
      }
    });

    it("powinien odrzucić pusty string", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Query nie może być pusty");
      }
    });

    it("powinien odrzucić string z samymi spacjami", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Query nie może być pusty");
      }
    });

    it("powinien odrzucić query dłuższy niż 200 znaków", () => {
      const longQuery = "a".repeat(201);
      const result = PlantSearchCommandSchema.safeParse({
        query: longQuery,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Query jest zbyt długi");
      }
    });

    it("powinien zaakceptować query o długości dokładnie 200 znaków", () => {
      const query = "a".repeat(200);
      const result = PlantSearchCommandSchema.safeParse({
        query,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe(query);
      }
    });

    it("powinien odrzucić null", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ (number)", () => {
      const result = PlantSearchCommandSchema.safeParse({
        query: 123,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak pola query", () => {
      const result = PlantSearchCommandSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("PlantFitCommandSchema", () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";

    it("powinien zaakceptować poprawne dane", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: 10,
        plant_name: "Róża",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
        expect(result.data.x).toBe(5);
        expect(result.data.y).toBe(10);
        expect(result.data.plant_name).toBe("Róża");
      }
    });

    it("powinien przyciąć spacje w plant_name", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 0,
        y: 0,
        plant_name: "  Róża  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plant_name).toBe("Róża");
      }
    });

    it("powinien zaakceptować x = 0", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 0,
        y: 0,
        plant_name: "Róża",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(0);
        expect(result.data.y).toBe(0);
      }
    });

    it("powinien zaakceptować duże wartości x i y", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 199,
        y: 199,
        plant_name: "Róża",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(199);
        expect(result.data.y).toBe(199);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: "nieprawidłowy-uuid",
        x: 5,
        y: 10,
        plant_name: "Róża",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("plan_id musi być prawidłowym UUID");
      }
    });

    it("powinien odrzucić x < 0", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: -1,
        y: 10,
        plant_name: "Róża",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("x musi być nieujemną liczbą całkowitą");
      }
    });

    it("powinien odrzucić y < 0", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: -1,
        plant_name: "Róża",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("y musi być nieujemną liczbą całkowitą");
      }
    });

    it("powinien odrzucić x jako liczbę zmiennoprzecinkową", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5.5,
        y: 10,
        plant_name: "Róża",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić y jako liczbę zmiennoprzecinkową", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: 10.5,
        plant_name: "Róża",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić pusty plant_name", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: 10,
        plant_name: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("plant_name nie może być pusty");
      }
    });

    it("powinien odrzucić plant_name dłuższy niż 200 znaków", () => {
      const longName = "a".repeat(201);
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: 10,
        plant_name: longName,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("plant_name jest zbyt długi");
      }
    });

    it("powinien zaakceptować plant_name o długości dokładnie 200 znaków", () => {
      const name = "a".repeat(200);
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        x: 5,
        y: 10,
        plant_name: name,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plant_name).toBe(name);
      }
    });

    it("powinien odrzucić null dla plan_id", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: null,
        x: 5,
        y: 10,
        plant_name: "Róża",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak wymaganych pól", () => {
      const result = PlantFitCommandSchema.safeParse({
        plan_id: validUUID,
        // brak x, y, plant_name
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlantSearchCandidateSchema", () => {
    it("powinien zaakceptować poprawnego kandydata z wszystkimi polami", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        name: "Róża",
        latin_name: "Rosa",
        source: "ai",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Róża");
        expect(result.data.latin_name).toBe("Rosa");
        expect(result.data.source).toBe("ai");
      }
    });

    it("powinien zaakceptować kandydata bez latin_name", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        name: "Róża",
        source: "ai",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Róża");
        expect(result.data.latin_name).toBeUndefined();
        expect(result.data.source).toBe("ai");
      }
    });

    it("powinien odrzucić pusty name", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        name: "",
        source: "ai",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Nazwa rośliny nie może być pusta");
      }
    });

    it("powinien odrzucić brak name", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        source: "ai",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy source (nie 'ai')", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        name: "Róża",
        source: "database",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak source", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        name: "Róża",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null dla name", () => {
      const result = PlantSearchCandidateSchema.safeParse({
        name: null,
        source: "ai",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlantSearchResultSchema", () => {
    it("powinien zaakceptować poprawny wynik z jednym kandydatem", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: {
          candidates: [
            {
              name: "Róża",
              latin_name: "Rosa",
              source: "ai",
            },
          ],
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.candidates).toHaveLength(1);
        expect(result.data.data.candidates[0].name).toBe("Róża");
      }
    });

    it("powinien zaakceptować wynik z wieloma kandydatami", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: {
          candidates: [
            { name: "Róża", source: "ai" },
            { name: "Tulipan", latin_name: "Tulipa", source: "ai" },
            { name: "Lilia", source: "ai" },
          ],
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.candidates).toHaveLength(3);
      }
    });

    it("powinien zaakceptować pustą tablicę candidates", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: {
          candidates: [],
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.candidates).toHaveLength(0);
      }
    });

    it("powinien odrzucić brak pola data", () => {
      const result = PlantSearchResultSchema.safeParse({
        candidates: [],
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak pola candidates", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: {},
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowych kandydatów w tablicy", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: {
          candidates: [
            { name: "Róża", source: "ai" },
            { name: "", source: "ai" }, // pusty name
          ],
        },
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null dla data", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić candidates jako nie-tablicę", () => {
      const result = PlantSearchResultSchema.safeParse({
        data: {
          candidates: "nie-tablica",
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlantFitResultSchema", () => {
    it("powinien zaakceptować poprawny wynik z wszystkimi polami", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 5,
          humidity_score: 4,
          precip_score: 3,
          temperature_score: 5,
          overall_score: 4,
          explanation: "Roślina dobrze dopasowana",
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.sunlight_score).toBe(5);
        expect(result.data.data.humidity_score).toBe(4);
        expect(result.data.data.precip_score).toBe(3);
        expect(result.data.data.temperature_score).toBe(5);
        expect(result.data.data.overall_score).toBe(4);
        expect(result.data.data.explanation).toBe("Roślina dobrze dopasowana");
      }
    });

    it("powinien zaakceptować wynik bez explanation", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 3,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.explanation).toBeUndefined();
      }
    });

    it("powinien zaakceptować wszystkie scores = 1 (minimum)", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 1,
          humidity_score: 1,
          precip_score: 1,
          temperature_score: 1,
          overall_score: 1,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.overall_score).toBe(1);
      }
    });

    it("powinien zaakceptować wszystkie scores = 5 (maksimum)", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 5,
          humidity_score: 5,
          precip_score: 5,
          temperature_score: 5,
          overall_score: 5,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.overall_score).toBe(5);
      }
    });

    it("powinien odrzucić score < 1", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 0,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić score > 5", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 6,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić score jako liczbę zmiennoprzecinkową", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 3.5,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak wymaganego pola sunlight_score", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak wymaganego pola overall_score", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: 3,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
        },
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null dla data", () => {
      const result = PlantFitResultSchema.safeParse({
        data: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak pola data", () => {
      const result = PlantFitResultSchema.safeParse({
        sunlight_score: 3,
        humidity_score: 3,
        precip_score: 3,
        temperature_score: 3,
        overall_score: 3,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić score jako string", () => {
      const result = PlantFitResultSchema.safeParse({
        data: {
          sunlight_score: "3",
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("validateSearchResult", () => {
    it("powinien zwalidować poprawny wynik wyszukiwania", () => {
      const validData = {
        data: {
          candidates: [
            { name: "Róża", source: "ai" },
            { name: "Tulipan", latin_name: "Tulipa", source: "ai" },
          ],
        },
      };

      const result = validateSearchResult(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.candidates).toHaveLength(2);
      }
    });

    it("powinien zwrócić błąd dla nieprawidłowych danych", () => {
      const invalidData = {
        data: {
          candidates: [
            { name: "", source: "ai" }, // pusty name
          ],
        },
      };

      const result = validateSearchResult(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it("powinien zwrócić błąd dla null", () => {
      const result = validateSearchResult(null);

      expect(result.success).toBe(false);
    });

    it("powinien zwrócić błąd dla undefined", () => {
      const result = validateSearchResult(undefined);

      expect(result.success).toBe(false);
    });

    it("powinien zwrócić błąd dla pustego obiektu", () => {
      const result = validateSearchResult({});

      expect(result.success).toBe(false);
    });

    it("powinien zwrócić poprawny typ ValidatedSearchResult dla poprawnych danych", () => {
      const validData = {
        data: {
          candidates: [{ name: "Róża", source: "ai" }],
        },
      };

      const result = validateSearchResult(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type check - powinien być ValidatedSearchResult
        const validated: ValidatedSearchResult = result.data;
        expect(validated.data.candidates).toBeDefined();
      }
    });
  });

  describe("validateFitResult", () => {
    it("powinien zwalidować poprawny wynik oceny dopasowania", () => {
      const validData = {
        data: {
          sunlight_score: 4,
          humidity_score: 3,
          precip_score: 5,
          temperature_score: 4,
          overall_score: 4,
          explanation: "Dobre dopasowanie",
        },
      };

      const result = validateFitResult(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.overall_score).toBe(4);
        expect(result.data.data.explanation).toBe("Dobre dopasowanie");
      }
    });

    it("powinien zwalidować wynik bez explanation", () => {
      const validData = {
        data: {
          sunlight_score: 3,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      };

      const result = validateFitResult(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.explanation).toBeUndefined();
      }
    });

    it("powinien zwrócić błąd dla nieprawidłowych danych (score poza zakresem)", () => {
      const invalidData = {
        data: {
          sunlight_score: 6, // > 5
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      };

      const result = validateFitResult(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it("powinien zwrócić błąd dla null", () => {
      const result = validateFitResult(null);

      expect(result.success).toBe(false);
    });

    it("powinien zwrócić błąd dla undefined", () => {
      const result = validateFitResult(undefined);

      expect(result.success).toBe(false);
    });

    it("powinien zwrócić błąd dla pustego obiektu", () => {
      const result = validateFitResult({});

      expect(result.success).toBe(false);
    });

    it("powinien zwrócić poprawny typ ValidatedFitResult dla poprawnych danych", () => {
      const validData = {
        data: {
          sunlight_score: 3,
          humidity_score: 3,
          precip_score: 3,
          temperature_score: 3,
          overall_score: 3,
        },
      };

      const result = validateFitResult(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type check - powinien być ValidatedFitResult
        const validated: ValidatedFitResult = result.data;
        expect(validated.data.overall_score).toBeDefined();
      }
    });
  });
});
