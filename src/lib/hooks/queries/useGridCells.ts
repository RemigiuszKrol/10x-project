import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { GridCellDto, GridCellType, ApiListResponse, ApiErrorResponse } from "@/types";

/**
 * Filtry dla zapytania o komórki siatki
 */
export interface GridCellsFilters {
  type?: GridCellType;
  x?: number;
  y?: number;
  bbox?: [number, number, number, number]; // [x1, y1, x2, y2]
  limit?: number;
  cursor?: string;
  sort?: "updated_at" | "x";
  order?: "asc" | "desc";
}

/**
 * Wynik zapytania o komórki siatki
 */
export interface GridCellsResult {
  data: GridCellDto[];
  nextCursor: string | null;
}

/**
 * React Query hook do pobierania listy komórek siatki z filtrami i paginacją
 *
 * Endpoint: GET /api/plans/:plan_id/grid/cells
 *
 * @param planId - UUID planu
 * @param filters - Opcjonalne filtry (type, x/y, bbox, paginacja)
 * @returns Query result z listą komórek i next_cursor
 */
export function useGridCells(planId: string, filters?: GridCellsFilters): UseQueryResult<GridCellsResult, Error> {
  // Budowanie query string
  const queryParams = new URLSearchParams();

  if (filters?.type) {
    queryParams.append("type", filters.type);
  }

  if (filters?.x !== undefined) {
    queryParams.append("x", filters.x.toString());
  }

  if (filters?.y !== undefined) {
    queryParams.append("y", filters.y.toString());
  }

  if (filters?.bbox) {
    queryParams.append("bbox", filters.bbox.join(","));
  }

  if (filters?.limit) {
    queryParams.append("limit", filters.limit.toString());
  }

  if (filters?.cursor) {
    queryParams.append("cursor", filters.cursor);
  }

  if (filters?.sort) {
    queryParams.append("sort", filters.sort);
  }

  if (filters?.order) {
    queryParams.append("order", filters.order);
  }

  const queryString = queryParams.toString();
  const url = `/api/plans/${planId}/grid/cells${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: ["plans", planId, "grid", "cells", filters],
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

      if (response.status === 400) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nieprawidłowe parametry zapytania");
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message || "Nie udało się pobrać komórek siatki");
      }

      const result: ApiListResponse<GridCellDto> = await response.json();
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
