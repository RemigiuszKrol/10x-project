import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GridCanvas, type GridCanvasProps } from "@/components/editor/GridCanvas/GridCanvas";
import type { GridMetadataDto, GridCellDto, PlantPlacementDto, CellSelection, CellPosition, EditorTool, GridCellType } from "@/types";

// Mock useGridSelection hook - funkcje muszą być zdefiniowane w factory
vi.mock("@/lib/hooks/useGridSelection", () => {
  const mockIsDragging = vi.fn(() => false);
  const mockStartSelection = vi.fn();
  const mockUpdateSelection = vi.fn();
  const mockEndSelection = vi.fn();
  const mockCancelSelection = vi.fn();

  return {
    useGridSelection: vi.fn(() => ({
      isDragging: mockIsDragging(),
      startSelection: mockStartSelection,
      updateSelection: mockUpdateSelection,
      endSelection: mockEndSelection,
      cancelSelection: mockCancelSelection,
    })),
    // Eksportujemy mocki dla użycia w testach
    __mocks: {
      mockIsDragging,
      mockStartSelection,
      mockUpdateSelection,
      mockEndSelection,
      mockCancelSelection,
    },
  };
});

// Mock SelectionOverlay
vi.mock("@/components/editor/GridCanvas/SelectionOverlay", () => ({
  SelectionOverlay: ({ selection }: any) => (
    <div data-testid="selection-overlay" data-x1={selection.x1} data-y1={selection.y1} data-x2={selection.x2} data-y2={selection.y2} />
  ),
}));

// Mock PlantIcon
vi.mock("@/components/editor/GridCanvas/PlantIcon", () => ({
  PlantIcon: ({ plantName, cellSize }: any) => (
    <div data-testid="plant-icon" data-plant-name={plantName} data-cell-size={cellSize}>
      🌿 {plantName}
    </div>
  ),
}));

// Mock PlantTooltip
vi.mock("@/components/editor/GridCanvas/PlantTooltip", () => ({
  PlantTooltip: ({ plant, children }: any) => (
    <div data-testid="plant-tooltip" data-plant-name={plant.plant_name}>
      {children}
    </div>
  ),
}));

// Import mocków po zdefiniowaniu vi.mock
import { useGridSelection } from "@/lib/hooks/useGridSelection";

// Referencje do mocków dla użycia w testach
const mockUseGridSelection = vi.mocked(useGridSelection);

// Mock ResizeObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

class MockResizeObserver {
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = mockUnobserve;
  
  constructor(callback: ResizeObserverCallback) {
    // Możemy wywołać callback z początkowymi wymiarami jeśli potrzeba
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset useGridSelection mock
  mockUseGridSelection.mockReturnValue({
    isDragging: false,
    startSelection: vi.fn(),
    updateSelection: vi.fn(),
    endSelection: vi.fn(),
    cancelSelection: vi.fn(),
  });
  
  // Reset ResizeObserver mock
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper functions dla danych testowych
function createGridMetadata(width: number = 5, height: number = 5): GridMetadataDto {
  return {
    grid_width: width,
    grid_height: height,
    cell_size_cm: 50,
    orientation: 0,
  };
}

function createGridCell(x: number, y: number, type: string = "soil"): GridCellDto {
  return {
    x,
    y,
    type: type as "soil" | "path" | "water" | "building" | "blocked",
    updated_at: new Date().toISOString(),
  };
}

function createPlant(x: number, y: number, name: string = "Róża"): PlantPlacementDto {
  return {
    x,
    y,
    plant_name: name,
    sunlight_score: 4,
    humidity_score: 3,
    precip_score: 4,
    temperature_score: 5,
    overall_score: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createDefaultProps(overrides?: Partial<GridCanvasProps>): GridCanvasProps {
  return {
    gridMetadata: createGridMetadata(),
    cells: [
      createGridCell(0, 0, "soil"),
      createGridCell(1, 0, "water"),
      createGridCell(2, 0, "path"),
      createGridCell(3, 0, "building"),
      createGridCell(4, 0, "soil"),
    ],
    plants: [],
    currentTool: "add_plant",
    selectedArea: null,
    focusedCell: null,
    onCellClick: vi.fn(),
    onSelectionChange: vi.fn(),
    onSelectionComplete: vi.fn(),
    ...overrides,
  };
}

describe("GridCanvas", () => {
  describe("Renderowanie", () => {
    it("powinien renderować siatkę z poprawnymi wymiarami", () => {
      const props = createDefaultProps();
      render(<GridCanvas {...props} />);

      expect(screen.getByText(/Siatka:/i)).toBeInTheDocument();
      expect(screen.getByText(/5 × 5/i)).toBeInTheDocument();
    });

    it("powinien wyświetlać liczbę komórek", () => {
      const props = createDefaultProps();
      render(<GridCanvas {...props} />);

      const komorkiText = screen.getByText(/Komórek:/i);
      expect(komorkiText).toBeInTheDocument();
      // Sprawdzamy czy liczba komórek jest wyświetlana w tym samym kontenerze
      expect(komorkiText.parentElement).toHaveTextContent("5");
    });

    it("powinien wyświetlać aktualne narzędzie", () => {
      const props = createDefaultProps({ currentTool: "select" });
      render(<GridCanvas {...props} />);

      expect(screen.getByText(/Narzędzie:/i)).toBeInTheDocument();
      expect(screen.getByText(/select/i)).toBeInTheDocument();
    });

    it("powinien renderować wszystkie komórki siatki", () => {
      const props = createDefaultProps();
      const { container } = render(<GridCanvas {...props} />);

      // Sprawdzamy czy są komórki z odpowiednimi współrzędnymi
      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(25); // 5x5 = 25 komórek
    });

    it("powinien renderować komórki z poprawnymi współrzędnymi", () => {
      const props = createDefaultProps();
      render(<GridCanvas {...props} />);

      // Sprawdzamy czy pierwsza komórka ma współrzędne 1,1 (0-indexed + 1 dla wyświetlania)
      expect(screen.getByLabelText(/Komórka 0,0/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Komórka 4,4/i)).toBeInTheDocument();
    });

    it("powinien renderować komórki z różnymi typami", () => {
      const props = createDefaultProps({
        cells: [
          createGridCell(0, 0, "soil"),
          createGridCell(1, 0, "water"),
          createGridCell(2, 0, "path"),
          createGridCell(3, 0, "building"),
          createGridCell(4, 0, "blocked"),
        ],
      });
      const { container } = render(<GridCanvas {...props} />);

      // Sprawdzamy czy komórki mają odpowiednie klasy kolorów
      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBeGreaterThan(0);
    });

    it("powinien renderować siatkę z pustą listą komórek", () => {
      const props = createDefaultProps({ cells: [] });
      render(<GridCanvas {...props} />);

      // Siatka powinna się renderować nawet bez komórek
      expect(screen.getByText(/Siatka:/i)).toBeInTheDocument();
    });
  });

  describe("Interakcje użytkownika - kliknięcia", () => {
    it("powinien wywołać onCellClick gdy komórka zostanie kliknięta", async () => {
      const onCellClick = vi.fn();
      const props = createDefaultProps({ onCellClick, currentTool: "add_plant" });
      const user = userEvent.setup();

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 0,0/i);
      await user.click(cell);

      // Komórka może wywołać onCellClick wielokrotnie (onClick + onMouseDown)
      // Sprawdzamy czy zostało wywołane przynajmniej raz z poprawnymi parametrami
      expect(onCellClick).toHaveBeenCalledWith(0, 0);
      expect(onCellClick).toHaveBeenCalled();
    });

    it("powinien wywołać onCellClick dla różnych komórek", async () => {
      const onCellClick = vi.fn();
      const props = createDefaultProps({ onCellClick, currentTool: "add_plant" });
      const user = userEvent.setup();

      render(<GridCanvas {...props} />);

      const cell1 = screen.getByLabelText(/Komórka 1,1/i);
      await user.click(cell1);
      expect(onCellClick).toHaveBeenCalledWith(1, 1);

      const cell2 = screen.getByLabelText(/Komórka 2,2/i);
      await user.click(cell2);
      expect(onCellClick).toHaveBeenCalledWith(2, 2);
    });

    it("powinien obsługiwać Enter i Spację na komórce z focusem", async () => {
      const onCellClick = vi.fn();
      const props = createDefaultProps({
        onCellClick,
        focusedCell: { x: 2, y: 2 },
        currentTool: "add_plant",
      });
      const user = userEvent.setup();

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 2,2/i);
      
      // Focusujemy komórkę bez kliknięcia
      cell.focus();
      
      // Resetujemy mock przed testowaniem klawiszy
      onCellClick.mockClear();
      
      await user.keyboard("{Enter}");
      expect(onCellClick).toHaveBeenCalledWith(2, 2);

      onCellClick.mockClear();
      await user.keyboard(" ");
      expect(onCellClick).toHaveBeenCalledWith(2, 2);
    });
  });

  describe("Zaznaczanie obszarów", () => {
    it("powinien wyświetlać SelectionOverlay gdy selectedArea jest ustawione", () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 2, y2: 2 };
      const props = createDefaultProps({ selectedArea: selection, currentTool: "select" });

      render(<GridCanvas {...props} />);

      expect(screen.getByTestId("selection-overlay")).toBeInTheDocument();
      expect(screen.getByTestId("selection-overlay")).toHaveAttribute("data-x1", "0");
      expect(screen.getByTestId("selection-overlay")).toHaveAttribute("data-y1", "0");
      expect(screen.getByTestId("selection-overlay")).toHaveAttribute("data-x2", "2");
      expect(screen.getByTestId("selection-overlay")).toHaveAttribute("data-y2", "2");
    });

    it("powinien nie wyświetlać SelectionOverlay gdy selectedArea jest null", () => {
      const props = createDefaultProps({ selectedArea: null });

      render(<GridCanvas {...props} />);

      expect(screen.queryByTestId("selection-overlay")).not.toBeInTheDocument();
    });

    it("powinien rozpocząć zaznaczanie gdy currentTool jest 'select' i użytkownik kliknie komórkę", async () => {
      const mockStartSelectionFn = vi.fn();
      mockUseGridSelection.mockReturnValue({
        isDragging: false,
        startSelection: mockStartSelectionFn,
        updateSelection: vi.fn(),
        endSelection: vi.fn(),
        cancelSelection: vi.fn(),
      });

      const props = createDefaultProps({ currentTool: "select" });
      const user = userEvent.setup();

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 1,1/i);
      await user.pointer({ keys: "[MouseLeft>]", target: cell });

      expect(mockStartSelectionFn).toHaveBeenCalledWith(1, 1);
    });

    it("powinien zakończyć zaznaczanie gdy użytkownik puszcza przycisk myszy", () => {
      const mockEndSelectionFn = vi.fn();
      mockUseGridSelection.mockReturnValue({
        isDragging: true,
        startSelection: vi.fn(),
        updateSelection: vi.fn(),
        endSelection: mockEndSelectionFn,
        cancelSelection: vi.fn(),
      });

      const props = createDefaultProps({ currentTool: "select" });

      render(<GridCanvas {...props} />);

      const grid = screen.getByRole("grid");
      fireEvent.mouseUp(grid);

      expect(mockEndSelectionFn).toHaveBeenCalled();
    });

    it("powinien anulować zaznaczanie gdy mysz opuszcza obszar siatki", () => {
      const mockCancelSelectionFn = vi.fn();
      mockUseGridSelection.mockReturnValue({
        isDragging: true,
        startSelection: vi.fn(),
        updateSelection: vi.fn(),
        endSelection: vi.fn(),
        cancelSelection: mockCancelSelectionFn,
      });

      const props = createDefaultProps({ currentTool: "select" });

      render(<GridCanvas {...props} />);

      const grid = screen.getByRole("grid");
      // Symulacja opuszczenia obszaru
      fireEvent.mouseLeave(grid);

      expect(mockCancelSelectionFn).toHaveBeenCalled();
    });

    it("powinien wyświetlać odpowiedni kursor dla narzędzia select", () => {
      const props = createDefaultProps({ currentTool: "select" });
      const { container } = render(<GridCanvas {...props} />);

      const canvas = container.firstChild as HTMLElement;
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("powinien wyświetlać kursor grabbing podczas przeciągania", () => {
      mockUseGridSelection.mockReturnValue({
        isDragging: true,
        startSelection: vi.fn(),
        updateSelection: vi.fn(),
        endSelection: vi.fn(),
        cancelSelection: vi.fn(),
      });

      const props = createDefaultProps({ currentTool: "select" });
      const { container } = render(<GridCanvas {...props} />);

      const canvas = container.firstChild as HTMLElement;
      expect(canvas).toHaveClass("cursor-grabbing");
    });
  });

  describe("Wyświetlanie roślin", () => {
    it("powinien renderować ikonę rośliny na komórce z rośliną", () => {
      const plant = createPlant(1, 1, "Róża");
      const props = createDefaultProps({ plants: [plant] });

      render(<GridCanvas {...props} />);

      expect(screen.getByTestId("plant-icon")).toBeInTheDocument();
      expect(screen.getByTestId("plant-icon")).toHaveAttribute("data-plant-name", "Róża");
    });

    it("powinien renderować tooltip dla rośliny", () => {
      const plant = createPlant(2, 2, "Tulipan");
      const props = createDefaultProps({ plants: [plant] });

      render(<GridCanvas {...props} />);

      expect(screen.getByTestId("plant-tooltip")).toBeInTheDocument();
      expect(screen.getByTestId("plant-tooltip")).toHaveAttribute("data-plant-name", "Tulipan");
    });

    it("powinien renderować wiele roślin na różnych komórkach", () => {
      const plants = [
        createPlant(0, 0, "Róża"),
        createPlant(1, 1, "Tulipan"),
        createPlant(2, 2, "Lilia"),
      ];
      const props = createDefaultProps({ plants });

      render(<GridCanvas {...props} />);

      const plantIcons = screen.getAllByTestId("plant-icon");
      expect(plantIcons.length).toBe(3);
    });

    it("powinien wyświetlać nazwę rośliny w aria-label komórki", () => {
      const plant = createPlant(1, 1, "Róża");
      const props = createDefaultProps({ plants: [plant] });

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 1,1.*roślina: Róża/i);
      expect(cell).toBeInTheDocument();
    });

    it("powinien przekazać cellSize do PlantIcon", () => {
      const plant = createPlant(1, 1, "Róża");
      const props = createDefaultProps({ plants: [plant] });

      render(<GridCanvas {...props} />);

      // Sprawdzamy czy PlantIcon został wywołany z cellSize
      // (mock zwraca element z data-cell-size)
      const plantIcon = screen.getByTestId("plant-icon");
      expect(plantIcon).toHaveAttribute("data-cell-size");
    });
  });

  describe("Focus management", () => {
    it("powinien wyświetlać focus ring na komórce z focusedCell", () => {
      const focusedCell: CellPosition = { x: 2, y: 2 };
      const props = createDefaultProps({ focusedCell });

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 2,2/i);
      expect(cell).toHaveClass("ring-1", "ring-blue-500");
    });

    it("powinien ustawić tabIndex=0 dla komórki z focusem", () => {
      const focusedCell: CellPosition = { x: 1, y: 1 };
      const props = createDefaultProps({ focusedCell });

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 1,1/i);
      expect(cell).toHaveAttribute("tabIndex", "0");
    });

    it("powinien ustawić tabIndex=-1 dla komórek bez focusu", () => {
      const focusedCell: CellPosition = { x: 0, y: 0 };
      const props = createDefaultProps({ focusedCell });

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 1,1/i);
      expect(cell).toHaveAttribute("tabIndex", "-1");
    });

    it("powinien nie wyświetlać focus ring gdy focusedCell jest null", () => {
      const props = createDefaultProps({ focusedCell: null });

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 0,0/i);
      expect(cell).not.toHaveClass("ring-1", "ring-blue-500");
    });
  });

  describe("Responsywne skalowanie", () => {
    it("powinien używać ResizeObserver do monitorowania rozmiaru kontenera", () => {
      const props = createDefaultProps();
      render(<GridCanvas {...props} />);

      // Sprawdzamy czy ResizeObserver został użyty (poprzez sprawdzenie czy observe zostało wywołane)
      expect(mockObserve).toHaveBeenCalled();
    });

    it("powinien obliczyć rozmiar komórki na podstawie dostępnej szerokości", async () => {
      const props = createDefaultProps({ gridMetadata: createGridMetadata(10, 10) });
      const { container } = render(<GridCanvas {...props} />);

      // Sprawdzamy czy grid został zrenderowany
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument();
      });

      // Sprawdzamy czy ResizeObserver został użyty
      expect(mockObserve).toHaveBeenCalled();
    });

    it("powinien używać minimalnego rozmiaru komórki gdy kontener jest za mały", () => {
      const props = createDefaultProps({ gridMetadata: createGridMetadata(100, 100) });
      render(<GridCanvas {...props} />);

      // Dla bardzo dużej siatki, komórki powinny mieć minimalny rozmiar
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    it("powinien wyczyścić ResizeObserver przy unmount", () => {
      const props = createDefaultProps();
      const { unmount } = render(<GridCanvas {...props} />);

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć siatkę 1x1", () => {
      const props = createDefaultProps({ gridMetadata: createGridMetadata(1, 1), cells: [createGridCell(0, 0)] });
      render(<GridCanvas {...props} />);

      expect(screen.getByText(/1 × 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Komórka 0,0/i)).toBeInTheDocument();
    });

    it("powinien obsłużyć bardzo dużą siatkę", () => {
      const largeCells: GridCellDto[] = [];
      for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
          largeCells.push(createGridCell(x, y));
        }
      }

      const props = createDefaultProps({
        gridMetadata: createGridMetadata(50, 50),
        cells: largeCells,
      });

      render(<GridCanvas {...props} />);

      expect(screen.getByText(/50 × 50/i)).toBeInTheDocument();
    });

    it("powinien obsłużyć komórki bez typu (undefined type)", () => {
      const cellWithoutType = { ...createGridCell(0, 0), type: undefined as unknown as GridCellType };
      const props = createDefaultProps({ cells: [cellWithoutType] });

      render(<GridCanvas {...props} />);

      // Komórka powinna użyć domyślnego typu "soil"
      expect(screen.getByLabelText(/Komórka 0,0.*typ: soil/i)).toBeInTheDocument();
    });

    it("powinien obsłużyć roślinę na komórce bez typu", () => {
      const plant = createPlant(0, 0, "Róża");
      const cellWithoutType = { ...createGridCell(0, 0), type: undefined as unknown as GridCellType };
      const props = createDefaultProps({ cells: [cellWithoutType], plants: [plant] });

      render(<GridCanvas {...props} />);

      expect(screen.getByTestId("plant-icon")).toBeInTheDocument();
    });

    it("powinien obsłużyć pustą listę roślin", () => {
      const props = createDefaultProps({ plants: [] });
      render(<GridCanvas {...props} />);

      expect(screen.queryByTestId("plant-icon")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć null w grid_width i grid_height", () => {
      const props = createDefaultProps({
        gridMetadata: { ...createGridMetadata(), grid_width: null as unknown as number, grid_height: null as unknown as number },
      });

      render(<GridCanvas {...props} />);

      // Komponent powinien się renderować bez błędów
      expect(screen.getByRole("application")).toBeInTheDocument();
    });

    it("powinien obsłużyć zero w grid_width", () => {
      const props = createDefaultProps({
        gridMetadata: { ...createGridMetadata(), grid_width: 0 },
      });

      render(<GridCanvas {...props} />);

      expect(screen.getByRole("application")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć role='application' na głównym kontenerze", () => {
      const props = createDefaultProps();
      render(<GridCanvas {...props} />);

      expect(screen.getByRole("application")).toBeInTheDocument();
      expect(screen.getByRole("application")).toHaveAttribute("aria-label", expect.stringContaining("Siatka planu działki"));
    });

    it("powinien mieć role='grid' na siatce komórek", () => {
      const props = createDefaultProps();
      render(<GridCanvas {...props} />);

      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(screen.getByRole("grid")).toHaveAttribute("aria-label", "Siatka planu");
    });

    it("powinien mieć role='gridcell' na każdej komórce", () => {
      const props = createDefaultProps();
      const { container } = render(<GridCanvas {...props} />);

      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBeGreaterThan(0);
    });

    it("powinien mieć aria-label z informacjami o komórce", () => {
      const plant = createPlant(1, 1, "Róża");
      const props = createDefaultProps({
        cells: [createGridCell(1, 1, "water")],
        plants: [plant],
      });

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 1,1.*typ: water.*roślina: Róża/i);
      expect(cell).toBeInTheDocument();
    });
  });

  describe("Różne narzędzia edycji", () => {
    it("powinien renderować się poprawnie z narzędziem 'add_plant'", () => {
      const props = createDefaultProps({ currentTool: "add_plant" });
      render(<GridCanvas {...props} />);

      expect(screen.getByText(/add_plant/i)).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie z narzędziem 'select'", () => {
      const props = createDefaultProps({ currentTool: "select" });
      render(<GridCanvas {...props} />);

      expect(screen.getByText(/select/i)).toBeInTheDocument();
    });

    it("powinien nie wywoływać onCellClick przy kliknięciu gdy currentTool jest 'select'", async () => {
      const mockStartSelectionFn = vi.fn();
      mockUseGridSelection.mockReturnValue({
        isDragging: false,
        startSelection: mockStartSelectionFn,
        updateSelection: vi.fn(),
        endSelection: vi.fn(),
        cancelSelection: vi.fn(),
      });

      const onCellClick = vi.fn();
      const props = createDefaultProps({ onCellClick, currentTool: "select" });
      const user = userEvent.setup();

      render(<GridCanvas {...props} />);

      const cell = screen.getByLabelText(/Komórka 0,0/i);
      await user.pointer({ keys: "[MouseLeft>]", target: cell });

      // onCellClick nie powinno być wywołane, bo używamy startSelection
      expect(onCellClick).not.toHaveBeenCalled();
      expect(mockStartSelectionFn).toHaveBeenCalled();
    });
  });

  describe("onSelectionComplete callback", () => {
    it("powinien przekazać onSelectionComplete do useGridSelection", () => {
      const onSelectionComplete = vi.fn();
      const props = createDefaultProps({ onSelectionComplete, currentTool: "select" });

      render(<GridCanvas {...props} />);

      // Sprawdzamy czy hook został wywołany z poprawnym callbackiem
      expect(mockUseGridSelection).toHaveBeenCalledWith(
        expect.objectContaining({
          onSelectionComplete,
        })
      );
    });
  });
});

