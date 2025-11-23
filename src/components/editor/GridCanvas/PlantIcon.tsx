/**
 * PlantIcon - Ikona rośliny wyświetlana na komórce w GridCanvas
 *
 * Features:
 * - Icon rośliny (Leaf z lucide-react)
 * - Tooltip z nazwą rośliny
 * - Responsive size zależnie od cellSize
 * - Centered overlay na komórce
 */

import { type ReactNode } from "react";
import { Leaf } from "lucide-react";

/**
 * Props dla PlantIcon
 */
export interface PlantIconProps {
  plantName: string;
  cellSize?: number; // Rozmiar komórki w pikselach (dla responsywnego skalowania)
  size?: "xs" | "sm" | "md" | "lg"; // Deprecated: używaj cellSize zamiast tego
}

/**
 * Size mapping (dla backward compatibility)
 */
const sizeMap = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Minimalna wielkość ikony (obecny rozmiar xs = 12px)
 */
const MIN_ICON_SIZE = 12; // px

/**
 * PlantIcon component
 *
 * Responsywne skalowanie:
 * - Nie mniejsza niż obecnie (12px)
 * - Nie mniejsza niż 30% rozmiaru komórki
 *
 * @example
 * ```tsx
 * <PlantIcon plantName="Pomidor" cellSize={24} />
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PlantIcon({ plantName: _plantName, cellSize, size }: PlantIconProps): ReactNode {
  // Oblicz responsywny rozmiar ikony
  let iconSizePx: number;
  let iconClass: string;
  let paddingClass: string;

  if (cellSize !== undefined) {
    // Oblicz docelowy rozmiar: 30% komórki
    const targetSize = cellSize * 0.3;
    // Użyj większej wartości: minimalna (12px) lub 60% komórki
    iconSizePx = Math.max(MIN_ICON_SIZE, targetSize);

    // Użyj inline style dla dokładnego rozmiaru
    iconClass = "";
    paddingClass = "";
  } else {
    // Fallback do starego systemu size (backward compatibility)
    const sizeKey = size || "md";
    iconClass = sizeMap[sizeKey];
    paddingClass = sizeKey === "xs" ? "p-0.5" : sizeKey === "sm" ? "p-1" : "p-1.5";
    iconSizePx = 0; // Nie używamy inline style
  }

  return (
    <div
      className={`rounded-full bg-green-600/90 ${paddingClass} shadow-sm`}
      style={
        cellSize !== undefined
          ? {
              padding: `${Math.max(2, Math.floor(iconSizePx * 0.25))}px`,
            }
          : undefined
      }
    >
      <Leaf
        className={`${iconClass} text-white`}
        style={
          cellSize !== undefined
            ? {
                width: `${iconSizePx}px`,
                height: `${iconSizePx}px`,
              }
            : undefined
        }
      />
    </div>
  );
}
