import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeatherMetricsTable, type WeatherMetricsTableProps } from "@/components/editor/SideDrawer/WeatherMetricsTable";
import type { WeatherMonthlyDto } from "@/types";

// Mock funkcji denormalizeTemperatureNullable
const mockDenormalizeTemperatureNullable = vi.fn();
vi.mock("@/lib/utils/temperature", () => ({
  denormalizeTemperatureNullable: (value: number | null) => mockDenormalizeTemperatureNullable(value),
}));

/**
 * Helper function do tworzenia mock WeatherMonthlyDto
 */
function createMockWeatherData(
  month: number,
  overrides?: Partial<WeatherMonthlyDto>
): WeatherMonthlyDto {
  return {
    year: 2024,
    month,
    sunlight: 50,
    humidity: 60,
    precip: 70,
    temperature: 40,
    last_refreshed_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper function do tworzenia danych dla wszystkich 12 miesięcy
 */
function createMockWeatherDataForAllMonths(overrides?: Partial<WeatherMonthlyDto>): WeatherMonthlyDto[] {
  return Array.from({ length: 12 }, (_, i) => createMockWeatherData(i + 1, overrides));
}

describe("WeatherMetricsTable", () => {
  let defaultProps: WeatherMetricsTableProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      data: createMockWeatherDataForAllMonths(),
    };

    // Domyślna konfiguracja mocka denormalizacji temperatury
    mockDenormalizeTemperatureNullable.mockImplementation((value: number | null) => {
      if (value === null) return null;
      // Symulacja: temperatura 40% → około 2°C
      return Math.round(((value / 100) * 80 - 30));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie podstawowe", () => {
    it("should render table with correct headers", () => {
      render(<WeatherMetricsTable {...defaultProps} />);

      expect(screen.getByText("Miesiąc")).toBeInTheDocument();
      expect(screen.getByText("Nasłonecznienie")).toBeInTheDocument();
      expect(screen.getByText("Wilgotność")).toBeInTheDocument();
      expect(screen.getByText("Opady")).toBeInTheDocument();
      expect(screen.getByText("Temperatura")).toBeInTheDocument();
    });

    it("should render all 12 months when data contains 12 months", () => {
      render(<WeatherMetricsTable {...defaultProps} />);

      expect(screen.getByText("Styczeń")).toBeInTheDocument();
      expect(screen.getByText("Luty")).toBeInTheDocument();
      expect(screen.getByText("Marzec")).toBeInTheDocument();
      expect(screen.getByText("Kwiecień")).toBeInTheDocument();
      expect(screen.getByText("Maj")).toBeInTheDocument();
      expect(screen.getByText("Czerwiec")).toBeInTheDocument();
      expect(screen.getByText("Lipiec")).toBeInTheDocument();
      expect(screen.getByText("Sierpień")).toBeInTheDocument();
      expect(screen.getByText("Wrzesień")).toBeInTheDocument();
      expect(screen.getByText("Październik")).toBeInTheDocument();
      expect(screen.getByText("Listopad")).toBeInTheDocument();
      expect(screen.getByText("Grudzień")).toBeInTheDocument();
    });

    it("should render table with rounded border", () => {
      const { container } = render(<WeatherMetricsTable {...defaultProps} />);

      const tableWrapper = container.querySelector(".rounded-lg.border");
      expect(tableWrapper).toBeInTheDocument();
    });

    it("should render table rows with correct count", () => {
      render(<WeatherMetricsTable {...defaultProps} />);

      // 12 miesięcy + 1 wiersz nagłówka = 13 wierszy
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(13); // 1 header + 12 data rows
    });
  });

  describe("Sortowanie danych", () => {
    it("should sort data by month in ascending order", () => {
      // Dane w losowej kolejności
      const unsortedData: WeatherMonthlyDto[] = [
        createMockWeatherData(12),
        createMockWeatherData(3),
        createMockWeatherData(1),
        createMockWeatherData(6),
      ];

      render(<WeatherMetricsTable data={unsortedData} />);

      const rows = screen.getAllByRole("row");
      // Pomijamy nagłówek (index 0)
      const monthCells = rows.slice(1).map((row) => {
        const cells = row.querySelectorAll("td");
        return cells[0]?.textContent;
      });

      expect(monthCells).toEqual(["Styczeń", "Marzec", "Czerwiec", "Grudzień"]);
    });

    it("should handle data with months in descending order", () => {
      const descendingData: WeatherMonthlyDto[] = [
        createMockWeatherData(12),
        createMockWeatherData(11),
        createMockWeatherData(10),
      ];

      render(<WeatherMetricsTable data={descendingData} />);

      const rows = screen.getAllByRole("row");
      const monthCells = rows.slice(1).map((row) => {
        const cells = row.querySelectorAll("td");
        return cells[0]?.textContent;
      });

      expect(monthCells).toEqual(["Październik", "Listopad", "Grudzień"]);
    });

    it("should handle duplicate months (keep all)", () => {
      const duplicateData: WeatherMonthlyDto[] = [
        createMockWeatherData(1, { year: 2024 }),
        createMockWeatherData(1, { year: 2023 }),
        createMockWeatherData(2),
      ];

      render(<WeatherMetricsTable data={duplicateData} />);

      const rows = screen.getAllByRole("row");
      // Powinno być 3 wiersze danych (duplikaty są zachowane)
      expect(rows).toHaveLength(4); // 1 header + 3 data rows
    });
  });

  describe("Formatowanie wartości", () => {
    it("should format sunlight with percentage unit", () => {
      const data = [createMockWeatherData(1, { sunlight: 75 })];

      render(<WeatherMetricsTable data={data} />);

      // Znajdź wiersz dla stycznia i sprawdź wartość nasłonecznienia
      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow).toBeInTheDocument();
      expect(januaryRow?.textContent).toContain("75%");
    });

    it("should format humidity with percentage unit", () => {
      const data = [createMockWeatherData(1, { humidity: 85 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("85%");
    });

    it("should format precip with mm unit", () => {
      const data = [createMockWeatherData(1, { precip: 90 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("90 mm");
    });

    it("should display '—' for null sunlight value", () => {
      const data = [createMockWeatherData(1, { sunlight: null as unknown as number })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("—");
    });

    it("should display '—' for null humidity value", () => {
      const data = [createMockWeatherData(1, { humidity: null as unknown as number })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("—");
    });

    it("should display '—' for null precip value", () => {
      const data = [createMockWeatherData(1, { precip: null as unknown as number })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("—");
    });

    it("should format zero values correctly", () => {
      const data = [createMockWeatherData(1, { sunlight: 0, humidity: 0, precip: 0 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("0%");
      expect(januaryRow?.textContent).toContain("0 mm");
    });

    it("should format maximum values correctly", () => {
      const data = [createMockWeatherData(1, { sunlight: 100, humidity: 100, precip: 100 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("100%");
      expect(januaryRow?.textContent).toContain("100 mm");
    });
  });

  describe("Formatowanie temperatury", () => {
    it("should format temperature with normalized value and celsius", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(10);
      const data = [createMockWeatherData(1, { temperature: 50 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("50%");
      expect(januaryRow?.textContent).toContain("+10°C");
      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(50);
    });

    it("should format negative temperature correctly", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(-15);
      const data = [createMockWeatherData(1, { temperature: 20 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("20%");
      expect(januaryRow?.textContent).toContain("-15°C");
    });

    it("should format zero temperature correctly", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(0);
      const data = [createMockWeatherData(1, { temperature: 37.5 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      // Dla temperatury 0°C nie dodajemy znaku plus (celsius > 0 ? "+" : "")
      expect(januaryRow?.textContent).toContain("0°C");
      expect(januaryRow?.textContent).not.toContain("+0°C");
    });

    it("should display '—' for null temperature", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(null);
      const data = [createMockWeatherData(1, { temperature: null as unknown as number })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("—");
      // Funkcja denormalizeTemperatureNullable nie jest wywoływana dla null
      // (w komponencie jest early return: if (value === null) return "—")
      expect(mockDenormalizeTemperatureNullable).not.toHaveBeenCalled();
    });

    it("should display only percentage when denormalize returns null", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(null);
      const data = [createMockWeatherData(1, { temperature: 50 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("50%");
      expect(januaryRow?.textContent).not.toContain("°C");
    });

    it("should call denormalizeTemperatureNullable for each temperature value", () => {
      const data = createMockWeatherDataForAllMonths({ temperature: 50 });
      mockDenormalizeTemperatureNullable.mockReturnValue(10);

      render(<WeatherMetricsTable data={data} />);

      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledTimes(12);
      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(50);
    });
  });

  describe("Nazwy miesięcy", () => {
    it("should display correct Polish month names", () => {
      const data = [
        createMockWeatherData(1),
        createMockWeatherData(2),
        createMockWeatherData(3),
        createMockWeatherData(4),
        createMockWeatherData(5),
        createMockWeatherData(6),
        createMockWeatherData(7),
        createMockWeatherData(8),
        createMockWeatherData(9),
        createMockWeatherData(10),
        createMockWeatherData(11),
        createMockWeatherData(12),
      ];

      render(<WeatherMetricsTable data={data} />);

      expect(screen.getByText("Styczeń")).toBeInTheDocument();
      expect(screen.getByText("Luty")).toBeInTheDocument();
      expect(screen.getByText("Marzec")).toBeInTheDocument();
      expect(screen.getByText("Kwiecień")).toBeInTheDocument();
      expect(screen.getByText("Maj")).toBeInTheDocument();
      expect(screen.getByText("Czerwiec")).toBeInTheDocument();
      expect(screen.getByText("Lipiec")).toBeInTheDocument();
      expect(screen.getByText("Sierpień")).toBeInTheDocument();
      expect(screen.getByText("Wrzesień")).toBeInTheDocument();
      expect(screen.getByText("Październik")).toBeInTheDocument();
      expect(screen.getByText("Listopad")).toBeInTheDocument();
      expect(screen.getByText("Grudzień")).toBeInTheDocument();
    });

    it("should display fallback month name for invalid month number", () => {
      const data = [createMockWeatherData(13 as unknown as number)];

      render(<WeatherMetricsTable data={data} />);

      expect(screen.getByText("Miesiąc 13")).toBeInTheDocument();
    });

    it("should display fallback month name for month 0", () => {
      const data = [createMockWeatherData(0 as unknown as number)];

      render(<WeatherMetricsTable data={data} />);

      expect(screen.getByText("Miesiąc 0")).toBeInTheDocument();
    });

    it("should display fallback month name for negative month number", () => {
      const data = [createMockWeatherData(-1 as unknown as number)];

      render(<WeatherMetricsTable data={data} />);

      expect(screen.getByText("Miesiąc -1")).toBeInTheDocument();
    });
  });

  describe("Stylowanie i layout", () => {
    it("should apply text-right class to numeric columns", () => {
      const { container } = render(<WeatherMetricsTable {...defaultProps} />);

      const headerRow = screen.getAllByRole("row")[0];
      const headerCells = headerRow.querySelectorAll("th");

      // Sprawdź, że kolumny numeryczne mają text-right
      expect(headerCells[1]).toHaveClass("text-right"); // Nasłonecznienie
      expect(headerCells[2]).toHaveClass("text-right"); // Wilgotność
      expect(headerCells[3]).toHaveClass("text-right"); // Opady
      expect(headerCells[4]).toHaveClass("text-right"); // Temperatura
    });

    it("should apply font-medium class to month column", () => {
      const { container } = render(<WeatherMetricsTable {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const monthCell = firstDataRow.querySelector("td");

      expect(monthCell).toHaveClass("font-medium");
    });

    it("should apply text-right class to data cells in numeric columns", () => {
      const { container } = render(<WeatherMetricsTable {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const cells = firstDataRow.querySelectorAll("td");

      // Pomijamy pierwszą komórkę (miesiąc), sprawdzamy pozostałe
      expect(cells[1]).toHaveClass("text-right"); // Nasłonecznienie
      expect(cells[2]).toHaveClass("text-right"); // Wilgotność
      expect(cells[3]).toHaveClass("text-right"); // Opady
      expect(cells[4]).toHaveClass("text-right"); // Temperatura
    });
  });

  describe("Edge cases", () => {
    it("should handle empty data array", () => {
      render(<WeatherMetricsTable data={[]} />);

      // Powinien renderować tylko nagłówek
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(1); // Tylko header
    });

    it("should handle data with single month", () => {
      const data = [createMockWeatherData(6)];

      render(<WeatherMetricsTable data={data} />);

      expect(screen.getByText("Czerwiec")).toBeInTheDocument();
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(2); // 1 header + 1 data row
    });

    it("should handle data with all null values", () => {
      const data = [createMockWeatherData(1, { 
        sunlight: null as unknown as number, 
        humidity: null as unknown as number, 
        precip: null as unknown as number, 
        temperature: null as unknown as number 
      })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      // Wszystkie wartości powinny być "—"
      const dashes = januaryRow?.textContent?.match(/—/g);
      expect(dashes).toHaveLength(4); // 4 wartości null
    });

    it("should handle data with mixed null and non-null values", () => {
      const data = [
        createMockWeatherData(1, { 
          sunlight: 50, 
          humidity: null as unknown as number, 
          precip: 70, 
          temperature: null as unknown as number 
        }),
      ];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("50%"); // sunlight
      expect(januaryRow?.textContent).toContain("—"); // humidity
      expect(januaryRow?.textContent).toContain("70 mm"); // precip
      expect(januaryRow?.textContent).toContain("—"); // temperature
    });

    it("should handle very large values", () => {
      const data = [createMockWeatherData(1, { sunlight: 999, humidity: 999, precip: 999, temperature: 999 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("999%");
      expect(januaryRow?.textContent).toContain("999 mm");
    });

    it("should handle decimal values", () => {
      const data = [createMockWeatherData(1, { sunlight: 50.5, humidity: 60.7, precip: 70.3, temperature: 40.2 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("50.5%");
      expect(januaryRow?.textContent).toContain("60.7%");
      expect(januaryRow?.textContent).toContain("70.3 mm");
      expect(januaryRow?.textContent).toContain("40.2%");
    });

    it("should handle data with more than 12 months", () => {
      const data = [
        ...createMockWeatherDataForAllMonths({ year: 2024 }),
        ...createMockWeatherDataForAllMonths({ year: 2023 }),
      ];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(25); // 1 header + 24 data rows
    });

    it("should not mutate original data array when sorting", () => {
      const originalData: WeatherMonthlyDto[] = [
        createMockWeatherData(12),
        createMockWeatherData(1),
        createMockWeatherData(6),
      ];
      const dataCopy = [...originalData];

      render(<WeatherMetricsTable data={originalData} />);

      // Oryginalna tablica nie powinna być zmodyfikowana
      expect(originalData).toEqual(dataCopy);
    });
  });

  describe("Integracja z denormalizeTemperatureNullable", () => {
    it("should call denormalizeTemperatureNullable with correct values", () => {
      const data = [
        createMockWeatherData(1, { temperature: 25 }),
        createMockWeatherData(2, { temperature: 50 }),
        createMockWeatherData(3, { temperature: 75 }),
      ];
      mockDenormalizeTemperatureNullable.mockReturnValue(0);

      render(<WeatherMetricsTable data={data} />);

      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(25);
      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(50);
      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(75);
      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledTimes(3);
    });

    it("should handle denormalizeTemperatureNullable returning null", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(null);
      const data = [createMockWeatherData(1, { temperature: 50 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("50%");
      expect(januaryRow?.textContent).not.toContain("°C");
    });

    it("should format positive temperature with plus sign", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(15);
      const data = [createMockWeatherData(1, { temperature: 56.25 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("+15°C");
    });

    it("should format negative temperature without plus sign", () => {
      mockDenormalizeTemperatureNullable.mockReturnValue(-20);
      const data = [createMockWeatherData(1, { temperature: 12.5 })];

      render(<WeatherMetricsTable data={data} />);

      const rows = screen.getAllByRole("row");
      const januaryRow = rows.find((row) => row.textContent?.includes("Styczeń"));
      expect(januaryRow?.textContent).toContain("-20°C");
      expect(januaryRow?.textContent).not.toContain("+-20°C");
    });
  });
});

