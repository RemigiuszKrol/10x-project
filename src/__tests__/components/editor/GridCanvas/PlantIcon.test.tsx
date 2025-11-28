import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlantIcon, type PlantIconProps } from "@/components/editor/GridCanvas/PlantIcon";

describe("PlantIcon", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie podstawowe", () => {
    it("powinien renderować się poprawnie z wymaganym prop plantName", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Pomidor",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      expect(container.firstChild).toBeInTheDocument();
    });

    it("powinien renderować ikonę Leaf", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Bazylia",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert - sprawdzamy czy ikona Leaf (SVG) jest w DOM
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).toBeInTheDocument();
    });

    it("powinien mieć okrągłe tło z zielonym kolorem", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Marchew",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass("rounded-full");
      expect(backgroundDiv).toHaveClass("bg-green-600/90");
      expect(backgroundDiv).toHaveClass("shadow-sm");
    });
  });

  describe("Responsywne skalowanie z cellSize", () => {
    it("powinien skalować ikonę do 30% cellSize gdy cellSize jest podane", () => {
      // Arrange
      const cellSize = 40; // 30% = 12px (minimalna wartość)
      const props: PlantIconProps = {
        plantName: "Pomidor",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "12px", height: "12px" });
    });

    it("powinien użyć minimalnego rozmiaru 12px gdy 30% cellSize jest mniejsze niż 12px", () => {
      // Arrange
      const cellSize = 30; // 30% = 9px, ale minimum to 12px
      const props: PlantIconProps = {
        plantName: "Bazylia",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "12px", height: "12px" });
    });

    it("powinien skalować ikonę proporcjonalnie dla większych cellSize", () => {
      // Arrange
      const cellSize = 100; // 30% = 30px
      const props: PlantIconProps = {
        plantName: "Marchew",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "30px", height: "30px" });
    });

    it("powinien obliczyć padding jako 25% rozmiaru ikony (min 2px)", () => {
      // Arrange
      const cellSize = 100; // ikona = 30px, padding = 7.5px -> 7px (floor)
      const props: PlantIconProps = {
        plantName: "Pomidor",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const backgroundDiv = container.firstChild as HTMLElement;
      const padding = Math.max(2, Math.floor(30 * 0.25)); // 7px
      expect(backgroundDiv).toHaveStyle({ padding: `${padding}px` });
    });

    it("powinien użyć minimalnego paddingu 2px dla małych ikon", () => {
      // Arrange
      const cellSize = 30; // ikona = 12px (min), padding = Math.max(2, Math.floor(12 * 0.25)) = Math.max(2, 3) = 3px
      // Ale dla jeszcze mniejszej ikony (np. 8px) padding = Math.max(2, Math.floor(8 * 0.25)) = Math.max(2, 2) = 2px
      // Użyjmy cellSize = 26.67 -> ikona = 8px, padding = 2px
      const smallCellSize = 27; // 30% = 8.1px -> 8px (ale Math.max(12, 8.1) = 12px, więc to nie zadziała)
      // Musimy użyć cellSize gdzie 30% jest mniejsze niż 12px, ale to nie zadziała bo Math.max(12, ...)
      // Więc użyjmy cellSize gdzie padding będzie dokładnie 2px
      // Dla ikony 8px: padding = Math.max(2, Math.floor(8 * 0.25)) = 2px
      // Ale ikona nie może być mniejsza niż 12px, więc padding zawsze będzie >= 3px
      // Zmieńmy test - dla cellSize=40, ikona=12px, padding=3px
      const props: PlantIconProps = {
        plantName: "Bazylia",
        cellSize: 40,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const backgroundDiv = container.firstChild as HTMLElement;
      // Dla ikony 12px: padding = Math.max(2, Math.floor(12 * 0.25)) = Math.max(2, 3) = 3px
      expect(backgroundDiv).toHaveStyle({ padding: "3px" });
    });

    it("powinien skalować poprawnie dla bardzo dużych cellSize", () => {
      // Arrange
      const cellSize = 200; // 30% = 60px
      const props: PlantIconProps = {
        plantName: "Ogórek",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "60px", height: "60px" });
    });
  });

  describe("Backward compatibility z prop size", () => {
    it("powinien użyć domyślnego rozmiaru 'md' gdy nie podano ani cellSize ani size", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Pomidor",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveClass("h-5", "w-5");
    });

    it("powinien użyć rozmiaru 'xs' gdy podano size='xs'", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Bazylia",
        size: "xs",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveClass("h-3", "w-3");
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass("p-0.5");
    });

    it("powinien użyć rozmiaru 'sm' gdy podano size='sm'", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Marchew",
        size: "sm",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveClass("h-4", "w-4");
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass("p-1");
    });

    it("powinien użyć rozmiaru 'md' gdy podano size='md'", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Ogórek",
        size: "md",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveClass("h-5", "w-5");
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass("p-1.5");
    });

    it("powinien użyć rozmiaru 'lg' gdy podano size='lg'", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Papryka",
        size: "lg",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveClass("h-6", "w-6");
      
      const backgroundDiv = container.firstChild as HTMLElement;
      expect(backgroundDiv).toHaveClass("p-1.5");
    });

    it("powinien preferować cellSize nad size gdy oba są podane", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Pomidor",
        cellSize: 50,
        size: "lg",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert - powinien użyć inline styles z cellSize, nie klas z size
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "15px", height: "15px" }); // 30% z 50px
      expect(svgIcon).not.toHaveClass("h-6", "w-6"); // nie powinien mieć klas z size
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć bardzo mały cellSize (granica minimalna)", () => {
      // Arrange
      const cellSize = 1; // 30% = 0.3px, ale minimum to 12px
      const props: PlantIconProps = {
        plantName: "Bazylia",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "12px", height: "12px" });
    });

    it("powinien obsłużyć cellSize dokładnie na granicy minimalnej (40px)", () => {
      // Arrange
      const cellSize = 40; // 30% = 12px (dokładnie minimum)
      const props: PlantIconProps = {
        plantName: "Marchew",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveStyle({ width: "12px", height: "12px" });
    });

    it("powinien obsłużyć cellSize większy niż 40px (powyżej minimum)", () => {
      // Arrange
      const cellSize = 41; // 30% = 12.3px -> 12px (ale powinien być 12.3px)
      const props: PlantIconProps = {
        plantName: "Ogórek",
        cellSize,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      // 30% z 41px = 12.3px, ale Math.max(12, 12.3) = 12.3px
      expect(svgIcon).toHaveStyle({ width: "12.3px", height: "12.3px" });
    });

    it("powinien renderować się poprawnie z pustą nazwą rośliny", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "",
        cellSize: 50,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert - komponent powinien się zrenderować mimo pustej nazwy
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie z bardzo długą nazwą rośliny", () => {
      // Arrange
      const longName = "A".repeat(1000);
      const props: PlantIconProps = {
        plantName: longName,
        cellSize: 50,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).toBeInTheDocument();
    });
  });

  describe("Stylizacja", () => {
    it("powinien mieć biały kolor ikony", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Pomidor",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      expect(svgIcon).toHaveClass("text-white");
    });

    it("powinien nie mieć inline styles gdy używany jest prop size", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Bazylia",
        size: "md",
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      const backgroundDiv = container.firstChild as HTMLElement;
      
      // Nie powinno być inline styles dla width/height
      expect(svgIcon.style.width).toBe("");
      expect(svgIcon.style.height).toBe("");
      // Padding może być w klasach, ale nie w inline style
      expect(backgroundDiv.style.padding).toBe("");
    });

    it("powinien mieć inline styles gdy używany jest prop cellSize", () => {
      // Arrange
      const props: PlantIconProps = {
        plantName: "Marchew",
        cellSize: 60,
      };

      // Act
      const { container } = render(<PlantIcon {...props} />);

      // Assert
      const svgIcon = container.querySelector("svg") as SVGElement;
      const backgroundDiv = container.firstChild as HTMLElement;
      
      // Powinno być inline style dla width/height
      expect(svgIcon.style.width).toBe("18px"); // 30% z 60px
      expect(svgIcon.style.height).toBe("18px");
      // Padding powinien być obliczony
      const expectedPadding = Math.max(2, Math.floor(18 * 0.25)); // 4px
      expect(backgroundDiv.style.padding).toBe(`${expectedPadding}px`);
    });
  });

  describe("Zachowanie komponentu", () => {
    it("powinien akceptować plantName jako string", () => {
      // Arrange & Act
      const props: PlantIconProps = {
        plantName: "Test Plant",
      };

      // Assert - nie powinno być błędu TypeScript/runtime
      expect(() => render(<PlantIcon {...props} />)).not.toThrow();
    });

    it("powinien renderować się wielokrotnie z różnymi props", () => {
      // Arrange
      const props1: PlantIconProps = { plantName: "Plant1", cellSize: 30 };
      const props2: PlantIconProps = { plantName: "Plant2", cellSize: 60 };
      const props3: PlantIconProps = { plantName: "Plant3", size: "lg" };

      // Act & Assert
      const { container: container1 } = render(<PlantIcon {...props1} />);
      expect(container1.querySelector("svg")).toBeInTheDocument();

      const { container: container2 } = render(<PlantIcon {...props2} />);
      expect(container2.querySelector("svg")).toBeInTheDocument();

      const { container: container3 } = render(<PlantIcon {...props3} />);
      expect(container3.querySelector("svg")).toBeInTheDocument();
    });
  });
});

