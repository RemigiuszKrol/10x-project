import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { PlanDto, PlanUpdateCommand, PlanUpdateQuery, ApiItemResponse, ApiErrorResponse } from "@/types";
import { handleApiError, parseHttpError } from "@/lib/utils/toast-error-handler";

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

      // Obsługa Unauthorized - redirect przed parsowaniem błędu
      if (response.status === 401) {
        window.location.assign("/auth/login");
        const error = await parseHttpError(response);
        if (error) throw error;
        throw new Error("Unauthorized");
      }

      // Specjalna obsługa 409 - wymaga potwierdzenia regeneracji (nie pokazuj toastu)
      if (response.status === 409) {
        const errorData: ApiErrorResponse = await response.json();
        const error = new Error(errorData.error.message || "Wymagane potwierdzenie regeneracji siatki");
        // Dodaj informację o required confirmation do obiektu błędu
        (error as Error & { requiresConfirmation: boolean }).requiresConfirmation = true;
        throw error;
      }

      // Parsuj błąd HTTP (jeśli występuje)
      const error = await parseHttpError(response);
      if (error) {
        throw error;
      }

      // Sukces - parsuj odpowiedź
      const result: ApiItemResponse<PlanDto> = await response.json();
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
