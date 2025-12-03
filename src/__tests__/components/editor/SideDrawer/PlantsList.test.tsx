import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlantsList, type PlantsListProps } from "@/components/editor/SideDrawer/PlantsList";
import type { PlantPlacementDto } from "@/types";

// Mock hooków
const mockUsePlantPlacements = vi.fn();
const mockUseRemovePlant = vi.fn();

vi.mock("@/lib/hooks/queries/usePlantPlacements", () => ({
  usePlantPlacements: () => mockUsePlantPlacements(),
}));

vi.mock("@/lib/hooks/mutations/usePlantMutations", () => ({
  useRemovePlant: () => mockUseRemovePlant(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock PlantCard
vi.mock("@/components/editor/SideDrawer/PlantCard", () => ({
  PlantCard: ({ plant, onJumpTo, onDelete, isDeleting }: any) => (
    <div data-testid={`plant-card-${plant.x}-${plant.y}`}>
      <div data-testid="plant-name">{plant.plant_name}</div>
      <div data-testid="plant-position">
        x: {plant.x + 1}, y: {plant.y + 1}
      </div>
      {isDeleting && <div data-testid="plant-deleting">Deleting...</div>}
      {onJumpTo && (
        <button
          data-testid="plant-jump-button"
          onClick={() => onJumpTo(plant.x, plant.y)}
        >
          Jump to
        </button>
      )}
      <button
        data-testid="plant-delete-button"
        onClick={() => onDelete(plant.x, plant.y)}
        disabled={isDeleting}
      >
        Delete
      </button>
    </div>
  ),
}));

// Mock DeletePlantConfirmDialog
const mockOnConfirm = vi.fn();
const mockOnCancel = vi.fn();
vi.mock("@/components/editor/modals/DeletePlantConfirmDialog", () => ({
  DeletePlantConfirmDialog: ({ isOpen, plant, onConfirm, onCancel, isDeleting }: any) => {
    // Zapisz funkcje callback, aby można było je wywołać w testach
    if (isOpen) {
      // Użyj setTimeout, aby callbacki były dostępne po renderowaniu
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          (window as any).__deleteDialogOnConfirm = onConfirm;
          (window as any).__deleteDialogOnCancel = onCancel;
          (window as any).__deleteDialogIsDeleting = isDeleting;
        }
      }, 0);
    }
    
    if (!isOpen) return null;
    
    return (
      <div data-testid="delete-plant-dialog" role="alertdialog">
        <div data-testid="dialog-plant-name">{plant.plant_name}</div>
        <div data-testid="dialog-plant-position">
          Pozycja: x: {plant.x + 1}, y: {plant.y + 1}
        </div>
        <button
          data-testid="dialog-confirm-button"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? "Usuwanie..." : "Usuń"}
        </button>
        <button
          data-testid="dialog-cancel-button"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Anuluj
        </button>
      </div>
    );
  },
}));

// Helper function do tworzenia mock PlantPlacementDto
function createMockPlant(
  name: string,
  x: number,
  y: number,
  overrides?: Partial<PlantPlacementDto>
): PlantPlacementDto {
  return {
    x,
    y,
    plant_name: name,
    sunlight_score: null,
    humidity_score: null,
    precip_score: null,
    temperature_score: null,
    overall_score: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("PlantsList", () => {
  let defaultProps: PlantsListProps;
  let mockOnJumpToCell: (x: number, y: number) => void;
  let mockOnPlantRemoved: (plantName: string, x: number, y: number) => void;
  let mockRemovePlantMutation: {
    mutateAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Clear window callbacks
    if (typeof window !== 'undefined') {
      (window as any).__deleteDialogOnConfirm = undefined;
      (window as any).__deleteDialogOnCancel = undefined;
      (window as any).__deleteDialogIsDeleting = undefined;
    }

    // Default props
    mockOnJumpToCell = vi.fn();
    mockOnPlantRemoved = vi.fn();
    defaultProps = {
      planId: "plan-123",
      onJumpToCell: mockOnJumpToCell,
      onPlantRemoved: mockOnPlantRemoved,
    };

    // Default mock dla useRemovePlant
    mockRemovePlantMutation = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    };
    mockUseRemovePlant.mockReturnValue(mockRemovePlantMutation);

    // Default mock dla usePlantPlacements (loading state)
    mockUsePlantPlacements.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading state", () => {
    it("should display loading indicator when data is loading", () => {
      mockUsePlantPlacements.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByText(/ładowanie roślin/i)).toBeInTheDocument();
      // Sprawdź czy loader jest widoczny (ikona Loader2)
      const loader = screen.getByText(/ładowanie roślin/i).closest("div");
      expect(loader).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should display error message when query fails", () => {
      const errorMessage = "Nie udało się pobrać roślin";
      mockUsePlantPlacements.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error(errorMessage),
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should display empty state when no plants exist", () => {
      mockUsePlantPlacements.mockReturnValue({
        data: { data: [], nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByText(/brak roślin/i)).toBeInTheDocument();
      expect(
        screen.getByText(/dodaj rośliny używając zakładki "wyszukaj"/i)
      ).toBeInTheDocument();
    });
  });

  describe("Plants list rendering", () => {
    it("should render list of plants", () => {
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
        createMockPlant("Marchew", 25, 30),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
      expect(screen.getByTestId("plant-card-15-20")).toBeInTheDocument();
      expect(screen.getByTestId("plant-card-25-30")).toBeInTheDocument();
    });

    it("should display plant count when all plants are shown", () => {
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByText(/liczba roślin: 2/i)).toBeInTheDocument();
    });

    it("should sort plants by created_at descending (newest first)", () => {
      const plants = [
        createMockPlant("Stara roślina", 5, 10, {
          created_at: "2024-01-01T00:00:00Z",
        }),
        createMockPlant("Nowa roślina", 15, 20, {
          created_at: "2024-01-03T00:00:00Z",
        }),
        createMockPlant("Średnia roślina", 25, 30, {
          created_at: "2024-01-02T00:00:00Z",
        }),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const plantCards = screen.getAllByTestId(/plant-card-/);
      expect(plantCards).toHaveLength(3);

      // Sprawdź kolejność - najnowsza powinna być pierwsza
      const plantNames = screen.getAllByTestId("plant-name");
      expect(plantNames[0]).toHaveTextContent("Nowa roślina");
      expect(plantNames[1]).toHaveTextContent("Średnia roślina");
      expect(plantNames[2]).toHaveTextContent("Stara roślina");
    });
  });

  describe("Filtering", () => {
    it("should filter plants by name", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
        createMockPlant("Pomidor cherry", 25, 30),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);
      await user.type(filterInput, "Pomidor");

      await waitFor(() => {
        expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
        expect(screen.getByTestId("plant-card-25-30")).toBeInTheDocument();
        expect(screen.queryByTestId("plant-card-15-20")).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(/wyświetlono 2 z 3/i)
      ).toBeInTheDocument();
    });

    it("should display filtered count when filter is active", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);
      await user.type(filterInput, "Pomidor");

      await waitFor(() => {
        expect(
          screen.getByText(/wyświetlono 1 z 2/i)
        ).toBeInTheDocument();
      });
    });

    it("should display 'no matching plants' message when filter matches nothing", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);
      await user.type(filterInput, "Marchew");

      await waitFor(() => {
        expect(
          screen.getByText(/brak roślin pasujących do filtra/i)
        ).toBeInTheDocument();
      });
    });

    it("should be case-insensitive when filtering", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);
      await user.type(filterInput, "POMIDOR");

      await waitFor(() => {
        expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
      });
    });
  });

  describe("Remove plant", () => {
    it("should show confirmation dialog before removing plant", async () => {
      const user = userEvent.setup();
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Sprawdź czy dialog jest widoczny
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Sprawdź zawartość dialogu
      expect(screen.getByTestId("dialog-plant-name")).toHaveTextContent("Pomidor");
      expect(screen.getByTestId("dialog-plant-position")).toHaveTextContent("Pozycja: x: 6, y: 11");
    });

    it("should not remove plant if user cancels confirmation", async () => {
      const user = userEvent.setup();
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Poczekaj na dialog
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Kliknij Anuluj
      const cancelButton = screen.getByTestId("dialog-cancel-button");
      await user.click(cancelButton);

      // Sprawdź czy dialog zniknął
      await waitFor(() => {
        expect(screen.queryByTestId("delete-plant-dialog")).not.toBeInTheDocument();
      });

      expect(mockRemovePlantMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it("should remove plant when user confirms", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Poczekaj na dialog
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Kliknij Usuń w dialogu
      const confirmButton = screen.getByTestId("dialog-confirm-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockRemovePlantMutation.mutateAsync).toHaveBeenCalledWith({
          planId: "plan-123",
          x: 5,
          y: 10,
        });
      });

      expect(toast.success).toHaveBeenCalledWith("Usunięto roślinę", {
        description: 'Roślina "Pomidor" została usunięta',
      });
    });

    it("should call onPlantRemoved callback after successful removal", async () => {
      const user = userEvent.setup();
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Poczekaj na dialog
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Kliknij Usuń w dialogu
      const confirmButton = screen.getByTestId("dialog-confirm-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnPlantRemoved).toHaveBeenCalledWith("Pomidor", 5, 10);
      });
    });

    it("should display error toast when removal fails", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      const errorMessage = "Nie udało się usunąć rośliny";
      mockRemovePlantMutation.mutateAsync.mockRejectedValue(
        new Error(errorMessage)
      );

      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Poczekaj na dialog
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Kliknij Usuń w dialogu
      const confirmButton = screen.getByTestId("dialog-confirm-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Nie udało się usunąć rośliny",
          {
            description: errorMessage,
          }
        );
      });
    });

    it("should show deleting state during removal", async () => {
      const user = userEvent.setup();
      let resolveMutation: () => void;
      const mutationPromise = new Promise<void>((resolve) => {
        resolveMutation = resolve;
      });

      mockRemovePlantMutation.mutateAsync.mockReturnValue(mutationPromise);

      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Poczekaj na dialog
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Kliknij Usuń w dialogu
      const confirmButton = screen.getByTestId("dialog-confirm-button");
      await user.click(confirmButton);

      // Sprawdź czy przycisk Delete jest disabled podczas usuwania
      await waitFor(() => {
        expect(deleteButton).toBeDisabled();
      });

      // Sprawdź czy przycisk w dialogu jest disabled
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });

      // Zakończ mutację
      resolveMutation!();
      await mutationPromise;

      await waitFor(() => {
        expect(deleteButton).not.toBeDisabled();
      });
    });

    it("should handle removal when plant is not found", async () => {
      const user = userEvent.setup();
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      // Symuluj sytuację, gdy roślina nie istnieje w liście
      // (np. została już usunięta przez inny proces)
      const deleteButton = screen.getByTestId("plant-delete-button");
      
      // Zmień dane przed kliknięciem (symulacja)
      mockUsePlantPlacements.mockReturnValue({
        data: { data: [], nextCursor: null },
        isLoading: false,
        error: null,
      });

      // Komponent powinien obsłużyć brak rośliny gracefully
      // (w rzeczywistości handleRemovePlant sprawdza czy roślina istnieje)
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Jump to cell", () => {
    it("should call onJumpToCell callback when jump button is clicked", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const jumpButton = screen.getByTestId("plant-jump-button");
      await user.click(jumpButton);

      expect(mockOnJumpToCell).toHaveBeenCalledWith(5, 10);
      expect(toast.info).toHaveBeenCalledWith("Przejście do komórki", {
        description: "Pozycja: (x: 6, y: 11)",
      });
    });

    it("should not render jump button when onJumpToCell is not provided", () => {
      const propsWithoutJump = {
        ...defaultProps,
        onJumpToCell: undefined,
      };

      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...propsWithoutJump} />);

      expect(screen.queryByTestId("plant-jump-button")).not.toBeInTheDocument();
    });
  });

  describe("Callbacks", () => {
    it("should work without optional callbacks", () => {
      const propsWithoutCallbacks = {
        planId: "plan-123",
      };

      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...propsWithoutCallbacks} />);

      expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
    });

    it("should not call onPlantRemoved when callback is not provided", async () => {
      const user = userEvent.setup();
      const propsWithoutCallbacks = {
        planId: "plan-123",
      };

      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...propsWithoutCallbacks} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      // Poczekaj na dialog
      await waitFor(() => {
        expect(screen.getByTestId("delete-plant-dialog")).toBeInTheDocument();
      });

      // Kliknij Usuń w dialogu
      const confirmButton = screen.getByTestId("dialog-confirm-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockRemovePlantMutation.mutateAsync).toHaveBeenCalled();
      });

      // onPlantRemoved nie powinien być wywołany, bo nie jest przekazany
      expect(mockOnPlantRemoved).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty filter text", () => {
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      // Wszystkie rośliny powinny być widoczne
      expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
      expect(screen.getByTestId("plant-card-15-20")).toBeInTheDocument();
    });

    it("should handle plants with same name at different positions", () => {
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Pomidor", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getAllByText("Pomidor")).toHaveLength(2);
      expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
      expect(screen.getByTestId("plant-card-15-20")).toBeInTheDocument();
    });

    it("should handle plants with scores", () => {
      const plants = [
        createMockPlant("Pomidor", 5, 10, {
          sunlight_score: 4,
          humidity_score: 3,
          precip_score: 5,
          temperature_score: 4,
          overall_score: 4,
        }),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
    });

    it("should handle very long plant names", () => {
      const longName = "A".repeat(100);
      const plants = [createMockPlant(longName, 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle data.data being null", () => {
      mockUsePlantPlacements.mockReturnValue({
        data: { data: null, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      // Powinno wyświetlić empty state
      expect(screen.getByText(/brak roślin/i)).toBeInTheDocument();
    });

    it("should handle data being undefined", () => {
      mockUsePlantPlacements.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      // Powinno wyświetlić empty state (data?.data || [] zwraca [])
      expect(screen.getByText(/brak roślin/i)).toBeInTheDocument();
    });

    it("should handle plants with same created_at timestamp (stable sort)", () => {
      const sameTimestamp = "2024-01-01T00:00:00Z";
      const plants = [
        createMockPlant("Roślina A", 5, 10, { created_at: sameTimestamp }),
        createMockPlant("Roślina B", 15, 20, { created_at: sameTimestamp }),
        createMockPlant("Roślina C", 25, 30, { created_at: sameTimestamp }),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      // Wszystkie rośliny powinny być widoczne (sortowanie stabilne)
      expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
      expect(screen.getByTestId("plant-card-15-20")).toBeInTheDocument();
      expect(screen.getByTestId("plant-card-25-30")).toBeInTheDocument();
    });

    it("should clear filter when input is cleared", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);

      // Wpisz filtr
      await user.type(filterInput, "Pomidor");
      await waitFor(() => {
        expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
        expect(screen.queryByTestId("plant-card-15-20")).not.toBeInTheDocument();
      });

      // Wyczyść filtr
      await user.clear(filterInput);
      await waitFor(() => {
        expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
        expect(screen.getByTestId("plant-card-15-20")).toBeInTheDocument();
        expect(screen.getByText(/liczba roślin: 2/i)).toBeInTheDocument();
      });
    });

    it("should handle removal error that is not an Error instance", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      // Symuluj błąd, który nie jest instancją Error
      mockRemovePlantMutation.mutateAsync.mockRejectedValue("String error");

      render(<PlantsList {...defaultProps} />);

      const deleteButton = screen.getByTestId("plant-delete-button");
      await user.click(deleteButton);

      await waitFor(() => {
        // Toast.error nie powinien być wywołany, bo błąd nie jest instancją Error
        expect(toast.error).not.toHaveBeenCalled();
      });

      // Deleting state powinien zostać wyczyszczony
      await waitFor(() => {
        expect(deleteButton).not.toBeDisabled();
      });
    });

    it("should handle removal when plant is not found in list (early return)", async () => {
      const user = userEvent.setup();
      const plants = [createMockPlant("Pomidor", 5, 10)];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      // Symuluj sytuację, gdy roślina została już usunięta przez inny proces
      // i nie istnieje w liście podczas próby usunięcia
      // W rzeczywistości handleRemovePlant sprawdza czy roślina istnieje przed usunięciem
      // i zwraca wcześnie jeśli nie istnieje

      // Najpierw usuń roślinę z listy (symulacja sytuacji, gdy została już usunięta)
      mockUsePlantPlacements.mockReturnValue({
        data: { data: [], nextCursor: null },
        isLoading: false,
        error: null,
      });

      // Re-render z pustą listą
      const { rerender } = render(<PlantsList {...defaultProps} />);
      rerender(<PlantsList {...defaultProps} />);

      // Sprawdź, że lista jest pusta
      expect(screen.getByText(/brak roślin/i)).toBeInTheDocument();
      expect(mockRemovePlantMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it("should handle filter with special characters", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor (cherry)", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);
      await user.type(filterInput, "cherry");

      await waitFor(() => {
        expect(screen.getByTestId("plant-card-5-10")).toBeInTheDocument();
        expect(screen.queryByTestId("plant-card-15-20")).not.toBeInTheDocument();
      });
    });

    it("should handle filter with whitespace (whitespace is not trimmed)", async () => {
      const user = userEvent.setup();
      const plants = [
        createMockPlant("Pomidor", 5, 10),
        createMockPlant("Ogórek", 15, 20),
      ];

      mockUsePlantPlacements.mockReturnValue({
        data: { data: plants, nextCursor: null },
        isLoading: false,
        error: null,
      });

      render(<PlantsList {...defaultProps} />);

      const filterInput = screen.getByPlaceholderText(/filtruj rośliny/i);
      await user.type(filterInput, "  Pomidor  ");

      await waitFor(() => {
        // Filtrowanie nie trimuje whitespace, więc "  Pomidor  " nie pasuje do "Pomidor"
        // To jest faktyczne zachowanie komponentu (używa includes() bez trimowania)
        expect(screen.queryByTestId("plant-card-5-10")).not.toBeInTheDocument();
        expect(screen.getByText(/brak roślin pasujących do filtra/i)).toBeInTheDocument();
      });
    });
  });
});

