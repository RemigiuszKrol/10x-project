import { useState, useCallback } from "react";
import { useSetAreaType } from "./mutations/useSetAreaType";
import type { GridAreaTypeResultDto, SetAreaTypeOptions, AreaTypeOperation } from "@/types";

/**
 * Propsy hooka useAreaTypeWithConfirmation
 */
interface UseAreaTypeWithConfirmationProps {
  planId: string;
  onSuccess?: (result: GridAreaTypeResultDto, options: SetAreaTypeOptions) => void;
}

/**
 * Return type hooka useAreaTypeWithConfirmation
 */
interface UseAreaTypeWithConfirmationReturn {
  setAreaType: (options: SetAreaTypeOptions) => Promise<void>;
  isLoading: boolean;
  pendingOperation: AreaTypeOperation | null;
  confirmOperation: () => Promise<void>;
  cancelOperation: () => void;
}

/**
 * Helper do parsowania liczby roślin z error message 409
 *
 * Oczekiwany format: "There are 4 plant(s) in the selected area..."
 */
function extractPlantsCountFromError(error: Error & { message: string }): number {
  const match = error.message.match(/(\d+)\s+plant\(s\)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  // Fallback - jeśli nie udało się sparsować, zwróć 1
  return 1;
}

/**
 * Hook wysokopoziomowy zarządzający całym flow zmiany typu obszaru z obsługą 409 confirmation
 *
 * Obsługuje:
 * - Wywołanie mutation setAreaType
 * - Wykrywanie błędu 409 (rośliny w obszarze)
 * - Parsowanie liczby roślin z error message
 * - Przechowywanie pending operation dla dialogu potwierdzenia
 * - Retry z confirm_plant_removal=true po potwierdzeniu
 * - Callback onSuccess po sukcesie operacji
 *
 * @param props - Konfiguracja hooka
 * @returns Akcje i stan związany ze zmianą typu obszaru
 */
export function useAreaTypeWithConfirmation({
  planId,
  onSuccess,
}: UseAreaTypeWithConfirmationProps): UseAreaTypeWithConfirmationReturn {
  const setAreaTypeMutation = useSetAreaType();
  const [pendingOperation, setPendingOperation] = useState<AreaTypeOperation | null>(null);

  /**
   * Główna funkcja zmiany typu obszaru
   */
  const setAreaType = useCallback(
    async ({ selection, type, confirmPlantRemoval = false }: SetAreaTypeOptions) => {
      const options: SetAreaTypeOptions = { selection, type, confirmPlantRemoval };

      try {
        const result = await setAreaTypeMutation.mutateAsync({
          planId,
          command: {
            x1: selection.x1,
            y1: selection.y1,
            x2: selection.x2,
            y2: selection.y2,
            type,
            confirm_plant_removal: confirmPlantRemoval,
          },
        });

        // Sukces - wywołaj callback z result i options
        if (onSuccess) {
          onSuccess(result, options);
        }

        // Wyczyść pending operation jeśli była (po retry)
        if (pendingOperation) {
          setPendingOperation(null);
        }
      } catch (error) {
        const err = error as Error & { status?: number; requiresConfirmation?: boolean };

        // Obsługa błędu 409 - rośliny w obszarze
        if (err.status === 409 && err.requiresConfirmation) {
          // Parsuj liczbę roślin z error message
          const plantsCount = extractPlantsCountFromError(err);

          // Zapisz pending operation dla dialogu
          setPendingOperation({
            selection,
            targetType: type,
            plantsCount,
            requiresConfirmation: true,
          });

          // Nie propaguj błędu dalej - dialog otworzy się automatycznie
          return;
        }

        // Inne błędy propaguj wyżej
        throw error;
      }
    },
    [planId, setAreaTypeMutation, onSuccess, pendingOperation]
  );

  /**
   * Potwierdzenie operacji z usunięciem roślin
   */
  const confirmOperation = useCallback(async () => {
    if (!pendingOperation) return;

    // Retry z confirm_plant_removal=true
    await setAreaType({
      selection: pendingOperation.selection,
      type: pendingOperation.targetType,
      confirmPlantRemoval: true,
    });

    // pendingOperation zostanie wyczyszczone w setAreaType po sukcesie
  }, [pendingOperation, setAreaType]);

  /**
   * Anulowanie operacji
   */
  const cancelOperation = useCallback(() => {
    setPendingOperation(null);
  }, []);

  return {
    setAreaType,
    isLoading: setAreaTypeMutation.isPending,
    pendingOperation,
    confirmOperation,
    cancelOperation,
  };
}
