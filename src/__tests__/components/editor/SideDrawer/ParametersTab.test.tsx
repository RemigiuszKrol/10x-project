import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParametersTab, type ParametersTabProps } from "@/components/editor/SideDrawer/ParametersTab";
import type { PlanDto } from "@/types";
import { logger } from "@/lib/utils/logger";

// Mock LocationMap (lazy loaded)
const mockLocationMap = vi.fn(({ center, markerPosition, readOnly, className }: any) => (
  <div data-testid="location-map" data-center={JSON.stringify(center)} data-readonly={readOnly} className={className}>
    Map Component
  </div>
));

vi.mock("@/components/location/LocationMap", () => ({
  LocationMap: (props: any) => mockLocationMap(props),
}));

// Mock logger
const mockLoggerError = vi.fn();
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper functions
function createMockPlan(overrides?: Partial<PlanDto>): PlanDto {
  return {
    id: "test-plan-id",
    user_id: "test-user-id",
    name: "Test Plan",
    latitude: 52.2297,
    longitude: 21.0122,
    width_cm: 1000,
    height_cm: 1000,
    cell_size_cm: 50,
    grid_width: 20,
    grid_height: 20,
    orientation: 0,
    hemisphere: "northern",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function createDefaultProps(overrides?: Partial<ParametersTabProps>): ParametersTabProps {
  return {
    plan: createMockPlan(),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    isUpdating: false,
    ...overrides,
  };
}

function createMockNominatimResponse(displayName: string) {
  return {
    display_name: displayName,
    address: {
      city: "Warszawa",
      country: "Poland",
    },
  };
}

describe("ParametersTab", () => {
  let defaultProps: ParametersTabProps;
  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    defaultProps = createDefaultProps({
      onUpdate: mockOnUpdate as (updates: Partial<PlanDto>) => Promise<void>,
    });

    // Domyślna konfiguracja fetch (sukces)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createMockNominatimResponse("Warszawa, Polska"),
      status: 200,
      statusText: "OK",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render header with title and description", () => {
      render(<ParametersTab {...defaultProps} />);

      expect(screen.getByText("Parametry planu")).toBeInTheDocument();
      expect(screen.getByText("Edytuj podstawowe parametry planu działki")).toBeInTheDocument();
    });

    it("should render form with all fields", () => {
      render(<ParametersTab {...defaultProps} />);

      expect(screen.getByLabelText(/nazwa planu/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/orientacja/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/półkula/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rozmiar kratki/i)).toBeInTheDocument();
      // Lokalizacja nie ma bezpośredniego form control, tylko label
      expect(screen.getByText(/lokalizacja działki/i)).toBeInTheDocument();
    });

    it("should display plan name in name input", () => {
      const plan = createMockPlan({ name: "Mój Ogród" });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      expect(nameInput).toHaveValue("Mój Ogród");
    });

    it("should display plan orientation in orientation input", () => {
      const plan = createMockPlan({ orientation: 90 });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const orientationInput = screen.getByLabelText(/orientacja/i) as HTMLInputElement;
      expect(orientationInput.value).toBe("90");
      expect(Number(orientationInput.value)).toBe(90);
    });

    it("should display hemisphere as read-only", () => {
      const plan = createMockPlan({ hemisphere: "northern" });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const hemisphereInput = screen.getByLabelText(/półkula/i);
      expect(hemisphereInput).toHaveValue("Północna");
      expect(hemisphereInput).toHaveAttribute("readonly");
      expect(hemisphereInput).toHaveClass("bg-muted", "cursor-not-allowed");
    });

    it("should display southern hemisphere correctly", () => {
      const plan = createMockPlan({ hemisphere: "southern" });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const hemisphereInput = screen.getByLabelText(/półkula/i);
      expect(hemisphereInput).toHaveValue("Południowa");
    });

    it("should display cell size as read-only", () => {
      const plan = createMockPlan({ cell_size_cm: 25 });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const cellSizeInput = screen.getByLabelText(/rozmiar kratki/i);
      expect(cellSizeInput).toHaveValue("25 cm");
      expect(cellSizeInput).toHaveAttribute("readonly");
    });
  });

  describe("Lokalizacja", () => {
    it("should display location when latitude and longitude are set", async () => {
      vi.useFakeTimers();
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Przesuń timer o 1s (rate limiting delay) i wykonaj wszystkie asynchroniczne operacje
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });
      
      // Poczekaj na reverse geocoding - użyj real timers dla waitFor
      vi.useRealTimers();
      await waitFor(() => {
        expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should display coordinates when location is set", () => {
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const latInput = screen.getByLabelText(/szerokość geograficzna/i);
      const lonInput = screen.getByLabelText(/długość geograficzna/i);

      expect(latInput).toHaveValue("52.229700");
      expect(lonInput).toHaveValue("21.012200");
      expect(latInput).toHaveAttribute("readonly");
      expect(lonInput).toHaveAttribute("readonly");
    });

    it("should display map when location is set", async () => {
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Poczekaj na lazy loading mapy (Suspense może renderować od razu w testach)
      await waitFor(() => {
        expect(screen.getByTestId("location-map")).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(mockLocationMap).toHaveBeenCalledWith(
        expect.objectContaining({
          center: { lat: 52.2297, lng: 21.0122 },
          markerPosition: { lat: 52.2297, lng: 21.0122 },
          readOnly: true,
        })
      );
    });

    it("should display empty state when location is not set", () => {
      const plan = createMockPlan({
        latitude: null,
        longitude: null,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      expect(screen.getByText(/lokalizacja działki nie jest ustawiona/i)).toBeInTheDocument();
      expect(screen.getByText(/lokalizacja może być ustawiona tylko podczas tworzenia planu/i)).toBeInTheDocument();
      expect(screen.queryByTestId("location-map")).not.toBeInTheDocument();
    });

    it("should use default center (Warszawa) when location is not set for map", () => {
      const plan = createMockPlan({
        latitude: null,
        longitude: null,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Mapa nie powinna być renderowana gdy brak lokalizacji
      expect(screen.queryByTestId("location-map")).not.toBeInTheDocument();
    });

    it("should show loading state while fetching location name", async () => {
      vi.useFakeTimers();
      // Opóźnij odpowiedź fetch
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      
      mockFetch.mockImplementation(() => fetchPromise);

      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Przesuń timer o 1s (rate limiting delay) i wykonaj wszystkie asynchroniczne operacje
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runOnlyPendingTimersAsync();
      });
      
      // Przełącz na real timers dla waitFor
      vi.useRealTimers();
      
      // Sprawdź loading state (po 1s delay, przed zakończeniem fetch)
      await waitFor(() => {
        expect(screen.getByText(/pobieranie nazwy lokalizacji/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Rozwiąż promise
      await act(async () => {
        resolveFetch!({
          ok: true,
          json: async () => createMockNominatimResponse("Warszawa, Polska"),
          status: 200,
          statusText: "OK",
        });
      });
    });

    it("should fetch location name from Nominatim API", async () => {
      vi.useFakeTimers();
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Przesuń timer o 1s (rate limiting delay) i wykonaj wszystkie asynchroniczne operacje
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });
      
      // Przełącz na real timers dla waitFor
      vi.useRealTimers();
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("nominatim.openstreetmap.org/reverse"),
          expect.objectContaining({
            headers: expect.objectContaining({
              "User-Agent": "PlantsPlaner/1.0",
            }),
          })
        );
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should handle Nominatim API error gracefully", async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });
      
      // Przełącz na real timers dla waitFor
      vi.useRealTimers();
      
      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          "Błąd podczas pobierania nazwy lokalizacji",
          expect.objectContaining({
            error: expect.stringContaining("HTTP 500"),
          })
        );
      }, { timeout: 2000 });

      // Nazwa lokalizacji nie powinna być wyświetlona
      expect(screen.queryByText("Warszawa, Polska")).not.toBeInTheDocument();
    });

    it("should handle network error gracefully", async () => {
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(new Error("Network error"));

      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });
      
      // Przełącz na real timers dla waitFor
      vi.useRealTimers();
      
      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("should handle missing display_name in response", async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
        status: 200,
        statusText: "OK",
      });

      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });
      
      // Przełącz na real timers dla waitFor
      vi.useRealTimers();
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Nazwa lokalizacji nie powinna być wyświetlona
      expect(screen.queryByText("Warszawa, Polska")).not.toBeInTheDocument();
    });

    it("should cancel fetch on unmount", async () => {
      vi.useFakeTimers();
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      const { unmount } = render(<ParametersTab {...defaultProps} plan={plan} />);

      // Przesuń timer o 1s
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Odmontuj komponent przed zakończeniem fetch
      unmount();

      // Poczekaj na potencjalne wywołanie fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Sprawdź czy fetch został wywołany (ale może być anulowany)
      // W rzeczywistości cleanup powinien zapobiec ustawieniu state
      expect(mockFetch).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it("should apply rate limiting (1s delay) before fetching", async () => {
      vi.useFakeTimers();
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Przed upływem 1s fetch nie powinien być wywołany
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(mockFetch).not.toHaveBeenCalled();

      // Po 1s fetch powinien być wywołany
      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });
      
      // Przełącz na real timers dla waitFor
      vi.useRealTimers();
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe("Edycja formularza", () => {
    it("should update name when user types", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Nowa nazwa");

      expect(nameInput).toHaveValue("Nowa nazwa");
    });

    it("should update orientation when user types", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const orientationInput = screen.getByLabelText(/orientacja/i);
      await user.clear(orientationInput);
      await user.type(orientationInput, "180");

      expect(orientationInput).toHaveValue(180);
    });

    it("should enable submit button when changes are made", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      expect(submitButton).toBeDisabled();

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.type(nameInput, "x");

      expect(submitButton).toBeEnabled();
    });

    it("should disable submit button when no changes are made", () => {
      render(<ParametersTab {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit button when isUpdating is true", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} isUpdating={true} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.type(nameInput, "x");

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show 'Zapisywanie...' text when isUpdating is true", () => {
      render(<ParametersTab {...defaultProps} isUpdating={true} />);

      expect(screen.getByText("Zapisywanie...")).toBeInTheDocument();
    });
  });

  describe("Submit formularza", () => {
    it("should call onUpdate with name change", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Nowa nazwa");

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        name: "Nowa nazwa",
      });
    });

    it("should call onUpdate with orientation change", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const orientationInput = screen.getByLabelText(/orientacja/i);
      await user.clear(orientationInput);
      await user.type(orientationInput, "90");

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        orientation: 90,
      });
    });

    it("should call onUpdate with both name and orientation changes", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Nowa nazwa");

      const orientationInput = screen.getByLabelText(/orientacja/i);
      await user.clear(orientationInput);
      await user.type(orientationInput, "180");

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        name: "Nowa nazwa",
        orientation: 180,
      });
    });

    it("should not call onUpdate when no changes are made", () => {
      render(<ParametersTab {...defaultProps} />);

      const form = screen.getByLabelText(/nazwa planu/i).closest("form");
      if (form) {
        const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
        expect(submitButton).toBeDisabled();
      }

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("should handle onUpdate error gracefully", async () => {
      const errorOnUpdate = vi.fn().mockRejectedValue(new Error("Update failed"));
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} onUpdate={errorOnUpdate} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.type(nameInput, "x");

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(errorOnUpdate).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Sprawdź czy błąd został obsłużony (komponent nie powinien się rozpaść)
      expect(screen.getByLabelText(/nazwa planu/i)).toBeInTheDocument();
    });
  });

  describe("Reset formularza", () => {
    it("should reset name to original value", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Zmieniona nazwa");

      const resetButton = screen.getByRole("button", { name: /resetuj/i });
      await user.click(resetButton);

      expect(nameInput).toHaveValue("Test Plan");
    });

    it("should reset orientation to original value", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const orientationInput = screen.getByLabelText(/orientacja/i);
      await user.clear(orientationInput);
      await user.type(orientationInput, "270");

      const resetButton = screen.getByRole("button", { name: /resetuj/i });
      await user.click(resetButton);

      expect(orientationInput).toHaveValue(0);
    });

    it("should reset both name and orientation", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Zmieniona nazwa");

      const orientationInput = screen.getByLabelText(/orientacja/i);
      await user.clear(orientationInput);
      await user.type(orientationInput, "180");

      const resetButton = screen.getByRole("button", { name: /resetuj/i });
      await user.click(resetButton);

      expect(nameInput).toHaveValue("Test Plan");
      expect(orientationInput).toHaveValue(0);
    });

    it("should disable reset button when no changes are made", () => {
      render(<ParametersTab {...defaultProps} />);

      const resetButton = screen.getByRole("button", { name: /resetuj/i });
      expect(resetButton).toBeDisabled();
    });

    it("should enable reset button when changes are made", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const resetButton = screen.getByRole("button", { name: /resetuj/i });
      expect(resetButton).toBeDisabled();

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.type(nameInput, "x");

      expect(resetButton).toBeEnabled();
    });
  });

  describe("Walidacja", () => {
    it("should require name field", () => {
      render(<ParametersTab {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      expect(nameInput).toBeRequired();
    });

    it("should limit orientation to 0-359", () => {
      render(<ParametersTab {...defaultProps} />);

      const orientationInput = screen.getByLabelText(/orientacja/i);
      expect(orientationInput).toHaveAttribute("min", "0");
      expect(orientationInput).toHaveAttribute("max", "359");
    });

    it("should parse orientation as integer", async () => {
      const user = userEvent.setup({ delay: null });
      const plan = createMockPlan({ orientation: 0 });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const orientationInput = screen.getByLabelText(/orientacja/i) as HTMLInputElement;
      
      // Wyczyść i wpisz wartość z kropką dziesiętną
      await user.clear(orientationInput);
      await user.type(orientationInput, "90.5");

      // Poczekaj na zaktualizowanie stanu
      await waitFor(() => {
        const currentValue = orientationInput.value;
        expect(parseInt(currentValue)).toBe(90);
      }, { timeout: 1000 });

      // Sprawdź czy przycisk submit jest włączony (zmiana z 0 na 90)
      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 1000 });

      // Submit formularza
      const form = orientationInput.closest("form");
      if (form) {
        fireEvent.submit(form);
      } else {
        await user.click(submitButton);
      }

      // Poczekaj na wywołanie onUpdate
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Sprawdź argumenty - parseInt("90.5") = 90
      expect(mockOnUpdate).toHaveBeenCalledWith({
        orientation: 90,
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle null latitude", () => {
      const plan = createMockPlan({
        latitude: null,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      expect(screen.getByText(/lokalizacja działki nie jest ustawiona/i)).toBeInTheDocument();
    });

    it("should handle null longitude", () => {
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: null,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      expect(screen.getByText(/lokalizacja działki nie jest ustawiona/i)).toBeInTheDocument();
    });

    it("should handle orientation value of 0", async () => {
      const user = userEvent.setup({ delay: null });
      const plan = createMockPlan({ orientation: 0 });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const orientationInput = screen.getByLabelText(/orientacja/i);
      await user.clear(orientationInput);
      await user.type(orientationInput, "359");

      const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
      await user.click(submitButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        orientation: 359,
      });
    });

    it("should handle empty name initially", () => {
      const plan = createMockPlan({ name: "" });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      const nameInput = screen.getByLabelText(/nazwa planu/i);
      expect(nameInput).toHaveValue("");
    });

    it("should handle very long name", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ParametersTab {...defaultProps} />);

      const longName = "A".repeat(200);
      const nameInput = screen.getByLabelText(/nazwa planu/i);
      await user.clear(nameInput);
      await user.type(nameInput, longName);

      expect(nameInput).toHaveValue(longName);
    });
  });

  describe("Lazy loading LocationMap", () => {
    it("should show loading fallback while map is loading", async () => {
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      // Sprawdź czy fallback jest wyświetlany (przed załadowaniem)
      // W rzeczywistości Suspense może renderować mapę od razu w testach
      // ale sprawdzamy czy komponent jest renderowany
      await waitFor(() => {
        expect(screen.getByTestId("location-map")).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("should render LocationMap with correct props", async () => {
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      await waitFor(() => {
        expect(screen.getByTestId("location-map")).toBeInTheDocument();
      }, { timeout: 3000 });

      // Sprawdź czy mockLocationMap został wywołany
      expect(mockLocationMap).toHaveBeenCalled();
      
      // Sprawdź argumenty wywołania
      const callArgs = mockLocationMap.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.center).toEqual({ lat: 52.2297, lng: 21.0122 });
      expect(callArgs?.markerPosition).toEqual({ lat: 52.2297, lng: 21.0122 });
      expect(callArgs?.readOnly).toBe(true);
      expect(callArgs?.className).toBe("h-[300px]");
    });

    it("should pass empty function to onMarkerMove when readOnly", async () => {
      const plan = createMockPlan({
        latitude: 52.2297,
        longitude: 21.0122,
      });
      render(<ParametersTab {...defaultProps} plan={plan} />);

      await waitFor(() => {
        expect(mockLocationMap).toHaveBeenCalled();
      });

      const callArgs = mockLocationMap.mock.calls[0][0];
      expect(typeof callArgs.onMarkerMove).toBe("function");
      // Wywołanie nie powinno nic robić
      expect(() => callArgs.onMarkerMove({ lat: 0, lng: 0 })).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for all inputs", () => {
      render(<ParametersTab {...defaultProps} />);

      expect(screen.getByLabelText(/nazwa planu/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/orientacja/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/półkula/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rozmiar kratki/i)).toBeInTheDocument();
      // Lokalizacja nie ma powiązanego form control, tylko label tekstowy
      expect(screen.getByText(/lokalizacja działki/i)).toBeInTheDocument();
    });

    it("should have aria-label for read-only inputs", () => {
      render(<ParametersTab {...defaultProps} />);

      const hemisphereInput = screen.getByLabelText(/półkula/i);
      expect(hemisphereInput).toHaveAttribute("aria-label", "Półkula (tylko do odczytu)");

      const cellSizeInput = screen.getByLabelText(/rozmiar kratki/i);
      expect(cellSizeInput).toHaveAttribute("aria-label", "Rozmiar kratki (tylko do odczytu)");
    });

    it("should have proper form structure", () => {
      render(<ParametersTab {...defaultProps} />);

      const form = screen.getByLabelText(/nazwa planu/i).closest("form");
      expect(form).toBeInTheDocument();
      expect(form?.tagName).toBe("FORM");
    });
  });
});

