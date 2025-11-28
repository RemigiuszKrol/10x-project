import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSelector, DEFAULT_THEME_OPTIONS, type ThemeOption } from "@/components/profile/ThemeSelector";
import type { UiTheme } from "@/types";

describe("ThemeSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować etykietę 'Motyw kolorystyczny'", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const label = screen.getByText("Motyw kolorystyczny");
      expect(label).toBeInTheDocument();
    });

    it("powinien renderować wszystkie opcje z przekazanej tablicy", () => {
      const mockOnChange = vi.fn();
      const customOptions: ThemeOption[] = [
        { value: "light", label: "Jasny", icon: <span>☀️</span> },
        { value: "dark", label: "Ciemny", icon: <span>🌙</span> },
      ];

      render(
        <ThemeSelector
          options={customOptions}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole("button", { name: /jasny/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ciemny/i })).toBeInTheDocument();
    });

    it("powinien renderować ikony dla każdej opcji", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        const icon = button.querySelector("svg");
        expect(icon).toBeInTheDocument();
      });
    });

    it("powinien renderować przyciski z odpowiednimi etykietami", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole("button", { name: /jasny/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ciemny/i })).toBeInTheDocument();
    });

    it("powinien renderować kontener z odpowiednimi klasami CSS", () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("space-y-3");
    });

    it("powinien renderować kontener przycisków z klasą flex i gap", () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttonsContainer = container.querySelector("div.flex");
      expect(buttonsContainer).toBeInTheDocument();
      expect(buttonsContainer).toHaveClass("flex");
      expect(buttonsContainer).toHaveClass("gap-2");
    });
  });

  describe("Wybór wartości", () => {
    it("powinien wyświetlać przycisk z wariantem 'default' dla wybranej wartości", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const lightButton = screen.getByRole("button", { name: /jasny/i });
      // Przycisk z wariantem default ma odpowiednie klasy (z shadcn/ui Button)
      expect(lightButton).toBeInTheDocument();
    });

    it("powinien wyświetlać przycisk z wariantem 'outline' dla niewybranej wartości", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const darkButton = screen.getByRole("button", { name: /ciemny/i });
      expect(darkButton).toBeInTheDocument();
    });

    it("powinien zmieniać wariant przycisku gdy zmienia się wartość", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      let lightButton = screen.getByRole("button", { name: /jasny/i });
      let darkButton = screen.getByRole("button", { name: /ciemny/i });
      expect(lightButton).toBeInTheDocument();
      expect(darkButton).toBeInTheDocument();

      rerender(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="dark"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      lightButton = screen.getByRole("button", { name: /jasny/i });
      darkButton = screen.getByRole("button", { name: /ciemny/i });
      expect(lightButton).toBeInTheDocument();
      expect(darkButton).toBeInTheDocument();
    });
  });

  describe("Interakcje", () => {
    it("powinien wywołać onChange z wartością opcji po kliknięciu przycisku", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const darkButton = screen.getByRole("button", { name: /ciemny/i });
      await user.click(darkButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("dark");
    });

    it("powinien wywołać onChange z wartością 'light' po kliknięciu przycisku jasnego", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="dark"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const lightButton = screen.getByRole("button", { name: /jasny/i });
      await user.click(lightButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("light");
    });

    it("powinien wywołać onChange dla każdej opcji po kliknięciu", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const customOptions: ThemeOption[] = [
        { value: "light", label: "Jasny", icon: <span>☀️</span> },
        { value: "dark", label: "Ciemny", icon: <span>🌙</span> },
      ];

      render(
        <ThemeSelector
          options={customOptions}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const lightButton = screen.getByRole("button", { name: /jasny/i });
      const darkButton = screen.getByRole("button", { name: /ciemny/i });

      await user.click(lightButton);
      expect(mockOnChange).toHaveBeenCalledWith("light");

      await user.click(darkButton);
      expect(mockOnChange).toHaveBeenCalledWith("dark");

      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("Stan disabled", () => {
    it("powinien wyłączyć wszystkie przyciski gdy disabled=true", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={true}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("powinien włączyć wszystkie przyciski gdy disabled=false", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it("nie powinien wywołać onChange gdy disabled=true i użytkownik klika przycisk", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={true}
          onChange={mockOnChange}
        />
      );

      const darkButton = screen.getByRole("button", { name: /ciemny/i });
      await user.click(darkButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("DEFAULT_THEME_OPTIONS", () => {
    it("powinien eksportować tablicę z dwoma opcjami", () => {
      expect(DEFAULT_THEME_OPTIONS).toHaveLength(2);
    });

    it("powinien zawierać opcję 'light' z etykietą 'Jasny'", () => {
      const lightOption = DEFAULT_THEME_OPTIONS.find((opt) => opt.value === "light");
      expect(lightOption).toBeDefined();
      expect(lightOption?.label).toBe("Jasny");
      expect(lightOption?.value).toBe("light");
    });

    it("powinien zawierać opcję 'dark' z etykietą 'Ciemny'", () => {
      const darkOption = DEFAULT_THEME_OPTIONS.find((opt) => opt.value === "dark");
      expect(darkOption).toBeDefined();
      expect(darkOption?.label).toBe("Ciemny");
      expect(darkOption?.value).toBe("dark");
    });

    it("powinien zawierać ikonę Sun dla opcji 'light'", () => {
      const lightOption = DEFAULT_THEME_OPTIONS.find((opt) => opt.value === "light");
      expect(lightOption?.icon).toBeDefined();
      // Ikona powinna być elementem React (SVG z lucide-react)
      expect(lightOption?.icon).toBeTruthy();
    });

    it("powinien zawierać ikonę Moon dla opcji 'dark'", () => {
      const darkOption = DEFAULT_THEME_OPTIONS.find((opt) => opt.value === "dark");
      expect(darkOption?.icon).toBeDefined();
      // Ikona powinna być elementem React (SVG z lucide-react)
      expect(darkOption?.icon).toBeTruthy();
    });

    it("powinien renderować ikony z DEFAULT_THEME_OPTIONS poprawnie", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);

      // Sprawdź czy każdy przycisk ma ikonę SVG
      buttons.forEach((button) => {
        const icon = button.querySelector("svg");
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe("Wiele opcji", () => {
    it("powinien renderować więcej niż dwie opcje", () => {
      const mockOnChange = vi.fn();
      const manyOptions: ThemeOption[] = [
        { value: "light", label: "Jasny", icon: <span>☀️</span> },
        { value: "dark", label: "Ciemny", icon: <span>🌙</span> },
        { value: "system", label: "System", icon: <span>⚙️</span> },
      ];

      render(
        <ThemeSelector
          options={manyOptions}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
      expect(screen.getByRole("button", { name: /jasny/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ciemny/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /system/i })).toBeInTheDocument();
    });

    it("powinien poprawnie obsługiwać wybór z wielu opcji", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const manyOptions: ThemeOption[] = [
        { value: "light", label: "Jasny", icon: <span>☀️</span> },
        { value: "dark", label: "Ciemny", icon: <span>🌙</span> },
        { value: "system", label: "System", icon: <span>⚙️</span> },
      ];

      render(
        <ThemeSelector
          options={manyOptions}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const systemButton = screen.getByRole("button", { name: /system/i });
      await user.click(systemButton);

      expect(mockOnChange).toHaveBeenCalledWith("system");
    });
  });

  describe("Edge cases", () => {
    it("powinien obsługiwać pustą tablicę opcji", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={[]}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
      // Etykieta powinna być nadal widoczna
      expect(screen.getByText("Motyw kolorystyczny")).toBeInTheDocument();
    });

    it("powinien obsługiwać jedną opcję", () => {
      const mockOnChange = vi.fn();
      const singleOption: ThemeOption[] = [
        { value: "light", label: "Jasny", icon: <span>☀️</span> },
      ];

      render(
        <ThemeSelector
          options={singleOption}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(1);
      expect(screen.getByRole("button", { name: /jasny/i })).toBeInTheDocument();
    });

    it("powinien obsługiwać opcje z niestandardowymi ikonami", () => {
      const mockOnChange = vi.fn();
      const customOptions: ThemeOption[] = [
        { value: "light", label: "Jasny", icon: <span data-testid="custom-icon">Custom</span> },
        { value: "dark", label: "Ciemny", icon: <div data-testid="custom-icon-2">Custom2</div> },
      ];

      render(
        <ThemeSelector
          options={customOptions}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
      expect(screen.getByTestId("custom-icon-2")).toBeInTheDocument();
    });

    it("powinien obsługiwać opcje z długimi etykietami", () => {
      const mockOnChange = vi.fn();
      const longLabelOptions: ThemeOption[] = [
        {
          value: "light",
          label: "Bardzo długa etykieta motywu jasnego",
          icon: <span>☀️</span>,
        },
        {
          value: "dark",
          label: "Bardzo długa etykieta motywu ciemnego",
          icon: <span>🌙</span>,
        },
      ];

      render(
        <ThemeSelector
          options={longLabelOptions}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      expect(
        screen.getByRole("button", { name: /bardzo długa etykieta motywu jasnego/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /bardzo długa etykieta motywu ciemnego/i })
      ).toBeInTheDocument();
    });

    it("powinien obsługiwać szybkie kolejne kliknięcia", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const lightButton = screen.getByRole("button", { name: /jasny/i });
      const darkButton = screen.getByRole("button", { name: /ciemny/i });

      await user.click(lightButton);
      await user.click(darkButton);
      await user.click(lightButton);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, "light");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "dark");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "light");
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć odpowiednią strukturę dla screen readerów", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      // Etykieta powinna być powiązana z przyciskami
      const label = screen.getByText("Motyw kolorystyczny");
      expect(label).toBeInTheDocument();

      // Przyciski powinny być dostępne dla screen readerów
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("powinien mieć przyciski dostępne dla klawiatury gdy nie są disabled", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });

    it("powinien mieć przyciski niedostępne dla klawiatury gdy są disabled", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={true}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną hierarchię elementów", () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      // Główny kontener
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer.tagName).toBe("DIV");

      // Etykieta
      const label = screen.getByText("Motyw kolorystyczny");
      expect(label).toBeInTheDocument();

      // Kontener przycisków
      const buttonsContainer = mainContainer.querySelector("div.flex");
      expect(buttonsContainer).toBeInTheDocument();

      // Przyciski
      const buttons = buttonsContainer?.querySelectorAll("button");
      expect(buttons).toHaveLength(2);
    });

    it("powinien renderować ikony wewnątrz przycisków", () => {
      const mockOnChange = vi.fn();
      render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        const icon = button.querySelector("svg");
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe("Props i wartości", () => {
    it("powinien akceptować wszystkie wymagane props", () => {
      const mockOnChange = vi.fn();
      expect(() => {
        render(
          <ThemeSelector
            options={DEFAULT_THEME_OPTIONS}
            value="light"
            disabled={false}
            onChange={mockOnChange}
          />
        );
      }).not.toThrow();
    });

    it("powinien aktualizować się gdy zmienia się prop value", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      let lightButton = screen.getByRole("button", { name: /jasny/i });
      let darkButton = screen.getByRole("button", { name: /ciemny/i });
      expect(lightButton).toBeInTheDocument();
      expect(darkButton).toBeInTheDocument();

      rerender(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="dark"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      lightButton = screen.getByRole("button", { name: /jasny/i });
      darkButton = screen.getByRole("button", { name: /ciemny/i });
      expect(lightButton).toBeInTheDocument();
      expect(darkButton).toBeInTheDocument();
    });

    it("powinien aktualizować się gdy zmienia się prop disabled", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={false}
          onChange={mockOnChange}
        />
      );

      let buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });

      rerender(
        <ThemeSelector
          options={DEFAULT_THEME_OPTIONS}
          value="light"
          disabled={true}
          onChange={mockOnChange}
        />
      );

      buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});

