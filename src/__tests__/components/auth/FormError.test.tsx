import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormError } from "@/components/auth/FormError";

describe("FormError", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie", () => {
    it("powinien renderować komunikat błędu gdy message jest podany", () => {
      render(<FormError message="To jest komunikat błędu" />);

      expect(screen.getByText("To jest komunikat błędu")).toBeInTheDocument();
    });

    it("powinien renderować kontener z odpowiednimi stylami", () => {
      render(<FormError message="Błąd" />);
      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveClass("rounded-lg");
    });

    it("powinien renderować ikonę błędu", () => {
      render(<FormError message="Błąd" />);

      const icon = screen.getByRole("alert").querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("powinien renderować komunikat w elemencie <p>", () => {
      render(<FormError message="Komunikat błędu" />);

      const messageElement = screen.getByText("Komunikat błędu");
      expect(messageElement.tagName).toBe("P");
      expect(messageElement).toHaveClass("text-sm");
    });
  });

  describe("Conditional rendering", () => {
    it("nie powinien renderować niczego gdy message jest undefined", () => {
      const { container } = render(<FormError message={undefined} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("nie powinien renderować niczego gdy message jest null", () => {
      const { container } = render(<FormError message={null as unknown as string} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("nie powinien renderować niczego gdy message jest pustym stringiem", () => {
      const { container } = render(<FormError message="" />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("powinien renderować gdy message zawiera tylko białe znaki", () => {
      render(<FormError message="   " />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      const messageElement = alert.querySelector("p");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe("   ");
    });
  });

  describe("Custom className", () => {
    it("powinien zastosować dodatkową klasę CSS z prop className", () => {
      render(<FormError message="Błąd" className="custom-class" />);
      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveClass("custom-class");
    });

    it("powinien działać bez className", () => {
      render(<FormError message="Błąd" />);

      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe("Dostępność (ARIA)", () => {
    it("powinien mieć role='alert'", () => {
      render(<FormError message="Błąd" />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("powinien mieć aria-live='assertive'", () => {
      render(<FormError message="Błąd" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("powinien mieć aria-hidden='true' na ikonie SVG", () => {
      render(<FormError message="Błąd" />);

      const icon = screen.getByRole("alert").querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Stylowanie", () => {
    it("powinien mieć odpowiednie klasy dla trybu jasnego", () => {
      render(<FormError message="Błąd" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-red-50");
      expect(alert).toHaveClass("border-red-200");
    });

    it("powinien mieć odpowiednie klasy dla trybu ciemnego", () => {
      render(<FormError message="Błąd" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("dark:bg-red-900/20");
      expect(alert).toHaveClass("dark:border-red-900/30");
    });

    it("powinien mieć odpowiednie klasy dla tekstu komunikatu", () => {
      render(<FormError message="Błąd" />);

      const messageElement = screen.getByText("Błąd");
      expect(messageElement).toHaveClass("text-red-800");
      expect(messageElement).toHaveClass("dark:text-red-300");
      expect(messageElement).toHaveClass("font-medium");
    });

    it("powinien mieć odpowiednie klasy dla ikony", () => {
      render(<FormError message="Błąd" />);

      const icon = screen.getByRole("alert").querySelector("svg");
      expect(icon).toHaveClass("text-red-500");
      expect(icon).toHaveClass("dark:text-red-400");
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną strukturę zagnieżdżonych elementów", () => {
      render(<FormError message="Błąd" />);

      const alert = screen.getByRole("alert");
      const innerDiv = alert.querySelector("div");
      const icon = innerDiv?.querySelector("svg");
      const message = innerDiv?.querySelector("p");

      expect(innerDiv).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(message).toBeInTheDocument();
    });

    it("powinien mieć flex layout dla wewnętrznego kontenera", () => {
      render(<FormError message="Błąd" />);

      const innerDiv = screen.getByRole("alert").querySelector("div");
      expect(innerDiv).toHaveClass("flex");
      expect(innerDiv).toHaveClass("items-start");
      expect(innerDiv).toHaveClass("gap-3");
    });
  });

  describe("Edge cases", () => {
    it("powinien renderować bardzo długi komunikat błędu", () => {
      const longMessage = "A".repeat(1000);
      render(<FormError message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("powinien renderować komunikat z HTML entities", () => {
      render(<FormError message="Błąd & <test>" />);

      expect(screen.getByText("Błąd & <test>")).toBeInTheDocument();
    });

    it("powinien renderować komunikat z emoji", () => {
      render(<FormError message="Błąd ⚠️" />);

      expect(screen.getByText("Błąd ⚠️")).toBeInTheDocument();
    });

    it("powinien renderować komunikat z wieloma liniami", () => {
      const multilineMessage = "Linia 1\nLinia 2\nLinia 3";
      render(<FormError message={multilineMessage} />);

      const alert = screen.getByRole("alert");
      const messageElement = alert.querySelector("p");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe(multilineMessage);
    });
  });

  describe("Integracja z className prop", () => {
    it("powinien zastosować custom className razem z domyślnymi stylami", () => {
      render(<FormError message="Błąd" className="custom-class" />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      // Sprawdź czy custom klasa została zastosowana (przez cn utility)
      expect(alert.className).toContain("custom-class");
    });
  });
});
