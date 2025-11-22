/**
 * Custom Hook: useAddPlantFlow
 *
 * Centralny hook zarządzający przepływem dodawania rośliny:
 * - Wyszukiwanie AI
 * - Wybór kandydata
 * - Ocena dopasowania
 * - Zapis rośliny
 * - Obsługa błędów i retry
 */

import { useState, useCallback } from "react";
import { useAddPlant } from "@/lib/hooks/mutations/usePlantMutations";
import { useAIService } from "@/lib/hooks/useAIService";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import type {
  AddPlantDialogState,
  PlantSearchCandidateDto,
  PlantFitCommand,
  CellPosition,
  AnalyticsEventCreateCommand,
} from "@/types";

/**
 * Parametry hooka
 */
export interface UseAddPlantFlowParams {
  planId: string;
  cell: CellPosition;
  onSuccess: () => void;
}

/**
 * Actions interface
 */
export interface AddPlantFlowActions {
  // Wyszukiwanie
  searchPlants: (query: string) => Promise<void>;
  selectCandidate: (candidate: PlantSearchCandidateDto) => Promise<void>;
  retrySearch: () => Promise<void>;

  // Ocena dopasowania
  checkFit: (plantName: string) => Promise<void>;
  retryFit: () => Promise<void>;
  skipFit: () => void;

  // Ręczne dodanie
  setManualName: (name: string) => void;
  switchToManualTab: () => void;
  switchToSearchTab: () => void;

  // Finalizacja
  confirmAdd: () => Promise<void>;
  cancel: () => void;

  // Obsługa błędów
  dismissError: () => void;
}

/**
 * Return type
 */
export interface UseAddPlantFlowReturn {
  state: AddPlantDialogState;
  actions: AddPlantFlowActions;
}

/**
 * Początkowy stan dialogu
 */
const initialState: AddPlantDialogState = {
  step: "search",
  activeTab: "search",
  searchQuery: "",
  searchResults: null,
  isSearching: false,
  selectedCandidate: null,
  fitResult: null,
  isFitting: false,
  manualName: "",
  isSubmitting: false,
  error: null,
};

/**
 * Hook zarządzający przepływem dodawania rośliny
 *
 * @param params - Parametry: planId, cell, onSuccess callback
 * @returns Stan i actions
 *
 * @example
 * ```tsx
 * const { state, actions } = useAddPlantFlow({
 *   planId: 'uuid',
 *   cell: { x: 3, y: 7 },
 *   onSuccess: () => toast.success('Dodano roślinę')
 * });
 *
 * // Wyszukiwanie
 * await actions.searchPlants('tomato');
 *
 * // Wybór kandydata (automatycznie sprawdza fit)
 * await actions.selectCandidate(state.searchResults[0]);
 *
 * // Potwierdzenie
 * await actions.confirmAdd();
 * ```
 */
export function useAddPlantFlow({ planId, cell, onSuccess }: UseAddPlantFlowParams): UseAddPlantFlowReturn {
  const [state, setState] = useState<AddPlantDialogState>(initialState);

  // Mutations
  const addPlantMutation = useAddPlant();
  const { sendEvent } = useAnalytics();

  // AI service
  const aiService = useAIService({
    onSearchError: (error) => {
      setState((prev) => ({
        ...prev,
        isSearching: false,
        error,
      }));
    },
    onFitError: (error) => {
      setState((prev) => ({
        ...prev,
        isFitting: false,
        error,
      }));
    },
  });

  /**
   * Wyszukiwanie roślin przez AI
   */
  const searchPlants = useCallback(
    async (query: string) => {
      setState((prev) => ({
        ...prev,
        searchQuery: query,
        isSearching: true,
        searchResults: null,
        error: null,
      }));

      try {
        const results = await aiService.searchPlants(query);

        setState((prev) => ({
          ...prev,
          isSearching: false,
          searchResults: results.candidates,
          step: "search",
        }));
      } catch {
        // Error już obsłużony przez onSearchError callback
      }
    },
    [aiService]
  );

  /**
   * Wybór kandydata i automatyczne sprawdzenie dopasowania
   */
  const selectCandidate = useCallback(
    async (candidate: PlantSearchCandidateDto) => {
      setState((prev) => ({
        ...prev,
        selectedCandidate: candidate,
        step: "candidate_selected",
        isFitting: true,
        error: null,
      }));

      // Automatyczne sprawdzenie dopasowania
      try {
        const fitCommand: PlantFitCommand = {
          plan_id: planId,
          x: cell.x,
          y: cell.y,
          plant_name: candidate.name,
        };

        const fitResult = await aiService.checkPlantFit(fitCommand);

        setState((prev) => ({
          ...prev,
          isFitting: false,
          fitResult,
          step: "fit_ready",
        }));
      } catch {
        // Error już obsłużony przez onFitError callback
        setState((prev) => ({
          ...prev,
          step: "fit_loading",
        }));
      }
    },
    [planId, cell, aiService]
  );

  /**
   * Ponowienie wyszukiwania (z tym samym query)
   */
  const retrySearch = useCallback(async () => {
    if (state.searchQuery) {
      await searchPlants(state.searchQuery);
    }
  }, [state.searchQuery, searchPlants]);

  /**
   * Sprawdzenie dopasowania (ponowienie lub po wyborze manual)
   */
  const checkFit = useCallback(
    async (plantName: string) => {
      setState((prev) => ({
        ...prev,
        isFitting: true,
        error: null,
      }));

      try {
        const fitCommand: PlantFitCommand = {
          plan_id: planId,
          x: cell.x,
          y: cell.y,
          plant_name: plantName,
        };

        const fitResult = await aiService.checkPlantFit(fitCommand);

        setState((prev) => ({
          ...prev,
          isFitting: false,
          fitResult,
          step: "fit_ready",
        }));
      } catch {
        // Error już obsłużony przez onFitError callback
      }
    },
    [planId, cell, aiService]
  );

  /**
   * Ponowienie sprawdzenia dopasowania
   */
  const retryFit = useCallback(async () => {
    const plantName = state.selectedCandidate?.name || state.manualName;
    if (plantName) {
      await checkFit(plantName);
    }
  }, [state.selectedCandidate, state.manualName, checkFit]);

  /**
   * Pominięcie sprawdzenia dopasowania (przy timeout)
   */
  const skipFit = useCallback(() => {
    setState((prev) => ({
      ...prev,
      fitResult: null,
      isFitting: false,
      step: "fit_ready",
      error: null,
    }));
  }, []);

  /**
   * Ustawienie ręcznej nazwy
   */
  const setManualName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      manualName: name,
      step: "manual",
    }));
  }, []);

  /**
   * Przełączenie na zakładkę ręczną
   */
  const switchToManualTab = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTab: "manual",
      step: "manual",
      error: null,
    }));
  }, []);

  /**
   * Przełączenie na zakładkę wyszukiwania
   */
  const switchToSearchTab = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTab: "search",
      step: "search",
      error: null,
    }));
  }, []);

  /**
   * Potwierdzenie i zapis rośliny
   */
  const confirmAdd = useCallback(async () => {
    const plantName = state.selectedCandidate?.name || state.manualName;

    if (!plantName) {
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Zapis rośliny
      await addPlantMutation.mutateAsync({
        planId,
        x: cell.x,
        y: cell.y,
        command: {
          plant_name: plantName,
          ...(state.fitResult && {
            sunlight_score: state.fitResult.sunlight_score,
            humidity_score: state.fitResult.humidity_score,
            precip_score: state.fitResult.precip_score,
            overall_score: state.fitResult.overall_score,
          }),
        },
      });

      // Event analityczny
      const eventCommand: AnalyticsEventCreateCommand = {
        event_type: "plant_confirmed",
        plan_id: planId,
        attributes: {
          x: cell.x,
          y: cell.y,
          plant_name: plantName,
          has_scores: !!state.fitResult,
          source: state.selectedCandidate ? "ai" : "manual",
        },
      };
      await sendEvent(eventCommand);

      // Reset stanu i callback sukcesu
      setState(initialState);
      onSuccess();
    } catch {
      // Error obsłużony przez mutację - nie trzeba nic robić
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [state, planId, cell, addPlantMutation, sendEvent, onSuccess]);

  /**
   * Anulowanie
   */
  const cancel = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Zamknięcie dialogu błędu
   */
  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    actions: {
      searchPlants,
      selectCandidate,
      retrySearch,
      checkFit,
      retryFit,
      skipFit,
      setManualName,
      switchToManualTab,
      switchToSearchTab,
      confirmAdd,
      cancel,
      dismissError,
    },
  };
}
