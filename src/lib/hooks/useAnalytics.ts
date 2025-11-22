import { useMutation } from "@tanstack/react-query";
import type {
  AnalyticsEventCreateCommand,
  ApiItemResponse,
  AnalyticsEventDto,
  CellSelection,
  GridCellType,
} from "@/types";

/**
 * Hook do wysyłania zdarzeń analitycznych
 *
 * Obsługuje:
 * - Wysyłanie zdarzeń do API: POST /api/analytics/events
 * - Automatyczne retry przy błędach sieciowych
 * - Graceful failure - nie blokuje głównego flow
 *
 * @returns Mutation do wysyłania zdarzeń
 */
export function useAnalytics() {
  const mutation = useMutation({
    mutationFn: async (command: AnalyticsEventCreateCommand) => {
      const response = await fetch("/api/analytics/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(command),
      });

      // Nie rzucamy błędem dla analytics - graceful failure
      if (!response.ok) {
        return null;
      }

      const result: ApiItemResponse<AnalyticsEventDto> = await response.json();
      return result.data;
    },
    // Retry raz w przypadku błędu sieciowego
    retry: 1,
    // Nie pokazuj toastów dla błędów analytics
    onError: () => {
      // Graceful failure - nie przerywaj głównego flow
    },
  });

  return {
    sendEvent: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

/**
 * Typy helpery dla konkretnych eventów
 */

/**
 * Event: area_typed - zmiana typu obszaru
 */
export interface AreaTypedEventAttributes {
  area: CellSelection;
  type: GridCellType;
  affected_cells: number;
  removed_plants: number;
}

/**
 * Helper do utworzenia eventu area_typed
 */
export function createAreaTypedEvent(
  planId: string,
  attributes: AreaTypedEventAttributes
): AnalyticsEventCreateCommand {
  return {
    event_type: "area_typed",
    plan_id: planId,
    attributes: {
      area: {
        x1: attributes.area.x1,
        y1: attributes.area.y1,
        x2: attributes.area.x2,
        y2: attributes.area.y2,
      },
      type: attributes.type,
      affected_cells: attributes.affected_cells,
      removed_plants: attributes.removed_plants,
    },
  };
}
