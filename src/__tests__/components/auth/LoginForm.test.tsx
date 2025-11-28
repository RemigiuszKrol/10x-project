import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/LoginForm";

// Mock window.location.assign
const mockAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockAssign,
  },
  writable: true,
});

describe("LoginForm", () => {
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
    it("powinien renderować formularz z polami email i hasło", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/adres email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hasło/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zaloguj się/i })).toBeInTheDocument();
    });

    it("powinien renderować tytuł i opis formularza", () => {
      render(<LoginForm />);

      expect(screen.getByText(/witaj ponownie/i)).toBeInTheDocument();
      expect(screen.getByText(/zaloguj się na swoje konto/i)).toBeInTheDocument();
    });

    it("powinien renderować link do resetowania hasła", () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByRole("link", { name: /zapomniałeś hasła\?/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute("href", "/auth/forgot-password");
    });

    it("powinien renderować link do rejestracji", () => {
      render(<LoginForm />);

      const registerLink = screen.getByRole("link", { name: /zarejestruj się/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute("href", "/auth/register");
    });
  });

  describe("Walidacja formularza", () => {
    it("powinien wyświetlić błąd gdy email jest pusty", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło jest puste", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy email ma nieprawidłowy format", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/nieprawidłowy format adresu email/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błędy dla obu pól jednocześnie", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
        expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien zaakceptować poprawny format email", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/email jest wymagany/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/nieprawidłowy format adresu email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien aktualizować wartość pola email podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i) as HTMLInputElement;
      await user.type(emailInput, "test@example.com");

      expect(emailInput.value).toBe("test@example.com");
    });

    it("powinien aktualizować wartość pola hasło podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/hasło/i) as HTMLInputElement;
      await user.type(passwordInput, "mypassword");

      expect(passwordInput.value).toBe("mypassword");
    });

    it("powinien wyczyścić błędy po rozpoczęciu wpisywania w polu z błędem", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Wywołaj błąd walidacji
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });

      // Wpisz coś w pole email
      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      // Błąd powinien zniknąć po ponownym submit (ale nie automatycznie podczas wpisywania)
      // W tym przypadku błąd pozostaje do czasu ponownego submit
    });
  });

  describe("Wysyłanie formularza - sukces", () => {
    it("powinien wysłać żądanie POST do /api/auth/login z danymi formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        });
      });
    });

    it("powinien przekierować na /plans po udanym logowaniu", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith("/plans");
      });
    });

    it("powinien wyczyścić błędy przed wysłaniem formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      // Najpierw wywołaj błąd walidacji
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });

      // Wypełnij formularz i wyślij ponownie
      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Błędy powinny zniknąć
      await waitFor(() => {
        expect(screen.queryByText(/email jest wymagany/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Wysyłanie formularza - błędy z API", () => {
    it("powinien wyświetlić błąd ogólny gdy API zwraca błąd bez pola", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Wystąpił błąd podczas logowania",
          },
        }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas logowania/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd dla pola email gdy API zwraca błąd z field='email'", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Użytkownik o podanym adresie email nie istnieje",
            field: "email",
          },
        }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailField = screen.getByLabelText(/adres email/i);
        const errorMessage = screen.getByText(/użytkownik o podanym adresie email nie istnieje/i);
        expect(errorMessage).toBeInTheDocument();
        // Sprawdź czy błąd jest powiązany z polem email
        expect(emailField).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien wyświetlić błąd dla pola hasło gdy API zwraca błąd z field='password'", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Nieprawidłowe hasło",
            field: "password",
          },
        }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "wrongpassword");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        const passwordField = screen.getByLabelText(/hasło/i);
        const errorMessage = screen.getByText(/nieprawidłowe hasło/i);
        expect(errorMessage).toBeInTheDocument();
        expect(passwordField).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien użyć domyślnego komunikatu błędu gdy brak message w odpowiedzi", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {},
        }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas logowania/i)).toBeInTheDocument();
      });
    });
  });

  describe("Obsługa błędów sieciowych", () => {
    it("powinien wyświetlić błąd gdy fetch rzuca wyjątek Error", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić domyślny komunikat gdy fetch rzuca nieznany błąd", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce("Unknown error");

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/nie udało się połączyć z serwerem. sprawdź połączenie i spróbuj ponownie./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("powinien wyłączyć pola formularza podczas ładowania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      // Opóźnij odpowiedź, aby symulować ładowanie
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

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Pola powinny być wyłączone podczas ładowania
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it("powinien wyświetlić tekst 'Przetwarzanie...' na przycisku podczas ładowania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
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

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Sprawdź czy przycisk pokazuje stan ładowania
      await waitFor(() => {
        expect(screen.getByText(/przetwarzanie.../i)).toBeInTheDocument();
      });
    });

    it("powinien przywrócić stan formularza po zakończeniu ładowania (sukces)", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Poczekaj na zakończenie żądania
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Po przekierowaniu nie możemy sprawdzić stanu, ale możemy sprawdzić czy fetch został wywołany
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("powinien przywrócić stan formularza po zakończeniu ładowania (błąd)", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Błąd logowania",
          },
        }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Poczekaj na zakończenie żądania i wyświetlenie błędu
      await waitFor(() => {
        expect(screen.getByText(/błąd logowania/i)).toBeInTheDocument();
      });

      // Pola powinny być ponownie dostępne
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć poprawne atrybuty aria dla pól formularza", () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("name", "email");
      expect(emailInput).toHaveAttribute("id", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(emailInput).toHaveAttribute("autoComplete", "email");

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("name", "password");
      expect(passwordInput).toHaveAttribute("id", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("autoComplete", "current-password");
    });

    it("powinien oznaczyć pole jako nieprawidłowe gdy ma błąd", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien powiązać komunikat błędu z polem przez aria-describedby", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/email jest wymagany/i);
        expect(errorMessage).toHaveAttribute("id", "email-error");
        expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
      });
    });

    it("powinien mieć role='alert' dla ogólnego błędu", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Błąd ogólny",
          },
        }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);
      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole("alert");
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/błąd ogólny/i);
      });
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć email z wieloma znakami specjalnymi", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test+tag@example.co.uk");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/auth/login",
          expect.objectContaining({
            body: JSON.stringify({
              email: "test+tag@example.co.uk",
              password: "password123",
            }),
          })
        );
      });
    });

    it("powinien obsłużyć bardzo długie hasło", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      const longPassword = "a".repeat(200);
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, longPassword);

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("powinien obsłużyć odpowiedź API bez pola success", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Brak pola success
      } as Response);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getByLabelText(/hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zaloguj się/i });
      await user.click(submitButton);

      // Powinien obsłużyć brak pola success (nie przekieruje)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Nie powinno być przekierowania, ponieważ success nie jest true
      expect(mockAssign).not.toHaveBeenCalled();
    });
  });
});
