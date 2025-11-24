/**
 * DeletePlantConfirmDialog - Potwierdzenie usunięcia rośliny
 *
 * Wyświetla informacje o roślinie (nazwa, pozycja) i prosi o potwierdzenie
 * przed usunięciem
 */

import { type ReactNode } from "react";
import type { PlantPlacementDto } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, MapPin, Sprout } from "lucide-react";
import { Loader2 } from "lucide-react";

/**
 * Props dla DeletePlantConfirmDialog
 */
export interface DeletePlantConfirmDialogProps {
  isOpen: boolean;
  plant: PlantPlacementDto;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * DeletePlantConfirmDialog component
 */
export function DeletePlantConfirmDialog({
  isOpen,
  plant,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeletePlantConfirmDialogProps): ReactNode {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-destructive">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle>Usuń roślinę</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <div>Czy na pewno chcesz usunąć tę roślinę?</div>

            {/* Info o roślinie */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <Sprout className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold">{plant.plant_name}</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      Pozycja: x: {plant.x + 1}, y: {plant.y + 1}
                    </span>
                  </div>
                  {plant.overall_score !== null && (
                    <div className="text-xs text-muted-foreground">Ocena dopasowania: {plant.overall_score}/5</div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">Ta operacja jest nieodwracalna.</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isDeleting}>
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Usuwanie...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
