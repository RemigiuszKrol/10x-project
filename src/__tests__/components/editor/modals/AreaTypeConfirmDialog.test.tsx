import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AreaTypeConfirmDialog } from "@/components/editor/modals/AreaTypeConfirmDialog";
import type { CellSelection, GridCellType } from "@/types";
import { GRID_CELL_TYPE_LABELS } from "@/types";

// Helper functions dla danych testowych
function createMockArea(x1: number, y1: number, x2: number, y2: number): CellSelection {
  return { x1, y1, x2, y2 };
}

function createDefaultProps() {
  const mockArea = createMockArea(5, 5, 10, 8);
  const mockOnConfirm = vi.fn(async () => {
    await Promise.resolve();
  });
  const mockOnCancel = vi.fn();

  return {
    isOpen: true,
    plantsCount: 3,
    area: mockArea,
    targetType: "path" as GridCellType,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };
}

describe("AreaTypeConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render dialog when isOpen is true", () => {
      const props = createDefaultProps();
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("Usunąć rośliny?")).toBeInTheDocument();
    });

    it("should not render dialog content when isOpen is false", () => {
      const props = createDefaultProps();
      props.isOpen = false;
      render(<AreaTypeConfirmDialog {...props} />);

      // AlertDialog może być w DOM, ale nie powinien być widoczny
      const dialog = screen.queryByRole("alertdialog");
      // Sprawdzamy czy dialog nie jest widoczny (może być w DOM ale ukryty)
      if (dialog) {
        expect(dialog).not.toBeVisible();
      }
    });

    it("should display correct title", () => {
      const props = createDefaultProps();
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText("Usunąć rośliny?")).toBeInTheDocument();
    });

    it("should display area dimensions correctly", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 0, 4, 3); // width: 5, height: 4
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/5×4/)).toBeInTheDocument();
    });

    it("should display cell count correctly for single cell", () => {
      const props = createDefaultProps();
      props.area = createMockArea(5, 5, 5, 5); // 1 komórka
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1 komórka/)).toBeInTheDocument();
    });

    it("should display cell count correctly for multiple cells", () => {
      const props = createDefaultProps();
      props.area = createMockArea(5, 5, 10, 8); // 6×4 = 24 komórki
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/24 komórek/)).toBeInTheDocument();
    });

    it("should display target type label correctly", () => {
      const props = createDefaultProps();
      props.targetType = "water";
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(new RegExp(GRID_CELL_TYPE_LABELS.water))).toBeInTheDocument();
    });

    it("should display all grid cell type labels correctly", () => {
      const types: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

      types.forEach((type) => {
        const props = createDefaultProps();
        props.targetType = type;
        const { unmount } = render(<AreaTypeConfirmDialog {...props} />);

        expect(screen.getByText(new RegExp(GRID_CELL_TYPE_LABELS[type]))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Formatowanie liczby roślin", () => {
    it("should display 'roślinę' for 1 plant", () => {
      const props = createDefaultProps();
      props.plantsCount = 1;
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1 roślinę/)).toBeInTheDocument();
    });

    it("should display 'rośliny' for 2-4 plants", () => {
      const props = createDefaultProps();

      // Test dla 2 roślin
      props.plantsCount = 2;
      const { unmount: unmount2 } = render(<AreaTypeConfirmDialog {...props} />);
      expect(screen.getByText(/2 rośliny/)).toBeInTheDocument();
      unmount2();

      // Test dla 3 roślin
      props.plantsCount = 3;
      const { unmount: unmount3 } = render(<AreaTypeConfirmDialog {...props} />);
      expect(screen.getByText(/3 rośliny/)).toBeInTheDocument();
      unmount3();

      // Test dla 4 roślin
      props.plantsCount = 4;
      render(<AreaTypeConfirmDialog {...props} />);
      expect(screen.getByText(/4 rośliny/)).toBeInTheDocument();
    });

    it("should display 'roślin' for 5+ plants", () => {
      const props = createDefaultProps();

      // Test dla 5 roślin
      props.plantsCount = 5;
      const { unmount: unmount5 } = render(<AreaTypeConfirmDialog {...props} />);
      expect(screen.getByText(/5 roślin/)).toBeInTheDocument();
      unmount5();

      // Test dla 10 roślin
      props.plantsCount = 10;
      const { unmount: unmount10 } = render(<AreaTypeConfirmDialog {...props} />);
      expect(screen.getByText(/10 roślin/)).toBeInTheDocument();
      unmount10();

      // Test dla 100 roślin
      props.plantsCount = 100;
      render(<AreaTypeConfirmDialog {...props} />);
      expect(screen.getByText(/100 roślin/)).toBeInTheDocument();
    });

    it("should display correct plants count in message", () => {
      const props = createDefaultProps();
      props.plantsCount = 7;
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/7 roślin/)).toBeInTheDocument();
    });
  });

  describe("Obliczanie wymiarów obszaru", () => {
    it("should calculate width correctly", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 0, 9, 0); // width: 10
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/10×1/)).toBeInTheDocument();
    });

    it("should calculate height correctly", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 0, 0, 19); // height: 20
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1×20/)).toBeInTheDocument();
    });

    it("should calculate cell count correctly for rectangular area", () => {
      const props = createDefaultProps();
      props.area = createMockArea(5, 5, 14, 9); // 10×5 = 50 komórek
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/10×5/)).toBeInTheDocument();
      expect(screen.getByText(/50 komórek/)).toBeInTheDocument();
    });

    it("should handle single cell area", () => {
      const props = createDefaultProps();
      props.area = createMockArea(10, 10, 10, 10); // 1×1 = 1 komórka
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1×1/)).toBeInTheDocument();
      expect(screen.getByText(/1 komórka/)).toBeInTheDocument();
    });

    it("should handle large area", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 0, 99, 99); // 100×100 = 10000 komórek
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/100×100/)).toBeInTheDocument();
      expect(screen.getByText(/10000 komórek/)).toBeInTheDocument();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("should call onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<AreaTypeConfirmDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      expect(props.onCancel).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm when confirm button is clicked", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<AreaTypeConfirmDialog {...props} />);

      const confirmButton = screen.getByRole("button", { name: /potwierdź i usuń/i });
      await user.click(confirmButton);

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onCancel).not.toHaveBeenCalled();
    });

    it("should handle async onConfirm correctly", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      props.onConfirm = vi.fn(async () => {
        await promise;
      });

      render(<AreaTypeConfirmDialog {...props} />);

      const confirmButton = screen.getByRole("button", { name: /potwierdź i usuń/i });
      await user.click(confirmButton);

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      resolvePromise!();
      await waitFor(() => {
        expect(props.onConfirm).toHaveBeenCalled();
      });
    });

    it("should not call callbacks when dialog is closed", () => {
      const props = createDefaultProps();
      props.isOpen = false;
      render(<AreaTypeConfirmDialog {...props} />);

      // Dialog nie powinien być interaktywny gdy isOpen=false
      expect(props.onCancel).not.toHaveBeenCalled();
      expect(props.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Wyświetlanie treści", () => {
    it("should display complete confirmation message", () => {
      const props = createDefaultProps();
      props.area = createMockArea(5, 5, 10, 8); // 6×4 = 24 komórki
      props.plantsCount = 5;
      props.targetType = "water";
      render(<AreaTypeConfirmDialog {...props} />);

      // Sprawdzamy czy wszystkie elementy są obecne
      expect(screen.getByText("Usunąć rośliny?")).toBeInTheDocument();
      expect(screen.getByText(/Zmiana typu na/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(GRID_CELL_TYPE_LABELS.water))).toBeInTheDocument();
      expect(screen.getByText(/6×4/)).toBeInTheDocument();
      expect(screen.getByText(/24 komórek/)).toBeInTheDocument();
      expect(screen.getByText(/5 roślin/)).toBeInTheDocument();
      expect(screen.getByText(/Czy chcesz kontynuować\?/)).toBeInTheDocument();
    });

    it("should display destructive styling on confirm button", () => {
      const props = createDefaultProps();
      render(<AreaTypeConfirmDialog {...props} />);

      const confirmButton = screen.getByRole("button", { name: /potwierdź i usuń/i });
      expect(confirmButton).toHaveClass("bg-destructive");
    });

    it("should display both action buttons", () => {
      const props = createDefaultProps();
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /potwierdź i usuń/i })).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle zero plants count", () => {
      const props = createDefaultProps();
      props.plantsCount = 0;
      render(<AreaTypeConfirmDialog {...props} />);

      // Powinno wyświetlić "0 roślin" (edge case - nie powinno się zdarzyć w praktyce)
      expect(screen.getByText(/0 roślin/)).toBeInTheDocument();
    });

    it("should handle very large plants count", () => {
      const props = createDefaultProps();
      props.plantsCount = 1000;
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1000 roślin/)).toBeInTheDocument();
    });

    it("should handle area with same x coordinates", () => {
      const props = createDefaultProps();
      props.area = createMockArea(5, 0, 5, 10); // width: 1, height: 11
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1×11/)).toBeInTheDocument();
    });

    it("should handle area with same y coordinates", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 5, 10, 5); // width: 11, height: 1
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/11×1/)).toBeInTheDocument();
    });

    it("should handle minimum area (1×1)", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 0, 0, 0);
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/1×1/)).toBeInTheDocument();
      expect(screen.getByText(/1 komórka/)).toBeInTheDocument();
    });
  });

  describe("Integracja z typami", () => {
    it("should accept all valid GridCellType values", () => {
      const types: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

      types.forEach((type) => {
        const props = createDefaultProps();
        props.targetType = type;
        const { unmount } = render(<AreaTypeConfirmDialog {...props} />);

        expect(screen.getByText(new RegExp(GRID_CELL_TYPE_LABELS[type]))).toBeInTheDocument();
        unmount();
      });
    });

    it("should handle CellSelection with valid coordinates", () => {
      const props = createDefaultProps();
      props.area = createMockArea(0, 0, 199, 199); // maksymalny obszar
      render(<AreaTypeConfirmDialog {...props} />);

      expect(screen.getByText(/200×200/)).toBeInTheDocument();
      expect(screen.getByText(/40000 komórek/)).toBeInTheDocument();
    });
  });
});

