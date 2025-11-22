import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { GridAreaTypeCommand, GridAreaTypeResultDto, ApiItemResponse, ApiErrorResponse } from "@/types";

/**
 * Parametry mutacji zmiany typu obszaru
 */
export interface SetAreaTypeParams {
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
export function useSetAreaType(): UseMutationResult<GridAreaTypeResultDto, Error, SetAreaTypeParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, command }: SetAreaTypeParams) => {
      const response = await fetch(`/api/plans/${planId}/grid/area-type`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(command),
      });

      // Obsługa błędów HTTP
      if (response.status === 401) {
        window.location.assign("/auth/login");
        throw new Error("Unauthorized");
      }

      if (response.status === 403) {
        throw new Error("Brak uprawnień do tego planu");
      }

      if (response.status === 404) {
        throw new Error("Plan nie został znaleziony");
      }

      if (response.status === 409) {
        // Konflikt - rośliny w obszarze, wymaga potwierdzenia
        const errorData: ApiErrorResponse = await response.json();
        const error = new Error(
          errorData.error.message || "W zaznaczonym obszarze znajdują się rośliny. Potwierdź ich usunięcie."
        ) as Error & { status: number; requiresConfirmation: boolean; message: string };
        // Dodaj informację o required confirmation i status do obiektu błędu
        error.status = 409;
        error.requiresConfirmation = true;
        throw error;
      }

      if (response.status === 400 || response.status === 422) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nieprawidłowe parametry obszaru");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się zmienić typu obszaru");
      }

      const result: ApiItemResponse<GridAreaTypeResultDto> = await response.json();
      return result.data;
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
