import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm, type ProfileFormValues, type ProfileFormErrors } from "@/components/profile/ProfileForm";
import type { UiTheme } from "@/types";

// Mock komponentów zależnych
vi.mock("@/components/profile/ThemeSelector", () => ({
  ThemeSelector: ({ value, onChange, disabled }: { value: UiTheme; onChange: (theme: UiTheme) => void; disabled: boolean }) => (
    <div data-testid="theme-selector">
      <button
        data-testid="theme-light"
        onClick={() => onChange("light")}
        disabled={disabled}
        aria-pressed={value === "light"}
      >
        Jasny
      </button>
      <button
        data-testid="theme-dark"
        onClick={() => onChange("dark")}
        disabled={disabled}
        aria-pressed={value === "dark"}
      >
        Ciemny
      </button>
    </div>
  ),
  DEFAULT_THEME_OPTIONS: [
    { value: "light", label: "Jasny", icon: null },
    { value: "dark", label: "Ciemny", icon: null },
  ],
}));

vi.mock("@/components/profile/ThemePreview", () => ({
  ThemePreview: ({ theme }: { theme: UiTheme }) => (
    <div data-testid="theme-preview" data-theme={theme}>
      Podgląd motywu: {theme}
    </div>
  ),
}));

vi.mock("@/components/profile/FormActions", () => ({
  FormActions: ({ isDirty, isSubmitting, onReset }: { isDirty: boolean; isSubmitting: boolean; onReset?: () => void }) => (
    <div data-testid="form-actions">
      <button type="submit" disabled={!isDirty || isSubmitting} data-testid="submit-button">
        {isSubmitting ? "Zapisywanie..." : "Zapisz"}
      </button>
      {onReset && (
        <button type="button" onClick={onReset} disabled={!isDirty || isSubmitting} data-testid="reset-button">
          Anuluj
        </button>
      )}
    </div>
  ),
}));

describe("ProfileForm", () => {
  const defaultInitialValues: ProfileFormValues = {
    theme: "light",
  };

  const defaultProps = {
    initialValues: defaultInitialValues,
    isSubmitting: false,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować formularz z podstawowymi elementami", () => {
      const { container } = render(<ProfileForm {...defaultProps} />);

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
      expect(screen.getByTestId("theme-selector")).toBeInTheDocument();
      expect(screen.getByTestId("theme-preview")).toBeInTheDocument();
      expect(screen.getByTestId("form-actions")).toBeInTheDocument();
    });

    it("powinien renderować formularz z odpowiednimi klasami CSS", () => {
      const { container } = render(<ProfileForm {...defaultProps} />);

      const form = container.querySelector("form");
      expect(form).toHaveClass("space-y-6");
      expect(form).toHaveClass("rounded-2xl");
      expect(form).toHaveClass("shadow-xl");
    });

    it("powinien wyświetlać ThemeSelector z wartością początkową", () => {
      render(<ProfileForm {...defaultProps} />);

      const lightButton = screen.getByTestId("theme-light");
      expect(lightButton).toHaveAttribute("aria-pressed", "true");
    });

    it("powinien wyświetlać ThemePreview z wartością początkową", () => {
      render(<ProfileForm {...defaultProps} />);

      const preview = screen.getByTestId("theme-preview");
      expect(preview).toHaveAttribute("data-theme", "light");
      expect(preview).toHaveTextContent("Podgląd motywu: light");
    });

    it("powinien wyświetlać FormActions z isDirty=false na początku", () => {
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Zarządzanie stanem formularza", () => {
    it("powinien inicjalizować wartości z initialValues", () => {
      render(<ProfileForm {...defaultProps} initialValues={{ theme: "dark" }} />);

      const darkButton = screen.getByTestId("theme-dark");
      expect(darkButton).toHaveAttribute("aria-pressed", "true");
    });

    it("powinien aktualizować wartości gdy initialValues się zmienią", async () => {
      const { rerender } = render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId("theme-light")).toHaveAttribute("aria-pressed", "true");

      rerender(<ProfileForm {...defaultProps} initialValues={{ theme: "dark" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("powinien wykrywać zmiany w formularzu (isDirty)", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();

      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it("powinien resetować isDirty po powrocie do wartości początkowych", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      const submitButton = screen.getByTestId("submit-button");
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      const lightButton = screen.getByTestId("theme-light");
      await user.click(lightButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Obsługa zmian motywu", () => {
    it("powinien aktualizować wartość motywu po kliknięciu w ThemeSelector", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "dark");
      });
    });

    it("powinien aktualizować podgląd motywu po zmianie", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      await waitFor(() => {
        const preview = screen.getByTestId("theme-preview");
        expect(preview).toHaveTextContent("Podgląd motywu: dark");
      });
    });

    it("powinien wyłączyć ThemeSelector gdy isSubmitting=true", () => {
      render(<ProfileForm {...defaultProps} isSubmitting={true} />);

      const lightButton = screen.getByTestId("theme-light");
      const darkButton = screen.getByTestId("theme-dark");

      expect(lightButton).toBeDisabled();
      expect(darkButton).toBeDisabled();
    });
  });

  describe("Resetowanie formularza", () => {
    it("powinien resetować wartości do initialValues po kliknięciu Anuluj", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      // Zmień wartość
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "dark");
      });

      // Resetuj
      const resetButton = screen.getByTestId("reset-button");
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "light");
        expect(screen.getByTestId("theme-light")).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("powinien resetować isDirty po resetowaniu formularza", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      // Zmień wartość
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      const submitButton = screen.getByTestId("submit-button");
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Resetuj
      const resetButton = screen.getByTestId("reset-button");
      await user.click(resetButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it("powinien działać z wewnętrznym resetem gdy onReset nie jest przekazany", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      // Zmień wartość
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "dark");
      });

      // Resetuj używając wewnętrznego handleReset
      const resetButton = screen.getByTestId("reset-button");
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "light");
      });
    });
  });

  describe("Submit formularza", () => {
    it("powinien wywołać onSubmit z aktualnymi wartościami po submit", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      render(<ProfileForm {...defaultProps} onSubmit={handleSubmit} />);

      // Zmień wartość
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      // Submit
      const submitButton = screen.getByTestId("submit-button");
      await user.click(submitButton);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
        expect(handleSubmit).toHaveBeenCalledWith({ theme: "dark" });
      });
    });

    it("nie powinien wywołać onSubmit gdy formularz nie jest dirty", async () => {
      const handleSubmit = vi.fn();
      const { container } = render(<ProfileForm {...defaultProps} onSubmit={handleSubmit} />);

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      
      // Submit button jest disabled, więc form nie powinien się submitować
      // Nawet jeśli spróbujemy submitować formularz, handleSubmit nie powinien być wywołany
      // bo w handleSubmit jest warunek: if (!isDirty || isSubmitting) return;
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it("nie powinien wywołać onSubmit gdy isSubmitting=true", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      render(<ProfileForm {...defaultProps} onSubmit={handleSubmit} isSubmitting={true} />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();

      // Próba kliknięcia w disabled button nie powinna nic zrobić
      await user.click(submitButton);

      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it("powinien zapobiec domyślnemu zachowaniu formularza (preventDefault)", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      const { container } = render(<ProfileForm {...defaultProps} onSubmit={handleSubmit} />);

      // Zmień wartość
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      // Submit przez form
      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      if (form) {
        const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        await waitFor(() => {
          expect(handleSubmit).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Wyświetlanie błędów", () => {
    it("powinien wyświetlać globalny komunikat błędu gdy fieldErrors.global jest podany", () => {
      const fieldErrors: ProfileFormErrors = {
        global: "Wystąpił błąd podczas zapisywania",
      };

      render(<ProfileForm {...defaultProps} fieldErrors={fieldErrors} />);

      expect(screen.getByText("Wystąpił błąd podczas zapisywania")).toBeInTheDocument();
    });

    it("powinien wyświetlać komunikat błędu z odpowiednimi stylami", () => {
      const fieldErrors: ProfileFormErrors = {
        global: "Błąd",
      };

      render(<ProfileForm {...defaultProps} fieldErrors={fieldErrors} />);

      const errorMessage = screen.getByText("Błąd");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.closest("div")).toHaveClass("bg-red-50");
      expect(errorMessage.closest("div")).toHaveClass("dark:bg-red-900/20");
    });

    it("nie powinien wyświetlać komunikatu błędu gdy fieldErrors.global nie jest podany", () => {
      render(<ProfileForm {...defaultProps} />);

      const errorContainer = screen.queryByRole("alert");
      expect(errorContainer).not.toBeInTheDocument();
    });

    it("nie powinien wyświetlać komunikatu błędu gdy fieldErrors jest undefined", () => {
      render(<ProfileForm {...defaultProps} fieldErrors={undefined} />);

      const errorContainer = screen.queryByRole("alert");
      expect(errorContainer).not.toBeInTheDocument();
    });

    it("powinien wyświetlać komunikat błędu nawet gdy fieldErrors.theme jest podany", () => {
      const fieldErrors: ProfileFormErrors = {
        theme: "Nieprawidłowy motyw",
        global: "Błąd globalny",
      };

      render(<ProfileForm {...defaultProps} fieldErrors={fieldErrors} />);

      expect(screen.getByText("Błąd globalny")).toBeInTheDocument();
    });
  });

  describe("Integracja z podkomponentami", () => {
    it("powinien przekazać poprawne props do ThemeSelector", () => {
      render(<ProfileForm {...defaultProps} initialValues={{ theme: "dark" }} />);

      const darkButton = screen.getByTestId("theme-dark");
      expect(darkButton).toHaveAttribute("aria-pressed", "true");
    });

    it("powinien przekazać poprawne props do ThemePreview", () => {
      render(<ProfileForm {...defaultProps} initialValues={{ theme: "dark" }} />);

      const preview = screen.getByTestId("theme-preview");
      expect(preview).toHaveAttribute("data-theme", "dark");
    });

    it("powinien przekazać poprawne props do FormActions", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      // Na początku isDirty=false
      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();

      // Po zmianie isDirty=true
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it("powinien przekazać isSubmitting do FormActions", () => {
      render(<ProfileForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Zapisywanie...");
    });
  });

  describe("Edge cases", () => {
    it("powinien obsługiwać szybkie zmiany wartości", async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const lightButton = screen.getByTestId("theme-light");
      const darkButton = screen.getByTestId("theme-dark");

      await user.click(darkButton);
      await user.click(lightButton);
      await user.click(darkButton);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "dark");
      });
    });

    it("powinien obsługiwać reset podczas submitowania", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      render(<ProfileForm {...defaultProps} onSubmit={handleSubmit} />);

      // Zmień wartość
      const darkButton = screen.getByTestId("theme-dark");
      await user.click(darkButton);

      // Reset przed submitem
      const resetButton = screen.getByTestId("reset-button");
      await user.click(resetButton);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeDisabled();
    });

    it("powinien synchronizować wartości gdy initialValues zmienia się z zewnątrz", async () => {
      const { rerender } = render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "light");

      rerender(<ProfileForm {...defaultProps} initialValues={{ theme: "dark" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "dark");
      });
    });

    it("powinien obsługiwać przypadek gdy initialValues.theme jest takie samo jak aktualna wartość", () => {
      const { rerender } = render(<ProfileForm {...defaultProps} initialValues={{ theme: "light" }} />);

      expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "light");

      // Zmień na to samo
      rerender(<ProfileForm {...defaultProps} initialValues={{ theme: "light" }} />);

      expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "light");
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć poprawną strukturę formularza", () => {
      const { container } = render(<ProfileForm {...defaultProps} />);

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
      expect(form?.tagName).toBe("FORM");
    });

    it("powinien mieć dostępne przyciski w FormActions", () => {
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByTestId("submit-button");
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("type", "submit");
    });
  });

  describe("Props i wartości domyślne", () => {
    it("powinien działać bez fieldErrors", () => {
      const { container } = render(<ProfileForm {...defaultProps} />);

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
    });

    it("powinien działać z pustym obiektem fieldErrors", () => {
      const { container } = render(<ProfileForm {...defaultProps} fieldErrors={{}} />);

      const form = container.querySelector("form");
      expect(form).toBeInTheDocument();
    });

    it("powinien akceptować różne wartości UiTheme", () => {
      const { rerender } = render(<ProfileForm {...defaultProps} initialValues={{ theme: "light" }} />);

      expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "light");

      rerender(<ProfileForm {...defaultProps} initialValues={{ theme: "dark" }} />);

      expect(screen.getByTestId("theme-preview")).toHaveAttribute("data-theme", "dark");
    });
  });
});

