import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { PlantPlacementDto, PlantPlacementUpsertCommand, ApiItemResponse, ApiErrorResponse } from "@/types";

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

      if (response.status === 422) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Rośliny można dodawać tylko na pola typu 'ziemia'");
      }

      if (response.status === 400) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nieprawidłowe dane rośliny");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się dodać rośliny");
      }

      const result: ApiItemResponse<PlantPlacementDto> = await response.json();
      return result.data;
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

      // Obsługa błędów HTTP
      if (response.status === 401) {
        window.location.assign("/auth/login");
        throw new Error("Unauthorized");
      }

      if (response.status === 403) {
        throw new Error("Brak uprawnień do tego planu");
      }

      if (response.status === 404) {
        throw new Error("Plan lub roślina nie została znaleziona");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się usunąć rośliny");
      }

      // 204 No Content - brak zwracanej treści
    },
    onSuccess: (data, { planId }) => {
      // Invalidacja cache roślin
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "plants"] });

      // Invalidacja cache komórek
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "grid", "cells"] });
    },
  });
}
