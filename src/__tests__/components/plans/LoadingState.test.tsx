import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingState } from "@/components/plans/LoadingState";

describe("LoadingState", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie", () => {
    it("powinien renderować tekst 'Ładowanie planów...'", () => {
      render(<LoadingState />);

      expect(screen.getByText("Ładowanie planów...")).toBeInTheDocument();
    });

    it("powinien renderować tekst w elemencie <p>", () => {
      render(<LoadingState />);

      const textElement = screen.getByText("Ładowanie planów...");
      expect(textElement.tagName).toBe("P");
    });

    it("powinien renderować ikonę Loader2", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("powinien renderować kontener główny z odpowiednimi stylami", () => {
      const { container } = render(<LoadingState />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass("bg-white");
      expect(mainContainer).toHaveClass("dark:bg-gray-800");
      expect(mainContainer).toHaveClass("rounded-2xl");
      expect(mainContainer).toHaveClass("border");
      expect(mainContainer).toHaveClass("shadow-xl");
      expect(mainContainer).toHaveClass("p-12");
    });

    it("powinien renderować kontener z gradientem w tle ikony", () => {
      const { container } = render(<LoadingState />);

      const gradient = container.querySelector("div.absolute.inset-0.bg-gradient-to-br");
      expect(gradient).toBeInTheDocument();
      expect(gradient).toHaveClass("from-green-500/20");
      expect(gradient).toHaveClass("to-emerald-500/20");
      expect(gradient).toHaveClass("dark:from-green-500/10");
      expect(gradient).toHaveClass("dark:to-emerald-500/10");
      expect(gradient).toHaveClass("rounded-full");
      expect(gradient).toHaveClass("blur-xl");
      expect(gradient).toHaveClass("animate-pulse");
    });

    it("powinien renderować ikonę z odpowiednimi klasami", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("relative");
      expect(icon).toHaveClass("h-12");
      expect(icon).toHaveClass("w-12");
      expect(icon).toHaveClass("animate-spin");
      expect(icon).toHaveClass("text-green-600");
      expect(icon).toHaveClass("dark:text-green-400");
    });
  });

  describe("Dostępność (ARIA)", () => {
    it("powinien mieć role='status'", () => {
      render(<LoadingState />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
    });

    it("powinien mieć aria-live='polite'", () => {
      render(<LoadingState />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toHaveAttribute("aria-live", "polite");
    });

    it("powinien mieć aria-label='Ładowanie planów'", () => {
      render(<LoadingState />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toHaveAttribute("aria-label", "Ładowanie planów");
    });

    it("powinien mieć aria-hidden='true' na ikonie SVG", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Stylowanie", () => {
    it("powinien mieć odpowiednie klasy dla trybu jasnego", () => {
      const { container } = render(<LoadingState />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
      expect(mainContainer).toHaveClass("border-green-100");
    });

    it("powinien mieć odpowiednie klasy dla trybu ciemnego", () => {
      const { container } = render(<LoadingState />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("dark:bg-gray-800");
      expect(mainContainer).toHaveClass("dark:border-gray-700");
    });

    it("powinien mieć odpowiednie klasy dla kontenera wewnętrznego", () => {
      const { container } = render(<LoadingState />);

      const innerContainer = container.querySelector("div.flex.flex-col");
      expect(innerContainer).toBeInTheDocument();
      expect(innerContainer).toHaveClass("flex");
      expect(innerContainer).toHaveClass("flex-col");
      expect(innerContainer).toHaveClass("items-center");
      expect(innerContainer).toHaveClass("justify-center");
    });

    it("powinien mieć odpowiednie klasy dla kontenera ikony", () => {
      const { container } = render(<LoadingState />);

      const iconContainer = container.querySelector("div.relative");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("relative");
    });

    it("powinien mieć odpowiednie klasy dla tekstu", () => {
      render(<LoadingState />);

      const textElement = screen.getByText("Ładowanie planów...");
      expect(textElement).toHaveClass("mt-6");
      expect(textElement).toHaveClass("text-gray-600");
      expect(textElement).toHaveClass("dark:text-gray-400");
      expect(textElement).toHaveClass("font-medium");
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną hierarchię elementów", () => {
      const { container } = render(<LoadingState />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();

      const innerContainer = mainContainer.querySelector("div.flex.flex-col");
      expect(innerContainer).toBeInTheDocument();

      const iconContainer = innerContainer?.querySelector("div.relative");
      expect(iconContainer).toBeInTheDocument();

      const gradient = iconContainer?.querySelector("div.absolute");
      expect(gradient).toBeInTheDocument();

      const icon = iconContainer?.querySelector("svg");
      expect(icon).toBeInTheDocument();

      const text = innerContainer?.querySelector("p");
      expect(text).toBeInTheDocument();
    });

    it("powinien mieć kontener z gradientem jako pierwszy element w kontenerze ikony", () => {
      const { container } = render(<LoadingState />);

      const iconContainer = container.querySelector("div.relative");
      const firstChild = iconContainer?.firstChild as HTMLElement;
      
      expect(firstChild).toBeInTheDocument();
      expect(firstChild).toHaveClass("absolute");
      expect(firstChild).toHaveClass("inset-0");
    });

    it("powinien mieć ikonę jako drugi element w kontenerze ikony", () => {
      const { container } = render(<LoadingState />);

      const iconContainer = container.querySelector("div.relative");
      const children = Array.from(iconContainer?.children || []);
      
      const icon = children.find(child => child.tagName === "svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Animacje", () => {
    it("powinien mieć animację spin na ikonie", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("animate-spin");
    });

    it("powinien mieć animację pulse na gradiencie", () => {
      const { container } = render(<LoadingState />);

      const gradient = container.querySelector("div.absolute.inset-0");
      expect(gradient).toHaveClass("animate-pulse");
    });
  });

  describe("Edge cases", () => {
    it("powinien renderować się poprawnie bez żadnych props", () => {
      const { container } = render(<LoadingState />);

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText("Ładowanie planów...")).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie przy wielokrotnym renderowaniu", () => {
      const { rerender } = render(<LoadingState />);
      
      expect(screen.getByText("Ładowanie planów...")).toBeInTheDocument();

      rerender(<LoadingState />);
      expect(screen.getByText("Ładowanie planów...")).toBeInTheDocument();

      rerender(<LoadingState />);
      expect(screen.getByText("Ładowanie planów...")).toBeInTheDocument();
    });

    it("powinien mieć stabilną strukturę DOM przy wielokrotnym renderowaniu", () => {
      const { container, rerender } = render(<LoadingState />);

      const firstRender = container.innerHTML;

      rerender(<LoadingState />);
      const secondRender = container.innerHTML;

      expect(firstRender).toBe(secondRender);
    });
  });

  describe("Integracja z komponentami zewnętrznymi", () => {
    it("powinien używać ikony Loader2 z lucide-react", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      // Ikona Loader2 powinna mieć odpowiednie atrybuty SVG
      expect(icon?.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
    });
  });

  describe("Wizualne elementy", () => {
    it("powinien mieć efekt gradientu z odpowiednimi kolorami", () => {
      const { container } = render(<LoadingState />);

      const gradient = container.querySelector("div.absolute.inset-0");
      expect(gradient).toHaveClass("from-green-500/20");
      expect(gradient).toHaveClass("to-emerald-500/20");
      expect(gradient).toHaveClass("dark:from-green-500/10");
      expect(gradient).toHaveClass("dark:to-emerald-500/10");
    });

    it("powinien mieć okrągły kształt dla gradientu", () => {
      const { container } = render(<LoadingState />);

      const gradient = container.querySelector("div.absolute.inset-0");
      expect(gradient).toHaveClass("rounded-full");
    });

    it("powinien mieć efekt blur na gradiencie", () => {
      const { container } = render(<LoadingState />);

      const gradient = container.querySelector("div.absolute.inset-0");
      expect(gradient).toHaveClass("blur-xl");
    });

    it("powinien mieć odpowiedni rozmiar ikony", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("h-12");
      expect(icon).toHaveClass("w-12");
    });

    it("powinien mieć odpowiednie kolory ikony dla trybu jasnego i ciemnego", () => {
      const { container } = render(<LoadingState />);

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("text-green-600");
      expect(icon).toHaveClass("dark:text-green-400");
    });
  });
});

