import { Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PlanViewModel } from "@/lib/viewmodels/plan.viewmodel";

interface PlanRowProps {
  plan: PlanViewModel;
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
}

/**
 * Pojedynczy wiersz tabeli reprezentujący jeden plan działki
 */
export function PlanRow({ plan, onEdit, onDelete }: PlanRowProps) {
  return (
    <TableRow className="hover:bg-green-50/50 dark:hover:bg-gray-700/50 transition-colors">
      <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
          {plan.location.hasLocation && <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
          <span
            className={
              plan.location.hasLocation ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500 italic"
            }
          >
            {plan.location.displayText}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-300">{plan.gridSize}</TableCell>
      <TableCell className="text-gray-600 dark:text-gray-400 text-sm">{plan.updatedAtDisplay}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(plan.id)}
            aria-label={`Edytuj plan ${plan.name}`}
            className="hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(plan.id)}
            aria-label={`Usuń plan ${plan.name}`}
            className="hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
