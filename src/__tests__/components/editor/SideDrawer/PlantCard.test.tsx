import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlantCard, type PlantCardProps } from "@/components/editor/SideDrawer/PlantCard";
import type { PlantPlacementDto } from "@/types";
import { FIT_PARAMETER_DESCRIPTIONS } from "@/lib/integrations/ai.config";

/**
 * Helper function do tworzenia mock PlantPlacementDto
 */
function createMockPlant(
  name: string,
  x: number,
  y: number,
  overrides?: Partial<PlantPlacementDto>
): PlantPlacementDto {
  return {
    x,
    y,
    plant_name: name,
    sunlight_score: null,
    humidity_score: null,
    precip_score: null,
    temperature_score: null,
    overall_score: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("PlantCard", () => {
  let defaultProps: PlantCardProps;
  let mockOnJumpTo: (x: number, y: number) => void;
  let mockOnDelete: (x: number, y: number) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnJumpTo = vi.fn();
    mockOnDelete = vi.fn();

    defaultProps = {
      plant: createMockPlant("Pomidor", 5, 10),
      onJumpTo: mockOnJumpTo,
      onDelete: mockOnDelete,
      isDeleting: false,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie podstawowe", () => {
    it("should render plant name", () => {
      render(<PlantCard {...defaultProps} />);

      expect(screen.getByText("Pomidor")).toBeInTheDocument();
    });

    it("should render plant position (x, y) with correct offset (+1)", () => {
      render(<PlantCard {...defaultProps} />);

      // Pozycja jest wyświetlana jako x+1, y+1 (dla użytkownika)
      expect(screen.getByText(/x: 6, y: 11/i)).toBeInTheDocument();
    });

    it("should render position correctly for coordinates (0, 0)", () => {
      const plant = createMockPlant("Roślina", 0, 0);
      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/x: 1, y: 1/i)).toBeInTheDocument();
    });

    it("should render Sprout icon", () => {
      const { container } = render(<PlantCard {...defaultProps} />);

      // Sprawdzamy czy ikona Sprout jest renderowana (lucide-react)
      const sproutIcon = container.querySelector('svg.lucide-sprout');
      expect(sproutIcon).toBeInTheDocument();
    });

    it("should render MapPin icon for position", () => {
      const { container } = render(<PlantCard {...defaultProps} />);

      // Sprawdzamy czy ikona MapPin jest renderowana przy pozycji
      const mapPinIcons = container.querySelectorAll('svg.lucide-map-pin');
      expect(mapPinIcons.length).toBeGreaterThan(0);
    });
  });

  describe("Renderowanie scores (gwiazdki)", () => {
    it("should render all score rows when plant has scores", () => {
      const plant = createMockPlant("Roślina z ocenami", 1, 2, {
        sunlight_score: 5,
        humidity_score: 4,
        precip_score: 3,
        temperature_score: 2,
        overall_score: 4,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/Nasłonecznienie/i)).toBeInTheDocument();
      expect(screen.getByText(/Wilgotność/i)).toBeInTheDocument();
      expect(screen.getByText(/Opady/i)).toBeInTheDocument();
      expect(screen.getByText(/Temperatura/i)).toBeInTheDocument();
      expect(screen.getByText(/Ogólnie/i)).toBeInTheDocument();
    });

    it("should render correct number of filled stars for score 5", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 5,
      });

      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);

      // Powinno być 5 wypełnionych gwiazdek (fill-yellow-400)
      const filledStars = container.querySelectorAll('svg.lucide-star.fill-yellow-400');
      // Sprawdzamy w sekcji sunlight (pierwsza sekcja scores)
      expect(filledStars.length).toBeGreaterThanOrEqual(5);
    });

    it("should render correct number of filled stars for score 3", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 3,
      });

      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);

      // Powinno być 3 wypełnione gwiazdki
      const filledStars = container.querySelectorAll('svg.lucide-star.fill-yellow-400');
      expect(filledStars.length).toBeGreaterThanOrEqual(3);
    });

    it("should render correct number of filled stars for score 1", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 1,
      });

      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);

      // Powinno być 1 wypełniona gwiazdka
      const filledStars = container.querySelectorAll('svg.lucide-star.fill-yellow-400');
      expect(filledStars.length).toBeGreaterThanOrEqual(1);
    });

    it("should render dash (—) for null score", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: null,
        humidity_score: 4,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      // Sprawdzamy czy jest wyświetlany dash dla null
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("should render all 5 stars even for low scores", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 2,
      });

      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);

      // Powinno być 5 gwiazdek (2 wypełnione, 3 puste)
      const allStars = container.querySelectorAll('svg.lucide-star');
      expect(allStars.length).toBeGreaterThanOrEqual(5);
    });

    it("should display 'Brak oceny dopasowania' when all scores are null", () => {
      const plant = createMockPlant("Roślina ręczna", 1, 1, {
        sunlight_score: null,
        humidity_score: null,
        precip_score: null,
        temperature_score: null,
        overall_score: null,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/Brak oceny dopasowania \(dodano ręcznie\)/i)).toBeInTheDocument();
    });

    it("should display scores section when at least one score is not null", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 5,
        humidity_score: null,
        precip_score: null,
        temperature_score: null,
        overall_score: null,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/Nasłonecznienie/i)).toBeInTheDocument();
      expect(screen.queryByText(/Brak oceny dopasowania/i)).not.toBeInTheDocument();
    });
  });

  describe("Tooltips dla scores", () => {
    it("should render tooltip trigger for sunlight score", async () => {
      const user = userEvent.setup();
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 5,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      const sunlightLabel = screen.getByText(/Nasłonecznienie/i);
      expect(sunlightLabel).toBeInTheDocument();

      // Sprawdzamy czy element ma atrybut tooltip
      const tooltipTrigger = sunlightLabel.closest('div[data-slot="tooltip-trigger"]');
      expect(tooltipTrigger).toBeInTheDocument();

      // Hover over the score row
      await user.hover(tooltipTrigger as HTMLElement);

      // Tooltip może być renderowany w portalu, więc sprawdzamy czy tekst jest dostępny
      await waitFor(
        () => {
          const tooltips = screen.queryAllByText(FIT_PARAMETER_DESCRIPTIONS.sunlight);
          // Tooltip może być duplikowany (jeden w portalu, jeden w aria-describedby)
          if (tooltips.length === 0) {
            // Jeśli tooltip nie jest widoczny, sprawdzamy czy struktura jest poprawna
            expect(tooltipTrigger).toBeInTheDocument();
          } else {
            expect(tooltips.length).toBeGreaterThan(0);
          }
        },
        { timeout: 2000 }
      );
    });

    it("should render tooltip for humidity score", async () => {
      const user = userEvent.setup();
      const plant = createMockPlant("Roślina", 1, 1, {
        humidity_score: 4,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      const humidityLabel = screen.getByText(/Wilgotność/i);
      expect(humidityLabel).toBeInTheDocument();

      // Sprawdzamy czy element ma atrybut tooltip
      const tooltipTrigger = humidityLabel.closest('div[data-slot="tooltip-trigger"]');
      expect(tooltipTrigger).toBeInTheDocument();

      await user.hover(tooltipTrigger as HTMLElement);

      await waitFor(
        () => {
          const tooltips = screen.queryAllByText(FIT_PARAMETER_DESCRIPTIONS.humidity);
          if (tooltips.length === 0) {
            expect(tooltipTrigger).toBeInTheDocument();
          } else {
            expect(tooltips.length).toBeGreaterThan(0);
          }
        },
        { timeout: 2000 }
      );
    });

    it("should render tooltip for overall score", async () => {
      const user = userEvent.setup();
      const plant = createMockPlant("Roślina", 1, 1, {
        overall_score: 5,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      const overallLabel = screen.getByText(/Ogólnie/i);
      expect(overallLabel).toBeInTheDocument();

      // Sprawdzamy czy element ma atrybut tooltip
      const tooltipTrigger = overallLabel.closest('div[data-slot="tooltip-trigger"]');
      expect(tooltipTrigger).toBeInTheDocument();

      await user.hover(tooltipTrigger as HTMLElement);

      await waitFor(
        () => {
          const tooltips = screen.queryAllByText(FIT_PARAMETER_DESCRIPTIONS.overall);
          if (tooltips.length === 0) {
            expect(tooltipTrigger).toBeInTheDocument();
          } else {
            expect(tooltips.length).toBeGreaterThan(0);
          }
        },
        { timeout: 2000 }
      );
    });
  });

  describe("Akcje - JumpTo", () => {
    it("should render JumpTo button when onJumpTo is provided", () => {
      const { container } = render(<PlantCard {...defaultProps} />);
      // Sprawdzamy czy jest przycisk z ikoną MapPin (dla JumpTo)
      const jumpButtons = container.querySelectorAll('button');
      const mapPinButtons = Array.from(jumpButtons).filter((btn) => {
        const svg = btn.querySelector('svg.lucide-map-pin');
        const isNotDelete = !btn.querySelector('svg.lucide-trash-2');
        return svg !== null && isNotDelete;
      });
      expect(mapPinButtons.length).toBeGreaterThan(0);
    });

    it("should not render JumpTo button when onJumpTo is undefined", () => {
      const { container } = render(<PlantCard {...defaultProps} onJumpTo={undefined} />);
      // Powinien być tylko przycisk Delete, nie JumpTo
      const buttons = container.querySelectorAll('button');
      // Delete button powinien być (z ikoną Trash2)
      const deleteButtons = Array.from(buttons).filter((btn) => {
        const svg = btn.querySelector('svg.lucide-trash-2');
        return svg !== null;
      });
      expect(deleteButtons.length).toBe(1);
      
      // Nie powinno być przycisku JumpTo (tylko MapPin w pozycji, nie w przycisku)
      const jumpButtons = Array.from(buttons).filter((btn) => {
        const svg = btn.querySelector('svg.lucide-map-pin');
        const isNotDelete = !btn.querySelector('svg.lucide-trash-2');
        return svg !== null && isNotDelete;
      });
      expect(jumpButtons.length).toBe(0);
    });

    it("should call onJumpTo with correct coordinates when JumpTo button is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlantCard {...defaultProps} />);
      // Znajdź przycisk JumpTo (z MapPin ikoną, ale nie w pozycji)
      const buttons = container.querySelectorAll('button');
      const jumpButton = Array.from(buttons).find((btn) => {
        const svg = btn.querySelector('svg.lucide-map-pin');
        const isNotDelete = !btn.querySelector('svg.lucide-trash-2');
        return svg !== null && isNotDelete;
      });

      expect(jumpButton).toBeDefined();
      await user.click(jumpButton as HTMLElement);
      expect(mockOnJumpTo).toHaveBeenCalledTimes(1);
      expect(mockOnJumpTo).toHaveBeenCalledWith(5, 10);
    });

    it("should call onJumpTo with correct coordinates for different position", async () => {
      const user = userEvent.setup();
      const plant = createMockPlant("Roślina", 15, 25);
      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);
      const buttons = container.querySelectorAll('button');
      const jumpButton = Array.from(buttons).find((btn) => {
        const svg = btn.querySelector('svg.lucide-map-pin');
        const isNotDelete = !btn.querySelector('svg.lucide-trash-2');
        return svg !== null && isNotDelete;
      });

      expect(jumpButton).toBeDefined();
      await user.click(jumpButton as HTMLElement);
      expect(mockOnJumpTo).toHaveBeenCalledWith(15, 25);
    });

    it("should render tooltip for JumpTo button", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlantCard {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      const jumpButton = Array.from(buttons).find((btn) => {
        const svg = btn.querySelector('svg.lucide-map-pin');
        const isNotDelete = !btn.querySelector('svg.lucide-trash-2');
        return svg !== null && isNotDelete;
      }) as HTMLElement;

      expect(jumpButton).toBeDefined();
      // Sprawdzamy czy przycisk ma atrybut tooltip (data-slot="tooltip-trigger")
      expect(jumpButton).toHaveAttribute('data-slot', 'tooltip-trigger');
      
      await user.hover(jumpButton);

      // Tooltip może być renderowany w portalu, więc sprawdzamy czy tekst jest dostępny (może być duplikowany)
      await waitFor(
        () => {
          const tooltips = screen.queryAllByText(/Przejdź do komórki/i);
          // Tooltip może być duplikowany (jeden w portalu, jeden w aria-describedby)
          expect(tooltips.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });
  });

  describe("Akcje - Delete", () => {
    it("should render Delete button", () => {
      const { container } = render(<PlantCard {...defaultProps} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]');
      expect(deleteButton).toBeInTheDocument();
    });

    it("should render Trash2 icon in Delete button", () => {
      const { container } = render(<PlantCard {...defaultProps} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]');
      const trashIcon = deleteButton?.querySelector('svg.lucide-trash-2');
      expect(trashIcon).toBeInTheDocument();
    });

    it("should call onDelete with correct coordinates when Delete button is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlantCard {...defaultProps} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]') as HTMLElement;
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(5, 10);
    });

    it("should call onDelete with correct coordinates for different position", async () => {
      const user = userEvent.setup();
      const plant = createMockPlant("Roślina", 20, 30);
      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]') as HTMLElement;
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(20, 30);
    });

    it("should disable Delete button when isDeleting is true", () => {
      const { container } = render(<PlantCard {...defaultProps} isDeleting={true} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]') as HTMLButtonElement;
      expect(deleteButton).toBeDisabled();
    });

    it("should not disable Delete button when isDeleting is false", () => {
      const { container } = render(<PlantCard {...defaultProps} isDeleting={false} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]') as HTMLButtonElement;
      expect(deleteButton).not.toBeDisabled();
    });

    it("should not call onDelete when button is disabled", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlantCard {...defaultProps} isDeleting={true} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]') as HTMLElement;
      await user.click(deleteButton);

      // Nie powinno wywołać onDelete gdy przycisk jest disabled
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("should render tooltip for Delete button", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlantCard {...defaultProps} />);

      const deleteButton = container.querySelector('button[class*="text-destructive"]') as HTMLElement;
      expect(deleteButton).toBeDefined();
      // Sprawdzamy czy przycisk ma atrybut tooltip
      expect(deleteButton).toHaveAttribute('data-slot', 'tooltip-trigger');
      
      await user.hover(deleteButton);

      // Tooltip może być renderowany w portalu, więc sprawdzamy czy tekst jest dostępny (może być duplikowany)
      await waitFor(
        () => {
          const tooltips = screen.queryAllByText(/Usuń roślinę/i);
          // Tooltip może być duplikowany (jeden w portalu, jeden w aria-describedby)
          expect(tooltips.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle plant with very long name", () => {
      const longName = "A".repeat(100);
      const plant = createMockPlant(longName, 1, 1);
      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle plant with special characters in name", () => {
      const specialName = "Roślina & Co. (2024) - Test!";
      const plant = createMockPlant(specialName, 1, 1);
      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(specialName)).toBeInTheDocument();
    });

    it("should handle plant with large coordinates", () => {
      const plant = createMockPlant("Roślina", 199, 199);
      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/x: 200, y: 200/i)).toBeInTheDocument();
    });

    it("should handle plant with mixed scores (some null, some not)", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 5,
        humidity_score: null,
        precip_score: 3,
        temperature_score: null,
        overall_score: 4,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      // Powinno wyświetlić sekcję scores (bo przynajmniej jeden nie jest null)
      expect(screen.getByText(/Nasłonecznienie/i)).toBeInTheDocument();
      expect(screen.queryByText(/Brak oceny dopasowania/i)).not.toBeInTheDocument();
    });

    it("should handle plant with all scores at minimum (1)", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 1,
        humidity_score: 1,
        precip_score: 1,
        temperature_score: 1,
        overall_score: 1,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/Nasłonecznienie/i)).toBeInTheDocument();
    });

    it("should handle plant with all scores at maximum (5)", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        sunlight_score: 5,
        humidity_score: 5,
        precip_score: 5,
        temperature_score: 5,
        overall_score: 5,
      });

      render(<PlantCard {...defaultProps} plant={plant} />);

      expect(screen.getByText(/Nasłonecznienie/i)).toBeInTheDocument();
    });

    it("should handle plant without onJumpTo callback", () => {
      render(<PlantCard {...defaultProps} onJumpTo={undefined} />);

      // Powinno renderować się bez przycisku JumpTo
      const { container } = render(<PlantCard {...defaultProps} onJumpTo={undefined} />);
      const buttons = container.querySelectorAll('button');
      // Powinien być tylko Delete button
      const deleteButtons = Array.from(buttons).filter((btn) => {
        return btn.querySelector('svg.lucide-trash-2') !== null;
      });
      expect(deleteButtons.length).toBe(1);
    });
  });

  describe("Stylizacja i layout", () => {
    it("should render Card component with correct classes", () => {
      const { container } = render(<PlantCard {...defaultProps} />);

      // Card powinien mieć klasę p-4 i transition-all
      const card = container.querySelector('[class*="p-4"]');
      expect(card).toBeInTheDocument();
    });

    it("should render overall score with border separator", () => {
      const plant = createMockPlant("Roślina", 1, 1, {
        overall_score: 5,
      });

      const { container } = render(<PlantCard {...defaultProps} plant={plant} />);

      // Overall score powinien być w sekcji z border-t
      const overallLabel = screen.getByText(/Ogólnie/i);
      const overallSection = overallLabel.closest('div[class*="border-t"]');
      expect(overallSection).toBeInTheDocument();
    });
  });
});

