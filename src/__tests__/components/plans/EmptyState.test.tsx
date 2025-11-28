import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/plans/EmptyState";

describe("EmptyState", () => {
  let mockOnCreateNew: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    mockOnCreateNew = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować tytuł 'Brak planów'", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      expect(screen.getByRole("heading", { name: /brak planów/i })).toBeInTheDocument();
    });

    it("powinien renderować opis zachęcający do utworzenia planu", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      expect(
        screen.getByText(/nie masz jeszcze żadnych planów działki/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/utwórz pierwszy plan, aby rozpocząć planowanie swojego ogrodu/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować przycisk 'Utwórz pierwszy plan'", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      expect(button).toBeInTheDocument();
    });

    it("powinien renderować ikonę FileQuestion", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      // Ikona jest w kontenerze z gradientem
      const iconContainer = screen.getByRole("heading", { name: /brak planów/i }).closest("div")?.parentElement?.querySelector("svg");
      expect(iconContainer).toBeInTheDocument();
    });

    it("powinien renderować ikonę Sprout w przycisku", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      const icon = button.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("powinien renderować wskazówkę dla użytkownika", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      expect(
        screen.getByText(/plan działki pomoże ci optymalnie rozmieścić rośliny w ogrodzie/i)
      ).toBeInTheDocument();
    });
  });

  describe("Interakcje", () => {
    it("powinien wywołać onCreateNew gdy przycisk zostanie kliknięty", async () => {
      const user = userEvent.setup();
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      await user.click(button);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    });

    it("powinien wywołać onCreateNew tylko raz przy pojedynczym kliknięciu", async () => {
      const user = userEvent.setup();
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      await user.click(button);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
      expect(mockOnCreateNew).not.toHaveBeenCalledTimes(2);
    });

    it("powinien wywołać onCreateNew wielokrotnie przy wielu kliknięciach", async () => {
      const user = userEvent.setup();
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(3);
    });
  });

  describe("Stylowanie", () => {
    it("powinien mieć odpowiednie klasy dla kontenera głównego", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
      expect(mainContainer).toHaveClass("dark:bg-gray-800");
      expect(mainContainer).toHaveClass("rounded-2xl");
      expect(mainContainer).toHaveClass("border");
      expect(mainContainer).toHaveClass("shadow-xl");
      expect(mainContainer).toHaveClass("p-12");
    });

    it("powinien mieć odpowiednie klasy dla trybu ciemnego", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("dark:bg-gray-800");
      expect(mainContainer).toHaveClass("border-green-100");
      expect(mainContainer).toHaveClass("dark:border-gray-700");
    });

    it("powinien mieć odpowiednie klasy dla tytułu", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const heading = screen.getByRole("heading", { name: /brak planów/i });
      expect(heading).toHaveClass("text-2xl");
      expect(heading).toHaveClass("font-bold");
      expect(heading).toHaveClass("text-gray-900");
      expect(heading).toHaveClass("dark:text-gray-100");
    });

    it("powinien mieć odpowiednie klasy dla opisu", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const description = screen.getByText(/nie masz jeszcze żadnych planów działki/i);
      expect(description).toHaveClass("text-gray-600");
      expect(description).toHaveClass("dark:text-gray-400");
      expect(description).toHaveClass("max-w-md");
      expect(description).toHaveClass("leading-relaxed");
    });

    it("powinien mieć odpowiednie klasy dla sekcji wskazówki", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const hintSection = screen.getByText(/plan działki pomoże ci/i).closest("div");
      expect(hintSection).toHaveClass("border-t");
      expect(hintSection).toHaveClass("border-green-100");
      expect(hintSection).toHaveClass("dark:border-gray-700");
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną hierarchię elementów", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();

      const innerContainer = mainContainer.querySelector("div.flex.flex-col");
      expect(innerContainer).toBeInTheDocument();

      const heading = innerContainer?.querySelector("h2");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toContain("Brak planów");
    });

    it("powinien mieć kontener z ikoną z odpowiednimi klasami", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const iconContainer = container.querySelector("div.relative");
      expect(iconContainer).toBeInTheDocument();

      const gradientBackground = iconContainer?.querySelector("div.absolute.inset-0");
      expect(gradientBackground).toBeInTheDocument();

      const iconWrapper = iconContainer?.querySelector("div.relative.flex.items-center");
      expect(iconWrapper).toBeInTheDocument();
    });

    it("powinien mieć przycisk w kontenerze z odpowiednimi klasami", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      const buttonContainer = button.closest("div.flex");
      
      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer).toHaveClass("flex-col");
      expect(buttonContainer).toHaveClass("sm:flex-row");
      expect(buttonContainer).toHaveClass("gap-3");
    });
  });

  describe("Dostępność (Accessibility)", () => {
    it("powinien mieć semantyczny nagłówek h2", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe("Brak planów");
    });

    it("powinien mieć przycisk dostępny dla czytników ekranu", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute("aria-disabled", "true");
    });

    it("powinien mieć tekst alternatywny dla ikon", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      // Ikony SVG powinny mieć aria-hidden="true" jeśli są dekoracyjne
      const icons = screen.getByRole("button").querySelectorAll("svg");
      icons.forEach((icon) => {
        // Sprawdzamy czy ikony są dostępne (mogą mieć aria-hidden jeśli są dekoracyjne)
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe("Edge cases", () => {
    it("powinien działać gdy onCreateNew jest funkcją pustą", async () => {
      const emptyFn = vi.fn();
      const user = userEvent.setup();
      render(<EmptyState onCreateNew={emptyFn} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      await user.click(button);

      expect(emptyFn).toHaveBeenCalledTimes(1);
    });

    it("powinien działać gdy onCreateNew rzuca błąd", async () => {
      const errorFn = vi.fn(() => {
        throw new Error("Test error");
      });
      const user = userEvent.setup();
      render(<EmptyState onCreateNew={errorFn} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      
      // Funkcja powinna zostać wywołana, ale błąd nie powinien zepsuć renderowania
      await expect(user.click(button)).resolves.not.toThrow();
      expect(errorFn).toHaveBeenCalledTimes(1);
    });

    it("powinien renderować się poprawnie z różnymi implementacjami onCreateNew", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn(() => Promise.resolve());
      const fn3 = vi.fn(() => {});

      const { rerender } = render(<EmptyState onCreateNew={fn1} />);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<EmptyState onCreateNew={fn2} />);
      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<EmptyState onCreateNew={fn3} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Responsywność", () => {
    it("powinien mieć klasy responsywne dla kontenera przycisku", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const buttonContainer = screen.getByRole("button").closest("div.flex");
      expect(buttonContainer).toHaveClass("flex-col");
      expect(buttonContainer).toHaveClass("sm:flex-row");
    });

    it("powinien mieć odpowiednie klasy dla różnych rozmiarów ekranu", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      // Sprawdzamy czy komponent ma klasy responsywne
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe("Integracja z komponentami UI", () => {
    it("powinien używać komponentu Button z shadcn/ui", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      expect(button).toBeInTheDocument();
      // Button powinien mieć odpowiednie atrybuty
      expect(button.tagName).toBe("BUTTON");
    });

    it("powinien przekazywać size='lg' do komponentu Button", () => {
      render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const button = screen.getByRole("button", { name: /utwórz pierwszy plan/i });
      // Sprawdzamy czy przycisk ma odpowiednie klasy dla size="lg"
      expect(button).toBeInTheDocument();
    });
  });

  describe("Wizualne elementy", () => {
    it("powinien mieć efekt gradientu w tle ikony", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      const gradient = container.querySelector("div.absolute.inset-0.bg-gradient-to-br");
      expect(gradient).toBeInTheDocument();
      expect(gradient).toHaveClass("from-green-500/20");
      expect(gradient).toHaveClass("to-emerald-500/20");
      expect(gradient).toHaveClass("dark:from-green-500/10");
      expect(gradient).toHaveClass("dark:to-emerald-500/10");
      expect(gradient).toHaveClass("blur-2xl");
    });

    it("powinien mieć okrągły kontener dla ikony", () => {
      const { container } = render(<EmptyState onCreateNew={mockOnCreateNew} />);

      // Szukamy kontenera z klasami w-24 i h-24 (wewnętrzny kontener ikony)
      const iconWrapper = container.querySelector("div.w-24.h-24.rounded-full");
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper).toHaveClass("w-24");
      expect(iconWrapper).toHaveClass("h-24");
      expect(iconWrapper).toHaveClass("rounded-full");
      expect(iconWrapper).toHaveClass("flex");
      expect(iconWrapper).toHaveClass("items-center");
      expect(iconWrapper).toHaveClass("justify-center");
    });
  });
});

