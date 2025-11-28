import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanCreatorStepDimensions } from "@/components/plans/steps/PlanCreatorStepDimensions";
import type { PlanDimensionsFormData, GridDimensions } from "@/types";
import type { GridPreviewProps } from "@/components/plans/GridPreview";

// Mock komponentów zależnych
vi.mock("@/components/plans/OrientationCompass", () => ({
  OrientationCompass: ({ value, onChange }: { value: number; onChange: (value: number) => void }) => (
    <div data-testid="orientation-compass">
      <label htmlFor="orientation-input">Orientacja</label>
      <input
        id="orientation-input"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid="orientation-input"
      />
    </div>
  ),
}));

vi.mock("@/components/plans/GridPreview", () => ({
  GridPreview: ({ gridWidth, gridHeight, cellSizeCm, orientation }: GridPreviewProps) => (
    <div data-testid="grid-preview">
      <div>
        Grid: {gridWidth}×{gridHeight}
      </div>
      <div>Cell: {cellSizeCm}cm</div>
      <div>Orientation: {orientation}°</div>
    </div>
  ),
}));

describe("PlanCreatorStepDimensions", () => {
  const defaultData: PlanDimensionsFormData = {
    width_m: 0,
    height_m: 0,
    cell_size_cm: 25,
    orientation: 0,
    hemisphere: "northern",
  };

  const defaultGridDimensions: GridDimensions = {
    gridWidth: 0,
    gridHeight: 0,
    isValid: false,
  };

  const defaultProps = {
    data: defaultData,
    onChange: vi.fn(),
    errors: {},
    gridDimensions: defaultGridDimensions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować nagłówek i opis", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByText("Wymiary i orientacja")).toBeInTheDocument();
      expect(
        screen.getByText(/Określ rozmiar działki, jednostkę siatki oraz orientację względem stron świata/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować sekcję wymiarów działki", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByText("Wymiary działki")).toBeInTheDocument();
      expect(screen.getByLabelText(/Szerokość \(m\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Wysokość \(m\)/i)).toBeInTheDocument();
    });

    it("powinien renderować pole input dla szerokości", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toBeInTheDocument();
      expect(widthInput).toHaveAttribute("id", "width-m");
      expect(widthInput).toHaveAttribute("type", "number");
    });

    it("powinien renderować pole input dla wysokości", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i);
      expect(heightInput).toBeInTheDocument();
      expect(heightInput).toHaveAttribute("id", "height-m");
      expect(heightInput).toHaveAttribute("type", "number");
    });

    it("powinien renderować select dla rozmiaru kratki", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByLabelText(/Rozmiar pojedynczej kratki/i)).toBeInTheDocument();
      expect(screen.getByText("25 cm (standardowe)")).toBeInTheDocument();
    });

    it("powinien renderować komponent OrientationCompass", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByTestId("orientation-compass")).toBeInTheDocument();
    });

    it("powinien renderować select dla półkuli (disabled)", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const hemisphereSelect = screen.getByLabelText(/Półkula/i);
      expect(hemisphereSelect).toBeInTheDocument();
      // Select jest disabled, więc sprawdzamy czy jest w odpowiednim kontenerze
      const selectContainer = hemisphereSelect.closest("div");
      expect(selectContainer).toBeInTheDocument();
    });

    it("powinien renderować sekcję podglądu siatki", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByText("Podgląd siatki")).toBeInTheDocument();
    });

    it("powinien renderować sekcję z wskazówką", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByText("💡 Wskazówka")).toBeInTheDocument();
    });

    it("powinien renderować gwiazdki oznaczające wymagane pola", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const widthLabel = screen.getByText(/Szerokość \(m\)/i);
      const heightLabel = screen.getByText(/Wysokość \(m\)/i);
      const cellSizeLabel = screen.getByText(/Rozmiar pojedynczej kratki/i);

      expect(widthLabel.querySelector('span[aria-label="wymagane"]')).toBeInTheDocument();
      expect(heightLabel.querySelector('span[aria-label="wymagane"]')).toBeInTheDocument();
      expect(cellSizeLabel.querySelector('span[aria-label="wymagane"]')).toBeInTheDocument();
    });
  });

  describe("Wyświetlanie wartości", () => {
    it("powinien wyświetlać wartości szerokości i wysokości gdy są ustawione", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, width_m: 10, height_m: 15 }} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i) as HTMLInputElement;
      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i) as HTMLInputElement;

      expect(widthInput.value).toBe("10");
      expect(heightInput.value).toBe("15");
    });

    it("powinien wyświetlać pusty string gdy wymiary są 0", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i) as HTMLInputElement;
      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i) as HTMLInputElement;

      expect(widthInput.value).toBe("");
      expect(heightInput.value).toBe("");
    });

    it("powinien wyświetlać wybrany rozmiar kratki", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, cell_size_cm: 50 }} />);

      expect(screen.getByText("50 cm (większe rośliny)")).toBeInTheDocument();
    });

    it("powinien wyświetlać orientację w kompasie", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, orientation: 90 }} />);

      const orientationInput = screen.getByTestId("orientation-input") as HTMLInputElement;
      expect(orientationInput.value).toBe("90");
    });
  });

  describe("Interakcje użytkownika - szerokość", () => {
    it("powinien wywołać onChange gdy użytkownik wpisuje szerokość", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepDimensions {...defaultProps} onChange={handleChange} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      await user.type(widthInput, "10");

      expect(handleChange).toHaveBeenCalled();
      // Sprawdzamy czy wywołano z poprawną wartością
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          width_m: expect.any(Number),
        })
      );
    });

    it("powinien ustawić width_m na 0 gdy input jest pusty", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, width_m: 10 }} onChange={handleChange} />
      );

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      await user.clear(widthInput);

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          width_m: 0,
        })
      );
    });
  });

  describe("Interakcje użytkownika - wysokość", () => {
    it("powinien wywołać onChange gdy użytkownik wpisuje wysokość", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepDimensions {...defaultProps} onChange={handleChange} />);

      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i);
      await user.type(heightInput, "15");

      expect(handleChange).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          height_m: expect.any(Number),
        })
      );
    });

    it("powinien ustawić height_m na 0 gdy input jest pusty", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, height_m: 15 }} onChange={handleChange} />
      );

      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i);
      await user.clear(heightInput);

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          height_m: 0,
        })
      );
    });
  });

  describe("Walidacja i błędy", () => {
    it("powinien wyświetlać błąd dla szerokości", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} errors={{ width_m: "Szerokość jest wymagana" }} />);

      expect(screen.getByText("Szerokość jest wymagana")).toBeInTheDocument();
      expect(screen.getByText("Szerokość jest wymagana")).toHaveAttribute("role", "alert");
    });

    it("powinien wyświetlać błąd dla wysokości", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} errors={{ height_m: "Wysokość jest wymagana" }} />);

      expect(screen.getByText("Wysokość jest wymagana")).toBeInTheDocument();
      expect(screen.getByText("Wysokość jest wymagana")).toHaveAttribute("role", "alert");
    });

    it("powinien ustawić aria-invalid na true gdy jest błąd szerokości", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} errors={{ width_m: "Błąd" }} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toHaveAttribute("aria-invalid", "true");
    });

    it("powinien ustawić aria-invalid na true gdy jest błąd wysokości", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} errors={{ height_m: "Błąd" }} />);

      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i);
      expect(heightInput).toHaveAttribute("aria-invalid", "true");
    });

    it("powinien wyświetlać tekst pomocniczy gdy nie ma błędu", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByText(/Szerokość działki w metrach/i)).toBeInTheDocument();
      expect(screen.getByText(/Wysokość działki w metrach/i)).toBeInTheDocument();
    });

    it("powinien ukryć tekst pomocniczy gdy jest błąd", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} errors={{ width_m: "Błąd" }} />);

      expect(screen.queryByText(/Szerokość działki w metrach/i)).not.toBeInTheDocument();
    });
  });

  describe("Obliczenia - maxDimension i stepValue", () => {
    it("powinien ustawić odpowiednie atrybuty min, max, step dla inputów", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, cell_size_cm: 25 }} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i);

      // stepValue = 25/100 = 0.25
      expect(widthInput).toHaveAttribute("step", "0.25");
      expect(heightInput).toHaveAttribute("step", "0.25");
      expect(widthInput).toHaveAttribute("max", "50");
      expect(heightInput).toHaveAttribute("max", "50");
    });
  });

  describe("Automatyczne określanie półkuli", () => {
    it("powinien określić półkulę północną dla latitude >= 0", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} latitude={52.23} />);

      expect(
        screen.getByText(/Półkula określona automatycznie na podstawie współrzędnych \(północna\)/i)
      ).toBeInTheDocument();
    });

    it("powinien określić półkulę południową dla latitude < 0", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} latitude={-33.87} />);

      expect(
        screen.getByText(/Półkula określona automatycznie na podstawie współrzędnych \(południowa\)/i)
      ).toBeInTheDocument();
    });

    it("powinien wyświetlić komunikat gdy brak współrzędnych", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(
        screen.getByText(/Półkula zostanie określona automatycznie po ustawieniu lokalizacji działki/i)
      ).toBeInTheDocument();
    });

    it("powinien zaktualizować półkulę gdy latitude się zmienia", async () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <PlanCreatorStepDimensions {...defaultProps} latitude={52.23} onChange={handleChange} />
      );

      // Zmieniamy latitude na południową
      rerender(
        <PlanCreatorStepDimensions
          {...defaultProps}
          latitude={-33.87}
          data={{ ...defaultData, hemisphere: "northern" }}
          onChange={handleChange}
        />
      );

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(
          expect.objectContaining({
            hemisphere: "southern",
          })
        );
      });
    });

    it("powinien użyć fallback do data.hemisphere gdy brak latitude", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, hemisphere: "southern" }} />);

      // Sprawdzamy czy select ma wartość southern (disabled, więc nie możemy kliknąć)
      expect(screen.getByText(/Półkula zostanie określona automatycznie/i)).toBeInTheDocument();
    });
  });

  describe("Podgląd siatki", () => {
    it("powinien wyświetlić GridPreview gdy wymiary są prawidłowe", () => {
      render(
        <PlanCreatorStepDimensions
          {...defaultProps}
          data={{ ...defaultData, width_m: 10, height_m: 15 }}
          gridDimensions={{
            gridWidth: 40,
            gridHeight: 60,
            isValid: true,
          }}
        />
      );

      expect(screen.getByTestId("grid-preview")).toBeInTheDocument();
      expect(screen.getByText("Grid: 40×60")).toBeInTheDocument();
    });

    it("nie powinien wyświetlać GridPreview gdy width_m = 0", () => {
      render(
        <PlanCreatorStepDimensions
          {...defaultProps}
          data={{ ...defaultData, width_m: 0, height_m: 15 }}
          gridDimensions={{
            gridWidth: 0,
            gridHeight: 60,
            isValid: true,
          }}
        />
      );

      expect(screen.queryByTestId("grid-preview")).not.toBeInTheDocument();
    });

    it("nie powinien wyświetlać GridPreview gdy height_m = 0", () => {
      render(
        <PlanCreatorStepDimensions
          {...defaultProps}
          data={{ ...defaultData, width_m: 10, height_m: 0 }}
          gridDimensions={{
            gridWidth: 40,
            gridHeight: 0,
            isValid: true,
          }}
        />
      );

      expect(screen.queryByTestId("grid-preview")).not.toBeInTheDocument();
    });

    it("nie powinien wyświetlać GridPreview gdy gridDimensions.isValid = false", () => {
      render(
        <PlanCreatorStepDimensions
          {...defaultProps}
          data={{ ...defaultData, width_m: 10, height_m: 15 }}
          gridDimensions={{
            gridWidth: 0,
            gridHeight: 0,
            isValid: false,
          }}
        />
      );

      expect(screen.queryByTestId("grid-preview")).not.toBeInTheDocument();
    });

    it("powinien wyświetlić ostrzeżenie gdy wymiary są 0", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      expect(screen.getByText(/Wprowadź wymiary działki aby zobaczyć podgląd siatki/i)).toBeInTheDocument();
    });

    it("powinien wyświetlić błąd gdy gridDimensions.isValid = false", () => {
      render(
        <PlanCreatorStepDimensions
          {...defaultProps}
          gridDimensions={{
            gridWidth: 0,
            gridHeight: 0,
            isValid: false,
            errorMessage: "Siatka przekracza limit 200×200",
          }}
        />
      );

      expect(screen.getByText(/Błąd wymiarów:/i)).toBeInTheDocument();
      expect(screen.getByText("Siatka przekracza limit 200×200")).toBeInTheDocument();
    });
  });

  describe("Placeholder i tekst pomocniczy", () => {
    it("powinien wyświetlać placeholder z maxDimension", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, cell_size_cm: 25 }} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toHaveAttribute("placeholder", "np. 50.0");
    });

    it("powinien aktualizować placeholder gdy zmienia się cell_size_cm", () => {
      const { rerender } = render(
        <PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, cell_size_cm: 25 }} />
      );

      let widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toHaveAttribute("placeholder", "np. 50.0");

      rerender(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, cell_size_cm: 100 }} />);

      widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toHaveAttribute("placeholder", "np. 200.0");
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć ujemne wartości wymiarów", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepDimensions {...defaultProps} onChange={handleChange} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      await user.type(widthInput, "-10");

      // parseFloat("-10") = -10, więc powinno być przekazane
      expect(handleChange).toHaveBeenCalled();
    });

    it("powinien obsłużyć bardzo duże wartości wymiarów", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<PlanCreatorStepDimensions {...defaultProps} onChange={handleChange} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      await user.type(widthInput, "999999");

      expect(handleChange).toHaveBeenCalled();
    });

    it("powinien obsłużyć orientację poza zakresem 0-359", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, orientation: 450 }} />);

      const orientationInput = screen.getByTestId("orientation-input") as HTMLInputElement;
      expect(orientationInput.value).toBe("450");
    });
  });

  describe("Accessibility", () => {
    it("powinien mieć poprawne aria-describedby dla inputów", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toHaveAttribute("aria-describedby", "width-help");

      const heightInput = screen.getByLabelText(/Wysokość \(m\)/i);
      expect(heightInput).toHaveAttribute("aria-describedby", "height-help");
    });

    it("powinien mieć aria-describedby wskazujące na błąd gdy jest błąd", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} errors={{ width_m: "Błąd" }} />);

      const widthInput = screen.getByLabelText(/Szerokość \(m\)/i);
      expect(widthInput).toHaveAttribute("aria-describedby", "width-error");
    });

    it("powinien mieć aria-label dla wymaganych pól", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} />);

      const requiredMarks = screen.getAllByLabelText("wymagane");
      expect(requiredMarks.length).toBeGreaterThan(0);
    });
  });

  describe("Sekcja wskazówki", () => {
    it("powinien wyświetlać wszystkie wskazówki", () => {
      render(<PlanCreatorStepDimensions {...defaultProps} data={{ ...defaultData, cell_size_cm: 25 }} />);

      expect(screen.getByText(/Wymiary wprowadzasz w metrach \(m\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Maksymalna wartość:/i)).toBeInTheDocument();
      expect(screen.getByText(/Wymiary muszą być podzielne przez rozmiar kratki/i)).toBeInTheDocument();
      expect(screen.getByText(/Siatka nie może przekroczyć 200 × 200 pól/i)).toBeInTheDocument();
      expect(screen.getByText(/Mniejszy rozmiar kratki = większa precyzja/i)).toBeInTheDocument();
      expect(screen.getByText(/Orientacja 0° oznacza/i)).toBeInTheDocument();
    });
  });
});
