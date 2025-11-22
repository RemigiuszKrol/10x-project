import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { WeatherRefreshCommand, WeatherRefreshResultDto, ApiItemResponse, ApiErrorResponse } from "@/types";

/**
 * Parametry mutacji odświeżenia pogody
 */
export interface RefreshWeatherParams {
  planId: string;
  command: WeatherRefreshCommand;
}

/**
 * React Query mutation do odświeżenia cache danych pogodowych
 *
 * Endpoint: POST /api/plans/:plan_id/weather/refresh
 *
 * Rate limit: 2/h/plan
 *
 * @returns Mutation result z informacją o odświeżeniu
 */
export function useRefreshWeather(): UseMutationResult<WeatherRefreshResultDto, Error, RefreshWeatherParams> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, command }: RefreshWeatherParams) => {
      const response = await fetch(`/api/plans/${planId}/weather/refresh`, {
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

      if (response.status === 429) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(
          errorData.error.message || "Zbyt częste odświeżanie danych pogodowych. Spróbuj ponownie później."
        );
      }

      if (response.status === 502 || response.status === 504) {
        throw new Error("Serwis pogodowy nie odpowiada. Spróbuj ponownie za chwilę.");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się odświeżyć danych pogodowych");
      }

      const result: ApiItemResponse<WeatherRefreshResultDto> = await response.json();
      return result.data;
    },
    onSuccess: (data, { planId }) => {
      // Invalidacja cache pogody - dane zostały odświeżone
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "weather"] });
    },
  });
}
