import { type ReactNode, useState } from "react";
import type {
  PlanDto,
  GridMetadataDto,
  GridCellDto,
  OperationLogEntry,
  DrawerTab,
  PlanUpdateCommand,
  GridCellType,
} from "@/types";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";
import { useGridEditor } from "@/lib/hooks/useGridEditor";
import { useKeyboardNavigation } from "@/lib/hooks/useKeyboardNavigation";
import { useAreaTypeWithConfirmation } from "@/lib/hooks/useAreaTypeWithConfirmation";
import { useAnalytics, createAreaTypedEvent } from "@/lib/hooks/useAnalytics";
import { GridCanvas } from "./GridCanvas/GridCanvas";
import { EditorTopbar } from "./EditorTopbar";
import { BottomPanel } from "./BottomPanel";
import { SideDrawer } from "./SideDrawer/SideDrawer";
import { AreaTypePanel } from "./AreaTypePanel";
import { GridRegenerationConfirmDialog } from "./modals/GridRegenerationConfirmDialog";
import { AreaTypeConfirmDialog } from "./modals/AreaTypeConfirmDialog";
import { toast } from "sonner";

/**
 * Props dla głównego komponentu EditorLayout
 */
export interface EditorLayoutProps {
  initialPlan: PlanDto;
  initialGridMetadata: GridMetadataDto;
  initialCells: GridCellDto[];
}

/**
 * EditorLayout - Główny komponent React zarządzający widokiem edytora planu
 *
 * Odpowiedzialności:
 * - Zarządzanie stanem edytora (via useGridEditor hook)
 * - Integracja z React Query
 * - Obsługa skrótów klawiaturowych globalnych (Escape, Delete)
 * - Layout z topbar, canvas, drawer, bottom panel
 * - Responsive handling (window resize)
 *
 * Struktura:
 * - EditorTopbar (nazwa planu, toolbar, status)
 * - GridCanvas (centralna siatka)
 * - SideDrawer (prawy panel z zakładkami)
 * - BottomPanel (log operacji, status bar)
 * - Modals (confirmation dialogs)
 */
export function EditorLayout({ initialPlan, initialGridMetadata, initialCells }: EditorLayoutProps): ReactNode {
  return (
    <QueryProvider>
      <ToastProvider>
        <EditorContent
          initialPlan={initialPlan}
          initialGridMetadata={initialGridMetadata}
          initialCells={initialCells}
        />
      </ToastProvider>
    </QueryProvider>
  );
}

/**
 * Wewnętrzny komponent z logiką edytora (musi być wewnątrz QueryProvider)
 */
function EditorContent({ initialPlan, initialGridMetadata, initialCells }: EditorLayoutProps): ReactNode {
  // Centralny hook zarządzający stanem edytora
  const editor = useGridEditor(initialPlan.id, initialPlan, initialGridMetadata);

  // Stan dla save operation
  const [isSaving, setIsSaving] = useState(false);

  // Stan aktywnej zakładki w SideDrawer
  const [activeTab, setActiveTab] = useState<DrawerTab>("parameters");

  // Stan dla update plan
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Stan dla modalu regeneracji siatki
  const [regenerationDialog, setRegenerationDialog] = useState<{
    isOpen: boolean;
    changes: Partial<PlanUpdateCommand>;
  }>({
    isOpen: false,
    changes: {},
  });

  // Hook do wysyłania analytics events
  const analytics = useAnalytics();

  // Hook dla zmiany typu obszaru z obsługą 409 confirmation
  const areaTypeHandler = useAreaTypeWithConfirmation({
    planId: initialPlan.id,
    onSuccess: async (result, options) => {
      // Toast sukcesu
      const message =
        result.removed_plants > 0
          ? `Zmieniono typ ${result.affected_cells} komórek i usunięto ${result.removed_plants} roślin`
          : `Zmieniono typ ${result.affected_cells} komórek`;

      toast.success(message);

      // Wyślij analytics event
      try {
        await analytics.sendEvent(
          createAreaTypedEvent(initialPlan.id, {
            area: options.selection,
            type: options.type,
            affected_cells: result.affected_cells,
            removed_plants: result.removed_plants,
          })
        );
      } catch {
        // Graceful failure - nie przerywaj głównego flow
      }

      // Wyczyść zaznaczenie
      editor.actions.clearSelection();
    },
  });

  // Mock operation log (TODO: integrate with real operations)
  const [operations] = useState<OperationLogEntry[]>([
    {
      id: "1",
      timestamp: new Date().toISOString(),
      message: "Edytor załadowany pomyślnie",
      type: "success",
    },
  ]);

  // Hook obsługi nawigacji klawiaturą
  useKeyboardNavigation({
    gridWidth: (editor.gridMetadata?.grid_width ?? initialGridMetadata.grid_width) || 0,
    gridHeight: (editor.gridMetadata?.grid_height ?? initialGridMetadata.grid_height) || 0,
    focusedCell: editor.state.focusedCell,
    onFocusChange: editor.actions.focusCell,
    onConfirmSelection: () => {
      // Akcja potwierdzenia - jeśli jest AreaTypePanel otwarty, fokus na nim
      // Panel sam obsłuży Enter
    },
    onCancelSelection: () => {
      // Anulowanie zaznaczenia
      editor.actions.clearSelection();
    },
    enabled: true,
  });

  // Handler zastosowania typu dla zaznaczonego obszaru
  const handleApplyAreaType = async (type: GridCellType) => {
    if (!editor.state.selectedArea) return;

    await areaTypeHandler.setAreaType({
      selection: editor.state.selectedArea,
      type,
      confirmPlantRemoval: false,
    });
  };

  // Obsługa błędów ładowania
  if (editor.isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Błąd ładowania edytora</p>
          <p className="mt-2 text-sm text-muted-foreground">Spróbuj odświeżyć stronę</p>
        </div>
      </div>
    );
  }

  // Handler zapisu zmian (TODO: implementacja rzeczywistego zapisu)
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implementacja zapisu komórek siatki
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock delay
      // eslint-disable-next-line no-console
      console.log("Zapisywanie zmian...");
    } finally {
      setIsSaving(false);
    }
  };

  // Handler aktualizacji planu
  const handleUpdatePlan = async (updates: Partial<PlanDto>, confirmRegenerate = false) => {
    setIsUpdatingPlan(true);

    // Konwersja null -> undefined dla latitude/longitude/hemisphere (PlanDto używa null, PlanCreateCommand używa undefined)
    const commandUpdates = {
      ...updates,
      latitude: updates.latitude === null ? undefined : updates.latitude,
      longitude: updates.longitude === null ? undefined : updates.longitude,
      hemisphere: updates.hemisphere === null ? undefined : updates.hemisphere,
    };

    try {
      await editor.actions.updatePlan({
        command: commandUpdates,
        query: confirmRegenerate ? { confirm_regenerate: true } : undefined,
      });

      // Sukces - zamknij modal jeśli był otwarty i pokaż toast
      setRegenerationDialog({ isOpen: false, changes: {} });

      if (confirmRegenerate) {
        toast.success("Siatka została zregenerowana", {
          description: "Wszystkie rośliny zostały usunięte. Możesz teraz dodać je ponownie.",
        });
      } else {
        toast.success("Plan zaktualizowany", {
          description: "Zmiany zostały zapisane pomyślnie.",
        });
      }
    } catch (error) {
      // Sprawdź czy to błąd 409 (wymaga potwierdzenia)
      if (error instanceof Error && (error as Error & { requiresConfirmation?: boolean }).requiresConfirmation) {
        // Otwórz modal potwierdzenia (używamy skonwertowanych wartości)
        setRegenerationDialog({
          isOpen: true,
          changes: commandUpdates,
        });
      } else {
        // Inny błąd - pokaż toast i zostaw obsługę dla mutation
        if (error instanceof Error) {
          toast.error("Nie udało się zaktualizować planu", {
            description: error.message,
          });
        }
      }
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Handler potwierdzenia regeneracji
  const handleConfirmRegeneration = async () => {
    await handleUpdatePlan(regenerationDialog.changes, true);
  };

  // Handler anulowania regeneracji
  const handleCancelRegeneration = () => {
    setRegenerationDialog({ isOpen: false, changes: {} });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Topbar */}
      <EditorTopbar
        plan={editor.plan || initialPlan}
        gridWidth={(editor.gridMetadata?.grid_width ?? initialGridMetadata.grid_width) || 0}
        gridHeight={(editor.gridMetadata?.grid_height ?? initialGridMetadata.grid_height) || 0}
        cellSizeCm={(editor.gridMetadata?.cell_size_cm ?? initialGridMetadata.cell_size_cm) || 0}
        currentTool={editor.state.currentTool}
        onToolChange={editor.actions.setTool}
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={editor.state.hasUnsavedChanges}
        isLoading={editor.isLoading}
      />

      {/* Main content area - Canvas + Drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="relative flex-1 overflow-hidden bg-muted/20">
          <GridCanvas
            gridMetadata={editor.gridMetadata || initialGridMetadata}
            cells={editor.cells.data?.data || initialCells}
            plants={editor.plants.data?.data || []} // NOWE: Przekazanie roślin
            currentTool={editor.state.currentTool}
            selectedArea={editor.state.selectedArea}
            focusedCell={editor.state.focusedCell}
            onCellClick={(x, y) => {
              // Prosta logika - kliknięcie zmienia focus
              editor.actions.focusCell({ x, y });
            }}
            onSelectionChange={editor.actions.selectArea}
            onSelectionComplete={() => {
              // Po zakończeniu zaznaczania, automatycznie otwiera się AreaTypePanel
            }}
          />

          {/* Area Type Panel - wyświetlany gdy jest zaznaczenie i tool = select */}
          {editor.derived.hasActiveSelection &&
            editor.state.currentTool === "select" &&
            editor.derived.selectionInfo && (
              <AreaTypePanel
                selection={editor.derived.selectionInfo.selection}
                cellCount={editor.derived.selectionInfo.cellCount}
                onApply={handleApplyAreaType}
                onCancel={editor.actions.clearSelection}
                isApplying={areaTypeHandler.isLoading}
              />
            )}
        </div>

        {/* Side drawer */}
        <SideDrawer
          activeTab={activeTab}
          onTabChange={setActiveTab}
          plan={editor.plan || initialPlan}
          onUpdatePlan={handleUpdatePlan}
          isUpdatingPlan={isUpdatingPlan}
          selectedCell={editor.state.focusedCell}
          cellType={
            editor.state.focusedCell
              ? editor.cells.data?.data.find(
                  (cell) => cell.x === editor.state.focusedCell?.x && cell.y === editor.state.focusedCell?.y
                )?.type || null
              : null
          }
          onPlantAdded={() => {
            // Opcjonalnie: switch to plants list tab po dodaniu
            // setActiveTab("plants");
          }}
          onJumpToCell={editor.actions.jumpToCell} // NOWE: Przekazanie jumpToCell
        />
      </div>

      {/* Bottom panel */}
      <BottomPanel
        operations={operations}
        plantsCount={editor.plants.data?.data.length || 0}
        selectedCellsCount={editor.derived.selectedCellsCount}
        aiStatus="idle"
        weatherStatus="idle"
      />

      {/* Modals */}
      <GridRegenerationConfirmDialog
        isOpen={regenerationDialog.isOpen}
        changes={regenerationDialog.changes}
        onConfirm={handleConfirmRegeneration}
        onCancel={handleCancelRegeneration}
      />

      {/* Area Type Confirmation Dialog - dla usuwania roślin */}
      {areaTypeHandler.pendingOperation && (
        <AreaTypeConfirmDialog
          isOpen={true}
          plantsCount={areaTypeHandler.pendingOperation.plantsCount}
          area={areaTypeHandler.pendingOperation.selection}
          targetType={areaTypeHandler.pendingOperation.targetType}
          onConfirm={areaTypeHandler.confirmOperation}
          onCancel={areaTypeHandler.cancelOperation}
        />
      )}
    </div>
  );
}
