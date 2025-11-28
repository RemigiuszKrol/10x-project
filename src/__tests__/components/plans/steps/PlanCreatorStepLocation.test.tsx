import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanCreatorStepLocation } from "@/components/plans/steps/PlanCreatorStepLocation";
import type { PlanLocationFormData, GeocodeResult } from "@/types";

// Mock hooka useGeocoding
const mockSearch = vi.fn();
const mockClearResults = vi.fn();
const mockClearError = vi.fn();

const mockUseGeocodingReturn = {
  results: [],
  isLoading: false,
  error: null,
  search: mockSearch,
  clearResults: mockClearResults,
  clearError: mockClearError,
};

vi.mock("@/lib/hooks/useGeocoding", () => ({
  useGeocoding: vi.fn(() => mockUseGeocodingReturn),
}));

// Mock komponentów lokalizacji
vi.mock("@/components/location/LocationSearch", () => ({
  LocationSearch: ({ onSearch, isLoading }: { onSearch: (query: string) => Promise<void>; isLoading: boolean }) => (
    <div data-testid="location-search">
      <input
        data-testid="location-search-input"
        placeholder="Wyszukaj adres"
        onChange={(e) => {
          if (e.target.value && e.target.value.length >= 3) {
            onSearch(e.target.value);
          }
        }}
      />
      {isLoading && <span data-testid="location-search-loading">Ładowanie...</span>}
    </div>
  ),
}));

vi.mock("@/components/location/LocationMap", () => ({
  LocationMap: ({
    onMarkerMove,
    markerPosition,
  }: {
    onMarkerMove: (position: { lat: number; lng: number }) => void;
    markerPosition?: { lat: number; lng: number };
  }) => (
    <div data-testid="location-map">
      {markerPosition && (
        <div data-testid="location-map-marker">
          Marker: {markerPosition.lat}, {markerPosition.lng}
        </div>
      )}
      <button data-testid="location-map-move-button" onClick={() => onMarkerMove({ lat: 52.2297, lng: 21.0122 })}>
        Przesuń marker
      </button>
    </div>
  ),
}));

vi.mock("@/components/location/LocationResultsList", () => ({
  LocationResultsList: ({
    results,
    onSelect,
  }: {
    results: GeocodeResult[];
    onSelect: (result: GeocodeResult) => void;
  }) => (
    <div data-testid="location-results-list">
      {results.map((result, index) => (
        <button key={index} data-testid={`location-result-${index}`} onClick={() => onSelect(result)}>
          {result.display_name}
        </button>
      ))}
    </div>
  ),
}));

describe("PlanCreatorStepLocation", () => {
  const defaultProps = {
    data: {} as PlanLocationFormData,
    onChange: vi.fn(),
    errors: {} as Partial<Record<keyof PlanLocationFormData, string>>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue(undefined);
    mockClearResults.mockImplementation(() => {
      // Mock implementation - no-op
    });
    mockClearError.mockImplementation(() => {
      // Mock implementation - no-op
    });
    // Reset mockUseGeocodingReturn do wartości domyślnych
    Object.assign(mockUseGeocodingReturn, {
      results: [],
      isLoading: false,
      error: null,
      search: mockSearch,
      clearResults: mockClearResults,
      clearError: mockClearError,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować nagłówek i opis", () => {
      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByText("Lokalizacja działki")).toBeInTheDocument();
      expect(screen.getByText(/Ustaw położenie geograficzne swojej działki/i)).toBeInTheDocument();
    });

    it("powinien renderować komponenty wyszukiwania i mapy", () => {
      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByTestId("location-search")).toBeInTheDocument();
      expect(screen.getByTestId("location-map")).toBeInTheDocument();
    });

    it("powinien renderować sekcję z wskazówkami", () => {
      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByText(/💡 Wskazówka/i)).toBeInTheDocument();
      expect(screen.getByText(/Użyj wyszukiwarki aby znaleźć adres swojej działki/i)).toBeInTheDocument();
    });
  });

  describe("Wyszukiwanie lokalizacji", () => {
    it("powinien wywołać search gdy użytkownik wpisze zapytanie", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepLocation {...defaultProps} />);

      const searchInput = screen.getByTestId("location-search-input");
      await user.type(searchInput, "Warszawa");

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith("Warszawa");
      });
    });

    it("powinien wyświetlić błąd geokodowania gdy wystąpi", async () => {
      const { useGeocoding } = await import("@/lib/hooks/useGeocoding");
      Object.assign(mockUseGeocodingReturn, {
        results: [],
        isLoading: false,
        error: "Nie udało się połączyć z usługą geokodowania",
      });
      vi.mocked(useGeocoding).mockReturnValue(mockUseGeocodingReturn);

      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByText("Nie udało się połączyć z usługą geokodowania")).toBeInTheDocument();
    });

    it("powinien wyświetlić listę wyników gdy są dostępne", async () => {
      const mockResults: GeocodeResult[] = [
        {
          lat: 52.2297,
          lon: 21.0122,
          display_name: "Warszawa, Polska",
          importance: 0.9,
        },
        {
          lat: 52.4064,
          lon: 16.9252,
          display_name: "Poznań, Polska",
          importance: 0.8,
        },
      ];

      const { useGeocoding } = await import("@/lib/hooks/useGeocoding");
      Object.assign(mockUseGeocodingReturn, {
        results: mockResults,
        isLoading: false,
        error: null,
      });
      vi.mocked(useGeocoding).mockReturnValue(mockUseGeocodingReturn);

      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByTestId("location-results-list")).toBeInTheDocument();
      expect(screen.getByTestId("location-result-0")).toBeInTheDocument();
      expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      expect(screen.getByTestId("location-result-1")).toBeInTheDocument();
      expect(screen.getByText("Poznań, Polska")).toBeInTheDocument();
    });

    it("powinien wyświetlić stan ładowania podczas wyszukiwania", async () => {
      const { useGeocoding } = await import("@/lib/hooks/useGeocoding");
      Object.assign(mockUseGeocodingReturn, {
        results: [],
        isLoading: true,
        error: null,
      });
      vi.mocked(useGeocoding).mockReturnValue(mockUseGeocodingReturn);

      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByTestId("location-search-loading")).toBeInTheDocument();
    });
  });

  describe("Wybór wyniku z listy", () => {
    it("powinien wywołać onChange z danymi lokalizacji gdy użytkownik wybierze wynik", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockResults: GeocodeResult[] = [
        {
          lat: 52.2297,
          lon: 21.0122,
          display_name: "Warszawa, Polska",
        },
      ];

      const { useGeocoding } = await import("@/lib/hooks/useGeocoding");
      Object.assign(mockUseGeocodingReturn, {
        results: mockResults,
        isLoading: false,
        error: null,
      });
      vi.mocked(useGeocoding).mockReturnValue(mockUseGeocodingReturn);

      render(<PlanCreatorStepLocation {...defaultProps} onChange={mockOnChange} />);

      const resultButton = screen.getByTestId("location-result-0");
      await user.click(resultButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        latitude: 52.2297,
        longitude: 21.0122,
        address: "Warszawa, Polska",
      });
      expect(mockClearResults).toHaveBeenCalled();
    });
  });

  describe("Ręczne ustawienie lokalizacji na mapie", () => {
    it("powinien wywołać onChange gdy marker zostanie przesunięty", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(<PlanCreatorStepLocation {...defaultProps} onChange={mockOnChange} />);

      const moveButton = screen.getByTestId("location-map-move-button");
      await user.click(moveButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        latitude: 52.2297,
        longitude: 21.0122,
        address: undefined,
      });
    });

    it("powinien wyświetlić marker na mapie gdy lokalizacja jest ustawiona", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 52.2297,
          longitude: 21.0122,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByTestId("location-map-marker")).toBeInTheDocument();
      expect(screen.getByText(/Marker: 52.2297, 21.0122/)).toBeInTheDocument();
    });

    it("nie powinien wyświetlać markera gdy lokalizacja nie jest ustawiona", () => {
      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.queryByTestId("location-map-marker")).not.toBeInTheDocument();
    });
  });

  describe("Wyświetlanie informacji o lokalizacji", () => {
    it("powinien wyświetlić informację o ustawionej lokalizacji z adresem", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 52.2297,
          longitude: 21.0122,
          address: "Warszawa, Polska",
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByText("Lokalizacja ustawiona")).toBeInTheDocument();
      expect(screen.getByText(/Adres:/)).toBeInTheDocument();
      expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      expect(screen.getByText(/Współrzędne:/)).toBeInTheDocument();
      expect(screen.getByText(/52.229700, 21.012200/)).toBeInTheDocument();
    });

    it("powinien wyświetlić informację o lokalizacji bez adresu gdy został ustawiony ręcznie", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 52.2297,
          longitude: 21.0122,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByText("Lokalizacja ustawiona")).toBeInTheDocument();
      expect(screen.getByText(/Współrzędne:/)).toBeInTheDocument();
      expect(screen.queryByText(/Adres:/)).not.toBeInTheDocument();
    });

    it("nie powinien wyświetlać informacji o lokalizacji gdy nie jest ustawiona", () => {
      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.queryByText("Lokalizacja ustawiona")).not.toBeInTheDocument();
    });
  });

  describe("Obsługa błędów walidacji", () => {
    it("powinien wyświetlić błąd walidacji dla latitude", () => {
      const props = {
        ...defaultProps,
        errors: {
          latitude: "Współrzędna szerokości geograficznej jest wymagana",
        },
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByText("Współrzędna szerokości geograficznej jest wymagana")).toBeInTheDocument();
    });

    it("powinien wyświetlić błąd walidacji dla longitude", () => {
      const props = {
        ...defaultProps,
        errors: {
          longitude: "Współrzędna długości geograficznej jest wymagana",
        },
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByText("Współrzędna długości geograficznej jest wymagana")).toBeInTheDocument();
    });

    it("powinien wyświetlić błąd dla latitude gdy oba błędy są obecne", () => {
      const props = {
        ...defaultProps,
        errors: {
          latitude: "Błąd latitude",
          longitude: "Błąd longitude",
        },
      };

      render(<PlanCreatorStepLocation {...props} />);

      // Powinien wyświetlić pierwszy dostępny błąd (latitude)
      expect(screen.getByText("Błąd latitude")).toBeInTheDocument();
    });
  });

  describe("Centrowanie mapy", () => {
    it("powinien użyć domyślnego centrum gdy lokalizacja nie jest ustawiona", () => {
      render(<PlanCreatorStepLocation {...defaultProps} />);

      // Mapa powinna być wyświetlona (domyślne centrum Warszawa)
      expect(screen.getByTestId("location-map")).toBeInTheDocument();
    });

    it("powinien użyć lokalizacji użytkownika jako centrum mapy gdy jest ustawiona", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 50.0647,
          longitude: 19.945,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByTestId("location-map")).toBeInTheDocument();
      expect(screen.getByTestId("location-map-marker")).toBeInTheDocument();
    });
  });

  describe("Integracja z komponentami", () => {
    it("powinien przekazać poprawne props do LocationSearch", () => {
      Object.assign(mockUseGeocodingReturn, {
        results: [],
        isLoading: false,
        error: null,
      });

      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByTestId("location-search")).toBeInTheDocument();
    });

    it("powinien przekazać poprawne props do LocationMap", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 52.2297,
          longitude: 21.0122,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByTestId("location-map")).toBeInTheDocument();
    });

    it("powinien przekazać poprawne props do LocationResultsList gdy są wyniki", async () => {
      const mockResults: GeocodeResult[] = [
        {
          lat: 52.2297,
          lon: 21.0122,
          display_name: "Warszawa, Polska",
        },
      ];

      const { useGeocoding } = await import("@/lib/hooks/useGeocoding");
      Object.assign(mockUseGeocodingReturn, {
        results: mockResults,
        isLoading: false,
        error: null,
      });
      vi.mocked(useGeocoding).mockReturnValue(mockUseGeocodingReturn);

      render(<PlanCreatorStepLocation {...defaultProps} />);

      expect(screen.getByTestId("location-results-list")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć przypadek gdy latitude jest 0", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 0,
          longitude: 0,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByTestId("location-map-marker")).toBeInTheDocument();
      expect(screen.getByText(/Marker: 0, 0/)).toBeInTheDocument();
    });

    it("powinien obsłużyć przypadek gdy tylko latitude jest ustawione", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 52.2297,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      // Lokalizacja nie jest uważana za ustawioną bez longitude
      expect(screen.queryByText("Lokalizacja ustawiona")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć przypadek gdy tylko longitude jest ustawione", () => {
      const props = {
        ...defaultProps,
        data: {
          longitude: 21.0122,
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      // Lokalizacja nie jest uważana za ustawioną bez latitude
      expect(screen.queryByText("Lokalizacja ustawiona")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć pusty obiekt errors", () => {
      render(<PlanCreatorStepLocation {...defaultProps} errors={{}} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć przypadek gdy address jest pustym stringiem", () => {
      const props = {
        ...defaultProps,
        data: {
          latitude: 52.2297,
          longitude: 21.0122,
          address: "",
        } as PlanLocationFormData,
      };

      render(<PlanCreatorStepLocation {...props} />);

      expect(screen.getByText("Lokalizacja ustawiona")).toBeInTheDocument();
      // Adres nie powinien być wyświetlany gdy jest pusty
      expect(screen.queryByText(/Adres:/)).not.toBeInTheDocument();
    });
  });
});
