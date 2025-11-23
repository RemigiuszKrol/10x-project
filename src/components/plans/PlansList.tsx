import { useState, useCallback } from "react";
import { usePlansApi } from "@/lib/hooks/usePlansApi";
import { PlansListHeader } from "./PlansListHeader";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { PlansTable } from "./PlansTable";
import { LoadMoreButton } from "./LoadMoreButton";
import { DeletePlanDialog } from "./DeletePlanDialog";

/**
 * Stan dialogu usuwania
 */
interface DeleteDialogState {
  open: boolean;
  planId: string | null;
  planName: string | null;
  isDeleting: boolean;
}

/**
 * Główny komponent React zarządzający stanem listy planów
 */
export function PlansList() {
  const { plansState, hasMore, fetchPlans, loadMorePlans, deletePlan } = usePlansApi();

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    planId: null,
    planName: null,
    isDeleting: false,
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Nawigacja do tworzenia nowego planu
   */
  const handleCreateNew = useCallback(() => {
    window.location.href = "/plans/new";
  }, []);

  /**
   * Nawigacja do edycji planu
   */
  const handleEdit = useCallback((planId: string) => {
    window.location.href = `/plans/${planId}`;
  }, []);

  /**
   * Otwarcie dialogu potwierdzenia usunięcia
   */
  const handleDeleteClick = useCallback((planId: string, planName: string) => {
    setDeleteDialog({
      open: true,
      planId,
      planName,
      isDeleting: false,
    });
  }, []);

  /**
   * Potwierdzenie usunięcia planu
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.planId) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    const success = await deletePlan(deleteDialog.planId);

    if (success) {
      setDeleteDialog({
        open: false,
        planId: null,
        planName: null,
        isDeleting: false,
      });
    } else {
      // Błąd - pozostaw dialog otwarty, użytkownik może spróbować ponownie
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
      alert("Nie udało się usunąć planu. Spróbuj ponownie.");
    }
  }, [deleteDialog.planId, deletePlan]);

  /**
   * Anulowanie usunięcia
   */
  const handleCancelDelete = useCallback(() => {
    setDeleteDialog({
      open: false,
      planId: null,
      planName: null,
      isDeleting: false,
    });
  }, []);

  /**
   * Załadowanie kolejnej strony planów
   */
  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    await loadMorePlans();
    setIsLoadingMore(false);
  }, [loadMorePlans]);

  /**
   * Ponowne pobranie planów po błędzie
   */
  const handleRetry = useCallback(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div>
      <PlansListHeader onCreateNew={handleCreateNew} />

      {plansState.status === "loading" && <LoadingState />}

      {plansState.status === "error" && <ErrorState message={plansState.message} onRetry={handleRetry} />}

      {plansState.status === "success" && plansState.plans.length === 0 && <EmptyState onCreateNew={handleCreateNew} />}

      {plansState.status === "success" && plansState.plans.length > 0 && (
        <>
          <PlansTable
            plans={plansState.plans}
            onEdit={handleEdit}
            onDelete={(planId) => {
              const plan = plansState.plans.find((p) => p.id === planId);
              if (plan) {
                handleDeleteClick(planId, plan.name);
              }
            }}
          />

          {hasMore && <LoadMoreButton onLoadMore={handleLoadMore} isLoading={isLoadingMore} />}
        </>
      )}

      {deleteDialog.open && deleteDialog.planName && (
        <DeletePlanDialog
          open={deleteDialog.open}
          planName={deleteDialog.planName}
          isDeleting={deleteDialog.isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}
