import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlanRow } from "./PlanRow";
import type { PlanViewModel } from "@/lib/viewmodels/plan.viewmodel";

interface PlansTableProps {
  plans: PlanViewModel[];
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
}

/**
 * Tabela wyświetlająca listę planów użytkownika z kluczowymi informacjami i akcjami
 */
export function PlansTable({ plans, onEdit, onDelete }: PlansTableProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl border border-green-100 dark:border-gray-700 shadow-xl overflow-hidden"
      role="region"
      aria-label="Lista planów"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 border-b-2 border-green-200 dark:border-gray-700">
            <TableHead scope="col" className="font-bold text-gray-900 dark:text-gray-100">
              Nazwa
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900 dark:text-gray-100">
              Lokalizacja
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900 dark:text-gray-100">
              Rozmiar siatki
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900 dark:text-gray-100">
              Ostatnia modyfikacja
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900 dark:text-gray-100 text-right">
              Akcje
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
