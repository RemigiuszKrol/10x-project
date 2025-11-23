import { useState, useEffect, useCallback, useRef } from "react";
import type { PlanDto, ApiListResponse, ApiErrorResponse } from "@/types";
import { planDtoToViewModel, type PlanViewModel } from "@/lib/viewmodels/plan.viewmodel";
import { logger } from "@/lib/utils/logger";

/**
 * Stan ładowania listy planów
 */
type PlansListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; plans: PlanViewModel[]; nextCursor: string | null };

/**
 * Hook zarządzający komunikacją z API planów
 */
export function usePlansApi() {
  const [plansState, setPlansState] = useState<PlansListState>({
    status: "loading",
  });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);

  /**
   * Pobiera pierwszą stronę planów
   */
  const fetchPlans = useCallback(async () => {
    setPlansState({ status: "loading" });
    try {
      const response = await fetch("/api/plans?limit=20&order=desc", {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.assign("/auth/login");
        return;
      }

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error.message);
      }

      const data: ApiListResponse<PlanDto> = await response.json();
      const viewModels = data.data.map(planDtoToViewModel);
      const newCursor = data.pagination.next_cursor;

      setPlansState({
        status: "success",
        plans: viewModels,
        nextCursor: newCursor,
      });
      setNextCursor(newCursor);
      nextCursorRef.current = newCursor;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setPlansState({
          status: "error",
          message: "Brak połączenia z serwerem. Sprawdź połączenie internetowe.",
        });
      } else if (error instanceof Error) {
        setPlansState({
          status: "error",
          message: error.message,
        });
      } else {
        setPlansState({
          status: "error",
          message: "Wystąpił nieoczekiwany błąd.",
        });
      }
    }
  }, []);

  /**
   * Ładuje kolejną stronę planów
   */
  const loadMorePlans = useCallback(async () => {
    const currentCursor = nextCursorRef.current;
    if (!currentCursor) return;

    setPlansState((prevState) => {
      if (prevState.status !== "success") return prevState;

      // Uruchom fetch asynchronicznie
      fetch(`/api/plans?limit=20&order=desc&cursor=${encodeURIComponent(currentCursor)}`, {
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Nie udało się załadować więcej planów");
          }
          return response.json();
        })
        .then((data: ApiListResponse<PlanDto>) => {
          const newViewModels = data.data.map(planDtoToViewModel);
          const newCursor = data.pagination.next_cursor;
          setPlansState((currentState) => {
            if (currentState.status === "success") {
              return {
                status: "success",
                plans: [...currentState.plans, ...newViewModels],
                nextCursor: newCursor,
              };
            }
            return currentState;
          });
          setNextCursor(newCursor);
          nextCursorRef.current = newCursor;
        })
        .catch((error) => {
          // Błąd podczas ładowania więcej - można pokazać toast
          // Ale nie zmieniamy głównego stanu na error
          if (error instanceof Error) {
            logger.error("Błąd podczas ładowania więcej planów", { error: error.message });
          } else {
            logger.error("Nieoczekiwany błąd podczas ładowania więcej planów", { error: String(error) });
          }
        });

      return prevState;
    });
  }, []);

  /**
   * Usuwa plan
   */
  const deletePlan = useCallback(
    async (planId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/plans/${planId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.status === 401) {
          window.location.assign("/auth/login");
          return false;
        }

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          throw new Error(errorData.error.message);
        }

        // Refetch planów po usunięciu
        await fetchPlans();
        return true;
      } catch (error) {
        if (error instanceof Error) {
          logger.error("Błąd podczas usuwania planu", { error: error.message });
        } else {
          logger.error("Nieoczekiwany błąd podczas usuwania planu", { error: String(error) });
        }
        return false;
      }
    },
    [fetchPlans]
  );

  // Fetch przy montowaniu
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plansState,
    hasMore: !!nextCursor,
    fetchPlans,
    loadMorePlans,
    deletePlan,
  };
}
