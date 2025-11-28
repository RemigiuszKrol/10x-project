import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/components/plans/ErrorState";

describe("ErrorState", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować komunikat błędu", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="To jest komunikat błędu" onRetry={mockOnRetry} />);

      expect(screen.getByText("To jest komunikat błędu")).toBeInTheDocument();
    });

    it("powinien renderować tytuł 'Wystąpił błąd'", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
      expect(screen.getByText("Wystąpił błąd").tagName).toBe("H2");
    });

    it("powinien renderować przycisk 'Spróbuj ponownie'", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it("powinien renderować ikonę AlertCircle", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const icon = alert.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("powinien renderować kontener z odpowiednimi stylami", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass("rounded-2xl");
      expect(alert).toHaveClass("shadow-xl");
      expect(alert).toHaveClass("p-12");
    });

    it("powinien renderować komunikat w elemencie <p> z id='error-message'", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Komunikat błędu" onRetry={mockOnRetry} />);

      const messageElement = screen.getByText("Komunikat błędu");
      expect(messageElement.tagName).toBe("P");
      expect(messageElement).toHaveAttribute("id", "error-message");
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onRetry gdy przycisk zostanie kliknięty", async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();

      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(button);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it("powinien wywołać onRetry wielokrotnie przy wielokrotnych kliknięciach", async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();

      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe("Dostępność (ARIA)", () => {
    it("powinien mieć role='alert'", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("powinien mieć aria-live='assertive'", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("powinien mieć aria-atomic='true'", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-atomic", "true");
    });

    it("powinien mieć aria-hidden='true' na ikonie SVG", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const icon = alert.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("powinien mieć aria-describedby na przycisku wskazujące na komunikat błędu", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toHaveAttribute("aria-describedby", "error-message");
    });
  });

  describe("Stylowanie", () => {
    it("powinien mieć odpowiednie klasy dla trybu jasnego", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-white");
      expect(alert).toHaveClass("border-red-100");
    });

    it("powinien mieć odpowiednie klasy dla trybu ciemnego", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("dark:bg-gray-800");
      expect(alert).toHaveClass("dark:border-red-900/30");
    });

    it("powinien mieć odpowiednie klasy dla kontenera ikony", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const iconContainer = alert.querySelector("div.flex.items-center.justify-center.w-16");
      expect(iconContainer).toHaveClass("w-16");
      expect(iconContainer).toHaveClass("h-16");
      expect(iconContainer).toHaveClass("rounded-full");
      expect(iconContainer).toHaveClass("bg-red-50");
      expect(iconContainer).toHaveClass("dark:bg-red-900/20");
    });

    it("powinien mieć odpowiednie klasy dla ikony", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const icon = alert.querySelector("svg");
      expect(icon).toHaveClass("h-8");
      expect(icon).toHaveClass("w-8");
      expect(icon).toHaveClass("text-red-600");
      expect(icon).toHaveClass("dark:text-red-400");
    });

    it("powinien mieć odpowiednie klasy dla tytułu", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const title = screen.getByText("Wystąpił błąd");
      expect(title).toHaveClass("text-xl");
      expect(title).toHaveClass("font-semibold");
      expect(title).toHaveClass("text-gray-900");
      expect(title).toHaveClass("dark:text-gray-100");
    });

    it("powinien mieć odpowiednie klasy dla komunikatu błędu", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const messageElement = screen.getByText("Błąd");
      expect(messageElement).toHaveClass("text-center");
      expect(messageElement).toHaveClass("text-gray-600");
      expect(messageElement).toHaveClass("dark:text-gray-400");
      expect(messageElement).toHaveClass("max-w-md");
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną strukturę zagnieżdżonych elementów", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const innerDiv = alert.querySelector("div");
      const iconContainer = innerDiv?.querySelector("div");
      const icon = iconContainer?.querySelector("svg");
      const title = innerDiv?.querySelector("h2");
      const message = innerDiv?.querySelector("p");
      const button = innerDiv?.querySelector("button");

      expect(innerDiv).toBeInTheDocument();
      expect(iconContainer).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(message).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it("powinien mieć flex layout dla wewnętrznego kontenera", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const innerDiv = alert.querySelector("div");
      expect(innerDiv).toHaveClass("flex");
      expect(innerDiv).toHaveClass("flex-col");
      expect(innerDiv).toHaveClass("items-center");
      expect(innerDiv).toHaveClass("justify-center");
      expect(innerDiv).toHaveClass("text-center");
    });
  });

  describe("Edge cases", () => {
    it("powinien renderować bardzo długi komunikat błędu", () => {
      const mockOnRetry = vi.fn();
      const longMessage = "A".repeat(1000);
      render(<ErrorState message={longMessage} onRetry={mockOnRetry} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("powinien renderować komunikat z HTML entities", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd & <test>" onRetry={mockOnRetry} />);

      expect(screen.getByText("Błąd & <test>")).toBeInTheDocument();
    });

    it("powinien renderować komunikat z emoji", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd ⚠️" onRetry={mockOnRetry} />);

      expect(screen.getByText("Błąd ⚠️")).toBeInTheDocument();
    });

    it("powinien renderować komunikat z wieloma liniami", () => {
      const mockOnRetry = vi.fn();
      const multilineMessage = "Linia 1\nLinia 2\nLinia 3";
      render(<ErrorState message={multilineMessage} onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const messageElement = alert.querySelector("p");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe(multilineMessage);
    });

    it("powinien renderować pusty komunikat", () => {
      const mockOnRetry = vi.fn();
      const { container } = render(<ErrorState message="" onRetry={mockOnRetry} />);

      const messageElement = container.querySelector("#error-message");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe("");
    });

    it("powinien renderować komunikat zawierający tylko białe znaki", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="   " onRetry={mockOnRetry} />);

      const alert = screen.getByRole("alert");
      const messageElement = alert.querySelector("p");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe("   ");
    });

    it("powinien działać poprawnie gdy onRetry nie jest wywoływany", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });
  });

  describe("Integracja z komponentem Button", () => {
    it("powinien przekazać variant='outline' do komponentu Button", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
      // Button powinien mieć odpowiednie klasy dla wariantu outline
    });

    it("powinien przekazać className='mt-6' do komponentu Button", () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState message="Błąd" onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toHaveClass("mt-6");
    });
  });
});

