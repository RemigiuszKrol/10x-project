/**
 * CellNotSoilDialog - Ostrzeżenie że rośliny można dodawać tylko na ziemi
 *
 * Prosty informacyjny dialog wyświetlany gdy użytkownik próbuje
 * dodać roślinę na pole które nie jest typu 'soil'
 */

import { type ReactNode } from "react";
import type { GridCellType } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { GRID_CELL_TYPE_LABELS } from "@/types";

/**
 * Props dla CellNotSoilDialog
 */
export interface CellNotSoilDialogProps {
  isOpen: boolean;
  cellType: GridCellType;
  onClose: () => void;
}

/**
 * CellNotSoilDialog component
 */
export function CellNotSoilDialog({ isOpen, cellType, onClose }: CellNotSoilDialogProps): ReactNode {
  const typeLabel = GRID_CELL_TYPE_LABELS[cellType];

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-warning">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle>Nieprawidłowy typ pola</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>Rośliny można dodawać tylko na pola typu &quot;Ziemia&quot;.</p>
            <p className="text-sm">
              Zaznaczone pole to: <strong>{typeLabel}</strong>
            </p>
            <p className="text-sm text-muted-foreground">Wybierz pole typu &quot;Ziemia&quot; aby dodać roślinę.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Rozumiem</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
