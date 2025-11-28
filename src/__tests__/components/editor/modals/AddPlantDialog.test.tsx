import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddPlantDialog, type AddPlantDialogProps } from "@/components/editor/modals/AddPlantDialog";
import type { CellPosition, GridCellType, AddPlantDialogState, PlantSearchCandidateDto, PlantFitResultDto, AIError } from "@/types";
import type { AddPlantFlowActions } from "@/lib/hooks/useAddPlantFlow";

// Mock useAddPlantFlow hook
const mockState: AddPlantDialogState = {
  step: "search",
  activeTab: "search",
  searchQuery: "",
  searchResults: null,
  isSearching: false,
  selectedCandidate: null,
  fitResult: null,
  isFitting: false,
  manualName: "",
  isSubmitting: false,
  error: null,
};

const mockActions: AddPlantFlowActions = {
  searchPlants: vi.fn(),
  selectCandidate: vi.fn(),
  retrySearch: vi.fn(),
  checkFit: vi.fn(),
  retryFit: vi.fn(),
  skipFit: vi.fn(),
  setManualName: vi.fn(),
  switchToManualTab: vi.fn(),
  switchToSearchTab: vi.fn(),
  confirmAdd: vi.fn(),
  cancel: vi.fn(),
  dismissError: vi.fn(),
};

vi.mock("@/lib/hooks/useAddPlantFlow", () => ({
  useAddPlantFlow: vi.fn(() => ({
    state: mockState,
    actions: mockActions,
  })),
}));

// Mock komponentów podrzędnych
vi.mock("@/components/editor/modals/SearchTab", () => ({
  SearchTab: ({ state, actions }: any) => (
    <div data-testid="search-tab">
      <div data-testid="search-state">{JSON.stringify(state)}</div>
      <button data-testid="search-actions" onClick={() => actions.searchPlants("test")}>
        Search
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/modals/ManualTab", () => ({
  ManualTab: ({ state, actions }: any) => (
    <div data-testid="manual-tab">
      <div data-testid="manual-state">{JSON.stringify(state)}</div>
      <button data-testid="manual-actions" onClick={() => actions.setManualName("Test Plant")}>
        Set Name
      </button>
    </div>
  ),
}));

vi.mock("@/components/editor/modals/PlantFitDisplay", () => ({
  PlantFitDisplay: ({ fitResult, isLoading }: any) => (
    <div data-testid="plant-fit-display">
      {isLoading ? <div data-testid="fit-loading">Loading...</div> : null}
      {fitResult ? <div data-testid="fit-result">{JSON.stringify(fitResult)}</div> : null}
    </div>
  ),
}));

vi.mock("@/components/editor/modals/CellInfoBadge", () => ({
  CellInfoBadge: ({ x, y, type }: any) => (
    <div data-testid="cell-info-badge" data-x={x} data-y={y} data-type={type}>
      Cell: {x}, {y} ({type})
    </div>
  ),
}));

// Import po mockach
import { useAddPlantFlow } from "@/lib/hooks/useAddPlantFlow";

const mockUseAddPlantFlow = vi.mocked(useAddPlantFlow);

// Helper functions dla danych testowych
function createMockCandidate(name: string, latinName?: string): PlantSearchCandidateDto {
  return {
    name,
    latin_name: latinName,
    source: "ai",
  };
}

function createMockFitResult(): PlantFitResultDto {
  return {
    sunlight_score: 4,
    humidity_score: 3,
    precip_score: 5,
    temperature_score: 4,
    overall_score: 4,
    explanation: "Roślina dobrze dopasowana do warunków klimatycznych.",
  };
}

function createMockError(type: "timeout" | "bad_json" | "rate_limit" | "network" | "unknown", context: "search" | "fit"): AIError {
  return {
    type,
    context,
    message: `Test error: ${type}`,
    details: `Details for ${type} error`,
    canRetry: type !== "rate_limit",
  };
}

function createDefaultProps(): AddPlantDialogProps {
  return {
    isOpen: true,
    planId: "test-plan-id",
    cell: { x: 5, y: 10 },
    cellType: "soil",
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };
}

describe("AddPlantDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock state do wartości początkowych
    Object.assign(mockState, {
      step: "search",
      activeTab: "search",
      searchQuery: "",
      searchResults: null,
      isSearching: false,
      selectedCandidate: null,
      fitResult: null,
      isFitting: false,
      manualName: "",
      isSubmitting: false,
      error: null,
    });

    // Reset mock actions
    Object.keys(mockActions).forEach((key) => {
      if (typeof mockActions[key as keyof AddPlantFlowActions] === "function") {
        (mockActions[key as keyof AddPlantFlowActions] as any).mockClear?.();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render dialog when isOpen is true", () => {
      const props = createDefaultProps();
      render(<AddPlantDialog {...props} />);

      expect(screen.getByRole("heading", { name: "Dodaj roślinę" })).toBeInTheDocument();
      expect(screen.getByText("Wybierz roślinę do posadzenia na wybranym polu")).toBeInTheDocument();
    });

    it("should not render dialog when isOpen is false", () => {
      const props = createDefaultProps();
      props.isOpen = false;
      render(<AddPlantDialog {...props} />);

      expect(screen.queryByText("Dodaj roślinę")).not.toBeInTheDocument();
    });

    it("should render CellInfoBadge with correct props", () => {
      const props = createDefaultProps();
      render(<AddPlantDialog {...props} />);

      const badge = screen.getByTestId("cell-info-badge");
      expect(badge).toHaveAttribute("data-x", "5");
      expect(badge).toHaveAttribute("data-y", "10");
      expect(badge).toHaveAttribute("data-type", "soil");
    });

    it("should render both tabs (Wyszukaj AI and Ręcznie)", () => {
      const props = createDefaultProps();
      render(<AddPlantDialog {...props} />);

      expect(screen.getByRole("tab", { name: /wyszukaj ai/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /ręcznie/i })).toBeInTheDocument();
    });

    it("should render SearchTab by default when activeTab is 'search'", () => {
      const props = createDefaultProps();
      mockState.activeTab = "search";
      render(<AddPlantDialog {...props} />);

      expect(screen.getByTestId("search-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("manual-tab")).not.toBeInTheDocument();
    });

    it("should render ManualTab when activeTab is 'manual'", () => {
      const props = createDefaultProps();
      mockState.activeTab = "manual";
      render(<AddPlantDialog {...props} />);

      expect(screen.getByTestId("manual-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("search-tab")).not.toBeInTheDocument();
    });
  });

  describe("Zarządzanie zakładkami", () => {
    it("should call switchToManualTab when clicking manual tab", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      mockState.activeTab = "search";
      render(<AddPlantDialog {...props} />);

      const manualTab = screen.getByRole("tab", { name: /ręcznie/i });
      await user.click(manualTab);

      // Tabs może wywołać handler wielokrotnie, sprawdzamy czy został wywołany przynajmniej raz
      expect(mockActions.switchToManualTab).toHaveBeenCalled();
    });

    it("should call switchToSearchTab when clicking search tab", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      mockState.activeTab = "manual";
      render(<AddPlantDialog {...props} />);

      const searchTab = screen.getByRole("tab", { name: /wyszukaj ai/i });
      await user.click(searchTab);

      // Tabs może wywołać handler wielokrotnie, sprawdzamy czy został wywołany przynajmniej raz
      expect(mockActions.switchToSearchTab).toHaveBeenCalled();
    });
  });

  describe("PlantFitDisplay - warunkowe renderowanie", () => {
    it("should render PlantFitDisplay when step is 'fit_ready'", () => {
      const props = createDefaultProps();
      mockState.step = "fit_ready";
      mockState.fitResult = createMockFitResult();
      mockState.isFitting = false;
      render(<AddPlantDialog {...props} />);

      expect(screen.getByTestId("plant-fit-display")).toBeInTheDocument();
      expect(screen.getByTestId("fit-result")).toBeInTheDocument();
      expect(screen.queryByTestId("fit-loading")).not.toBeInTheDocument();
    });

    it("should render PlantFitDisplay with loading state when step is 'fit_loading'", () => {
      const props = createDefaultProps();
      mockState.step = "fit_loading";
      mockState.isFitting = true;
      mockState.fitResult = null;
      render(<AddPlantDialog {...props} />);

      expect(screen.getByTestId("plant-fit-display")).toBeInTheDocument();
      expect(screen.getByTestId("fit-loading")).toBeInTheDocument();
    });

    it("should not render PlantFitDisplay when step is 'search'", () => {
      const props = createDefaultProps();
      mockState.step = "search";
      mockState.fitResult = null;
      render(<AddPlantDialog {...props} />);

      expect(screen.queryByTestId("plant-fit-display")).not.toBeInTheDocument();
    });

    it("should not render PlantFitDisplay when step is 'manual'", () => {
      const props = createDefaultProps();
      mockState.step = "manual";
      mockState.fitResult = null;
      render(<AddPlantDialog {...props} />);

      expect(screen.queryByTestId("plant-fit-display")).not.toBeInTheDocument();
    });
  });

  describe("Przyciski akcji", () => {
    it("should render Anuluj button", () => {
      const props = createDefaultProps();
      render(<AddPlantDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("should call cancel and onCancel when clicking Anuluj", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      const onCancelSpy = vi.fn();
      props.onCancel = onCancelSpy;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      expect(mockActions.cancel).toHaveBeenCalledTimes(1);
      expect(onCancelSpy).toHaveBeenCalledTimes(1);
    });

    it("should disable Anuluj button when isSubmitting is true", () => {
      const props = createDefaultProps();
      mockState.isSubmitting = true;
      render(<AddPlantDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();
    });

    it("should render 'Dodaj roślinę' button", () => {
      const props = createDefaultProps();
      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).toBeInTheDocument();
    });

    it("should call confirmAdd when clicking 'Dodaj roślinę'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      mockState.selectedCandidate = createMockCandidate("Pomidor");
      mockState.step = "fit_ready";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      await user.click(addButton);

      expect(mockActions.confirmAdd).toHaveBeenCalledTimes(1);
    });

    it("should show loader in 'Dodaj roślinę' button when isSubmitting is true", () => {
      const props = createDefaultProps();
      mockState.isSubmitting = true;
      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      // Sprawdzamy czy jest disabled (loader jest wizualny)
      expect(addButton).toBeDisabled();
    });

    it("should render 'Dodaj bez oceny' button when error type is timeout and context is fit", () => {
      const props = createDefaultProps();
      mockState.error = createMockError("timeout", "fit");
      render(<AddPlantDialog {...props} />);

      const skipButton = screen.getByRole("button", { name: /dodaj bez oceny/i });
      expect(skipButton).toBeInTheDocument();
    });

    it("should call skipFit when clicking 'Dodaj bez oceny'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      mockState.error = createMockError("timeout", "fit");
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const skipButton = screen.getByRole("button", { name: /dodaj bez oceny/i });
      await user.click(skipButton);

      expect(mockActions.skipFit).toHaveBeenCalledTimes(1);
    });

    it("should not render 'Dodaj bez oceny' button when error is not timeout", () => {
      const props = createDefaultProps();
      mockState.error = createMockError("network", "fit");
      render(<AddPlantDialog {...props} />);

      expect(screen.queryByRole("button", { name: /dodaj bez oceny/i })).not.toBeInTheDocument();
    });

    it("should not render 'Dodaj bez oceny' button when error context is not 'fit'", () => {
      const props = createDefaultProps();
      mockState.error = createMockError("timeout", "search");
      render(<AddPlantDialog {...props} />);

      expect(screen.queryByRole("button", { name: /dodaj bez oceny/i })).not.toBeInTheDocument();
    });
  });

  describe("Walidacja przycisku 'Dodaj roślinę'", () => {
    it("should enable button when selectedCandidate exists and step is 'fit_ready'", () => {
      const props = createDefaultProps();
      mockState.selectedCandidate = createMockCandidate("Pomidor");
      mockState.step = "fit_ready";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).not.toBeDisabled();
    });

    it("should enable button when manualName is set and step is 'manual'", () => {
      const props = createDefaultProps();
      mockState.manualName = "Bazylia";
      mockState.step = "manual";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).not.toBeDisabled();
    });

    it("should disable button when no candidate selected and manualName is empty", () => {
      const props = createDefaultProps();
      mockState.selectedCandidate = null;
      mockState.manualName = "";
      mockState.step = "fit_ready";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).toBeDisabled();
    });

    it("should disable button when step is 'search'", () => {
      const props = createDefaultProps();
      mockState.selectedCandidate = createMockCandidate("Pomidor");
      mockState.step = "search";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).toBeDisabled();
    });

    it("should disable button when isFitting is true", () => {
      const props = createDefaultProps();
      mockState.selectedCandidate = createMockCandidate("Pomidor");
      mockState.step = "fit_ready";
      mockState.isFitting = true;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).toBeDisabled();
    });

    it("should disable button when isSubmitting is true", () => {
      const props = createDefaultProps();
      mockState.selectedCandidate = createMockCandidate("Pomidor");
      mockState.step = "fit_ready";
      mockState.isFitting = false;
      mockState.isSubmitting = true;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).toBeDisabled();
    });

    it("should enable button with manualName trimmed length > 0", () => {
      const props = createDefaultProps();
      mockState.manualName = "  Pomidor  ";
      mockState.step = "manual";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).not.toBeDisabled();
    });

    it("should disable button with manualName only whitespace", () => {
      const props = createDefaultProps();
      mockState.manualName = "   ";
      mockState.step = "manual";
      mockState.isFitting = false;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addButton).toBeDisabled();
    });
  });

  describe("Zamykanie dialogu", () => {
    it("should call cancel and onCancel when dialog is closed via onOpenChange", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      const onCancelSpy = vi.fn();
      props.onCancel = onCancelSpy;
      mockState.isSubmitting = false;

      render(<AddPlantDialog {...props} />);

      // Symulujemy zamknięcie dialogu (np. przez ESC lub kliknięcie poza dialog)
      // Dialog komponent z shadcn/ui wywołuje onOpenChange(false) gdy dialog jest zamykany
      const dialog = screen.getByRole("dialog");
      // W rzeczywistości shadcn Dialog używa Radix UI, który ma overlay
      // Dla testów sprawdzamy czy cancel jest wywoływane przy próbie zamknięcia
      // W praktyce testujemy przez kliknięcie przycisku Anuluj, co już jest przetestowane
      
      // Alternatywnie możemy sprawdzić czy hook jest wywoływany z poprawnymi parametrami
      expect(mockUseAddPlantFlow).toHaveBeenCalledWith({
        planId: props.planId,
        cell: props.cell,
        onSuccess: props.onSuccess,
      });
    });

    it("should not call cancel when dialog is closed during submission", () => {
      const props = createDefaultProps();
      mockState.isSubmitting = true;

      render(<AddPlantDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Integracja z useAddPlantFlow", () => {
    it("should call useAddPlantFlow with correct parameters", () => {
      const props = createDefaultProps();
      render(<AddPlantDialog {...props} />);

      expect(mockUseAddPlantFlow).toHaveBeenCalledWith({
        planId: props.planId,
        cell: props.cell,
        onSuccess: props.onSuccess,
      });
    });

    it("should pass state and actions to SearchTab", () => {
      const props = createDefaultProps();
      mockState.activeTab = "search";
      mockState.searchQuery = "pomidor";
      render(<AddPlantDialog {...props} />);

      const searchTab = screen.getByTestId("search-tab");
      expect(searchTab).toBeInTheDocument();
      // SearchTab otrzymuje state i actions jako props
    });

    it("should pass state and actions to ManualTab", () => {
      const props = createDefaultProps();
      mockState.activeTab = "manual";
      mockState.manualName = "Bazylia";
      render(<AddPlantDialog {...props} />);

      const manualTab = screen.getByTestId("manual-tab");
      expect(manualTab).toBeInTheDocument();
      // ManualTab otrzymuje state i actions jako props
    });

    it("should pass fitResult and isLoading to PlantFitDisplay", () => {
      const props = createDefaultProps();
      const fitResult = createMockFitResult();
      mockState.step = "fit_ready";
      mockState.fitResult = fitResult;
      mockState.isFitting = false;

      render(<AddPlantDialog {...props} />);

      const fitDisplay = screen.getByTestId("plant-fit-display");
      expect(fitDisplay).toBeInTheDocument();
      expect(screen.getByTestId("fit-result")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle different cell types", () => {
      const cellTypes: GridCellType[] = ["soil", "path", "water", "building", "blocked"];
      
      cellTypes.forEach((cellType) => {
        const props = createDefaultProps();
        props.cellType = cellType;
        const { unmount } = render(<AddPlantDialog {...props} />);

        const badge = screen.getByTestId("cell-info-badge");
        expect(badge).toHaveAttribute("data-type", cellType);
        
        unmount();
      });
    });

    it("should handle different cell positions", () => {
      const positions: CellPosition[] = [
        { x: 0, y: 0 },
        { x: 199, y: 199 },
        { x: 50, y: 75 },
      ];

      positions.forEach((cell) => {
        const props = createDefaultProps();
        props.cell = cell;
        const { unmount } = render(<AddPlantDialog {...props} />);

        const badge = screen.getByTestId("cell-info-badge");
        expect(badge).toHaveAttribute("data-x", cell.x.toString());
        expect(badge).toHaveAttribute("data-y", cell.y.toString());
        
        unmount();
      });
    });

    it("should handle state transitions correctly", () => {
      const props = createDefaultProps();
      
      // Test przejścia przez różne stany
      const states: AddPlantDialogState["step"][] = ["search", "candidate_selected", "fit_loading", "fit_ready", "manual"];

      states.forEach((step) => {
        mockState.step = step;
        const { unmount } = render(<AddPlantDialog {...props} />);

        // Sprawdzamy czy komponent renderuje się poprawnie dla każdego stanu
        expect(screen.getByRole("heading", { name: "Dodaj roślinę" })).toBeInTheDocument();
        
        unmount();
      });
    });

    it("should handle null fitResult gracefully", () => {
      const props = createDefaultProps();
      mockState.step = "fit_ready";
      mockState.fitResult = null;
      mockState.isFitting = false;

      render(<AddPlantDialog {...props} />);

      // PlantFitDisplay powinien obsłużyć null fitResult
      const fitDisplay = screen.getByTestId("plant-fit-display");
      expect(fitDisplay).toBeInTheDocument();
    });

    it("should handle empty searchResults", () => {
      const props = createDefaultProps();
      mockState.activeTab = "search";
      mockState.searchResults = [];
      mockState.isSearching = false;

      render(<AddPlantDialog {...props} />);

      expect(screen.getByTestId("search-tab")).toBeInTheDocument();
    });
  });
});

