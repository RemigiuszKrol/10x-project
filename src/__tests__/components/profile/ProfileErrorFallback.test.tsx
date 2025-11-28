import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileErrorFallback } from "@/components/profile/ProfileErrorFallback";
import type { ProfileError } from "@/lib/hooks/useProfilePreferences";

describe("ProfileErrorFallback", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
    vi.clearAllMocks();
  });

  describe("Renderowanie - Unauthorized", () => {
    it("powinien renderować tytuł 'Brak dostępu' dla błędu Unauthorized", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Unauthorized",
        message: "Nie masz uprawnień do wyświetlenia profilu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Brak dostępu")).toBeInTheDocument();
      expect(screen.getByText("Brak dostępu").tagName).toBe("H3");
    });

    it("powinien renderować komunikat błędu dla Unauthorized", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Unauthorized",
        message: "Nie masz uprawnień do wyświetlenia profilu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Nie masz uprawnień do wyświetlenia profilu.")).toBeInTheDocument();
    });

    it("powinien renderować link do logowania zamiast przycisku retry dla Unauthorized", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Unauthorized",
        message: "Nie masz uprawnień.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const link = screen.getByRole("link", { name: /przejdź do logowania/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/auth/login");
      expect(screen.queryByRole("button", { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    });
  });

  describe("Renderowanie - Forbidden", () => {
    it("powinien renderować tytuł 'Brak dostępu' dla błędu Forbidden", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Forbidden",
        message: "Brak dostępu do zasobu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Brak dostępu")).toBeInTheDocument();
    });

    it("powinien renderować link do logowania dla Forbidden", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Forbidden",
        message: "Brak dostępu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const link = screen.getByRole("link", { name: /przejdź do logowania/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("Renderowanie - NotFound", () => {
    it("powinien renderować tytuł 'Profil nie znaleziony' dla błędu NotFound", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Profil nie został jeszcze utworzony.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Profil nie znaleziony")).toBeInTheDocument();
    });

    it("powinien renderować przycisk 'Spróbuj ponownie' dla NotFound", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Profil nie został jeszcze utworzony.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("Renderowanie - InternalError", () => {
    it("powinien renderować tytuł 'Wystąpił błąd' dla błędu InternalError", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Wystąpił nieoczekiwany błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
    });

    it("powinien renderować przycisk 'Spróbuj ponownie' dla InternalError", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Wystąpił nieoczekiwany błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Renderowanie - UpstreamTimeout", () => {
    it("powinien renderować tytuł 'Wystąpił błąd' dla błędu UpstreamTimeout", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "UpstreamTimeout",
        message: "Przekroczono limit czasu oczekiwania.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
    });

    it("powinien renderować przycisk 'Spróbuj ponownie' dla UpstreamTimeout", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "UpstreamTimeout",
        message: "Przekroczono limit czasu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Renderowanie - default case", () => {
    it("powinien renderować tytuł 'Wystąpił błąd' dla nieznanego kodu błędu", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "ValidationError" as ProfileError["code"],
        message: "Błąd walidacji.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
    });

    it("powinien renderować domyślny komunikat gdy message jest puste", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "ValidationError" as ProfileError["code"],
        message: "",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Nie udało się załadować profilu.")).toBeInTheDocument();
    });

    it("powinien renderować przycisk 'Spróbuj ponownie' dla domyślnego przypadku", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "ValidationError" as ProfileError["code"],
        message: "Błąd walidacji.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onRetry gdy przycisk 'Spróbuj ponownie' zostanie kliknięty", async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      const error: ProfileError = {
        code: "NotFound",
        message: "Profil nie znaleziony.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(button);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it("powinien wywołać onRetry wielokrotnie przy wielokrotnych kliknięciach", async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });

    it("nie powinien wywołać onRetry dla błędów Unauthorized/Forbidden", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Unauthorized",
        message: "Brak dostępu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });
  });

  describe("Ikony", () => {
    it("powinien renderować ikonę AlertCircle", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("powinien renderować ikonę RefreshCw w przycisku retry", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      const icon = button.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("nie powinien renderować ikony RefreshCw dla błędów Unauthorized/Forbidden", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Unauthorized",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const link = screen.getByRole("link");
      const icon = link.querySelector("svg");
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe("Stylowanie", () => {
    it("powinien mieć odpowiednie klasy dla kontenera głównego", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("min-h-[400px]");
      expect(mainContainer).toHaveClass("items-center");
      expect(mainContainer).toHaveClass("justify-center");
    });

    it("powinien mieć odpowiednie klasy dla karty błędu", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const card = container.querySelector(".rounded-2xl");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("border-red-200");
      expect(card).toHaveClass("dark:border-red-900/30");
      expect(card).toHaveClass("bg-white");
      expect(card).toHaveClass("dark:bg-gray-800");
      expect(card).toHaveClass("shadow-lg");
    });

    it("powinien mieć odpowiednie klasy dla ikony AlertCircle", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("h-5");
      expect(icon).toHaveClass("w-5");
      expect(icon).toHaveClass("text-red-600");
      expect(icon).toHaveClass("dark:text-red-400");
    });

    it("powinien mieć odpowiednie klasy dla tytułu", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const title = screen.getByText("Wystąpił błąd");
      expect(title).toHaveClass("font-semibold");
      expect(title).toHaveClass("text-gray-900");
      expect(title).toHaveClass("dark:text-gray-100");
    });

    it("powinien mieć odpowiednie klasy dla opisu", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Komunikat błędu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const description = screen.getByText("Komunikat błędu.");
      expect(description).toHaveClass("text-sm");
      expect(description).toHaveClass("text-gray-600");
      expect(description).toHaveClass("dark:text-gray-400");
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną strukturę zagnieżdżonych elementów", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const mainContainer = container.firstChild as HTMLElement;
      const card = mainContainer.querySelector(".rounded-2xl");
      const innerDiv = card?.querySelector(".flex.items-start");
      const icon = innerDiv?.querySelector("svg");
      const contentDiv = innerDiv?.querySelector(".flex-1");
      const title = contentDiv?.querySelector("h3");
      const description = contentDiv?.querySelector("p");
      const button = contentDiv?.querySelector("button");

      expect(mainContainer).toBeInTheDocument();
      expect(card).toBeInTheDocument();
      expect(innerDiv).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(contentDiv).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it("powinien mieć flex layout dla wewnętrznego kontenera", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const card = container.querySelector(".rounded-2xl");
      const innerDiv = card?.querySelector(".flex.items-start");
      expect(innerDiv).toHaveClass("flex");
      expect(innerDiv).toHaveClass("items-start");
      expect(innerDiv).toHaveClass("gap-3");
    });
  });

  describe("Edge cases", () => {
    it("powinien renderować bardzo długi komunikat błędu", () => {
      const mockOnRetry = vi.fn();
      const longMessage = "A".repeat(1000);
      const error: ProfileError = {
        code: "InternalError",
        message: longMessage,
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("powinien renderować komunikat z HTML entities", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd & <test>",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Błąd & <test>")).toBeInTheDocument();
    });

    it("powinien renderować komunikat z emoji", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd ⚠️",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Błąd ⚠️")).toBeInTheDocument();
    });

    it("powinien renderować komunikat z wieloma liniami", () => {
      const mockOnRetry = vi.fn();
      const multilineMessage = "Linia 1\nLinia 2\nLinia 3";
      const error: ProfileError = {
        code: "InternalError",
        message: multilineMessage,
      };

      const { container } = render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const description = container.querySelector("p.text-sm");
      expect(description).toBeInTheDocument();
      expect(description?.textContent).toBe(multilineMessage);
    });

    it("powinien renderować domyślny komunikat gdy message jest undefined", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "ValidationError" as ProfileError["code"],
        message: undefined as unknown as string,
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Nie udało się załadować profilu.")).toBeInTheDocument();
    });

    it("powinien działać poprawnie gdy onRetry nie jest wywoływany", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it("powinien obsłużyć błąd z fieldErrors", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "ValidationError" as ProfileError["code"],
        message: "Błąd walidacji.",
        fieldErrors: {
          theme: "Nieprawidłowy motyw",
        },
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Błąd walidacji.")).toBeInTheDocument();
    });
  });

  describe("Integracja z komponentem Button", () => {
    it("powinien przekazać variant='outline' do komponentu Button", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
    });

    it("powinien przekazać size='sm' do komponentu Button", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toBeInTheDocument();
    });

    it("powinien przekazać className='gap-2' do komponentu Button z ikoną", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Błąd.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      const button = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(button).toHaveClass("gap-2");
    });
  });

  describe("Funkcja getErrorContent", () => {
    it("powinien zwrócić odpowiednią konfigurację dla Unauthorized", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Unauthorized",
        message: "Brak dostępu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Brak dostępu")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /przejdź do logowania/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    });

    it("powinien zwrócić odpowiednią konfigurację dla Forbidden", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "Forbidden",
        message: "Brak dostępu.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Brak dostępu")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /przejdź do logowania/i })).toBeInTheDocument();
    });

    it("powinien zwrócić odpowiednią konfigurację dla NotFound", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "NotFound",
        message: "Profil nie znaleziony.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Profil nie znaleziony")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it("powinien zwrócić odpowiednią konfigurację dla InternalError", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "InternalError",
        message: "Błąd wewnętrzny.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it("powinien zwrócić odpowiednią konfigurację dla UpstreamTimeout", () => {
      const mockOnRetry = vi.fn();
      const error: ProfileError = {
        code: "UpstreamTimeout",
        message: "Timeout.",
      };

      render(<ProfileErrorFallback error={error} onRetry={mockOnRetry} />);

      expect(screen.getByText("Wystąpił błąd")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });
  });
});

