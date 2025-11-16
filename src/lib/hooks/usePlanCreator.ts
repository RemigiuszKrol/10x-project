import { useState, useEffect, useCallback, useMemo } from "react";
import type { PlanCreatorStep, PlanCreateFormData, PlanCreatorState, GridDimensions, PlanDraft } from "@/types";
import { DEFAULT_FORM_DATA, DRAFT_VERSION, STEP_CONFIGS } from "@/types";
import { PlanCreateSchema } from "@/lib/validation/plans";
import type { PlanDto, PlanCreateCommand, ApiItemResponse, ApiErrorResponse } from "@/types";
import { z } from "zod";

const DRAFT_STORAGE_KEY = "plantsplaner_plan_draft";

/**
 * Zwracane wartości hooka usePlanCreator
 */
export interface UsePlanCreatorReturn {
  // Stan
  state: PlanCreatorState;
  gridDimensions: GridDimensions;

  // Akcje nawigacji
  goToStep: (step: PlanCreatorStep) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  // Akcje danych
  updateFormData: (data: Partial<PlanCreateFormData>) => void;
  validateCurrentStep: () => boolean;
  validateAllSteps: () => boolean;

  // Akcje zapisu
  saveDraft: () => void;
  loadDraft: () => PlanDraft | null;
  clearDraft: () => void;
  hasDraft: boolean;

  // Akcje API
  submitPlan: () => Promise<PlanDto | null>;
  clearApiError: () => void;
}

/**
 * Hook zarządzający stanem kreatora nowego planu
 *
 * Obsługuje:
 * - Nawigację między krokami
 * - Walidację formularza
 * - Zapis i wczytywanie szkicu z localStorage
 * - Komunikację z API
 */
export function usePlanCreator(): UsePlanCreatorReturn {
  // Stan kreatora
  const [state, setState] = useState<PlanCreatorState>({
    currentStep: "basics",
    completedSteps: new Set<PlanCreatorStep>(),
    formData: { ...DEFAULT_FORM_DATA },
    errors: {},
    isSubmitting: false,
    apiError: null,
  });

  // Sprawdź czy istnieje szkic przy montowaniu
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const checkDraft = () => {
      try {
        const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
        setHasDraft(stored !== null);
      } catch {
        setHasDraft(false);
      }
    };
    checkDraft();
  }, []);

  /**
   * Oblicza wymiary siatki na podstawie danych formularza
   */
  const gridDimensions = useMemo((): GridDimensions => {
    const { width_cm, height_cm, cell_size_cm } = state.formData;

    if (!width_cm || !height_cm || !cell_size_cm) {
      return {
        gridWidth: 0,
        gridHeight: 0,
        isValid: false,
        errorMessage: "Wszystkie wymiary muszą być wypełnione",
      };
    }

    // Sprawdź podzielność
    if (width_cm % cell_size_cm !== 0) {
      return {
        gridWidth: 0,
        gridHeight: 0,
        isValid: false,
        errorMessage: "Szerokość musi być podzielna przez rozmiar kratki",
      };
    }

    if (height_cm % cell_size_cm !== 0) {
      return {
        gridWidth: 0,
        gridHeight: 0,
        isValid: false,
        errorMessage: "Wysokość musi być podzielna przez rozmiar kratki",
      };
    }

    const gridWidth = width_cm / cell_size_cm;
    const gridHeight = height_cm / cell_size_cm;

    // Sprawdź limit 200 × 200
    if (gridWidth < 1 || gridWidth > 200 || gridHeight < 1 || gridHeight > 200) {
      return {
        gridWidth,
        gridHeight,
        isValid: false,
        errorMessage:
          "Siatka musi być w zakresie 1-200 pól w każdym wymiarze (aktualnie: " + gridWidth + " × " + gridHeight + ")",
      };
    }

    return {
      gridWidth,
      gridHeight,
      isValid: true,
    };
  }, [state.formData]);

  /**
   * Waliduje dane dla bieżącego kroku
   */
  const validateCurrentStep = useCallback((): boolean => {
    const { formData } = state;
    const { currentStep } = state;
    const newErrors: Partial<Record<keyof PlanCreateFormData, string>> = {};

    switch (currentStep) {
      case "basics":
        if (!formData.name || formData.name.trim().length === 0) {
          newErrors.name = "Nazwa planu jest wymagana";
        } else if (formData.name.trim().length > 100) {
          newErrors.name = "Nazwa planu nie może być dłuższa niż 100 znaków";
        }
        break;

      case "location":
        // Lokalizacja jest opcjonalna, ale jeśli podana to musi być poprawna
        if (formData.latitude !== undefined) {
          if (formData.latitude < -90 || formData.latitude > 90) {
            newErrors.latitude = "Szerokość geograficzna musi być w zakresie -90..90";
          }
        }
        if (formData.longitude !== undefined) {
          if (formData.longitude < -180 || formData.longitude > 180) {
            newErrors.longitude = "Długość geograficzna musi być w zakresie -180..180";
          }
        }
        break;

      case "dimensions":
        if (!formData.width_cm || formData.width_cm <= 0) {
          newErrors.width_cm = "Szerokość musi być liczbą dodatnią";
        }
        if (!formData.height_cm || formData.height_cm <= 0) {
          newErrors.height_cm = "Wysokość musi być liczbą dodatnią";
        }
        if (!formData.cell_size_cm) {
          newErrors.cell_size_cm = "Rozmiar kratki jest wymagany";
        }
        if (formData.orientation === undefined || formData.orientation < 0 || formData.orientation > 359) {
          newErrors.orientation = "Orientacja musi być w zakresie 0-359";
        }

        // Sprawdź wymiary siatki
        if (!gridDimensions.isValid && gridDimensions.errorMessage) {
          newErrors.width_cm = gridDimensions.errorMessage;
        }
        break;

      case "summary":
        // W podsumowaniu wszystkie kroki muszą być poprawne
        // Walidacja globalna - wszystkie pola muszą być poprawne
        break;
    }

    setState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [state, gridDimensions.isValid, gridDimensions.errorMessage]);

  /**
   * Waliduje wszystkie pola formularza przed wysyłką
   */
  const validateAllSteps = useCallback((): boolean => {
    try {
      PlanCreateSchema.parse({
        name: state.formData.name,
        width_cm: state.formData.width_cm,
        height_cm: state.formData.height_cm,
        cell_size_cm: state.formData.cell_size_cm,
        orientation: state.formData.orientation,
        latitude: state.formData.latitude,
        longitude: state.formData.longitude,
        hemisphere: state.formData.hemisphere,
      });

      setState((prev) => ({ ...prev, errors: {} }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof PlanCreateFormData, string>> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof PlanCreateFormData;
          newErrors[field] = err.message;
        });
        setState((prev) => ({ ...prev, errors: newErrors }));
      }
      return false;
    }
  }, [state.formData]);

  /**
   * Przechodzi do określonego kroku (tylko jeśli był ukończony)
   */
  const goToStep = useCallback(
    (step: PlanCreatorStep) => {
      if (state.completedSteps.has(step) || step === state.currentStep) {
        setState((prev) => ({ ...prev, currentStep: step }));
      }
    },
    [state.completedSteps, state.currentStep]
  );

  /**
   * Przechodzi do poprzedniego kroku
   */
  const goBack = useCallback(() => {
    const currentIndex = STEP_CONFIGS.findIndex((s) => s.key === state.currentStep);
    if (currentIndex > 0) {
      const prevStep = STEP_CONFIGS[currentIndex - 1].key;
      setState((prev) => ({ ...prev, currentStep: prevStep }));
    }
  }, [state.currentStep]);

  /**
   * Przechodzi do następnego kroku (z walidacją)
   */
  const goForward = useCallback(() => {
    if (!validateCurrentStep()) {
      return;
    }

    const currentIndex = STEP_CONFIGS.findIndex((s) => s.key === state.currentStep);
    if (currentIndex < STEP_CONFIGS.length - 1) {
      const nextStep = STEP_CONFIGS[currentIndex + 1].key;
      setState((prev) => ({
        ...prev,
        currentStep: nextStep,
        completedSteps: new Set([...prev.completedSteps, prev.currentStep]),
      }));
    }
  }, [state.currentStep, validateCurrentStep]);

  /**
   * Czy można wrócić do poprzedniego kroku
   */
  const canGoBack = useMemo(() => {
    const currentIndex = STEP_CONFIGS.findIndex((s) => s.key === state.currentStep);
    return currentIndex > 0;
  }, [state.currentStep]);

  /**
   * Czy można przejść do następnego kroku
   */
  const canGoForward = useMemo(() => {
    const currentIndex = STEP_CONFIGS.findIndex((s) => s.key === state.currentStep);
    return currentIndex < STEP_CONFIGS.length - 1;
  }, [state.currentStep]);

  /**
   * Aktualizuje dane formularza
   */
  const updateFormData = useCallback((data: Partial<PlanCreateFormData>) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  /**
   * Zapisuje szkic do localStorage
   */
  const saveDraft = useCallback(() => {
    try {
      const draft: PlanDraft = {
        formData: state.formData,
        savedAt: new Date().toISOString(),
        version: DRAFT_VERSION,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setHasDraft(true);
    } catch {
      // Silently fail - user will be notified through UI
    }
  }, [state.formData]);

  /**
   * Wczytuje szkic z localStorage
   */
  const loadDraft = useCallback((): PlanDraft | null => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;

      const draft: PlanDraft = JSON.parse(stored);

      // Sprawdź wersję schematu
      if (draft.version !== DRAFT_VERSION) {
        return null;
      }

      return draft;
    } catch {
      return null;
    }
  }, []);

  /**
   * Czyści szkic z localStorage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
    } catch {
      // Silently fail
    }
  }, []);

  /**
   * Wysyła plan do API
   */
  const submitPlan = useCallback(async (): Promise<PlanDto | null> => {
    // Walidacja wszystkich pól
    if (!validateAllSteps()) {
      setState((prev) => ({
        ...prev,
        apiError: "Popraw błędy przed utworzeniem planu",
      }));
      return null;
    }

    // Guards - po validateAllSteps() te wartości muszą być zdefiniowane
    const { name, width_cm, height_cm, cell_size_cm, orientation, latitude, longitude, hemisphere } = state.formData;

    if (!name || !width_cm || !height_cm || !cell_size_cm || orientation === undefined) {
      setState((prev) => ({
        ...prev,
        apiError: "Brak wymaganych danych",
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, apiError: null }));

    try {
      // Mapowanie FormData → Command (DTO dla API)
      const command: PlanCreateCommand = {
        name: name.trim(),
        latitude: latitude,
        longitude: longitude,
        width_cm: width_cm,
        height_cm: height_cm,
        cell_size_cm: cell_size_cm,
        orientation: orientation,
        hemisphere: hemisphere,
      };

      const response = await fetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();

        // Mapowanie field_errors na state.errors
        if (errorData.error.details?.field_errors) {
          const fieldErrors = errorData.error.details.field_errors;
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            errors: fieldErrors,
            apiError: errorData.error.message,
          }));

          // Znajdź pierwszy krok z błędem i wróć do niego
          const firstErrorField = Object.keys(errorData.error.details.field_errors)[0] as keyof PlanCreateFormData;
          let stepWithError: PlanCreatorStep = "basics";
          if (["name"].includes(firstErrorField)) stepWithError = "basics";
          else if (["latitude", "longitude"].includes(firstErrorField)) stepWithError = "location";
          else if (["width_cm", "height_cm", "cell_size_cm", "orientation", "hemisphere"].includes(firstErrorField))
            stepWithError = "dimensions";

          setState((prev) => ({ ...prev, currentStep: stepWithError }));
        } else {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: errorData.error.message,
          }));
        }

        return null;
      }

      const result: ApiItemResponse<PlanDto> = await response.json();

      // Sukces - czyść szkic
      clearDraft();

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
      }));

      return result.data;
    } catch {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        apiError: "Nie udało się połączyć z serwerem. Spróbuj ponownie.",
      }));
      return null;
    }
  }, [state.formData, validateAllSteps, clearDraft]);

  /**
   * Czyści błąd API
   */
  const clearApiError = useCallback(() => {
    setState((prev) => ({ ...prev, apiError: null }));
  }, []);

  return {
    state,
    gridDimensions,
    goToStep,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    updateFormData,
    validateCurrentStep,
    validateAllSteps,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    submitPlan,
    clearApiError,
  };
}
