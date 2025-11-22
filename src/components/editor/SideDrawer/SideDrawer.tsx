import { type ReactNode } from "react";
import type { DrawerTab, PlanDto, CellPosition, GridCellType } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Leaf, Cloud } from "lucide-react";
import { ParametersTab } from "./ParametersTab";
import { PlantsTab } from "./PlantsTab";
import { WeatherTab } from "./WeatherTab";

/**
 * Props dla SideDrawer
 */
export interface SideDrawerProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  plan: PlanDto;
  onUpdatePlan: (updates: Partial<PlanDto>) => Promise<void>;
  isUpdatingPlan?: boolean;
  selectedCell: CellPosition | null;
  cellType: GridCellType | null;
  onPlantAdded?: () => void;
  onJumpToCell?: (x: number, y: number) => void;
}

/**
 * SideDrawer - Prawy panel edytora z zakładkami
 *
 * Zawiera 3 zakładki:
 * - Parametry: Edycja parametrów planu (nazwa, orientacja, wymiary)
 * - Rośliny: Zarządzanie roślinami (wyszukiwanie, dodawanie, ocena AI)
 * - Pogoda: Dane pogodowe i odświeżanie
 *
 * Layout: Fixed width (w-96), vertical tabs
 */
export function SideDrawer({
  activeTab,
  onTabChange,
  plan,
  onUpdatePlan,
  isUpdatingPlan,
  selectedCell,
  cellType,
  onPlantAdded,
  onJumpToCell,
}: SideDrawerProps): ReactNode {
  return (
    <aside className="flex w-96 flex-col border-l bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as DrawerTab)}
        className="flex h-full flex-col"
      >
        {/* Tabs header */}
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="parameters"
            className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Settings className="h-4 w-4" />
            <span>Parametry</span>
          </TabsTrigger>
          <TabsTrigger
            value="plants"
            className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Leaf className="h-4 w-4" />
            <span>Rośliny</span>
          </TabsTrigger>
          <TabsTrigger
            value="weather"
            className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Cloud className="h-4 w-4" />
            <span>Pogoda</span>
          </TabsTrigger>
        </TabsList>

        {/* Tabs content - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="parameters" className="m-0 h-full p-4">
            <ParametersTab plan={plan} onUpdate={onUpdatePlan} isUpdating={isUpdatingPlan} />
          </TabsContent>

          <TabsContent value="plants" className="m-0 h-full p-4">
            <PlantsTab
              planId={plan.id}
              selectedCell={selectedCell}
              cellType={cellType}
              onPlantAdded={onPlantAdded}
              onJumpToCell={onJumpToCell}
            />
          </TabsContent>

          <TabsContent value="weather" className="m-0 h-full p-4">
            <WeatherTab planId={plan.id} />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
