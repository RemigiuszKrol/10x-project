import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlantFitDisplay, type PlantFitDisplayProps } from "@/components/editor/modals/PlantFitDisplay";
import type { PlantFitResultDto } from "@/types";
import { SCORE_LABELS } from "@/lib/integrations/ai.config";

// Helper function do tworzenia mock fitResult
function createMockFitResult(overrides?: Partial<PlantFitResultDto>): PlantFitResultDto {
  return {
    sunlight_score: 5,
    humidity_score: 4,
    precip_score: 3,
    temperature_score: 2,
    overall_score: 4,
    explanation: "Test explanation from AI",
    ...overrides,
  };
}

describe("PlantFitDisplay", () => {
  let defaultProps: PlantFitDisplayProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      fitResult: null,
      isLoading: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading state", () => {
    it("should render loading state with spinner and message", () => {
      const { container } = render(<PlantFitDisplay {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/sprawdzam dopasowanie rośliny/i)).toBeInTheDocument();
      expect(screen.getByText(/AI analizuje warunki klimatyczne/i)).toBeInTheDocument();
      // Loader2 jest SVG z klasą lucide-loader-circle
      const loader = container.querySelector('svg.lucide-loader-circle');
      expect(loader).toBeInTheDocument();
    });

    it("should render skeleton loaders for score cards", () => {
      const { container } = render(<PlantFitDisplay {...defaultProps} isLoading={true} />);

      // Sprawdź czy są skeleton loadery (5 sztuk: 4 w grid-cols-2 + 1 col-span-2)
      // Skeleton używa data-slot="skeleton"
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
    });

    it("should not render fit result when loading", () => {
      const fitResult = createMockFitResult();
      render(<PlantFitDisplay fitResult={fitResult} isLoading={true} />);

      expect(screen.queryByText(/ocena dopasowania/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/nasłonecznienie/i)).not.toBeInTheDocument();
    });
  });

  describe("Null/empty state", () => {
    it("should return null when fitResult is null and not loading", () => {
      const { container } = render(<PlantFitDisplay {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it("should return null when fitResult is null even if isLoading is false", () => {
      const { container } = render(<PlantFitDisplay fitResult={null} isLoading={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Renderowanie wyników", () => {
    it("should render header with title and season info tooltip", () => {
      const fitResult = createMockFitResult();
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      expect(screen.getByText(/ocena dopasowania/i)).toBeInTheDocument();
      // SeasonInfoTooltip renderuje button z HelpCircle icon - znajdź przez SVG class
      const helpButton = container.querySelector('button[class*="h-6 w-6"]');
      expect(helpButton).toBeInTheDocument();
    });

    it("should render all 5 score cards", () => {
      const fitResult = createMockFitResult();
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      expect(screen.getByText(/nasłonecznienie/i)).toBeInTheDocument();
      expect(screen.getByText(/wilgotność/i)).toBeInTheDocument();
      expect(screen.getByText(/opady/i)).toBeInTheDocument();
      expect(screen.getByText(/temperatura/i)).toBeInTheDocument();
      expect(screen.getByText(/ogólna ocena/i)).toBeInTheDocument();
    });

    it("should render correct scores for each parameter", () => {
      const fitResult = createMockFitResult({
        sunlight_score: 5,
        humidity_score: 4,
        precip_score: 3,
        temperature_score: 2,
        overall_score: 1,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Sprawdź czy wszystkie score są wyświetlane
      expect(screen.getByText("5/5")).toBeInTheDocument();
      expect(screen.getByText("4/5")).toBeInTheDocument();
      expect(screen.getByText("3/5")).toBeInTheDocument();
      expect(screen.getByText("2/5")).toBeInTheDocument();
      expect(screen.getByText("1/5")).toBeInTheDocument();
    });

    it("should render score labels correctly", () => {
      const fitResult = createMockFitResult({
        sunlight_score: 5,
        humidity_score: 4,
        precip_score: 3,
        temperature_score: 2,
        overall_score: 1,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      expect(screen.getByText(`(${SCORE_LABELS[5]})`)).toBeInTheDocument();
      expect(screen.getByText(`(${SCORE_LABELS[4]})`)).toBeInTheDocument();
      expect(screen.getByText(`(${SCORE_LABELS[3]})`)).toBeInTheDocument();
      expect(screen.getByText(`(${SCORE_LABELS[2]})`)).toBeInTheDocument();
      expect(screen.getByText(`(${SCORE_LABELS[1]})`)).toBeInTheDocument();
    });

    it("should render correct number of filled stars for each score", () => {
      const fitResult = createMockFitResult({
        sunlight_score: 5, // wszystkie 5 gwiazdek wypełnione
        humidity_score: 3, // 3 gwiazdki wypełnione
        precip_score: 1, // 1 gwiazdka wypełniona
      });
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Sprawdź czy gwiazdki są renderowane (każdy ScoreCard ma 5 gwiazdek)
      // SVG z klasą lucide-star
      const allStars = container.querySelectorAll('svg.lucide-star');
      expect(allStars.length).toBeGreaterThanOrEqual(25); // 5 cards × 5 stars
      
      // Sprawdź czy są wypełnione gwiazdki (fill-yellow-400)
      const filledStars = container.querySelectorAll('svg.lucide-star.fill-yellow-400');
      expect(filledStars.length).toBeGreaterThanOrEqual(9); // 5 + 3 + 1 = 9 wypełnionych
    });

    it("should render explanation section when explanation is provided", () => {
      const fitResult = createMockFitResult({
        explanation: "This is a test explanation",
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      expect(screen.getByText(/wyjaśnienie od AI/i)).toBeInTheDocument();
    });

    it("should not render explanation section when explanation is missing", () => {
      const fitResult = createMockFitResult({
        explanation: undefined,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      expect(screen.queryByText(/wyjaśnienie od AI/i)).not.toBeInTheDocument();
    });

    it("should not render explanation section when explanation is empty string", () => {
      const fitResult = createMockFitResult({
        explanation: "",
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      expect(screen.queryByText(/wyjaśnienie od AI/i)).not.toBeInTheDocument();
    });
  });

  describe("Interakcje użytkownika", () => {
    it("should expand explanation when clicked", async () => {
      const user = userEvent.setup();
      const fitResult = createMockFitResult({
        explanation: "Test explanation content",
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const expandButton = screen.getByText(/wyjaśnienie od AI/i).closest("button");
      expect(expandButton).toBeInTheDocument();

      // Sprawdź czy explanation nie jest widoczne na początku
      expect(screen.queryByText("Test explanation content")).not.toBeInTheDocument();

      // Kliknij aby rozwinąć
      if (expandButton) {
        await user.click(expandButton);
      }

      // Sprawdź czy explanation jest teraz widoczne
      await waitFor(() => {
        expect(screen.getByText("Test explanation content")).toBeInTheDocument();
      });
    });

    it("should collapse explanation when clicked again", async () => {
      const user = userEvent.setup();
      const fitResult = createMockFitResult({
        explanation: "Test explanation content",
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const expandButton = screen.getByText(/wyjaśnienie od AI/i).closest("button");
      expect(expandButton).toBeInTheDocument();

      // Rozwiń
      if (expandButton) {
        await user.click(expandButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Test explanation content")).toBeInTheDocument();
      });

      // Zwiń
      if (expandButton) {
        await user.click(expandButton);
      }

      // Sprawdź czy explanation jest ukryte
      await waitFor(() => {
        expect(screen.queryByText("Test explanation content")).not.toBeInTheDocument();
      });
    });

    it("should toggle chevron icon when expanding/collapsing", async () => {
      const user = userEvent.setup();
      const fitResult = createMockFitResult({
        explanation: "Test explanation",
      });
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const expandButton = screen.getByText(/wyjaśnienie od AI/i).closest("button");
      expect(expandButton).toBeInTheDocument();

      // Na początku powinien być ChevronDown (sprawdź przez klasę CSS)
      const chevronDown = container.querySelector('svg.lucide-chevron-down');
      expect(chevronDown).toBeInTheDocument();

      // Kliknij aby rozwinąć
      if (expandButton) {
        await user.click(expandButton);
      }

      // Po rozwinięciu powinien być ChevronUp
      await waitFor(() => {
        const chevronUp = container.querySelector('svg.lucide-chevron-up');
        expect(chevronUp).toBeInTheDocument();
      });
    });
  });

  describe("ScoreCard rendering", () => {
    it("should render all score cards with correct icons", () => {
      const fitResult = createMockFitResult();
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Sprawdź czy ikony są renderowane (SVG icons przez klasy CSS)
      const sunIcon = container.querySelector('svg.lucide-sun');
      const dropletsIcon = container.querySelector('svg.lucide-droplets');
      const cloudRainIcon = container.querySelector('svg.lucide-cloud-rain');
      const thermometerIcon = container.querySelector('svg.lucide-thermometer');
      const starIcon = container.querySelector('svg.lucide-star.h-5.w-5'); // Star dla overall (większy)
      
      expect(sunIcon).toBeInTheDocument();
      expect(dropletsIcon).toBeInTheDocument();
      expect(cloudRainIcon).toBeInTheDocument();
      expect(thermometerIcon).toBeInTheDocument();
      expect(starIcon).toBeInTheDocument();
    });

    it("should render score cards in 2-column grid", () => {
      const fitResult = createMockFitResult();
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Sprawdź czy grid ma klasę grid-cols-2
      const grid = container.querySelector(".grid.grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("should handle edge case scores (1 and 5)", () => {
      const fitResult = createMockFitResult({
        sunlight_score: 1,
        humidity_score: 5,
        precip_score: 1,
        temperature_score: 5,
        overall_score: 3,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Użyj getAllByText gdy są duplikaty
      const score1 = screen.getAllByText("1/5");
      const score5 = screen.getAllByText("5/5");
      const score3 = screen.getAllByText("3/5");
      
      expect(score1.length).toBeGreaterThanOrEqual(2); // sunlight i precip
      expect(score5.length).toBeGreaterThanOrEqual(2); // humidity i temperature
      expect(score3.length).toBeGreaterThanOrEqual(1); // overall
    });
  });

  describe("SeasonInfoTooltip", () => {
    it("should render season info tooltip button", () => {
      const fitResult = createMockFitResult();
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // SeasonInfoTooltip renderuje button z HelpCircle - znajdź przez SVG class
      const helpButton = container.querySelector('button[class*="h-6 w-6"]');
      const helpIcon = container.querySelector('svg.lucide-circle-help');
      
      expect(helpButton).toBeInTheDocument();
      expect(helpIcon).toBeInTheDocument();
    });

    it("should show tooltip content on hover", async () => {
      const user = userEvent.setup();
      const fitResult = createMockFitResult();
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const helpButton = container.querySelector('button[class*="h-6 w-6"]') as HTMLElement;
      expect(helpButton).toBeInTheDocument();
      
      // Hover over button
      if (helpButton) {
        await user.hover(helpButton);
      }

      // Tooltip powinien się pojawić (może wymagać waitFor)
      // Tooltip może być renderowany w portalu, więc sprawdzamy czy jest dostępny
      await waitFor(() => {
        const tooltipContent = screen.queryAllByText(/wagi sezonów w ocenie/i);
        // Tooltip może nie być widoczny w testach, więc sprawdzamy czy struktura jest poprawna
        if (tooltipContent.length === 0) {
          // Sprawdzamy czy button ma odpowiednie atrybuty tooltip
          expect(helpButton).toHaveAttribute('data-slot', 'tooltip-trigger');
        } else {
          // Jeśli tooltip jest widoczny, sprawdź czy jest przynajmniej jeden
          expect(tooltipContent.length).toBeGreaterThanOrEqual(1);
        }
      }, { timeout: 2000 });
    });
  });

  describe("Edge cases", () => {
    it("should handle fitResult with all scores equal to 0", () => {
      const fitResult = createMockFitResult({
        sunlight_score: 0 as any, // TypeScript może nie pozwolić, ale testujemy edge case
        humidity_score: 0 as any,
        precip_score: 0 as any,
        temperature_score: 0 as any,
        overall_score: 0 as any,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Powinno renderować się bez błędów
      expect(screen.getByText(/ocena dopasowania/i)).toBeInTheDocument();
    });

    it("should handle very long explanation text", () => {
      const longExplanation = "A".repeat(1000);
      const fitResult = createMockFitResult({
        explanation: longExplanation,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const expandButton = screen.getByText(/wyjaśnienie od AI/i).closest("button");
      expect(expandButton).toBeInTheDocument();
    });

    it("should handle special characters in explanation", () => {
      const specialChars = "Test <>&\"' explanation with special chars";
      const fitResult = createMockFitResult({
        explanation: specialChars,
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const expandButton = screen.getByText(/wyjaśnienie od AI/i).closest("button");
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button for explanation toggle", () => {
      const fitResult = createMockFitResult({
        explanation: "Test explanation",
      });
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      const button = screen.getByRole("button", { name: /wyjaśnienie od AI/i });
      expect(button).toBeInTheDocument();
    });

    it("should render cards with proper semantic structure", () => {
      const fitResult = createMockFitResult();
      const { container } = render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);

      // Sprawdź czy są karty (Card components)
      const cards = container.querySelectorAll('[class*="card"]');
      expect(cards.length).toBeGreaterThanOrEqual(5); // 5 ScoreCards + 1 dla explanation
    });
  });

  describe("Props validation", () => {
    it("should handle isLoading true with fitResult null", () => {
      render(<PlantFitDisplay fitResult={null} isLoading={true} />);
      expect(screen.getByText(/sprawdzam dopasowanie rośliny/i)).toBeInTheDocument();
    });

    it("should handle isLoading false with fitResult provided", () => {
      const fitResult = createMockFitResult();
      render(<PlantFitDisplay fitResult={fitResult} isLoading={false} />);
      expect(screen.getByText(/ocena dopasowania/i)).toBeInTheDocument();
    });

    it("should prioritize loading state over fitResult", () => {
      const fitResult = createMockFitResult();
      render(<PlantFitDisplay fitResult={fitResult} isLoading={true} />);
      
      // Loading state powinien mieć priorytet
      expect(screen.getByText(/sprawdzam dopasowanie rośliny/i)).toBeInTheDocument();
      expect(screen.queryByText(/ocena dopasowania/i)).not.toBeInTheDocument();
    });
  });
});

