import { describe, it, expect } from "vitest";
import { denormalizeTemperature, denormalizeTemperatureNullable } from "@/lib/utils/temperature";

describe("temperature utils", () => {
  describe("denormalizeTemperature", () => {
    it("powinien denormalizować wartość 0 do -30°C", () => {
      const result = denormalizeTemperature(0);
      expect(result).toBe(-30);
    });

    it("powinien denormalizować wartość 100 do 50°C", () => {
      const result = denormalizeTemperature(100);
      expect(result).toBe(50);
    });

    it("powinien denormalizować wartość 50 do 10°C", () => {
      const result = denormalizeTemperature(50);
      expect(result).toBe(10);
    });

    it("powinien denormalizować wartość 25 do -10°C", () => {
      const result = denormalizeTemperature(25);
      expect(result).toBe(-10);
    });

    it("powinien denormalizować wartość 75 do 30°C", () => {
      const result = denormalizeTemperature(75);
      expect(result).toBe(30);
    });

    it("powinien denormalizować wartość 37.5 do 0°C", () => {
      const result = denormalizeTemperature(37.5);
      expect(result).toBe(0);
    });

    it("powinien denormalizować wartość pośrednią 12.5 do -20°C", () => {
      const result = denormalizeTemperature(12.5);
      expect(result).toBe(-20);
    });

    it("powinien denormalizować wartość pośrednią 62.5 do 20°C", () => {
      const result = denormalizeTemperature(62.5);
      expect(result).toBe(20);
    });

    it("powinien obsługiwać wartości ujemne (poza zakresem)", () => {
      const result = denormalizeTemperature(-10);
      expect(result).toBe(-38);
    });

    it("powinien obsługiwać wartości powyżej 100 (poza zakresem)", () => {
      const result = denormalizeTemperature(150);
      expect(result).toBe(90);
    });

    it("powinien zwracać dokładne wartości zmiennoprzecinkowe", () => {
      const result = denormalizeTemperature(33.333);
      expect(result).toBeCloseTo(-3.3336, 4);
    });

    it("powinien zwracać dokładne wartości dla wartości granicznych zakresu", () => {
      const result1 = denormalizeTemperature(1);
      expect(result1).toBe(-29.2);

      const result2 = denormalizeTemperature(99);
      expect(result2).toBe(49.2);
    });
  });

  describe("denormalizeTemperatureNullable", () => {
    it("powinien zwracać null dla wartości null", () => {
      const result = denormalizeTemperatureNullable(null);
      expect(result).toBeNull();
    });

    it("powinien denormalizować wartość 0 do -30°C (zaokrągloną)", () => {
      const result = denormalizeTemperatureNullable(0);
      expect(result).toBe(-30);
    });

    it("powinien denormalizować wartość 100 do 50°C (zaokrągloną)", () => {
      const result = denormalizeTemperatureNullable(100);
      expect(result).toBe(50);
    });

    it("powinien denormalizować wartość 50 do 10°C (zaokrągloną)", () => {
      const result = denormalizeTemperatureNullable(50);
      expect(result).toBe(10);
    });

    it("powinien zaokrąglać wartości zmiennoprzecinkowe w górę", () => {
      // 33.333 → -3.3336 → zaokrąglone do -3
      const result = denormalizeTemperatureNullable(33.333);
      expect(result).toBe(-3);
    });

    it("powinien zaokrąglać wartości zmiennoprzecinkowe w dół", () => {
      // 33.4 → -3.28 → zaokrąglone do -3
      const result = denormalizeTemperatureNullable(33.4);
      expect(result).toBe(-3);
    });

    it("powinien zaokrąglać wartości zmiennoprzecinkowe zgodnie z zasadami Math.round", () => {
      // 33.5 → -3.2 → zaokrąglone do -3
      const result1 = denormalizeTemperatureNullable(33.5);
      expect(result1).toBe(-3);

      // 33.75 → -3.0 → zaokrąglone do -3
      const result2 = denormalizeTemperatureNullable(33.75);
      expect(result2).toBe(-3);

      // 34.375 → -2.5 → zaokrąglone do -2
      const result3 = denormalizeTemperatureNullable(34.375);
      expect(result3).toBe(-2);
    });

    it("powinien obsługiwać wartości ujemne (poza zakresem)", () => {
      const result = denormalizeTemperatureNullable(-10);
      expect(result).toBe(-38);
    });

    it("powinien obsługiwać wartości powyżej 100 (poza zakresem)", () => {
      const result = denormalizeTemperatureNullable(150);
      expect(result).toBe(90);
    });

    it("powinien zwracać zaokrąglone wartości dla wartości granicznych zakresu", () => {
      const result1 = denormalizeTemperatureNullable(1);
      expect(result1).toBe(-29);

      const result2 = denormalizeTemperatureNullable(99);
      expect(result2).toBe(49);
    });

    it("powinien zwracać 0°C dla wartości 37.5 (zaokrąglone)", () => {
      const result = denormalizeTemperatureNullable(37.5);
      expect(result).toBe(0);
    });

    it("powinien zwracać zaokrąglone wartości dla wartości pośrednich", () => {
      const result1 = denormalizeTemperatureNullable(12.5);
      expect(result1).toBe(-20);

      const result2 = denormalizeTemperatureNullable(62.5);
      expect(result2).toBe(20);
    });
  });
});
