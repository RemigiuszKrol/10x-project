import { type ReactNode } from "react";
import type { EditorTool } from "@/types";
import { Button } from "@/components/ui/button";
import { Save, MousePointer, Sprout, PaintBucket } from "lucide-react";

/**
 * Props dla EditorToolbar
 */
export interface EditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

/**
 * EditorToolbar - Pasek narzędzi edytora
 *
 * Zawiera:
 * - ButtonGroup z narzędziami (select, add_plant, change_type)
 * - SaveButton z ikoną i stanem ładowania
 * - Tooltip ostrzegający o braku cofania
 *
 * Narzędzia:
 * - select: Zaznaczanie obszaru
 * - add_plant: Dodawanie rośliny
 * - change_type: Zmiana typu komórek
 */
export function EditorToolbar({
  currentTool,
  onToolChange,
  onSave,
  isSaving,
  hasUnsavedChanges,
}: EditorToolbarProps): ReactNode {
  const tools: { value: EditorTool; label: string; icon: ReactNode }[] = [
    { value: "select", label: "Zaznacz", icon: <MousePointer className="h-4 w-4" /> },
    { value: "add_plant", label: "Dodaj roślinę", icon: <Sprout className="h-4 w-4" /> },
    { value: "change_type", label: "Zmień typ", icon: <PaintBucket className="h-4 w-4" /> },
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

      {/* Save button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={isSaving || !hasUnsavedChanges}
        className="gap-2"
        title={hasUnsavedChanges ? "Zapisz zmiany (brak możliwości cofnięcia)" : "Brak zmian do zapisania"}
      >
        <Save className="h-4 w-4" />
        <span className="hidden sm:inline">{isSaving ? "Zapisywanie..." : "Zapisz"}</span>
      </Button>

      {/* Warning tooltip indicator */}
      {hasUnsavedChanges && (
        <span
          className="text-xs text-muted-foreground"
          title="Brak możliwości cofnięcia - potwierdź operacje przed zapisem"
        >
          ⚠️ Niezapisane zmiany
        </span>
      )}
    </div>
  );
}
