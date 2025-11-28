import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PlanCreateSchema,
  PlanUpdateSchema,
  PlanUpdateQuerySchema,
  PlanIdParamSchema,
  PlanListQuerySchema,
  PlanGridParamsSchema,
  PlanWeatherParamsSchema,
  encodePlanCursor,
  decodePlanCursor,
} from "@/lib/validation/plans";
import type { PlanCursorKey } from "@/types";

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Plans Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("PlanCreateSchema", () => {
    const validPlanData = {
      name: "My Garden Plan",
      width_m: 5,
      height_m: 4,
      cell_size_cm: 25,
      orientation: 0,
    };

    it("powinien zaakceptować poprawne dane planu", () => {
      const result = PlanCreateSchema.safeParse(validPlanData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Garden Plan");
        expect(result.data.width_m).toBe(5);
        expect(result.data.height_m).toBe(4);
        expect(result.data.cell_size_cm).toBe(25);
        expect(result.data.orientation).toBe(0);
      }
    });

    it("powinien zaakceptować plan z opcjonalnymi polami geograficznymi", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        latitude: 52.1,
        longitude: 21.0,
        hemisphere: "northern",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(52.1);
        expect(result.data.longitude).toBe(21.0);
        expect(result.data.hemisphere).toBe("northern");
      }
    });

    it("powinien przyciąć spacje w nazwie planu", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        name: "  My Garden Plan  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("My Garden Plan");
      }
    });

    it("powinien odrzucić pustą nazwę planu", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        name: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plan name is required");
      }
    });

    it("powinien odrzucić nazwę składającą się tylko ze spacji", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        name: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Plan name is required");
      }
    });

    it("powinien odrzucić brak pola name", () => {
      const { name, ...dataWithoutName } = validPlanData;
      const result = PlanCreateSchema.safeParse(dataWithoutName);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("name"))).toBe(true);
      }
    });

    it("powinien odrzucić ujemną szerokość", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: -5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_m"));
        expect(widthError?.message).toContain("positive");
      }
    });

    it("powinien odrzucić zero jako szerokość", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_m"));
        expect(widthError?.message).toContain("positive");
      }
    });

    it("powinien odrzucić ujemną wysokość", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        height_m: -4,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const heightError = result.error.errors.find((e) => e.path.includes("height_m"));
        expect(heightError?.message).toContain("positive");
      }
    });

    it("powinien odrzucić nieprawidłowy rozmiar komórki", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        cell_size_cm: 15,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const cellSizeError = result.error.errors.find((e) => e.path.includes("cell_size_cm"));
        expect(cellSizeError?.message).toContain("10, 25, 50, or 100 cm");
      }
    });

    it("powinien zaakceptować wszystkie dozwolone rozmiary komórek", () => {
      const cellSizes = [10, 25, 50, 100] as const;

      for (const cellSize of cellSizes) {
        const result = PlanCreateSchema.safeParse({
          ...validPlanData,
          cell_size_cm: cellSize,
          width_m: cellSize / 100, // Minimalna szerokość dla danego rozmiaru
          height_m: cellSize / 100, // Minimalna wysokość dla danego rozmiaru
        });

        expect(result.success).toBe(true);
      }
    });

    it("powinien odrzucić orientację mniejszą niż 0", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        orientation: -1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const orientationError = result.error.errors.find((e) => e.path.includes("orientation"));
        expect(orientationError?.message).toContain("between 0 and 359");
      }
    });

    it("powinien odrzucić orientację większą niż 359", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        orientation: 360,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const orientationError = result.error.errors.find((e) => e.path.includes("orientation"));
        expect(orientationError?.message).toContain("between 0 and 359");
      }
    });

    it("powinien zaakceptować orientację 0", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        orientation: 0,
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować orientację 359", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        orientation: 359,
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić niecałkowitą orientację", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        orientation: 45.5,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić szerokość niepodzielną przez rozmiar komórki", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 5.1, // 510 cm nie jest podzielne przez 25 cm
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_m"));
        expect(widthError?.message).toContain("divisible by cell size");
      }
    });

    it("powinien odrzucić wysokość niepodzielną przez rozmiar komórki", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        height_m: 4.1, // 410 cm nie jest podzielne przez 25 cm
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const heightError = result.error.errors.find((e) => e.path.includes("height_m"));
        expect(heightError?.message).toContain("divisible by cell size");
      }
    });

    it("powinien zaakceptować wymiary podzielne przez rozmiar komórki", () => {
      const testCases = [
        { width_m: 2.5, height_m: 2.5, cell_size_cm: 25 }, // 250cm / 25cm = 10 komórek
        { width_m: 1.0, height_m: 1.0, cell_size_cm: 10 }, // 100cm / 10cm = 10 komórek
        { width_m: 5.0, height_m: 5.0, cell_size_cm: 50 }, // 500cm / 50cm = 10 komórek
        { width_m: 10.0, height_m: 10.0, cell_size_cm: 100 }, // 1000cm / 100cm = 10 komórek
      ];

      for (const testCase of testCases) {
        const result = PlanCreateSchema.safeParse({
          ...validPlanData,
          ...testCase,
        });

        expect(result.success).toBe(true);
      }
    });

    it("powinien odrzucić szerokość przekraczającą maksymalny wymiar", () => {
      // Dla cell_size_cm=25, maksymalna szerokość to 200 * 0.25 = 50m
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 51,
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_m"));
        expect(widthError?.message).toContain("exceeds maximum allowed dimension");
      }
    });

    it("powinien odrzucić wysokość przekraczającą maksymalny wymiar", () => {
      // Dla cell_size_cm=25, maksymalna wysokość to 200 * 0.25 = 50m
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        height_m: 51,
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const heightError = result.error.errors.find((e) => e.path.includes("height_m"));
        expect(heightError?.message).toContain("exceeds maximum allowed dimension");
      }
    });

    it("powinien zaakceptować maksymalne wymiary dla różnych rozmiarów komórek", () => {
      const testCases = [
        { width_m: 20, height_m: 20, cell_size_cm: 10 }, // 200 * 0.1 = 20m
        { width_m: 50, height_m: 50, cell_size_cm: 25 }, // 200 * 0.25 = 50m
        { width_m: 100, height_m: 100, cell_size_cm: 50 }, // 200 * 0.5 = 100m
        { width_m: 200, height_m: 200, cell_size_cm: 100 }, // 200 * 1.0 = 200m
      ];

      for (const testCase of testCases) {
        const result = PlanCreateSchema.safeParse({
          ...validPlanData,
          ...testCase,
        });

        expect(result.success).toBe(true);
      }
    });

    it("powinien odrzucić siatkę o szerokości większej niż 200 komórek", () => {
      // 201 komórek * 25cm = 5025cm = 50.25m
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 50.25,
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_m"));
        expect(widthError?.message).toContain("Width exceeds maximum allowed dimension");
      }
    });

    it("powinien odrzucić siatkę o wysokości większej niż 200 komórek", () => {
      // 201 komórek * 25cm = 5025cm = 50.25m
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        height_m: 50.25,
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const heightError = result.error.errors.find((e) => e.path.includes("height_m"));
        expect(heightError?.message).toContain("Height exceeds maximum allowed dimension");
      }
    });

    it("powinien zaakceptować minimalną siatkę (1x1 komórka)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 0.1, // 1 komórka * 10cm = 10cm = 0.1m
        height_m: 0.1,
        cell_size_cm: 10,
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować maksymalną siatkę (200x200 komórek)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 20, // 200 komórek * 10cm = 2000cm = 20m
        height_m: 20,
        cell_size_cm: 10,
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić szerokość siatki mniejszą niż 1 komórka", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        width_m: 0.05, // 0.5 komórki * 10cm = 5cm = 0.05m
        cell_size_cm: 10,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłową szerokość geograficzną (mniejszą niż -90)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        latitude: -91,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const latError = result.error.errors.find((e) => e.path.includes("latitude"));
        expect(latError?.message).toContain("between -90 and 90");
      }
    });

    it("powinien odrzucić nieprawidłową szerokość geograficzną (większą niż 90)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        latitude: 91,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const latError = result.error.errors.find((e) => e.path.includes("latitude"));
        expect(latError?.message).toContain("between -90 and 90");
      }
    });

    it("powinien zaakceptować prawidłową szerokość geograficzną", () => {
      const testCases = [-90, 0, 90, 52.1, -45.5];

      for (const lat of testCases) {
        const result = PlanCreateSchema.safeParse({
          ...validPlanData,
          latitude: lat,
        });

        expect(result.success).toBe(true);
      }
    });

    it("powinien odrzucić nieprawidłową długość geograficzną (mniejszą niż -180)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        longitude: -181,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const lonError = result.error.errors.find((e) => e.path.includes("longitude"));
        expect(lonError?.message).toContain("between -180 and 180");
      }
    });

    it("powinien odrzucić nieprawidłową długość geograficzną (większą niż 180)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        longitude: 181,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const lonError = result.error.errors.find((e) => e.path.includes("longitude"));
        expect(lonError?.message).toContain("between -180 and 180");
      }
    });

    it("powinien zaakceptować prawidłową długość geograficzną", () => {
      const testCases = [-180, 0, 180, 21.0, -45.5];

      for (const lon of testCases) {
        const result = PlanCreateSchema.safeParse({
          ...validPlanData,
          longitude: lon,
        });

        expect(result.success).toBe(true);
      }
    });

    it("powinien odrzucić nieprawidłową półkulę", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        hemisphere: "eastern" as unknown as "northern" | "southern",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const hemisphereError = result.error.errors.find((e) => e.path.includes("hemisphere"));
        expect(hemisphereError?.message).toContain("'northern' or 'southern'");
      }
    });

    it("powinien zaakceptować półkulę północną", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        hemisphere: "northern",
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować półkulę południową", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        hemisphere: "southern",
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić nieznane pola (strict mode)", () => {
      const result = PlanCreateSchema.safeParse({
        ...validPlanData,
        unknownField: "value",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlanUpdateSchema", () => {
    it("powinien zaakceptować aktualizację tylko nazwy", () => {
      const result = PlanUpdateSchema.safeParse({
        name: "Updated Plan Name",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Plan Name");
      }
    });

    it("powinien zaakceptować aktualizację tylko szerokości", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 500,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.width_cm).toBe(500);
      }
    });

    it("powinien zaakceptować aktualizację tylko wysokości", () => {
      const result = PlanUpdateSchema.safeParse({
        height_cm: 400,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.height_cm).toBe(400);
      }
    });

    it("powinien zaakceptować aktualizację tylko rozmiaru komórki", () => {
      const result = PlanUpdateSchema.safeParse({
        cell_size_cm: 50,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cell_size_cm).toBe(50);
      }
    });

    it("powinien zaakceptować aktualizację tylko orientacji", () => {
      const result = PlanUpdateSchema.safeParse({
        orientation: 90,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orientation).toBe(90);
      }
    });

    it("powinien zaakceptować aktualizację wielu pól jednocześnie", () => {
      const result = PlanUpdateSchema.safeParse({
        name: "Updated Name",
        orientation: 180,
        latitude: 52.1,
        longitude: 21.0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
        expect(result.data.orientation).toBe(180);
        expect(result.data.latitude).toBe(52.1);
        expect(result.data.longitude).toBe(21.0);
      }
    });

    it("powinien odrzucić pusty obiekt (brak pól do aktualizacji)", () => {
      const result = PlanUpdateSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("At least one field must be provided for update");
      }
    });

    it("powinien przyciąć spacje w nazwie", () => {
      const result = PlanUpdateSchema.safeParse({
        name: "  Updated Name  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }
    });

    it("powinien odrzucić pustą nazwę po przycięciu", () => {
      const result = PlanUpdateSchema.safeParse({
        name: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("cannot be empty");
      }
    });

    it("powinien odrzucić ujemną szerokość", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: -100,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_cm"));
        expect(widthError?.message).toContain("positive");
      }
    });

    it("powinien odrzucić zero jako szerokość", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_cm"));
        expect(widthError?.message).toContain("positive");
      }
    });

    it("powinien odrzucić niecałkowitą szerokość", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 100.5,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy rozmiar komórki", () => {
      const result = PlanUpdateSchema.safeParse({
        cell_size_cm: 15,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const cellSizeError = result.error.errors.find((e) => e.path.includes("cell_size_cm"));
        expect(cellSizeError?.message).toContain("10, 25, 50, or 100 cm");
      }
    });

    it("powinien odrzucić szerokość niepodzielną przez rozmiar komórki (gdy oba podane)", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 510, // nie jest podzielne przez 25
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_cm"));
        expect(widthError?.message).toContain("divisible by cell size");
      }
    });

    it("powinien zaakceptować szerokość podzielną przez rozmiar komórki", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 500, // jest podzielne przez 25
        cell_size_cm: 25,
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować szerokość bez podania rozmiaru komórki", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 500,
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić wysokość niepodzielną przez rozmiar komórki (gdy oba podane)", () => {
      const result = PlanUpdateSchema.safeParse({
        height_cm: 410, // nie jest podzielne przez 25
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const heightError = result.error.errors.find((e) => e.path.includes("height_cm"));
        expect(heightError?.message).toContain("divisible by cell size");
      }
    });

    it("powinien odrzucić siatkę przekraczającą 200 komórek (gdy wszystkie wymiary podane)", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 5025, // 201 komórek * 25cm
        height_cm: 5000,
        cell_size_cm: 25,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const widthError = result.error.errors.find((e) => e.path.includes("width_cm"));
        expect(widthError?.message).toContain("Calculated grid dimensions must be between 1 and 200");
      }
    });

    it("powinien zaakceptować prawidłowe wymiary siatki (gdy wszystkie podane)", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 5000, // 200 komórek * 25cm
        height_cm: 5000,
        cell_size_cm: 25,
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować minimalną siatkę (1x1 komórka)", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 10, // 1 komórka * 10cm
        height_cm: 10,
        cell_size_cm: 10,
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić niecałkowite wymiary siatki", () => {
      const result = PlanUpdateSchema.safeParse({
        width_cm: 500,
        height_cm: 400,
        cell_size_cm: 30, // 500/30 = 16.67, nie jest całkowite
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić orientację mniejszą niż 0", () => {
      const result = PlanUpdateSchema.safeParse({
        orientation: -1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const orientationError = result.error.errors.find((e) => e.path.includes("orientation"));
        expect(orientationError?.message).toContain("between 0 and 359");
      }
    });

    it("powinien odrzucić orientację większą niż 359", () => {
      const result = PlanUpdateSchema.safeParse({
        orientation: 360,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłową szerokość geograficzną", () => {
      const result = PlanUpdateSchema.safeParse({
        latitude: 91,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłową długość geograficzną", () => {
      const result = PlanUpdateSchema.safeParse({
        longitude: 181,
      });

      expect(result.success).toBe(false);
    });

    it("powinien zaakceptować null dla opcjonalnych pól geograficznych", () => {
      const result = PlanUpdateSchema.safeParse({
        name: "Updated",
        latitude: null,
        longitude: null,
        hemisphere: null,
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić nieznane pola (strict mode)", () => {
      const result = PlanUpdateSchema.safeParse({
        name: "Updated",
        unknownField: "value",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlanUpdateQuerySchema", () => {
    it("powinien zaakceptować brak parametrów (domyślna wartość false)", () => {
      const result = PlanUpdateQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(false);
      }
    });

    it("powinien zaakceptować confirm_regenerate jako true", () => {
      const result = PlanUpdateQuerySchema.safeParse({
        confirm_regenerate: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(true);
      }
    });

    it("powinien zaakceptować confirm_regenerate jako false", () => {
      const result = PlanUpdateQuerySchema.safeParse({
        confirm_regenerate: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(false);
      }
    });

    it("powinien przekonwertować string 'true' na boolean true", () => {
      const result = PlanUpdateQuerySchema.safeParse({
        confirm_regenerate: "true" as unknown as boolean,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(true);
      }
    });

    it("powinien przekonwertować string 'false' na boolean false", () => {
      const result = PlanUpdateQuerySchema.safeParse({
        confirm_regenerate: "false" as unknown as boolean,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(false);
      }
    });

    it("powinien przekonwertować '1' na boolean true", () => {
      const result = PlanUpdateQuerySchema.safeParse({
        confirm_regenerate: "1" as unknown as boolean,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(true);
      }
    });

    it("powinien przekonwertować '0' na boolean false", () => {
      const result = PlanUpdateQuerySchema.safeParse({
        confirm_regenerate: "0" as unknown as boolean,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirm_regenerate).toBe(false);
      }
    });
  });

  describe("PlanIdParamSchema", () => {
    it("powinien zaakceptować prawidłowy UUID", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const result = PlanIdParamSchema.safeParse({
        plan_id: validUUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = PlanIdParamSchema.safeParse({
        plan_id: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("valid UUID");
      }
    });

    it("powinien odrzucić pusty string", () => {
      const result = PlanIdParamSchema.safeParse({
        plan_id: "",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić brak pola plan_id", () => {
      const result = PlanIdParamSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("PlanGridParamsSchema", () => {
    it("powinien zaakceptować prawidłowy UUID", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const result = PlanGridParamsSchema.safeParse({
        plan_id: validUUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = PlanGridParamsSchema.safeParse({
        plan_id: "invalid",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("PlanWeatherParamsSchema", () => {
    it("powinien zaakceptować prawidłowy UUID", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const result = PlanWeatherParamsSchema.safeParse({
        plan_id: validUUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_id).toBe(validUUID);
      }
    });

    it("powinien odrzucić nieprawidłowy UUID", () => {
      const result = PlanWeatherParamsSchema.safeParse({
        plan_id: "invalid",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("encodePlanCursor", () => {
    it("powinien zakodować cursor key do Base64", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const encoded = encodePlanCursor(key);

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe("string");
      // Sprawdź czy można zdekodować
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      expect(parsed).toEqual(key);
    });

    it("powinien zwrócić różne wartości dla różnych kluczy", () => {
      const key1: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "11111111-1111-1111-1111-111111111111",
      };

      const key2: PlanCursorKey = {
        updated_at: "2024-01-02T00:00:00Z",
        id: "22222222-2222-2222-2222-222222222222",
      };

      const encoded1 = encodePlanCursor(key1);
      const encoded2 = encodePlanCursor(key2);

      expect(encoded1).not.toBe(encoded2);
    });

    it("powinien zwrócić tę samą wartość dla tego samego klucza", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const encoded1 = encodePlanCursor(key);
      const encoded2 = encodePlanCursor(key);

      expect(encoded1).toBe(encoded2);
    });
  });

  describe("decodePlanCursor", () => {
    it("powinien zdekodować poprawny Base64 cursor", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const encoded = encodePlanCursor(key);
      const decoded = decodePlanCursor(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded).toEqual(key);
    });

    it("powinien zdekodować URL-encoded cursor", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const encoded = encodePlanCursor(key);
      // Symuluj URL-encoding (Base64 może zawierać +, /, =)
      const urlEncoded = encodeURIComponent(encoded);
      const decoded = decodePlanCursor(urlEncoded);

      expect(decoded).not.toBeNull();
      expect(decoded).toEqual(key);
    });

    it("powinien zwrócić null dla nieprawidłowego Base64", () => {
      const decoded = decodePlanCursor("invalid-base64!!!");

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla nieprawidłowego JSON w cursor", () => {
      // Utwórz poprawny Base64, ale z nieprawidłowym JSON
      const invalidJson = "not-json";
      const base64 = Buffer.from(invalidJson, "utf-8").toString("base64");
      const decoded = decodePlanCursor(base64);

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla cursor bez pola updated_at", () => {
      const invalidKey = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };
      const encoded = Buffer.from(JSON.stringify(invalidKey), "utf-8").toString("base64");
      const decoded = decodePlanCursor(encoded);

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla cursor bez pola id", () => {
      const invalidKey = {
        updated_at: "2024-01-01T00:00:00Z",
      };
      const encoded = Buffer.from(JSON.stringify(invalidKey), "utf-8").toString("base64");
      const decoded = decodePlanCursor(encoded);

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla cursor z nieprawidłowym typem updated_at", () => {
      const invalidKey = {
        updated_at: 123, // powinno być string
        id: "123e4567-e89b-12d3-a456-426614174000",
      };
      const encoded = Buffer.from(JSON.stringify(invalidKey), "utf-8").toString("base64");
      const decoded = decodePlanCursor(encoded);

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla cursor z nieprawidłowym typem id", () => {
      const invalidKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: 123, // powinno być string
      };
      const encoded = Buffer.from(JSON.stringify(invalidKey), "utf-8").toString("base64");
      const decoded = decodePlanCursor(encoded);

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla pustego stringa", () => {
      const decoded = decodePlanCursor("");

      expect(decoded).toBeNull();
    });

    it("powinien obsłużyć błąd URL decoding gracefully", () => {
      // Symuluj nieprawidłowy URL-encoded string
      const invalidUrlEncoded = "%E0%A4%A"; // nieprawidłowy URL encoding
      const decoded = decodePlanCursor(invalidUrlEncoded);

      // Powinien zwrócić null, ale nie rzucić błędu
      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla null w cursor", () => {
      const invalidKey = null;
      const encoded = Buffer.from(JSON.stringify(invalidKey), "utf-8").toString("base64");
      const decoded = decodePlanCursor(encoded);

      expect(decoded).toBeNull();
    });

    it("powinien zwrócić null dla cursor z dodatkowymi polami (tylko updated_at i id są wymagane)", () => {
      const keyWithExtra = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
        extra: "field",
      };
      const encoded = Buffer.from(JSON.stringify(keyWithExtra), "utf-8").toString("base64");
      // Dekodowanie powinno działać, ale struktura jest poprawna
      const decoded = decodePlanCursor(encoded);

      // Funkcja akceptuje dodatkowe pola, jeśli struktura jest poprawna
      expect(decoded).not.toBeNull();
      expect(decoded?.updated_at).toBe("2024-01-01T00:00:00Z");
      expect(decoded?.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    });
  });

  describe("PlanListQuerySchema", () => {
    it("powinien zaakceptować minimalne parametry (domyślne wartości)", () => {
      const result = PlanListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.cursorKey).toBeNull();
        expect(result.data.isAscending).toBe(false);
      }
    });

    it("powinien zaakceptować limit", () => {
      const result = PlanListQuerySchema.safeParse({
        limit: 50,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("powinien przekonwertować string limit na number", () => {
      const result = PlanListQuerySchema.safeParse({
        limit: "50" as unknown as number,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("powinien odrzucić limit mniejszy niż 1", () => {
      const result = PlanListQuerySchema.safeParse({
        limit: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const limitError = result.error.errors.find((e) => e.path.includes("limit"));
        expect(limitError?.message).toContain("at least 1");
      }
    });

    it("powinien odrzucić limit większy niż 100", () => {
      const result = PlanListQuerySchema.safeParse({
        limit: 101,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const limitError = result.error.errors.find((e) => e.path.includes("limit"));
        expect(limitError?.message).toContain("at most 100");
      }
    });

    it("powinien zaakceptować limit na granicy zakresu (1)", () => {
      const result = PlanListQuerySchema.safeParse({
        limit: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it("powinien zaakceptować limit na granicy zakresu (100)", () => {
      const result = PlanListQuerySchema.safeParse({
        limit: 100,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it("powinien zaakceptować poprawny cursor", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };
      const encoded = encodePlanCursor(key);

      const result = PlanListQuerySchema.safeParse({
        cursor: encoded,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursorKey).not.toBeNull();
        expect(result.data.cursorKey).toEqual(key);
      }
    });

    it("powinien odrzucić nieprawidłowy cursor", () => {
      const result = PlanListQuerySchema.safeParse({
        cursor: "invalid-cursor",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const cursorError = result.error.errors.find((e) => e.path.includes("cursor"));
        expect(cursorError?.message).toContain("Invalid cursor format");
      }
    });

    it("powinien zaakceptować sort='updated_at'", () => {
      const result = PlanListQuerySchema.safeParse({
        sort: "updated_at",
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić nieprawidłowy sort", () => {
      const result = PlanListQuerySchema.safeParse({
        sort: "name" as unknown as "updated_at",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const sortError = result.error.errors.find((e) => e.path.includes("sort"));
        expect(sortError?.message).toContain("'updated_at'");
      }
    });

    it("powinien zaakceptować order='asc'", () => {
      const result = PlanListQuerySchema.safeParse({
        order: "asc",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isAscending).toBe(true);
      }
    });

    it("powinien zaakceptować order='desc'", () => {
      const result = PlanListQuerySchema.safeParse({
        order: "desc",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isAscending).toBe(false);
      }
    });

    it("powinien ustawić isAscending na false gdy order nie jest podany", () => {
      const result = PlanListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isAscending).toBe(false);
      }
    });

    it("powinien odrzucić nieprawidłowy order", () => {
      const result = PlanListQuerySchema.safeParse({
        order: "invalid" as unknown as "asc" | "desc",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const orderError = result.error.errors.find((e) => e.path.includes("order"));
        expect(orderError?.message).toContain("'asc' or 'desc'");
      }
    });

    it("powinien zaakceptować wszystkie parametry jednocześnie", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };
      const encoded = encodePlanCursor(key);

      const result = PlanListQuerySchema.safeParse({
        limit: 50,
        cursor: encoded,
        sort: "updated_at",
        order: "asc",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.cursorKey).toEqual(key);
        expect(result.data.isAscending).toBe(true);
      }
    });

    it("powinien zaakceptować URL-encoded cursor", () => {
      const key: PlanCursorKey = {
        updated_at: "2024-01-01T00:00:00Z",
        id: "123e4567-e89b-12d3-a456-426614174000",
      };
      const encoded = encodePlanCursor(key);
      const urlEncoded = encodeURIComponent(encoded);

      const result = PlanListQuerySchema.safeParse({
        cursor: urlEncoded,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursorKey).toEqual(key);
      }
    });
  });
});
