import { useMemo } from "react";
import { useMutationState } from "@tanstack/react-query";
import { useWeatherData } from "./queries/useWeatherData";
import { useRefreshWeather } from "./mutations/useRefreshWeather";
import type { PlantSearchCommand, PlantFitCommand } from "@/types";

/**
 * Status AI w edytorze
 */
export type AIStatus = "idle" | "searching" | "fitting" | "error";

/**
 * Status pogody w edytorze
 */
export type WeatherStatus = "idle" | "loading" | "error" | "stale" | "missing";

/**
 * Wynik hooka useEditorStatus
 */
export interface UseEditorStatusReturn {
  aiStatus: AIStatus;
  weatherStatus: WeatherStatus;
}

/**
 * Hook do śledzenia statusów AI i pogody w edytorze
 *
 * Status AI:
 * - Sprawdza aktywne mutations AI (searchPlants, checkPlantFit) przez mutation state
 * - Mapuje na: "idle" | "searching" | "fitting" | "error"
 *
 * Status pogody:
 * - Używa useWeatherData i useRefreshWeather do sprawdzenia statusu
 * - Sprawdza czy dane są nieaktualne (stale) lub brak danych (missing)
 * - Mapuje na: "idle" | "loading" | "error" | "stale" | "missing"
 *
 * @param planId - UUID planu
 * @returns Statusy AI i pogody
 */
export function useEditorStatus(planId: string): UseEditorStatusReturn {
  // Status AI - sprawdź aktywne mutations przez mutation state
  // Używamy useMutationState do subskrypcji do wszystkich mutations
  const allMutations = useMutationState();

  const aiStatus = useMemo<AIStatus>(() => {
    // Filtruj mutations AI - sprawdź variables mutation
    // searchPlants ma variables z "query"
    // checkPlantFit ma variables z "plan_id", "x", "y", "plant_name"
    const aiMutations = allMutations.filter((mutation) => {
      // useMutationState zwraca mutations z variables bezpośrednio
      const variables = mutation.variables;
      if (!variables || typeof variables !== "object") {
        return false;
      }

      // Sprawdź czy to mutation AI - searchPlants ma "query"
      if ("query" in variables && typeof (variables as PlantSearchCommand).query === "string") {
        return true;
      }

      // Sprawdź czy to mutation AI - checkPlantFit ma "plan_id", "x", "y", "plant_name"
      if ("plan_id" in variables && "x" in variables && "y" in variables && "plant_name" in variables) {
        return true;
      }

      return false;
    });

    // Sprawdź status mutations
    const pendingMutations = aiMutations.filter((m) => m.status === "pending");
    const errorMutations = aiMutations.filter((m) => m.status === "error");

    if (errorMutations.length > 0) {
      return "error";
    }

    if (pendingMutations.length > 0) {
      // Sprawdź typ operacji - czy to search czy fit
      const firstPending = pendingMutations[0];
      const variables = firstPending?.variables;
      if (variables && typeof variables === "object") {
        const vars = variables as PlantSearchCommand | PlantFitCommand;
        // searchPlants ma "query"
        if ("query" in vars) {
          return "searching";
        }
        // checkPlantFit ma "plan_id"
        if ("plan_id" in vars) {
          return "fitting";
        }
      }
      // Fallback: jeśli nie możemy określić, załóżmy że to searching
      return "searching";
    }

    return "idle";
  }, [allMutations]);

  // Status pogody - użyj hooków do sprawdzenia statusu
  const weatherQuery = useWeatherData(planId);
  const refreshWeather = useRefreshWeather();

  const weatherStatus = useMemo<WeatherStatus>(() => {
    // Jeśli trwa odświeżanie, status to "loading"
    if (refreshWeather.isPending) {
      return "loading";
    }

    // Jeśli jest błąd w query lub mutation, status to "error"
    if (weatherQuery.isError || refreshWeather.isError) {
      return "error";
    }

    // Sprawdź czy dane są dostępne
    // Jeśli query jest zakończone sukcesem ale nie ma danych, status to "missing"
    if (weatherQuery.isSuccess && (!weatherQuery.data || weatherQuery.data.length === 0)) {
      return "missing";
    }

    // Sprawdź czy dane są nieaktualne (stale)
    // Dane są nieaktualne jeśli:
    // 1. Query jest stale (isStale)
    // 2. Dane są starsze niż 24h (sprawdź last_refreshed_at)
    if (weatherQuery.isStale) {
      return "stale";
    }

    // Sprawdź czy dane są starsze niż 24h
    if (weatherQuery.data && weatherQuery.data.length > 0) {
      const firstData = weatherQuery.data[0];
      if (firstData.last_refreshed_at) {
        const lastRefreshed = new Date(firstData.last_refreshed_at);
        const now = new Date();
        const hoursSinceRefresh = (now.getTime() - lastRefreshed.getTime()) / (1000 * 60 * 60);
        if (hoursSinceRefresh > 24) {
          return "stale";
        }
      }
    }

    return "idle";
  }, [weatherQuery, refreshWeather]);

  return {
    aiStatus,
    weatherStatus,
  };
}
