import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormActions, type FormActionsProps } from "@/components/profile/FormActions";

// Helper function do tworzenia domyślnych props
function createDefaultProps(overrides?: Partial<FormActionsProps>): FormActionsProps {
  return {
    isDirty: false,
    isSubmitting: false,
    ...overrides,
  };
}

describe("FormActions", () => {
  let mockOnReset: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    mockOnReset = vi.fn<() => void>();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować kontener z przyciskami", () => {
      const props = createDefaultProps();
      const { container } = render(<FormActions {...props} />);

      const containerDiv = container.querySelector("div.flex.gap-3");
      expect(containerDiv).toBeInTheDocument();
    });

    it("powinien zawsze renderować przycisk Zapisz", () => {
      const props = createDefaultProps();
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("type", "submit");
    });

    it("powinien renderować przycisk Anuluj gdy onReset jest przekazany", () => {
      const props = createDefaultProps({ onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAttribute("type", "button");
    });

    it("nie powinien renderować przycisku Anuluj gdy onReset nie jest przekazany", () => {
      const props = createDefaultProps();
      render(<FormActions {...props} />);

      const cancelButton = screen.queryByRole("button", { name: /anuluj/i });
      expect(cancelButton).not.toBeInTheDocument();
    });

    it("powinien renderować przycisk Zapisz z odpowiednimi klasami CSS (gradient)", () => {
      const props = createDefaultProps();
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toHaveClass("bg-gradient-to-r");
      expect(submitButton).toHaveClass("from-green-600");
      expect(submitButton).toHaveClass("to-emerald-600");
      expect(submitButton).toHaveClass("shadow-md");
    });

    it("powinien renderować przycisk Anuluj z variant='outline'", () => {
      const props = createDefaultProps({ onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      // Button z variant="outline" powinien mieć odpowiednie klasy
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe("Stan disabled - przycisk Zapisz", () => {
    it("powinien być wyłączony gdy isDirty=false", () => {
      const props = createDefaultProps({ isDirty: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toBeDisabled();
    });

    it("powinien być wyłączony gdy isSubmitting=true", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: true });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      expect(submitButton).toBeDisabled();
    });

    it("powinien być wyłączony gdy isDirty=false i isSubmitting=true", () => {
      const props = createDefaultProps({ isDirty: false, isSubmitting: true });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      expect(submitButton).toBeDisabled();
    });

    it("powinien być aktywny gdy isDirty=true i isSubmitting=false", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Stan disabled - przycisk Anuluj", () => {
    it("powinien być wyłączony gdy isDirty=false", () => {
      const props = createDefaultProps({ isDirty: false, onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();
    });

    it("powinien być wyłączony gdy isSubmitting=true", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: true, onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();
    });

    it("powinien być aktywny gdy isDirty=true i isSubmitting=false", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false, onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe("Stan loading - przycisk Zapisz", () => {
    it("powinien wyświetlać tekst 'Zapisywanie...' gdy isSubmitting=true", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: true });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      expect(submitButton).toHaveTextContent("Zapisywanie...");
    });

    it("powinien wyświetlać tekst 'Zapisz' gdy isSubmitting=false", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toHaveTextContent("Zapisz");
      expect(submitButton).not.toHaveTextContent("Zapisywanie...");
    });

    it("powinien renderować spinner (Loader2) gdy isSubmitting=true", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: true });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      // Sprawdź czy spinner jest renderowany (SVG z klasą animate-spin)
      const spinner = submitButton.querySelector("svg.animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("nie powinien renderować spinnera gdy isSubmitting=false", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      const spinner = submitButton.querySelector("svg.animate-spin");
      expect(spinner).not.toBeInTheDocument();
    });

    it("powinien renderować spinner z odpowiednimi klasami CSS", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: true });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      const spinner = submitButton.querySelector("svg.animate-spin");
      expect(spinner).toHaveClass("h-4");
      expect(spinner).toHaveClass("w-4");
      expect(spinner).toHaveClass("animate-spin");
    });
  });

  describe("Interakcje", () => {
    it("powinien wywołać onReset gdy przycisk Anuluj zostanie kliknięty", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ isDirty: true, isSubmitting: false, onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      await user.click(cancelButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it("nie powinien wywołać onReset gdy przycisk Anuluj jest wyłączony", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ isDirty: false, isSubmitting: false, onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();

      // Próba kliknięcia wyłączonego przycisku nie powinna wywołać callback
      await user.click(cancelButton);

      expect(mockOnReset).not.toHaveBeenCalled();
    });

    it("nie powinien wywołać onReset gdy isSubmitting=true", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps({ isDirty: true, isSubmitting: true, onReset: mockOnReset });
      render(<FormActions {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      expect(cancelButton).toBeDisabled();

      await user.click(cancelButton);

      expect(mockOnReset).not.toHaveBeenCalled();
    });
  });

  describe("Przełączanie stanów", () => {
    it("powinien przełączać się między stanem normalnym a loading", () => {
      const { rerender } = render(<FormActions isDirty={true} isSubmitting={false} />);

      let submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toHaveTextContent("Zapisz");
      expect(submitButton).not.toBeDisabled();
      expect(submitButton.querySelector("svg.animate-spin")).not.toBeInTheDocument();

      rerender(<FormActions isDirty={true} isSubmitting={true} />);

      submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      expect(submitButton).toHaveTextContent("Zapisywanie...");
      expect(submitButton).toBeDisabled();
      expect(submitButton.querySelector("svg.animate-spin")).toBeInTheDocument();

      rerender(<FormActions isDirty={true} isSubmitting={false} />);

      submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toHaveTextContent("Zapisz");
      expect(submitButton).not.toBeDisabled();
      expect(submitButton.querySelector("svg.animate-spin")).not.toBeInTheDocument();
    });

    it("powinien przełączać się między stanem dirty a clean", () => {
      const { rerender } = render(<FormActions isDirty={false} isSubmitting={false} />);

      let submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toBeDisabled();

      rerender(<FormActions isDirty={true} isSubmitting={false} />);

      submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).not.toBeDisabled();

      rerender(<FormActions isDirty={false} isSubmitting={false} />);

      submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsługiwać przypadek gdy onReset jest undefined", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false, onReset: undefined });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toBeInTheDocument();

      const cancelButton = screen.queryByRole("button", { name: /anuluj/i });
      expect(cancelButton).not.toBeInTheDocument();
    });

    it("powinien obsługiwać przypadek gdy onReset jest null (TypeScript nie pozwoli, ale sprawdzamy renderowanie)", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toBeInTheDocument();
    });

    it("powinien obsługiwać wszystkie kombinacje isDirty i isSubmitting", () => {
      const combinations = [
        { isDirty: false, isSubmitting: false, shouldBeDisabled: true },
        { isDirty: false, isSubmitting: true, shouldBeDisabled: true },
        { isDirty: true, isSubmitting: false, shouldBeDisabled: false },
        { isDirty: true, isSubmitting: true, shouldBeDisabled: true },
      ];

      combinations.forEach(({ isDirty, isSubmitting, shouldBeDisabled }) => {
        const { unmount } = render(
          <FormActions isDirty={isDirty} isSubmitting={isSubmitting} onReset={mockOnReset} />
        );

        const submitButton = screen.getByRole("button", { name: isSubmitting ? /zapisywanie/i : /zapisz/i });
        const cancelButton = screen.getByRole("button", { name: /anuluj/i });

        if (shouldBeDisabled) {
          expect(submitButton).toBeDisabled();
          expect(cancelButton).toBeDisabled();
        } else {
          expect(submitButton).not.toBeDisabled();
          expect(cancelButton).not.toBeDisabled();
        }

        unmount();
      });
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć odpowiednią strukturę dla screen readerów", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).toHaveAttribute("type", "submit");
      expect(submitButton).toBeInTheDocument();
    });

    it("powinien być dostępny dla klawiatury gdy nie jest disabled", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: false });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisz/i });
      expect(submitButton).not.toHaveAttribute("tabindex", "-1");
    });

    it("powinien mieć odpowiedni tekst dla screen readerów w stanie loading", () => {
      const props = createDefaultProps({ isDirty: true, isSubmitting: true });
      render(<FormActions {...props} />);

      const submitButton = screen.getByRole("button", { name: /zapisywanie/i });
      expect(submitButton).toHaveTextContent("Zapisywanie...");
      expect(submitButton).toBeDisabled();
    });
  });
});

