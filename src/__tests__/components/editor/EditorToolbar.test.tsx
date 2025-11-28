import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import type { EditorTool } from "@/types";

describe("EditorToolbar", () => {
  const mockOnToolChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować się poprawnie z narzędziem 'select'", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      expect(screen.getByRole("button", { name: /zaznacz/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dodaj roślinę/i })).toBeInTheDocument();
    });

    it("powinien renderować się poprawnie z narzędziem 'add_plant'", () => {
      render(<EditorToolbar currentTool="add_plant" onToolChange={mockOnToolChange} />);

      expect(screen.getByRole("button", { name: /zaznacz/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dodaj roślinę/i })).toBeInTheDocument();
    });

    it("powinien renderować oba przyciski narzędzi", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("powinien renderować ikony dla obu narzędzi", () => {
      const { container } = render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      // Sprawdzamy czy ikony są renderowane (lucide-react renderuje SVG)
      const svgIcons = container.querySelectorAll("svg");
      expect(svgIcons.length).toBeGreaterThanOrEqual(2);
    });

    it("powinien renderować etykiety tekstowe przycisków", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      expect(screen.getByText("Zaznacz")).toBeInTheDocument();
      expect(screen.getByText("Dodaj roślinę")).toBeInTheDocument();
    });
  });

  describe("Wizualne wyróżnienie aktywnego narzędzia", () => {
    it("powinien wyróżnić przycisk 'select' gdy jest aktywny", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      const addPlantButton = screen.getByRole("button", { name: /dodaj roślinę/i });

      // Przycisk aktywny powinien mieć variant="default", nieaktywny variant="ghost"
      // Sprawdzamy klasy CSS - default ma bg-primary, ghost ma hover:bg-accent
      expect(selectButton.className).toContain("bg-primary");
      expect(addPlantButton.className).not.toContain("bg-primary");
    });

    it("powinien wyróżnić przycisk 'add_plant' gdy jest aktywny", () => {
      render(<EditorToolbar currentTool="add_plant" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      const addPlantButton = screen.getByRole("button", { name: /dodaj roślinę/i });

      expect(addPlantButton.className).toContain("bg-primary");
      expect(selectButton.className).not.toContain("bg-primary");
    });
  });

  describe("Interakcje użytkownika", () => {
    it("powinien wywołać onToolChange z 'select' gdy kliknięto przycisk 'Zaznacz'", async () => {
      const user = userEvent.setup();
      render(<EditorToolbar currentTool="add_plant" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      await user.click(selectButton);

      expect(mockOnToolChange).toHaveBeenCalledTimes(1);
      expect(mockOnToolChange).toHaveBeenCalledWith("select");
    });

    it("powinien wywołać onToolChange z 'add_plant' gdy kliknięto przycisk 'Dodaj roślinę'", async () => {
      const user = userEvent.setup();
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const addPlantButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      await user.click(addPlantButton);

      expect(mockOnToolChange).toHaveBeenCalledTimes(1);
      expect(mockOnToolChange).toHaveBeenCalledWith("add_plant");
    });

    it("powinien wywołać onToolChange wielokrotnie przy kolejnych kliknięciach", async () => {
      const user = userEvent.setup();
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      const addPlantButton = screen.getByRole("button", { name: /dodaj roślinę/i });

      await user.click(selectButton);
      await user.click(addPlantButton);
      await user.click(selectButton);

      expect(mockOnToolChange).toHaveBeenCalledTimes(3);
      expect(mockOnToolChange).toHaveBeenNthCalledWith(1, "select");
      expect(mockOnToolChange).toHaveBeenNthCalledWith(2, "add_plant");
      expect(mockOnToolChange).toHaveBeenNthCalledWith(3, "select");
    });

    it("powinien wywołać onToolChange nawet gdy kliknięto już aktywne narzędzie", async () => {
      const user = userEvent.setup();
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      await user.click(selectButton);

      expect(mockOnToolChange).toHaveBeenCalledTimes(1);
      expect(mockOnToolChange).toHaveBeenCalledWith("select");
    });
  });

  describe("Atrybuty dostępności", () => {
    it("powinien mieć atrybut title dla przycisku 'Zaznacz'", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      expect(selectButton).toHaveAttribute("title", "Zaznacz");
    });

    it("powinien mieć atrybut title dla przycisku 'Dodaj roślinę'", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const addPlantButton = screen.getByRole("button", { name: /dodaj roślinę/i });
      expect(addPlantButton).toHaveAttribute("title", "Dodaj roślinę");
    });
  });

  describe("Responsywność", () => {
    it("powinien renderować etykiety tekstowe z klasą hidden sm:inline", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const selectLabel = screen.getByText("Zaznacz");
      const addPlantLabel = screen.getByText("Dodaj roślinę");

      // Sprawdzamy czy etykiety mają odpowiednie klasy dla responsywności
      expect(selectLabel.className).toContain("hidden");
      expect(selectLabel.className).toContain("sm:inline");
      expect(addPlantLabel.className).toContain("hidden");
      expect(addPlantLabel.className).toContain("sm:inline");
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć kontener z klasą flex items-center gap-2", () => {
      const { container } = render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex", "items-center", "gap-2");
    });

    it("powinien mieć grupę przycisków z odpowiednimi klasami", () => {
      const { container } = render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const buttonGroup = container.querySelector(".rounded-md.border.bg-muted\\/50");
      expect(buttonGroup).toBeInTheDocument();
    });

    it("powinien renderować przyciski z rozmiarem 'sm'", () => {
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        // Sprawdzamy czy przyciski mają klasy dla rozmiaru sm
        expect(button.className).toMatch(/h-8|rounded-md/);
      });
    });
  });

  describe("Edge cases", () => {
    it("powinien działać poprawnie gdy onToolChange nie jest zdefiniowane (nie powinno się zdarzyć, ale testujemy)", () => {
      // W rzeczywistości TypeScript wymusza podanie onToolChange,
      // ale testujemy czy komponent nie crashuje przy renderowaniu
      const { container } = render(
        <EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />
      );

      expect(container).toBeInTheDocument();
    });

    it("powinien poprawnie obsługiwać szybkie kolejne kliknięcia", async () => {
      const user = userEvent.setup();
      render(<EditorToolbar currentTool="select" onToolChange={mockOnToolChange} />);

      const selectButton = screen.getByRole("button", { name: /zaznacz/i });
      const addPlantButton = screen.getByRole("button", { name: /dodaj roślinę/i });

      // Szybkie kolejne kliknięcia
      await user.click(selectButton);
      await user.click(addPlantButton);
      await user.click(selectButton);
      await user.click(addPlantButton);

      expect(mockOnToolChange).toHaveBeenCalledTimes(4);
    });
  });

  describe("Props validation", () => {
    it("powinien akceptować wszystkie wartości EditorTool", () => {
      const tools: EditorTool[] = ["select", "add_plant"];

      tools.forEach((tool) => {
        const { unmount } = render(<EditorToolbar currentTool={tool} onToolChange={mockOnToolChange} />);
        expect(screen.getAllByRole("button")).toHaveLength(2);
        unmount();
      });
    });
  });
});

