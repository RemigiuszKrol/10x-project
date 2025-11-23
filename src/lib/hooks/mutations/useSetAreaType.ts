import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { GridAreaTypeCommand, GridAreaTypeResultDto, ApiItemResponse, ApiErrorResponse } from "@/types";
import { handleApiError, parseHttpError } from "@/lib/utils/toast-error-handler";

/**
 * Parametry mutacji zmiany typu obszaru (dla React Query hook)
 */
export interface SetAreaTypeMutationParams {
  planId: string;
  command: GridAreaTypeCommand;
}

/**
 * React Query mutation do zmiany typu prostokątnego obszaru siatki
 *
 * Endpoint: POST /api/plans/:plan_id/grid/area-type
 *
 * Obsługuje:
 * - Zmianę typu wielu komórek jednocześnie
 * - Wykrywanie konfliktu 409 (rośliny w obszarze)
 * - Invalidację cache komórek po sukcesie
 *
 * @returns Mutation result z liczbą zmodyfikowanych komórek i usuniętych roślin
 */
export function useSetAreaType(): UseMutationResult<GridAreaTypeResultDto, Error, SetAreaTypeMutationParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, command }: SetAreaTypeMutationParams) => {
      const response = await fetch(`/api/plans/${planId}/grid/area-type`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(command),
      });

      // Obsługa Unauthorized - redirect przed parsowaniem błędu
      if (response.status === 401) {
        window.location.assign("/auth/login");
        const error = await parseHttpError(response);
        if (error) throw error;
        throw new Error("Unauthorized");
      }

      // Specjalna obsługa 409 - wymaga potwierdzenia usunięcia roślin (nie pokazuj toastu)
      if (response.status === 409) {
        const errorData: ApiErrorResponse = await response.json();
        const error = new Error(
          errorData.error.message || "W zaznaczonym obszarze znajdują się rośliny. Potwierdź ich usunięcie."
        ) as Error & { status: number; requiresConfirmation: boolean; message: string };
        // Dodaj informację o required confirmation i status do obiektu błędu
        error.status = 409;
        error.requiresConfirmation = true;
        throw error;
      }

      // Parsuj błąd HTTP (jeśli występuje)
      const error = await parseHttpError(response);
      if (error) {
        throw error;
      }

      // Sukces - parsuj odpowiedź
      const result: ApiItemResponse<GridAreaTypeResultDto> = await response.json();
      return result.data;
    },
    onError: (error) => {
      // Sprawdź czy to błąd 409 (wymaga potwierdzenia) - nie pokazuj toastu
      if (error instanceof Error && (error as Error & { requiresConfirmation?: boolean }).requiresConfirmation) {
        // Nie pokazuj toastu dla 409 - obsługa w komponencie
        return;
      }

      // Automatyczne wyświetlanie toastu dla innych błędów
      handleApiError(error);
    },
    onSuccess: (data, { planId }) => {
      // Invalidacja cache komórek siatki
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "grid", "cells"] });

      // Jeśli usunięto rośliny, invaliduj cache roślin
      if (data.removed_plants > 0) {
        queryClient.invalidateQueries({ queryKey: ["plans", planId, "plants"] });
      }
    },
  });
}
