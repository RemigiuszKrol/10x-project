import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { WeatherMonthlyDto, ApiListResponse, ApiErrorResponse } from "@/types";

/**
 * React Query hook do pobierania danych pogodowych dla planu
 *
 * Endpoint: GET /api/plans/:plan_id/weather
 *
 * @param planId - UUID planu
 * @returns Query result z danymi pogodowymi (12 miesięcy)
 */
export function useWeatherData(planId: string): UseQueryResult<WeatherMonthlyDto[], Error> {
  return useQuery({
    queryKey: ["plans", planId, "weather"],
    queryFn: async () => {
      const response = await fetch(`/api/plans/${planId}/weather`, {
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
        throw new Error("Plan nie został znaleziony lub brak danych pogodowych");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się pobrać danych pogodowych");
      }

      const result: ApiListResponse<WeatherMonthlyDto> = await response.json();
      return result.data;
    },
    // Konfiguracja
    staleTime: 5 * 60 * 1000, // 5 minut
    gcTime: 10 * 60 * 1000, // 10 minut
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
