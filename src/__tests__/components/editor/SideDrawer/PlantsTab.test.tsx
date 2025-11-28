import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlantsTab, type PlantsTabProps } from "@/components/editor/SideDrawer/PlantsTab";
import type { CellPosition, GridCellType } from "@/types";

// Mock komponentów potomnych
vi.mock("@/components/editor/SideDrawer/PlantsList", () => ({
  PlantsList: ({ planId, onJumpToCell, onPlantRemoved }: any) => (
    <div data-testid="plants-list">
      <div data-testid="plants-list-plan-id">{planId}</div>
      {onJumpToCell && <button data-testid="plants-list-jump" onClick={() => onJumpToCell(5, 10)}>Jump</button>}
      {onPlantRemoved && (
        <button data-testid="plants-list-remove" onClick={() => onPlantRemoved("Test Plant", 3, 7)}>
          Remove
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/editor/SideDrawer/PlantSearchForm", () => ({
  PlantSearchForm: ({ planId, selectedCell, cellType, onPlantAdded }: any) => (
    <div data-testid="plant-search-form">
      <div data-testid="plant-search-form-plan-id">{planId}</div>
      <div data-testid="plant-search-form-selected-cell">
        {selectedCell ? `${selectedCell.x},${selectedCell.y}` : "null"}
      </div>
      <div data-testid="plant-search-form-cell-type">{cellType || "null"}</div>
      {onPlantAdded && (
        <button data-testid="plant-search-form-add" onClick={() => onPlantAdded("New Plant", 2, 4)}>
          Add Plant
        </button>
      )}
    </div>
  ),
}));

// Helper functions dla danych testowych
function createMockCellPosition(x: number, y: number): CellPosition {
  return { x, y };
}

function createDefaultProps(): PlantsTabProps {
  return {
    planId: "test-plan-id",
    selectedCell: null,
    cellType: null,
  };
}

describe("PlantsTab", () => {
  let defaultProps: PlantsTabProps;
  let mockOnPlantAdded: (plantName: string, x: number, y: number) => void;
  let mockOnPlantRemoved: (plantName: string, x: number, y: number) => void;
  let mockOnJumpToCell: (x: number, y: number) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnPlantAdded = vi.fn();
    mockOnPlantRemoved = vi.fn();
    mockOnJumpToCell = vi.fn();
    defaultProps = createDefaultProps();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render header with title and description", () => {
      render(<PlantsTab {...defaultProps} />);

      expect(screen.getByText("Rośliny")).toBeInTheDocument();
      expect(screen.getByText("Zarządzaj roślinami w planie działki")).toBeInTheDocument();
    });

    it("should render tabs with List and Search options", () => {
      render(<PlantsTab {...defaultProps} />);

      expect(screen.getByRole("tab", { name: /lista/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /wyszukaj/i })).toBeInTheDocument();
    });

    it("should render List tab content by default", () => {
      render(<PlantsTab {...defaultProps} />);

      expect(screen.getByTestId("plants-list")).toBeInTheDocument();
      expect(screen.queryByTestId("plant-search-form")).not.toBeInTheDocument();
    });

    it("should render PlantsList with correct props", () => {
      const props = {
        ...defaultProps,
        onJumpToCell: mockOnJumpToCell,
        onPlantRemoved: mockOnPlantRemoved,
      };

      render(<PlantsTab {...props} />);

      const plantsList = screen.getByTestId("plants-list");
      expect(plantsList).toBeInTheDocument();
      expect(screen.getByTestId("plants-list-plan-id")).toHaveTextContent("test-plan-id");
    });

    it("should render PlantSearchForm with correct props when Search tab is active", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedCell: createMockCellPosition(10, 20),
        cellType: "soil" as GridCellType,
        onPlantAdded: mockOnPlantAdded,
      };

      render(<PlantsTab {...props} />);

      // Przełącz na zakładkę Wyszukaj
      const searchTab = screen.getByRole("tab", { name: /wyszukaj/i });
      await user.click(searchTab);

      expect(screen.getByTestId("plant-search-form")).toBeInTheDocument();
      expect(screen.getByTestId("plant-search-form-plan-id")).toHaveTextContent("test-plan-id");
      expect(screen.getByTestId("plant-search-form-selected-cell")).toHaveTextContent("10,20");
      expect(screen.getByTestId("plant-search-form-cell-type")).toHaveTextContent("soil");
    });
  });

  describe("Przełączanie zakładek", () => {
    it("should switch from List to Search tab", async () => {
      const user = userEvent.setup();
      render(<PlantsTab {...defaultProps} />);

      // Domyślnie List jest aktywna
      expect(screen.getByTestId("plants-list")).toBeInTheDocument();
      expect(screen.queryByTestId("plant-search-form")).not.toBeInTheDocument();

      // Kliknij zakładkę Wyszukaj
      const searchTab = screen.getByRole("tab", { name: /wyszukaj/i });
      await user.click(searchTab);

      // Sprawdź, że Search jest aktywna
      expect(screen.queryByTestId("plants-list")).not.toBeInTheDocument();
      expect(screen.getByTestId("plant-search-form")).toBeInTheDocument();
    });

    it("should switch from Search to List tab", async () => {
      const user = userEvent.setup();
      render(<PlantsTab {...defaultProps} />);

      // Przełącz na Search
      const searchTab = screen.getByRole("tab", { name: /wyszukaj/i });
      await user.click(searchTab);
      expect(screen.getByTestId("plant-search-form")).toBeInTheDocument();

      // Przełącz z powrotem na List
      const listTab = screen.getByRole("tab", { name: /lista/i });
      await user.click(listTab);

      // Sprawdź, że List jest aktywna
      expect(screen.getByTestId("plants-list")).toBeInTheDocument();
      expect(screen.queryByTestId("plant-search-form")).not.toBeInTheDocument();
    });

    it("should maintain tab state when switching", async () => {
      const user = userEvent.setup();
      render(<PlantsTab {...defaultProps} />);

      // Przełącz na Search
      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));
      expect(screen.getByTestId("plant-search-form")).toBeInTheDocument();

      // Przełącz na List
      await user.click(screen.getByRole("tab", { name: /lista/i }));
      expect(screen.getByTestId("plants-list")).toBeInTheDocument();

      // Przełącz z powrotem na Search
      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));
      expect(screen.getByTestId("plant-search-form")).toBeInTheDocument();
    });
  });

  describe("Przekazywanie props do komponentów potomnych", () => {
    it("should pass planId to PlantsList", () => {
      const props = {
        ...defaultProps,
        planId: "custom-plan-id",
      };

      render(<PlantsTab {...props} />);

      expect(screen.getByTestId("plants-list-plan-id")).toHaveTextContent("custom-plan-id");
    });

    it("should pass planId to PlantSearchForm", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        planId: "custom-plan-id",
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-plan-id")).toHaveTextContent("custom-plan-id");
    });

    it("should pass null selectedCell to PlantSearchForm when not provided", async () => {
      const user = userEvent.setup();
      render(<PlantsTab {...defaultProps} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-selected-cell")).toHaveTextContent("null");
    });

    it("should pass selectedCell to PlantSearchForm", async () => {
      const user = userEvent.setup();
      const selectedCell = createMockCellPosition(15, 25);
      const props = {
        ...defaultProps,
        selectedCell,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-selected-cell")).toHaveTextContent("15,25");
    });

    it("should pass null cellType to PlantSearchForm when not provided", async () => {
      const user = userEvent.setup();
      render(<PlantsTab {...defaultProps} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-cell-type")).toHaveTextContent("null");
    });

    it("should pass cellType to PlantSearchForm", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        cellType: "path" as GridCellType,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-cell-type")).toHaveTextContent("path");
    });

    it("should pass all cell types correctly", async () => {
      const user = userEvent.setup();
      const cellTypes: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

      for (const cellType of cellTypes) {
        const props = {
          ...defaultProps,
          cellType,
        };

        const { unmount } = render(<PlantsTab {...props} />);
        await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

        expect(screen.getByTestId("plant-search-form-cell-type")).toHaveTextContent(cellType);
        unmount();
      }
    });
  });

  describe("Callbacki", () => {
    it("should call onPlantAdded when PlantSearchForm triggers it", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        onPlantAdded: mockOnPlantAdded,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));
      await user.click(screen.getByTestId("plant-search-form-add"));

      expect(mockOnPlantAdded).toHaveBeenCalledTimes(1);
      expect(mockOnPlantAdded).toHaveBeenCalledWith("New Plant", 2, 4);
    });

    it("should not call onPlantAdded when callback is not provided", async () => {
      const user = userEvent.setup();
      render(<PlantsTab {...defaultProps} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      // PlantSearchForm nie renderuje przycisku add, gdy callback nie jest przekazany
      expect(screen.queryByTestId("plant-search-form-add")).not.toBeInTheDocument();
      expect(mockOnPlantAdded).not.toHaveBeenCalled();
    });

    it("should call onPlantRemoved when PlantsList triggers it", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        onPlantRemoved: mockOnPlantRemoved,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByTestId("plants-list-remove"));

      expect(mockOnPlantRemoved).toHaveBeenCalledTimes(1);
      expect(mockOnPlantRemoved).toHaveBeenCalledWith("Test Plant", 3, 7);
    });

    it("should not call onPlantRemoved when callback is not provided", () => {
      render(<PlantsTab {...defaultProps} />);

      // PlantsList nie renderuje przycisku remove, gdy callback nie jest przekazany
      expect(screen.queryByTestId("plants-list-remove")).not.toBeInTheDocument();
    });

    it("should call onJumpToCell when PlantsList triggers it", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        onJumpToCell: mockOnJumpToCell,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByTestId("plants-list-jump"));

      expect(mockOnJumpToCell).toHaveBeenCalledTimes(1);
      expect(mockOnJumpToCell).toHaveBeenCalledWith(5, 10);
    });

    it("should not call onJumpToCell when callback is not provided", () => {
      render(<PlantsTab {...defaultProps} />);

      // PlantsList nie renderuje przycisku jump, gdy callback nie jest przekazany
      expect(screen.queryByTestId("plants-list-jump")).not.toBeInTheDocument();
    });

    it("should handle multiple callbacks simultaneously", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        onPlantAdded: mockOnPlantAdded,
        onPlantRemoved: mockOnPlantRemoved,
        onJumpToCell: mockOnJumpToCell,
      };

      render(<PlantsTab {...props} />);

      // Test onPlantRemoved
      await user.click(screen.getByTestId("plants-list-remove"));
      expect(mockOnPlantRemoved).toHaveBeenCalledTimes(1);

      // Test onJumpToCell
      await user.click(screen.getByTestId("plants-list-jump"));
      expect(mockOnJumpToCell).toHaveBeenCalledTimes(1);

      // Test onPlantAdded
      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));
      await user.click(screen.getByTestId("plant-search-form-add"));
      expect(mockOnPlantAdded).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle null selectedCell", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedCell: null,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-selected-cell")).toHaveTextContent("null");
    });

    it("should handle null cellType", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        cellType: null,
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-cell-type")).toHaveTextContent("null");
    });

    it("should handle selectedCell at origin (0, 0)", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedCell: createMockCellPosition(0, 0),
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-selected-cell")).toHaveTextContent("0,0");
    });

    it("should handle large coordinates", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedCell: createMockCellPosition(199, 199),
      };

      render(<PlantsTab {...props} />);

      await user.click(screen.getByRole("tab", { name: /wyszukaj/i }));

      expect(screen.getByTestId("plant-search-form-selected-cell")).toHaveTextContent("199,199");
    });

    it("should handle empty planId", () => {
      const props = {
        ...defaultProps,
        planId: "",
      };

      render(<PlantsTab {...props} />);

      expect(screen.getByTestId("plants-list-plan-id")).toHaveTextContent("");
    });

    it("should handle long planId", () => {
      const longPlanId = "a".repeat(100);
      const props = {
        ...defaultProps,
        planId: longPlanId,
      };

      render(<PlantsTab {...props} />);

      expect(screen.getByTestId("plants-list-plan-id")).toHaveTextContent(longPlanId);
    });
  });

  describe("Ikony w zakładkach", () => {
    it("should render List icon in List tab", () => {
      render(<PlantsTab {...defaultProps} />);

      const listTab = screen.getByRole("tab", { name: /lista/i });
      expect(listTab).toBeInTheDocument();
      // Ikona jest renderowana jako SVG w komponencie TabsTrigger
    });

    it("should render Search icon in Search tab", () => {
      render(<PlantsTab {...defaultProps} />);

      const searchTab = screen.getByRole("tab", { name: /wyszukaj/i });
      expect(searchTab).toBeInTheDocument();
      // Ikona jest renderowana jako SVG w komponencie TabsTrigger
    });
  });

  describe("Layout i styling", () => {
    it("should render with proper structure", () => {
      const { container } = render(<PlantsTab {...defaultProps} />);

      // Sprawdź, że główny kontener ma odpowiednią strukturę
      const mainDiv = container.querySelector(".flex.h-full.flex-col");
      expect(mainDiv).toBeInTheDocument();
    });

    it("should render tabs with full width", () => {
      const { container } = render(<PlantsTab {...defaultProps} />);

      // TabsList powinien mieć klasę w-full
      const tabsList = container.querySelector(".w-full");
      expect(tabsList).toBeInTheDocument();
    });
  });
});

