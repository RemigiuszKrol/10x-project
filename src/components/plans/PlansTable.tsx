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
      className="bg-white rounded-2xl border border-green-100 shadow-xl overflow-hidden"
      role="region"
      aria-label="Lista planów"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-100 hover:to-emerald-100 border-b-2 border-green-200">
            <TableHead scope="col" className="font-bold text-gray-900">
              Nazwa
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900">
              Lokalizacja
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900">
              Rozmiar siatki
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900">
              Ostatnia modyfikacja
            </TableHead>
            <TableHead scope="col" className="font-bold text-gray-900 text-right">
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
