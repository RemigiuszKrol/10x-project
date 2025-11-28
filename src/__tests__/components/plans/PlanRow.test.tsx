import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanRow } from "@/components/plans/PlanRow";
import type { PlanViewModel } from "@/lib/viewmodels/plan.viewmodel";

describe("PlanRow", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const createMockPlan = (overrides?: Partial<PlanViewModel>): PlanViewModel => ({
    id: "plan-123",
    name: "Mój plan działki",
    location: {
      hasLocation: true,
      displayText: "52.1°N, 21.0°E",
      latitude: 52.1,
      longitude: 21.0,
    },
    gridSize: "10 × 20",
    updatedAt: "2024-01-15T10:30:00Z",
    updatedAtDisplay: "2 dni temu",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
  });

  describe("Renderowanie", () => {
    it("powinien renderować komponent z podstawowymi elementami", () => {
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("Mój plan działki")).toBeInTheDocument();
      expect(screen.getByText("52.1°N, 21.0°E")).toBeInTheDocument();
      expect(screen.getByText("10 × 20")).toBeInTheDocument();
      expect(screen.getByText("2 dni temu")).toBeInTheDocument();
    });

    it("powinien renderować wiersz tabeli z odpowiednimi klasami CSS", () => {
      const plan = createMockPlan();
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const tableRow = container.querySelector("tr");
      expect(tableRow).toBeInTheDocument();
      expect(tableRow).toHaveClass("hover:bg-green-50/50", "dark:hover:bg-gray-700/50", "transition-colors");
    });

    it("powinien renderować przyciski edycji i usuwania", () => {
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      const deleteButton = screen.getByLabelText(/usuń plan/i);

      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it("powinien renderować ikonę MapPin gdy plan ma lokalizację", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: true,
          displayText: "52.1°N, 21.0°E",
          latitude: 52.1,
          longitude: 21.0,
        },
      });
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const mapPinIcon = container.querySelector('svg[class*="lucide-map-pin"]');
      expect(mapPinIcon).toBeInTheDocument();
    });

    it("nie powinien renderować ikony MapPin gdy plan nie ma lokalizacji", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: false,
          displayText: "Brak lokalizacji",
          latitude: null,
          longitude: null,
        },
      });
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const mapPinIcon = container.querySelector('svg[class*="lucide-map-pin"]');
      expect(mapPinIcon).not.toBeInTheDocument();
    });

    it("powinien zastosować odpowiednie style dla lokalizacji z hasLocation=true", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: true,
          displayText: "52.1°N, 21.0°E",
          latitude: 52.1,
          longitude: 21.0,
        },
      });
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const locationSpan = screen.getByText("52.1°N, 21.0°E");
      expect(locationSpan).toHaveClass("text-gray-900", "dark:text-gray-100");
      expect(locationSpan).not.toHaveClass("text-gray-500", "italic");
    });

    it("powinien zastosować odpowiednie style dla lokalizacji z hasLocation=false", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: false,
          displayText: "Brak lokalizacji",
          latitude: null,
          longitude: null,
        },
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const locationSpan = screen.getByText("Brak lokalizacji");
      expect(locationSpan).toHaveClass("text-gray-500", "dark:text-gray-500", "italic");
      expect(locationSpan).not.toHaveClass("text-gray-900", "dark:text-gray-100");
    });

    it("powinien renderować rozmiar siatki w formacie monospace", () => {
      const plan = createMockPlan({ gridSize: "15 × 25" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const gridSizeCell = screen.getByText("15 × 25");
      expect(gridSizeCell).toHaveClass("font-mono", "text-sm");
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onEdit z poprawnym planId po kliknięciu przycisku edycji", async () => {
      const user = userEvent.setup();
      const plan = createMockPlan({ id: "plan-456" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith("plan-456");
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("powinien wywołać onDelete z poprawnym planId po kliknięciu przycisku usuwania", async () => {
      const user = userEvent.setup();
      const plan = createMockPlan({ id: "plan-789" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText(/usuń plan/i);
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith("plan-789");
      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it("powinien wywołać oba callbacks niezależnie", async () => {
      const user = userEvent.setup();
      const plan = createMockPlan({ id: "plan-abc" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      const deleteButton = screen.getByLabelText(/usuń plan/i);

      await user.click(editButton);
      await user.click(deleteButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith("plan-abc");
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith("plan-abc");
    });

    it("powinien obsłużyć wielokrotne kliknięcia przycisku edycji", async () => {
      const user = userEvent.setup();
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      await user.click(editButton);
      await user.click(editButton);
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(3);
    });

    it("powinien obsłużyć wielokrotne kliknięcia przycisku usuwania", async () => {
      const user = userEvent.setup();
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText(/usuń plan/i);
      await user.click(deleteButton);
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć aria-label na przycisku edycji z nazwą planu", () => {
      const plan = createMockPlan({ name: "Test Plan" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText("Edytuj plan Test Plan");
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveAttribute("aria-label", "Edytuj plan Test Plan");
    });

    it("powinien mieć aria-label na przycisku usuwania z nazwą planu", () => {
      const plan = createMockPlan({ name: "Mój Plan" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText("Usuń plan Mój Plan");
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute("aria-label", "Usuń plan Mój Plan");
    });

    it("powinien mieć poprawne aria-label dla planów z długimi nazwami", () => {
      const longName = "Bardzo długa nazwa planu działki z wieloma słowami";
      const plan = createMockPlan({ name: longName });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(`Edytuj plan ${longName}`);
      const deleteButton = screen.getByLabelText(`Usuń plan ${longName}`);

      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Stylizacja przycisków", () => {
    it("powinien zastosować odpowiednie klasy CSS dla przycisku edycji", () => {
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      expect(editButton).toHaveClass(
        "hover:bg-green-100",
        "dark:hover:bg-green-900/30",
        "hover:text-green-700",
        "dark:hover:text-green-400"
      );
    });

    it("powinien zastosować odpowiednie klasy CSS dla przycisku usuwania", () => {
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText(/usuń plan/i);
      expect(deleteButton).toHaveClass(
        "hover:bg-red-100",
        "dark:hover:bg-red-900/30",
        "hover:text-red-700",
        "dark:hover:text-red-400"
      );
    });

    it("powinien renderować ikony w przyciskach", () => {
      const plan = createMockPlan();
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      const deleteButton = screen.getByLabelText(/usuń plan/i);

      const editIcon = editButton.querySelector('svg[class*="lucide-pencil"]');
      const deleteIcon = deleteButton.querySelector('svg[class*="lucide-trash-2"]');

      expect(editIcon).toBeInTheDocument();
      expect(deleteIcon).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć plan z bardzo długą nazwą", () => {
      const longName = "A".repeat(200);
      const plan = createMockPlan({ name: longName });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z pustą nazwą", () => {
      const plan = createMockPlan({ name: "" });
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Sprawdź czy komponent się renderuje - komórka z nazwą powinna istnieć, nawet jeśli jest pusta
      const tableCells = container.querySelectorAll("td");
      expect(tableCells.length).toBeGreaterThan(0);
      // Sprawdź czy przyciski są dostępne (oznacza to, że komponent się poprawnie zrenderował)
      expect(screen.getByLabelText(/edytuj plan/i)).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z bardzo dużym rozmiarem siatki", () => {
      const plan = createMockPlan({ gridSize: "200 × 200" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("200 × 200")).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z małym rozmiarem siatki", () => {
      const plan = createMockPlan({ gridSize: "1 × 1" });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("1 × 1")).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z lokalizacją na półkuli południowej i zachodniej", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: true,
          displayText: "33.9°S, 151.2°W",
          latitude: -33.9,
          longitude: -151.2,
        },
      });
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("33.9°S, 151.2°W")).toBeInTheDocument();
      const mapPinIcon = container.querySelector('svg[class*="lucide-map-pin"]');
      expect(mapPinIcon).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z datą aktualizacji w przyszłości", () => {
      const futureDate = "2099-12-31T23:59:59Z";
      const plan = createMockPlan({
        updatedAt: futureDate,
        updatedAtDisplay: "za 75 lat",
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("za 75 lat")).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z bardzo starą datą aktualizacji", () => {
      const oldDate = "1900-01-01T00:00:00Z";
      const plan = createMockPlan({
        updatedAt: oldDate,
        updatedAtDisplay: "124 lata temu",
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("124 lata temu")).toBeInTheDocument();
    });

    it("powinien obsłużyć plan z UUID jako id", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const plan = createMockPlan({ id: uuid });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      expect(editButton).toBeInTheDocument();
    });
  });

  describe("Różne stany lokalizacji", () => {
    it("powinien wyświetlić lokalizację z dokładnością do 1 miejsca po przecinku", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: true,
          displayText: "52.1°N, 21.0°E",
          latitude: 52.123456,
          longitude: 21.098765,
        },
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("52.1°N, 21.0°E")).toBeInTheDocument();
    });

    it("powinien wyświetlić 'Brak lokalizacji' gdy hasLocation jest false", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: false,
          displayText: "Brak lokalizacji",
          latitude: null,
          longitude: null,
        },
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("Brak lokalizacji")).toBeInTheDocument();
    });

    it("powinien wyświetlić lokalizację na równiku (0°N)", () => {
      const plan = createMockPlan({
        location: {
          hasLocation: true,
          displayText: "0.0°N, 0.0°E",
          latitude: 0,
          longitude: 0,
        },
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("0.0°N, 0.0°E")).toBeInTheDocument();
    });
  });

  describe("Integracja z komponentami UI", () => {
    it("powinien używać komponentu TableRow z shadcn/ui", () => {
      const plan = createMockPlan();
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const tableRow = container.querySelector("tr");
      expect(tableRow).toBeInTheDocument();
    });

    it("powinien używać komponentu TableCell z shadcn/ui", () => {
      const plan = createMockPlan();
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const tableCells = container.querySelectorAll("td");
      expect(tableCells.length).toBeGreaterThan(0);
    });

    it("powinien używać komponentu Button z shadcn/ui dla przycisków akcji", () => {
      const plan = createMockPlan();
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByLabelText(/edytuj plan/i);
      const deleteButton = screen.getByLabelText(/usuń plan/i);

      expect(editButton.tagName).toBe("BUTTON");
      expect(deleteButton.tagName).toBe("BUTTON");
    });
  });

  describe("Obsługa motywu ciemnego", () => {
    it("powinien zastosować odpowiednie klasy dla trybu ciemnego", () => {
      document.documentElement.classList.add("dark");
      const plan = createMockPlan();
      const { container } = render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const tableRow = container.querySelector("tr");
      expect(tableRow).toHaveClass("dark:hover:bg-gray-700/50");
    });

    it("powinien zastosować odpowiednie klasy dla lokalizacji w trybie ciemnym", () => {
      document.documentElement.classList.add("dark");
      const plan = createMockPlan({
        location: {
          hasLocation: true,
          displayText: "52.1°N, 21.0°E",
          latitude: 52.1,
          longitude: 21.0,
        },
      });
      render(<PlanRow plan={plan} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const locationSpan = screen.getByText("52.1°N, 21.0°E");
      expect(locationSpan).toHaveClass("dark:text-gray-100");
    });
  });
});

