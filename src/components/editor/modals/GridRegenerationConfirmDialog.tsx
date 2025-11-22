import { type ReactNode } from "react";
import type { PlanUpdateCommand } from "@/types";
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
import { AlertTriangle } from "lucide-react";

/**
 * Props dla GridRegenerationConfirmDialog
 */
export interface GridRegenerationConfirmDialogProps {
  isOpen: boolean;
  changes: Partial<PlanUpdateCommand>;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * GridRegenerationConfirmDialog - Modal potwierdzenia regeneracji siatki
 *
 * Wyświetlany po błędzie 409 z PATCH /api/plans/:id
 * gdy zmiana parametrów wymaga regeneracji siatki.
 *
 * Features:
 * - Ostrzeżenie o regeneracji siatki
 * - Ostrzeżenie o utracie wszystkich roślin
 * - Wyświetlenie zmian, które spowodują regenerację
 * - Przyciski: "Anuluj", "Potwierdź i regeneruj"
 *
 * Po potwierdzeniu wywołuje onConfirm, który wykona PATCH z confirm_regenerate=true
 */
export function GridRegenerationConfirmDialog({
  isOpen,
  changes,
  onConfirm,
  onCancel,
}: GridRegenerationConfirmDialogProps): ReactNode {
  // Identyfikacja zmian wymagających regeneracji
  const hasWidthChange = changes.width_cm !== undefined;
  const hasHeightChange = changes.height_cm !== undefined;
  const hasCellSizeChange = changes.cell_size_cm !== undefined;

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Regenerować siatkę?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2 pt-2">
            <p>
              Zmiana następujących parametrów spowoduje <strong>regenerację siatki</strong> i{" "}
              <strong>utratę wszystkich roślin</strong> w planie.
            </p>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">Zmiany wymagające regeneracji:</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {hasWidthChange && <li>• Szerokość działki: {changes.width_cm} cm</li>}
                {hasHeightChange && <li>• Wysokość działki: {changes.height_cm} cm</li>}
                {hasCellSizeChange && <li>• Rozmiar kratki: {changes.cell_size_cm} cm</li>}
              </ul>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-destructive">⚠️ Konsekwencje regeneracji:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Wszystkie rośliny zostaną usunięte</li>
                <li>• Wszystkie typy komórek zostaną zresetowane do &quot;ziemia&quot;</li>
                <li>• Wymiary siatki zostaną przeliczone</li>
                <li>• Historia zmian zostanie zachowana</li>
              </ul>
            </div>
            <p className="text-sm font-medium text-destructive">
              💡 Przed potwierdzeniem rozważ skopiowanie listy roślin z zakładki &quot;Rośliny&quot;.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Potwierdź i regeneruj
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
