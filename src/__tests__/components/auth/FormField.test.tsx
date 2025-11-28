import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "@/components/auth/FormField";

describe("FormField", () => {
  const defaultProps = {
    id: "test-field",
    name: "testField",
    label: "Test Label",
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować pole formularza z etykietą i inputem", () => {
      render(<FormField {...defaultProps} />);

      expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("powinien renderować input z poprawnym id i name", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "test-field");
      expect(input).toHaveAttribute("name", "testField");
    });

    it("powinien renderować etykietę powiązaną z inputem przez htmlFor", () => {
      render(<FormField {...defaultProps} />);

      const label = screen.getByText("Test Label");
      expect(label).toHaveAttribute("for", "test-field");
    });

    it("powinien renderować placeholder gdy jest podany", () => {
      render(<FormField {...defaultProps} placeholder="Wprowadź wartość" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "Wprowadź wartość");
    });

    it("powinien renderować wartość w input", () => {
      render(<FormField {...defaultProps} value="test value" />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("test value");
    });

    it("powinien renderować gwiazdkę dla wymaganych pól", () => {
      render(<FormField {...defaultProps} required />);

      const label = screen.getByText("Test Label");
      const requiredMark = label.querySelector("span");
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveTextContent("*");
      expect(requiredMark).toHaveClass("text-red-500");
    });

    it("nie powinien renderować gwiazdki gdy pole nie jest wymagane", () => {
      render(<FormField {...defaultProps} required={false} />);

      const label = screen.getByText("Test Label");
      const requiredMark = label.querySelector("span");
      expect(requiredMark).not.toBeInTheDocument();
    });
  });

  describe("Typy inputów", () => {
    it("powinien renderować input typu text jako domyślny", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
    });

    it("powinien renderować input typu email", () => {
      render(<FormField {...defaultProps} type="email" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("powinien renderować input typu password", () => {
      render(<FormField {...defaultProps} type="password" />);

      const input = screen.getByLabelText("Test Label");
      expect(input).toHaveAttribute("type", "password");
    });

    it("powinien renderować input typu number", () => {
      render(<FormField {...defaultProps} type="number" />);

      const input = screen.getByLabelText("Test Label");
      expect(input).toHaveAttribute("type", "number");
    });
  });

  describe("Obsługa błędów", () => {
    it("powinien wyświetlić komunikat błędu gdy error jest podany", () => {
      render(<FormField {...defaultProps} error="To pole jest wymagane" />);

      expect(screen.getByText("To pole jest wymagane")).toBeInTheDocument();
    });

    it("nie powinien wyświetlać komunikatu błędu gdy error nie jest podany", () => {
      render(<FormField {...defaultProps} />);

      const errorMessage = screen.queryByRole("alert");
      expect(errorMessage).not.toBeInTheDocument();
    });

    it("powinien zastosować style błędów do inputu gdy error jest podany", () => {
      render(<FormField {...defaultProps} error="Błąd walidacji" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-red-500");
    });

    it("nie powinien zastosować stylów błędów gdy error nie jest podany", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toHaveClass("border-red-500");
    });

    it("powinien wyświetlić komunikat błędu z odpowiednim id", () => {
      render(<FormField {...defaultProps} error="Błąd" />);

      const errorMessage = screen.getByText("Błąd");
      expect(errorMessage).toHaveAttribute("id", "test-field-error");
    });
  });

  describe("Dostępność (ARIA)", () => {
    it("powinien ustawić aria-invalid na true gdy jest błąd", () => {
      render(<FormField {...defaultProps} error="Błąd" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("powinien ustawić aria-invalid na false gdy nie ma błędu", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "false");
    });

    it("powinien ustawić aria-describedby na id komunikatu błędu gdy jest błąd", () => {
      render(<FormField {...defaultProps} error="Błąd" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "test-field-error");
    });

    it("nie powinien ustawić aria-describedby gdy nie ma błędu", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toHaveAttribute("aria-describedby");
    });

    it("powinien wyświetlić komunikat błędu z role='alert' i aria-live='polite'", () => {
      render(<FormField {...defaultProps} error="Błąd" />);

      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onChange gdy użytkownik wpisuje tekst", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormField {...defaultProps} onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test");

      expect(handleChange).toHaveBeenCalledTimes(4); // Raz dla każdej litery
    });

    it("powinien przekazać poprawne zdarzenie do onChange", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<FormField {...defaultProps} onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "a");

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty("target");
      expect(lastCall.target).toHaveProperty("value");
      expect(lastCall.type).toBe("change");
    });
  });

  describe("Stany komponentu", () => {
    it("powinien renderować disabled input gdy disabled jest true", () => {
      render(<FormField {...defaultProps} disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("powinien renderować enabled input gdy disabled jest false", () => {
      render(<FormField {...defaultProps} disabled={false} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toBeDisabled();
    });

    it("powinien renderować enabled input gdy disabled nie jest podany", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toBeDisabled();
    });

    it("powinien ustawić atrybut required gdy required jest true", () => {
      render(<FormField {...defaultProps} required />);

      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });

    it("nie powinien ustawić atrybutu required gdy required jest false", () => {
      render(<FormField {...defaultProps} required={false} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toBeRequired();
    });
  });

  describe("AutoComplete i AutoFocus", () => {
    it("powinien ustawić autoComplete gdy jest podany", () => {
      render(<FormField {...defaultProps} autoComplete="email" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("autocomplete", "email");
    });

    it("nie powinien ustawić autoComplete gdy nie jest podany", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toHaveAttribute("autocomplete");
    });

    it("nie powinien ustawić autoFocus gdy nie jest podany", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toHaveFocus();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć pusty string jako wartość", () => {
      render(<FormField {...defaultProps} value="" />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("powinien obsłużyć długi tekst jako wartość", () => {
      const longText = "a".repeat(1000);
      render(<FormField {...defaultProps} value={longText} />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe(longText);
    });

    it("powinien obsłużyć pusty string jako błąd", () => {
      render(<FormField {...defaultProps} error="" />);

      const errorMessage = screen.queryByRole("alert");
      // Pusty string jest falsy, więc błąd nie powinien być wyświetlony
      expect(errorMessage).not.toBeInTheDocument();
    });

    it("powinien obsłużyć zmianę wartości z zewnątrz", () => {
      const { rerender } = render(<FormField {...defaultProps} value="initial" />);

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("initial");

      rerender(<FormField {...defaultProps} value="updated" />);
      expect(input.value).toBe("updated");
    });

    it("powinien obsłużyć zmianę błędu z zewnątrz", () => {
      const { rerender } = render(<FormField {...defaultProps} error="Pierwszy błąd" />);

      expect(screen.getByText("Pierwszy błąd")).toBeInTheDocument();

      rerender(<FormField {...defaultProps} error="Drugi błąd" />);
      expect(screen.getByText("Drugi błąd")).toBeInTheDocument();
      expect(screen.queryByText("Pierwszy błąd")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć usunięcie błędu", () => {
      const { rerender } = render(<FormField {...defaultProps} error="Błąd" />);

      expect(screen.getByText("Błąd")).toBeInTheDocument();

      rerender(<FormField {...defaultProps} />);
      expect(screen.queryByText("Błąd")).not.toBeInTheDocument();
    });
  });

  describe("Klasy CSS i style", () => {
    it("powinien zastosować klasy dla dark mode w etykiecie", () => {
      render(<FormField {...defaultProps} />);

      const label = screen.getByText("Test Label");
      expect(label).toHaveClass("dark:text-gray-300");
    });

    it("powinien zastosować klasy dla dark mode w komunikacie błędu", () => {
      render(<FormField {...defaultProps} error="Błąd" />);

      const errorMessage = screen.getByText("Błąd");
      expect(errorMessage).toHaveClass("dark:text-red-400");
    });

    it("powinien zastosować odpowiednie klasy dla gwiazdki wymaganego pola w dark mode", () => {
      render(<FormField {...defaultProps} required />);

      const label = screen.getByText("Test Label");
      const requiredMark = label.querySelector("span");
      expect(requiredMark).toHaveClass("dark:text-red-400");
    });
  });

  describe("Integracja z komponentami UI", () => {
    it("powinien poprawnie przekazać props do komponentu Input", () => {
      render(
        <FormField
          {...defaultProps}
          type="email"
          placeholder="test@example.com"
          value="test"
          disabled
          required
          autoComplete="email"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
      expect(input).toHaveAttribute("placeholder", "test@example.com");
      expect(input).toHaveAttribute("value", "test");
      expect(input).toBeDisabled();
      expect(input).toBeRequired();
      expect(input).toHaveAttribute("autocomplete", "email");
    });

    it("powinien poprawnie przekazać props do komponentu Label", () => {
      render(<FormField {...defaultProps} label="Custom Label" />);

      const label = screen.getByText("Custom Label");
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe("LABEL");
    });
  });
});
