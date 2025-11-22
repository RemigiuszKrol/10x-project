/**
 * CellInfoBadge - Badge z informacją o komórce
 *
 * Wyświetla: x, y, typ komórki
 * Color-coded według typu komórki
 */

import { type ReactNode } from "react";
import type { GridCellType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sprout, Navigation, Droplet, Home, Ban } from "lucide-react";
import { GRID_CELL_TYPE_LABELS } from "@/types";

/**
 * Props dla CellInfoBadge
 */
export interface CellInfoBadgeProps {
  x: number;
  y: number;
  type: GridCellType;
}

/**
 * Ikona dla typu komórki
 */
function getCellTypeIcon(type: GridCellType): ReactNode {
  const iconClass = "h-3 w-3";

  switch (type) {
    case "soil":
      return <Sprout className={iconClass} />;
    case "path":
      return <Navigation className={iconClass} />;
    case "water":
      return <Droplet className={iconClass} />;
    case "building":
      return <Home className={iconClass} />;
    case "blocked":
      return <Ban className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
}

/**
 * Wariant koloru dla typu komórki
 */
function getCellTypeVariant(type: GridCellType): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "soil":
      return "default"; // Zielony/primary - OK dla roślin
    case "path":
    case "building":
    case "blocked":
      return "secondary"; // Szary - nie dla roślin
    case "water":
      return "outline"; // Outline - nie dla roślin
    default:
      return "secondary";
  }
}

/**
 * CellInfoBadge component
 */
export function CellInfoBadge({ x, y, type }: CellInfoBadgeProps): ReactNode {
  const typeLabel = GRID_CELL_TYPE_LABELS[type];
  const variant = getCellTypeVariant(type);
  const icon = getCellTypeIcon(type);

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1.5">
        <MapPin className="h-3 w-3" />
        <span>
          x: {x}, y: {y}
        </span>
      </Badge>

      <Badge variant={variant} className="gap-1.5">
        {icon}
        <span>{typeLabel}</span>
      </Badge>
    </div>
  );
}
