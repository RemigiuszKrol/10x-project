import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PlanDto, ApiItemResponse, ApiErrorResponse } from "@/types";

/**
 * React Query hook do pobierania szczegółów planu
 *
 * Endpoint: GET /api/plans/:plan_id
 *
 * @param planId - UUID planu
 * @returns Query result z danymi planu
 */
export function usePlan(planId: string): UseQueryResult<PlanDto, Error> {
  return useQuery({
    queryKey: ["plans", planId],
    queryFn: async () => {
      const response = await fetch(`/api/plans/${planId}`, {
        credentials: "include",
      });

      // Obsługa błędów HTTP
      if (response.status === 401) {
        // Redirect do logowania przy utracie sesji
        window.location.assign("/auth/login");
        throw new Error("Unauthorized");
      }

      if (response.status === 403) {
        throw new Error("Brak uprawnień do tego planu");
      }

      if (response.status === 404) {
        throw new Error("Plan nie został znaleziony");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się pobrać planu");
      }

      const data: ApiItemResponse<PlanDto> = await response.json();
      return data.data;
    },
    // Konfiguracja zgodna z planem implementacji
    staleTime: 5 * 60 * 1000, // 5 minut
    gcTime: 10 * 60 * 1000, // 10 minut (poprzednio cacheTime)
    refetchOnWindowFocus: false, // Unikamy konfliktów z lokalną edycją
    retry: 1,
  });
}
