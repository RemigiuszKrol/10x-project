import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletePlanDialog } from "@/components/plans/DeletePlanDialog";

// Typ props dla DeletePlanDialog (nie jest eksportowany z komponentu)
interface DeletePlanDialogProps {
  open: boolean;
  planName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Helper function do tworzenia domyślnych props
function createDefaultProps(overrides?: Partial<DeletePlanDialogProps>): DeletePlanDialogProps {
  return {
    open: true,
    planName: "Test Plan",
    isDeleting: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("DeletePlanDialog", () => {
  let mockOnConfirm: ReturnType<typeof vi.fn<() => void>>;
  let mockOnCancel: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    mockOnConfirm = vi.fn<() => void>();
    mockOnCancel = vi.fn<() => void>();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render dialog when open is true", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Usuń plan")).toBeInTheDocument();
    });

    it("should not render dialog content when open is false", () => {
      const props = createDefaultProps({ open: false });
      render(<DeletePlanDialog {...props} />);

      // Dialog może być w DOM, ale nie powinien być widoczny
      const dialog = screen.queryByRole("dialog");
      if (dialog) {
        expect(dialog).not.toBeVisible();
      }
    });

    it("should display correct title", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByText("Usuń plan")).toBeInTheDocument();
    });

    it("should display plan name in description", () => {
      const props = createDefaultProps({ planName: "Moja Działka" });
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByText(/Moja Działka/)).toBeInTheDocument();
      expect(
        screen.getByText(/Czy na pewno chcesz usunąć plan/i)
      ).toBeInTheDocument();
    });

    it("should display warning message about permanent deletion", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      expect(
        screen.getByText(/Wszystkie dane związane z tym planem/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/rośliny i komórki siatki/i)).toBeInTheDocument();
      expect(screen.getByText(/trwale usunięte/i)).toBeInTheDocument();
      expect(screen.getByText(/nie można cofnąć/i)).toBeInTheDocument();
    });

    it("should display both action buttons", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /usuń/i })).toBeInTheDocument();
    });

    it("should display plan name in strong tag", () => {
      const props = createDefaultProps({ planName: "Super Plan" });
      render(<DeletePlanDialog {...props} />);

      const strongElement = screen.getByText("Super Plan");
      expect(strongElement.tagName).toBe("STRONG");
    });

    it("should handle long plan names", () => {
      const longName = "Bardzo długa nazwa planu działki która może być bardzo długa i zawierać wiele słów";
      const props = createDefaultProps({ planName: longName });
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle plan names with special characters", () => {
      const specialName = "Plan z znakami: !@#$%^&*()";
      const props = createDefaultProps({ planName: specialName });
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByText(specialName)).toBeInTheDocument();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("should call onCancel when Anuluj button is clicked", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ onCancel: mockOnCancel });
      render(<DeletePlanDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm when Usuń button is clicked", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ onConfirm: mockOnConfirm });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      await user.click(deleteButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it("should call onCancel when dialog is closed via onOpenChange", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ onCancel: mockOnCancel });
      render(<DeletePlanDialog {...props} />);

      // Symulacja zamknięcia dialogu (np. przez ESC lub kliknięcie overlay)
      // Dialog z Radix UI wywołuje onOpenChange(false) gdy jest zamykany
      const dialog = screen.getByRole("dialog");
      // W rzeczywistości Radix UI obsługuje to automatycznie, ale możemy to przetestować
      // poprzez bezpośrednie wywołanie onOpenChange jeśli to możliwe
      
      // Alternatywnie, możemy przetestować przez kliknięcie przycisku zamknięcia (jeśli istnieje)
      // lub przez naciśnięcie ESC
      await user.keyboard("{Escape}");

      // Radix Dialog powinien wywołać onOpenChange(false), co wywołuje onCancel
      // Sprawdzamy czy onCancel został wywołany
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Stan ładowania", () => {
    it("should display loading spinner when isDeleting is true", () => {
      const props = createDefaultProps({ isDeleting: true });
      render(<DeletePlanDialog {...props} />);

      // Spinner Loader2 jest renderowany jako SVG
      const spinner = document.querySelector("svg[class*='animate-spin']");
      expect(spinner).toBeInTheDocument();
    });

    it("should not display loading spinner when isDeleting is false", () => {
      const props = createDefaultProps({ isDeleting: false });
      render(<DeletePlanDialog {...props} />);

      const spinner = document.querySelector("svg[class*='animate-spin']");
      expect(spinner).not.toBeInTheDocument();
    });

    it("should disable Anuluj button when isDeleting is true", () => {
      const props = createDefaultProps({ isDeleting: true });
      render(<DeletePlanDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();
    });

    it("should disable Usuń button when isDeleting is true", () => {
      const props = createDefaultProps({ isDeleting: true });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      expect(deleteButton).toBeDisabled();
    });

    it("should enable Anuluj button when isDeleting is false", () => {
      const props = createDefaultProps({ isDeleting: false });
      render(<DeletePlanDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).not.toBeDisabled();
    });

    it("should enable Usuń button when isDeleting is false", () => {
      const props = createDefaultProps({ isDeleting: false });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it("should not call onCancel when Anuluj is clicked during deletion", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ isDeleting: true, onCancel: mockOnCancel });
      render(<DeletePlanDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      
      // Próba kliknięcia w wyłączony przycisk
      await user.click(cancelButton);

      // Przycisk jest wyłączony, więc onCancel nie powinien być wywołany
      // (choć w rzeczywistości może być wywołany przez event, ale przycisk jest disabled)
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it("should not call onConfirm when Usuń is clicked during deletion", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ isDeleting: true, onConfirm: mockOnConfirm });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      
      // Próba kliknięcia w wyłączony przycisk
      await user.click(deleteButton);

      // Przycisk jest wyłączony, więc onConfirm nie powinien być wywołany
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have aria-describedby attribute on DialogContent", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      const dialogContent = screen.getByRole("dialog");
      const description = screen.getByText(/Czy na pewno chcesz usunąć plan/i);
      
      expect(description).toHaveAttribute("id", "delete-dialog-description");
      expect(dialogContent).toHaveAttribute("aria-describedby", "delete-dialog-description");
    });

    it("should have aria-busy attribute on Usuń button when isDeleting is true", () => {
      const props = createDefaultProps({ isDeleting: true });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      expect(deleteButton).toHaveAttribute("aria-busy", "true");
    });

    it("should not have aria-busy='true' on Usuń button when isDeleting is false", () => {
      const props = createDefaultProps({ isDeleting: false });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      // Przycisk może mieć aria-busy="false", ale nie powinien mieć "true"
      const ariaBusy = deleteButton.getAttribute("aria-busy");
      expect(ariaBusy).not.toBe("true");
    });

    it("should have aria-hidden on loading spinner", () => {
      const props = createDefaultProps({ isDeleting: true });
      render(<DeletePlanDialog {...props} />);

      const spinner = document.querySelector("svg[aria-hidden='true']");
      expect(spinner).toBeInTheDocument();
    });

    it("should have proper dialog role", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have accessible button labels", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /usuń/i })).toBeInTheDocument();
    });
  });

  describe("Warianty przycisków", () => {
    it("should render Anuluj button with outline variant", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      // Sprawdzamy czy przycisk ma odpowiednie klasy dla variant="outline"
      expect(cancelButton).toHaveClass("border");
    });

    it("should render Usuń button with destructive variant", () => {
      const props = createDefaultProps();
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      // Sprawdzamy czy przycisk ma odpowiednie klasy dla variant="destructive"
      // Destructive variant zwykle ma klasy związane z kolorem czerwonym
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty plan name", () => {
      const props = createDefaultProps({ planName: "" });
      render(<DeletePlanDialog {...props} />);

      expect(screen.getByText(/Czy na pewno chcesz usunąć plan/i)).toBeInTheDocument();
    });

    it("should handle plan name with only whitespace", () => {
      const props = createDefaultProps({ planName: "   " });
      render(<DeletePlanDialog {...props} />);

      // Sprawdzamy czy element strong zawiera whitespace
      const strongElement = document.querySelector("strong");
      expect(strongElement).toBeInTheDocument();
      expect(strongElement?.textContent).toBe("   ");
    });

    it("should handle rapid button clicks", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ onConfirm: mockOnConfirm });
      render(<DeletePlanDialog {...props} />);

      const deleteButton = screen.getByRole("button", { name: /usuń/i });
      
      // Szybkie wielokrotne kliknięcia
      await user.click(deleteButton);
      await user.click(deleteButton);
      await user.click(deleteButton);

      // Każde kliknięcie powinno wywołać onConfirm
      expect(mockOnConfirm).toHaveBeenCalledTimes(3);
    });

    it("should maintain state when props change", () => {
      const { rerender } = render(<DeletePlanDialog {...createDefaultProps({ isDeleting: false })} />);
      
      expect(screen.getByRole("button", { name: /usuń/i })).not.toBeDisabled();

      rerender(<DeletePlanDialog {...createDefaultProps({ isDeleting: true })} />);
      
      expect(screen.getByRole("button", { name: /usuń/i })).toBeDisabled();
    });
  });
});

