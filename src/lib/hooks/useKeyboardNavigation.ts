import { useEffect } from "react";
import type { CellPosition } from "@/types";

/**
 * Props dla hooka useKeyboardNavigation
 */
export interface UseKeyboardNavigationProps {
  gridWidth: number;
  gridHeight: number;
  focusedCell: CellPosition | null;
  onFocusChange: (cell: CellPosition | null) => void;
  onConfirmSelection?: () => void;
  onCancelSelection?: () => void;
  enabled?: boolean;
}

/**
 * Hook do obsługi nawigacji klawiaturą po siatce
 *
 * Skróty klawiaturowe:
 * - Arrow keys: Nawigacja po komórkach
 * - Enter: Potwierdzenie zaznaczenia
 * - Escape: Anulowanie zaznaczenia
 * - Space: Rozpoczęcie zaznaczania (TODO w przyszłości)
 * - Shift + Arrow: Rozszerzanie zaznaczenia (TODO w przyszłości)
 *
 * @param props - Konfiguracja nawigacji
 */
export function useKeyboardNavigation({
  gridWidth,
  gridHeight,
  focusedCell,
  onFocusChange,
  onConfirmSelection,
  onCancelSelection,
  enabled = true,
}: UseKeyboardNavigationProps): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoruj jeśli użytkownik pisze w input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Jeśli nie ma focusowanej komórki, tylko obsługuj Escape
      if (!focusedCell) {
        if (e.key === "Escape" && onCancelSelection) {
          e.preventDefault();
          onCancelSelection();
        }
        return;
      }

      const { x, y } = focusedCell;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (y > 0) {
            onFocusChange({ x, y: y - 1 });
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (y < gridHeight - 1) {
            onFocusChange({ x, y: y + 1 });
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (x > 0) {
            onFocusChange({ x: x - 1, y });
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (x < gridWidth - 1) {
            onFocusChange({ x: x + 1, y });
          }
          break;

        case "Enter":
          e.preventDefault();
          if (onConfirmSelection) {
            onConfirmSelection();
          }
          break;

        case "Escape":
          e.preventDefault();
          if (onCancelSelection) {
            onCancelSelection();
          }
          // Usuń focus
          onFocusChange(null);
          break;

        // TODO: Space - rozpoczęcie zaznaczania
        // TODO: Shift + Arrow - rozszerzanie zaznaczenia
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, focusedCell, gridWidth, gridHeight, onFocusChange, onConfirmSelection, onCancelSelection]);
}
