import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationSearch } from "@/components/location/LocationSearch";

describe("LocationSearch", () => {
  const defaultProps = {
    onSearch: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    onSearchResults: vi.fn(),
    onSearchError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować etykietę 'Wyszukaj adres'", () => {
      render(<LocationSearch {...defaultProps} />);

      expect(screen.getByText("Wyszukaj adres")).toBeInTheDocument();
    });

    it("powinien renderować input z poprawnym id i placeholderem", () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "location-search");
      expect(input).toHaveAttribute("placeholder", "np. Warszawa, Plac Defilad 1");
    });

    it("powinien renderować przycisk 'Szukaj' z ikoną", () => {
      render(<LocationSearch {...defaultProps} />);

      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Szukaj");
    });

    it("powinien renderować tekst pomocniczy", () => {
      render(<LocationSearch {...defaultProps} />);

      expect(
        screen.getByText(/wpisz adres, miasto lub współrzędne aby znaleźć lokalizację na mapie/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować input z aria-describedby wskazującym na tekst pomocniczy", () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      const helpText = screen.getByText(/wpisz adres, miasto lub współrzędne/i);
      
      expect(input).toHaveAttribute("aria-describedby", "location-search-help");
      expect(helpText).toHaveAttribute("id", "location-search-help");
    });

    it("powinien renderować pusty input na początku", () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("nie powinien renderować błędu walidacji na początku", () => {
      render(<LocationSearch {...defaultProps} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Walidacja", () => {
    it("powinien wyświetlić błąd gdy query jest puste i użytkownik klika przycisk", async () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      
      // Używamy Enter zamiast kliknięcia przycisku (przycisk jest disabled gdy query jest puste)
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Wprowadź adres do wyszukania");
      });
      expect(defaultProps.onSearch).not.toHaveBeenCalled();
    });

    it("powinien wyświetlić błąd gdy query ma mniej niż 3 znaki", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "ab");
      
      // Używamy Enter zamiast kliknięcia przycisku (przycisk jest disabled gdy query < 3 znaki)
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Adres musi mieć co najmniej 3 znaki");
      });
      expect(defaultProps.onSearch).not.toHaveBeenCalled();
    });

    it("powinien wyświetlić błąd gdy query składa się tylko z białych znaków", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "  ");
      
      // Używamy Enter zamiast kliknięcia przycisku (przycisk jest disabled gdy query < 3 znaki)
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Wprowadź adres do wyszukania");
      });
      expect(defaultProps.onSearch).not.toHaveBeenCalled();
    });

    it("powinien wyświetlić błąd gdy query ma dokładnie 2 znaki", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "ab");
      
      // Używamy Enter zamiast kliknięcia przycisku (przycisk jest disabled gdy query < 3 znaki)
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Adres musi mieć co najmniej 3 znaki");
      });
    });

    it("powinien zaakceptować query z dokładnie 3 znakami", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "abc");
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(defaultProps.onSearch).toHaveBeenCalledWith("abc");
    });

    it("powinien wyczyścić błąd walidacji gdy użytkownik zaczyna wpisywać", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");

      // Wywołaj błąd walidacji przez naciśnięcie Enter (przycisk jest disabled)
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      // Czekamy na pojawienie się błędu walidacji
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Zacznij wpisywać - błąd powinien zniknąć
      await user.type(input, "a");
      
      // Czekamy na zniknięcie błędu walidacji
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    it("powinien ustawić aria-invalid na true gdy jest błąd walidacji", async () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");

      expect(input).toHaveAttribute("aria-invalid", "false");

      // Używamy fireEvent.keyDown zamiast userEvent, aby symulować naciśnięcie Enter
      // nawet gdy input jest pusty (userEvent może wymagać focusu)
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      // Czekamy na aktualizację stanu React
      await waitFor(() => {
        const updatedInput = screen.getByRole("textbox");
        expect(updatedInput).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien zastosować style błędu do input gdy jest błąd walidacji", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      
      // Wpisz 2 znaki (za mało dla walidacji)
      await user.type(input, "ab");
      
      // Użyj Enter zamiast kliknięcia przycisku (Enter działa nawet gdy przycisk jest disabled)
      await user.keyboard("{Enter}");
      
      // Czekamy na aktualizację stanu React (ustawienie validationError)
      await waitFor(() => {
        const updatedInput = screen.getByRole("textbox");
        expect(updatedInput).toHaveAttribute("aria-invalid", "true");
      });
      
      // Sprawdzamy czy input ma odpowiednie klasy związane z błędem
      // Input używa aria-invalid:border-destructive, więc sprawdzamy czy aria-invalid jest ustawione
      // oraz czy input ma odpowiednie klasy związane z błędem (przez pseudo-klasę)
      const finalInput = screen.getByRole("textbox");
      expect(finalInput.className).toContain("aria-invalid:border-destructive");
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien aktualizować wartość input gdy użytkownik wpisuje tekst", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      await user.type(input, "Warszawa");

      expect(input.value).toBe("Warszawa");
    });

    it("powinien wywołać onSearch z poprawnym query gdy użytkownik klika przycisk", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Warszawa, Plac Defilad 1");
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      expect(defaultProps.onSearch).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSearch).toHaveBeenCalledWith("Warszawa, Plac Defilad 1");
    });

    it("powinien wywołać onSearch gdy użytkownik naciśnie Enter", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Kraków");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSearch).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSearch).toHaveBeenCalledWith("Kraków");
    });

    it("powinien wywołać onSearch tylko raz gdy użytkownik naciśnie Enter", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Gdańsk");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSearch).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSearch).toHaveBeenCalledWith("Gdańsk");
    });

    it("nie powinien wywołać onSearch gdy użytkownik naciśnie Enter z pustym query", async () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      
      // Używamy fireEvent.keyDown zamiast userEvent, aby symulować naciśnięcie Enter
      // nawet gdy input nie ma focusu
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      expect(defaultProps.onSearch).not.toHaveBeenCalled();
      
      // Czekamy na pojawienie się błędu walidacji
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Wprowadź adres do wyszukania");
      });
    });

    it("nie powinien wywołać onSearch gdy użytkownik naciśnie Enter z query < 3 znaki", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "ab");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSearch).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("Adres musi mieć co najmniej 3 znaki");
    });

    it("powinien trimować białe znaki z początku i końca przed walidacją", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "  Warszawa  ");
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      // onSearch powinien być wywołany z wartością bez trimowania (zachowujemy oryginalną wartość)
      // ale walidacja sprawdza trimmed.length
      expect(defaultProps.onSearch).toHaveBeenCalledWith("  Warszawa  ");
    });
  });

  describe("Stan ładowania", () => {
    it("powinien wyłączyć input gdy isLoading jest true", () => {
      render(<LocationSearch {...defaultProps} isLoading={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("powinien wyłączyć przycisk gdy isLoading jest true", () => {
      render(<LocationSearch {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).toBeDisabled();
    });

    it("powinien wyłączyć przycisk gdy query ma mniej niż 3 znaki", () => {
      render(<LocationSearch {...defaultProps} />);

      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).toBeDisabled();
    });

    it("powinien włączyć przycisk gdy query ma co najmniej 3 znaki i isLoading jest false", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });

      expect(button).toBeDisabled();

      await user.type(input, "abc");
      expect(button).not.toBeDisabled();
    });

    it("powinien wyświetlić spinner i tekst 'Szukam...' gdy isLoading jest true", () => {
      render(<LocationSearch {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).toHaveTextContent("Szukam...");
    });

    it("powinien wyświetlić ikonę Search i tekst 'Szukaj' gdy isLoading jest false", () => {
      render(<LocationSearch {...defaultProps} isLoading={false} />);

      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).toHaveTextContent("Szukaj");
    });

    it("nie powinien pozwolić na interakcję z inputem podczas ładowania", async () => {
      const user = userEvent.setup();
      render(<LocationSearch {...defaultProps} isLoading={true} />);

      const input = screen.getByRole("textbox");
      
      // Próba wpisania nie powinna zmienić wartości (input jest disabled)
      await user.type(input, "test");
      expect((input as HTMLInputElement).value).toBe("");
    });
  });

  describe("Obsługa błędów i edge cases", () => {
    it("powinien obsłużyć sytuację gdy onSearch rzuca błąd", async () => {
      const error = new Error("Network error");
      const onSearchWithError = vi.fn().mockRejectedValue(error);
      const user = userEvent.setup();
      
      render(<LocationSearch {...defaultProps} onSearch={onSearchWithError} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Warszawa");
      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      
      // Klikamy przycisk - komponent obsługuje błąd wewnętrznie
      await user.click(button);
      
      // Czekamy na wywołanie onSearch
      await waitFor(() => {
        expect(onSearchWithError).toHaveBeenCalled();
      });

      // Czekamy na zakończenie asynchronicznej operacji
      await waitFor(
        async () => {
          // Sprawdzamy czy komponent nadal działa po błędzie
          expect(screen.getByRole("textbox")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // Komponent powinien obsłużyć błąd (nie powinien się zepsuć)
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("powinien obsłużyć bardzo długi query", async () => {
      const user = userEvent.setup();
      const longQuery = "a".repeat(1000);
      
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      
      // Używamy paste zamiast type dla długich tekstów (type jest zbyt wolne)
      await user.click(input);
      await user.paste(longQuery);
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      expect(defaultProps.onSearch).toHaveBeenCalledWith(longQuery);
    });

    it("powinien obsłużyć query ze specjalnymi znakami", async () => {
      const user = userEvent.setup();
      const specialQuery = "Warszawa, ul. Żółkiewskiego 1/2, 03-123";
      
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      
      // Używamy paste zamiast type dla znaków specjalnych (type może mieć problemy z polskimi znakami)
      await user.click(input);
      await user.paste(specialQuery);
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      expect(defaultProps.onSearch).toHaveBeenCalledWith(specialQuery);
    });

    it("powinien obsłużyć query z emoji (edge case)", async () => {
      const user = userEvent.setup();
      const queryWithEmoji = "Warszawa 🏛️";
      
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      
      // Używamy paste zamiast type dla emoji (type może mieć problemy z emoji)
      await user.click(input);
      await user.paste(queryWithEmoji);
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      expect(defaultProps.onSearch).toHaveBeenCalledWith(queryWithEmoji);
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć poprawną strukturę ARIA", () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      const button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });

      expect(input).toHaveAttribute("aria-describedby", "location-search-help");
      expect(input).toHaveAttribute("aria-invalid", "false");
      expect(button).toHaveAttribute("aria-label", "Wyszukaj lokalizację");
    });

    it("powinien wyświetlić błąd walidacji z role='alert'", async () => {
      render(<LocationSearch {...defaultProps} />);

      const input = screen.getByRole("textbox");
      // Używamy Enter zamiast kliknięcia przycisku (przycisk jest disabled gdy query jest puste)
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      const errorMessage = await screen.findByRole("alert");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent("Wprowadź adres do wyszukania");
    });

    it("powinien powiązać label z inputem przez htmlFor", () => {
      render(<LocationSearch {...defaultProps} />);

      const label = screen.getByText("Wyszukaj adres");
      const input = screen.getByRole("textbox");

      expect(label).toHaveAttribute("for", "location-search");
      expect(input).toHaveAttribute("id", "location-search");
    });
  });

  describe("Props handling", () => {
    it("powinien przyjąć i użyć onSearch callback", async () => {
      const user = userEvent.setup();
      const customOnSearch = vi.fn().mockResolvedValue(undefined);
      
      render(<LocationSearch {...defaultProps} onSearch={customOnSearch} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.click(screen.getByRole("button", { name: /wyszukaj lokalizację/i }));

      expect(customOnSearch).toHaveBeenCalledWith("Test");
      expect(defaultProps.onSearch).not.toHaveBeenCalled();
    });

    it("powinien zareagować na zmianę isLoading prop", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<LocationSearch {...defaultProps} isLoading={false} />);

      // Ustawiamy query na co najmniej 3 znaki, aby przycisk był enabled
      const input = screen.getByRole("textbox");
      await user.type(input, "Test");

      let button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).not.toBeDisabled();

      rerender(<LocationSearch {...defaultProps} isLoading={true} />);
      button = screen.getByRole("button", { name: /wyszukaj lokalizację/i });
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("Szukam...");
    });

    it("powinien ignorować onSearchResults i onSearchError props (nie są używane w komponencie)", () => {
      // Te props są zdefiniowane w interfejsie, ale nie są używane w komponencie
      // To jest zgodne z aktualną implementacją
      const props = {
        ...defaultProps,
        onSearchResults: vi.fn(),
        onSearchError: vi.fn(),
      };

      render(<LocationSearch {...props} />);

      // Komponent powinien się renderować poprawnie
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });
});

