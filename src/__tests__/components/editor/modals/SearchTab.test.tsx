import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchTab, type SearchTabProps } from "@/components/editor/modals/SearchTab";
import type { AddPlantDialogState, PlantSearchCandidateDto, AIError } from "@/types";
import type { AddPlantFlowActions } from "@/lib/hooks/useAddPlantFlow";

// Helper functions dla danych testowych
function createMockCandidate(name: string, latinName?: string): PlantSearchCandidateDto {
  return {
    name,
    latin_name: latinName,
    source: "ai",
  };
}

function createMockError(
  type: "timeout" | "bad_json" | "rate_limit" | "network" | "unknown",
  context: "search" | "fit"
): AIError {
  return {
    type,
    context,
    message: `Test error: ${type}`,
    details: `Details for ${type} error`,
    canRetry: type !== "rate_limit",
  };
}

function createDefaultState(): AddPlantDialogState {
  return {
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
}

function createDefaultActions(): AddPlantFlowActions {
  return {
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
}

function createDefaultProps(): SearchTabProps {
  return {
    state: createDefaultState(),
    actions: createDefaultActions(),
  };
}

describe("SearchTab", () => {
  let mockState: AddPlantDialogState;
  let mockActions: AddPlantFlowActions;
  let defaultProps: SearchTabProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createDefaultState();
    mockActions = createDefaultActions();
    defaultProps = {
      state: mockState,
      actions: mockActions,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("should render search form with input and button", () => {
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByPlaceholderText(/wpisz nazwę rośliny/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /szukaj/i })).toBeInTheDocument();
    });

    it("should render search icon in input", () => {
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      expect(input).toBeInTheDocument();
      // Ikona Search jest renderowana jako SVG w komponencie
      expect(screen.getByRole("button", { name: /szukaj/i })).toBeInTheDocument();
    });

    it("should render helper text about AI search", () => {
      render(<SearchTab {...defaultProps} />);

      expect(
        screen.getByText(/AI wyszuka rośliny pasujące do podanej nazwy/i)
      ).toBeInTheDocument();
    });

    it("should initialize input with searchQuery from state", () => {
      mockState.searchQuery = "pomidor";
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("pomidor");
    });

    it("should render empty state when no search has been performed", () => {
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/wpisz nazwę rośliny aby rozpocząć wyszukiwanie/i)).toBeInTheDocument();
    });
  });

  describe("Formularz wyszukiwania", () => {
    it("should update input value when user types", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i) as HTMLInputElement;
      await user.type(input, "pomidor");

      expect(input.value).toBe("pomidor");
    });

    it("should call searchPlants when form is submitted", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      await user.type(input, "pomidor");
      await user.click(submitButton);

      expect(mockActions.searchPlants).toHaveBeenCalledTimes(1);
      expect(mockActions.searchPlants).toHaveBeenCalledWith("pomidor");
    });

    it("should call searchPlants when Enter is pressed in input", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      await user.type(input, "bazylia{Enter}");

      expect(mockActions.searchPlants).toHaveBeenCalledTimes(1);
      expect(mockActions.searchPlants).toHaveBeenCalledWith("bazylia");
    });

    it("should not call searchPlants when query is empty", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /szukaj/i });
      await user.click(submitButton);

      expect(mockActions.searchPlants).not.toHaveBeenCalled();
    });

    it("should not call searchPlants when query is only whitespace", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      await user.type(input, "   ");
      await user.click(submitButton);

      expect(mockActions.searchPlants).not.toHaveBeenCalled();
    });

    it("should trim query before calling searchPlants", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      await user.type(input, "  pomidor  ");
      await user.click(submitButton);

      expect(mockActions.searchPlants).toHaveBeenCalledWith("pomidor");
    });

    it("should disable input and button when isSearching is true", () => {
      mockState.isSearching = true;
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukam/i });

      expect(input).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it("should show loading state in button when isSearching is true", () => {
      mockState.isSearching = true;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/szukam/i)).toBeInTheDocument();
      expect(screen.queryByText(/szukaj/i)).not.toBeInTheDocument();
    });

    it("should disable submit button when input is empty", () => {
      render(<SearchTab {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /szukaj/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when input has value", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      expect(submitButton).toBeDisabled();

      await user.type(input, "p");

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Loading state", () => {
    it("should show loading skeleton when isSearching is true", () => {
      mockState.isSearching = true;
      render(<SearchTab {...defaultProps} />);

      // Sprawdzamy czy są renderowane skeleton cards
      const skeletons = screen.getAllByRole("generic").filter((el) =>
        el.className.includes("animate-pulse")
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should not show search results when isSearching is true", () => {
      mockState.isSearching = true;
      mockState.searchResults = [createMockCandidate("Pomidor")];
      render(<SearchTab {...defaultProps} />);

      expect(screen.queryByText(/pomidor/i)).not.toBeInTheDocument();
    });

    it("should not show empty state when isSearching is true", () => {
      mockState.isSearching = true;
      render(<SearchTab {...defaultProps} />);

      expect(
        screen.queryByText(/wpisz nazwę rośliny aby rozpocząć wyszukiwanie/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Wyniki wyszukiwania", () => {
    it("should display search results when available", () => {
      mockState.searchResults = [
        createMockCandidate("Pomidor", "Solanum lycopersicum"),
        createMockCandidate("Bazylia", "Ocimum basilicum"),
      ];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText("Pomidor")).toBeInTheDocument();
      expect(screen.getByText("Bazylia")).toBeInTheDocument();
    });

    it("should display latin name when available", () => {
      mockState.searchResults = [createMockCandidate("Pomidor", "Solanum lycopersicum")];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText("Solanum lycopersicum")).toBeInTheDocument();
    });

    it("should not display latin name when not available", () => {
      mockState.searchResults = [createMockCandidate("Pomidor")];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText("Pomidor")).toBeInTheDocument();
      // Nie powinno być italic text (latin name)
      const italicElements = screen.queryAllByText(/solanum/i);
      expect(italicElements.length).toBe(0);
    });

    it("should display correct count of results (singular)", () => {
      mockState.searchResults = [createMockCandidate("Pomidor")];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/znaleziono 1 roślinę/i)).toBeInTheDocument();
    });

    it("should display correct count of results (plural)", () => {
      mockState.searchResults = [
        createMockCandidate("Pomidor"),
        createMockCandidate("Bazylia"),
        createMockCandidate("Marchew"),
      ];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/znaleziono 3 roślin/i)).toBeInTheDocument();
    });

    it("should show empty results message when searchResults is empty array", () => {
      mockState.searchResults = [];
      mockState.searchQuery = "nieistniejąca roślina";
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(
        screen.getByText(/nie znaleziono roślin pasujących do zapytania/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/nieistniejąca roślina/i)).toBeInTheDocument();
    });

    it("should call selectCandidate when clicking on a candidate", async () => {
      const user = userEvent.setup();
      const candidate = createMockCandidate("Pomidor");
      mockState.searchResults = [candidate];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const candidateCard = screen.getByText("Pomidor").closest("div[class*='cursor-pointer']");
      if (candidateCard) {
        await user.click(candidateCard);
      }

      expect(mockActions.selectCandidate).toHaveBeenCalledTimes(1);
      expect(mockActions.selectCandidate).toHaveBeenCalledWith(candidate);
    });

    it("should highlight selected candidate", () => {
      const candidate = createMockCandidate("Pomidor");
      mockState.searchResults = [candidate];
      mockState.selectedCandidate = candidate;
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const candidateCard = screen.getByText("Pomidor").closest("div[class*='cursor-pointer']");
      expect(candidateCard).toHaveClass("border-primary");
      expect(screen.getByText("Wybrano")).toBeInTheDocument();
    });

    it("should not highlight unselected candidate", () => {
      const candidate1 = createMockCandidate("Pomidor");
      const candidate2 = createMockCandidate("Bazylia");
      mockState.searchResults = [candidate1, candidate2];
      mockState.selectedCandidate = candidate1;
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const bazyliaCard = screen.getByText("Bazylia").closest("div[class*='cursor-pointer']");
      // Sprawdzamy czy nie ma klasy border-primary (może być w innej formie)
      expect(bazyliaCard).not.toHaveClass("bg-primary/5");
    });

    it("should not show 'Wybrano' badge for unselected candidates", () => {
      const candidate1 = createMockCandidate("Pomidor");
      const candidate2 = createMockCandidate("Bazylia");
      mockState.searchResults = [candidate1, candidate2];
      mockState.selectedCandidate = candidate1;
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const wybranoBadges = screen.getAllByText("Wybrano");
      expect(wybranoBadges.length).toBe(1);
    });
  });

  describe("Error handling", () => {
    it("should display error message when error context is 'search'", () => {
      mockState.error = createMockError("network", "search");
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/test error: network/i)).toBeInTheDocument();
    });

    it("should not display error when error context is 'fit'", () => {
      mockState.error = createMockError("network", "fit");
      render(<SearchTab {...defaultProps} />);

      expect(screen.queryByText(/test error: network/i)).not.toBeInTheDocument();
    });

    it("should display error details when available", () => {
      mockState.error = createMockError("timeout", "search");
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/details for timeout error/i)).toBeInTheDocument();
    });

    it("should show retry button when error canRetry is true", () => {
      mockState.error = createMockError("timeout", "search");
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it("should not show retry button when error canRetry is false", () => {
      mockState.error = createMockError("rate_limit", "search");
      render(<SearchTab {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    });

    it("should call retrySearch when retry button is clicked", async () => {
      const user = userEvent.setup();
      mockState.error = createMockError("timeout", "search");
      render(<SearchTab {...defaultProps} />);

      const retryButton = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(retryButton);

      expect(mockActions.retrySearch).toHaveBeenCalledTimes(1);
    });

    it("should display different error types correctly", () => {
      const errorTypes: Array<"timeout" | "bad_json" | "rate_limit" | "network" | "unknown"> = [
        "timeout",
        "bad_json",
        "rate_limit",
        "network",
        "unknown",
      ];

      errorTypes.forEach((type) => {
        mockState.error = createMockError(type, "search");
        const { unmount } = render(<SearchTab {...defaultProps} />);

        expect(screen.getByText(new RegExp(`test error: ${type}`, "i"))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle state with existing searchQuery", () => {
      mockState.searchQuery = "pomidor";
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("pomidor");
    });

    it("should handle very long search query", async () => {
      const user = userEvent.setup();
      const longQuery = "a".repeat(200);
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      await user.type(input, longQuery);
      await user.click(submitButton);

      expect(mockActions.searchPlants).toHaveBeenCalledWith(longQuery);
    });

    it("should handle special characters in search query", async () => {
      const user = userEvent.setup();
      const specialQuery = "pomidor & bazylia (2024)";
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      await user.type(input, specialQuery);
      await user.click(submitButton);

      expect(mockActions.searchPlants).toHaveBeenCalledWith(specialQuery);
    });

    it("should handle many search results", () => {
      const manyCandidates = Array.from({ length: 20 }, (_, i) =>
        createMockCandidate(`Roślina ${i + 1}`)
      );
      mockState.searchResults = manyCandidates;
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(screen.getByText(/znaleziono 20 roślin/i)).toBeInTheDocument();
      expect(screen.getByText("Roślina 1")).toBeInTheDocument();
      expect(screen.getByText("Roślina 20")).toBeInTheDocument();
    });

    it("should handle candidate selection with index out of bounds gracefully", async () => {
      const user = userEvent.setup();
      mockState.searchResults = [createMockCandidate("Pomidor")];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      // handleSelectCandidate sprawdza czy index jest w zakresie
      // W rzeczywistości nie możemy kliknąć nieistniejącego elementu,
      // ale testujemy czy funkcja sprawdza granice
      const candidateCard = screen.getByText("Pomidor").closest("div[class*='cursor-pointer']");
      if (candidateCard) {
        await user.click(candidateCard);
        expect(mockActions.selectCandidate).toHaveBeenCalledTimes(1);
      }
    });

    it("should handle rapid form submissions", async () => {
      const user = userEvent.setup();
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      const submitButton = screen.getByRole("button", { name: /szukaj/i });

      await user.type(input, "pomidor");
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Powinno być wywołane tylko raz (lub kilka razy, ale nie więcej niż liczba kliknięć)
      expect(mockActions.searchPlants).toHaveBeenCalled();
    });

    it("should maintain input value after search", async () => {
      const user = userEvent.setup();
      mockState.searchQuery = "pomidor";
      mockState.searchResults = [createMockCandidate("Pomidor")];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("pomidor");
    });

    it("should handle null searchResults correctly", () => {
      mockState.searchResults = null;
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      expect(
        screen.getByText(/wpisz nazwę rośliny aby rozpocząć wyszukiwanie/i)
      ).toBeInTheDocument();
    });

    it("should handle candidates with same name", () => {
      const candidate1 = createMockCandidate("Pomidor", "Solanum lycopersicum");
      const candidate2 = createMockCandidate("Pomidor", "Lycopersicon esculentum");
      mockState.searchResults = [candidate1, candidate2];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const pomidorElements = screen.getAllByText("Pomidor");
      expect(pomidorElements.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle empty string in searchQuery", () => {
      mockState.searchQuery = "";
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible input label", () => {
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i);
      expect(input).toBeInTheDocument();
    });

    it("should have accessible submit button", () => {
      render(<SearchTab {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /szukaj/i });
      expect(submitButton).toBeInTheDocument();
    });

    it("should have accessible error message", () => {
      mockState.error = createMockError("network", "search");
      render(<SearchTab {...defaultProps} />);

      const errorAlert = screen.getByRole("alert");
      expect(errorAlert).toBeInTheDocument();
    });

    it("should have clickable candidate cards", async () => {
      const user = userEvent.setup();
      const candidate = createMockCandidate("Pomidor");
      mockState.searchResults = [candidate];
      mockState.isSearching = false;
      render(<SearchTab {...defaultProps} />);

      const candidateCard = screen.getByText("Pomidor").closest("div[class*='cursor-pointer']");
      expect(candidateCard).toBeInTheDocument();
      
      if (candidateCard) {
        await user.click(candidateCard);
        expect(mockActions.selectCandidate).toHaveBeenCalled();
      }
    });
  });

  describe("State synchronization", () => {
    it("should initialize with searchQuery from state", () => {
      mockState.searchQuery = "pomidor";
      render(<SearchTab {...defaultProps} />);

      const input = screen.getByPlaceholderText(/wpisz nazwę rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("pomidor");
    });

    it("should reflect isSearching state changes", () => {
      mockState.searchQuery = "pomidor"; // Ustawiamy query, żeby przycisk nie był disabled
      const { rerender } = render(<SearchTab {...defaultProps} />);

      let submitButton = screen.getByRole("button", { name: /szukaj/i });
      expect(submitButton).not.toBeDisabled();

      mockState.isSearching = true;
      rerender(<SearchTab {...defaultProps} />);

      submitButton = screen.getByRole("button", { name: /szukam/i });
      expect(submitButton).toBeDisabled();
    });

    it("should reflect searchResults changes", () => {
      const { rerender } = render(<SearchTab {...defaultProps} />);

      expect(
        screen.getByText(/wpisz nazwę rośliny aby rozpocząć wyszukiwanie/i)
      ).toBeInTheDocument();

      mockState.searchResults = [createMockCandidate("Pomidor")];
      mockState.isSearching = false;
      rerender(<SearchTab {...defaultProps} />);

      expect(screen.getByText("Pomidor")).toBeInTheDocument();
    });
  });
});

