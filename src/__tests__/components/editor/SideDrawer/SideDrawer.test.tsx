import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SideDrawer, type SideDrawerProps } from "@/components/editor/SideDrawer/SideDrawer";
import type { DrawerTab, PlanDto, CellPosition, GridCellType } from "@/types";

// Mock komponentów potomnych
vi.mock("@/components/editor/SideDrawer/ParametersTab", () => ({
  ParametersTab: ({ plan, onUpdate, isUpdating }: any) => (
    <div data-testid="parameters-tab">
      <div data-testid="parameters-plan-id">{plan.id}</div>
      <div data-testid="parameters-plan-name">{plan.name}</div>
      <div data-testid="parameters-is-updating">{String(isUpdating ?? false)}</div>
      <button
        data-testid="parameters-update-button"
        onClick={() => onUpdate({ name: "Updated Plan Name" })}
      >
        Update Plan
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/SideDrawer/PlantsTab", () => ({
  PlantsTab: ({
    planId,
    selectedCell,
    cellType,
    onPlantAdded,
    onPlantRemoved,
    onJumpToCell,
  }: any) => (
    <div data-testid="plants-tab">
      <div data-testid="plants-plan-id">{planId}</div>
      {selectedCell && (
        <div data-testid="plants-selected-cell">
          {selectedCell.x},{selectedCell.y}
        </div>
      )}
      {cellType && <div data-testid="plants-cell-type">{cellType}</div>}
      <button
        data-testid="plants-add-button"
        onClick={() => onPlantAdded?.("Test Plant", 5, 10)}
      >
        Add Plant
      </button>
      <button
        data-testid="plants-remove-button"
        onClick={() => onPlantRemoved?.("Test Plant", 5, 10)}
      >
        Remove Plant
      </button>
      <button
        data-testid="plants-jump-button"
        onClick={() => onJumpToCell?.(15, 20)}
      >
        Jump to Cell
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/SideDrawer/WeatherTab", () => ({
  WeatherTab: ({ planId }: any) => (
    <div data-testid="weather-tab">
      <div data-testid="weather-plan-id">{planId}</div>
    </div>
  ),
}));

// Helper function do tworzenia mock PlanDto
function createMockPlan(overrides?: Partial<PlanDto>): PlanDto {
  return {
    id: "plan-123",
    user_id: "user-456",
    name: "Test Plan",
    latitude: 52.2297,
    longitude: 21.0122,
    width_cm: 1000,
    height_cm: 800,
    cell_size_cm: 25,
    grid_width: 40,
    grid_height: 32,
    orientation: 0,
    hemisphere: "northern",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// Helper function do tworzenia mock CellPosition
function createMockCellPosition(x: number, y: number): CellPosition {
  return { x, y };
}

describe("SideDrawer", () => {
  let defaultProps: SideDrawerProps;
  let mockOnTabChange: ReturnType<typeof vi.fn>;
  let mockOnUpdatePlan: ReturnType<typeof vi.fn>;
  let mockOnPlantAdded: ReturnType<typeof vi.fn>;
  let mockOnPlantRemoved: ReturnType<typeof vi.fn>;
  let mockOnJumpToCell: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnTabChange = vi.fn();
    mockOnUpdatePlan = vi.fn().mockResolvedValue(undefined);
    mockOnPlantAdded = vi.fn();
    mockOnPlantRemoved = vi.fn();
    mockOnJumpToCell = vi.fn();

    defaultProps = {
      activeTab: "parameters",
      onTabChange: mockOnTabChange as (tab: DrawerTab) => void,
      plan: createMockPlan(),
      onUpdatePlan: mockOnUpdatePlan as (updates: Partial<PlanDto>) => Promise<void>,
      isUpdatingPlan: false,
      selectedCell: null,
      cellType: null,
      onPlantAdded: mockOnPlantAdded as (plantName: string, x: number, y: number) => void,
      onPlantRemoved: mockOnPlantRemoved as (plantName: string, x: number, y: number) => void,
      onJumpToCell: mockOnJumpToCell as (x: number, y: number) => void,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować się poprawnie z domyślnymi props", () => {
      render(<SideDrawer {...defaultProps} />);

      // Sprawdź czy wszystkie zakładki są widoczne w nagłówku
      expect(screen.getByText("Parametry")).toBeInTheDocument();
      expect(screen.getByText("Rośliny")).toBeInTheDocument();
      expect(screen.getByText("Pogoda")).toBeInTheDocument();
    });

    it("powinien renderować zakładkę Parametry jako aktywną domyślnie", () => {
      render(<SideDrawer {...defaultProps} activeTab="parameters" />);

      expect(screen.getByTestId("parameters-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("plants-tab")).not.toBeInTheDocument();
      expect(screen.queryByTestId("weather-tab")).not.toBeInTheDocument();
    });

    it("powinien renderować zakładkę Rośliny gdy activeTab='plants'", () => {
      render(<SideDrawer {...defaultProps} activeTab="plants" />);

      expect(screen.getByTestId("plants-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("parameters-tab")).not.toBeInTheDocument();
      expect(screen.queryByTestId("weather-tab")).not.toBeInTheDocument();
    });

    it("powinien renderować zakładkę Pogoda gdy activeTab='weather'", () => {
      render(<SideDrawer {...defaultProps} activeTab="weather" />);

      expect(screen.getByTestId("weather-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("parameters-tab")).not.toBeInTheDocument();
      expect(screen.queryByTestId("plants-tab")).not.toBeInTheDocument();
    });

    it("powinien renderować ikony w nagłówkach zakładek", () => {
      render(<SideDrawer {...defaultProps} />);

      // Ikony są renderowane przez lucide-react, sprawdzamy czy zakładki są widoczne
      const parametersTab = screen.getByText("Parametry").closest("button");
      const plantsTab = screen.getByText("Rośliny").closest("button");
      const weatherTab = screen.getByText("Pogoda").closest("button");

      expect(parametersTab).toBeInTheDocument();
      expect(plantsTab).toBeInTheDocument();
      expect(weatherTab).toBeInTheDocument();
    });
  });

  describe("Przełączanie zakładek", () => {
    it("powinien wywołać onTabChange gdy użytkownik kliknie zakładkę Rośliny", async () => {
      const user = userEvent.setup();
      mockOnTabChange.mockClear(); // Wyczyść wywołania z poprzednich testów
      render(<SideDrawer {...defaultProps} activeTab="parameters" />);

      const plantsTab = screen.getByText("Rośliny").closest("button");
      expect(plantsTab).toBeInTheDocument();

      await user.click(plantsTab!);

      // Sprawdź czy zostało wywołane z odpowiednią wartością (może być wywołane więcej razy przez Tabs)
      expect(mockOnTabChange).toHaveBeenCalledWith("plants");
      expect(mockOnTabChange).toHaveBeenCalled();
    });

    it("powinien wywołać onTabChange gdy użytkownik kliknie zakładkę Pogoda", async () => {
      const user = userEvent.setup();
      mockOnTabChange.mockClear();
      render(<SideDrawer {...defaultProps} activeTab="parameters" />);

      const weatherTab = screen.getByText("Pogoda").closest("button");
      expect(weatherTab).toBeInTheDocument();

      await user.click(weatherTab!);

      expect(mockOnTabChange).toHaveBeenCalledWith("weather");
      expect(mockOnTabChange).toHaveBeenCalled();
    });

    it("powinien wywołać onTabChange gdy użytkownik kliknie zakładkę Parametry", async () => {
      const user = userEvent.setup();
      mockOnTabChange.mockClear();
      render(<SideDrawer {...defaultProps} activeTab="plants" />);

      const parametersTab = screen.getByText("Parametry").closest("button");
      expect(parametersTab).toBeInTheDocument();

      await user.click(parametersTab!);

      expect(mockOnTabChange).toHaveBeenCalledWith("parameters");
      expect(mockOnTabChange).toHaveBeenCalled();
    });
  });

  describe("Przekazywanie props do ParametersTab", () => {
    it("powinien przekazać plan do ParametersTab", () => {
      const plan = createMockPlan({ id: "plan-789", name: "Custom Plan" });
      render(<SideDrawer {...defaultProps} plan={plan} activeTab="parameters" />);

      expect(screen.getByTestId("parameters-plan-id")).toHaveTextContent("plan-789");
      expect(screen.getByTestId("parameters-plan-name")).toHaveTextContent("Custom Plan");
    });

    it("powinien przekazać isUpdatingPlan do ParametersTab", () => {
      render(<SideDrawer {...defaultProps} isUpdatingPlan={true} activeTab="parameters" />);

      expect(screen.getByTestId("parameters-is-updating")).toHaveTextContent("true");
    });

    it("powinien przekazać isUpdatingPlan=false gdy prop nie jest podany", () => {
      render(<SideDrawer {...defaultProps} activeTab="parameters" />);

      expect(screen.getByTestId("parameters-is-updating")).toHaveTextContent("false");
    });

    it("powinien przekazać onUpdatePlan do ParametersTab i wywołać go po kliknięciu", async () => {
      const user = userEvent.setup();
      render(<SideDrawer {...defaultProps} activeTab="parameters" />);

      const updateButton = screen.getByTestId("parameters-update-button");
      await user.click(updateButton);

      expect(mockOnUpdatePlan).toHaveBeenCalledTimes(1);
      expect(mockOnUpdatePlan).toHaveBeenCalledWith({ name: "Updated Plan Name" });
    });
  });

  describe("Przekazywanie props do PlantsTab", () => {
    it("powinien przekazać planId do PlantsTab", () => {
      const plan = createMockPlan({ id: "plan-plants-123" });
      render(<SideDrawer {...defaultProps} plan={plan} activeTab="plants" />);

      expect(screen.getByTestId("plants-plan-id")).toHaveTextContent("plan-plants-123");
    });

    it("powinien przekazać selectedCell do PlantsTab gdy jest ustawiony", () => {
      const selectedCell = createMockCellPosition(10, 15);
      render(
        <SideDrawer {...defaultProps} selectedCell={selectedCell} activeTab="plants" />
      );

      expect(screen.getByTestId("plants-selected-cell")).toHaveTextContent("10,15");
    });

    it("powinien nie przekazywać selectedCell do PlantsTab gdy jest null", () => {
      render(<SideDrawer {...defaultProps} selectedCell={null} activeTab="plants" />);

      expect(screen.queryByTestId("plants-selected-cell")).not.toBeInTheDocument();
    });

    it("powinien przekazać cellType do PlantsTab gdy jest ustawiony", () => {
      render(<SideDrawer {...defaultProps} cellType="soil" activeTab="plants" />);

      expect(screen.getByTestId("plants-cell-type")).toHaveTextContent("soil");
    });

    it("powinien nie przekazywać cellType do PlantsTab gdy jest null", () => {
      render(<SideDrawer {...defaultProps} cellType={null} activeTab="plants" />);

      expect(screen.queryByTestId("plants-cell-type")).not.toBeInTheDocument();
    });

    it("powinien wywołać onPlantAdded gdy użytkownik doda roślinę w PlantsTab", async () => {
      const user = userEvent.setup();
      render(<SideDrawer {...defaultProps} activeTab="plants" />);

      const addButton = screen.getByTestId("plants-add-button");
      await user.click(addButton);

      expect(mockOnPlantAdded).toHaveBeenCalledTimes(1);
      expect(mockOnPlantAdded).toHaveBeenCalledWith("Test Plant", 5, 10);
    });

    it("powinien wywołać onPlantRemoved gdy użytkownik usunie roślinę w PlantsTab", async () => {
      const user = userEvent.setup();
      render(<SideDrawer {...defaultProps} activeTab="plants" />);

      const removeButton = screen.getByTestId("plants-remove-button");
      await user.click(removeButton);

      expect(mockOnPlantRemoved).toHaveBeenCalledTimes(1);
      expect(mockOnPlantRemoved).toHaveBeenCalledWith("Test Plant", 5, 10);
    });

    it("powinien wywołać onJumpToCell gdy użytkownik kliknie jump w PlantsTab", async () => {
      const user = userEvent.setup();
      render(<SideDrawer {...defaultProps} activeTab="plants" />);

      const jumpButton = screen.getByTestId("plants-jump-button");
      await user.click(jumpButton);

      expect(mockOnJumpToCell).toHaveBeenCalledTimes(1);
      expect(mockOnJumpToCell).toHaveBeenCalledWith(15, 20);
    });

    it("powinien nie wywołać callbacków gdy nie są podane (opcjonalne props)", async () => {
      const user = userEvent.setup();
      const propsWithoutCallbacks: SideDrawerProps = {
        ...defaultProps,
        onPlantAdded: undefined,
        onPlantRemoved: undefined,
        onJumpToCell: undefined,
        activeTab: "plants",
      };
      render(<SideDrawer {...propsWithoutCallbacks} />);

      const addButton = screen.getByTestId("plants-add-button");
      await user.click(addButton);

      // Callbacki nie powinny być wywołane, ale komponent nie powinien się zepsuć
      expect(mockOnPlantAdded).not.toHaveBeenCalled();
    });
  });

  describe("Przekazywanie props do WeatherTab", () => {
    it("powinien przekazać planId do WeatherTab", () => {
      const plan = createMockPlan({ id: "plan-weather-456" });
      render(<SideDrawer {...defaultProps} plan={plan} activeTab="weather" />);

      expect(screen.getByTestId("weather-plan-id")).toHaveTextContent("plan-weather-456");
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć szybkie przełączanie między zakładkami", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SideDrawer {...defaultProps} activeTab="parameters" />);

      // Kliknij Rośliny
      await user.click(screen.getByText("Rośliny").closest("button")!);
      expect(mockOnTabChange).toHaveBeenCalledWith("plants");

      // Rerender z nową aktywną zakładką
      rerender(<SideDrawer {...defaultProps} activeTab="plants" />);
      expect(screen.getByTestId("plants-tab")).toBeInTheDocument();

      // Kliknij Pogoda
      await user.click(screen.getByText("Pogoda").closest("button")!);
      expect(mockOnTabChange).toHaveBeenCalledWith("weather");

      // Rerender z nową aktywną zakładką
      rerender(<SideDrawer {...defaultProps} activeTab="weather" />);
      expect(screen.getByTestId("weather-tab")).toBeInTheDocument();
    });

    it("powinien obsłużyć aktualizację planu podczas gdy isUpdatingPlan=true", async () => {
      const user = userEvent.setup();
      render(
        <SideDrawer {...defaultProps} isUpdatingPlan={true} activeTab="parameters" />
      );

      const updateButton = screen.getByTestId("parameters-update-button");
      await user.click(updateButton);

      expect(mockOnUpdatePlan).toHaveBeenCalled();
    });

    it("powinien obsłużyć różne typy komórek w cellType", () => {
      const cellTypes: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

      cellTypes.forEach((cellType) => {
        const { unmount } = render(
          <SideDrawer {...defaultProps} cellType={cellType} activeTab="plants" />
        );

        expect(screen.getByTestId("plants-cell-type")).toHaveTextContent(cellType);
        unmount();
      });
    });

    it("powinien obsłużyć różne wartości selectedCell", () => {
      const cells: CellPosition[] = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 199, y: 199 },
      ];

      cells.forEach((cell) => {
        const { unmount } = render(
          <SideDrawer {...defaultProps} selectedCell={cell} activeTab="plants" />
        );

        expect(screen.getByTestId("plants-selected-cell")).toHaveTextContent(
          `${cell.x},${cell.y}`
        );
        unmount();
      });
    });

    it("powinien obsłużyć plan bez lokalizacji (latitude/longitude null)", () => {
      const planWithoutLocation = createMockPlan({
        latitude: null,
        longitude: null,
      });

      render(<SideDrawer {...defaultProps} plan={planWithoutLocation} activeTab="parameters" />);

      expect(screen.getByTestId("parameters-tab")).toBeInTheDocument();
      expect(screen.getByTestId("parameters-plan-id")).toHaveTextContent(planWithoutLocation.id);
    });
  });

  describe("Layout i styling", () => {
    it("powinien mieć odpowiednią strukturę DOM z aside elementem", () => {
      const { container } = render(<SideDrawer {...defaultProps} />);

      const aside = container.querySelector("aside");
      expect(aside).toBeInTheDocument();
      expect(aside).toHaveClass("flex", "w-96", "flex-col", "border-l", "bg-background");
    });

    it("powinien mieć scrollable content area", () => {
      const { container } = render(<SideDrawer {...defaultProps} />);

      const scrollableDiv = container.querySelector(".overflow-y-auto");
      expect(scrollableDiv).toBeInTheDocument();
      expect(scrollableDiv).toHaveClass("flex-1", "overflow-y-auto");
    });
  });
});

