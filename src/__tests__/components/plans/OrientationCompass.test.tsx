import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrientationCompass } from "@/components/plans/OrientationCompass";

describe("OrientationCompass", () => {
  const defaultProps = {
    value: 0,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Resetuj klasę dark na documentElement
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
  });

  describe("Renderowanie", () => {
    it("powinien renderować komponent z podstawowymi elementami", () => {
      render(<OrientationCompass {...defaultProps} />);

      expect(screen.getByLabelText(/orientacja: 0 stopni/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/orientacja \(stopnie\)/i)).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("powinien renderować SVG kompas z kierunkami świata", () => {
      render(<OrientationCompass {...defaultProps} />);

      const svg = screen.getByLabelText(/orientacja: 0 stopni/i);
      expect(svg).toBeInTheDocument();
      expect(svg.tagName).toBe("svg");

      // Sprawdź czy kierunki świata są renderowane
      const texts = svg.querySelectorAll("text");
      const directions = Array.from(texts).map((t) => t.textContent);
      expect(directions).toContain("N");
      expect(directions).toContain("S");
      expect(directions).toContain("E");
      expect(directions).toContain("W");
    });

    it("powinien renderować znaczniki co 45 stopni", () => {
      render(<OrientationCompass {...defaultProps} />);

      const svg = screen.getByLabelText(/orientacja: 0 stopni/i);
      const lines = svg.querySelectorAll("line");
      // Powinno być 8 znaczników (0, 45, 90, 135, 180, 225, 270, 315)
      expect(lines.length).toBeGreaterThanOrEqual(8);
    });

    it("powinien renderować wskaźnik orientacji (strzałkę)", () => {
      render(<OrientationCompass {...defaultProps} value={90} />);

      const svg = screen.getByLabelText(/orientacja: 90 stopni/i);
      const indicatorGroup = screen.getByTestId("orientation-indicator");
      expect(indicatorGroup).toBeInTheDocument();

      // Sprawdź czy strzałka ma odpowiednie elementy
      const line = indicatorGroup.querySelector("line");
      const polygon = indicatorGroup.querySelector("polygon");
      const circle = indicatorGroup.querySelector("circle");

      expect(line).toBeInTheDocument();
      expect(polygon).toBeInTheDocument();
      expect(circle).toBeInTheDocument();
    });

    it("powinien renderować input numeryczny z poprawną wartością", () => {
      render(<OrientationCompass {...defaultProps} value={45} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("45");
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "359");
    });

    it("powinien renderować przyciski +/-", () => {
      render(<OrientationCompass {...defaultProps} />);

      const decrementButton = screen.getByLabelText(/zmniejsz orientację o 15 stopni/i);
      const incrementButton = screen.getByLabelText(/zwiększ orientację o 15 stopni/i);

      expect(decrementButton).toBeInTheDocument();
      expect(incrementButton).toBeInTheDocument();
      expect(decrementButton).toHaveAttribute("type", "button");
      expect(incrementButton).toHaveAttribute("type", "button");
    });

    it("powinien renderować tekst pomocniczy z opisem kierunków", () => {
      render(<OrientationCompass {...defaultProps} />);

      const helpText = screen.getByText(/0° = północ, 90° = wschód, 180° = południe, 270° = zachód/i);
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveAttribute("id", "orientation-help");
    });

    it("powinien zastosować className gdy jest podany", () => {
      const { container } = render(<OrientationCompass {...defaultProps} className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("Normalizacja wartości", () => {
    it("powinien znormalizować wartość ujemną do zakresu 0-359", () => {
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      // Symuluj wpisanie wartości ujemnej
      fireEvent.change(input, { target: { value: "-45" } });

      // Po blur powinno znormalizować
      fireEvent.blur(input);

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall).toBeGreaterThanOrEqual(0);
      expect(lastCall).toBeLessThan(360);
    });

    it("powinien znormalizować wartość większą niż 359", () => {
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "450" } });
      fireEvent.blur(input);

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall).toBe(90); // 450 % 360 = 90
    });

    it("powinien znormalizować wartość 360 do 0", () => {
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "360" } });
      fireEvent.blur(input);

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall).toBe(0);
    });

    it("powinien znormalizować wartość -1 do 359", () => {
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "-1" } });
      fireEvent.blur(input);

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall).toBe(359);
    });
  });

  describe("Interakcje użytkownika - Input", () => {
    it("powinien wywołać onChange gdy użytkownik wpisuje wartość", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "90");

      expect(handleChange).toHaveBeenCalled();
    });

    it("powinien zaktualizować wartość input podczas wpisywania", async () => {
      const user = userEvent.setup();
      render(<OrientationCompass {...defaultProps} value={0} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      await user.clear(input);
      await user.type(input, "180");

      expect(input.value).toBe("180");
    });

    it("powinien znormalizować wartość po blur gdy jest nieprawidłowa", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "450");
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
      });

      const normalizedValue = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(normalizedValue).toBe(90);
    });

    it("powinien przywrócić poprzednią wartość po blur gdy input jest pusty", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={45} onChange={handleChange} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      await user.clear(input);
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(input.value).toBe("45");
      });
    });

    it("powinien przywrócić poprzednią wartość po blur gdy input zawiera nieprawidłowe dane", async () => {
      const user = userEvent.setup();
      render(<OrientationCompass value={90} onChange={vi.fn()} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      await user.clear(input);
      await user.type(input, "abc");
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(input.value).toBe("90");
      });
    });
  });

  describe("Interakcje użytkownika - Przyciski +/-", () => {
    it("powinien zwiększyć orientację o 15 stopni po kliknięciu przycisku +", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const incrementButton = screen.getByLabelText(/zwiększ orientację o 15 stopni/i);
      await user.click(incrementButton);

      expect(handleChange).toHaveBeenCalledWith(15);
    });

    it("powinien zmniejszyć orientację o 15 stopni po kliknięciu przycisku -", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={30} onChange={handleChange} />);

      const decrementButton = screen.getByLabelText(/zmniejsz orientację o 15 stopni/i);
      await user.click(decrementButton);

      expect(handleChange).toHaveBeenCalledWith(15);
    });

    it("powinien znormalizować wartość po zwiększeniu powyżej 359", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={350} onChange={handleChange} />);

      const incrementButton = screen.getByLabelText(/zwiększ orientację o 15 stopni/i);
      await user.click(incrementButton);

      expect(handleChange).toHaveBeenCalledWith(5); // (350 + 15) % 360 = 5
    });

    it("powinien znormalizować wartość po zmniejszeniu poniżej 0", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={10} onChange={handleChange} />);

      const decrementButton = screen.getByLabelText(/zmniejsz orientację o 15 stopni/i);
      await user.click(decrementButton);

      expect(handleChange).toHaveBeenCalledWith(355); // (10 - 15 + 360) % 360 = 355
    });

    it("powinien zaktualizować wartość input po kliknięciu przycisku +", async () => {
      const user = userEvent.setup();
      render(<OrientationCompass value={0} onChange={vi.fn()} />);

      const incrementButton = screen.getByLabelText(/zwiększ orientację o 15 stopni/i);
      await user.click(incrementButton);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("15");
    });

    it("powinien zaktualizować wartość input po kliknięciu przycisku -", async () => {
      const user = userEvent.setup();
      render(<OrientationCompass value={30} onChange={vi.fn()} />);

      const decrementButton = screen.getByLabelText(/zmniejsz orientację o 15 stopni/i);
      await user.click(decrementButton);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("15");
    });
  });

  describe("Rotacja wskaźnika", () => {
    it("powinien zrotować wskaźnik zgodnie z wartością orientacji", () => {
      const { rerender } = render(<OrientationCompass value={0} onChange={vi.fn()} />);

      let indicatorGroup = screen.getByTestId("orientation-indicator");
      expect(indicatorGroup).toBeInTheDocument();
      expect(indicatorGroup).toHaveAttribute("transform", "rotate(0 80 80)");

      rerender(<OrientationCompass value={90} onChange={vi.fn()} />);

      indicatorGroup = screen.getByTestId("orientation-indicator");
      expect(indicatorGroup).toBeInTheDocument();
      expect(indicatorGroup).toHaveAttribute("transform", "rotate(90 80 80)");

      rerender(<OrientationCompass value={180} onChange={vi.fn()} />);

      indicatorGroup = screen.getByTestId("orientation-indicator");
      expect(indicatorGroup).toBeInTheDocument();
      expect(indicatorGroup).toHaveAttribute("transform", "rotate(180 80 80)");
    });

    it("powinien zastosować transition-transform dla płynnej animacji", () => {
      render(<OrientationCompass value={45} onChange={vi.fn()} />);

      const indicatorGroup = screen.getByTestId("orientation-indicator");
      expect(indicatorGroup).toHaveClass("transition-transform");
      expect(indicatorGroup).toHaveClass("duration-300");
      expect(indicatorGroup).toHaveClass("ease-out");
    });
  });

  describe("Obsługa motywu (dark/light)", () => {
    it("powinien wykryć motyw jasny domyślnie", () => {
      document.documentElement.classList.remove("dark");
      render(<OrientationCompass {...defaultProps} />);

      const svg = screen.getByLabelText(/orientacja: 0 stopni/i);
      const circle = svg.querySelector("circle");
      expect(circle).toHaveAttribute("fill", "white");
    });

    it("powinien wykryć motyw ciemny gdy klasa dark jest obecna", async () => {
      document.documentElement.classList.add("dark");

      render(<OrientationCompass {...defaultProps} />);

      await waitFor(() => {
        const svg = screen.getByLabelText(/orientacja: 0 stopni/i);
        const circle = svg.querySelector("circle");
        expect(circle).toHaveAttribute("fill", "#1f2937");
      });
    });

    it("powinien zaktualizować motyw gdy klasa dark jest dodana dynamicznie", async () => {
      render(<OrientationCompass {...defaultProps} />);

      // Początkowo jasny motyw
      let svg = screen.getByLabelText(/orientacja: 0 stopni/i);
      let circle = svg.querySelector("circle");
      expect(circle).toHaveAttribute("fill", "white");

      // Dodaj klasę dark - MutationObserver powinien to wykryć automatycznie
      document.documentElement.classList.add("dark");

      // Poczekaj na aktualizację przez MutationObserver
      await waitFor(
        () => {
          svg = screen.getByLabelText(/orientacja: 0 stopni/i);
          circle = svg.querySelector("circle");
          expect(circle).toHaveAttribute("fill", "#1f2937");
        },
        { timeout: 2000 }
      );
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć wartość 0", () => {
      render(<OrientationCompass value={0} onChange={vi.fn()} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("0");

      const svg = screen.getByLabelText(/orientacja: 0 stopni/i);
      expect(svg).toBeInTheDocument();
    });

    it("powinien obsłużyć wartość 359", () => {
      render(<OrientationCompass value={359} onChange={vi.fn()} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("359");

      const svg = screen.getByLabelText(/orientacja: 359 stopni/i);
      expect(svg).toBeInTheDocument();
    });

    it("powinien obsłużyć wartość 180 (południe)", () => {
      render(<OrientationCompass value={180} onChange={vi.fn()} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("180");

      const indicatorGroup = screen.getByTestId("orientation-indicator");
      expect(indicatorGroup).toBeInTheDocument();
      expect(indicatorGroup).toHaveAttribute("transform", "rotate(180 80 80)");
    });

    it("powinien obsłużyć wielokrotne kliknięcia przycisku +", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={0} onChange={handleChange} />);

      const incrementButton = screen.getByLabelText(/zwiększ orientację o 15 stopni/i);

      await user.click(incrementButton);
      expect(handleChange).toHaveBeenCalledWith(15);

      await user.click(incrementButton);
      expect(handleChange).toHaveBeenCalledWith(30);

      await user.click(incrementButton);
      expect(handleChange).toHaveBeenCalledWith(45);
    });

    it("powinien obsłużyć wielokrotne kliknięcia przycisku -", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<OrientationCompass value={45} onChange={handleChange} />);

      const decrementButton = screen.getByLabelText(/zmniejsz orientację o 15 stopni/i);

      await user.click(decrementButton);
      expect(handleChange).toHaveBeenCalledWith(30);

      await user.click(decrementButton);
      expect(handleChange).toHaveBeenCalledWith(15);

      await user.click(decrementButton);
      expect(handleChange).toHaveBeenCalledWith(0);
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć aria-label na SVG", () => {
      render(<OrientationCompass value={90} onChange={vi.fn()} />);

      const svg = screen.getByLabelText(/orientacja: 90 stopni/i);
      expect(svg).toHaveAttribute("aria-label", "Orientacja: 90 stopni");
    });

    it("powinien mieć aria-label na przyciskach", () => {
      render(<OrientationCompass {...defaultProps} />);

      const decrementButton = screen.getByLabelText(/zmniejsz orientację o 15 stopni/i);
      const incrementButton = screen.getByLabelText(/zwiększ orientację o 15 stopni/i);

      expect(decrementButton).toHaveAttribute("aria-label", "Zmniejsz orientację o 15 stopni");
      expect(incrementButton).toHaveAttribute("aria-label", "Zwiększ orientację o 15 stopni");
    });

    it("powinien mieć aria-describedby na input", () => {
      render(<OrientationCompass {...defaultProps} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("aria-describedby", "orientation-help");
    });

    it("powinien mieć powiązanie label z input przez htmlFor", () => {
      render(<OrientationCompass {...defaultProps} />);

      const label = screen.getByText(/orientacja \(stopnie\)/i);
      const input = screen.getByRole("spinbutton");

      expect(label).toHaveAttribute("for", "orientation-input");
      expect(input).toHaveAttribute("id", "orientation-input");
    });
  });

  describe("Synchronizacja wartości", () => {
    it("powinien zaktualizować input gdy prop value się zmienia", () => {
      const { rerender } = render(<OrientationCompass value={0} onChange={vi.fn()} />);

      let input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("0");

      rerender(<OrientationCompass value={90} onChange={vi.fn()} />);

      input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("90");
    });

    it("powinien zaktualizować SVG aria-label gdy prop value się zmienia", () => {
      const { rerender } = render(<OrientationCompass value={0} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/orientacja: 0 stopni/i)).toBeInTheDocument();

      rerender(<OrientationCompass value={180} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/orientacja: 180 stopni/i)).toBeInTheDocument();
    });
  });
});

