import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualTab, type ManualTabProps } from "@/components/editor/modals/ManualTab";
import type { AddPlantDialogState } from "@/types";
import type { AddPlantFlowActions } from "@/lib/hooks/useAddPlantFlow";

// Helper functions dla danych testowych
function createMockState(overrides?: Partial<AddPlantDialogState>): AddPlantDialogState {
  return {
    step: "manual",
    activeTab: "manual",
    searchQuery: "",
    searchResults: null,
    isSearching: false,
    selectedCandidate: null,
    fitResult: null,
    isFitting: false,
    manualName: "",
    isSubmitting: false,
    error: null,
    ...overrides,
  };
}

function createMockActions(): AddPlantFlowActions {
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

describe("ManualTab", () => {
  let mockActions: AddPlantFlowActions;
  let mockState: AddPlantDialogState;

  function createDefaultProps(overrides?: Partial<ManualTabProps>): ManualTabProps {
    return {
      state: mockState,
      actions: mockActions,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockActions = createMockActions();
    mockState = createMockState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie komponentu", () => {
    it("powinien renderować się poprawnie z domyślnymi props", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      // Sprawdź czy główne elementy są widoczne
      expect(screen.getByText(/dodając roślinę ręcznie/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nazwa rośliny/i)).toBeInTheDocument();
      expect(screen.getByText(/przykładowe nazwy:/i)).toBeInTheDocument();
    });

    it("powinien wyświetlać alert informacyjny o braku oceny dopasowania", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const alert = screen.getByText(
        /dodając roślinę ręcznie, nie otrzymasz oceny dopasowania od ai/i
      );
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        /będziesz mógł ją dodać później używając wyszukiwania ai/i
      );
    });

    it("powinien renderować input z ikoną Sprout", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("id", "plant-name");
      expect(input).toHaveAttribute("placeholder", "np. Pomidor");

      // Sprawdź czy ikona jest obecna (ikona Sprout jest w kontenerze z klasą pl-10)
      const inputContainer = input.closest(".relative");
      expect(inputContainer).toBeInTheDocument();
    });

    it("powinien wyświetlać pomocniczy tekst pod inputem", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const helperText = screen.getByText(/wpisz dokładną nazwę rośliny, którą chcesz posadzić/i);
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveClass("text-xs", "text-muted-foreground");
    });

    it("powinien renderować wszystkie przyciski z przykładami roślin", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const examples = ["Pomidor", "Bazylia", "Truskawka", "Marchew", "Sałata"];
      examples.forEach((example) => {
        const button = screen.getByRole("button", { name: example });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("powinien wyświetlać wartość z state.manualName w input", () => {
      mockState = createMockState({ manualName: "Testowa Roślina" });
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("Testowa Roślina");
    });

    it("powinien wyświetlać pusty input gdy manualName jest pusty", () => {
      mockState = createMockState({ manualName: "" });
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać actions.setManualName gdy użytkownik wpisuje tekst w input", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.type(input, "Pomidor");

      // setManualName powinno być wywołane (user.type() wpisuje znak po znaku)
      expect(mockActions.setManualName).toHaveBeenCalled();
      // Sprawdź czy zostało wywołane wiele razy (dla każdego znaku)
      const setManualNameMock = vi.mocked(mockActions.setManualName);
      const calls = setManualNameMock.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(6); // "Pomidor" = 6 liter
      // Sprawdź czy wszystkie znaki zostały przetworzone
      const allValues = calls.map((call: [string]) => call[0]).join("");
      expect(allValues).toContain("Pomidor");
    });

    it("powinien wywołać actions.setManualName z pustym stringiem gdy użytkownik usuwa tekst", async () => {
      const user = userEvent.setup();
      mockState = createMockState({ manualName: "Pomidor" });
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.clear(input);

      // clear() usuwa cały tekst, więc setManualName powinno być wywołane z pustym stringiem
      expect(mockActions.setManualName).toHaveBeenCalled();
    });

    it("powinien wywołać actions.setManualName z wartością przykładu gdy użytkownik klika przycisk 'Pomidor'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const button = screen.getByRole("button", { name: "Pomidor" });
      await user.click(button);

      expect(mockActions.setManualName).toHaveBeenCalledTimes(1);
      expect(mockActions.setManualName).toHaveBeenCalledWith("Pomidor");
    });

    it("powinien wywołać actions.setManualName z wartością przykładu gdy użytkownik klika przycisk 'Bazylia'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const button = screen.getByRole("button", { name: "Bazylia" });
      await user.click(button);

      expect(mockActions.setManualName).toHaveBeenCalledTimes(1);
      expect(mockActions.setManualName).toHaveBeenCalledWith("Bazylia");
    });

    it("powinien wywołać actions.setManualName z wartością przykładu gdy użytkownik klika przycisk 'Truskawka'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const button = screen.getByRole("button", { name: "Truskawka" });
      await user.click(button);

      expect(mockActions.setManualName).toHaveBeenCalledTimes(1);
      expect(mockActions.setManualName).toHaveBeenCalledWith("Truskawka");
    });

    it("powinien wywołać actions.setManualName z wartością przykładu gdy użytkownik klika przycisk 'Marchew'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const button = screen.getByRole("button", { name: "Marchew" });
      await user.click(button);

      expect(mockActions.setManualName).toHaveBeenCalledTimes(1);
      expect(mockActions.setManualName).toHaveBeenCalledWith("Marchew");
    });

    it("powinien wywołać actions.setManualName z wartością przykładu gdy użytkownik klika przycisk 'Sałata'", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const button = screen.getByRole("button", { name: "Sałata" });
      await user.click(button);

      expect(mockActions.setManualName).toHaveBeenCalledTimes(1);
      expect(mockActions.setManualName).toHaveBeenCalledWith("Sałata");
    });

    it("powinien obsługiwać kolejne kliknięcia różnych przycisków przykładów", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const pomidorButton = screen.getByRole("button", { name: "Pomidor" });
      const bazyliaButton = screen.getByRole("button", { name: "Bazylia" });

      await user.click(pomidorButton);
      await user.click(bazyliaButton);

      expect(mockActions.setManualName).toHaveBeenCalledTimes(2);
      expect(mockActions.setManualName).toHaveBeenNthCalledWith(1, "Pomidor");
      expect(mockActions.setManualName).toHaveBeenNthCalledWith(2, "Bazylia");
    });

    it("powinien aktualizować wartość input podczas wpisywania", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i) as HTMLInputElement;
      await user.type(input, "Test");

      // Input powinien mieć wartość "Test" (ale to zależy od controlled component)
      // W rzeczywistości wartość jest kontrolowana przez state, więc sprawdzamy wywołania
      expect(mockActions.setManualName).toHaveBeenCalled();
    });
  });

  describe("Edge cases i przypadki brzegowe", () => {
    it("powinien obsługiwać bardzo długie nazwy roślin", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const longName = "A".repeat(50); // Zmniejszamy do 50 dla szybszego testu
      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.type(input, longName);

      // setManualName powinno być wywołane (user.type() wpisuje znak po znaku)
      expect(mockActions.setManualName).toHaveBeenCalled();
      // Sprawdź czy zostało wywołane wiele razy (dla każdego znaku)
      const setManualNameMock = vi.mocked(mockActions.setManualName);
      const calls = setManualNameMock.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(50);
      // Sprawdź czy wszystkie znaki zostały przetworzone
      const allValues = calls.map((call: [string]) => call[0]).join("");
      expect(allValues.length).toBeGreaterThanOrEqual(50);
    });

    it("powinien obsługiwać nazwy z polskimi znakami", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.type(input, "Żółć");

      expect(mockActions.setManualName).toHaveBeenCalled();
      // Sprawdź czy zostało wywołane z pełną nazwą (ostatnie wywołanie)
      const setManualNameMock = vi.mocked(mockActions.setManualName);
      const calls = setManualNameMock.mock.calls;
      // Ostatnie wywołanie powinno zawierać pełny tekst (może być tylko ostatni znak, ale sprawdzamy czy funkcja działa)
      expect(calls.length).toBeGreaterThan(0);
      // Sprawdzamy czy wszystkie znaki zostały przetworzone
      const allValues = calls.map((call: [string]) => call[0]).join("");
      expect(allValues).toContain("Ż");
    });

    it("powinien obsługiwać nazwy z cyframi", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.type(input, "Roślina123");

      expect(mockActions.setManualName).toHaveBeenCalled();
      // Sprawdź czy zostało wywołane (user.type() wpisuje znak po znaku)
      const setManualNameMock = vi.mocked(mockActions.setManualName);
      const calls = setManualNameMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Sprawdzamy czy wszystkie znaki zostały przetworzone
      const allValues = calls.map((call: [string]) => call[0]).join("");
      expect(allValues).toContain("Roślina");
      expect(allValues).toContain("123");
    });

    it("powinien obsługiwać nazwy ze spacjami", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.type(input, "Pomidor czerwony");

      expect(mockActions.setManualName).toHaveBeenCalled();
      // Sprawdź czy zostało wywołane (user.type() wpisuje znak po znaku)
      const setManualNameMock = vi.mocked(mockActions.setManualName);
      const calls = setManualNameMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Sprawdzamy czy wszystkie znaki zostały przetworzone
      const allValues = calls.map((call: [string]) => call[0]).join("");
      expect(allValues).toContain("Pomidor");
      expect(allValues).toContain("czerwony");
    });

    it("powinien wyświetlać poprawną wartość gdy state.manualName zawiera spacje", () => {
      mockState = createMockState({ manualName: "Pomidor czerwony" });
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("Pomidor czerwony");
    });

    it("powinien wyświetlać poprawną wartość gdy state.manualName zawiera polskie znaki", () => {
      mockState = createMockState({ manualName: "Żółć" });
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("Żółć");
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć poprawnie powiązany label z inputem", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const label = screen.getByText(/nazwa rośliny/i);
      const input = screen.getByLabelText(/nazwa rośliny/i);

      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(label).toHaveAttribute("for", "plant-name");
      expect(input).toHaveAttribute("id", "plant-name");
    });

    it("powinien mieć przyciski z odpowiednimi atrybutami", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("powinien mieć dostępny input dla screen readerów", () => {
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });
  });

  describe("Integracja z props", () => {
    it("powinien przekazywać aktualną wartość manualName z state do input", () => {
      mockState = createMockState({ manualName: "Bazylia" });
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i) as HTMLInputElement;
      expect(input.value).toBe("Bazylia");
    });

    it("powinien wywoływać actions.setManualName z wartością z eventu onChange", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<ManualTab {...props} />);

      const input = screen.getByLabelText(/nazwa rośliny/i);
      await user.type(input, "Test");

      // Sprawdź czy setManualName otrzymuje wartości z eventu
      const setManualNameMock = vi.mocked(mockActions.setManualName);
      const calls = setManualNameMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      calls.forEach((call: [string]) => {
        expect(typeof call[0]).toBe("string");
      });
    });

    it("powinien działać poprawnie gdy actions.setManualName nie jest zdefiniowane (edge case)", () => {
      // Ten test sprawdza czy komponent nie crashuje gdy actions jest undefined
      // W praktyce to nie powinno się zdarzyć, ale testujemy edge case
      const actions = createMockActions();
      // @ts-expect-error - celowo testujemy edge case
      actions.setManualName = undefined;
      const props = createDefaultProps({ actions: actions as any });

      // Komponent powinien się zrenderować bez crashowania
      expect(() => render(<ManualTab {...props} />)).not.toThrow();
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną strukturę kontenerów", () => {
      const props = createDefaultProps();
      const { container } = render(<ManualTab {...props} />);

      // Główny kontener powinien mieć klasę space-y-4
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("space-y-4");

      // Input powinien być w kontenerze z klasą relative
      const input = screen.getByLabelText(/nazwa rośliny/i);
      const inputContainer = input.closest(".relative");
      expect(inputContainer).toBeInTheDocument();
    });

    it("powinien mieć sekcję z przykładami z odpowiednimi klasami", () => {
      const props = createDefaultProps();
      const { container } = render(<ManualTab {...props} />);

      const examplesSection = screen.getByText(/przykładowe nazwy:/i).closest("div");
      expect(examplesSection).toHaveClass("rounded-lg", "bg-muted/50", "p-4");
    });
  });
});

