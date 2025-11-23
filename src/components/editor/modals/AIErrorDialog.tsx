/**
 * AIErrorDialog - Modal wyświetlający błędy AI
 *
 * Obsługuje różne typy błędów:
 * - timeout: Przekroczenie limitu czasu (10s)
 * - bad_json: Niepoprawna struktura odpowiedzi
 * - rate_limit: Przekroczenie limitu zapytań
 * - network: Brak połączenia
 * - unknown: Nieznany błąd
 *
 * Oferuje akcje w zależności od kontekstu (search vs fit)
 */

import { type ReactNode } from "react";
import type { AIError } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, WifiOff, XCircle, AlertTriangle } from "lucide-react";
import { formatRetryTime } from "@/lib/utils/ai-errors";

/**
 * Props dla AIErrorDialog
 */
export interface AIErrorDialogProps {
  isOpen: boolean;
  error: AIError;
  context: "search" | "fit";
  onRetry: () => Promise<void>;
  onAddWithoutScores?: () => void; // Tylko dla fit context
  onAddManually?: () => void; // Tylko dla search context
  onCancel: () => void;
}

/**
 * Ikona dla typu błędu
 */
function getErrorIcon(type: AIError["type"]): ReactNode {
  const className = "h-6 w-6";

  switch (type) {
    case "timeout":
      return <Clock className={className} />;
    case "network":
      return <WifiOff className={className} />;
    case "rate_limit":
      return <AlertTriangle className={className} />;
    case "bad_json":
      return <XCircle className={className} />;
    default:
      return <AlertCircle className={className} />;
  }
}

/**
 * Tytuł dla typu błędu
 */
function getErrorTitle(type: AIError["type"]): string {
  switch (type) {
    case "timeout":
      return "Przekroczono limit czasu";
    case "network":
      return "Brak połączenia";
    case "rate_limit":
      return "Zbyt wiele zapytań";
    case "bad_json":
      return "Niepoprawna odpowiedź AI";
    default:
      return "Wystąpił błąd";
  }
}

/**
 * AIErrorDialog component
 */
export function AIErrorDialog({
  isOpen,
  error,
  context,
  onRetry,
  onAddWithoutScores,
  onAddManually,
  onCancel,
}: AIErrorDialogProps): ReactNode {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-destructive">{getErrorIcon(error.type)}</div>
            <AlertDialogTitle>{getErrorTitle(error.type)}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <div>{error.message}</div>

            {/* Details dla bad_json (dla deweloperów) */}
            {error.details && error.type === "bad_json" && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Szczegóły techniczne
                </summary>
                <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">{error.details}</pre>
              </details>
            )}

            {/* Info o retry dla rate_limit */}
            {error.retryAfter && (
              <div className="text-sm text-muted-foreground">
                Spróbuj ponownie za <strong>{formatRetryTime(error.retryAfter)}</strong>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Anuluj</AlertDialogCancel>

          {/* Akcje specyficzne dla kontekstu */}
          {context === "search" && (
            <>
              {/* Przycisk "Dodaj ręcznie" - alternatywa gdy search nie działa */}
              {onAddManually && (
                <Button variant="secondary" onClick={onAddManually}>
                  Dodaj ręcznie
                </Button>
              )}

              {/* Przycisk "Ponów" - główna akcja */}
              {error.canRetry && (
                <AlertDialogAction onClick={onRetry} disabled={!!error.retryAfter}>
                  {error.retryAfter ? `Ponów (${formatRetryTime(error.retryAfter)})` : "Ponów wyszukiwanie"}
                </AlertDialogAction>
              )}
            </>
          )}

          {context === "fit" && (
            <>
              {/* Przycisk "Dodaj bez oceny" - alternatywa gdy fit nie działa */}
              {onAddWithoutScores && (
                <Button variant="secondary" onClick={onAddWithoutScores}>
                  Dodaj bez oceny
                </Button>
              )}

              {/* Przycisk "Ponów" - główna akcja */}
              {error.canRetry && (
                <AlertDialogAction onClick={onRetry} disabled={!!error.retryAfter}>
                  {error.retryAfter ? `Ponów (${formatRetryTime(error.retryAfter)})` : "Ponów sprawdzenie"}
                </AlertDialogAction>
              )}
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
