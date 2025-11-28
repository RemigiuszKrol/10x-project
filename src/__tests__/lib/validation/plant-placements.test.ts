import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PlantPlacementPathSchema,
  PlantPlacementUpsertSchema,
  PlantPlacementsPathSchema,
  PlantPlacementsQuerySchema,
  encodePlantPlacementCursor,
} from "@/lib/validation/plant-placements";
import type { PlantPlacementCursorKey } from "@/types";

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Plant Placements Validation", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("PlantPlacementPathSchema", () => {
    it("powinien zaakceptować poprawne parametry ścieżki", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 10,
        y: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
        expect(result.data.x).toBe(10);
        expect(result.data.y).toBe(20);
      }
    });

    it("powinien skonwertować string x i y na liczby", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: "10",
        y: "20",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(10);
        expect(result.data.y).toBe(20);
        expect(typeof result.data.x).toBe("number");
        expect(typeof result.data.y).toBe("number");
      }
    });

    it("powinien zaakceptować x=0 i y=0", () => {
      const result = PlantPlacementPathSchema.safeParse({
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

    it("powinien zaakceptować x=199 i y=199 (maksymalne wartości)", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 199,
        y: 199,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(199);
        expect(result.data.y).toBe(199);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: "invalid-uuid",
        x: 10,
        y: 20,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plan ID must be a valid UUID");
      }
    });

    it("powinien odrzucić brak plan_id", () => {
      const result = PlantPlacementPathSchema.safeParse({
        x: 10,
        y: 20,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak x", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        y: 20,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak y", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 10,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić ujemne x", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: -1,
        y: 20,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("X coordinate must be at least 0");
      }
    });

    it("powinien odrzucić ujemne y", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 10,
        y: -1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Y coordinate must be at least 0");
      }
    });

    it("powinien odrzucić x > 199", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 200,
        y: 20,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("X coordinate must be at most 199");
      }
    });

    it("powinien odrzucić y > 199", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 10,
        y: 200,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Y coordinate must be at most 199");
      }
    });

    it("powinien odrzucić niecałkowite x", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 10.5,
        y: 20,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("X coordinate must be an integer");
      }
    });

    it("powinien odrzucić niecałkowite y", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: validUUID,
        x: 10,
        y: 20.5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Y coordinate must be an integer");
      }
    });

    it("powinien odrzucić null dla plan_id", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: null,
        x: 10,
        y: 20,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined dla plan_id", () => {
      const result = PlantPlacementPathSchema.safeParse({
        plan_id: undefined,
        x: 10,
        y: 20,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlantPlacementUpsertSchema", () => {
    it("powinien zaakceptować poprawne dane z plant_name", () => {
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: "Róża",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plant_name).toBe("Róża");
        expect(result.data.sunlight_score).toBeNull();
        expect(result.data.humidity_score).toBeNull();
        expect(result.data.precip_score).toBeNull();
        expect(result.data.temperature_score).toBeNull();
        expect(result.data.overall_score).toBeNull();
      }
    });

    it("powinien przyciąć spacje w plant_name", () => {
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: "  Róża  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plant_name).toBe("Róża");
      }
    });

    it("powinien zaakceptować plant_name z maksymalną długością (100 znaków)", () => {
      const longName = "a".repeat(100);
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: longName,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plant_name).toBe(longName);
        expect(result.data.plant_name.length).toBe(100);
      }
    });

    it("powinien odrzucić pusty plant_name", () => {
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plant name is required");
      }
    });

    it("powinien odrzucić plant_name po trim dłuższy niż 100 znaków", () => {
      const longName = "a".repeat(101);
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: longName,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plant name must be at most 100 characters");
      }
    });

    it("powinien odrzucić plant_name składający się tylko ze spacji", () => {
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plant name is required");
      }
    });

    it("powinien odrzucić brak plant_name", () => {
      const result = PlantPlacementUpsertSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plant name is required");
      }
    });

    describe("sunlight_score", () => {
      it("powinien zaakceptować sunlight_score = 1", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          sunlight_score: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sunlight_score).toBe(1);
        }
      });

      it("powinien zaakceptować sunlight_score = 5", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          sunlight_score: 5,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sunlight_score).toBe(5);
        }
      });

      it("powinien zaakceptować sunlight_score = null", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          sunlight_score: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sunlight_score).toBeNull();
        }
      });

      it("powinien ztransformować undefined na null dla sunlight_score", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sunlight_score).toBeNull();
        }
      });

      it("powinien odrzucić sunlight_score = 0", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          sunlight_score: 0,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Sunlight score must be between 1 and 5");
        }
      });

      it("powinien odrzucić sunlight_score = 6", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          sunlight_score: 6,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Sunlight score must be between 1 and 5");
        }
      });

      it("powinien odrzucić niecałkowite sunlight_score", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          sunlight_score: 3.5,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Sunlight score must be between 1 and 5");
        }
      });
    });

    describe("humidity_score", () => {
      it("powinien zaakceptować humidity_score = 3", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          humidity_score: 3,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.humidity_score).toBe(3);
        }
      });

      it("powinien ztransformować undefined na null dla humidity_score", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.humidity_score).toBeNull();
        }
      });

      it("powinien odrzucić humidity_score < 1", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          humidity_score: -1,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("precip_score", () => {
      it("powinien zaakceptować precip_score = 4", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          precip_score: 4,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.precip_score).toBe(4);
        }
      });

      it("powinien ztransformować undefined na null dla precip_score", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.precip_score).toBeNull();
        }
      });
    });

    describe("temperature_score", () => {
      it("powinien zaakceptować temperature_score = 2", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          temperature_score: 2,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.temperature_score).toBe(2);
        }
      });

      it("powinien ztransformować undefined na null dla temperature_score", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.temperature_score).toBeNull();
        }
      });
    });

    describe("overall_score", () => {
      it("powinien zaakceptować overall_score = 5", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
          overall_score: 5,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.overall_score).toBe(5);
        }
      });

      it("powinien ztransformować undefined na null dla overall_score", () => {
        const result = PlantPlacementUpsertSchema.safeParse({
          plant_name: "Róża",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.overall_score).toBeNull();
        }
      });
    });

    it("powinien zaakceptować wszystkie score'y jednocześnie", () => {
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: "Róża",
        sunlight_score: 5,
        humidity_score: 4,
        precip_score: 3,
        temperature_score: 2,
        overall_score: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sunlight_score).toBe(5);
        expect(result.data.humidity_score).toBe(4);
        expect(result.data.precip_score).toBe(3);
        expect(result.data.temperature_score).toBe(2);
        expect(result.data.overall_score).toBe(1);
      }
    });

    it("powinien zaakceptować wszystkie score'y jako null", () => {
      const result = PlantPlacementUpsertSchema.safeParse({
        plant_name: "Róża",
        sunlight_score: null,
        humidity_score: null,
        precip_score: null,
        temperature_score: null,
        overall_score: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sunlight_score).toBeNull();
        expect(result.data.humidity_score).toBeNull();
        expect(result.data.precip_score).toBeNull();
        expect(result.data.temperature_score).toBeNull();
        expect(result.data.overall_score).toBeNull();
      }
    });
  });

  describe("PlantPlacementsPathSchema", () => {
    it("powinien zaakceptować poprawny UUID", () => {
      const result = PlantPlacementsPathSchema.safeParse({
        plan_id: validUUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = PlantPlacementsPathSchema.safeParse({
        plan_id: "invalid-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plan ID must be a valid UUID");
      }
    });

    it("powinien odrzucić brak plan_id", () => {
      const result = PlantPlacementsPathSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null dla plan_id", () => {
      const result = PlantPlacementsPathSchema.safeParse({
        plan_id: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined dla plan_id", () => {
      const result = PlantPlacementsPathSchema.safeParse({
        plan_id: undefined,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlantPlacementsQuerySchema", () => {
    describe("limit", () => {
      it("powinien zaakceptować limit = 1", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          limit: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(1);
        }
      });

      it("powinien zaakceptować limit = 100", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          limit: 100,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(100);
        }
      });

      it("powinien ustawić domyślny limit = 25 gdy brak limit", () => {
        const result = PlantPlacementsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(25);
        }
      });

      it("powinien skonwertować string limit na liczbę", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          limit: "50",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
          expect(typeof result.data.limit).toBe("number");
        }
      });

      it("powinien odrzucić limit < 1", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          limit: 0,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Limit must be at least 1");
        }
      });

      it("powinien odrzucić limit > 100", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          limit: 101,
        });

        expect(result.success).toBe(false);
        if (!result.error?.errors[0]?.message.includes("Limit must be at most 100")) {
          expect(result.error?.errors[0]?.message).toBe("Limit must be at most 100");
        }
      });

      it("powinien odrzucić niecałkowite limit", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          limit: 25.5,
        });

        expect(result.success).toBe(false);
      });
    });

    describe("name", () => {
      it("powinien zaakceptować name z 1 znakiem", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          name: "a",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("a");
        }
      });

      it("powinien zaakceptować name z maksymalną długością (100 znaków)", () => {
        const longName = "a".repeat(100);
        const result = PlantPlacementsQuerySchema.safeParse({
          name: longName,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(longName);
        }
      });

      it("powinien przyciąć spacje w name", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          name: "  Róża  ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Róża");
        }
      });

      it("powinien zaakceptować brak name (opcjonalne)", () => {
        const result = PlantPlacementsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBeUndefined();
        }
      });

      it("powinien odrzucić pusty name po trim", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          name: "   ",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Name filter must be at least 1 character");
        }
      });

      it("powinien odrzucić name dłuższy niż 100 znaków", () => {
        const longName = "a".repeat(101);
        const result = PlantPlacementsQuerySchema.safeParse({
          name: longName,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Name filter must be at most 100 characters");
        }
      });
    });

    describe("cursor", () => {
      it("powinien zaakceptować brak cursor (opcjonalne)", () => {
        const result = PlantPlacementsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursorKey).toBeNull();
        }
      });

      it("powinien zdekodować poprawny cursor Base64", () => {
        const cursorKey: PlantPlacementCursorKey = {
          plant_name: "Róża",
          x: 10,
          y: 20,
        };
        const encoded = encodePlantPlacementCursor(cursorKey);

        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: encoded,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursorKey).toEqual(cursorKey);
        }
      });

      it("powinien zdekodować cursor z URL-encoding", () => {
        const cursorKey: PlantPlacementCursorKey = {
          plant_name: "Róża",
          x: 10,
          y: 20,
        };
        const encoded = encodePlantPlacementCursor(cursorKey);
        const urlEncoded = encodeURIComponent(encoded);

        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: urlEncoded,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursorKey).toEqual(cursorKey);
        }
      });

      it("powinien odrzucić nieprawidłowy format cursor (nie Base64)", () => {
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: "not-base64-string",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor format");
        }
      });

      it("powinien odrzucić cursor z nieprawidłową strukturą JSON", () => {
        const invalidJson = Buffer.from("invalid json").toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidJson,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor format");
        }
      });

      it("powinien odrzucić cursor bez plant_name", () => {
        const invalidCursor = Buffer.from(JSON.stringify({ x: 10, y: 20 })).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien odrzucić cursor bez x", () => {
        const invalidCursor = Buffer.from(JSON.stringify({ plant_name: "Róża", y: 20 })).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien odrzucić cursor bez y", () => {
        const invalidCursor = Buffer.from(JSON.stringify({ plant_name: "Róża", x: 10 })).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien odrzucić cursor gdzie plant_name nie jest stringiem", () => {
        const invalidCursor = Buffer.from(JSON.stringify({ plant_name: 123, x: 10, y: 20 })).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien odrzucić cursor gdzie x nie jest liczbą", () => {
        const invalidCursor = Buffer.from(JSON.stringify({ plant_name: "Róża", x: "10", y: 20 })).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien odrzucić cursor gdzie y nie jest liczbą", () => {
        const invalidCursor = Buffer.from(JSON.stringify({ plant_name: "Róża", x: 10, y: "20" })).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien odrzucić cursor z null zamiast obiektu", () => {
        const invalidCursor = Buffer.from(JSON.stringify(null)).toString("base64");
        const result = PlantPlacementsQuerySchema.safeParse({
          cursor: invalidCursor,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid cursor structure");
        }
      });

      it("powinien zaakceptować wszystkie parametry jednocześnie", () => {
        const cursorKey: PlantPlacementCursorKey = {
          plant_name: "Róża",
          x: 10,
          y: 20,
        };
        const encoded = encodePlantPlacementCursor(cursorKey);

        const result = PlantPlacementsQuerySchema.safeParse({
          limit: 50,
          cursor: encoded,
          name: "Róża",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
          expect(result.data.cursorKey).toEqual(cursorKey);
          expect(result.data.name).toBe("Róża");
        }
      });
    });
  });

  describe("encodePlantPlacementCursor", () => {
    it("powinien zakodować cursor do Base64", () => {
      const cursorKey: PlantPlacementCursorKey = {
        plant_name: "Róża",
        x: 10,
        y: 20,
      };

      const encoded = encodePlantPlacementCursor(cursorKey);

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);

      // Sprawdź czy można zdekodować
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      expect(parsed).toEqual(cursorKey);
    });

    it("powinien zakodować cursor z różnymi wartościami", () => {
      const cursorKey: PlantPlacementCursorKey = {
        plant_name: "Tulipan",
        x: 0,
        y: 199,
      };

      const encoded = encodePlantPlacementCursor(cursorKey);
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(cursorKey);
    });

    it("powinien zakodować cursor z długą nazwą rośliny", () => {
      const longName = "a".repeat(100);
      const cursorKey: PlantPlacementCursorKey = {
        plant_name: longName,
        x: 50,
        y: 50,
      };

      const encoded = encodePlantPlacementCursor(cursorKey);
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(cursorKey);
    });

    it("powinien zakodować cursor z polskimi znakami w nazwie", () => {
      const cursorKey: PlantPlacementCursorKey = {
        plant_name: "Róża żółta łąka",
        x: 15,
        y: 25,
      };

      const encoded = encodePlantPlacementCursor(cursorKey);
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(cursorKey);
    });
  });
});
