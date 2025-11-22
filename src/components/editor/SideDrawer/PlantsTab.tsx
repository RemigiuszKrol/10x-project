import { type ReactNode, useState } from "react";
import type { CellPosition, GridCellType } from "@/types";
import { PlantsList } from "./PlantsList";
import { PlantSearchForm } from "./PlantSearchForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Search } from "lucide-react";

/**
 * Props dla PlantsTab
 */
export interface PlantsTabProps {
  planId: string;
  selectedCell: CellPosition | null;
  cellType: GridCellType | null;
  onPlantAdded?: () => void;
  onJumpToCell?: (x: number, y: number) => void;
}

/**
 * PlantsTab - Zakładka zarządzania roślinami
 *
 * Zawiera:
 * - Zakładkę "Lista" z istniejącymi roślinami w planie (PlantsList)
 * - Zakładkę "Wyszukaj" z wyszukiwarką AI i formularzem dodawania (PlantSearchForm)
 *
 * Features:
 * - Przełączanie między zakładkami
 * - Przekazywanie callbacków do komponentów potomnych
 * - Jump to cell w GridCanvas
 *
 * Layout: Vertical tabs z scrollable content
 */
export function PlantsTab({ planId, selectedCell, cellType, onPlantAdded, onJumpToCell }: PlantsTabProps): ReactNode {
  const [activeSubTab, setActiveSubTab] = useState<"list" | "search">("list");

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Rośliny</h2>
        <p className="text-sm text-muted-foreground">Zarządzaj roślinami w planie działki</p>
      </div>

      <Tabs
        value={activeSubTab}
        onValueChange={(value) => setActiveSubTab(value as "list" | "search")}
        className="flex h-full flex-col"
      >
        <TabsList className="w-full">
          <TabsTrigger value="list" className="flex-1 gap-2">
            <List className="h-4 w-4" />
            <span>Lista</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 gap-2">
            <Search className="h-4 w-4" />
            <span>Wyszukaj</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 flex-1">
          <PlantsList planId={planId} onJumpToCell={onJumpToCell} />
        </TabsContent>

        <TabsContent value="search" className="mt-4 flex-1 space-y-4">
          <PlantSearchForm
            planId={planId}
            selectedCell={selectedCell}
            cellType={cellType}
            onPlantAdded={onPlantAdded}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
