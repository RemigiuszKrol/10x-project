import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

// Mock window.location.assign
const mockAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockAssign,
  },
  writable: true,
});

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    // Reset mocks przed każdym testem
    vi.clearAllMocks();
    mockAssign.mockClear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować formularz z polami hasło i potwierdzenie hasła", () => {
      render(<ResetPasswordForm />);

      expect(document.getElementById("password")).toBeInTheDocument();
      expect(document.getElementById("confirmPassword")).toBeInTheDocument();
      
      // Sprawdź, że są dokładnie dwa pola z "hasło" w labelu
      const passwordFields = screen.getAllByLabelText(/hasło/i);
      expect(passwordFields).toHaveLength(2);
      
      expect(screen.getByRole("button", { name: /ustaw nowe hasło/i })).toBeInTheDocument();
    });

    it("powinien renderować tytuł i opis formularza", () => {
      render(<ResetPasswordForm />);

      // Tytuł jest w nagłówku h2
      const heading = screen.getByRole("heading", { name: /ustaw nowe hasło/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H2");
      
      expect(screen.getByText(/wprowadź nowe hasło dla swojego konta/i)).toBeInTheDocument();
    });

    it("powinien renderować link do profilu", () => {
      render(<ResetPasswordForm />);

      const profileLink = screen.getByRole("link", { name: /wróć do profilu/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute("href", "/profile");
    });

    it("powinien renderować informację o wymaganiach hasła", () => {
      render(<ResetPasswordForm />);

      expect(
        screen.getByText(/hasło musi zawierać co najmniej 8 znaków, w tym co najmniej jedną literę i jedną cyfrę/i)
      ).toBeInTheDocument();
    });
  });

  describe("Walidacja formularza - hasło", () => {
    it("powinien wyświetlić błąd gdy hasło jest puste", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło ma mniej niż 8 znaków", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      await user.type(passwordInput, "short1");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi mieć co najmniej 8 znaków/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło nie zawiera litery", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      await user.type(passwordInput, "12345678");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło nie zawiera cyfry", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      await user.type(passwordInput, "password");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).toBeInTheDocument();
      });
    });

    it("powinien zaakceptować poprawne hasło", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/hasło jest wymagane/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/hasło musi mieć co najmniej 8 znaków/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Walidacja formularza - potwierdzenie hasła", () => {
    it("powinien wyświetlić błąd gdy potwierdzenie hasła jest puste", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/potwierdzenie hasła jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasła nie są identyczne", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "different123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasła muszą być identyczne/i)).toBeInTheDocument();
      });
    });

    it("powinien zaakceptować identyczne hasła", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/potwierdzenie hasła jest wymagane/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/hasła muszą być identyczne/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Walidacja formularza - wszystkie pola", () => {
    it("powinien wyświetlić błędy dla wszystkich pustych pól jednocześnie", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
        expect(screen.getByText(/potwierdzenie hasła jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien wyczyścić błędy przed wysłaniem formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      // Najpierw wywołaj błędy walidacji
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
      });

      // Wypełnij formularz i wyślij ponownie
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Błędy powinny zniknąć
      await waitFor(() => {
        expect(screen.queryByText(/hasło jest wymagane/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien aktualizować wartość pola hasło podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0] as HTMLInputElement;
      await user.type(passwordInput, "mypassword123");

      expect(passwordInput.value).toBe("mypassword123");
    });

    it("powinien aktualizować wartość pola potwierdzenie hasła podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i) as HTMLInputElement;
      await user.type(confirmPasswordInput, "mypassword123");

      expect(confirmPasswordInput.value).toBe("mypassword123");
    });

    it("powinien wyłączyć pola podczas ładowania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      // Symuluj długie żądanie
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              } as Response);
            }, 100);
          })
      );

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Pola powinny być wyłączone podczas ładowania
      await waitFor(() => {
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Wysyłanie formularza - sukces", () => {
    it("powinien wysłać żądanie POST do /api/auth/reset-password z danymi formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: "password123",
            confirmPassword: "password123",
          }),
        });
      });
    });

    it("powinien przekierować do /auth/login po sukcesie", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, redirectTo: "/auth/login" }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("powinien użyć domyślnego przekierowania /auth/login gdy brak redirectTo", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("powinien wyłączyć przycisk podczas wysyłania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      // Symuluj długie żądanie
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              } as Response);
            }, 100);
          })
      );

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Przycisk powinien być wyłączony podczas ładowania
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Wysyłanie formularza - błędy", () => {
    it("powinien wyświetlić błąd ogólny gdy API zwraca błąd", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Token resetowania hasła wygasł" },
        }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/token resetowania hasła wygasł/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić domyślny komunikat błędu gdy brak message w error", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {},
        }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas resetowania hasła/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy wystąpi wyjątek sieciowy", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić domyślny komunikat błędu gdy wystąpi nieznany błąd", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce("Unknown error");

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/nie udało się połączyć z serwerem. sprawdź połączenie i spróbuj ponownie/i)
        ).toBeInTheDocument();
      });
    });

    it("powinien przywrócić stan ładowania po błędzie", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Błąd serwera" },
        }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Poczekaj na zakończenie żądania
      await waitFor(() => {
        expect(screen.getByText(/błąd serwera/i)).toBeInTheDocument();
      });

      // Pola powinny być ponownie dostępne
      await waitFor(() => {
        expect(passwordInput).not.toBeDisabled();
        expect(confirmPasswordInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć hasło z wielkimi i małymi literami oraz cyframi", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/auth/reset-password",
          expect.objectContaining({
            body: JSON.stringify({
              password: "Password123",
              confirmPassword: "Password123",
            }),
          })
        );
      });
    });

    it("powinien obsłużyć hasło z minimalną długością (8 znaków)", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "pass1234");
      await user.type(confirmPasswordInput, "pass1234");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/hasło musi mieć co najmniej 8 znaków/i)).not.toBeInTheDocument();
      });
    });

    it("powinien obsłużyć bardzo długie hasło", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      const longPassword = "a".repeat(100) + "1";
      await user.type(passwordInput, longPassword);
      await user.type(confirmPasswordInput, longPassword);

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("powinien obsłużyć hasło z cyfrą na początku", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "123password");
      await user.type(confirmPasswordInput, "123password");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).not.toBeInTheDocument();
      });
    });

    it("powinien obsłużyć hasło z literą na początku", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ResetPasswordForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź nowe hasło/i);

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).not.toBeInTheDocument();
      });
    });
  });
});

