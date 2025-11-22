/**
 * ManualTab - Zakładka ręcznego dodawania rośliny
 *
 * Zawiera:
 * - Input dla nazwy rośliny
 * - Info tooltip o tym że nie będzie oceny dopasowania
 * - Walidacja inline
 */

import { type ReactNode } from "react";
import type { AddPlantDialogState } from "@/types";
import type { AddPlantFlowActions } from "@/lib/hooks/useAddPlantFlow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Sprout } from "lucide-react";

/**
 * Props dla ManualTab
 */
export interface ManualTabProps {
  state: AddPlantDialogState;
  actions: AddPlantFlowActions;
}

/**
 * ManualTab component
 */
export function ManualTab({ state, actions }: ManualTabProps): ReactNode {
  return (
    <div className="space-y-4">
      {/* Info alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Dodając roślinę ręcznie, nie otrzymasz oceny dopasowania od AI. Będziesz mógł ją dodać później używając
          wyszukiwania AI.
        </AlertDescription>
      </Alert>

      {/* Formularz */}
      <div className="space-y-2">
        <Label htmlFor="plant-name">Nazwa rośliny</Label>
        <div className="relative">
          <Sprout className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="plant-name"
            type="text"
            placeholder="np. Pomidor"
            value={state.manualName}
            onChange={(e) => actions.setManualName(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">Wpisz dokładną nazwę rośliny, którą chcesz posadzić</p>
      </div>

      {/* Przykłady */}
      <div className="rounded-lg bg-muted/50 p-4">
        <h4 className="mb-2 text-sm font-medium">Przykładowe nazwy:</h4>
        <div className="flex flex-wrap gap-2">
          {["Pomidor", "Bazylia", "Truskawka", "Marchew", "Sałata"].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => actions.setManualName(example)}
              className="rounded-md bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
