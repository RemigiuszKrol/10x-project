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
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * Size mapping
 */
const sizeMap = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * PlantIcon component
 *
 * @example
 * ```tsx
 * <PlantIcon plantName="Pomidor" size="md" />
 * ```
 */
export function PlantIcon({ size = "md" }: PlantIconProps): ReactNode {
  const iconClass = sizeMap[size];

  // Dostosuj padding na podstawie rozmiaru
  const paddingClass = size === "xs" ? "p-0.5" : size === "sm" ? "p-1" : "p-1.5";

  return (
    <div className={`rounded-full bg-green-600/90 ${paddingClass} shadow-sm`}>
      <Leaf className={`${iconClass} text-white`} />
    </div>
  );
}
