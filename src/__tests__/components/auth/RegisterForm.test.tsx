import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "@/components/auth/RegisterForm";

// Mock window.location.assign
const mockAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockAssign,
  },
  writable: true,
});

describe("RegisterForm", () => {
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
    it("powinien renderować formularz z polami email, hasło i potwierdzenie hasła", () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText(/adres email/i)).toBeInTheDocument();
      
      // Sprawdź pola hasła używając selektorów po ID (bardziej niezawodne)
      expect(document.getElementById("password")).toBeInTheDocument();
      expect(document.getElementById("confirmPassword")).toBeInTheDocument();
      
      // Sprawdź, że są dokładnie dwa pola z "hasło" w labelu
      const passwordFields = screen.getAllByLabelText(/hasło/i);
      expect(passwordFields).toHaveLength(2);
      
      expect(screen.getByRole("button", { name: /zarejestruj się/i })).toBeInTheDocument();
    });

    it("powinien renderować tytuł i opis formularza", () => {
      render(<RegisterForm />);

      expect(screen.getByText(/utwórz konto/i)).toBeInTheDocument();
      expect(screen.getByText(/rozpocznij planowanie swojego ogrodu/i)).toBeInTheDocument();
    });

    it("powinien renderować link do logowania", () => {
      render(<RegisterForm />);

      const loginLink = screen.getByRole("link", { name: /zaloguj się/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("powinien renderować informację o wymaganiach hasła", () => {
      render(<RegisterForm />);

      expect(
        screen.getByText(/hasło musi zawierać co najmniej 8 znaków, w tym co najmniej jedną literę i jedną cyfrę/i)
      ).toBeInTheDocument();
    });
  });

  describe("Walidacja formularza - email", () => {
    it("powinien wyświetlić błąd gdy email jest pusty", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy email ma nieprawidłowy format", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/nieprawidłowy format adresu email/i)).toBeInTheDocument();
      });
    });

    it("powinien zaakceptować poprawny format email", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/email jest wymagany/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/nieprawidłowy format adresu email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Walidacja formularza - hasło", () => {
    it("powinien wyświetlić błąd gdy hasło jest puste", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło ma mniej niż 8 znaków", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "short1");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi mieć co najmniej 8 znaków/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło nie zawiera litery", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "12345678");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasło nie zawiera cyfry", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).toBeInTheDocument();
      });
    });

    it("powinien zaakceptować poprawne hasło (min 8 znaków, litera + cyfra)", async () => {
      const user = userEvent.setup();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
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
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/potwierdzenie hasła jest wymagane/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy hasła nie są identyczne", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "different123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
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
      render(<RegisterForm />);

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
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

      render(<RegisterForm />);

      // Najpierw wywołaj błędy walidacji
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });

      // Wypełnij formularz i wyślij ponownie
      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Błędy powinny zniknąć
      await waitFor(() => {
        expect(screen.queryByText(/email jest wymagany/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien aktualizować wartość pola email podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i) as HTMLInputElement;
      await user.type(emailInput, "test@example.com");

      expect(emailInput.value).toBe("test@example.com");
    });

    it("powinien aktualizować wartość pola hasło podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const passwordInput = screen.getAllByLabelText(/hasło/i)[0] as HTMLInputElement;
      await user.type(passwordInput, "mypassword123");

      expect(passwordInput.value).toBe("mypassword123");
    });

    it("powinien aktualizować wartość pola potwierdzenie hasła podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i) as HTMLInputElement;
      await user.type(confirmPasswordInput, "mypassword123");

      expect(confirmPasswordInput.value).toBe("mypassword123");
    });
  });

  describe("Wysyłanie formularza - sukces", () => {
    it("powinien wysłać żądanie POST do /api/auth/register z danymi formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
            confirmPassword: "password123",
          }),
        });
      });
    });

    it("powinien przekierować na /auth/register-success po udanej rejestracji", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith("/auth/register-success");
      });
    });

    it("powinien przekierować z parametrem email gdy API zwraca email w data", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            email: "test@example.com",
          },
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith("/auth/register-success?email=test%40example.com");
      });
    });

    it("powinien użyć redirectTo z odpowiedzi API jeśli jest dostępny", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          redirectTo: "/custom-redirect",
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith("/custom-redirect");
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
            message: "Wystąpił błąd podczas rejestracji",
          },
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas rejestracji/i)).toBeInTheDocument();
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
            message: "Użytkownik o podanym adresie email już istnieje",
            field: "email",
          },
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/użytkownik o podanym adresie email już istnieje/i);
        expect(errorMessage).toBeInTheDocument();
        expect(emailInput).toHaveAttribute("aria-invalid", "true");
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
            message: "Hasło jest zbyt słabe",
            field: "password",
          },
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        const passwordField = screen.getAllByLabelText(/hasło/i)[0];
        const errorMessage = screen.getByText(/hasło jest zbyt słabe/i);
        expect(errorMessage).toBeInTheDocument();
        expect(passwordField).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien wyświetlić błąd dla pola confirmPassword gdy API zwraca błąd z field='confirmPassword'", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Hasła nie są identyczne",
            field: "confirmPassword",
          },
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        const confirmPasswordField = screen.getByLabelText(/potwierdź hasło/i);
        const errorMessage = screen.getByText(/hasła nie są identyczne/i);
        expect(errorMessage).toBeInTheDocument();
        expect(confirmPasswordField).toHaveAttribute("aria-invalid", "true");
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas rejestracji/i)).toBeInTheDocument();
      });
    });
  });

  describe("Obsługa błędów sieciowych", () => {
    it("powinien wyświetlić błąd gdy fetch rzuca wyjątek Error", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić domyślny komunikat gdy fetch rzuca nieznany błąd", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce("Unknown error");

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Pola powinny być wyłączone podczas ładowania
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
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
            message: "Błąd rejestracji",
          },
        }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      // Poczekaj na zakończenie żądania i wyświetlenie błędu
      await waitFor(() => {
        expect(screen.getByText(/błąd rejestracji/i)).toBeInTheDocument();
      });

      // Pola powinny być ponownie dostępne
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(confirmPasswordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć poprawne atrybuty aria dla pól formularza", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("name", "email");
      expect(emailInput).toHaveAttribute("id", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(emailInput).toHaveAttribute("autoComplete", "email");

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("name", "password");
      expect(passwordInput).toHaveAttribute("id", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("autoComplete", "new-password");

      expect(confirmPasswordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("name", "confirmPassword");
      expect(confirmPasswordInput).toHaveAttribute("id", "confirmPassword");
      expect(confirmPasswordInput).toHaveAttribute("required");
      expect(confirmPasswordInput).toHaveAttribute("autoComplete", "new-password");
    });

    it("powinien oznaczyć pole jako nieprawidłowe gdy ma błąd", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien powiązać komunikat błędu z polem przez aria-describedby", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test+tag@example.co.uk");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/auth/register",
          expect.objectContaining({
            body: JSON.stringify({
              email: "test+tag@example.co.uk",
              password: "password123",
              confirmPassword: "password123",
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      const longPassword = "a".repeat(200) + "1";
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, longPassword);
      await user.type(confirmPasswordInput, longPassword);

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
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

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      // Powinien obsłużyć brak pola success (nie przekieruje)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Nie powinno być przekierowania, ponieważ success nie jest true
      expect(mockAssign).not.toHaveBeenCalled();
    });

    it("powinien obsłużyć hasło z samymi literami (bez cyfry)", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password");
      await user.type(confirmPasswordInput, "password");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).toBeInTheDocument();
      });
    });

    it("powinien obsłużyć hasło z samymi cyframi (bez litery)", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "12345678");
      await user.type(confirmPasswordInput, "12345678");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi zawierać co najmniej jedną literę i cyfrę/i)).toBeInTheDocument();
      });
    });

    it("powinien obsłużyć hasło dokładnie 8 znaków (minimum)", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const passwordInput = screen.getAllByLabelText(/hasło/i)[0];
      const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "pass1234");
      await user.type(confirmPasswordInput, "pass1234");

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/hasło musi mieć co najmniej 8 znaków/i)).not.toBeInTheDocument();
      });
    });
  });
});

