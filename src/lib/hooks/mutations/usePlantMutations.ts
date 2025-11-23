import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { PlantPlacementDto, PlantPlacementUpsertCommand, ApiItemResponse } from "@/types";
import { handleApiError, parseHttpError } from "@/lib/utils/toast-error-handler";

/**
 * Parametry mutacji dodania/aktualizacji rośliny
 */
export interface AddPlantParams {
  planId: string;
  x: number;
  y: number;
  command: PlantPlacementUpsertCommand;
}

/**
 * Parametry mutacji usunięcia rośliny
 */
export interface RemovePlantParams {
  planId: string;
  x: number;
  y: number;
}

/**
 * React Query mutation do dodania lub aktualizacji rośliny
 *
 * Endpoint: PUT /api/plans/:plan_id/plants/:x/:y
 *
 * @returns Mutation result z danymi rośliny
 */
export function useAddPlant(): UseMutationResult<PlantPlacementDto, Error, AddPlantParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, x, y, command }: AddPlantParams) => {
      const response = await fetch(`/api/plans/${planId}/plants/${x}/${y}`, {
        method: "PUT",
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

      // Parsuj błąd HTTP (jeśli występuje)
      const error = await parseHttpError(response);
      if (error) {
        throw error;
      }

      // Sukces - parsuj odpowiedź
      const result: ApiItemResponse<PlantPlacementDto> = await response.json();
      return result.data;
    },
    onError: (error) => {
      // Automatyczne wyświetlanie toastu dla błędów
      handleApiError(error);
    },
    onSuccess: (data, { planId }) => {
      // Invalidacja cache roślin
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "plants"] });

      // Invalidacja cache komórek (komórka może teraz zawierać roślinę)
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "grid", "cells"] });
    },
  });
}

/**
 * React Query mutation do usunięcia rośliny
 *
 * Endpoint: DELETE /api/plans/:plan_id/plants/:x/:y
 *
 * @returns Mutation result
 */
export function useRemovePlant(): UseMutationResult<void, Error, RemovePlantParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, x, y }: RemovePlantParams) => {
      const response = await fetch(`/api/plans/${planId}/plants/${x}/${y}`, {
        method: "DELETE",
        credentials: "include",
      });

      // Obsługa Unauthorized - redirect przed parsowaniem błędu
      if (response.status === 401) {
        window.location.assign("/auth/login");
        const error = await parseHttpError(response);
        if (error) throw error;
        throw new Error("Unauthorized");
      }

      // Parsuj błąd HTTP (jeśli występuje)
      const error = await parseHttpError(response);
      if (error) {
        throw error;
      }

      // 204 No Content - brak zwracanej treści
    },
    onError: (error) => {
      // Automatyczne wyświetlanie toastu dla błędów
      handleApiError(error);
    },
    onSuccess: (data, { planId }) => {
      // Invalidacja cache roślin
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "plants"] });

      // Invalidacja cache komórek
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "grid", "cells"] });
    },
  });
}
