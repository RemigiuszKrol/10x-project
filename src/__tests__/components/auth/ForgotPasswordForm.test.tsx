import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    // Reset mocks przed każdym testem
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować formularz z polem email", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByLabelText(/adres email/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /wyślij link resetujący/i })).toBeInTheDocument();
    });

    it("powinien renderować tytuł i opis formularza", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByText(/zapomniałeś hasła\?/i)).toBeInTheDocument();
      expect(
        screen.getByText(/wprowadź swój adres email, a wyślemy ci link do resetowania hasła/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować link do logowania", () => {
      render(<ForgotPasswordForm />);

      const loginLink = screen.getByRole("link", { name: /← wróć do logowania/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("powinien renderować pole email z odpowiednimi atrybutami", () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(emailInput).toHaveAttribute("autocomplete", "email");
      expect(emailInput).toHaveAttribute("placeholder", "twoj@email.pl");
    });
  });

  describe("Walidacja formularza", () => {
    it("powinien wyświetlić błąd gdy email jest pusty", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd gdy email ma nieprawidłowy format", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/nieprawidłowy format adresu email/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd dla email bez domeny", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/nieprawidłowy format adresu email/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić błąd dla email bez @", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "testexample.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/nieprawidłowy format adresu email/i)).toBeInTheDocument();
      });
    });

    it("powinien zaakceptować poprawny format email", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      // Nie powinno być błędów walidacji
      await waitFor(() => {
        expect(screen.queryByText(/email jest wymagany/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/nieprawidłowy format adresu email/i)).not.toBeInTheDocument();
      });
    });

    it("powinien wyczyścić błędy przed wysłaniem formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      // Najpierw wywołaj błąd walidacji
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      });

      // Wypełnij formularz i wyślij ponownie
      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");
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
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i) as HTMLInputElement;
      await user.type(emailInput, "test@example.com");

      expect(emailInput.value).toBe("test@example.com");
    });

    it("powinien wyłączyć pole email podczas ładowania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      // Opóźnij odpowiedź, żeby sprawdzić stan ładowania
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");
      await user.click(submitButton);

      // Sprawdź czy pole jest wyłączone podczas ładowania
      expect(emailInput).toBeDisabled();
    });
  });

  describe("Wysyłanie formularza - sukces", () => {
    it("powinien wysłać żądanie POST do /api/auth/forgot-password z danymi formularza", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        });
      });
    });

    it("powinien wyświetlić ekran sukcesu po udanym wysłaniu", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sprawdź swoją skrzynkę email/i)).toBeInTheDocument();
        expect(
          screen.getByText(/jeśli konto z podanym adresem email istnieje, wysłaliśmy na nie link do resetowania hasła/i)
        ).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić instrukcje w ekranie sukcesu", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/link jest ważny przez ograniczony czas/i)).toBeInTheDocument();
        expect(screen.getByText(/nie otrzymałeś wiadomości\? sprawdź folder spam/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić przycisk 'spróbuj ponownie' w ekranie sukcesu", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        const retryButton = screen.getByRole("button", { name: /spróbuj ponownie/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it("powinien wrócić do formularza po kliknięciu 'spróbuj ponownie'", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sprawdź swoją skrzynkę email/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /spróbuj ponownie/i });
      await user.click(retryButton);

      // Formularz powinien być znowu widoczny
      expect(screen.getByText(/zapomniałeś hasła\?/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/adres email/i)).toBeInTheDocument();
    });

    it("powinien wyświetlić link do logowania w ekranie sukcesu", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        const loginLink = screen.getByRole("link", { name: /← wróć do logowania/i });
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute("href", "/auth/login");
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
            message: "Wystąpił błąd podczas wysyłania linku resetującego",
          },
        }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas wysyłania linku resetującego/i)).toBeInTheDocument();
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailField = screen.getByLabelText(/adres email/i);
        const errorMessage = screen.getByText(/użytkownik o podanym adresie email nie istnieje/i);
        expect(errorMessage).toBeInTheDocument();
        // Sprawdź czy błąd jest powiązany z polem email
        expect(emailField).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("powinien wyświetlić błąd ogólny gdy API zwraca błąd z innym polem niż email", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Błąd serwera",
            field: "server",
          },
        }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/błąd serwera/i)).toBeInTheDocument();
        // Błąd powinien być ogólny, nie przy polu email
        const emailField = screen.getByLabelText(/adres email/i);
        expect(emailField).not.toHaveAttribute("aria-invalid", "true");
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd podczas wysyłania linku resetującego/i)).toBeInTheDocument();
      });
    });
  });

  describe("Obsługa błędów sieciowych", () => {
    it("powinien wyświetlić błąd gdy fetch rzuca wyjątek Error", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("powinien wyświetlić domyślny komunikat gdy fetch rzuca nieznany błąd", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce("Unknown error");

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/nie udało się połączyć z serwerem. sprawdź połączenie i spróbuj ponownie./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("powinien wyłączyć przycisk submit podczas ładowania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      // Opóźnij odpowiedź, żeby sprawdzić stan ładowania
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");
      await user.click(submitButton);

      // Sprawdź czy przycisk jest wyłączony podczas ładowania
      expect(submitButton).toBeDisabled();
    });

    it("powinien wyświetlić tekst 'Przetwarzanie...' podczas ładowania", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      // Opóźnij odpowiedź, żeby sprawdzić stan ładowania
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");
      await user.click(submitButton);

      // Sprawdź czy tekst ładowania jest widoczny
      await waitFor(() => {
        expect(screen.getByText(/przetwarzanie.../i)).toBeInTheDocument();
      });
    });

    it("powinien przywrócić stan formularza po zakończeniu ładowania (błąd)", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Błąd serwera",
          },
        }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");
      await user.click(submitButton);

      await waitFor(() => {
        // Po zakończeniu ładowania przycisk powinien być znowu aktywny
        expect(submitButton).not.toBeDisabled();
        expect(emailInput).not.toBeDisabled();
      });
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć odpowiednie atrybuty ARIA dla pola email z błędem", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/adres email/i);
        expect(emailInput).toHaveAttribute("aria-invalid", "true");
        expect(emailInput).toHaveAttribute("aria-describedby");
      });
    });

    it("powinien mieć odpowiednie atrybuty ARIA dla błędu ogólnego", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Błąd serwera",
          },
        }),
      } as Response);

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/adres email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole("alert");
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute("aria-live", "assertive");
      });
    });
  });
});
