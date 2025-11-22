import { useState, useCallback, useRef } from "react";
import type { CellSelection } from "@/types";

/**
 * Propsy hooka useGridSelection
 */
interface UseGridSelectionProps {
  gridWidth: number;
  gridHeight: number;
  enabled: boolean; // aktywny tylko gdy currentTool === 'select'
  onSelectionChange: (selection: CellSelection | null) => void;
  onSelectionComplete?: () => void; // callback po zakończeniu zaznaczania
}

/**
 * Return type hooka useGridSelection
 */
interface UseGridSelectionReturn {
  isDragging: boolean;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  cancelSelection: () => void;
}

/**
 * Hook zarządzający logiką drag-to-select dla siatki planu
 *
 * Obsługuje:
 * - Zaznaczanie prostokątnego obszaru przez przeciąganie myszy
 * - Automatyczną normalizację współrzędnych (min/max)
 * - Clamping do granic siatki
 * - Throttling aktualizacji podczas drag
 * - Integrację z klawiaturą (przez zewnętrzne callbacki)
 *
 * @param props - Konfiguracja hooka
 * @returns Akcje i stan związany z zaznaczaniem
 */
export function useGridSelection({
  gridWidth,
  gridHeight,
  enabled,
  onSelectionChange,
  onSelectionComplete,
}: UseGridSelectionProps): UseGridSelectionReturn {
  const [isDragging, setIsDragging] = useState(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Throttle delay dla updateSelection (50ms)
  const THROTTLE_DELAY = 50;

  /**
   * Clamp współrzędnych do granic siatki
   */
  const clampCoordinate = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: Math.max(0, Math.min(x, gridWidth - 1)),
        y: Math.max(0, Math.min(y, gridHeight - 1)),
      };
    },
    [gridWidth, gridHeight]
  );

  /**
   * Obliczenie znormalizowanego zaznaczenia z dwóch punktów
   */
  const calculateSelection = useCallback(
    (x1: number, y1: number, x2: number, y2: number): CellSelection => {
      const start = clampCoordinate(x1, y1);
      const end = clampCoordinate(x2, y2);

      return {
        x1: Math.min(start.x, end.x),
        y1: Math.min(start.y, end.y),
        x2: Math.max(start.x, end.x),
        y2: Math.max(start.y, end.y),
      };
    },
    [clampCoordinate]
  );

  /**
   * Rozpoczęcie zaznaczania z punktu (x, y)
   */
  const startSelection = useCallback(
    (x: number, y: number) => {
      if (!enabled) return;

      const clamped = clampCoordinate(x, y);
      startPointRef.current = clamped;
      setIsDragging(true);

      // Początkowe zaznaczenie to pojedyncza komórka
      const selection = calculateSelection(clamped.x, clamped.y, clamped.x, clamped.y);
      onSelectionChange(selection);
    },
    [enabled, clampCoordinate, calculateSelection, onSelectionChange]
  );

  /**
   * Aktualizacja zaznaczenia do punktu (x, y) podczas drag
   */
  const updateSelection = useCallback(
    (x: number, y: number) => {
      if (!isDragging || !startPointRef.current || !enabled) return;

      // Throttling - aktualizuj co najwyżej co 50ms
      const now = Date.now();
      if (now - lastUpdateRef.current < THROTTLE_DELAY) {
        return;
      }
      lastUpdateRef.current = now;

      const selection = calculateSelection(startPointRef.current.x, startPointRef.current.y, x, y);
      onSelectionChange(selection);
    },
    [isDragging, enabled, calculateSelection, onSelectionChange]
  );

  /**
   * Zakończenie zaznaczania
   */
  const endSelection = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    startPointRef.current = null;

    // Wywołaj callback
    if (onSelectionComplete) {
      onSelectionComplete();
    }
  }, [isDragging, onSelectionComplete]);

  /**
   * Anulowanie zaznaczania
   */
  const cancelSelection = useCallback(() => {
    setIsDragging(false);
    startPointRef.current = null;
    onSelectionChange(null);
  }, [onSelectionChange]);

  return {
    isDragging,
    startSelection,
    updateSelection,
    endSelection,
    cancelSelection,
  };
}
