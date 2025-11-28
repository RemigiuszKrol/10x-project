import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridPreview } from "@/components/plans/GridPreview";

describe("GridPreview", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  describe("Renderowanie", () => {
    it("powinien renderować tytuł i opis", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("Podgląd siatki")).toBeInTheDocument();
      expect(screen.getByText("Wizualizacja proporcji działki")).toBeInTheDocument();
    });

    it("powinien renderować SVG z siatką", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-label", "Siatka 10 na 10 pól");
    });

    it("powinien renderować wskaźnik północy z literą N", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("N")).toBeInTheDocument();
      const orientationIndicator = screen.getByLabelText(/orientacja:/i);
      expect(orientationIndicator).toBeInTheDocument();
    });

    it("powinien renderować informacje o wymiarach siatki", () => {
      render(<GridPreview gridWidth={20} gridHeight={15} cellSizeCm={50} orientation={0} />);

      expect(screen.getByText("Wymiary siatki")).toBeInTheDocument();
      expect(screen.getByText("20 × 15 pól")).toBeInTheDocument();
    });

    it("powinien renderować informacje o wymiarach rzeczywistych", () => {
      render(<GridPreview gridWidth={20} gridHeight={15} cellSizeCm={50} orientation={0} />);

      expect(screen.getByText("Wymiary rzeczywiste")).toBeInTheDocument();
      expect(screen.getByText("10.0 m × 7.5 m")).toBeInTheDocument();
    });

    it("powinien renderować rozmiar kratki", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("Rozmiar kratki")).toBeInTheDocument();
      expect(screen.getByText("25 cm")).toBeInTheDocument();
    });

    it("powinien renderować orientację", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={90} />);

      expect(screen.getByText("Orientacja")).toBeInTheDocument();
      expect(screen.getByText("90°")).toBeInTheDocument();
    });

    it("powinien zastosować opcjonalną klasę CSS", () => {
      const { container } = render(
        <GridPreview
          gridWidth={10}
          gridHeight={10}
          cellSizeCm={25}
          orientation={0}
          className="custom-class"
        />
      );

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass("custom-class");
    });
  });

  describe("Obliczanie wymiarów rzeczywistych", () => {
    it("powinien wyświetlać wymiary w centymetrach gdy < 100cm", () => {
      render(<GridPreview gridWidth={2} gridHeight={3} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("50 cm × 75 cm")).toBeInTheDocument();
    });

    it("powinien wyświetlać wymiary w metrach gdy >= 100cm", () => {
      render(<GridPreview gridWidth={4} gridHeight={4} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("1.0 m × 1.0 m")).toBeInTheDocument();
    });

    it("powinien poprawnie konwertować dokładnie 100cm na metry", () => {
      render(<GridPreview gridWidth={4} gridHeight={1} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("1.0 m × 25 cm")).toBeInTheDocument();
    });

    it("powinien poprawnie obliczać wymiary dla dużych siatek", () => {
      render(<GridPreview gridWidth={40} gridHeight={30} cellSizeCm={50} orientation={0} />);

      expect(screen.getByText("20.0 m × 15.0 m")).toBeInTheDocument();
    });

    it("powinien poprawnie obliczać wymiary dla różnych rozmiarów kratek", () => {
      const { rerender } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={10} orientation={0} />
      );
      expect(screen.getByText("1.0 m × 1.0 m")).toBeInTheDocument();

      rerender(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={100} orientation={0} />);
      expect(screen.getByText("10.0 m × 10.0 m")).toBeInTheDocument();
    });
  });

  describe("Generowanie siatki SVG", () => {
    it("powinien generować linie pionowe dla każdej kolumny", () => {
      const { container } = render(
        <GridPreview gridWidth={5} gridHeight={5} cellSizeCm={25} orientation={0} />
      );

      const svg = container.querySelector("svg");
      const lines = svg?.querySelectorAll("line");
      // Dla gridWidth=5 powinno być 6 linii pionowych (0-5)
      const verticalLines = Array.from(lines || []).filter((line) => {
        const x1 = line.getAttribute("x1");
        const x2 = line.getAttribute("x2");
        return x1 === x2 && x1 !== "0";
      });
      expect(verticalLines.length).toBeGreaterThanOrEqual(5);
    });

    it("powinien generować linie poziome dla każdego wiersza", () => {
      const { container } = render(
        <GridPreview gridWidth={5} gridHeight={5} cellSizeCm={25} orientation={0} />
      );

      const svg = container.querySelector("svg");
      const lines = svg?.querySelectorAll("line");
      // Dla gridHeight=5 powinno być 6 linii poziomych (0-5)
      const horizontalLines = Array.from(lines || []).filter((line) => {
        const y1 = line.getAttribute("y1");
        const y2 = line.getAttribute("y2");
        return y1 === y2 && y1 !== "0";
      });
      expect(horizontalLines.length).toBeGreaterThanOrEqual(5);
    });

    it("powinien wyróżniać co piątą linię grubszą linią", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />
      );

      const svg = container.querySelector("svg");
      const lines = svg?.querySelectorAll("line");
      const thickLines = Array.from(lines || []).filter(
        (line) => line.getAttribute("stroke-width") === "1"
      );
      expect(thickLines.length).toBeGreaterThan(0);
    });

    it("powinien skalować SVG do maksymalnie 200px", () => {
      const { container } = render(
        <GridPreview gridWidth={200} gridHeight={200} cellSizeCm={10} orientation={0} />
      );

      const svg = container.querySelector("svg");
      const width = parseInt(svg?.getAttribute("width") || "0", 10);
      const height = parseInt(svg?.getAttribute("height") || "0", 10);
      expect(width).toBeLessThanOrEqual(200);
      expect(height).toBeLessThanOrEqual(200);
    });

    it("powinien zachować proporcje siatki w SVG", () => {
      const { container } = render(
        <GridPreview gridWidth={20} gridHeight={10} cellSizeCm={25} orientation={0} />
      );

      const svg = container.querySelector("svg");
      const width = parseInt(svg?.getAttribute("width") || "0", 10);
      const height = parseInt(svg?.getAttribute("height") || "0", 10);
      // Szerokość powinna być większa niż wysokość (20 > 10)
      expect(width).toBeGreaterThan(height);
    });
  });

  describe("Wskaźnik orientacji", () => {
    it("powinien obracać wskaźnik północy zgodnie z orientacją 0°", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />
      );

      const indicator = container.querySelector('[aria-label*="Orientacja"]');
      const style = indicator?.getAttribute("style");
      expect(style).toContain("rotate(0deg)");
    });

    it("powinien obracać wskaźnik północy zgodnie z orientacją 90°", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={90} />
      );

      const indicator = container.querySelector('[aria-label*="Orientacja"]');
      const style = indicator?.getAttribute("style");
      expect(style).toContain("rotate(90deg)");
    });

    it("powinien obracać wskaźnik północy zgodnie z orientacją 180°", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={180} />
      );

      const indicator = container.querySelector('[aria-label*="Orientacja"]');
      const style = indicator?.getAttribute("style");
      expect(style).toContain("rotate(180deg)");
    });

    it("powinien obracać wskaźnik północy zgodnie z orientacją 270°", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={270} />
      );

      const indicator = container.querySelector('[aria-label*="Orientacja"]');
      const style = indicator?.getAttribute("style");
      expect(style).toContain("rotate(270deg)");
    });

    it("powinien obsługiwać orientację w zakresie 0-359°", () => {
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={359} />
      );

      const indicator = container.querySelector('[aria-label*="Orientacja"]');
      const style = indicator?.getAttribute("style");
      expect(style).toContain("rotate(359deg)");
      expect(screen.getByText("359°")).toBeInTheDocument();
    });
  });

  describe("Walidacja limitów siatki", () => {
    it("powinien wyświetlać komunikat sukcesu gdy siatka mieści się w limicie", () => {
      render(<GridPreview gridWidth={200} gridHeight={200} cellSizeCm={10} orientation={0} />);

      expect(
        screen.getByText(/✓ Siatka mieści się w limicie \(200 × 200\)/i)
      ).toBeInTheDocument();
    });

    it("powinien wyświetlać komunikat sukcesu dla małych siatek", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />);

      expect(
        screen.getByText(/✓ Siatka mieści się w limicie \(200 × 200\)/i)
      ).toBeInTheDocument();
    });

    it("powinien wyświetlać komunikat błędu gdy szerokość przekracza limit", () => {
      render(<GridPreview gridWidth={201} gridHeight={200} cellSizeCm={10} orientation={0} />);

      expect(
        screen.getByText(/✗ Siatka przekracza limit 200 × 200 pól/i)
      ).toBeInTheDocument();
    });

    it("powinien wyświetlać komunikat błędu gdy wysokość przekracza limit", () => {
      render(<GridPreview gridWidth={200} gridHeight={201} cellSizeCm={10} orientation={0} />);

      expect(
        screen.getByText(/✗ Siatka przekracza limit 200 × 200 pól/i)
      ).toBeInTheDocument();
    });

    it("powinien wyświetlać komunikat błędu gdy oba wymiary przekraczają limit", () => {
      render(<GridPreview gridWidth={250} gridHeight={250} cellSizeCm={10} orientation={0} />);

      expect(
        screen.getByText(/✗ Siatka przekracza limit 200 × 200 pól/i)
      ).toBeInTheDocument();
    });

    it("nie powinien wyświetlać statusu walidacji gdy gridWidth = 0", () => {
      render(<GridPreview gridWidth={0} gridHeight={10} cellSizeCm={25} orientation={0} />);

      expect(
        screen.queryByText(/Siatka mieści się w limicie/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Siatka przekracza limit/i)
      ).not.toBeInTheDocument();
    });

    it("nie powinien wyświetlać statusu walidacji gdy gridHeight = 0", () => {
      render(<GridPreview gridWidth={10} gridHeight={0} cellSizeCm={25} orientation={0} />);

      expect(
        screen.queryByText(/Siatka mieści się w limicie/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Siatka przekracza limit/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Przypadki brzegowe", () => {
    it("powinien obsługiwać minimalne wymiary (1×1)", () => {
      render(<GridPreview gridWidth={1} gridHeight={1} cellSizeCm={10} orientation={0} />);

      expect(screen.getByText("1 × 1 pól")).toBeInTheDocument();
      expect(screen.getByText("10 cm × 10 cm")).toBeInTheDocument();
    });

    it("powinien obsługiwać bardzo małe rozmiary kratek", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={10} orientation={0} />);

      expect(screen.getByText("10 cm")).toBeInTheDocument();
      expect(screen.getByText("1.0 m × 1.0 m")).toBeInTheDocument();
    });

    it("powinien obsługiwać bardzo duże rozmiary kratek", () => {
      render(<GridPreview gridWidth={2} gridHeight={2} cellSizeCm={100} orientation={0} />);

      expect(screen.getByText("100 cm")).toBeInTheDocument();
      expect(screen.getByText("2.0 m × 2.0 m")).toBeInTheDocument();
    });

    it("powinien obsługiwać prostokątną siatkę (szerokość > wysokość)", () => {
      render(<GridPreview gridWidth={30} gridHeight={20} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("30 × 20 pól")).toBeInTheDocument();
      expect(screen.getByText("7.5 m × 5.0 m")).toBeInTheDocument();
    });

    it("powinien obsługiwać prostokątną siatkę (wysokość > szerokość)", () => {
      render(<GridPreview gridWidth={20} gridHeight={30} cellSizeCm={25} orientation={0} />);

      expect(screen.getByText("20 × 30 pól")).toBeInTheDocument();
      expect(screen.getByText("5.0 m × 7.5 m")).toBeInTheDocument();
    });

    it("powinien obsługiwać kwadratową siatkę", () => {
      render(<GridPreview gridWidth={50} gridHeight={50} cellSizeCm={20} orientation={0} />);

      expect(screen.getByText("50 × 50 pól")).toBeInTheDocument();
      expect(screen.getByText("10.0 m × 10.0 m")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć odpowiedni aria-label dla SVG", () => {
      const { container } = render(
        <GridPreview gridWidth={15} gridHeight={20} cellSizeCm={25} orientation={0} />
      );

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-label", "Siatka 15 na 20 pól");
    });

    it("powinien mieć odpowiedni aria-label dla wskaźnika orientacji", () => {
      render(<GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={45} />);

      const indicator = screen.getByLabelText("Orientacja: 45 stopni");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("Dark mode", () => {
    it("powinien renderować tło SVG w trybie jasnym", () => {
      document.documentElement.classList.remove("dark");
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />
      );

      const rect = container.querySelector("svg rect");
      expect(rect).toHaveClass("dark:fill-gray-800");
    });

    it("powinien renderować tło SVG w trybie ciemnym", () => {
      document.documentElement.classList.add("dark");
      const { container } = render(
        <GridPreview gridWidth={10} gridHeight={10} cellSizeCm={25} orientation={0} />
      );

      const rect = container.querySelector("svg rect");
      expect(rect).toHaveClass("dark:fill-gray-800");
    });
  });
});

