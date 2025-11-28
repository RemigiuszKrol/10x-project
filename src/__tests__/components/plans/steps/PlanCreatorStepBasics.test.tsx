import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PlanCreatorStepBasics } from "@/components/plans/steps/PlanCreatorStepBasics";
import type { PlanBasicsFormData } from "@/types";

describe("PlanCreatorStepBasics", () => {
  const defaultData: PlanBasicsFormData = {
    name: "",
  };

  const defaultProps = {
    data: defaultData,
    onChange: vi.fn(),
    errors: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować nagłówek i opis", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      expect(screen.getByText("Podstawowe informacje")).toBeInTheDocument();
      expect(screen.getByText(/Rozpocznij od nadania nazwy swojemu planowi działki/i)).toBeInTheDocument();
    });

    it("powinien renderować pole input dla nazwy planu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "plan-name");
      expect(input).toHaveAttribute("type", "text");
    });

    it("powinien renderować gwiazdkę oznaczającą wymagane pole", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const label = screen.getByText(/Nazwa planu/i);
      const requiredMark = label.querySelector('span[aria-label="wymagane"]');
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveTextContent("*");
    });

    it("powinien renderować placeholder w input", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("placeholder", "np. Mój ogród, Działka letnia, Plan 2025");
    });

    it("powinien renderować wartość nazwy w input", () => {
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Mój ogród" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i) as HTMLInputElement;
      expect(input.value).toBe("Mój ogród");
    });

    it("powinien renderować licznik znaków", () => {
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Test" }} />);

      expect(screen.getByText("4 / 100 znaków")).toBeInTheDocument();
    });

    it("powinien renderować sekcję z wskazówką", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      expect(screen.getByText("💡 Wskazówka")).toBeInTheDocument();
      expect(
        screen.getByText(/Wybierz nazwę, która opisuje lokalizację lub przeznaczenie działki/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować tekst pomocniczy gdy nie ma błędu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      expect(screen.getByText(/Podaj opisową nazwę, która pomoże Ci rozpoznać ten plan/i)).toBeInTheDocument();
    });
  });

  describe("Auto-focus", () => {
    it("powinien ustawić focus na input przy montowaniu komponentu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveFocus();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onChange gdy użytkownik wpisuje tekst", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      // Wrapper komponentu zarządzający stanem lokalnie
      const TestWrapper = () => {
        const [data, setData] = useState<PlanBasicsFormData>({ name: "" });
        return (
          <PlanCreatorStepBasics
            data={data}
            onChange={(newData) => {
              setData(newData);
              handleChange(newData);
            }}
            errors={{}}
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      await user.type(input, "Mój ogród");

      expect(handleChange).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledWith({ name: "M" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mó" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój " });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój o" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój og" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój ogr" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój ogró" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Mój ogród" });
    });

    it("powinien zaktualizować licznik znaków podczas wpisywania", async () => {
      const user = userEvent.setup();

      // Wrapper komponentu zarządzający stanem lokalnie
      const TestWrapper = () => {
        const [data, setData] = useState<PlanBasicsFormData>({ name: "" });
        return (
          <PlanCreatorStepBasics
            data={data}
            onChange={(newData) => {
              setData(newData);
            }}
            errors={{}}
          />
        );
      };

      const { rerender } = render(<TestWrapper />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      await user.type(input, "Test");

      expect(screen.getByText("4 / 100 znaków")).toBeInTheDocument();

      rerender(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Długi tekst" }} />);
      expect(screen.getByText("11 / 100 znaków")).toBeInTheDocument();
    });

    it("powinien trimować białe znaki przy blur", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "  Mój ogród  " }} onChange={handleChange} />);

      await user.tab(); // blur

      expect(handleChange).toHaveBeenCalledWith({ name: "Mój ogród" });
    });

    it("powinien trimować białe znaki na początku i końcu", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "   Test   " }} onChange={handleChange} />);

      await user.tab();

      expect(handleChange).toHaveBeenLastCalledWith({ name: "Test" });
    });

    it("powinien zachować białe znaki wewnątrz tekstu przy trim", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "  Mój  ogród  " }} onChange={handleChange} />);

      await user.tab();

      expect(handleChange).toHaveBeenLastCalledWith({ name: "Mój  ogród" });
    });
  });

  describe("Walidacja i błędy", () => {
    it("powinien wyświetlić komunikat błędu gdy error.name jest podany", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Nazwa planu jest wymagana" }} />);

      expect(screen.getByText("Nazwa planu jest wymagana")).toBeInTheDocument();
    });

    it("nie powinien wyświetlać komunikatu błędu gdy error.name nie jest podany", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{}} />);

      const errorMessage = screen.queryByRole("alert");
      expect(errorMessage).not.toBeInTheDocument();
    });

    it("powinien zastosować style błędów do inputu gdy jest błąd", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveClass("border-red-500");
      expect(input).toHaveClass("focus-visible:ring-red-500");
    });

    it("nie powinien zastosować stylów błędów gdy nie ma błędu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{}} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).not.toHaveClass("border-red-500");
    });

    it("powinien ukryć tekst pomocniczy gdy jest błąd", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      expect(screen.queryByText(/Podaj opisową nazwę, która pomoże Ci rozpoznać ten plan/i)).not.toBeInTheDocument();
    });

    it("powinien wyświetlić tekst pomocniczy gdy błąd zniknie", () => {
      const { rerender } = render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      expect(screen.queryByText(/Podaj opisową nazwę, która pomoże Ci rozpoznać ten plan/i)).not.toBeInTheDocument();

      rerender(<PlanCreatorStepBasics {...defaultProps} errors={{}} />);

      expect(screen.getByText(/Podaj opisową nazwę, która pomoże Ci rozpoznać ten plan/i)).toBeInTheDocument();
    });
  });

  describe("Dostępność (ARIA)", () => {
    it("powinien ustawić aria-invalid na true gdy jest błąd", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("powinien ustawić aria-invalid na false gdy nie ma błędu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{}} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("aria-invalid", "false");
    });

    it("powinien ustawić aria-describedby na id komunikatu błędu gdy jest błąd", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("aria-describedby", "plan-name-error");
    });

    it("powinien ustawić aria-describedby na id tekstu pomocniczego gdy nie ma błędu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{}} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("aria-describedby", "plan-name-help");
    });

    it("powinien wyświetlić komunikat błędu z role='alert'", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute("id", "plan-name-error");
    });

    it("powinien wyświetlić ikonę ostrzeżenia w komunikacie błędu", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      const errorMessage = screen.getByRole("alert");
      const warningIcon = errorMessage.querySelector('span[aria-hidden="true"]');
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveTextContent("⚠");
    });
  });

  describe("Ograniczenia i walidacja", () => {
    it("powinien ustawić maxLength na 100 znaków", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("maxLength", "100");
    });

    it("powinien poprawnie wyświetlać licznik dla maksymalnej długości", () => {
      const longName = "A".repeat(100);
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: longName }} />);

      expect(screen.getByText("100 / 100 znaków")).toBeInTheDocument();
    });

    it("powinien poprawnie wyświetlać licznik dla pustego stringa", () => {
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "" }} />);

      expect(screen.getByText("0 / 100 znaków")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć pusty string jako wartość", () => {
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i) as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("powinien obsłużyć długi tekst jako wartość", () => {
      const longName = "A".repeat(50);
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: longName }} />);

      const input = screen.getByLabelText(/Nazwa planu/i) as HTMLInputElement;
      expect(input.value).toBe(longName);
    });

    it("powinien obsłużyć tekst z białymi znakami", () => {
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "  Test  " }} />);

      const input = screen.getByLabelText(/Nazwa planu/i) as HTMLInputElement;
      expect(input.value).toBe("  Test  ");
    });

    it("powinien obsłużyć zmianę wartości z zewnątrz", () => {
      const { rerender } = render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Initial" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i) as HTMLInputElement;
      expect(input.value).toBe("Initial");

      rerender(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Updated" }} />);
      expect(input.value).toBe("Updated");
    });

    it("powinien obsłużyć zmianę błędu z zewnątrz", () => {
      const { rerender } = render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Pierwszy błąd" }} />);

      expect(screen.getByText("Pierwszy błąd")).toBeInTheDocument();

      rerender(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Drugi błąd" }} />);
      expect(screen.getByText("Drugi błąd")).toBeInTheDocument();
      expect(screen.queryByText("Pierwszy błąd")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć usunięcie błędu", () => {
      const { rerender } = render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd" }} />);

      expect(screen.getByText("Błąd")).toBeInTheDocument();

      rerender(<PlanCreatorStepBasics {...defaultProps} errors={{}} />);
      expect(screen.queryByText("Błąd")).not.toBeInTheDocument();
    });

    it("powinien obsłużyć wiele błędów (tylko name jest obsługiwany)", () => {
      render(
        // @ts-expect-error: otherField is not a valid prop for PlanCreatorStepBasics, this is intentional for test purposes
        <PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd nazwy", otherField: "Inny błąd" }} />
      );

      expect(screen.getByText("Błąd nazwy")).toBeInTheDocument();
      expect(screen.queryByText("Inny błąd")).not.toBeInTheDocument();
    });
  });

  describe("Integracja z komponentami UI", () => {
    it("powinien poprawnie przekazać props do komponentu Input", () => {
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Test" }} errors={{ name: "Błąd" }} />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      expect(input).toHaveAttribute("id", "plan-name");
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("maxLength", "100");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "plan-name-error");
    });

    it("powinien poprawnie przekazać props do komponentu Label", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const label = screen.getByText(/Nazwa planu/i);
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe("LABEL");
      expect(label).toHaveAttribute("for", "plan-name");
    });
  });

  describe("Stylizacja i dark mode", () => {
    it("powinien zastosować odpowiednie klasy dla komunikatu błędu w dark mode", () => {
      render(<PlanCreatorStepBasics {...defaultProps} errors={{ name: "Błąd walidacji" }} />);

      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toHaveClass("dark:text-red-400");
    });

    it("powinien zastosować odpowiednie klasy dla sekcji wskazówki w dark mode", () => {
      render(<PlanCreatorStepBasics {...defaultProps} />);

      const hintSection = screen.getByText("💡 Wskazówka").closest("div");
      expect(hintSection).toHaveClass("dark:bg-blue-950/30");
      expect(hintSection).toHaveClass("dark:border-blue-900");
    });
  });

  describe("Komunikacja z komponentem nadrzędnym", () => {
    it("powinien wywołać onChange z poprawnymi danymi przy wpisywaniu", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      // Wrapper komponentu zarządzający stanem lokalnie
      const TestWrapper = () => {
        const [data, setData] = useState<PlanBasicsFormData>({ name: "" });
        return (
          <PlanCreatorStepBasics
            data={data}
            onChange={(newData) => {
              setData(newData);
              handleChange(newData);
            }}
            errors={{}}
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByLabelText(/Nazwa planu/i);
      await user.type(input, "Test");

      expect(handleChange).toHaveBeenCalledWith({ name: "T" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Te" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Tes" });
      expect(handleChange).toHaveBeenCalledWith({ name: "Test" });
    });

    it("powinien wywołać onChange z obciętymi białymi znakami przy blur", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "  Test  " }} onChange={handleChange} />);

      await user.tab();

      expect(handleChange).toHaveBeenCalledWith({ name: "Test" });
    });

    it("nie powinien wywołać onChange przy blur gdy nie ma zmian", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepBasics {...defaultProps} data={{ name: "Test" }} onChange={handleChange} />);

      await user.tab();

      // onChange może być wywołane, ale z tą samą wartością (trim nie zmienia)
      expect(handleChange).toHaveBeenCalled();
    });
  });
});
