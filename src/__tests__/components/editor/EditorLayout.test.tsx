import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorLayout, type EditorLayoutProps } from "@/components/editor/EditorLayout";
import type {
  PlanDto,
  GridMetadataDto,
  GridCellDto,
  EditorState,
  CellSelection,
  CellPosition,
  EditorTool,
  GridCellType,
  PlantPlacementDto,
  SelectionInfo,
  DrawerTab,
  PlanUpdateCommand,
} from "@/types";
import type { UseGridEditorReturn } from "@/lib/hooks/useGridEditor";

// Mock QueryProvider
vi.mock("@/components/editor/QueryProvider", () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="query-provider">{children}</div>,
}));

// Mock ToastProvider
vi.mock("@/components/editor/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
}));

// Mock hooks
const mockSetTool = vi.fn();
const mockSelectArea = vi.fn();
const mockClearSelection = vi.fn();
const mockFocusCell = vi.fn();
const mockJumpToCell = vi.fn();
const mockSetAreaType = vi.fn();
const mockAddPlant = vi.fn();
const mockRemovePlant = vi.fn();
const mockUpdatePlan = vi.fn();

const createMockEditor = (overrides?: Partial<UseGridEditorReturn>): UseGridEditorReturn => {
  const defaultState: EditorState = {
    currentTool: "select" as EditorTool,
    selectedArea: null,
    focusedCell: null,
    hasUnsavedChanges: false,
    clipboardArea: null,
  };

  return {
    state: overrides?.state ?? defaultState,
    plan: overrides?.plan,
    gridMetadata: overrides?.gridMetadata,
    cells: overrides?.cells ?? {
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
    } as any,
    plants: overrides?.plants ?? {
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
    } as any,
    actions: {
      setTool: mockSetTool,
      selectArea: mockSelectArea,
      clearSelection: mockClearSelection,
      focusCell: mockFocusCell,
      jumpToCell: mockJumpToCell,
      setAreaType: mockSetAreaType,
      addPlant: mockAddPlant,
      removePlant: mockRemovePlant,
      updatePlan: mockUpdatePlan,
    },
    derived: overrides?.derived ?? {
      selectedCellsCount: 0,
      plantsInSelection: [],
      canAddPlant: false,
      selectionInfo: null,
      hasActiveSelection: false,
    },
    isLoading: overrides?.isLoading ?? false,
    isError: overrides?.isError ?? false,
  };
};

vi.mock("@/lib/hooks/useGridEditor", () => ({
  useGridEditor: vi.fn(),
}));

vi.mock("@/lib/hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: vi.fn(),
}));

const mockSetAreaTypeAction = vi.fn();
const mockConfirmOperation = vi.fn();
const mockCancelOperation = vi.fn();
let mockOnSuccessCallback: ((result: any, options: any) => void) | null = null;

const createMockAreaTypeHandler = () => ({
  setAreaType: async (params: any) => {
    const result = await mockSetAreaTypeAction(params);
    // Wywołaj callback onSuccess jeśli został ustawiony
    if (mockOnSuccessCallback && result) {
      mockOnSuccessCallback(result, params);
    }
    return result;
  },
  isLoading: false,
  pendingOperation: null,
  confirmOperation: mockConfirmOperation,
  cancelOperation: mockCancelOperation,
});

vi.mock("@/lib/hooks/useAreaTypeWithConfirmation", () => ({
  useAreaTypeWithConfirmation: vi.fn(({ onSuccess }: any) => {
    mockOnSuccessCallback = onSuccess;
    return createMockAreaTypeHandler();
  }),
}));

const mockSendEvent = vi.fn();
vi.mock("@/lib/hooks/useAnalytics", () => ({
  useAnalytics: vi.fn(() => ({
    sendEvent: mockSendEvent,
  })),
  createAreaTypedEvent: vi.fn((planId: string, data: any) => ({
    type: "area_typed",
    planId,
    data,
  })),
}));

const mockLogSuccess = vi.fn();
const mockLogInfo = vi.fn();
const mockLogWarning = vi.fn();
const mockLogError = vi.fn();
const mockOperationLog = {
  operations: [],
  logSuccess: mockLogSuccess,
  logInfo: mockLogInfo,
  logWarning: mockLogWarning,
  logError: mockLogError,
};

vi.mock("@/lib/hooks/useOperationLog", () => ({
  useOperationLog: vi.fn(() => mockOperationLog),
}));

const mockAiStatus = { status: "idle" as const };
const mockWeatherStatus = { status: "idle" as const };
vi.mock("@/lib/hooks/useEditorStatus", () => ({
  useEditorStatus: vi.fn(() => ({
    aiStatus: mockAiStatus,
    weatherStatus: mockWeatherStatus,
  })),
}));

// Mock komponentów
vi.mock("@/components/editor/EditorTopbar", () => ({
  EditorTopbar: ({ plan, currentTool, onToolChange }: any) => (
    <div data-testid="editor-topbar">
      <div data-testid="plan-name">{plan?.name}</div>
      <button data-testid="tool-button" onClick={() => onToolChange("add_plant")}>
        {currentTool}
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/GridCanvas/GridCanvas", () => ({
  GridCanvas: ({ onCellClick, onSelectionChange, selectedArea, focusedCell }: any) => (
    <div data-testid="grid-canvas">
      <button
        data-testid="cell-0-0"
        onClick={() => onCellClick(0, 0)}
        data-selected={selectedArea ? "true" : "false"}
        data-focused={focusedCell?.x === 0 && focusedCell?.y === 0 ? "true" : "false"}
      >
        Cell 0,0
      </button>
      <button
        data-testid="select-area"
        onClick={() => onSelectionChange({ x1: 0, y1: 0, x2: 1, y2: 1 })}
      >
        Select Area
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/SideDrawer/SideDrawer", () => ({
  SideDrawer: vi.fn(({ activeTab, onTabChange, onUpdatePlan, onPlantAdded, onPlantRemoved, onJumpToCell }: any) => (
    <div data-testid="side-drawer">
      <div data-testid="active-tab">{activeTab}</div>
      <button data-testid="change-tab" onClick={() => onTabChange("weather")}>
        Change Tab
      </button>
      <button data-testid="update-plan" onClick={() => onUpdatePlan({ name: "Updated Plan" })}>
        Update Plan
      </button>
      <button data-testid="add-plant" onClick={() => onPlantAdded("Tomato", 5, 5)}>
        Add Plant
      </button>
      <button data-testid="remove-plant" onClick={() => onPlantRemoved("Tomato", 5, 5)}>
        Remove Plant
      </button>
      <button data-testid="jump-to-cell" onClick={() => onJumpToCell(10, 10)}>
        Jump to Cell
      </button>
    </div>
  )),
}));

vi.mock("@/components/editor/BottomPanel", () => ({
  BottomPanel: ({ operations, plantsCount, selectedCellsCount }: any) => (
    <div data-testid="bottom-panel">
      <div data-testid="operations-count">{operations.length}</div>
      <div data-testid="plants-count">{plantsCount}</div>
      <div data-testid="selected-cells-count">{selectedCellsCount}</div>
    </div>
  ),
}));

vi.mock("@/components/editor/AreaTypePanel", () => ({
  AreaTypePanel: ({ onApply, onCancel, isApplying }: any) => (
    <div data-testid="area-type-panel">
      <button data-testid="apply-area-type" onClick={() => onApply("soil")} disabled={isApplying}>
        Apply Soil
      </button>
      <button data-testid="cancel-area-type" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/modals/GridRegenerationConfirmDialog", () => ({
  GridRegenerationConfirmDialog: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="regeneration-dialog">
        <button data-testid="confirm-regeneration" onClick={onConfirm}>
          Confirm
        </button>
        <button data-testid="cancel-regeneration" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/editor/modals/AreaTypeConfirmDialog", () => ({
  AreaTypeConfirmDialog: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="area-type-confirm-dialog">
        <button data-testid="confirm-area-type" onClick={onConfirm}>
          Confirm
        </button>
        <button data-testid="cancel-area-type-dialog" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

// Mock toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock logger
const mockLoggerWarn = vi.fn();
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}));

// Helper functions
function createMockPlan(overrides?: Partial<PlanDto>): PlanDto {
  return {
    id: "test-plan-id",
    user_id: "test-user-id",
    name: "Test Plan",
    latitude: 52.0,
    longitude: 21.0,
    width_cm: 1000,
    height_cm: 800,
    cell_size_cm: 50,
    grid_width: 20,
    grid_height: 16,
    orientation: 0,
    hemisphere: "north",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockGridMetadata(overrides?: Partial<GridMetadataDto>): GridMetadataDto {
  return {
    grid_width: 20,
    grid_height: 16,
    cell_size_cm: 50,
    orientation: 0,
    ...overrides,
  };
}

function createMockCells(count = 10): GridCellDto[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i % 5,
    y: Math.floor(i / 5),
    type: "soil" as GridCellType,
    updated_at: "2024-01-01T00:00:00Z",
  }));
}

function createDefaultProps(): EditorLayoutProps {
  return {
    initialPlan: createMockPlan(),
    initialGridMetadata: createMockGridMetadata(),
    initialCells: createMockCells(),
  };
}

// Import hooków do mockowania
import { useGridEditor } from "@/lib/hooks/useGridEditor";
import { useAreaTypeWithConfirmation } from "@/lib/hooks/useAreaTypeWithConfirmation";
import { useKeyboardNavigation } from "@/lib/hooks/useKeyboardNavigation";
import { SideDrawer } from "@/components/editor/SideDrawer/SideDrawer";

describe("EditorLayout", () => {
  let defaultProps: EditorLayoutProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
    mockOnSuccessCallback = null;

    // Reset mock implementations
    vi.mocked(useGridEditor).mockReturnValue(createMockEditor());
    mockUpdatePlan.mockResolvedValue(undefined);
    mockSetAreaTypeAction.mockResolvedValue({
      affected_cells: 4,
      removed_plants: 0,
    });
    mockSendEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować się poprawnie z podstawowymi props", () => {
      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("query-provider")).toBeInTheDocument();
      expect(screen.getByTestId("toast-provider")).toBeInTheDocument();
      expect(screen.getByTestId("editor-topbar")).toBeInTheDocument();
      expect(screen.getByTestId("grid-canvas")).toBeInTheDocument();
      expect(screen.getByTestId("side-drawer")).toBeInTheDocument();
      expect(screen.getByTestId("bottom-panel")).toBeInTheDocument();
    });

    it("powinien wyświetlać nazwę planu w topbarze", () => {
      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("plan-name")).toHaveTextContent("Test Plan");
    });

    it("powinien przekazywać poprawne dane do GridCanvas", () => {
      const cells = createMockCells(5);
      const plants: PlantPlacementDto[] = [
        {
          x: 0,
          y: 0,
          plant_name: "Tomato",
          sunlight_score: null,
          humidity_score: null,
          precip_score: null,
          temperature_score: null,
          overall_score: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          cells: {
            data: { data: cells },
            isLoading: false,
            isError: false,
            error: null,
          } as any,
          plants: {
            data: { data: plants },
            isLoading: false,
            isError: false,
            error: null,
          } as any,
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("grid-canvas")).toBeInTheDocument();
    });

    it("powinien wyświetlać liczbę roślin w BottomPanel", () => {
      const plants: PlantPlacementDto[] = [
        {
          x: 0,
          y: 0,
          plant_name: "Tomato",
          sunlight_score: null,
          humidity_score: null,
          precip_score: null,
          temperature_score: null,
          overall_score: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          plants: {
            data: { data: plants },
            isLoading: false,
            isError: false,
            error: null,
          } as any,
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("plants-count")).toHaveTextContent("1");
    });

    it("powinien wyświetlać liczbę zaznaczonych komórek w BottomPanel", () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("selected-cells-count")).toHaveTextContent("4");
    });
  });

  describe("Obsługa błędów", () => {
    it("powinien wyświetlać komunikat błędu gdy isError jest true", () => {
      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          isError: true,
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByText("Błąd ładowania edytora")).toBeInTheDocument();
      expect(screen.getByText("Spróbuj odświeżyć stronę")).toBeInTheDocument();
      expect(screen.queryByTestId("editor-topbar")).not.toBeInTheDocument();
    });
  });

  describe("Interakcje z GridCanvas", () => {
    it("powinien wywołać focusCell po kliknięciu komórki", async () => {
      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("cell-0-0"));

      expect(mockFocusCell).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it("powinien wywołać selectArea po zaznaczeniu obszaru", async () => {
      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("select-area"));

      expect(mockSelectArea).toHaveBeenCalledWith({ x1: 0, y1: 0, x2: 1, y2: 1 });
    });
  });

  describe("AreaTypePanel", () => {
    it("powinien wyświetlać AreaTypePanel gdy jest zaznaczenie i tool = select", () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("area-type-panel")).toBeInTheDocument();
    });

    it("nie powinien wyświetlać AreaTypePanel gdy tool != select", () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "add_plant",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: false,
            selectionInfo: null,
            hasActiveSelection: true,
          },
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(screen.queryByTestId("area-type-panel")).not.toBeInTheDocument();
    });

    it("powinien wywołać setAreaType po kliknięciu Apply w AreaTypePanel", async () => {
      const user = userEvent.setup();
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      expect(mockSetAreaTypeAction).toHaveBeenCalledWith({
        selection,
        type: "soil",
        confirmPlantRemoval: false,
      });
    });

    it("powinien wywołać clearSelection po kliknięciu Cancel w AreaTypePanel", async () => {
      const user = userEvent.setup();
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("cancel-area-type"));

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe("Obsługa zmiany typu obszaru", () => {
    it("powinien wyświetlić toast sukcesu po zmianie typu obszaru", async () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      mockSetAreaTypeAction.mockResolvedValue({
        affected_cells: 4,
        removed_plants: 0,
      });

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Zmieniono typ 4 komórek");
      });
    });

    it("powinien wyświetlić toast z informacją o usuniętych roślinach", async () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      mockSetAreaTypeAction.mockResolvedValue({
        affected_cells: 4,
        removed_plants: 2,
      });

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Zmieniono typ 4 komórek i usunięto 2 roślin");
      });
    });

    it("powinien zalogować operację po zmianie typu obszaru", async () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      mockSetAreaTypeAction.mockResolvedValue({
        affected_cells: 4,
        removed_plants: 0,
      });

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      await waitFor(() => {
        expect(mockLogSuccess).toHaveBeenCalledWith('Zmieniono typ 4 komórek na "soil"');
      });
    });

    it("powinien wysłać analytics event po zmianie typu obszaru", async () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      mockSetAreaTypeAction.mockResolvedValue({
        affected_cells: 4,
        removed_plants: 0,
      });

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      await waitFor(() => {
        expect(mockSendEvent).toHaveBeenCalled();
      });
    });

    it("powinien wyczyścić zaznaczenie po zmianie typu obszaru", async () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      mockSetAreaTypeAction.mockResolvedValue({
        affected_cells: 4,
        removed_plants: 0,
      });

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      await waitFor(() => {
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe("Obsługa aktualizacji planu", () => {
    it("powinien wywołać updatePlan z poprawnymi parametrami", async () => {
      const user = userEvent.setup();
      mockUpdatePlan.mockResolvedValue(undefined);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(mockUpdatePlan).toHaveBeenCalledWith({
          command: { name: "Updated Plan" },
          query: undefined,
        });
      });
    });

    it("powinien wyświetlić toast sukcesu po aktualizacji planu", async () => {
      const user = userEvent.setup();
      mockUpdatePlan.mockResolvedValue(undefined);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Plan zaktualizowany", {
          description: "Zmiany zostały zapisane pomyślnie.",
        });
      });
    });

    it("powinien zalogować zmiany w parametrach planu", async () => {
      const user = userEvent.setup();
      mockUpdatePlan.mockResolvedValue(undefined);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(mockLogSuccess).toHaveBeenCalledWith("Zaktualizowano plan: name");
      });
    });

    it("powinien konwertować null na undefined dla latitude/longitude/hemisphere", async () => {
      const user = userEvent.setup();
      mockUpdatePlan.mockResolvedValue(undefined);

      // Tymczasowo zmień mock SideDrawer
      vi.mocked(SideDrawer).mockImplementationOnce(({ onUpdatePlan }: any) => (
        <button
          data-testid="update-with-null"
          onClick={() => onUpdatePlan({ latitude: null, longitude: null, hemisphere: null })}
        >
          Update with null
        </button>
      ));

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-with-null"));

      await waitFor(() => {
        expect(mockUpdatePlan).toHaveBeenCalledWith({
          command: {
            latitude: undefined,
            longitude: undefined,
            hemisphere: undefined,
          },
          query: undefined,
        });
      });
    });

    it("powinien otworzyć modal regeneracji gdy wystąpi błąd 409", async () => {
      const user = userEvent.setup();
      const error = new Error("Conflict") as Error & { requiresConfirmation?: boolean };
      error.requiresConfirmation = true;
      mockUpdatePlan.mockRejectedValue(error);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(screen.getByTestId("regeneration-dialog")).toBeInTheDocument();
      });

      expect(mockLogWarning).toHaveBeenCalledWith("Zmiana parametrów planu wymaga regeneracji siatki");
    });

    it("powinien wyświetlić toast błędu gdy aktualizacja planu się nie powiedzie", async () => {
      const user = userEvent.setup();
      const error = new Error("Update failed");
      mockUpdatePlan.mockRejectedValue(error);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Nie udało się zaktualizować planu", {
          description: "Update failed",
        });
      });

      expect(mockLogError).toHaveBeenCalledWith("Błąd aktualizacji planu: Update failed");
    });

    it("powinien potwierdzić regenerację siatki", async () => {
      const user = userEvent.setup();
      const error = new Error("Conflict") as Error & { requiresConfirmation?: boolean };
      error.requiresConfirmation = true;
      mockUpdatePlan.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(screen.getByTestId("regeneration-dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("confirm-regeneration"));

      await waitFor(() => {
        expect(mockUpdatePlan).toHaveBeenCalledWith({
          command: { name: "Updated Plan" },
          query: { confirm_regenerate: true },
        });
      });

      expect(mockToastSuccess).toHaveBeenCalledWith("Siatka została zregenerowana", {
        description: "Wszystkie rośliny zostały usunięte. Możesz teraz dodać je ponownie.",
      });

      expect(mockLogWarning).toHaveBeenCalledWith("Siatka została zregenerowana - wszystkie rośliny zostały usunięte");
    });

    it("powinien anulować regenerację siatki", async () => {
      const user = userEvent.setup();
      const error = new Error("Conflict") as Error & { requiresConfirmation?: boolean };
      error.requiresConfirmation = true;
      mockUpdatePlan.mockRejectedValueOnce(error);

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("update-plan"));

      await waitFor(() => {
        expect(screen.getByTestId("regeneration-dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cancel-regeneration"));

      await waitFor(() => {
        expect(screen.queryByTestId("regeneration-dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("AreaTypeConfirmDialog", () => {
    it("powinien wyświetlić dialog potwierdzenia gdy pendingOperation istnieje", () => {
      vi.mocked(useAreaTypeWithConfirmation).mockReturnValue({
        ...createMockAreaTypeHandler(),
        pendingOperation: {
          selection: { x1: 0, y1: 0, x2: 1, y2: 1 },
          targetType: "path",
          plantsCount: 2,
          requiresConfirmation: true,
        },
      });

      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("area-type-confirm-dialog")).toBeInTheDocument();
    });

    it("powinien wywołać confirmOperation po kliknięciu Confirm", async () => {
      const user = userEvent.setup();
      vi.mocked(useAreaTypeWithConfirmation).mockReturnValue({
        ...createMockAreaTypeHandler(),
        pendingOperation: {
          selection: { x1: 0, y1: 0, x2: 1, y2: 1 },
          targetType: "path",
          plantsCount: 2,
          requiresConfirmation: true,
        },
      });

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("confirm-area-type"));

      expect(mockConfirmOperation).toHaveBeenCalled();
    });

    it("powinien wywołać cancelOperation po kliknięciu Cancel", async () => {
      const user = userEvent.setup();
      vi.mocked(useAreaTypeWithConfirmation).mockReturnValue({
        ...createMockAreaTypeHandler(),
        pendingOperation: {
          selection: { x1: 0, y1: 0, x2: 1, y2: 1 },
          targetType: "path",
          plantsCount: 2,
          requiresConfirmation: true,
        },
      });

      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("cancel-area-type-dialog"));

      expect(mockCancelOperation).toHaveBeenCalled();
    });
  });

  describe("Obsługa roślin", () => {
    it("powinien zalogować dodanie rośliny", async () => {
      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("add-plant"));

      expect(mockLogSuccess).toHaveBeenCalledWith('Dodano roślinę "Tomato" na pozycji (6, 6)');
    });

    it("powinien zalogować usunięcie rośliny", async () => {
      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("remove-plant"));

      expect(mockLogInfo).toHaveBeenCalledWith('Usunięto roślinę "Tomato" z pozycji (6, 6)');
    });

    it("powinien wywołać jumpToCell po kliknięciu Jump to Cell", async () => {
      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("jump-to-cell"));

      expect(mockJumpToCell).toHaveBeenCalledWith(10, 10);
    });
  });

  describe("Obsługa zakładek SideDrawer", () => {
    it("powinien zmienić aktywną zakładkę", async () => {
      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      expect(screen.getByTestId("active-tab")).toHaveTextContent("parameters");

      await user.click(screen.getByTestId("change-tab"));

      expect(screen.getByTestId("active-tab")).toHaveTextContent("weather");
    });
  });

  describe("Inicjalizacja", () => {
    it("powinien zalogować sukces załadowania edytora", () => {
      render(<EditorLayout {...defaultProps} />);

      expect(mockLogSuccess).toHaveBeenCalledWith("Edytor załadowany pomyślnie");
    });

    it("powinien wywołać useKeyboardNavigation z poprawnymi parametrami", () => {
      const gridMetadata = createMockGridMetadata({ grid_width: 20, grid_height: 16 });

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          gridMetadata,
        })
      );

      render(<EditorLayout {...defaultProps} />);

      expect(vi.mocked(useKeyboardNavigation)).toHaveBeenCalledWith({
        gridWidth: 20,
        gridHeight: 16,
        focusedCell: null,
        onFocusChange: mockFocusCell,
        onConfirmSelection: expect.any(Function),
        onCancelSelection: expect.any(Function),
        enabled: true,
      });
    });
  });

  describe("Obsługa błędów analytics", () => {
    it("powinien obsłużyć błąd wysyłania analytics event gracefully", async () => {
      const selection: CellSelection = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const selectionInfo: SelectionInfo = {
        selection,
        cellCount: 4,
        width: 2,
        height: 2,
      };

      mockSetAreaTypeAction.mockResolvedValue({
        affected_cells: 4,
        removed_plants: 0,
      });

      mockSendEvent.mockRejectedValue(new Error("Analytics error"));

      vi.mocked(useGridEditor).mockReturnValue(
        createMockEditor({
          state: {
            currentTool: "select",
            selectedArea: selection,
            focusedCell: null,
            hasUnsavedChanges: false,
            clipboardArea: null,
          },
          derived: {
            selectedCellsCount: 4,
            plantsInSelection: [],
            canAddPlant: true,
            selectionInfo,
            hasActiveSelection: true,
          },
        })
      );

      const user = userEvent.setup();
      render(<EditorLayout {...defaultProps} />);

      await user.click(screen.getByTestId("apply-area-type"));

      await waitFor(() => {
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          "Błąd podczas wysyłania analytics event dla zmiany typu obszaru",
          { error: "Analytics error" }
        );
      });

      // Główny flow powinien kontynuować działanie
      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockClearSelection).toHaveBeenCalled();
    });
  });
});

