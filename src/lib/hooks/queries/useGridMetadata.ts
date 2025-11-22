import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { GridMetadataDto, ApiItemResponse, ApiErrorResponse } from "@/types";

/**
 * React Query hook do pobierania metadanych siatki planu
 *
 * Endpoint: GET /api/plans/:plan_id/grid
 *
 * @param planId - UUID planu
 * @returns Query result z metadanymi siatki (grid_width, grid_height, cell_size_cm, orientation)
 */
export function useGridMetadata(planId: string): UseQueryResult<GridMetadataDto, Error> {
  return useQuery({
    queryKey: ["plans", planId, "grid", "metadata"],
    queryFn: async () => {
      const response = await fetch(`/api/plans/${planId}/grid`, {
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
        throw new Error(errorData.error.message || "Nie udało się pobrać metadanych siatki");
      }

      const data: ApiItemResponse<GridMetadataDto> = await response.json();
      return data.data;
    },
    // Konfiguracja
    staleTime: 5 * 60 * 1000, // 5 minut
    gcTime: 10 * 60 * 1000, // 10 minut
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
