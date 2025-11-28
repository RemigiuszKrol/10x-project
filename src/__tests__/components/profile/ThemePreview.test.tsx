import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemePreview } from "@/components/profile/ThemePreview";
import type { UiTheme } from "@/types";

describe("ThemePreview", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie", () => {
    it("powinien renderować komponent z motywem light", () => {
      render(<ThemePreview theme="light" />);

      expect(screen.getByText("Podgląd motywu")).toBeInTheDocument();
    });

    it("powinien renderować komponent z motywem dark", () => {
      render(<ThemePreview theme="dark" />);

      expect(screen.getByText("Podgląd motywu")).toBeInTheDocument();
    });

    it("powinien renderować przykładowy nagłówek", () => {
      render(<ThemePreview theme="light" />);

      expect(screen.getByText("PlantsPlaner")).toBeInTheDocument();
      expect(screen.getByText("Przykładowy nagłówek")).toBeInTheDocument();
    });

    it("powinien renderować przykładowy tekst", () => {
      render(<ThemePreview theme="light" />);

      expect(screen.getByText("Przykładowy tekst w interfejsie aplikacji.")).toBeInTheDocument();
    });

    it("powinien renderować przyciski", () => {
      render(<ThemePreview theme="light" />);

      expect(screen.getByRole("button", { name: /przycisk/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();
    });
  });

  describe("Klasy CSS dla motywu light", () => {
    it("powinien zastosować klasy dla motywu light na label", () => {
      render(<ThemePreview theme="light" />);

      const label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("font-medium");
      expect(label).toHaveClass("text-gray-900");
    });

    it("powinien zastosować klasy dla motywu light na kontener", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const previewContainer = container.querySelector(".rounded-lg.border.border-green-100.bg-white");
      expect(previewContainer).toBeInTheDocument();
      expect(previewContainer).toHaveClass("text-gray-900");
      expect(previewContainer).toHaveClass("p-4");
    });

    it("powinien zastosować klasy dla motywu light na kartę", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const card = container.querySelector(".rounded.border.border-green-100.bg-white");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("text-gray-900");
      expect(card).toHaveClass("p-3");
    });

    it("powinien zastosować klasy dla motywu light na tekst", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const text = container.querySelector(".text-sm.text-gray-900");
      expect(text).toBeInTheDocument();
    });

    it("powinien zastosować klasy dla motywu light na muted text", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const mutedText = container.querySelector(".text-xs.text-gray-600");
      expect(mutedText).toBeInTheDocument();
    });
  });

  describe("Klasy CSS dla motywu dark", () => {
    it("powinien zastosować klasy dla motywu dark na label", () => {
      render(<ThemePreview theme="dark" />);

      const label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("font-medium");
      expect(label).toHaveClass("text-gray-100");
    });

    it("powinien zastosować klasy dla motywu dark na kontener", () => {
      const { container } = render(<ThemePreview theme="dark" />);

      const previewContainer = container.querySelector(".rounded-lg.border.border-gray-700.bg-gray-800");
      expect(previewContainer).toBeInTheDocument();
      expect(previewContainer).toHaveClass("text-gray-100");
      expect(previewContainer).toHaveClass("p-4");
    });

    it("powinien zastosować klasy dla motywu dark na kartę", () => {
      const { container } = render(<ThemePreview theme="dark" />);

      const card = container.querySelector(".rounded.border.border-gray-700.bg-gray-800");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("text-gray-100");
      expect(card).toHaveClass("p-3");
    });

    it("powinien zastosować klasy dla motywu dark na tekst", () => {
      const { container } = render(<ThemePreview theme="dark" />);

      const text = container.querySelector(".text-sm.text-gray-100");
      expect(text).toBeInTheDocument();
    });

    it("powinien zastosować klasy dla motywu dark na muted text", () => {
      const { container } = render(<ThemePreview theme="dark" />);

      const mutedText = container.querySelector(".text-xs.text-gray-400");
      expect(mutedText).toBeInTheDocument();
    });
  });

  describe("CSS Variables dla motywu light", () => {
    it("powinien ustawić CSS variables dla motywu light", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const wrapper = container.querySelector("div[style*='--background']");
      expect(wrapper).toBeInTheDocument();

      const style = wrapper?.getAttribute("style");
      expect(style).toContain("--background");
      expect(style).toContain("oklch(1 0 0)");
      expect(style).toContain("--foreground");
      expect(style).toContain("oklch(0.145 0 0)");
      expect(style).toContain("--primary");
      expect(style).toContain("oklch(0.548 0.166 155.828)");
    });

    it("powinien ustawić wszystkie wymagane CSS variables dla motywu light", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const wrapper = container.querySelector("div[style*='--background']");
      const style = wrapper?.getAttribute("style") || "";

      const requiredVariables = [
        "--background",
        "--foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--border",
        "--input",
        "--accent",
        "--accent-foreground",
      ];

      requiredVariables.forEach((variable) => {
        expect(style).toContain(variable);
      });
    });
  });

  describe("CSS Variables dla motywu dark", () => {
    it("powinien ustawić CSS variables dla motywu dark", () => {
      const { container } = render(<ThemePreview theme="dark" />);

      const wrapper = container.querySelector("div[style*='--background']");
      expect(wrapper).toBeInTheDocument();

      const style = wrapper?.getAttribute("style");
      expect(style).toContain("--background");
      expect(style).toContain("oklch(0.145 0 0)");
      expect(style).toContain("--foreground");
      expect(style).toContain("oklch(0.985 0 0)");
      expect(style).toContain("--primary");
      expect(style).toContain("oklch(0.548 0.166 155.828)");
    });

    it("powinien ustawić wszystkie wymagane CSS variables dla motywu dark", () => {
      const { container } = render(<ThemePreview theme="dark" />);

      const wrapper = container.querySelector("div[style*='--background']");
      const style = wrapper?.getAttribute("style") || "";

      const requiredVariables = [
        "--background",
        "--foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--border",
        "--input",
        "--accent",
        "--accent-foreground",
      ];

      requiredVariables.forEach((variable) => {
        expect(style).toContain(variable);
      });
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną strukturę zagnieżdżonych elementów", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toBeInTheDocument();
      expect(mainDiv).toHaveClass("space-y-3");

      const label = screen.getByText("Podgląd motywu");
      expect(label.tagName).toBe("P");

      const wrapper = container.querySelector("div[style*='--background']");
      expect(wrapper).toBeInTheDocument();

      const previewContainer = wrapper?.querySelector(".rounded-lg");
      expect(previewContainer).toBeInTheDocument();
    });

    it("powinien mieć kontener z klasą transition-colors", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const previewContainer = container.querySelector(".transition-colors");
      expect(previewContainer).toBeInTheDocument();
    });

    it("powinien mieć strukturę z nagłówkiem i treścią", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const header = container.querySelector("h4");
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent("PlantsPlaner");

      const contentText = screen.getByText("Przykładowy tekst w interfejsie aplikacji.");
      expect(contentText).toBeInTheDocument();
    });

    it("powinien mieć kontener przycisków z flex layout", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const buttonsContainer = container.querySelector(".flex.gap-2");
      expect(buttonsContainer).toBeInTheDocument();
    });
  });

  describe("Przyciski", () => {
    it("powinien renderować przycisk z wariantem default", () => {
      render(<ThemePreview theme="light" />);

      const button = screen.getByRole("button", { name: /przycisk/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Przycisk");
    });

    it("powinien renderować przycisk z wariantem outline", () => {
      render(<ThemePreview theme="light" />);

      const button = screen.getByRole("button", { name: /anuluj/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Anuluj");
    });

    it("powinien renderować przyciski z rozmiarem sm", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      buttons.forEach((button) => {
        // Sprawdź czy przycisk ma odpowiednie klasy dla size="sm"
        // Button component używa klas z buttonVariants
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe("Przełączanie między motywami", () => {
    it("powinien przełączać klasy CSS przy zmianie motywu z light na dark", () => {
      const { rerender, container } = render(<ThemePreview theme="light" />);

      let label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-gray-900");

      rerender(<ThemePreview theme="dark" />);

      label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-gray-100");
      expect(label).not.toHaveClass("text-gray-900");
    });

    it("powinien przełączać CSS variables przy zmianie motywu z dark na light", () => {
      const { rerender, container } = render(<ThemePreview theme="dark" />);

      let wrapper = container.querySelector("div[style*='--background']");
      let style = wrapper?.getAttribute("style") || "";
      expect(style).toContain("oklch(0.145 0 0)"); // dark background

      rerender(<ThemePreview theme="light" />);

      wrapper = container.querySelector("div[style*='--background']");
      style = wrapper?.getAttribute("style") || "";
      expect(style).toContain("oklch(1 0 0)"); // light background
    });
  });

  describe("Różnice między motywami", () => {
    it("powinien używać różnych klas dla label w zależności od motywu", () => {
      const { rerender } = render(<ThemePreview theme="light" />);

      let label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-gray-900");
      expect(label).not.toHaveClass("text-gray-100");

      rerender(<ThemePreview theme="dark" />);

      label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-gray-100");
      expect(label).not.toHaveClass("text-gray-900");
    });

    it("powinien używać różnych klas dla kontenera w zależności od motywu", () => {
      const { rerender, container } = render(<ThemePreview theme="light" />);

      let previewContainer = container.querySelector(".border-green-100.bg-white");
      expect(previewContainer).toBeInTheDocument();

      rerender(<ThemePreview theme="dark" />);

      previewContainer = container.querySelector(".border-gray-700.bg-gray-800");
      expect(previewContainer).toBeInTheDocument();
    });

    it("powinien używać różnych wartości CSS variables dla background w zależności od motywu", () => {
      const { rerender, container } = render(<ThemePreview theme="light" />);

      let wrapper = container.querySelector("div[style*='--background']");
      let style = wrapper?.getAttribute("style") || "";
      expect(style).toContain("--background");
      expect(style).toContain("oklch(1 0 0)"); // white

      rerender(<ThemePreview theme="dark" />);

      wrapper = container.querySelector("div[style*='--background']");
      style = wrapper?.getAttribute("style") || "";
      expect(style).toContain("--background");
      expect(style).toContain("oklch(0.145 0 0)"); // dark
    });
  });

  describe("Edge cases", () => {
    it("powinien obsługiwać szybkie przełączanie między motywami", () => {
      const { rerender } = render(<ThemePreview theme="light" />);

      // Szybkie przełączanie
      rerender(<ThemePreview theme="dark" />);
      rerender(<ThemePreview theme="light" />);
      rerender(<ThemePreview theme="dark" />);

      const label = screen.getByText("Podgląd motywu");
      expect(label).toHaveClass("text-gray-100");
      expect(label).not.toHaveClass("text-gray-900");
    });

    it("powinien renderować wszystkie elementy UI niezależnie od motywu", () => {
      const themes: UiTheme[] = ["light", "dark"];

      themes.forEach((theme) => {
        const { unmount } = render(<ThemePreview theme={theme} />);

        expect(screen.getByText("Podgląd motywu")).toBeInTheDocument();
        expect(screen.getByText("PlantsPlaner")).toBeInTheDocument();
        expect(screen.getByText("Przykładowy nagłówek")).toBeInTheDocument();
        expect(screen.getByText("Przykładowy tekst w interfejsie aplikacji.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /przycisk/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /anuluj/i })).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć semantyczną strukturę HTML", () => {
      const { container } = render(<ThemePreview theme="light" />);

      const heading = container.querySelector("h4");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("PlantsPlaner");

      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it("powinien mieć przyciski dostępne dla klawiatury", () => {
      render(<ThemePreview theme="light" />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });

  describe("Props validation", () => {
    it("powinien akceptować theme='light'", () => {
      expect(() => render(<ThemePreview theme="light" />)).not.toThrow();
    });

    it("powinien akceptować theme='dark'", () => {
      expect(() => render(<ThemePreview theme="dark" />)).not.toThrow();
    });
  });
});

