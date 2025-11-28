import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitButton } from "@/components/auth/SubmitButton";

describe("SubmitButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować przycisk z przekazanymi children", () => {
      render(<SubmitButton>Zaloguj się</SubmitButton>);

      const button = screen.getByRole("button", { name: /zaloguj się/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Zaloguj się");
    });

    it("powinien renderować przycisk z type='submit'", () => {
      render(<SubmitButton>Wyślij</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("powinien renderować przycisk z domyślnymi klasami CSS (gradient, shadow)", () => {
      render(<SubmitButton>Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
      expect(button).toHaveClass("bg-gradient-to-r");
      expect(button).toHaveClass("from-green-600");
      expect(button).toHaveClass("to-emerald-600");
      expect(button).toHaveClass("shadow-md");
    });

    it("powinien renderować przycisk z custom className", () => {
      render(<SubmitButton className="custom-class">Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("Stan disabled", () => {
    it("powinien być wyłączony gdy disabled=true", () => {
      render(<SubmitButton disabled>Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("powinien być wyłączony gdy isLoading=true", () => {
      render(<SubmitButton isLoading>Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("powinien być wyłączony gdy disabled=true i isLoading=true", () => {
      render(
        <SubmitButton disabled isLoading>
          Test
        </SubmitButton>
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("powinien być aktywny gdy disabled=false i isLoading=false", () => {
      render(
        <SubmitButton disabled={false} isLoading={false}>
          Test
        </SubmitButton>
      );

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });
  });

  describe("Stan loading", () => {
    it("powinien wyświetlać spinner i tekst 'Przetwarzanie...' gdy isLoading=true", () => {
      render(<SubmitButton isLoading>Zaloguj się</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Przetwarzanie...");

      // Sprawdź czy spinner jest renderowany
      const spinner = button.querySelector("svg.animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("powinien wyświetlać children gdy isLoading=false", () => {
      render(<SubmitButton isLoading={false}>Zaloguj się</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Zaloguj się");
      expect(button).not.toHaveTextContent("Przetwarzanie...");
    });

    it("powinien ukryć spinner z aria-hidden gdy isLoading=false", () => {
      render(<SubmitButton isLoading={false}>Test</SubmitButton>);

      const button = screen.getByRole("button");
      const spinner = button.querySelector("svg.animate-spin");
      expect(spinner).not.toBeInTheDocument();
    });

    it("powinien mieć aria-hidden='true' na spinnerze SVG", () => {
      render(<SubmitButton isLoading>Test</SubmitButton>);

      const button = screen.getByRole("button");
      const spinner = button.querySelector("svg[aria-hidden='true']");
      expect(spinner).toBeInTheDocument();
    });

    it("powinien renderować spinner z poprawnymi klasami CSS", () => {
      render(<SubmitButton isLoading>Test</SubmitButton>);

      const button = screen.getByRole("button");
      const spinner = button.querySelector("svg.animate-spin");
      expect(spinner).toHaveClass("animate-spin");
      expect(spinner).toHaveClass("h-4");
      expect(spinner).toHaveClass("w-4");
    });

    it("powinien renderować kontener spinnera z flex i gap", () => {
      render(<SubmitButton isLoading>Test</SubmitButton>);

      const button = screen.getByRole("button");
      const container = button.querySelector("div.flex");
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("items-center");
      expect(container).toHaveClass("gap-2");
    });
  });

  describe("Interakcje", () => {
    it("powinien być klikalny gdy nie jest disabled i nie jest w stanie loading", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <SubmitButton onClick={handleClick} disabled={false} isLoading={false}>
          Kliknij
        </SubmitButton>
      );

      const button = screen.getByRole("button", { name: /kliknij/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("nie powinien być klikalny gdy jest disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <SubmitButton onClick={handleClick} disabled>
          Kliknij
        </SubmitButton>
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("nie powinien być klikalny gdy isLoading=true", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <SubmitButton onClick={handleClick} isLoading>
          Kliknij
        </SubmitButton>
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Props i wartości domyślne", () => {
    it("powinien używać domyślnych wartości dla isLoading i disabled", () => {
      render(<SubmitButton>Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveTextContent("Przetwarzanie...");
    });

    it("powinien akceptować różne typy children (string, elementy React)", () => {
      render(
        <SubmitButton>
          <span>Zaloguj się</span>
        </SubmitButton>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Zaloguj się");
    });

    it("powinien łączyć custom className z domyślnymi klasami", () => {
      render(<SubmitButton className="mt-4">Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
      expect(button).toHaveClass("bg-gradient-to-r");
      expect(button).toHaveClass("mt-4");
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć odpowiednią strukturę dla screen readerów w stanie loading", () => {
      render(<SubmitButton isLoading>Zaloguj się</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Przetwarzanie...");

      // Spinner powinien być ukryty dla screen readerów
      const spinner = button.querySelector("svg[aria-hidden='true']");
      expect(spinner).toBeInTheDocument();
    });

    it("powinien być dostępny dla klawiatury gdy nie jest disabled", () => {
      render(<SubmitButton>Test</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Edge cases", () => {
    it("powinien obsługiwać pusty children", () => {
      render(<SubmitButton>{""}</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("powinien obsługiwać null jako children", () => {
      render(<SubmitButton>{null}</SubmitButton>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("powinien przełączać się między stanem loading a normalnym", () => {
      const { rerender } = render(<SubmitButton isLoading={false}>Test</SubmitButton>);

      let button = screen.getByRole("button");
      expect(button).toHaveTextContent("Test");
      expect(button).not.toHaveTextContent("Przetwarzanie...");

      rerender(<SubmitButton isLoading>Test</SubmitButton>);

      button = screen.getByRole("button");
      expect(button).toHaveTextContent("Przetwarzanie...");
      expect(button).toBeDisabled();

      rerender(<SubmitButton isLoading={false}>Test</SubmitButton>);

      button = screen.getByRole("button");
      expect(button).toHaveTextContent("Test");
      expect(button).not.toBeDisabled();
    });
  });
});
