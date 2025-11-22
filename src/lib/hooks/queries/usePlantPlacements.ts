import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PlantPlacementDto, ApiListResponse, ApiErrorResponse } from "@/types";

/**
 * Filtry dla zapytania o rośliny
 */
export interface PlantPlacementsFilters {
  name?: string; // Filtrowanie po nazwie (ILIKE)
  limit?: number;
  cursor?: string;
}

/**
 * Wynik zapytania o rośliny
 */
export interface PlantPlacementsResult {
  data: PlantPlacementDto[];
  nextCursor: string | null;
}

/**
 * React Query hook do pobierania listy roślin w planie
 *
 * Endpoint: GET /api/plans/:plan_id/plants
 *
 * @param planId - UUID planu
 * @param filters - Opcjonalne filtry (name, paginacja)
 * @returns Query result z listą roślin i next_cursor
 */
export function usePlantPlacements(
  planId: string,
  filters?: PlantPlacementsFilters
): UseQueryResult<PlantPlacementsResult, Error> {
  // Budowanie query string
  const queryParams = new URLSearchParams();

  if (filters?.name) {
    queryParams.append("name", filters.name);
  }

  if (filters?.limit) {
    queryParams.append("limit", filters.limit.toString());
  }

  if (filters?.cursor) {
    queryParams.append("cursor", filters.cursor);
  }

  const queryString = queryParams.toString();
  const url = `/api/plans/${planId}/plants${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: ["plans", planId, "plants", filters],
    queryFn: async () => {
      const response = await fetch(url, {
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
        throw new Error("Plan nie został znaleziony");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się pobrać roślin");
      }

      const result: ApiListResponse<PlantPlacementDto> = await response.json();
      return {
        data: result.data,
        nextCursor: result.pagination.next_cursor,
      };
    },
    // Konfiguracja
    staleTime: 5 * 60 * 1000, // 5 minut
    gcTime: 10 * 60 * 1000, // 10 minut
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
