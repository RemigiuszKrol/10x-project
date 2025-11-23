import { type ReactNode } from "react";
import type { PlanDto, EditorTool } from "@/types";
import { EditorToolbar } from "./EditorToolbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Props dla EditorTopbar
 */
export interface EditorTopbarProps {
  plan: PlanDto;
  gridWidth: number;
  gridHeight: number;
  cellSizeCm: number;
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  isLoading?: boolean;
}

/**
 * EditorTopbar - Górny pasek edytora
 *
 * Zawiera:
 * - Nazwę planu (h1)
 * - Informacje o siatce (wymiary)
 * - EditorToolbar (środek)
 * - EditorStatusIndicators (prawo) - TODO
 *
 * Layout: flex justify-between
 */
export function EditorTopbar({
  plan,
  gridWidth,
  gridHeight,
  cellSizeCm,
  currentTool,
  onToolChange,
  isLoading,
}: EditorTopbarProps): ReactNode {
  return (
    <header className="border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Back button + Plan name and grid info */}
        <div className="flex min-w-0 flex-shrink items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="flex-shrink-0" aria-label="Wróć do listy planów">
            <a href="/plans">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2">Plany</span>
            </a>
          </Button>

          <div className="min-w-0 border-l pl-3">
            <h1 className="truncate text-xl font-semibold">{plan.name}</h1>
            <p className="text-sm text-muted-foreground">
              Siatka: {gridWidth} × {gridHeight} ({cellSizeCm}cm)
              {isLoading && <span className="ml-2 text-xs">(ładowanie...)</span>}
            </p>
          </div>
        </div>

        {/* Center: Toolbar */}
        <div className="flex-shrink-0">
          <EditorToolbar currentTool={currentTool} onToolChange={onToolChange} />
        </div>

        {/* Right: Status indicators - TODO */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Status: OK</span>
        </div>
      </div>
    </header>
  );
}
