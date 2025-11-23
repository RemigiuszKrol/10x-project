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
import type { CellSelection, GridCellType } from "@/types";
import { GRID_CELL_TYPE_LABELS } from "@/types";

/**
 * Propsy komponentu AreaTypeConfirmDialog
 */
interface AreaTypeConfirmDialogProps {
  isOpen: boolean;
  plantsCount: number;
  area: CellSelection;
  targetType: GridCellType;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Modal potwierdzenia usunięcia roślin przy zmianie typu obszaru
 *
 * Wyświetlany gdy:
 * - API zwraca błąd 409 Conflict (rośliny w obszarze)
 * - Użytkownik próbuje zmienić typ obszaru z roślinami
 *
 * Funkcjonalność:
 * - Informuje o liczbie roślin do usunięcia
 * - Pokazuje wymiary obszaru
 * - Umożliwia potwierdzenie lub anulowanie operacji
 *
 * @param props - Parametry dialogu
 */
export function AreaTypeConfirmDialog({
  isOpen,
  plantsCount,
  area,
  targetType,
  onConfirm,
  onCancel,
}: AreaTypeConfirmDialogProps) {
  // Oblicz wymiary obszaru
  const width = area.x2 - area.x1 + 1;
  const height = area.y2 - area.y1 + 1;
  const cellCount = width * height;

  // Nazwa typu docelowego
  const typeLabel = GRID_CELL_TYPE_LABELS[targetType];

  // Tekst dopasowany do liczby roślin
  const plantsText = plantsCount === 1 ? "roślinę" : plantsCount < 5 ? "rośliny" : "roślin";

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć rośliny?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>
              Zmiana typu na <span className="font-semibold">{typeLabel}</span> w zaznaczonym obszarze ({width}×{height}
              , {cellCount} {cellCount === 1 ? "komórka" : "komórek"}) spowoduje usunięcie{" "}
              <span className="font-semibold text-destructive">
                {plantsCount} {plantsText}
              </span>
              .
            </div>
            <div className="text-sm">Czy chcesz kontynuować?</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Potwierdź i usuń
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
