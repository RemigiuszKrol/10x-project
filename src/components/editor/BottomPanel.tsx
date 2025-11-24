import { type ReactNode, useState } from "react";
import type { OperationLogEntry } from "@/types";
import { Button } from "@/components/ui/button";

/**
 * Props dla BottomPanel
 */
export interface BottomPanelProps {
  operations: OperationLogEntry[];
  plantsCount: number;
  selectedCellsCount: number;
  aiStatus: "idle" | "searching" | "fitting" | "error";
  weatherStatus: "idle" | "loading" | "error" | "stale";
}

/**
 * BottomPanel - Dolny panel statusu edytora
 *
 * Zawiera:
 * - OperationLog: Lista ostatnich operacji (max 10) z aria-live
 * - StatusBar: Wskaźniki liczby roślin, zaznaczonych komórek, status AI/погоды
 *
 * Layout: flex justify-between
 */
export function BottomPanel({
  operations,
  plantsCount,
  selectedCellsCount,
  aiStatus,
  weatherStatus,
}: BottomPanelProps): ReactNode {
  const [showLog, setShowLog] = useState(false);
  // Pokaż ostatnie 5 operacji
  const recentOperations = operations.slice(-5).reverse();

  return (
    <footer className="border-t bg-background">
      {/* Operation log - aria-live dla screen readers */}
      {showLog && (
        <div id="operation-log" className="border-b px-4 py-2" role="log" aria-live="polite" aria-atomic="false">
          {recentOperations.length > 0 ? (
            <div className="space-y-1">
              {recentOperations.map((op) => (
                <div key={op.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{new Date(op.timestamp).toLocaleTimeString()}</span>
                  <span className={getOperationTypeColor(op.type)}>{getOperationTypeIcon(op.type)}</span>
                  <span className={op.type === "error" ? "text-destructive" : "text-foreground"}>{op.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Brak ostatnich operacji</p>
          )}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLog(!showLog)}
            className="text-xs h-7 border border-primary dark:border-primary"
            aria-expanded={showLog}
            aria-controls="operation-log"
          >
            {showLog ? "Ukryj ostatnie zmiany" : "Pokaż ostatnie zmiany"}
          </Button>
          <span title="Liczba roślin w planie">🌱 Rośliny: {plantsCount}</span>
          <span title="Liczba zaznaczonych komórek">
            📐 Zaznaczonych: {selectedCellsCount > 0 ? selectedCellsCount : "-"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span title={getAIStatusText(aiStatus)}>🤖 AI: {getAIStatusText(aiStatus)}</span>
            <span title={getWeatherStatusText(weatherStatus)}>🌤️ Pogoda: {getWeatherStatusText(weatherStatus)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Helper: kolor dla typu operacji
 */
function getOperationTypeColor(type: OperationLogEntry["type"]): string {
  switch (type) {
    case "success":
      return "text-green-500";
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Helper: ikona dla typu operacji
 */
function getOperationTypeIcon(type: OperationLogEntry["type"]): string {
  switch (type) {
    case "success":
      return "✓";
    case "error":
      return "✗";
    case "warning":
      return "⚠";
    default:
      return "ℹ";
  }
}

/**
 * Helper: tekst statusu AI
 */
function getAIStatusText(status: string): string {
  switch (status) {
    case "searching":
      return "Wyszukiwanie...";
    case "fitting":
      return "Ocena...";
    case "error":
      return "Błąd";
    default:
      return "Bezczynne";
  }
}

/**
 * Helper: tekst statusu погоды
 */
function getWeatherStatusText(status: string): string {
  switch (status) {
    case "loading":
      return "Ładowanie...";
    case "error":
      return "Błąd";
    case "stale":
      return "Nieaktualne";
    default:
      return "Aktualna";
  }
}
