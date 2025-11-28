import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeatherTab, type WeatherTabProps } from "@/components/editor/SideDrawer/WeatherTab";
import type { WeatherMonthlyDto } from "@/types";

// Mock hooks
const mockUseWeatherData = vi.fn();
const mockUseRefreshWeather = vi.fn();

vi.mock("@/lib/hooks/queries/useWeatherData", () => ({
  useWeatherData: (planId: string) => mockUseWeatherData(planId),
}));

vi.mock("@/lib/hooks/mutations/useRefreshWeather", () => ({
  useRefreshWeather: () => mockUseRefreshWeather(),
}));

// Mock komponentów potomnych
vi.mock("@/components/editor/SideDrawer/WeatherMonthlyChart", () => ({
  WeatherMonthlyChart: ({ data }: { data: WeatherMonthlyDto[] }) => (
    <div data-testid="weather-monthly-chart">
      <div data-testid="chart-data-count">{data.length}</div>
    </div>
  ),
}));

vi.mock("@/components/editor/SideDrawer/WeatherMetricsTable", () => ({
  WeatherMetricsTable: ({ data }: { data: WeatherMonthlyDto[] }) => (
    <div data-testid="weather-metrics-table">
      <div data-testid="table-data-count">{data.length}</div>
    </div>
  ),
}));

// Mock toast
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

// Mock logger
const mockLoggerError = vi.fn();
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

// Helper functions dla danych testowych
function createMockWeatherData(count = 12): WeatherMonthlyDto[] {
  const months = Array.from({ length: count }, (_, i) => ({
    month: i + 1,
    sunlight_hours: 150 + i * 10,
    humidity_percent: 60 + i * 2,
    precipitation_mm: 50 + i * 5,
    temperature_celsius: 10 + i * 2,
    last_refreshed_at: i === 0 ? new Date().toISOString() : null,
  }));
  return months as unknown as WeatherMonthlyDto[];
}

function createDefaultProps(): WeatherTabProps {
  return {
    planId: "test-plan-id",
  };
}

describe("WeatherTab", () => {
  let defaultProps: WeatherTabProps;
  let mockRefreshMutation: {
    mutateAsync: ReturnType<typeof vi.fn>;
    isPending: boolean;
    error: Error | null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();

    // Domyślna konfiguracja mocków
    mockRefreshMutation = {
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    };

    mockUseWeatherData.mockReturnValue({
      data: createMockWeatherData(),
      isLoading: false,
      error: null,
    });

    mockUseRefreshWeather.mockReturnValue(mockRefreshMutation);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render header with title and description", () => {
      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText("Dane pogodowe")).toBeInTheDocument();
      expect(
        screen.getByText("Miesięczne dane klimatyczne dla lokalizacji planu (nasłonecznienie, wilgotność, opady).")
      ).toBeInTheDocument();
    });

    it("should render chart and table when data is available", () => {
      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByTestId("weather-monthly-chart")).toBeInTheDocument();
      expect(screen.getByTestId("weather-metrics-table")).toBeInTheDocument();
    });

    it("should pass data to chart and table components", () => {
      const mockData = createMockWeatherData(12);
      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByTestId("chart-data-count")).toHaveTextContent("12");
      expect(screen.getByTestId("table-data-count")).toHaveTextContent("12");
    });

    it("should display last refresh date when available", () => {
      const mockData = createMockWeatherData(12);
      const refreshDate = new Date("2024-01-15T10:30:00Z");
      mockData[0].last_refreshed_at = refreshDate.toISOString();

      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText(/Ostatnie odświeżenie:/i)).toBeInTheDocument();
      expect(screen.getByText(/15 stycznia 2024/i)).toBeInTheDocument();
    });

    it("should not display last refresh date when not available", () => {
      const mockData = createMockWeatherData(12);
      mockData[0].last_refreshed_at = null as unknown as string;

      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.queryByText(/Ostatnie odświeżenie:/i)).not.toBeInTheDocument();
    });

    it("should render refresh button", () => {
      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByRole("button", { name: /odśwież dane pogodowe/i })).toBeInTheDocument();
    });

    it("should render cache information text", () => {
      render(<WeatherTab {...defaultProps} />);

      expect(
        screen.getByText(/Dane pogodowe są cache'owane. Odświeżaj tylko gdy potrzebujesz aktualnych informacji./i)
      ).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should display loading spinner when data is loading", () => {
      mockUseWeatherData.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText("Ładowanie danych pogodowych...")).toBeInTheDocument();
      expect(screen.queryByTestId("weather-monthly-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("weather-metrics-table")).not.toBeInTheDocument();
    });

    it("should not display content when loading", () => {
      mockUseWeatherData.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.queryByText("Dane pogodowe")).not.toBeInTheDocument();
      expect(screen.queryByTestId("weather-monthly-chart")).not.toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should display error message when query fails", () => {
      const errorMessage = "Nie udało się pobrać danych pogodowych";
      mockUseWeatherData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error(errorMessage),
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.queryByTestId("weather-monthly-chart")).not.toBeInTheDocument();
    });

    it("should display error icon in error state", () => {
      mockUseWeatherData.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Test error"),
      });

      render(<WeatherTab {...defaultProps} />);

      // AlertCircle icon jest renderowany w Alert
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should display empty state when no data is available", () => {
      mockUseWeatherData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText("Brak danych pogodowych")).toBeInTheDocument();
      expect(
        screen.getByText("Odśwież dane, aby pobrać informacje o pogodzie")
      ).toBeInTheDocument();
    });

    it("should display empty state when data is null", () => {
      mockUseWeatherData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText("Brak danych pogodowych")).toBeInTheDocument();
    });

    it("should render refresh button in empty state", () => {
      mockUseWeatherData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByRole("button", { name: /pobierz dane pogodowe/i })).toBeInTheDocument();
    });

    it("should call handleRefresh with force=true when refresh button is clicked in empty state", async () => {
      const user = userEvent.setup();
      mockUseWeatherData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      mockRefreshMutation.mutateAsync.mockResolvedValue({
        refreshed: true,
        months: 12,
      });

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /pobierz dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockRefreshMutation.mutateAsync).toHaveBeenCalledWith({
          planId: "test-plan-id",
          command: { force: true },
        });
      });
    });
  });

  describe("Refresh functionality", () => {
    it("should call refresh mutation when refresh button is clicked", async () => {
      const user = userEvent.setup();
      mockRefreshMutation.mutateAsync.mockResolvedValue({
        refreshed: true,
        months: 12,
      });

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockRefreshMutation.mutateAsync).toHaveBeenCalledWith({
          planId: "test-plan-id",
          command: { force: false },
        });
      });
    });

    it("should show success toast when data is refreshed", async () => {
      const user = userEvent.setup();
      mockRefreshMutation.mutateAsync.mockResolvedValue({
        refreshed: true,
        months: 12,
      });

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Dane pogodowe zaktualizowane", {
          description: "Pobrano dane dla 12 miesięcy",
        });
      });
    });

    it("should show info toast when data is already up to date", async () => {
      const user = userEvent.setup();
      mockRefreshMutation.mutateAsync.mockResolvedValue({
        refreshed: false,
        months: 0,
      });

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockToastInfo).toHaveBeenCalledWith("Dane pogodowe są aktualne", {
          description: "Nie było potrzeby pobierania nowych danych",
        });
      });
    });

    it("should disable refresh button when mutation is pending", () => {
      mockRefreshMutation.isPending = true;

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odświeżanie.../i });
      expect(refreshButton).toBeDisabled();
    });

    it("should show loading state in refresh button when mutation is pending", () => {
      mockRefreshMutation.isPending = true;

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText("Odświeżanie...")).toBeInTheDocument();
    });

    it("should display error from mutation when refresh fails", () => {
      const errorMessage = "Rate limit exceeded";
      mockRefreshMutation.error = new Error(errorMessage);

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("should log error when refresh mutation throws", async () => {
      const user = userEvent.setup();
      const error = new Error("Network error");
      mockRefreshMutation.mutateAsync.mockRejectedValue(error);

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          "Błąd podczas odświeżania danych pogodowych",
          { error: "Network error", planId: "test-plan-id" }
        );
      });
    });

    it("should log unexpected error when refresh mutation throws non-Error", async () => {
      const user = userEvent.setup();
      mockRefreshMutation.mutateAsync.mockRejectedValue("String error");

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          "Nieoczekiwany błąd podczas odświeżania danych pogodowych",
          { error: "String error", planId: "test-plan-id" }
        );
      });
    });
  });

  describe("Date formatting", () => {
    it("should format last refresh date correctly in Polish locale", () => {
      const mockData = createMockWeatherData(12);
      const refreshDate = new Date("2024-03-20T14:45:00Z");
      mockData[0].last_refreshed_at = refreshDate.toISOString();

      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText(/20 marca 2024/i)).toBeInTheDocument();
    });

    it("should include time in last refresh date", () => {
      const mockData = createMockWeatherData(12);
      const refreshDate = new Date("2024-12-25T23:59:00Z");
      mockData[0].last_refreshed_at = refreshDate.toISOString();

      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      // Sprawdź, że data zawiera godzinę (format może się różnić w zależności od timezone)
      // Używamy bardziej elastycznego sprawdzenia - czy tekst zawiera "grudnia 2024" i godzinę
      const dateText = screen.getByText(/Ostatnie odświeżenie:/i);
      expect(dateText).toBeInTheDocument();
      // Sprawdź, że tekst zawiera godzinę (format: HH:MM)
      const parentElement = dateText.parentElement;
      expect(parentElement?.textContent).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty planId", () => {
      const props = {
        ...defaultProps,
        planId: "",
      };

      render(<WeatherTab {...props} />);

      expect(mockUseWeatherData).toHaveBeenCalledWith("");
    });

    it("should handle very long planId", () => {
      const longPlanId = "a".repeat(100);
      const props = {
        ...defaultProps,
        planId: longPlanId,
      };

      render(<WeatherTab {...props} />);

      expect(mockUseWeatherData).toHaveBeenCalledWith(longPlanId);
    });

    it("should handle data with only one month", () => {
      const mockData = createMockWeatherData(1);
      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByTestId("chart-data-count")).toHaveTextContent("1");
      expect(screen.getByTestId("table-data-count")).toHaveTextContent("1");
    });

    it("should handle data with all 12 months", () => {
      const mockData = createMockWeatherData(12);
      mockUseWeatherData.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
      });

      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByTestId("chart-data-count")).toHaveTextContent("12");
      expect(screen.getByTestId("table-data-count")).toHaveTextContent("12");
    });

    it("should handle refresh with different month counts", async () => {
      const user = userEvent.setup();
      mockRefreshMutation.mutateAsync.mockResolvedValue({
        refreshed: true,
        months: 6,
      });

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Dane pogodowe zaktualizowane", {
          description: "Pobrano dane dla 6 miesięcy",
        });
      });
    });
  });

  describe("Component structure", () => {
    it("should render with proper layout structure", () => {
      const { container } = render(<WeatherTab {...defaultProps} />);

      // Sprawdź główny kontener
      const mainContainer = container.querySelector(".space-y-6");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should render section headers correctly", () => {
      render(<WeatherTab {...defaultProps} />);

      expect(screen.getByText("Trend roczny")).toBeInTheDocument();
      expect(screen.getByText("Szczegółowe dane")).toBeInTheDocument();
    });

    it("should render refresh section with proper structure", () => {
      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveClass("w-full");
    });
  });

  describe("Integration with hooks", () => {
    it("should call useWeatherData with correct planId", () => {
      const planId = "custom-plan-id";
      const props = {
        ...defaultProps,
        planId,
      };

      render(<WeatherTab {...props} />);

      expect(mockUseWeatherData).toHaveBeenCalledWith(planId);
    });

    it("should use refresh mutation from useRefreshWeather hook", () => {
      render(<WeatherTab {...defaultProps} />);

      expect(mockUseRefreshWeather).toHaveBeenCalled();
    });

    it("should handle multiple refresh calls", async () => {
      const user = userEvent.setup();
      mockRefreshMutation.mutateAsync.mockResolvedValue({
        refreshed: true,
        months: 12,
      });

      render(<WeatherTab {...defaultProps} />);

      const refreshButton = screen.getByRole("button", { name: /odśwież dane pogodowe/i });

      // Kliknij kilka razy
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockRefreshMutation.mutateAsync).toHaveBeenCalledTimes(3);
      });
    });
  });
});

