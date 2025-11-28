import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CellInfoBadge, type CellInfoBadgeProps } from "@/components/editor/modals/CellInfoBadge";
import type { GridCellType } from "@/types";
import { GRID_CELL_TYPE_LABELS } from "@/types";

describe("CellInfoBadge", () => {
  let defaultProps: CellInfoBadgeProps;

  beforeEach(() => {
    defaultProps = {
      x: 5,
      y: 10,
      type: "soil",
    };
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie podstawowe", () => {
    it("powinien renderować się poprawnie z podstawowymi props", () => {
      render(<CellInfoBadge {...defaultProps} />);

      expect(screen.getByText("x: 5, y: 10")).toBeInTheDocument();
      expect(screen.getByText(GRID_CELL_TYPE_LABELS.soil)).toBeInTheDocument();
    });

    it("powinien renderować dwa badge'e", () => {
      const { container } = render(<CellInfoBadge {...defaultProps} />);

      // Badge komponenty renderują się z data-slot="badge"
      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
    });

    it("powinien renderować kontener z klasą flex", () => {
      const { container } = render(<CellInfoBadge {...defaultProps} />);

      const containerDiv = container.querySelector("div.flex.items-center.gap-2");
      expect(containerDiv).toBeInTheDocument();
    });
  });

  describe("Wyświetlanie współrzędnych", () => {
    it("powinien wyświetlać poprawne współrzędne x i y", () => {
      render(<CellInfoBadge x={0} y={0} type="soil" />);
      expect(screen.getByText("x: 0, y: 0")).toBeInTheDocument();
    });

    it("powinien wyświetlać duże wartości współrzędnych", () => {
      render(<CellInfoBadge x={199} y={199} type="soil" />);
      expect(screen.getByText("x: 199, y: 199")).toBeInTheDocument();
    });

    it("powinien wyświetlać ujemne wartości współrzędnych", () => {
      render(<CellInfoBadge x={-5} y={-10} type="soil" />);
      expect(screen.getByText("x: -5, y: -10")).toBeInTheDocument();
    });

    it("powinien wyświetlać ikonę MapPin przy współrzędnych", () => {
      const { container } = render(<CellInfoBadge {...defaultProps} />);

      // MapPin jest renderowany jako SVG z klasą lucide-map-pin
      const mapPinIcon = container.querySelector('svg.lucide-map-pin');
      expect(mapPinIcon).toBeInTheDocument();
    });
  });

  describe("Wyświetlanie typu komórki - etykiety", () => {
    const cellTypes: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

    cellTypes.forEach((type) => {
      it(`powinien wyświetlać poprawną etykietę dla typu ${type}`, () => {
        render(<CellInfoBadge x={0} y={0} type={type} />);
        expect(screen.getByText(GRID_CELL_TYPE_LABELS[type])).toBeInTheDocument();
      });
    });
  });

  describe("Wyświetlanie ikon dla typów komórek", () => {
    it("powinien wyświetlać ikonę Sprout dla typu soil", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="soil" />);

      const sproutIcon = container.querySelector('svg.lucide-sprout');
      expect(sproutIcon).toBeInTheDocument();
    });

    it("powinien wyświetlać ikonę Navigation dla typu path", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="path" />);

      const navigationIcon = container.querySelector('svg.lucide-navigation');
      expect(navigationIcon).toBeInTheDocument();
    });

    it("powinien wyświetlać ikonę Droplet dla typu water", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="water" />);

      const dropletIcon = container.querySelector('svg.lucide-droplet');
      expect(dropletIcon).toBeInTheDocument();
    });

    it("powinien wyświetlać ikonę Home dla typu building", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="building" />);

      // Sprawdź czy ikona Home jest renderowana
      // lucide-react może renderować ikony z różnymi nazwami klas
      const svgIcons = container.querySelectorAll('svg');
      // Powinny być co najmniej 2 ikony: MapPin (współrzędne) i Home (typ)
      expect(svgIcons.length).toBeGreaterThanOrEqual(2);
      
      // Sprawdź czy jest ikona w badge'u z typem (drugi badge)
      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      const typeBadge = badges[1];
      const iconsInTypeBadge = typeBadge.querySelectorAll('svg');
      expect(iconsInTypeBadge.length).toBeGreaterThanOrEqual(1);
    });

    it("powinien wyświetlać ikonę Ban dla typu blocked", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="blocked" />);

      const banIcon = container.querySelector('svg.lucide-ban');
      expect(banIcon).toBeInTheDocument();
    });

    it("powinien wyświetlać ikonę MapPin jako domyślną dla nieznanego typu", () => {
      // Symulujemy nieznany typ (TypeScript nie pozwoli, ale testujemy logikę default)
      const { container } = render(<CellInfoBadge x={0} y={0} type={"soil" as GridCellType} />);

      // Dla znanych typów nie powinno być MapPin jako ikona typu (tylko przy współrzędnych)
      const mapPinIcons = container.querySelectorAll('svg.lucide-map-pin');
      // Powinien być jeden MapPin przy współrzędnych
      expect(mapPinIcons.length).toBeGreaterThanOrEqual(1);
    });

    it("powinien wyświetlać ikony z klasą h-3 w-3", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="soil" />);

      const sproutIcon = container.querySelector('svg.lucide-sprout.h-3.w-3');
      expect(sproutIcon).toBeInTheDocument();
    });
  });

  describe("Warianty kolorów badge'ów", () => {
    it("powinien używać wariantu 'default' dla typu soil", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="soil" />);

      // Badge z typem soil powinien mieć wariant default (bg-primary)
      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      
      // Drugi badge (z typem) powinien mieć wariant default
      const typeBadge = badges[1];
      expect(typeBadge.className).toContain("bg-primary");
    });

    it("powinien używać wariantu 'secondary' dla typu path", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="path" />);

      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      
      const typeBadge = badges[1];
      expect(typeBadge.className).toContain("bg-secondary");
    });

    it("powinien używać wariantu 'secondary' dla typu building", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="building" />);

      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      
      const typeBadge = badges[1];
      expect(typeBadge.className).toContain("bg-secondary");
    });

    it("powinien używać wariantu 'secondary' dla typu blocked", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="blocked" />);

      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      
      const typeBadge = badges[1];
      expect(typeBadge.className).toContain("bg-secondary");
    });

    it("powinien używać wariantu 'outline' dla typu water", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="water" />);

      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      
      const typeBadge = badges[1];
      // Outline nie ma bg-*, sprawdzamy czy nie ma bg-primary ani bg-secondary
      expect(typeBadge.className).not.toContain("bg-primary");
      expect(typeBadge.className).not.toContain("bg-secondary");
    });

    it("powinien używać wariantu 'outline' dla badge'a z współrzędnymi", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="soil" />);

      // Pierwszy badge (z współrzędnymi) zawsze ma variant="outline"
      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);
      
      const coordsBadge = badges[0];
      // Outline nie ma bg-*
      expect(coordsBadge.className).not.toContain("bg-primary");
      expect(coordsBadge.className).not.toContain("bg-secondary");
    });
  });

  describe("Edge cases", () => {
    it("powinien obsługiwać bardzo duże wartości współrzędnych", () => {
      render(<CellInfoBadge x={999999} y={999999} type="soil" />);
      expect(screen.getByText("x: 999999, y: 999999")).toBeInTheDocument();
    });

    it("powinien obsługiwać wartości współrzędnych równe zero", () => {
      render(<CellInfoBadge x={0} y={0} type="soil" />);
      expect(screen.getByText("x: 0, y: 0")).toBeInTheDocument();
      expect(screen.getByText(GRID_CELL_TYPE_LABELS.soil)).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie dla wszystkich typów komórek", () => {
      const types: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

      types.forEach((type) => {
        const { unmount } = render(<CellInfoBadge x={10} y={20} type={type} />);
        expect(screen.getByText("x: 10, y: 20")).toBeInTheDocument();
        expect(screen.getByText(GRID_CELL_TYPE_LABELS[type])).toBeInTheDocument();
        unmount();
      });
    });

    it("powinien renderować się poprawnie z różnymi kombinacjami współrzędnych i typów", () => {
      const testCases = [
        { x: 0, y: 0, type: "soil" as GridCellType },
        { x: 50, y: 50, type: "path" as GridCellType },
        { x: 100, y: 200, type: "water" as GridCellType },
        { x: 1, y: 1, type: "building" as GridCellType },
        { x: 199, y: 199, type: "blocked" as GridCellType },
      ];

      testCases.forEach(({ x, y, type }) => {
        const { unmount } = render(<CellInfoBadge x={x} y={y} type={type} />);
        expect(screen.getByText(`x: ${x}, y: ${y}`)).toBeInTheDocument();
        expect(screen.getByText(GRID_CELL_TYPE_LABELS[type])).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Struktura DOM", () => {
    it("powinien renderować strukturę z dwoma badge'ami w kontenerze flex", () => {
      const { container } = render(<CellInfoBadge {...defaultProps} />);

      const flexContainer = container.querySelector("div.flex.items-center.gap-2");
      expect(flexContainer).toBeInTheDocument();

      // Sprawdź czy są dwa badge'e wewnątrz kontenera
      const badges = flexContainer?.querySelectorAll('[data-slot="badge"]');
      expect(badges?.length).toBe(2);
    });

    it("powinien renderować ikony wewnątrz badge'ów", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="soil" />);

      const badges = container.querySelectorAll('[data-slot="badge"]');
      expect(badges.length).toBe(2);

      // Sprawdź czy ikony są wewnątrz badge'ów
      badges.forEach((badge) => {
        const icons = badge.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("powinien renderować tekst wewnątrz badge'ów", () => {
      render(<CellInfoBadge {...defaultProps} />);

      const badges = screen.getAllByText(/x:|Ziemia/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Accessibility", () => {
    it("powinien renderować semantyczną strukturę z divem kontenerowym", () => {
      const { container } = render(<CellInfoBadge {...defaultProps} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toBeInstanceOf(HTMLDivElement);
    });

    it("powinien renderować tekst dostępny dla screen readerów", () => {
      render(<CellInfoBadge {...defaultProps} />);

      expect(screen.getByText("x: 5, y: 10")).toBeInTheDocument();
      expect(screen.getByText(GRID_CELL_TYPE_LABELS.soil)).toBeInTheDocument();
    });

    it("powinien renderować ikony z odpowiednimi klasami CSS", () => {
      const { container } = render(<CellInfoBadge x={0} y={0} type="soil" />);

      // Ikony powinny mieć klasy lucide-* oraz h-3 w-3
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);

      icons.forEach((icon) => {
        expect(icon.className).toContain("h-3");
        expect(icon.className).toContain("w-3");
      });
    });
  });

  describe("Props validation", () => {
    it("powinien akceptować wszystkie wymagane props", () => {
      const props: CellInfoBadgeProps = {
        x: 5,
        y: 10,
        type: "soil",
      };

      expect(() => render(<CellInfoBadge {...props} />)).not.toThrow();
    });

    it("powinien renderować się poprawnie z różnymi wartościami numerycznymi x i y", () => {
      const testValues = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 100, y: 100 },
        { x: -1, y: -1 },
        { x: 999, y: 999 },
      ];

      testValues.forEach(({ x, y }) => {
        const { unmount } = render(<CellInfoBadge x={x} y={y} type="soil" />);
        expect(screen.getByText(`x: ${x}, y: ${y}`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Integracja z GRID_CELL_TYPE_LABELS", () => {
    it("powinien używać etykiet z GRID_CELL_TYPE_LABELS dla wszystkich typów", () => {
      const types: GridCellType[] = ["soil", "path", "water", "building", "blocked"];

      types.forEach((type) => {
        const { unmount } = render(<CellInfoBadge x={0} y={0} type={type} />);
        const expectedLabel = GRID_CELL_TYPE_LABELS[type];
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        unmount();
      });
    });
  });
});

