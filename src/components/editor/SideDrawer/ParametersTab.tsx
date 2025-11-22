import { type ReactNode, useState } from "react";
import type { PlanDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Props dla ParametersTab
 */
export interface ParametersTabProps {
  plan: PlanDto;
  onUpdate: (updates: Partial<PlanDto>) => Promise<void>;
  isUpdating?: boolean;
}

/**
 * ParametersTab - Formularz parametrów planu
 *
 * Pola:
 * - name: Nazwa planu (Input)
 * - orientation: Orientacja 0-359 (Input number)
 * - hemisphere: Półkula (Select: northern/southern)
 * - cell_size_cm: Rozmiar kratki (RadioGroup/Select: 10/25/50/100)
 *
 * Ostrzeżenia:
 * - Zmiana wymiarów/cell_size_cm wymaga regeneracji siatki (409 conflict)
 */
export function ParametersTab({ plan, onUpdate, isUpdating }: ParametersTabProps): ReactNode {
  const [name, setName] = useState(plan.name);
  const [orientation, setOrientation] = useState(plan.orientation.toString());
  const [hemisphere, setHemisphere] = useState<"northern" | "southern">(
    (plan.hemisphere as "northern" | "southern" | null) ?? "northern"
  );
  const [cellSizeCm, setCellSizeCm] = useState(plan.cell_size_cm.toString());

  const hasChanges =
    name !== plan.name ||
    parseInt(orientation) !== plan.orientation ||
    hemisphere !== plan.hemisphere ||
    parseInt(cellSizeCm) !== plan.cell_size_cm;

  const willRegenerateGrid = parseInt(cellSizeCm) !== plan.cell_size_cm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<PlanDto> = {};

    if (name !== plan.name) {
      updates.name = name;
    }

    if (parseInt(orientation) !== plan.orientation) {
      updates.orientation = parseInt(orientation);
    }

    if (hemisphere !== plan.hemisphere) {
      updates.hemisphere = hemisphere;
    }

    if (parseInt(cellSizeCm) !== plan.cell_size_cm) {
      updates.cell_size_cm = parseInt(cellSizeCm);
    }

    if (Object.keys(updates).length > 0) {
      await onUpdate(updates);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Parametry planu</h2>
        <p className="text-sm text-muted-foreground">Edytuj podstawowe parametry planu działki</p>
      </div>

      {/* Warning about grid regeneration */}
      {willRegenerateGrid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm font-medium">Uwaga: Regeneracja siatki</p>
            <p className="text-xs">
              Zmiana rozmiaru kratki spowoduje regenerację siatki i usunięcie wszystkich roślin.
            </p>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="plan-name">Nazwa planu</Label>
          <Input
            id="plan-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mój ogród"
            required
          />
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label htmlFor="plan-orientation">Orientacja (stopnie)</Label>
          <Input
            id="plan-orientation"
            type="number"
            min="0"
            max="359"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Orientacja działki względem północy (0° = północ, 90° = wschód)
          </p>
        </div>

        {/* Hemisphere */}
        <div className="space-y-2">
          <Label htmlFor="plan-hemisphere">Półkula</Label>
          <Select value={hemisphere} onValueChange={(value) => setHemisphere(value as "northern" | "southern")}>
            <SelectTrigger id="plan-hemisphere">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="northern">Północna</SelectItem>
              <SelectItem value="southern">Południowa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cell Size */}
        <div className="space-y-2">
          <Label htmlFor="plan-cell-size">Rozmiar kratki (cm)</Label>
          <Select value={cellSizeCm} onValueChange={setCellSizeCm}>
            <SelectTrigger id="plan-cell-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 cm</SelectItem>
              <SelectItem value="25">25 cm</SelectItem>
              <SelectItem value="50">50 cm</SelectItem>
              <SelectItem value="100">100 cm</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Rozmiar pojedynczej kratki siatki</p>
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={!hasChanges || isUpdating} className="flex-1">
            {isUpdating ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setName(plan.name);
              setOrientation(plan.orientation.toString());
              setHemisphere((plan.hemisphere as "northern" | "southern" | null) ?? "northern");
              setCellSizeCm(plan.cell_size_cm.toString());
            }}
            disabled={!hasChanges}
          >
            Resetuj
          </Button>
        </div>
      </form>
    </div>
  );
}
