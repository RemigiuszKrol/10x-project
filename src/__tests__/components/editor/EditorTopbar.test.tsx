import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorTopbar } from "@/components/editor/EditorTopbar";
import type { PlanDto, EditorTool } from "@/types";
import { EditorToolbar } from "@/components/editor/EditorToolbar";

// Mock EditorToolbar
vi.mock("@/components/editor/EditorToolbar", () => ({
  EditorToolbar: vi.fn(({ currentTool, onToolChange }: { currentTool: EditorTool; onToolChange: (tool: EditorTool) => void }) => (
    <div data-testid="editor-toolbar">
      <button
        data-testid="tool-select"
        onClick={() => onToolChange("select")}
        data-active={currentTool === "select"}
      >
        Select
      </button>
      <button
        data-testid="tool-add-plant"
        onClick={() => onToolChange("add_plant")}
        data-active={currentTool === "add_plant"}
      >
        Add Plant
      </button>
    </div>
  )),
}));

const mockEditorToolbar = vi.mocked(EditorToolbar);

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: vi.fn(() => <svg data-testid="arrow-left-icon" />),
}));

describe("EditorTopbar", () => {
  const mockPlan: PlanDto = {
    id: "plan-123",
    user_id: "user-123",
    name: "Moja działka",
    latitude: 52.2297,
    longitude: 21.0122,
    width_cm: 1000,
    height_cm: 800,
    cell_size_cm: 50,
    grid_width: 20,
    grid_height: 16,
    orientation: 0,
    hemisphere: "north",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    plan: mockPlan,
    gridWidth: 20,
    gridHeight: 16,
    cellSizeCm: 50,
    currentTool: "select" as EditorTool,
    onToolChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować komponent z podstawowymi elementami", () => {
      render(<EditorTopbar {...defaultProps} />);

      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /moja działka/i })).toBeInTheDocument();
    });

    it("powinien renderować nazwę planu", () => {
      render(<EditorTopbar {...defaultProps} />);

      const heading = screen.getByRole("heading", { name: /moja działka/i });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Moja działka");
      expect(heading.tagName).toBe("H1");
    });

    it("powinien renderować informacje o siatce", () => {
      render(<EditorTopbar {...defaultProps} />);

      const gridInfo = screen.getByText(/siatka: 20 × 16 \(50cm\)/i);
      expect(gridInfo).toBeInTheDocument();
    });

    it("powinien renderować przycisk powrotu do listy planów", () => {
      render(<EditorTopbar {...defaultProps} />);

      const backButton = screen.getByRole("link", { name: /wróć do listy planów/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute("href", "/plans");
    });

    it("powinien renderować ikonę ArrowLeft w przycisku powrotu", () => {
      render(<EditorTopbar {...defaultProps} />);

      expect(screen.getByTestId("arrow-left-icon")).toBeInTheDocument();
    });

    it("powinien renderować tekst 'Plany' w przycisku powrotu", () => {
      render(<EditorTopbar {...defaultProps} />);

      const backButton = screen.getByRole("link", { name: /wróć do listy planów/i });
      expect(backButton).toHaveTextContent("Plany");
    });

    it("powinien renderować EditorToolbar", () => {
      render(<EditorTopbar {...defaultProps} />);

      expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();
    });

    it("powinien renderować sekcję statusu", () => {
      render(<EditorTopbar {...defaultProps} />);

      const statusText = screen.getByText(/status: ok/i);
      expect(statusText).toBeInTheDocument();
    });
  });

  describe("Informacje o siatce", () => {
    it("powinien wyświetlać poprawne wymiary siatki", () => {
      render(
        <EditorTopbar
          {...defaultProps}
          gridWidth={30}
          gridHeight={25}
          cellSizeCm={25}
        />
      );

      expect(screen.getByText(/siatka: 30 × 25 \(25cm\)/i)).toBeInTheDocument();
    });

    it("powinien wyświetlać różne rozmiary komórek", () => {
      const { rerender } = render(
        <EditorTopbar {...defaultProps} cellSizeCm={10} />
      );
      expect(screen.getByText(/\(10cm\)/i)).toBeInTheDocument();

      rerender(<EditorTopbar {...defaultProps} cellSizeCm={100} />);
      expect(screen.getByText(/\(100cm\)/i)).toBeInTheDocument();
    });
  });

  describe("Stan ładowania", () => {
    it("powinien wyświetlać wskaźnik ładowania gdy isLoading=true", () => {
      render(<EditorTopbar {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/ładowanie\.\.\./i)).toBeInTheDocument();
    });

    it("nie powinien wyświetlać wskaźnika ładowania gdy isLoading=false", () => {
      render(<EditorTopbar {...defaultProps} isLoading={false} />);

      expect(screen.queryByText(/ładowanie\.\.\./i)).not.toBeInTheDocument();
    });

    it("nie powinien wyświetlać wskaźnika ładowania gdy isLoading jest undefined", () => {
      render(<EditorTopbar {...defaultProps} />);

      expect(screen.queryByText(/ładowanie\.\.\./i)).not.toBeInTheDocument();
    });
  });

  describe("Integracja z EditorToolbar", () => {
    it("powinien przekazać currentTool do EditorToolbar", () => {
      mockEditorToolbar.mockClear();

      render(<EditorTopbar {...defaultProps} currentTool="select" />);

      expect(mockEditorToolbar).toHaveBeenCalled();
      const props = mockEditorToolbar.mock.calls[0][0];
      expect(props).toMatchObject({
        currentTool: "select",
      });
    });

    it("powinien przekazać onToolChange do EditorToolbar", () => {
      const onToolChange = vi.fn();
      mockEditorToolbar.mockClear();

      render(<EditorTopbar {...defaultProps} onToolChange={onToolChange} />);

      expect(mockEditorToolbar).toHaveBeenCalled();
      const props = mockEditorToolbar.mock.calls[0][0];
      expect(props.onToolChange).toBe(onToolChange);
    });

    it("powinien aktualizować EditorToolbar gdy currentTool się zmienia", () => {
      const { rerender } = render(
        <EditorTopbar {...defaultProps} currentTool="select" />
      );

      mockEditorToolbar.mockClear();

      rerender(<EditorTopbar {...defaultProps} currentTool="add_plant" />);

      expect(mockEditorToolbar).toHaveBeenCalled();
      const props = mockEditorToolbar.mock.calls[0][0];
      expect(props).toMatchObject({
        currentTool: "add_plant",
      });
    });

    it("powinien wywołać onToolChange gdy użytkownik kliknie narzędzie w toolbar", async () => {
      const user = userEvent.setup();
      const onToolChange = vi.fn();

      render(
        <EditorTopbar {...defaultProps} currentTool="select" onToolChange={onToolChange} />
      );

      const addPlantButton = screen.getByTestId("tool-add-plant");
      await user.click(addPlantButton);

      expect(onToolChange).toHaveBeenCalledWith("add_plant");
    });
  });

  describe("Nawigacja", () => {
    it("powinien mieć link do /plans z poprawnym href", () => {
      render(<EditorTopbar {...defaultProps} />);

      const link = screen.getByRole("link", { name: /wróć do listy planów/i });
      expect(link).toHaveAttribute("href", "/plans");
    });

    it("powinien mieć aria-label na przycisku powrotu", () => {
      render(<EditorTopbar {...defaultProps} />);

      const link = screen.getByRole("link", { name: /wróć do listy planów/i });
      expect(link).toBeInTheDocument();
    });
  });

  describe("Długie nazwy planów", () => {
    it("powinien obcinać długie nazwy planów (truncate)", () => {
      const longNamePlan = {
        ...mockPlan,
        name: "Bardzo długa nazwa planu działki która powinna być obcięta",
      };

      render(<EditorTopbar {...defaultProps} plan={longNamePlan} />);

      const heading = screen.getByRole("heading");
      expect(heading).toHaveClass("truncate");
    });
  });

  describe("Layout i struktura", () => {
    it("powinien mieć strukturę header z odpowiednimi klasami", () => {
      render(<EditorTopbar {...defaultProps} />);

      const header = screen.getByRole("banner");
      expect(header).toHaveClass("border-b", "bg-background", "px-4", "py-3");
    });

    it("powinien mieć trzy sekcje: lewa (nawigacja + info), środkowa (toolbar), prawa (status)", () => {
      render(<EditorTopbar {...defaultProps} />);

      const header = screen.getByRole("banner");
      const container = header.querySelector("div.flex.items-center.justify-between");
      expect(container).toBeInTheDocument();

      // Lewa sekcja - przycisk powrotu + nazwa planu
      expect(screen.getByRole("link", { name: /wróć do listy planów/i })).toBeInTheDocument();
      expect(screen.getByRole("heading")).toBeInTheDocument();

      // Środkowa sekcja - toolbar
      expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();

      // Prawa sekcja - status
      expect(screen.getByText(/status: ok/i)).toBeInTheDocument();
    });
  });

  describe("Różne wartości props", () => {
    it("powinien renderować się poprawnie z różnymi wymiarami siatki", () => {
      const { rerender } = render(
        <EditorTopbar
          {...defaultProps}
          gridWidth={10}
          gridHeight={10}
          cellSizeCm={10}
        />
      );

      expect(screen.getByText(/siatka: 10 × 10 \(10cm\)/i)).toBeInTheDocument();

      rerender(
        <EditorTopbar
          {...defaultProps}
          gridWidth={200}
          gridHeight={200}
          cellSizeCm={100}
        />
      );

      expect(screen.getByText(/siatka: 200 × 200 \(100cm\)/i)).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie z różnymi nazwami planów", () => {
      const { rerender } = render(
        <EditorTopbar {...defaultProps} plan={{ ...mockPlan, name: "Plan A" }} />
      );

      expect(screen.getByRole("heading", { name: /plan a/i })).toBeInTheDocument();

      rerender(
        <EditorTopbar {...defaultProps} plan={{ ...mockPlan, name: "Plan B" }} />
      );

      expect(screen.getByRole("heading", { name: /plan b/i })).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie z różnymi narzędziami", () => {
      const { rerender } = render(
        <EditorTopbar {...defaultProps} currentTool="select" />
      );

      mockEditorToolbar.mockClear();

      rerender(<EditorTopbar {...defaultProps} currentTool="add_plant" />);

      expect(mockEditorToolbar).toHaveBeenCalled();
      const props = mockEditorToolbar.mock.calls[0][0];
      expect(props).toMatchObject({
        currentTool: "add_plant",
      });
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć semantyczny element header", () => {
      render(<EditorTopbar {...defaultProps} />);

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });

    it("powinien mieć semantyczny element h1 dla nazwy planu", () => {
      render(<EditorTopbar {...defaultProps} />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H1");
    });

    it("powinien mieć aria-label na przycisku nawigacji", () => {
      render(<EditorTopbar {...defaultProps} />);

      const link = screen.getByRole("link", { name: /wróć do listy planów/i });
      expect(link).toHaveAttribute("aria-label", "Wróć do listy planów");
    });
  });
});

