import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationResultsList } from "@/components/location/LocationResultsList";
import type { GeocodeResult } from "@/types";

describe("LocationResultsList", () => {
  // Fixtures - dane testowe
  const createMockResult = (overrides?: Partial<GeocodeResult>): GeocodeResult => ({
    lat: 52.2297,
    lon: 21.0122,
    display_name: "Warszawa, Polska",
    type: "city",
    importance: 0.9,
    ...overrides,
  });

  const mockResults: GeocodeResult[] = [
    createMockResult({
      lat: 52.2297,
      lon: 21.0122,
      display_name: "Warszawa, Polska",
      type: "city",
    }),
    createMockResult({
      lat: 50.0647,
      lon: 19.945,
      display_name: "Kraków, Małopolska, Polska",
      type: "city",
    }),
    createMockResult({
      lat: 51.1079,
      lon: 17.0385,
      display_name: "Wrocław, Dolnośląskie, Polska",
      type: "city",
    }),
  ];

  const defaultProps = {
    results: mockResults,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien zwrócić null gdy lista wyników jest pusta", () => {
      const { container } = render(<LocationResultsList results={[]} onSelect={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it("powinien renderować nagłówek z liczbą wyników", () => {
      render(<LocationResultsList {...defaultProps} />);
      expect(screen.getByText("Znalezione lokalizacje (3)")).toBeInTheDocument();
    });

    it("powinien renderować wszystkie wyniki z listy", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      expect(screen.getByText("Kraków, Małopolska, Polska")).toBeInTheDocument();
      expect(screen.getByText("Wrocław, Dolnośląskie, Polska")).toBeInTheDocument();
    });

    it("powinien renderować ikonę MapPin dla każdego wyniku", () => {
      const { container } = render(<LocationResultsList {...defaultProps} />);
      
      // MapPin jest renderowany jako SVG przez lucide-react
      // Sprawdzamy czy są SVG elementy z klasą zawierającą "map-pin"
      const svgIcons = container.querySelectorAll('svg.lucide-map-pin');
      expect(svgIcons.length).toBeGreaterThanOrEqual(3);
      
      // Sprawdzamy czy są przyciski "Wybierz" (każdy wynik ma przycisk)
      const buttons = screen.getAllByRole("button", { name: /wybierz/i });
      expect(buttons).toHaveLength(3);
    });

    it("powinien renderować współrzędne geograficzne dla każdego wyniku", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      expect(screen.getByText("52.229700, 21.012200")).toBeInTheDocument();
      expect(screen.getByText("50.064700, 19.945000")).toBeInTheDocument();
      expect(screen.getByText("51.107900, 17.038500")).toBeInTheDocument();
    });

    it("powinien renderować typ lokalizacji gdy jest dostępny", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      const typeBadges = screen.getAllByText("city");
      expect(typeBadges.length).toBeGreaterThan(0);
    });

    it("powinien renderować przycisk 'Wybierz' dla każdego wyniku", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      const buttons = screen.getAllByRole("button", { name: /wybierz/i });
      expect(buttons).toHaveLength(3);
    });

    it("powinien renderować pojedynczy wynik poprawnie", () => {
      const singleResult = [createMockResult()];
      render(<LocationResultsList results={singleResult} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Znalezione lokalizacje (1)")).toBeInTheDocument();
      expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /wybierz/i })).toBeInTheDocument();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onSelect z poprawnym wynikiem gdy użytkownik klika przycisk 'Wybierz'", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<LocationResultsList results={mockResults} onSelect={onSelect} />);
      
      const buttons = screen.getAllByRole("button", { name: /wybierz/i });
      await user.click(buttons[0]);
      
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
    });

    it("powinien wywołać onSelect z różnymi wynikami dla różnych przycisków", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<LocationResultsList results={mockResults} onSelect={onSelect} />);
      
      const buttons = screen.getAllByRole("button", { name: /wybierz/i });
      
      await user.click(buttons[0]);
      expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
      
      await user.click(buttons[1]);
      expect(onSelect).toHaveBeenCalledWith(mockResults[1]);
      
      await user.click(buttons[2]);
      expect(onSelect).toHaveBeenCalledWith(mockResults[2]);
      
      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it("powinien wywołać onSelect tylko raz przy pojedynczym kliknięciu", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<LocationResultsList results={[mockResults[0]]} onSelect={onSelect} />);
      
      const button = screen.getByRole("button", { name: /wybierz/i });
      await user.click(button);
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases i przypadki brzegowe", () => {
    it("powinien obsłużyć wynik bez typu lokalizacji", () => {
      const resultWithoutType = createMockResult({ type: undefined });
      render(<LocationResultsList results={[resultWithoutType]} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
      expect(screen.queryByText("city")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć wynik z bardzo długą nazwą", () => {
      const longNameResult = createMockResult({
        display_name: "Bardzo długa nazwa miejscowości z wieloma szczegółami, województwo, kraj, kontynent, planeta, układ słoneczny",
      });
      render(<LocationResultsList results={[longNameResult]} onSelect={vi.fn()} />);
      
      expect(screen.getByText(/Bardzo długa nazwa miejscowości/i)).toBeInTheDocument();
    });

    it("powinien obsłużyć wynik z bardzo długimi współrzędnymi", () => {
      const preciseResult = createMockResult({
        lat: 52.2297123456789,
        lon: 21.0122345678901,
      });
      render(<LocationResultsList results={[preciseResult]} onSelect={vi.fn()} />);
      
      // Współrzędne są formatowane do 6 miejsc po przecinku
      expect(screen.getByText("52.229712, 21.012235")).toBeInTheDocument();
    });

    it("powinien obsłużyć wynik z ujemnymi współrzędnymi (południowa półkula)", () => {
      const southernResult = createMockResult({
        lat: -33.8688,
        lon: 151.2093,
        display_name: "Sydney, Australia",
      });
      render(<LocationResultsList results={[southernResult]} onSelect={vi.fn()} />);
      
      expect(screen.getByText("-33.868800, 151.209300")).toBeInTheDocument();
    });

    it("powinien obsłużyć wynik z zerowymi współrzędnymi", () => {
      const zeroResult = createMockResult({
        lat: 0,
        lon: 0,
        display_name: "Null Island",
      });
      render(<LocationResultsList results={[zeroResult]} onSelect={vi.fn()} />);
      
      expect(screen.getByText("0.000000, 0.000000")).toBeInTheDocument();
    });

    it("powinien obsłużyć dużą liczbę wyników (10+)", () => {
      const manyResults = Array.from({ length: 15 }, (_, i) =>
        createMockResult({
          lat: 52.0 + i * 0.1,
          lon: 21.0 + i * 0.1,
          display_name: `Lokalizacja ${i + 1}`,
        })
      );
      render(<LocationResultsList results={manyResults} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Znalezione lokalizacje (15)")).toBeInTheDocument();
      expect(screen.getByText("Lokalizacja 1")).toBeInTheDocument();
      expect(screen.getByText("Lokalizacja 15")).toBeInTheDocument();
    });

    it("powinien obsłużyć wyniki z identycznymi współrzędnymi (różne nazwy)", () => {
      const duplicateCoords = [
        createMockResult({ lat: 52.2297, lon: 21.0122, display_name: "Warszawa Centrum" }),
        createMockResult({ lat: 52.2297, lon: 21.0122, display_name: "Warszawa Stare Miasto" }),
      ];
      render(<LocationResultsList results={duplicateCoords} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Warszawa Centrum")).toBeInTheDocument();
      expect(screen.getByText("Warszawa Stare Miasto")).toBeInTheDocument();
    });

    it("powinien obsłużyć wynik z pustą nazwą wyświetlaną", () => {
      const emptyNameResult = createMockResult({ display_name: "" });
      render(<LocationResultsList results={[emptyNameResult]} onSelect={vi.fn()} />);
      
      // Komponent powinien się renderować, nawet z pustą nazwą
      expect(screen.getByRole("button", { name: /wybierz/i })).toBeInTheDocument();
    });

    it("powinien obsłużyć wynik z różnymi typami lokalizacji", () => {
      const differentTypes = [
        createMockResult({ type: "city", display_name: "Miasto" }),
        createMockResult({ type: "village", display_name: "Wieś" }),
        createMockResult({ type: "administrative", display_name: "Administracyjne" }),
        createMockResult({ type: undefined, display_name: "Bez typu" }),
      ];
      render(<LocationResultsList results={differentTypes} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Miasto")).toBeInTheDocument();
      expect(screen.getByText("Wieś")).toBeInTheDocument();
      expect(screen.getByText("Administracyjne")).toBeInTheDocument();
      expect(screen.getByText("Bez typu")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć aria-label na przycisku 'Wybierz' z nazwą lokalizacji", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      const buttons = screen.getAllByRole("button");
      const firstButton = buttons.find((btn) =>
        btn.getAttribute("aria-label")?.includes("Warszawa, Polska")
      );
      
      expect(firstButton).toBeInTheDocument();
      expect(firstButton).toHaveAttribute("aria-label", "Wybierz lokalizację: Warszawa, Polska");
    });

    it("powinien mieć poprawne aria-label dla wszystkich przycisków", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      const buttons = screen.getAllByRole("button");
      
      expect(buttons[0]).toHaveAttribute("aria-label", "Wybierz lokalizację: Warszawa, Polska");
      expect(buttons[1]).toHaveAttribute("aria-label", "Wybierz lokalizację: Kraków, Małopolska, Polska");
      expect(buttons[2]).toHaveAttribute("aria-label", "Wybierz lokalizację: Wrocław, Dolnośląskie, Polska");
    });

    it("powinien mieć semantyczną strukturę HTML", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      // Nagłówek powinien być h3
      const heading = screen.getByText(/Znalezione lokalizacje/i);
      expect(heading.tagName).toBe("H3");
    });

    it("powinien mieć przyciski dostępne dla klawiatury", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });

  describe("Formatowanie danych", () => {
    it("powinien formatować współrzędne do 6 miejsc po przecinku", () => {
      const preciseResult = createMockResult({
        lat: 52.229712345,
        lon: 21.012234567,
      });
      render(<LocationResultsList results={[preciseResult]} onSelect={vi.fn()} />);
      
      expect(screen.getByText("52.229712, 21.012235")).toBeInTheDocument();
    });

    it("powinien wyświetlać współrzędne w formacie 'lat, lon'", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      // Sprawdzamy format dla pierwszego wyniku
      const coordsText = screen.getByText("52.229700, 21.012200");
      expect(coordsText).toBeInTheDocument();
    });

    it("powinien używać klasy font-mono dla współrzędnych", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      const coordsText = screen.getByText("52.229700, 21.012200");
      expect(coordsText).toHaveClass("font-mono");
    });
  });

  describe("Stylowanie i layout", () => {
    it("powinien renderować wyniki w kontenerze z odpowiednimi klasami", () => {
      const { container } = render(<LocationResultsList {...defaultProps} />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex", "flex-col", "gap-2");
    });

    it("powinien renderować każdy wynik w osobnym kontenerze z hover efektem", () => {
      const { container } = render(<LocationResultsList {...defaultProps} />);
      
      // Znajdujemy kontener wyniku (div z klasą hover:bg-gray-50)
      const resultContainers = container.querySelectorAll('.hover\\:bg-gray-50');
      expect(resultContainers.length).toBe(3);
      
      // Sprawdzamy czy pierwszy kontener ma odpowiednie klasy
      const firstContainer = resultContainers[0] as HTMLElement;
      expect(firstContainer).toHaveClass("hover:bg-gray-50", "dark:hover:bg-gray-900", "transition-colors");
    });

    it("powinien renderować badge typu lokalizacji z odpowiednimi klasami", () => {
      render(<LocationResultsList {...defaultProps} />);
      
      // Jest wiele elementów z tekstem "city", więc używamy getAllByText i sprawdzamy pierwszy
      const typeBadges = screen.getAllByText("city");
      expect(typeBadges.length).toBeGreaterThan(0);
      
      // Sprawdzamy czy pierwszy badge ma odpowiednie klasy
      const firstBadge = typeBadges[0];
      expect(firstBadge).toHaveClass("bg-primary/10", "text-primary", "rounded-full");
    });
  });

  describe("Props handling", () => {
    it("powinien zareagować na zmianę listy wyników", () => {
      const { rerender } = render(<LocationResultsList results={[mockResults[0]]} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Znalezione lokalizacje (1)")).toBeInTheDocument();
      
      rerender(<LocationResultsList results={mockResults} onSelect={vi.fn()} />);
      
      expect(screen.getByText("Znalezione lokalizacje (3)")).toBeInTheDocument();
    });

    it("powinien zareagować na zmianę callback onSelect", async () => {
      const user = userEvent.setup();
      const firstOnSelect = vi.fn();
      const { rerender } = render(<LocationResultsList results={mockResults} onSelect={firstOnSelect} />);
      
      const button = screen.getAllByRole("button", { name: /wybierz/i })[0];
      await user.click(button);
      
      expect(firstOnSelect).toHaveBeenCalledTimes(1);
      
      const secondOnSelect = vi.fn();
      rerender(<LocationResultsList results={mockResults} onSelect={secondOnSelect} />);
      
      await user.click(button);
      
      expect(firstOnSelect).toHaveBeenCalledTimes(1); // Nie powinien być wywołany ponownie
      expect(secondOnSelect).toHaveBeenCalledTimes(1); // Nowy callback powinien być wywołany
    });

    it("powinien obsłużyć przypadek gdy onSelect nie jest funkcją (edge case)", async () => {
      const user = userEvent.setup();
      // TypeScript nie pozwoli na to, ale testujemy runtime behavior
      const invalidOnSelect = null as unknown as (result: GeocodeResult) => void;
      
      // Komponent powinien się renderować, ale kliknięcie może rzucić błąd
      // W rzeczywistości TypeScript zapobiegnie temu, ale testujemy edge case
      expect(() => {
        render(<LocationResultsList results={mockResults} onSelect={invalidOnSelect} />);
      }).not.toThrow();
    });
  });

  describe("Klucze (keys) dla listy", () => {
    it("powinien używać unikalnych kluczy dla każdego wyniku", () => {
      const { container } = render(<LocationResultsList {...defaultProps} />);
      
      // React używa kluczy wewnętrznie, więc sprawdzamy czy wszystkie elementy są renderowane
      const buttons = screen.getAllByRole("button", { name: /wybierz/i });
      expect(buttons).toHaveLength(3);
      
      // Sprawdzamy czy każdy wynik ma unikalną nazwę
      const names = ["Warszawa, Polska", "Kraków, Małopolska, Polska", "Wrocław, Dolnośląskie, Polska"];
      names.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it("powinien obsłużyć wyniki z identycznymi współrzędnymi używając index w kluczu", () => {
      const duplicateCoords = [
        createMockResult({ lat: 52.2297, lon: 21.0122, display_name: "Wynik 1" }),
        createMockResult({ lat: 52.2297, lon: 21.0122, display_name: "Wynik 2" }),
        createMockResult({ lat: 52.2297, lon: 21.0122, display_name: "Wynik 3" }),
      ];
      
      render(<LocationResultsList results={duplicateCoords} onSelect={vi.fn()} />);
      
      // Wszystkie wyniki powinny być renderowane, nawet z identycznymi współrzędnymi
      expect(screen.getByText("Wynik 1")).toBeInTheDocument();
      expect(screen.getByText("Wynik 2")).toBeInTheDocument();
      expect(screen.getByText("Wynik 3")).toBeInTheDocument();
    });
  });
});

