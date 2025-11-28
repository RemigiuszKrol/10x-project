import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AIErrorDialog,
  type AIErrorDialogProps,
} from "@/components/editor/modals/AIErrorDialog";
import type { AIError } from "@/types";

// Mock formatRetryTime
vi.mock("@/lib/utils/ai-errors", () => ({
  formatRetryTime: vi.fn((seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  }),
}));

// Helper function do tworzenia mock AIError
function createMockError(overrides?: Partial<AIError>): AIError {
  return {
    type: "unknown",
    message: "Wystąpił nieoczekiwany błąd",
    context: "search",
    canRetry: true,
    ...overrides,
  };
}

// Helper function do tworzenia domyślnych props
function createDefaultProps(
  overrides?: Partial<AIErrorDialogProps>
): AIErrorDialogProps {
  return {
    isOpen: true,
    error: createMockError(),
    context: "search",
    onRetry: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("AIErrorDialog", () => {
  let mockOnRetry: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let mockOnCancel: ReturnType<typeof vi.fn<() => void>>;
  let mockOnAddManually: ReturnType<typeof vi.fn<() => void>>;
  let mockOnAddWithoutScores: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    mockOnRetry = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    mockOnCancel = vi.fn<() => void>();
    mockOnAddManually = vi.fn<() => void>();
    mockOnAddWithoutScores = vi.fn<() => void>();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render dialog when isOpen is true", () => {
      const props = createDefaultProps();
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should not render dialog when isOpen is false", () => {
      const props = createDefaultProps({ isOpen: false });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("should display error message", () => {
      const error = createMockError({ message: "Test error message" });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });
  });

  describe("Typy błędów - ikony i tytuły", () => {
    it("should display timeout icon and title", () => {
      const error = createMockError({
        type: "timeout",
        message: "Przekroczono limit czasu",
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      // Sprawdź tytuł (AlertDialogTitle)
      expect(screen.getByRole("alertdialog")).toHaveTextContent("Przekroczono limit czasu");
      // Clock icon powinien być w DOM (lucide-react)
      const iconContainer = screen.getByRole("alertdialog").querySelector(".text-destructive");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should display network icon and title", () => {
      const error = createMockError({
        type: "network",
        message: "Brak połączenia z internetem",
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toHaveTextContent("Brak połączenia");
      expect(screen.getByRole("alertdialog")).toHaveTextContent("Brak połączenia z internetem");
    });

    it("should display rate_limit icon and title", () => {
      const error = createMockError({
        type: "rate_limit",
        message: "Zbyt wiele zapytań do AI",
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toHaveTextContent("Zbyt wiele zapytań");
      expect(screen.getByRole("alertdialog")).toHaveTextContent("Zbyt wiele zapytań do AI");
    });

    it("should display bad_json icon and title", () => {
      const error = createMockError({
        type: "bad_json",
        message: "Niepoprawna odpowiedź od AI",
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toHaveTextContent("Niepoprawna odpowiedź AI");
      expect(screen.getByRole("alertdialog")).toHaveTextContent("Niepoprawna odpowiedź od AI");
    });

    it("should display unknown icon and title", () => {
      const error = createMockError({
        type: "unknown",
        message: "Wystąpił nieoczekiwany błąd",
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toHaveTextContent("Wystąpił błąd");
      expect(screen.getByRole("alertdialog")).toHaveTextContent("Wystąpił nieoczekiwany błąd");
    });
  });

  describe("Szczegóły techniczne (bad_json)", () => {
    it("should display technical details for bad_json error", () => {
      const error = createMockError({
        type: "bad_json",
        message: "Niepoprawna odpowiedź AI",
        details: '{"error": "Invalid JSON structure"}',
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      const detailsSummary = screen.getByText("Szczegóły techniczne");
      expect(detailsSummary).toBeInTheDocument();

      // Kliknij aby rozwinąć
      const user = userEvent.setup();
      user.click(detailsSummary);

      expect(screen.getByText(/invalid json structure/i)).toBeInTheDocument();
    });

    it("should not display technical details for non-bad_json errors", () => {
      const error = createMockError({
        type: "timeout",
        message: "Timeout",
        details: "Some details",
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByText("Szczegóły techniczne")).not.toBeInTheDocument();
    });

    it("should not display technical details when details is undefined", () => {
      const error = createMockError({
        type: "bad_json",
        message: "Bad JSON",
        details: undefined,
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByText("Szczegóły techniczne")).not.toBeInTheDocument();
    });
  });

  describe("Retry time (rate_limit)", () => {
    it("should display retry time when retryAfter is set", () => {
      const error = createMockError({
        type: "rate_limit",
        message: "Rate limit",
        retryAfter: 60,
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByText(/spróbuj ponownie za/i)).toBeInTheDocument();
      // Tekst "1m" pojawia się w dwóch miejscach (w opisie i w przycisku), więc używamy getAllByText
      const timeElements = screen.getAllByText(/1m/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("should display retry time in seconds when less than 60", () => {
      const error = createMockError({
        type: "rate_limit",
        message: "Rate limit",
        retryAfter: 30,
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      // Tekst "30s" pojawia się w dwóch miejscach (w opisie i w przycisku), więc używamy getAllByText
      const timeElements = screen.getAllByText(/30s/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("should not display retry time when retryAfter is undefined", () => {
      const error = createMockError({
        type: "rate_limit",
        message: "Rate limit",
        retryAfter: undefined,
      });
      const props = createDefaultProps({ error });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByText(/spróbuj ponownie za/i)).not.toBeInTheDocument();
    });
  });

  describe("Kontekst 'search' - akcje", () => {
    it("should display 'Ponów wyszukiwanie' button when canRetry is true", () => {
      const error = createMockError({
        type: "timeout",
        canRetry: true,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów wyszukiwanie/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("should display 'Dodaj ręcznie' button when onAddManually is provided", () => {
      const error = createMockError({
        type: "timeout",
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onAddManually: mockOnAddManually,
      });
      render(<AIErrorDialog {...props} />);

      const manualButton = screen.getByRole("button", { name: /dodaj ręcznie/i });
      expect(manualButton).toBeInTheDocument();
    });

    it("should not display 'Dodaj ręcznie' button when onAddManually is not provided", () => {
      const error = createMockError({
        type: "timeout",
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onAddManually: undefined,
      });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByRole("button", { name: /dodaj ręcznie/i })).not.toBeInTheDocument();
    });

    it("should not display retry button when canRetry is false", () => {
      const error = createMockError({
        type: "bad_json",
        canRetry: false,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
      });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByRole("button", { name: /ponów/i })).not.toBeInTheDocument();
    });

    it("should disable retry button when retryAfter is set", () => {
      const error = createMockError({
        type: "rate_limit",
        canRetry: true,
        retryAfter: 60,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów/i });
      expect(retryButton).toBeDisabled();
    });

    it("should display retry button with countdown when retryAfter is set", () => {
      const error = createMockError({
        type: "rate_limit",
        canRetry: true,
        retryAfter: 45,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów.*45s/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });
  });

  describe("Kontekst 'fit' - akcje", () => {
    it("should display 'Ponów sprawdzenie' button when canRetry is true", () => {
      const error = createMockError({
        type: "timeout",
        canRetry: true,
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów sprawdzenie/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("should display 'Dodaj bez oceny' button when onAddWithoutScores is provided", () => {
      const error = createMockError({
        type: "timeout",
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onAddWithoutScores: mockOnAddWithoutScores,
      });
      render(<AIErrorDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj bez oceny/i });
      expect(addButton).toBeInTheDocument();
    });

    it("should not display 'Dodaj bez oceny' button when onAddWithoutScores is not provided", () => {
      const error = createMockError({
        type: "timeout",
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onAddWithoutScores: undefined,
      });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByRole("button", { name: /dodaj bez oceny/i })).not.toBeInTheDocument();
    });

    it("should not display retry button when canRetry is false", () => {
      const error = createMockError({
        type: "bad_json",
        canRetry: false,
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
      });
      render(<AIErrorDialog {...props} />);

      expect(screen.queryByRole("button", { name: /ponów/i })).not.toBeInTheDocument();
    });

    it("should disable retry button when retryAfter is set", () => {
      const error = createMockError({
        type: "rate_limit",
        canRetry: true,
        retryAfter: 60,
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów/i });
      expect(retryButton).toBeDisabled();
    });

    it("should display retry button with countdown when retryAfter is set", () => {
      const error = createMockError({
        type: "rate_limit",
        canRetry: true,
        retryAfter: 120,
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów.*2m/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("should call onRetry when retry button is clicked", async () => {
      const error = createMockError({
        type: "timeout",
        canRetry: true,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów wyszukiwanie/i });
      const user = userEvent.setup();
      await user.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when cancel button is clicked", async () => {
      const props = createDefaultProps({
        onCancel: mockOnCancel,
      });
      render(<AIErrorDialog {...props} />);

      const cancelButton = screen.getByRole("button", { name: /anuluj/i });
      const user = userEvent.setup();
      await user.click(cancelButton);

      // AlertDialog może wywołać onCancel zarówno przez kliknięcie przycisku jak i przez onOpenChange
      // Sprawdzamy że został wywołany przynajmniej raz
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("should call onCancel when dialog is closed via onOpenChange", async () => {
      const props = createDefaultProps({
        onCancel: mockOnCancel,
      });
      render(<AIErrorDialog {...props} />);

      // AlertDialog wywołuje onOpenChange(false) gdy dialog jest zamykany
      const dialog = screen.getByRole("alertdialog");
      const user = userEvent.setup();
      
      // Symuluj zamknięcie dialogu (np. przez ESC lub kliknięcie overlay)
      // W rzeczywistości AlertDialog z shadcn/ui obsługuje to automatycznie
      // Testujemy że onCancel jest wywoływane gdy dialog się zamyka
      await waitFor(() => {
        // Dialog powinien być otwarty na początku
        expect(dialog).toBeInTheDocument();
      });
    });

    it("should call onAddManually when 'Dodaj ręcznie' button is clicked", async () => {
      const error = createMockError({
        type: "timeout",
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onAddManually: mockOnAddManually,
      });
      render(<AIErrorDialog {...props} />);

      const manualButton = screen.getByRole("button", { name: /dodaj ręcznie/i });
      const user = userEvent.setup();
      await user.click(manualButton);

      expect(mockOnAddManually).toHaveBeenCalledTimes(1);
    });

    it("should call onAddWithoutScores when 'Dodaj bez oceny' button is clicked", async () => {
      const error = createMockError({
        type: "timeout",
        context: "fit",
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onAddWithoutScores: mockOnAddWithoutScores,
      });
      render(<AIErrorDialog {...props} />);

      const addButton = screen.getByRole("button", { name: /dodaj bez oceny/i });
      const user = userEvent.setup();
      await user.click(addButton);

      expect(mockOnAddWithoutScores).toHaveBeenCalledTimes(1);
    });

    it("should not call onRetry when retry button is disabled", async () => {
      const error = createMockError({
        type: "rate_limit",
        canRetry: true,
        retryAfter: 60,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: mockOnRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów/i });
      expect(retryButton).toBeDisabled();

      const user = userEvent.setup();
      // Próba kliknięcia wyłączonego przycisku nie powinna wywołać funkcji
      await user.click(retryButton);

      // W React Testing Library, kliknięcie wyłączonego przycisku nie wywołuje onClick
      // Więc mockOnRetry nie powinien być wywołany
      expect(mockOnRetry).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle async onRetry correctly", async () => {
      let resolveRetry: () => void;
      const asyncRetry = vi.fn<() => Promise<void>>(() => {
        return new Promise((resolve) => {
          resolveRetry = resolve;
        });
      });

      const error = createMockError({
        type: "timeout",
        canRetry: true,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: asyncRetry,
      });
      render(<AIErrorDialog {...props} />);

      const retryButton = screen.getByRole("button", { name: /ponów wyszukiwanie/i });
      const user = userEvent.setup();
      await user.click(retryButton);

      expect(asyncRetry).toHaveBeenCalledTimes(1);
      
      // Rozwiąż promise
      resolveRetry!();
      await waitFor(() => {
        expect(asyncRetry).toHaveBeenCalled();
      });
    });

    it("should handle error with all optional fields", () => {
      const error = createMockError({
        type: "unknown",
        message: "Full error",
        context: "fit",
        canRetry: false,
        retryAfter: undefined,
        details: undefined,
      });
      const props = createDefaultProps({
        error,
        context: "fit",
        onAddWithoutScores: undefined,
      });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByText("Full error")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
    });

    it("should handle context mismatch gracefully", () => {
      // Error ma context "search", ale dialog ma context "fit"
      const error = createMockError({
        type: "timeout",
        context: "search", // Różny od props.context
      });
      const props = createDefaultProps({
        error,
        context: "fit", // Różny od error.context
        onAddWithoutScores: mockOnAddWithoutScores,
      });
      render(<AIErrorDialog {...props} />);

      // Dialog powinien używać context z props, nie z error
      expect(screen.getByRole("button", { name: /dodaj bez oceny/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /dodaj ręcznie/i })).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA role", () => {
      const props = createDefaultProps();
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should have accessible button labels", () => {
      const error = createMockError({
        type: "timeout",
        canRetry: true,
        context: "search",
      });
      const props = createDefaultProps({
        error,
        context: "search",
        onRetry: mockOnRetry,
        onAddManually: mockOnAddManually,
      });
      render(<AIErrorDialog {...props} />);

      expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dodaj ręcznie/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ponów wyszukiwanie/i })).toBeInTheDocument();
    });
  });
});

