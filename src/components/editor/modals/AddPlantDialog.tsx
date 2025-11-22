/**
 * AddPlantDialog - Modal do dodawania nowej rośliny
 *
 * Przepływ:
 * 1. Wybór zakładki: "Wyszukaj" (AI) lub "Ręcznie"
 * 2. Wyszukaj → wybór kandydata → automatyczne sprawdzenie fit
 * 3. Wyświetlenie scores (jeśli dostępne)
 * 4. Potwierdzenie i zapis
 *
 * Integruje się z useAddPlantFlow hook
 */

import { type ReactNode } from "react";
import { useAddPlantFlow } from "@/lib/hooks/useAddPlantFlow";
import type { CellPosition, GridCellType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Edit3 } from "lucide-react";
import { CellInfoBadge } from "./CellInfoBadge";
import { SearchTab } from "./SearchTab";
import { ManualTab } from "./ManualTab";
import { PlantFitDisplay } from "./PlantFitDisplay";

/**
 * Props dla AddPlantDialog
 */
export interface AddPlantDialogProps {
  isOpen: boolean;
  planId: string;
  cell: CellPosition;
  cellType: GridCellType;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * AddPlantDialog component
 *
 * @example
 * ```tsx
 * <AddPlantDialog
 *   isOpen={isDialogOpen}
 *   planId={planId}
 *   cell={{ x: 3, y: 7 }}
 *   cellType="soil"
 *   onSuccess={() => {
 *     setIsDialogOpen(false);
 *     toast.success('Dodano roślinę');
 *   }}
 *   onCancel={() => setIsDialogOpen(false)}
 * />
 * ```
 */
export function AddPlantDialog({
  isOpen,
  planId,
  cell,
  cellType,
  onSuccess,
  onCancel,
}: AddPlantDialogProps): ReactNode {
  const { state, actions } = useAddPlantFlow({
    planId,
    cell,
    onSuccess,
  });

  /**
   * Handler zamknięcia dialogu
   */
  const handleClose = () => {
    if (!state.isSubmitting) {
      actions.cancel();
      onCancel();
    }
  };

  /**
   * Handler zmiany zakładki
   */
  const handleTabChange = (value: string) => {
    if (value === "manual") {
      actions.switchToManualTab();
    } else {
      actions.switchToSearchTab();
    }
  };

  /**
   * Czy przycisk "Dodaj roślinę" powinien być aktywny
   */
  const canConfirm =
    (state.selectedCandidate !== null || state.manualName.trim().length > 0) &&
    (state.step === "fit_ready" || state.step === "manual") &&
    !state.isFitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Dodaj roślinę</DialogTitle>
          <DialogDescription>Wybierz roślinę do posadzenia na wybranym polu</DialogDescription>
          <CellInfoBadge x={cell.x} y={cell.y} type={cellType} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs value={state.activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                <span>Wyszukaj AI</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Edit3 className="h-4 w-4" />
                <span>Ręcznie</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4 space-y-4">
              <SearchTab state={state} actions={actions} />
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <ManualTab state={state} actions={actions} />
            </TabsContent>
          </Tabs>

          {/* PlantFitDisplay - wyświetlany gdy fit jest gotowy */}
          {(state.step === "fit_ready" || state.step === "fit_loading") && (
            <div className="mt-6">
              <PlantFitDisplay fitResult={state.fitResult} isLoading={state.isFitting} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={state.isSubmitting}>
            Anuluj
          </Button>

          {/* Przycisk "Pomiń ocenę" - tylko gdy timeout fit */}
          {state.error?.type === "timeout" && state.error.context === "fit" && (
            <Button variant="secondary" onClick={actions.skipFit} disabled={state.isSubmitting}>
              Dodaj bez oceny
            </Button>
          )}

          {/* Główny przycisk "Dodaj roślinę" */}
          <Button onClick={actions.confirmAdd} disabled={!canConfirm || state.isSubmitting}>
            {state.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dodaj roślinę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
