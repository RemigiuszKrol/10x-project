import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectionOverlay } from "@/components/editor/GridCanvas/SelectionOverlay";
import type { CellSelection } from "@/types";

describe("SelectionOverlay", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie podstawowe", () => {
    it("powinien renderować się poprawnie z wymaganymi props", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 2,
        y2: 2,
      };

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass("absolute");
      expect(overlay).toHaveClass("pointer-events-none");
      expect(overlay).toHaveClass("border-2");
      expect(overlay).toHaveClass("border-primary");
      expect(overlay).toHaveClass("bg-primary/10");
    });

    it("powinien renderować badge z wymiarami", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 4,
        y2: 3,
      };

      // Act
      render(<SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />);

      // Assert
      const badge = screen.getByText("5×4");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-primary");
      expect(badge).toHaveClass("text-primary-foreground");
      expect(badge).toHaveClass("rounded-full");
    });

    it("powinien mieć poprawne atrybuty accessibility", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 1,
        y1: 2,
        x2: 3,
        y2: 4,
      };

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveAttribute("role", "region");
      expect(overlay).toHaveAttribute("aria-label", "Zaznaczony obszar: 3×3");
    });
  });

  describe("Obliczanie pozycji i rozmiaru", () => {
    it("powinien obliczyć poprawną pozycję dla zaznaczenia w lewym górnym rogu", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
      };
      const cellSizePx = 40;
      const gapPx = 2;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // left = x1 * (cellSizePx + gapPx) + gridOffsetX - borderOffset
      // left = 0 * (40 + 2) + 0 - 0.5 = -0.5px
      expect(style.left).toBe("-0.5px");
      
      // top = y1 * (cellSizePx + gapPx) + gridOffsetY - borderOffset + yCorrection
      // top = 0 * (40 + 2) + 0 - 0.5 + 1 = 0.5px (yCorrection = 1 dla cellSizePx = 40)
      expect(style.top).toBe("0.5px");
    });

    it("powinien obliczyć poprawny rozmiar dla zaznaczenia 1×1", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
      const cellSizePx = 40;
      const gapPx = 2;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // width = width * cellSizePx + (width - 1) * gapPx + borderOffset * 2
      // width = 1 * 40 + (1 - 1) * 2 + 0.5 * 2 = 40 + 0 + 1 = 41px
      expect(style.width).toBe("41px");
      
      // height = height * cellSizePx + (height - 1) * gapPx + borderOffset * 2
      // height = 1 * 40 + (1 - 1) * 2 + 0.5 * 2 = 40 + 0 + 1 = 41px
      expect(style.height).toBe("41px");
    });

    it("powinien obliczyć poprawny rozmiar dla zaznaczenia wielokomórkowego", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 2,
        y2: 1,
      };
      const cellSizePx = 40;
      const gapPx = 2;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // width = 3 * 40 + (3 - 1) * 2 + 1 = 120 + 4 + 1 = 125px
      expect(style.width).toBe("125px");
      
      // height = 2 * 40 + (2 - 1) * 2 + 1 = 80 + 2 + 1 = 83px
      expect(style.height).toBe("83px");
    });

    it("powinien uwzględnić gridOffsetX i gridOffsetY w pozycji", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 1,
        y1: 1,
        x2: 2,
        y2: 2,
      };
      const cellSizePx = 40;
      const gapPx = 2;
      const gridOffsetX = 16; // padding
      const gridOffsetY = 16; // padding

      // Act
      const { container } = render(
        <SelectionOverlay
          selection={selection}
          cellSizePx={cellSizePx}
          gapPx={gapPx}
          gridOffsetX={gridOffsetX}
          gridOffsetY={gridOffsetY}
        />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // left = 1 * (40 + 2) + 16 - 0.5 = 42 + 16 - 0.5 = 57.5px
      expect(style.left).toBe("57.5px");
      
      // top = 1 * (40 + 2) + 16 - 0.5 + 1 = 42 + 16 - 0.5 + 1 = 58.5px
      expect(style.top).toBe("58.5px");
    });

    it("powinien użyć domyślnych wartości 0 dla gridOffsetX i gridOffsetY", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // Powinno być -0.5px (bez offsetu)
      expect(style.left).toBe("-0.5px");
      expect(style.top).toBe("0.5px"); // z yCorrection = 1
    });
  });

  describe("Korekty pozycjonowania dla małych komórek", () => {
    it("powinien zastosować korektę 4px dla komórek ≤24px", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
      const cellSizePx = 24;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={1} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // top = 0 * (24 + 1) + 0 - 0.5 + 4 = 3.5px
      expect(style.top).toBe("3.5px");
    });

    it("powinien zastosować korektę 3px dla komórek <28px i >24px", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
      const cellSizePx = 26;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={1} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // top = 0 * (26 + 1) + 0 - 0.5 + 3 = 2.5px
      expect(style.top).toBe("2.5px");
    });

    it("powinien zastosować korektę 1px dla komórek ≤40px i ≥28px", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
      const cellSizePx = 40;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={2} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // top = 0 * (40 + 2) + 0 - 0.5 + 1 = 0.5px
      expect(style.top).toBe("0.5px");
    });

    it("powinien nie stosować korekty dla komórek >40px", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
      const cellSizePx = 50;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={2} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // top = 0 * (50 + 2) + 0 - 0.5 + 0 = -0.5px
      expect(style.top).toBe("-0.5px");
    });
  });

  describe("Różne wartości gap", () => {
    it("powinien poprawnie obliczyć pozycję i rozmiar dla gap=0", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
      };
      const cellSizePx = 40;
      const gapPx = 0;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // left = 0 * (40 + 0) + 0 - 0.5 = -0.5px
      expect(style.left).toBe("-0.5px");
      
      // width = 2 * 40 + (2 - 1) * 0 + 1 = 80 + 0 + 1 = 81px
      expect(style.width).toBe("81px");
    });

    it("powinien poprawnie obliczyć pozycję i rozmiar dla większego gap", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
      };
      const cellSizePx = 40;
      const gapPx = 5;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // left = 0 * (40 + 5) + 0 - 0.5 = -0.5px
      expect(style.left).toBe("-0.5px");
      
      // width = 2 * 40 + (2 - 1) * 5 + 1 = 80 + 5 + 1 = 86px
      expect(style.width).toBe("86px");
    });
  });

  describe("Różne rozmiary zaznaczenia", () => {
    it("powinien wyświetlić poprawny badge dla zaznaczenia 1×1", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 5,
        y1: 5,
        x2: 5,
        y2: 5,
      };

      // Act
      render(<SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />);

      // Assert
      expect(screen.getByText("1×1")).toBeInTheDocument();
    });

    it("powinien wyświetlić poprawny badge dla dużego zaznaczenia", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 19,
        y2: 14,
      };

      // Act
      render(<SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />);

      // Assert
      expect(screen.getByText("20×15")).toBeInTheDocument();
    });

    it("powinien wyświetlić poprawny badge dla prostokątnego zaznaczenia", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 4,
        y2: 2,
      };

      // Act
      render(<SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />);

      // Assert
      expect(screen.getByText("5×3")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć zaznaczenie w prawym dolnym rogu siatki", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 10,
        y1: 10,
        x2: 10,
        y2: 10,
      };
      const cellSizePx = 40;
      const gapPx = 2;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // left = 10 * (40 + 2) + 0 - 0.5 = 420 - 0.5 = 419.5px
      expect(style.left).toBe("419.5px");
      
      // top = 10 * (40 + 2) + 0 - 0.5 + 1 = 420 - 0.5 + 1 = 420.5px
      expect(style.top).toBe("420.5px");
    });

    it("powinien obsłużyć bardzo duże zaznaczenie", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 99,
        y2: 99,
      };
      const cellSizePx = 40;
      const gapPx = 2;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // width = 100 * 40 + (100 - 1) * 2 + 1 = 4000 + 198 + 1 = 4199px
      expect(style.width).toBe("4199px");
      
      // height = 100 * 40 + (100 - 1) * 2 + 1 = 4000 + 198 + 1 = 4199px
      expect(style.height).toBe("4199px");
      
      expect(screen.getByText("100×100")).toBeInTheDocument();
    });

    it("powinien obsłużyć zaznaczenie z ujemnymi offsetami", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
      const gridOffsetX = -10;
      const gridOffsetY = -10;

      // Act
      const { container } = render(
        <SelectionOverlay
          selection={selection}
          cellSizePx={40}
          gapPx={2}
          gridOffsetX={gridOffsetX}
          gridOffsetY={gridOffsetY}
        />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      // left = 0 * (40 + 2) + (-10) - 0.5 = -10.5px
      expect(style.left).toBe("-10.5px");
      
      // top = 0 * (40 + 2) + (-10) - 0.5 + 1 = -9.5px
      expect(style.top).toBe("-9.5px");
    });
  });

  describe("Stylowanie i klasy CSS", () => {
    it("powinien mieć wszystkie wymagane klasy CSS", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
      };

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("absolute");
      expect(overlay).toHaveClass("pointer-events-none");
      expect(overlay).toHaveClass("border-2");
      expect(overlay).toHaveClass("border-primary");
      expect(overlay).toHaveClass("bg-primary/10");
      expect(overlay).toHaveClass("transition-opacity");
      expect(overlay).toHaveClass("duration-200");
    });

    it("powinien mieć inline style z obliczonymi wartościami", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 2,
        y1: 3,
        x2: 4,
        y2: 5,
      };
      const cellSizePx = 40;
      const gapPx = 2;

      // Act
      const { container } = render(
        <SelectionOverlay selection={selection} cellSizePx={cellSizePx} gapPx={gapPx} />
      );

      // Assert
      const overlay = container.firstChild as HTMLElement;
      const style = overlay.style;
      
      expect(style.left).toBeTruthy();
      expect(style.top).toBeTruthy();
      expect(style.width).toBeTruthy();
      expect(style.height).toBeTruthy();
      
      // Wszystkie wartości powinny kończyć się na "px"
      expect(style.left).toMatch(/px$/);
      expect(style.top).toMatch(/px$/);
      expect(style.width).toMatch(/px$/);
      expect(style.height).toMatch(/px$/);
    });

    it("powinien mieć badge z odpowiednimi klasami CSS", () => {
      // Arrange
      const selection: CellSelection = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
      };

      // Act
      render(<SelectionOverlay selection={selection} cellSizePx={40} gapPx={2} />);

      // Assert
      const badge = screen.getByText("2×2");
      expect(badge).toHaveClass("absolute");
      expect(badge).toHaveClass("top-0");
      expect(badge).toHaveClass("right-0");
      expect(badge).toHaveClass("-translate-y-1/2");
      expect(badge).toHaveClass("translate-x-1/2");
      expect(badge).toHaveClass("bg-primary");
      expect(badge).toHaveClass("text-primary-foreground");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("font-medium");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-0.5");
      expect(badge).toHaveClass("rounded-full");
      expect(badge).toHaveClass("shadow-sm");
    });
  });

  describe("Zachowanie komponentu", () => {
    it("powinien renderować się wielokrotnie z różnymi props", () => {
      // Arrange
      const selection1: CellSelection = { x1: 0, y1: 0, x2: 0, y2: 0 };
      const selection2: CellSelection = { x1: 5, y1: 5, x2: 10, y2: 10 };
      const selection3: CellSelection = { x1: 0, y1: 0, x2: 19, y2: 19 };

      // Act & Assert
      const { container: container1 } = render(
        <SelectionOverlay selection={selection1} cellSizePx={24} gapPx={1} />
      );
      expect(container1.firstChild).toBeInTheDocument();

      const { container: container2 } = render(
        <SelectionOverlay selection={selection2} cellSizePx={40} gapPx={2} />
      );
      expect(container2.firstChild).toBeInTheDocument();

      const { container: container3 } = render(
        <SelectionOverlay selection={selection3} cellSizePx={50} gapPx={3} />
      );
      expect(container3.firstChild).toBeInTheDocument();
    });

    it("powinien aktualizować aria-label przy zmianie wymiarów zaznaczenia", () => {
      // Arrange
      const selection1: CellSelection = { x1: 0, y1: 0, x2: 0, y2: 0 };
      const selection2: CellSelection = { x1: 0, y1: 0, x2: 4, y2: 3 };

      // Act
      const { container: container1, rerender } = render(
        <SelectionOverlay selection={selection1} cellSizePx={40} gapPx={2} />
      );

      // Assert - pierwszy render
      let overlay = container1.firstChild as HTMLElement;
      expect(overlay).toHaveAttribute("aria-label", "Zaznaczony obszar: 1×1");

      // Act - rerender z nowym zaznaczeniem
      rerender(<SelectionOverlay selection={selection2} cellSizePx={40} gapPx={2} />);

      // Assert - po rerenderze
      overlay = container1.firstChild as HTMLElement;
      expect(overlay).toHaveAttribute("aria-label", "Zaznaczony obszar: 5×4");
    });
  });
});

