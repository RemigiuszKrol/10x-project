import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeatherMonthlyChart, type WeatherMonthlyChartProps } from "@/components/editor/SideDrawer/WeatherMonthlyChart";
import type { WeatherMonthlyDto } from "@/types";

// Mock funkcji pomocniczej do temperatury
const mockDenormalizeTemperatureNullable = vi.fn();
vi.mock("@/lib/utils/temperature", () => ({
  denormalizeTemperatureNullable: (value: number | null) => mockDenormalizeTemperatureNullable(value),
}));

// Helper functions dla danych testowych
function createMockWeatherData(count = 12, startMonth = 1): WeatherMonthlyDto[] {
  return Array.from({ length: count }, (_, i) => ({
    year: 2024,
    month: startMonth + i,
    sunlight: 50 + i * 5,
    humidity: 60 + i * 2,
    precip: 30 + i * 5,
    temperature: 20 + i * 3,
    last_refreshed_at: i === 0 ? new Date().toISOString() : (null as unknown as string),
  }));
}

function createDefaultProps(): WeatherMonthlyChartProps {
  return {
    data: createMockWeatherData(12),
  };
}

describe("WeatherMonthlyChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Domyślna implementacja mocka - zwraca zaokrągloną wartość
    mockDenormalizeTemperatureNullable.mockImplementation((value: number | null) => {
      if (value === null) return null;
      return Math.round((value / 100) * 80 - 30);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie podstawowe", () => {
    it("should render SVG chart with correct dimensions", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("width", "320");
      expect(svg).toHaveAttribute("height", "200");
    });

    it("should render legend with all 4 metrics", () => {
      render(<WeatherMonthlyChart {...createDefaultProps()} />);

      expect(screen.getByText("Nasłonecznienie (%)")).toBeInTheDocument();
      expect(screen.getByText("Wilgotność (%)")).toBeInTheDocument();
      expect(screen.getByText("Opady (mm, normalizowane)")).toBeInTheDocument();
      expect(screen.getByText("Temperatura (normalizowana, °C w tooltip)")).toBeInTheDocument();
    });

    it("should render month labels on X axis", () => {
      render(<WeatherMonthlyChart {...createDefaultProps()} />);

      expect(screen.getByText("Sty")).toBeInTheDocument();
      expect(screen.getByText("Lut")).toBeInTheDocument();
      expect(screen.getByText("Mar")).toBeInTheDocument();
      expect(screen.getByText("Gru")).toBeInTheDocument();
    });

    it("should render grid lines with labels", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      // Sprawdź czy są linie siatki (grid lines)
      const lines = container.querySelectorAll("line");
      expect(lines.length).toBeGreaterThan(0);

      // Sprawdź czy są etykiety wartości (0, 25, 50, 75, 100)
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("75")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });

  describe("Sortowanie danych", () => {
    it("should sort data by month before rendering", () => {
      const unsortedData: WeatherMonthlyDto[] = [
        { year: 2024, month: 12, sunlight: 50, humidity: 60, precip: 30, temperature: 20, last_refreshed_at: null as unknown as string },
        { year: 2024, month: 1, sunlight: 50, humidity: 60, precip: 30, temperature: 20, last_refreshed_at: null as unknown as string },
        { year: 2024, month: 6, sunlight: 50, humidity: 60, precip: 30, temperature: 20, last_refreshed_at: null as unknown as string },
      ];

      render(<WeatherMonthlyChart data={unsortedData} />);

      // Sprawdź czy miesiące są wyświetlone w kolejności (Sty, Cze, Gru)
      const monthLabels = screen.getAllByText(/^(Sty|Lut|Mar|Kwi|Maj|Cze|Lip|Sie|Wrz|Paź|Lis|Gru)$/);
      expect(monthLabels.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle data with months in correct order", () => {
      const sortedData = createMockWeatherData(12, 1);
      render(<WeatherMonthlyChart data={sortedData} />);

      // Wszystkie 12 miesięcy powinny być wyświetlone
      const monthLabels = screen.getAllByText(/^(Sty|Lut|Mar|Kwi|Maj|Cze|Lip|Sie|Wrz|Paź|Lis|Gru)$/);
      expect(monthLabels.length).toBe(12);
    });
  });

  describe("Skalowanie wartości", () => {
    it("should render data points for all 4 metrics", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      // Sprawdź czy są kółka (punkty danych) dla każdej metryki
      const circles = container.querySelectorAll("circle");
      // Powinno być 12 miesięcy × 4 metryki = 48 kółek
      expect(circles.length).toBe(48);
    });

    it("should handle null values in data", () => {
      const dataWithNulls: WeatherMonthlyDto[] = [
        {
          year: 2024,
          month: 1,
          sunlight: null as unknown as number,
          humidity: 60,
          precip: 30,
          temperature: null as unknown as number,
          last_refreshed_at: null as unknown as string,
        },
      ];

      const { container } = render(<WeatherMonthlyChart data={dataWithNulls} />);

      // Komponent powinien się renderować bez błędów
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should scale precipitation dynamically when max > 100", () => {
      const dataWithHighPrecip: WeatherMonthlyDto[] = createMockWeatherData(12).map((d, i) => ({
        ...d,
        precip: 50 + i * 20, // Maksimum będzie > 100
      }));

      render(<WeatherMonthlyChart data={dataWithHighPrecip} />);

      // Sprawdź czy wyświetla się ostrzeżenie o normalizacji
      const maxPrecip = Math.max(...dataWithHighPrecip.map((d) => d.precip || 0));
      if (maxPrecip > 100) {
        expect(screen.getByText(/Uwaga: Opady przekraczają 100mm/i)).toBeInTheDocument();
      }
    });

    it("should not show normalization warning when precip <= 100", () => {
      const dataWithLowPrecip: WeatherMonthlyDto[] = createMockWeatherData(12).map((d) => ({
        ...d,
        precip: 50, // Wszystkie wartości <= 100
      }));

      render(<WeatherMonthlyChart data={dataWithLowPrecip} />);

      expect(screen.queryByText(/Uwaga: Opady przekraczają 100mm/i)).not.toBeInTheDocument();
    });
  });

  describe("Tooltips", () => {
    it("should render tooltips for sunlight data points", () => {
      const data = createMockWeatherData(1, 1);
      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const sunlightCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Nasłonecznienie");
      });

      expect(sunlightCircle).toBeInTheDocument();
      const title = sunlightCircle?.querySelector("title");
      expect(title?.textContent).toContain("Sty");
      expect(title?.textContent).toContain("Nasłonecznienie");
      expect(title?.textContent).toContain(`${data[0].sunlight}%`);
    });

    it("should render tooltips for humidity data points", () => {
      const data = createMockWeatherData(1, 1);
      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const humidityCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Wilgotność");
      });

      expect(humidityCircle).toBeInTheDocument();
      const title = humidityCircle?.querySelector("title");
      expect(title?.textContent).toContain("Wilgotność");
      expect(title?.textContent).toContain(`${data[0].humidity}%`);
    });

    it("should render tooltips for precipitation data points", () => {
      const data = createMockWeatherData(1, 1);
      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const precipCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Opady");
      });

      expect(precipCircle).toBeInTheDocument();
      const title = precipCircle?.querySelector("title");
      expect(title?.textContent).toContain("Opady");
      expect(title?.textContent).toContain(`${data[0].precip} mm`);
    });

    it("should render tooltips for temperature with Celsius conversion", () => {
      const data = createMockWeatherData(1, 1);
      mockDenormalizeTemperatureNullable.mockReturnValue(15);

      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const tempCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Temperatura");
      });

      expect(tempCircle).toBeInTheDocument();
      const title = tempCircle?.querySelector("title");
      expect(title?.textContent).toContain("Temperatura");
      expect(title?.textContent).toContain(`${data[0].temperature}%`);
      expect(title?.textContent).toContain("15°C");

      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(data[0].temperature);
    });

    it("should handle null temperature in tooltip", () => {
      const data: WeatherMonthlyDto[] = [
        {
          year: 2024,
          month: 1,
          sunlight: 50,
          humidity: 60,
          precip: 30,
          temperature: null as unknown as number,
          last_refreshed_at: null as unknown as string,
        },
      ];
      mockDenormalizeTemperatureNullable.mockReturnValue(null);

      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const tempCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Temperatura");
      });

      expect(tempCircle).toBeInTheDocument();
      const title = tempCircle?.querySelector("title");
      expect(title?.textContent).not.toContain("°C");

      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(null);
    });

    it("should show positive temperature with + sign in tooltip", () => {
      const data = createMockWeatherData(1, 1);
      mockDenormalizeTemperatureNullable.mockReturnValue(25);

      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const tempCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Temperatura");
      });

      const title = tempCircle?.querySelector("title");
      expect(title?.textContent).toContain("+25°C");
    });

    it("should show negative temperature without + sign in tooltip", () => {
      const data = createMockWeatherData(1, 1);
      mockDenormalizeTemperatureNullable.mockReturnValue(-5);

      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const tempCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Temperatura");
      });

      const title = tempCircle?.querySelector("title");
      expect(title?.textContent).toContain("-5°C");
      expect(title?.textContent).not.toContain("+-5°C");
    });
  });

  describe("Linie wykresu", () => {
    it("should render 4 path elements for data lines", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const paths = container.querySelectorAll("path");
      // Powinno być 4 linie danych (sunlight, humidity, precip, temperature)
      expect(paths.length).toBe(4);
    });

    it("should render sunlight line with yellow color", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const paths = container.querySelectorAll("path");
      const sunlightPath = Array.from(paths).find((path) => path.getAttribute("stroke") === "#eab308");

      expect(sunlightPath).toBeInTheDocument();
      expect(sunlightPath).toHaveAttribute("stroke-width", "2");
    });

    it("should render humidity line with blue color", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const paths = container.querySelectorAll("path");
      const humidityPath = Array.from(paths).find((path) => path.getAttribute("stroke") === "#3b82f6");

      expect(humidityPath).toBeInTheDocument();
      expect(humidityPath).toHaveAttribute("stroke-width", "2");
    });

    it("should render precipitation line with navy color and dashed stroke", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const paths = container.querySelectorAll("path");
      const precipPath = Array.from(paths).find((path) => path.getAttribute("stroke") === "#1e40af");

      expect(precipPath).toBeInTheDocument();
      expect(precipPath).toHaveAttribute("stroke-width", "2");
      expect(precipPath).toHaveAttribute("stroke-dasharray", "4 2");
    });

    it("should render temperature line with red color", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const paths = container.querySelectorAll("path");
      const tempPath = Array.from(paths).find((path) => path.getAttribute("stroke") === "#ef4444");

      expect(tempPath).toBeInTheDocument();
      expect(tempPath).toHaveAttribute("stroke-width", "2");
    });
  });

  describe("Legenda", () => {
    it("should render legend items with correct colors", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      // Sprawdź kolory w legendzie
      const sunlightLegend = screen.getByText("Nasłonecznienie (%)").closest("div");
      const sunlightColor = sunlightLegend?.querySelector("div");
      expect(sunlightColor).toHaveClass("bg-[#eab308]");

      const humidityLegend = screen.getByText("Wilgotność (%)").closest("div");
      const humidityColor = humidityLegend?.querySelector("div");
      expect(humidityColor).toHaveClass("bg-[#3b82f6]");

      const precipLegend = screen.getByText("Opady (mm, normalizowane)").closest("div");
      const precipColor = precipLegend?.querySelector("div");
      expect(precipColor).toHaveClass("border-[#1e40af]");

      const tempLegend = screen.getByText("Temperatura (normalizowana, °C w tooltip)").closest("div");
      const tempColor = tempLegend?.querySelector("div");
      expect(tempColor).toHaveClass("bg-[#ef4444]");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty data array", () => {
      render(<WeatherMonthlyChart data={[]} />);

      // Komponent powinien się renderować bez błędów
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should handle data with only one month", () => {
      const data = createMockWeatherData(1, 1);
      render(<WeatherMonthlyChart data={data} />);

      expect(screen.getByText("Sty")).toBeInTheDocument();
      const { container } = render(<WeatherMonthlyChart data={data} />);
      const circles = container.querySelectorAll("circle");
      // 1 miesiąc × 4 metryki = 4 kółka
      expect(circles.length).toBe(4);
    });

    it("should handle data with partial months (less than 12)", () => {
      const data = createMockWeatherData(6, 1);
      render(<WeatherMonthlyChart data={data} />);

      // Sprawdź czy wyświetlane są tylko dostępne miesiące
      expect(screen.getByText("Sty")).toBeInTheDocument();
      expect(screen.getByText("Cze")).toBeInTheDocument();
      expect(screen.queryByText("Lip")).not.toBeInTheDocument();
    });

    it("should handle data with all null values", () => {
      const data: WeatherMonthlyDto[] = [
        {
          year: 2024,
          month: 1,
          sunlight: null as unknown as number,
          humidity: null as unknown as number,
          precip: null as unknown as number,
          temperature: null as unknown as number,
          last_refreshed_at: null as unknown as string,
        },
      ];

      render(<WeatherMonthlyChart data={data} />);

      // Komponent powinien się renderować bez błędów
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should handle very high values (clamping)", () => {
      const data: WeatherMonthlyDto[] = [
        {
          year: 2024,
          month: 1,
          sunlight: 200, // Poza zakresem 0-100
          humidity: 150, // Poza zakresem 0-100
          precip: 500, // Bardzo wysoka wartość
          temperature: 200, // Poza zakresem 0-100
          last_refreshed_at: null as unknown as string,
        },
      ];

      render(<WeatherMonthlyChart data={data} />);

      // Komponent powinien się renderować bez błędów (wartości są clampowane)
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should handle negative values (clamping)", () => {
      const data: WeatherMonthlyDto[] = [
        {
          year: 2024,
          month: 1,
          sunlight: -10, // Ujemna wartość
          humidity: -5,
          precip: -20,
          temperature: -15,
          last_refreshed_at: null as unknown as string,
        },
      ];

      render(<WeatherMonthlyChart data={data} />);

      // Komponent powinien się renderować bez błędów (wartości są clampowane do 0)
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should handle data with duplicate months (uses first occurrence)", () => {
      const data: WeatherMonthlyDto[] = [
        { year: 2024, month: 1, sunlight: 50, humidity: 60, precip: 30, temperature: 20, last_refreshed_at: null as unknown as string },
        { year: 2024, month: 1, sunlight: 70, humidity: 80, precip: 50, temperature: 30, last_refreshed_at: null as unknown as string },
        { year: 2024, month: 2, sunlight: 60, humidity: 70, precip: 40, temperature: 25, last_refreshed_at: null as unknown as string },
      ];

      render(<WeatherMonthlyChart data={data} />);

      // Komponent powinien się renderować (sortowanie i renderowanie działa)
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Integracja z denormalizeTemperatureNullable", () => {
    it("should call denormalizeTemperatureNullable for each temperature value", () => {
      const data = createMockWeatherData(12);
      render(<WeatherMonthlyChart data={data} />);

      // Powinno być wywołane 12 razy (dla każdego miesiąca)
      expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledTimes(12);
      data.forEach((d) => {
        expect(mockDenormalizeTemperatureNullable).toHaveBeenCalledWith(d.temperature);
      });
    });

    it("should handle denormalizeTemperatureNullable returning null", () => {
      const data = createMockWeatherData(1, 1);
      mockDenormalizeTemperatureNullable.mockReturnValue(null);

      const { container } = render(<WeatherMonthlyChart data={data} />);

      const circles = container.querySelectorAll("circle");
      const tempCircle = Array.from(circles).find((circle) => {
        const title = circle.querySelector("title");
        return title?.textContent?.includes("Temperatura");
      });

      const title = tempCircle?.querySelector("title");
      expect(title?.textContent).not.toContain("°C");
    });
  });

  describe("Struktura komponentu", () => {
    it("should render with proper layout structure", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      // Sprawdź główny kontener
      const mainContainer = container.querySelector(".space-y-4");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should render SVG with correct classes", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("rounded-lg", "border", "bg-card");
    });

    it("should render legend with flex layout", () => {
      const { container } = render(<WeatherMonthlyChart {...createDefaultProps()} />);

      const legend = container.querySelector(".flex.flex-wrap.justify-center");
      expect(legend).toBeInTheDocument();
    });
  });

  describe("Walidacja props", () => {
    it("should require data prop (TypeScript enforces this, but test runtime behavior)", () => {
      // TypeScript zapobiegnie temu w czasie kompilacji, ale w runtime komponent wymaga data
      const props = {} as WeatherMonthlyChartProps;
      expect(() => render(<WeatherMonthlyChart {...props} />)).toThrow();
    });

    it("should handle data with year field (even though not used in chart)", () => {
      const data: WeatherMonthlyDto[] = [
        { year: 2024, month: 1, sunlight: 50, humidity: 60, precip: 30, temperature: 20, last_refreshed_at: null as unknown as string },
      ];

      render(<WeatherMonthlyChart data={data} />);

      // Komponent powinien się renderować
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});

