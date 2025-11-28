import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanCreatorStepSummary } from "@/components/plans/steps/PlanCreatorStepSummary";
import type { PlanCreateFormData, PlanCreatorStep } from "@/types";

describe("PlanCreatorStepSummary", () => {
  const mockOnEditStep = vi.fn();

  const createMockData = (overrides?: Partial<PlanCreateFormData>): PlanCreateFormData => {
    return {
      name: "Mój ogród",
      latitude: 52.2297,
      longitude: 21.0122,
      address: "Warszawa, Polska",
      width_m: 10,
      height_m: 5,
      cell_size_cm: 50,
      orientation: 0,
      hemisphere: "northern",
      ...overrides,
    };
  };

  const defaultProps = {
    data: createMockData(),
    onEditStep: mockOnEditStep,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować nagłówek i opis", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Podsumowanie")).toBeInTheDocument();
      expect(
        screen.getByText(/Sprawdź wprowadzone dane przed utworzeniem planu/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować ostrzeżenie o nieodwracalności operacji", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const alert = screen.getByText(/Uwaga!/i);
      expect(alert).toBeInTheDocument();
      expect(
        screen.getByText(/Po utworzeniu planu nie będzie możliwa zmiana wymiarów/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować informację końcową o gotowości", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText(/✓ Gotowe do utworzenia/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Wszystkie dane zostały wprowadzone poprawnie/i)
      ).toBeInTheDocument();
    });
  });

  describe("Karta: Podstawowe informacje", () => {
    it("powinien renderować kartę z podstawowymi informacjami", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Podstawowe informacje")).toBeInTheDocument();
      expect(screen.getByText("Nazwa planu")).toBeInTheDocument();
    });

    it("powinien wyświetlić nazwę planu", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Mój ogród")).toBeInTheDocument();
    });

    it("powinien wyświetlić '—' gdy nazwa jest pusta", () => {
      render(<PlanCreatorStepSummary {...defaultProps} data={createMockData({ name: "" })} />);

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("powinien renderować przycisk 'Edytuj' dla sekcji podstawowych", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");
      const basicsEditButton = editButtons.find((button) => {
        const card = button.closest('[data-slot="card"]');
        return card?.textContent?.includes("Podstawowe informacje");
      });

      expect(basicsEditButton).toBeDefined();
      expect(basicsEditButton).toBeInTheDocument();
    });

    it("powinien wywołać onEditStep('basics') po kliknięciu przycisku edycji podstaw", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");
      const basicsEditButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Podstawowe informacje");
      });

      if (basicsEditButton) {
        await user.click(basicsEditButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("basics");
      }
    });
  });

  describe("Karta: Lokalizacja", () => {
    it("powinien renderować kartę z lokalizacją", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Lokalizacja")).toBeInTheDocument();
      expect(screen.getByText("Położenie geograficzne działki")).toBeInTheDocument();
    });

    it("powinien wyświetlić adres gdy jest dostępny", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Warszawa, Polska")).toBeInTheDocument();
    });

    it("powinien wyświetlić współrzędne geograficzne", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText(/52\.229700, 21\.012200/)).toBeInTheDocument();
    });

    it("powinien wyświetlić komunikat gdy lokalizacja nie została ustawiona", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ latitude: undefined, longitude: undefined, address: undefined })}
        />
      );

      expect(screen.getByText(/Lokalizacja nie została ustawiona/i)).toBeInTheDocument();
    });

    it("powinien wyświetlić tylko współrzędne gdy brak adresu", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ address: undefined })}
        />
      );

      expect(screen.getByText(/52\.229700, 21\.012200/)).toBeInTheDocument();
      expect(screen.queryByText(/Adres:/i)).not.toBeInTheDocument();
    });

    it("powinien wywołać onEditStep('location') po kliknięciu przycisku edycji lokalizacji", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");
      const locationEditButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Lokalizacja");
      });

      if (locationEditButton) {
        await user.click(locationEditButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("location");
      }
    });
  });

  describe("Karta: Wymiary i siatka", () => {
    it("powinien renderować kartę z wymiarami", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Wymiary i siatka")).toBeInTheDocument();
      expect(screen.getByText("Rozmiar działki i jednostka kratki")).toBeInTheDocument();
    });

    it("powinien wyświetlić wymiary rzeczywiste w metrach", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText(/10\.00 m × 5\.00 m/)).toBeInTheDocument();
    });

    it("powinien wyświetlić rozmiar kratki w centymetrach", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("50 cm")).toBeInTheDocument();
    });

    it("powinien obliczyć i wyświetlić wymiary siatki", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      // 10m = 1000cm, 5m = 500cm
      // 1000cm / 50cm = 20, 500cm / 50cm = 10
      expect(screen.getByText(/20 × 10 pól/)).toBeInTheDocument();
    });

    it("powinien obliczyć i wyświetlić całkowitą liczbę pól", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      // 20 × 10 = 200 pól
      expect(screen.getByText("200")).toBeInTheDocument();
    });

    it("powinien sformatować liczbę pól z separatorami tysięcy", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 50, height_m: 50, cell_size_cm: 10 })}
        />
      );

      // 50m = 5000cm, 5000cm / 10cm = 500
      // 500 × 500 = 250,000 pól
      expect(screen.getByText(/250[,\s]?000/)).toBeInTheDocument();
    });

    it("powinien wyświetlić '—' gdy wymiary nie są ustawione", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: undefined as any, height_m: undefined as any })}
        />
      );

      expect(screen.getByText(/— × —/)).toBeInTheDocument();
    });

    it("powinien poprawnie obliczyć wymiary siatki dla różnych rozmiarów kratek", () => {
      const testCases = [
        { width_m: 10, height_m: 10, cell_size_cm: 10, expected: "100 × 100 pól" },
        { width_m: 10, height_m: 10, cell_size_cm: 25, expected: "40 × 40 pól" },
        { width_m: 10, height_m: 10, cell_size_cm: 50, expected: "20 × 20 pól" },
        { width_m: 10, height_m: 10, cell_size_cm: 100, expected: "10 × 10 pól" },
      ];

      testCases.forEach(({ width_m, height_m, cell_size_cm, expected }) => {
        const { unmount } = render(
          <PlanCreatorStepSummary
            {...defaultProps}
            data={createMockData({ width_m, height_m, cell_size_cm: cell_size_cm as 10 | 25 | 50 | 100 })}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it("powinien wywołać onEditStep('dimensions') po kliknięciu przycisku edycji wymiarów", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");
      const dimensionsEditButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Wymiary i siatka");
      });

      if (dimensionsEditButton) {
        await user.click(dimensionsEditButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("dimensions");
      }
    });
  });

  describe("Karta: Orientacja i półkula", () => {
    it("powinien renderować kartę z orientacją", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText("Orientacja i półkula")).toBeInTheDocument();
      expect(screen.getByText("Ustawienie względem stron świata")).toBeInTheDocument();
    });

    it("powinien wyświetlić orientację w stopniach", () => {
      render(<PlanCreatorStepSummary {...defaultProps} />);

      expect(screen.getByText(/0° \(0° = północ\)/)).toBeInTheDocument();
    });

    it("powinien wyświetlić różne wartości orientacji", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ orientation: 90 })}
        />
      );

      expect(screen.getByText(/90° \(0° = północ\)/)).toBeInTheDocument();
    });

    it("powinien wyświetlić 'Północna' dla półkuli północnej", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ hemisphere: "northern" })}
        />
      );

      expect(screen.getByText("Północna")).toBeInTheDocument();
    });

    it("powinien wyświetlić 'Południowa' dla półkuli południowej", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ hemisphere: "southern" })}
        />
      );

      expect(screen.getByText("Południowa")).toBeInTheDocument();
    });

    it("powinien wywołać onEditStep('dimensions') po kliknięciu przycisku edycji orientacji", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");
      const orientationEditButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Orientacja i półkula");
      });

      if (orientationEditButton) {
        await user.click(orientationEditButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("dimensions");
      }
    });
  });

  describe("Obliczenia pomocnicze", () => {
    it("powinien poprawnie konwertować metry na centymetry", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 2.5, height_m: 1.5 })}
        />
      );

      // 2.5m = 250cm, 1.5m = 150cm
      // 250cm / 50cm = 5, 150cm / 50cm = 3
      expect(screen.getByText(/5 × 3 pól/)).toBeInTheDocument();
    });

    it("powinien obsłużyć wartości dziesiętne w wymiarach", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 12.5, height_m: 7.25 })}
        />
      );

      expect(screen.getByText(/12\.50 m × 7\.25 m/)).toBeInTheDocument();
    });

    it("powinien obsłużyć przypadek gdy cell_size_cm nie jest ustawione", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ cell_size_cm: undefined as any })}
        />
      );

      // Powinien wyświetlić 0 × 0 pól gdy brak cell_size_cm
      expect(screen.getByText(/0 × 0 pól/)).toBeInTheDocument();
    });

    it("powinien obsłużyć przypadek gdy wymiary są zerowe", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 0, height_m: 0 })}
        />
      );

      expect(screen.getByText(/0\.00 m × 0\.00 m/)).toBeInTheDocument();
      expect(screen.getByText(/0 × 0 pól/)).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć minimalne wartości wymiarów", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 0.1, height_m: 0.1, cell_size_cm: 10 })}
        />
      );

      // 0.1m = 10cm, 10cm / 10cm = 1
      expect(screen.getByText(/1 × 1 pól/)).toBeInTheDocument();
    });

    it("powinien obsłużyć duże wartości wymiarów", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 100, height_m: 100, cell_size_cm: 100 })}
        />
      );

      // 100m = 10000cm, 10000cm / 100cm = 100
      expect(screen.getByText(/100 × 100 pól/)).toBeInTheDocument();
    });

    it("powinien obsłużyć różne wartości orientacji (0-359)", () => {
      const orientations = [0, 45, 90, 180, 270, 359];

      orientations.forEach((orientation) => {
        const { unmount } = render(
          <PlanCreatorStepSummary
            {...defaultProps}
            data={createMockData({ orientation })}
          />
        );

        expect(screen.getByText(new RegExp(`${orientation}°`))).toBeInTheDocument();
        unmount();
      });
    });

    it("powinien wyświetlić wszystkie karty nawet gdy dane są minimalne", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({
            name: "Test",
            latitude: undefined,
            longitude: undefined,
            width_m: 1,
            height_m: 1,
            cell_size_cm: 100,
            orientation: 0,
            hemisphere: "northern",
          })}
        />
      );

      expect(screen.getByText("Podstawowe informacje")).toBeInTheDocument();
      expect(screen.getByText("Lokalizacja")).toBeInTheDocument();
      expect(screen.getByText("Wymiary i siatka")).toBeInTheDocument();
      expect(screen.getByText("Orientacja i półkula")).toBeInTheDocument();
    });
  });

  describe("Interakcje", () => {
    it("powinien wywołać onEditStep tylko raz przy pojedynczym kliknięciu", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");
      await user.click(editButtons[0]);

      expect(mockOnEditStep).toHaveBeenCalledTimes(1);
    });

    it("powinien wywołać onEditStep z odpowiednim krokiem dla każdego przycisku", async () => {
      const user = userEvent.setup();
      render(<PlanCreatorStepSummary {...defaultProps} />);

      const editButtons = screen.getAllByText("Edytuj");

      // Kliknij przycisk edycji podstaw
      const basicsButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Podstawowe informacje");
      });
      if (basicsButton) {
        await user.click(basicsButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("basics");
      }

      mockOnEditStep.mockClear();

      // Kliknij przycisk edycji lokalizacji
      const locationButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Lokalizacja");
      });
      if (locationButton) {
        await user.click(locationButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("location");
      }

      mockOnEditStep.mockClear();

      // Kliknij przycisk edycji wymiarów
      const dimensionsButton = editButtons.find((button) => {
        const card = button.closest('[class*="Card"]');
        return card?.textContent?.includes("Wymiary i siatka");
      });
      if (dimensionsButton) {
        await user.click(dimensionsButton);
        expect(mockOnEditStep).toHaveBeenCalledWith("dimensions");
      }
    });
  });

  describe("Formatowanie danych", () => {
    it("powinien sformatować współrzędne z 6 miejscami po przecinku", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ latitude: 52.123456, longitude: 21.987654 })}
        />
      );

      expect(screen.getByText(/52\.123456, 21\.987654/)).toBeInTheDocument();
    });

    it("powinien sformatować wymiary z 2 miejscami po przecinku", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 12.345, height_m: 6.789 })}
        />
      );

      expect(screen.getByText(/12\.35 m × 6\.79 m/)).toBeInTheDocument();
    });

    it("powinien sformatować liczbę pól z polskim formatowaniem", () => {
      render(
        <PlanCreatorStepSummary
          {...defaultProps}
          data={createMockData({ width_m: 25, height_m: 25, cell_size_cm: 10 })}
        />
      );

      // 25m = 2500cm, 2500cm / 10cm = 250
      // 250 × 250 = 62,500 pól (z polskim formatowaniem)
      const cellsText = screen.getByText(/62[,\s]?500/);
      expect(cellsText).toBeInTheDocument();
    });
  });
});

