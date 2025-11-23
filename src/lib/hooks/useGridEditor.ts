import { useState, useMemo } from "react";
import type {
  PlanDto,
  GridMetadataDto,
  EditorState,
  EditorTool,
  CellSelection,
  CellPosition,
  PlantPlacementDto,
  SelectionInfo,
} from "@/types";
import { usePlan, useGridMetadata, useGridCells, usePlantPlacements } from "./queries";
import {
  useUpdatePlan,
  useSetAreaType,
  useAddPlant,
  useRemovePlant,
  type UpdatePlanParams,
  type SetAreaTypeMutationParams,
  type AddPlantParams,
  type RemovePlantParams,
} from "./mutations";

/**
 * Wartość zwracana przez useGridEditor
 */
export interface UseGridEditorReturn {
  // Stan
  state: EditorState;

  // Dane z React Query
  plan: PlanDto | undefined;
  gridMetadata: GridMetadataDto | undefined;
  cells: ReturnType<typeof useGridCells>;
  plants: ReturnType<typeof usePlantPlacements>;

  // Actions
  actions: {
    setTool: (tool: EditorTool) => void;
    selectArea: (selection: CellSelection | null) => void;
    clearSelection: () => void;
    focusCell: (position: CellPosition | null) => void;
    jumpToCell: (x: number, y: number) => void; // NOWE: Nawigacja do komórki
    setAreaType: (params: Omit<SetAreaTypeMutationParams, "planId">) => Promise<void>;
    addPlant: (params: Omit<AddPlantParams, "planId">) => Promise<void>;
    removePlant: (params: Omit<RemovePlantParams, "planId">) => Promise<void>;
    updatePlan: (params: Omit<UpdatePlanParams, "planId">) => Promise<void>;
  };

  // Derived state
  derived: {
    selectedCellsCount: number;
    plantsInSelection: PlantPlacementDto[];
    canAddPlant: boolean;
    selectionInfo: SelectionInfo | null;
    hasActiveSelection: boolean;
  };

  // Loading states
  isLoading: boolean;
  isError: boolean;
}

/**
 * Custom hook zarządzający stanem edytora planu
 *
 * Odpowiedzialności:
 * - Zarządzanie lokalnym stanem edytora (tool, selection, focus)
 * - Integracja z React Query (queries i mutations)
 * - Agregacja actions i derived state
 * - Logika biznesowa (np. sprawdzanie czy można dodać roślinę)
 *
 * @param planId - UUID planu
 * @param initialPlan - Wstępne dane planu z SSR
 * @param initialGridMetadata - Wstępne metadane siatki z SSR
 * @returns Stan edytora, akcje i derived state
 */
export function useGridEditor(
  planId: string,
  initialPlan: PlanDto,
  initialGridMetadata: GridMetadataDto
): UseGridEditorReturn {
  // Stan lokalny edytora
  const [state, setState] = useState<EditorState>({
    currentTool: "select",
    selectedArea: null,
    focusedCell: null,
    hasUnsavedChanges: false,
    clipboardArea: null,
  });

  // React Query - pobieranie danych
  const planQuery = usePlan(planId);
  const gridMetadataQuery = useGridMetadata(planId);
  const cellsQuery = useGridCells(planId, { limit: 100 }); // Początkowa partia
  const plantsQuery = usePlantPlacements(planId);

  // React Query - mutacje
  const updatePlanMutation = useUpdatePlan();
  const setAreaTypeMutation = useSetAreaType();
  const addPlantMutation = useAddPlant();
  const removePlantMutation = useRemovePlant();

  // Actions - zarządzanie stanem edytora
  const actions = useMemo(
    () => ({
      setTool: (tool: EditorTool) => {
        setState((s) => ({ ...s, currentTool: tool, selectedArea: null, focusedCell: null }));
      },

      selectArea: (selection: CellSelection | null) => {
        setState((s) => ({ ...s, selectedArea: selection }));
      },

      clearSelection: () => {
        setState((s) => ({ ...s, selectedArea: null }));
      },

      focusCell: (position: CellPosition | null) => {
        setState((s) => ({ ...s, focusedCell: position }));
      },

      // NOWE: Nawigacja do komórki (focus + scroll)
      jumpToCell: (x: number, y: number) => {
        setState((s) => ({ ...s, focusedCell: { x, y } }));
      },

      setAreaType: async (params: Omit<SetAreaTypeMutationParams, "planId">) => {
        await setAreaTypeMutation.mutateAsync({ planId, ...params });
        setState((s) => ({ ...s, hasUnsavedChanges: false }));
      },

      addPlant: async (params: Omit<AddPlantParams, "planId">) => {
        await addPlantMutation.mutateAsync({ planId, ...params });
      },

      removePlant: async (params: Omit<RemovePlantParams, "planId">) => {
        await removePlantMutation.mutateAsync({ planId, ...params });
      },

      updatePlan: async (params: Omit<UpdatePlanParams, "planId">) => {
        await updatePlanMutation.mutateAsync({ planId, ...params });
      },
    }),
    [planId, setAreaTypeMutation, addPlantMutation, removePlantMutation, updatePlanMutation]
  );

  // Derived state - obliczenia na podstawie stanu
  const derived = useMemo(() => {
    // Liczba zaznaczonych komórek
    const selectedCellsCount = state.selectedArea
      ? (state.selectedArea.x2 - state.selectedArea.x1 + 1) * (state.selectedArea.y2 - state.selectedArea.y1 + 1)
      : 0;

    // Informacje o zaznaczeniu
    const selectionInfo: SelectionInfo | null = state.selectedArea
      ? {
          selection: state.selectedArea,
          cellCount: selectedCellsCount,
          width: state.selectedArea.x2 - state.selectedArea.x1 + 1,
          height: state.selectedArea.y2 - state.selectedArea.y1 + 1,
        }
      : null;

    // Czy jest aktywne zaznaczenie
    const hasActiveSelection = state.selectedArea !== null;

    // Rośliny w zaznaczonym obszarze
    const plantsInSelection: PlantPlacementDto[] = [];
    if (state.selectedArea && plantsQuery.data) {
      const { x1, y1, x2, y2 } = state.selectedArea;
      plantsInSelection.push(
        ...plantsQuery.data.data.filter((plant) => plant.x >= x1 && plant.x <= x2 && plant.y >= y1 && plant.y <= y2)
      );
    }

    // Czy można dodać roślinę na focusowaną komórkę
    const canAddPlant = (() => {
      if (!state.focusedCell) return false;
      if (state.currentTool !== "add_plant") return false;

      // Sprawdź czy komórka jest typu 'soil'
      const focusedX = state.focusedCell.x;
      const focusedY = state.focusedCell.y;
      const cell = cellsQuery.data?.data.find((c) => c.x === focusedX && c.y === focusedY);
      if (!cell || cell.type !== "soil") return false;

      // Sprawdź czy na komórce nie ma już rośliny
      const hasPlant = plantsQuery.data?.data.some((p) => p.x === focusedX && p.y === focusedY);
      if (hasPlant) return false;

      return true;
    })();

    return {
      selectedCellsCount,
      plantsInSelection,
      canAddPlant,
      selectionInfo,
      hasActiveSelection,
    };
  }, [state, cellsQuery.data, plantsQuery.data]);

  // Loading i error states
  const isLoading = planQuery.isLoading || gridMetadataQuery.isLoading || cellsQuery.isLoading;
  const isError = planQuery.isError || gridMetadataQuery.isError || cellsQuery.isError;

  return {
    state,
    plan: planQuery.data ?? initialPlan,
    gridMetadata: gridMetadataQuery.data ?? initialGridMetadata,
    cells: cellsQuery,
    plants: plantsQuery,
    actions,
    derived,
    isLoading,
    isError,
  };
}
