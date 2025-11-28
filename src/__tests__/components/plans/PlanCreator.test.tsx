import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanCreator } from "@/components/plans/PlanCreator";
import type { UsePlanCreatorReturn } from "@/lib/hooks/usePlanCreator";
import type { PlanCreatorState, PlanDraft, PlanDto } from "@/types";
import type { PlanCreatorStepBasicsProps } from "@/components/plans/steps/PlanCreatorStepBasics";
import type { PlanCreatorStepLocationProps } from "@/components/plans/steps/PlanCreatorStepLocation";
import type { PlanCreatorStepDimensionsProps } from "@/components/plans/steps/PlanCreatorStepDimensions";
import type { PlanCreatorStepSummaryProps } from "@/components/plans/steps/PlanCreatorStepSummary";
import type { PlanCreatorStepperProps } from "@/components/plans/PlanCreatorStepper";
import type { PlanCreatorActionsProps } from "@/components/plans/PlanCreatorActions";

// Mock hooka usePlanCreator
const mockGoToStep = vi.fn();
const mockGoBack = vi.fn();
const mockGoForward = vi.fn();
const mockUpdateFormData = vi.fn();
const mockSaveDraft = vi.fn();
const mockLoadDraft = vi.fn();
const mockClearDraft = vi.fn();
const mockSubmitPlan = vi.fn();
const mockClearApiError = vi.fn();

const createMockCreator = (overrides?: Partial<UsePlanCreatorReturn>): UsePlanCreatorReturn => {
  const defaultState: PlanCreatorState = {
    currentStep: "basics",
    completedSteps: new Set(),
    formData: {},
    errors: {},
    isSubmitting: false,
    apiError: null,
  };

  return {
    state: defaultState,
    gridDimensions: {
      gridWidth: 0,
      gridHeight: 0,
      isValid: false,
    },
    goToStep: mockGoToStep,
    goBack: mockGoBack,
    goForward: mockGoForward,
    canGoBack: false,
    canGoForward: true,
    updateFormData: mockUpdateFormData,
    validateCurrentStep: vi.fn(() => true),
    validateAllSteps: vi.fn(() => true),
    saveDraft: mockSaveDraft,
    loadDraft: mockLoadDraft,
    clearDraft: mockClearDraft,
    hasDraft: false,
    submitPlan: mockSubmitPlan,
    clearApiError: mockClearApiError,
    ...overrides,
  };
};

const mockUsePlanCreator = vi.fn();
vi.mock("@/lib/hooks/usePlanCreator", () => ({
  usePlanCreator: () => mockUsePlanCreator(),
}));

// Mock komponentów kroków
vi.mock("@/components/plans/steps/PlanCreatorStepBasics", () => ({
  PlanCreatorStepBasics: ({ data, onChange, errors }: PlanCreatorStepBasicsProps) => (
    <div data-testid="step-basics">
      <input
        data-testid="basics-name-input"
        value={data.name || ""}
        onChange={(e) => onChange({ name: e.target.value })}
        aria-label="Nazwa planu"
      />
      {errors.name && <div data-testid="basics-name-error">{errors.name}</div>}
    </div>
  ),
}));

vi.mock("@/components/plans/steps/PlanCreatorStepLocation", () => ({
  PlanCreatorStepLocation: ({ data, onChange, errors }: PlanCreatorStepLocationProps) => (
    <div data-testid="step-location">
      <input
        data-testid="location-latitude-input"
        type="number"
        value={data.latitude || ""}
        onChange={(e) => onChange({ latitude: parseFloat(e.target.value) || undefined })}
        aria-label="Szerokość geograficzna"
      />
      {errors.latitude && <div data-testid="location-latitude-error">{errors.latitude}</div>}
    </div>
  ),
}));

vi.mock("@/components/plans/steps/PlanCreatorStepDimensions", () => ({
  PlanCreatorStepDimensions: ({ data, onChange, errors }: PlanCreatorStepDimensionsProps) => (
    <div data-testid="step-dimensions">
      <input
        data-testid="dimensions-width-input"
        type="number"
        value={data.width_m ?? 0}
        onChange={(e) =>
          onChange({
            ...data,
            width_m: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value),
          })
        }
        aria-label="Szerokość"
      />
      {errors.width_m && <div data-testid="dimensions-width-error">{errors.width_m}</div>}
    </div>
  ),
}));

vi.mock("@/components/plans/steps/PlanCreatorStepSummary", () => ({
  PlanCreatorStepSummary: ({ data, onEditStep }: PlanCreatorStepSummaryProps) => (
    <div data-testid="step-summary">
      <div data-testid="summary-name">{data.name}</div>
      <button data-testid="summary-edit-basics" onClick={() => onEditStep("basics")}>
        Edytuj podstawy
      </button>
    </div>
  ),
}));

// Mock komponentów pomocniczych
vi.mock("@/components/plans/PlanCreatorStepper", () => ({
  PlanCreatorStepper: ({ currentStep, onStepClick }: PlanCreatorStepperProps) => (
    <nav data-testid="stepper">
      <button data-testid="stepper-basics" onClick={() => onStepClick("basics")}>
        Basics
      </button>
      <button data-testid="stepper-location" onClick={() => onStepClick("location")}>
        Location
      </button>
      <button data-testid="stepper-dimensions" onClick={() => onStepClick("dimensions")}>
        Dimensions
      </button>
      <button data-testid="stepper-summary" onClick={() => onStepClick("summary")}>
        Summary
      </button>
      <div data-testid="stepper-current">{currentStep}</div>
    </nav>
  ),
}));

vi.mock("@/components/plans/PlanCreatorActions", () => ({
  PlanCreatorActions: ({ onBack, onForward, onSaveDraft, onSubmit, isSubmitting }: PlanCreatorActionsProps) => (
    <div data-testid="actions">
      <button data-testid="action-back" onClick={onBack} disabled={isSubmitting}>
        Cofnij
      </button>
      <button data-testid="action-forward" onClick={onForward} disabled={isSubmitting}>
        Kontynuuj
      </button>
      <button data-testid="action-save-draft" onClick={onSaveDraft} disabled={isSubmitting}>
        Zapisz szkic
      </button>
      <button data-testid="action-submit" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Wysyłanie..." : "Utwórz plan"}
      </button>
    </div>
  ),
}));

// Mock window.location
const mockLocationAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockLocationAssign,
    href: "",
  },
  writable: true,
});

describe("PlanCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationAssign.mockClear();
    (window.location as Location).href = "";
    mockUsePlanCreator.mockReturnValue(createMockCreator());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować nagłówek kreatora", () => {
      mockUsePlanCreator.mockReturnValue(createMockCreator());

      render(<PlanCreator />);

      expect(screen.getByText(/kreator nowego planu/i)).toBeInTheDocument();
      expect(screen.getByText(/przygotuj plan swojej działki w kilku prostych krokach/i)).toBeInTheDocument();
    });

    it("powinien renderować stepper z aktualnym krokiem", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "location",
            completedSteps: new Set(["basics"]),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("stepper")).toBeInTheDocument();
      expect(screen.getByTestId("stepper-current")).toHaveTextContent("location");
    });

    it("powinien renderować komponent akcji", () => {
      mockUsePlanCreator.mockReturnValue(createMockCreator());

      render(<PlanCreator />);

      expect(screen.getByTestId("actions")).toBeInTheDocument();
    });
  });

  describe("Renderowanie kroków", () => {
    it("powinien renderować krok basics gdy currentStep to 'basics'", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: { name: "Test Plan" },
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("step-basics")).toBeInTheDocument();
      expect(screen.getByTestId("basics-name-input")).toHaveValue("Test Plan");
    });

    it("powinien renderować krok location gdy currentStep to 'location'", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "location",
            completedSteps: new Set(["basics"]),
            formData: { latitude: 52.23 },
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("step-location")).toBeInTheDocument();
      expect(screen.getByTestId("location-latitude-input")).toHaveValue(52.23);
    });

    it("powinien renderować krok dimensions gdy currentStep to 'dimensions'", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "dimensions",
            completedSteps: new Set(["basics", "location"]),
            formData: { width_m: 10 },
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
          gridDimensions: {
            gridWidth: 20,
            gridHeight: 20,
            isValid: true,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("step-dimensions")).toBeInTheDocument();
      expect(screen.getByTestId("dimensions-width-input")).toHaveValue(10);
    });

    it("powinien renderować krok summary gdy currentStep to 'summary'", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: { name: "Test Plan" },
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("step-summary")).toBeInTheDocument();
      expect(screen.getByTestId("summary-name")).toHaveTextContent("Test Plan");
    });

    it("powinien wyświetlać błędy walidacji dla aktywnego kroku", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: {},
            errors: { name: "Nazwa jest wymagana" },
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("basics-name-error")).toHaveTextContent("Nazwa jest wymagana");
    });
  });

  describe("Obsługa błędów API", () => {
    it("powinien wyświetlać alert z błędem API gdy apiError jest ustawiony", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: "Nie udało się utworzyć planu",
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByText(/wystąpił błąd/i)).toBeInTheDocument();
      expect(screen.getByText(/nie udało się utworzyć planu/i)).toBeInTheDocument();
    });

    it("nie powinien wyświetlać alertu gdy apiError jest null", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.queryByText(/wystąpił błąd/i)).not.toBeInTheDocument();
    });
  });

  describe("Dialog szkicu", () => {
    it("powinien wyświetlać dialog gdy wykryto szkic przy montowaniu", async () => {
      const draft: PlanDraft = {
        formData: { name: "Draft Plan" },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => draft,
        })
      );

      render(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/znaleziono zapisany szkic/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/wykryliśmy zapisany szkic planu/i)).toBeInTheDocument();
    });

    it("powinien wyświetlać datę zapisania szkicu w dialogu", async () => {
      const savedDate = new Date("2024-01-15T10:30:00Z");
      const draft: PlanDraft = {
        formData: { name: "Draft Plan" },
        savedAt: savedDate.toISOString(),
        version: 1,
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => draft,
        })
      );

      render(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/znaleziono zapisany szkic/i)).toBeInTheDocument();
      });

      // Sprawdź czy data jest wyświetlona (format zależny od locale)
      const dialogText = screen.getByText(/wykryliśmy zapisany szkic planu/i).textContent;
      expect(dialogText).toContain("2024");
    });

    it("powinien wzywać updateFormData i goToStep gdy użytkownik wybierze 'Kontynuuj szkic'", async () => {
      const user = userEvent.setup();
      const draft: PlanDraft = {
        formData: { name: "Draft Plan", width_m: 10, height_m: 10 },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => draft,
        })
      );

      render(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/znaleziono zapisany szkic/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole("button", { name: /kontynuuj szkic/i });
      await user.click(continueButton);

      expect(mockUpdateFormData).toHaveBeenCalledWith(draft.formData);
      expect(mockGoToStep).toHaveBeenCalledWith("summary");
    });

    it("powinien przejść do kroku 'dimensions' gdy szkic ma tylko lokalizację", async () => {
      const user = userEvent.setup();
      const draft: PlanDraft = {
        formData: { name: "Draft Plan", latitude: 52.23, longitude: 21.01 },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => draft,
        })
      );

      render(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/znaleziono zapisany szkic/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole("button", { name: /kontynuuj szkic/i });
      await user.click(continueButton);

      expect(mockGoToStep).toHaveBeenCalledWith("dimensions");
    });

    it("powinien przejść do kroku 'location' gdy szkic ma tylko nazwę", async () => {
      const user = userEvent.setup();
      const draft: PlanDraft = {
        formData: { name: "Draft Plan" },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => draft,
        })
      );

      render(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/znaleziono zapisany szkic/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole("button", { name: /kontynuuj szkic/i });
      await user.click(continueButton);

      expect(mockGoToStep).toHaveBeenCalledWith("location");
    });

    it("powinien wywołać clearDraft i zamknąć dialog gdy użytkownik wybierze 'Rozpocznij od nowa'", async () => {
      const user = userEvent.setup();
      const draft: PlanDraft = {
        formData: { name: "Draft Plan" },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => draft,
        })
      );

      render(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/znaleziono zapisany szkic/i)).toBeInTheDocument();
      });

      const startFreshButton = screen.getByRole("button", { name: /rozpocznij od nowa/i });
      await user.click(startFreshButton);

      expect(mockClearDraft).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByText(/znaleziono zapisany szkic/i)).not.toBeInTheDocument();
      });
    });

    it("nie powinien wyświetlać dialogu gdy nie ma szkicu", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          loadDraft: () => null,
        })
      );

      render(<PlanCreator />);

      expect(screen.queryByText(/znaleziono zapisany szkic/i)).not.toBeInTheDocument();
    });

    it("powinien sprawdzać szkic tylko raz przy montowaniu", async () => {
      const draft: PlanDraft = {
        formData: { name: "Draft Plan" },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      // Ustawiamy mockLoadDraft, aby zwracał draft
      mockLoadDraft.mockReturnValue(draft);

      mockUsePlanCreator.mockReturnValue(createMockCreator());

      const { rerender } = render(<PlanCreator />);

      // Czekamy na wykonanie useEffect
      await waitFor(() => {
        expect(mockLoadDraft).toHaveBeenCalled();
      });

      // Re-render nie powinien wywołać loadDraft ponownie
      rerender(<PlanCreator />);

      // loadDraft powinien być wywołany tylko raz przez useEffect
      expect(mockLoadDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe("Obsługa wysyłki planu", () => {
    it("powinien przekierować do edytora planu po udanym utworzeniu", async () => {
      const user = userEvent.setup();
      const createdPlan: PlanDto = {
        id: "plan-123",
        name: "Test Plan",
        user_id: "user-123",
        latitude: 52.23,
        longitude: 21.01,
        width_cm: 1000,
        height_cm: 1000,
        cell_size_cm: 50,
        orientation: 0,
        hemisphere: "northern" as const,
        grid_width: 20,
        grid_height: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
          submitPlan: mockSubmitPlan.mockResolvedValue(createdPlan),
        })
      );

      render(<PlanCreator />);

      const submitButton = screen.getByTestId("action-submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitPlan).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(window.location.href).toBe("/plans/plan-123");
      });
    });

    it("nie powinien przekierować gdy submitPlan zwraca null", async () => {
      const user = userEvent.setup();

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
          submitPlan: mockSubmitPlan.mockResolvedValue(null),
        })
      );

      render(<PlanCreator />);

      const submitButton = screen.getByTestId("action-submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitPlan).toHaveBeenCalledTimes(1);
      });

      // Nie powinno być przekierowania
      expect(window.location.href).toBe("");
    });

    it("powinien wyświetlać błąd API gdy submitPlan zwraca null", async () => {
      const user = userEvent.setup();

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
          submitPlan: mockSubmitPlan.mockResolvedValue(null),
        })
      );

      const { rerender } = render(<PlanCreator />);

      const submitButton = screen.getByTestId("action-submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitPlan).toHaveBeenCalledTimes(1);
      });

      // Symuluj aktualizację stanu z błędem API
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: "Nie udało się utworzyć planu",
          },
        })
      );

      rerender(<PlanCreator />);

      await waitFor(() => {
        expect(screen.getByText(/wystąpił błąd/i)).toBeInTheDocument();
      });
    });
  });

  describe("Nawigacja między krokami", () => {
    it("powinien przekazywać funkcje nawigacji do komponentów", async () => {
      const user = userEvent.setup();

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      // Test nawigacji przez stepper
      const stepperLocationButton = screen.getByTestId("stepper-location");
      await user.click(stepperLocationButton);

      expect(mockGoToStep).toHaveBeenCalledWith("location");

      // Test nawigacji przez akcje
      const backButton = screen.getByTestId("action-back");
      const forwardButton = screen.getByTestId("action-forward");

      await user.click(forwardButton);
      expect(mockGoForward).toHaveBeenCalledTimes(1);

      await user.click(backButton);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("powinien przekazywać funkcję zapisu szkicu do komponentu akcji", async () => {
      const user = userEvent.setup();

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: {},
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      const saveDraftButton = screen.getByTestId("action-save-draft");
      await user.click(saveDraftButton);

      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe("Stany ładowania", () => {
    it("powinien wyświetlać stan 'Wysyłanie...' gdy isSubmitting jest true", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: {},
            errors: {},
            isSubmitting: true,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      const submitButton = screen.getByTestId("action-submit");
      expect(submitButton).toHaveTextContent("Wysyłanie...");
      expect(submitButton).toBeDisabled();
    });

    it("powinien wyłączyć przyciski akcji gdy isSubmitting jest true", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: {},
            errors: {},
            isSubmitting: true,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("action-back")).toBeDisabled();
      expect(screen.getByTestId("action-forward")).toBeDisabled();
      expect(screen.getByTestId("action-save-draft")).toBeDisabled();
      expect(screen.getByTestId("action-submit")).toBeDisabled();
    });
  });

  describe("Przekazywanie danych do komponentów kroków", () => {
    it("powinien przekazywać poprawne dane do PlanCreatorStepBasics", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: { name: "My Plan" },
            errors: { name: "Nazwa jest wymagana" },
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      const nameInput = screen.getByTestId("basics-name-input");
      expect(nameInput).toHaveValue("My Plan");
      expect(screen.getByTestId("basics-name-error")).toHaveTextContent("Nazwa jest wymagana");
    });

    it("powinien przekazywać poprawne dane do PlanCreatorStepLocation", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "location",
            completedSteps: new Set(["basics"]),
            formData: { latitude: 52.23, longitude: 21.01, address: "Warszawa" },
            errors: { latitude: "Szerokość geograficzna jest wymagana" },
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      const latitudeInput = screen.getByTestId("location-latitude-input");
      expect(latitudeInput).toHaveValue(52.23);
      expect(screen.getByTestId("location-latitude-error")).toHaveTextContent("Szerokość geograficzna jest wymagana");
    });

    it("powinien przekazywać poprawne dane do PlanCreatorStepDimensions", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "dimensions",
            completedSteps: new Set(["basics", "location"]),
            formData: {
              width_m: 15,
              height_m: 20,
              cell_size_cm: 50,
              orientation: 90,
              hemisphere: "northern",
            },
            errors: { width_m: "Szerokość jest wymagana" },
            isSubmitting: false,
            apiError: null,
          },
          gridDimensions: {
            gridWidth: 30,
            gridHeight: 40,
            isValid: true,
          },
        })
      );

      render(<PlanCreator />);

      const widthInput = screen.getByTestId("dimensions-width-input");
      expect(widthInput).toHaveValue(15);
      expect(screen.getByTestId("dimensions-width-error")).toHaveTextContent("Szerokość jest wymagana");
    });

    it("powinien przekazywać poprawne dane do PlanCreatorStepSummary", () => {
      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "summary",
            completedSteps: new Set(["basics", "location", "dimensions"]),
            formData: {
              name: "Final Plan",
              latitude: 52.23,
              longitude: 21.01,
              address: "Warszawa",
              width_m: 10,
              height_m: 10,
              cell_size_cm: 50,
              orientation: 0,
              hemisphere: "northern",
            },
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      expect(screen.getByTestId("summary-name")).toHaveTextContent("Final Plan");
    });
  });

  describe("Obsługa zmian danych w krokach", () => {
    it("powinien wywołać updateFormData gdy użytkownik zmienia dane w kroku basics", async () => {
      const user = userEvent.setup();

      mockUsePlanCreator.mockReturnValue(
        createMockCreator({
          state: {
            currentStep: "basics",
            completedSteps: new Set(),
            formData: { name: "" },
            errors: {},
            isSubmitting: false,
            apiError: null,
          },
        })
      );

      render(<PlanCreator />);

      const nameInput = screen.getByTestId("basics-name-input");
      await user.type(nameInput, "New Plan Name");

      // updateFormData powinien być wywoływany przy każdej zmianie
      expect(mockUpdateFormData).toHaveBeenCalled();
    });
  });
});
