import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { WeatherRefreshCommand, WeatherRefreshResultDto, ApiItemResponse } from "@/types";
import { handleApiError, parseHttpError } from "@/lib/utils/toast-error-handler";

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
      const result: ApiItemResponse<WeatherRefreshResultDto> = await response.json();
      return result.data;
    },
    onError: (error) => {
      // Automatyczne wyświetlanie toastu dla błędów
      handleApiError(error);
    },
    onSuccess: (data, { planId }) => {
      // Invalidacja cache pogody - dane zostały odświeżone
      queryClient.invalidateQueries({ queryKey: ["plans", planId, "weather"] });
    },
  });
}
