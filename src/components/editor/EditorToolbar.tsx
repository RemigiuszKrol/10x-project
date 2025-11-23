import { type ReactNode } from "react";
import type { EditorTool } from "@/types";
import { Button } from "@/components/ui/button";
import { MousePointer, Sprout } from "lucide-react";

/**
 * Props dla EditorToolbar
 */
export interface EditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

/**
 * EditorToolbar - Pasek narzędzi edytora
 *
 * Zawiera:
 * - ButtonGroup z narzędziami (select, add_plant)
 * - SaveButton z ikoną i stanem ładowania
 * - Tooltip ostrzegający o braku cofania
 *
 * Narzędzia:
 * - select: Zaznaczanie obszaru
 * - add_plant: Dodawanie rośliny
 */
export function EditorToolbar({ currentTool, onToolChange }: EditorToolbarProps): ReactNode {
  const tools: { value: EditorTool; label: string; icon: ReactNode }[] = [
    { value: "select", label: "Zaznacz", icon: <MousePointer className="h-4 w-4" /> },
    { value: "add_plant", label: "Dodaj roślinę", icon: <Sprout className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Tool buttons */}
      <div className="flex items-center gap-1 rounded-md border bg-muted/50 p-1">
        {tools.map((tool) => (
          <Button
            key={tool.value}
            variant={currentTool === tool.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange(tool.value)}
            className="gap-2"
            title={tool.label}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
