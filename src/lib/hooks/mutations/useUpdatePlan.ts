import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { PlanDto, PlanUpdateCommand, PlanUpdateQuery, ApiItemResponse, ApiErrorResponse } from "@/types";

/**
 * Parametry mutacji aktualizacji planu
 */
export interface UpdatePlanParams {
  planId: string;
  command: PlanUpdateCommand;
  query?: PlanUpdateQuery;
}

/**
 * React Query mutation do aktualizacji planu
 *
 * Endpoint: PATCH /api/plans/:plan_id
 *
 * Obsługuje:
 * - Aktualizację parametrów planu (nazwa, orientacja, wymiary, etc.)
 * - Wykrywanie konfliktu 409 (wymaga potwierdzenia regeneracji)
 * - Invalidację cache po sukcesie
 *
 * @returns Mutation result
 */
export function useUpdatePlan(): UseMutationResult<PlanDto, Error, UpdatePlanParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, command, query }: UpdatePlanParams) => {
      // Budowanie query string
      const queryParams = new URLSearchParams();
      if (query?.confirm_regenerate) {
        queryParams.append("confirm_regenerate", "true");
      }

      const queryString = queryParams.toString();
      const url = `/api/plans/${planId}${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "PATCH",
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
        // Konflikt - wymaga potwierdzenia regeneracji
        const errorData: ApiErrorResponse = await response.json();
        const error = new Error(errorData.error.message || "Wymagane potwierdzenie regeneracji siatki");
        // Dodaj informację o required confirmation do obiektu błędu
        (error as Error & { requiresConfirmation: boolean }).requiresConfirmation = true;
        throw error;
      }

      if (response.status === 400) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nieprawidłowe dane wejściowe");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się zaktualizować planu");
      }

      const result: ApiItemResponse<PlanDto> = await response.json();
      return result.data;
    },
    onSuccess: (updatedPlan, { planId }) => {
      // Invalidacja cache planu
      queryClient.invalidateQueries({ queryKey: ["plans", planId] });

      // Invalidacja cache metadanych siatki (mogły się zmienić)
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "grid", "metadata"] });

      // Jeśli regeneracja siatki nastąpiła, invaliduj też komórki i rośliny
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "grid", "cells"] });
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "plants"] });
    },
  });
}
