import { useState } from "react";
import type { CellSelection, GridCellType } from "@/types";
import { GRID_CELL_TYPE_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/utils/logger";

/**
 * Propsy komponentu AreaTypePanel
 */
interface AreaTypePanelProps {
  selection: CellSelection;
  cellCount: number; // liczba komórek w zaznaczeniu
  onApply: (type: GridCellType) => Promise<void>;
  onCancel: () => void;
  isApplying: boolean;
}

/**
 * Komponent floating panel do wyboru typu dla zaznaczonego obszaru
 *
 * Wyświetla:
 * - Informację o zaznaczeniu (liczba komórek i wymiary)
 * - Dropdown z typami komórek
 * - Przycisk "Zastosuj" (disabled gdy nie wybrano typu lub trwa operacja)
 * - Przycisk "Anuluj"
 *
 * Pozycjonowanie:
 * - Absolute positioned top-4 right-4 nad GridCanvas
 * - Card z shadow dla wyraźności
 *
 * @param props - Parametry panelu
 */
export function AreaTypePanel({ selection, cellCount, onApply, onCancel, isApplying }: AreaTypePanelProps) {
  const [selectedType, setSelectedType] = useState<GridCellType | null>(null);

  // Oblicz wymiary zaznaczenia
  const width = selection.x2 - selection.x1 + 1;
  const height = selection.y2 - selection.y1 + 1;

  // Handler dla zastosowania typu
  const handleApply = async () => {
    if (!selectedType || isApplying) return;

    try {
      await onApply(selectedType);
      // Po sukcesie parent wyczyści zaznaczenie i zamknie panel
    } catch (error) {
      // Błędy obsługiwane w parent (useAreaTypeWithConfirmation)
      if (error instanceof Error) {
        logger.error("Błąd podczas zastosowania typu obszaru", { error: error.message, selectedType });
      } else {
        logger.error("Nieoczekiwany błąd podczas zastosowania typu obszaru", { error: String(error), selectedType });
      }
    }
  };

  return (
    <div
      className="fixed top-28 right-14 z-[1001] bg-background border-2 border-green-500 rounded-lg shadow-lg p-4 w-80 animate-in slide-in-from-right-5 duration-200"
      role="dialog"
      aria-label="Panel wyboru typu obszaru"
    >
      {/* Info o zaznaczeniu */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-1">Zmiana typu obszaru</h3>
        <p className="text-sm text-muted-foreground">
          Zaznaczono <span className="font-medium">{cellCount}</span> {cellCount === 1 ? "komórkę" : "komórek"} ({width}
          ×{height})
        </p>
      </div>

      {/* Selektor typu */}
      <div className="mb-4">
        <label htmlFor="area-type-select" className="text-sm font-medium mb-2 block">
          Nowy typ:
        </label>
        <Select value={selectedType ?? undefined} onValueChange={(value) => setSelectedType(value as GridCellType)}>
          <SelectTrigger id="area-type-select" className="w-full">
            <SelectValue placeholder="Wybierz typ..." />
          </SelectTrigger>
          <SelectContent className="z-[2000]">
            {Object.entries(GRID_CELL_TYPE_LABELS).map(([type, label]) => (
              <SelectItem key={type} value={type}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Przyciski akcji */}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isApplying} className="flex-1">
          Anuluj
        </Button>
        <Button onClick={handleApply} disabled={!selectedType || isApplying} className="flex-1">
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Zastosowanie...
            </>
          ) : (
            "Zastosuj"
          )}
        </Button>
      </div>

      {/* Aria live region dla screen readers */}
      {isApplying && (
        <div className="sr-only" role="status" aria-live="polite">
          Trwa zmiana typu komórek...
        </div>
      )}
    </div>
  );
}
