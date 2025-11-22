import { type ReactNode } from "react";
import { Cloud, Leaf, Activity, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/**
 * Props dla EditorStatusIndicators
 */
export interface EditorStatusIndicatorsProps {
  aiStatus: "idle" | "searching" | "fitting" | "error";
  weatherStatus: "idle" | "loading" | "error" | "stale";
  sessionStatus: "active" | "expiring" | "expired";
}

/**
 * EditorStatusIndicators - Wskaźniki statusu dla edytora
 *
 * Wyświetla 3 wskaźniki:
 * - AI status (wyszukiwanie/ocena roślin)
 * - Weather status (dane pogodowe)
 * - Session status (sesja użytkownika)
 *
 * Każdy wskaźnik to ikona + tooltip z opisem
 */
export function EditorStatusIndicators({
  aiStatus,
  weatherStatus,
  sessionStatus,
}: EditorStatusIndicatorsProps): ReactNode {
  return (
    <div className="flex items-center gap-3">
      {/* AI Status */}
      <div className="flex items-center gap-1" title={getAIStatusTooltip(aiStatus)}>
        <Leaf className={`h-4 w-4 ${getAIStatusColor(aiStatus)}`} />
        {aiStatus === "searching" || aiStatus === "fitting" ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {/* Weather Status */}
      <div className="flex items-center gap-1" title={getWeatherStatusTooltip(weatherStatus)}>
        <Cloud className={`h-4 w-4 ${getWeatherStatusColor(weatherStatus)}`} />
        {weatherStatus === "loading" ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
      </div>

      {/* Session Status */}
      <div className="flex items-center gap-1" title={getSessionStatusTooltip(sessionStatus)}>
        {sessionStatus === "active" && <CheckCircle className="h-4 w-4 text-green-500" />}
        {sessionStatus === "expiring" && <Activity className="h-4 w-4 text-yellow-500" />}
        {sessionStatus === "expired" && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>
    </div>
  );
}

/**
 * Helpers dla AI status
 */
function getAIStatusColor(status: string): string {
  switch (status) {
    case "idle":
      return "text-muted-foreground";
    case "searching":
    case "fitting":
      return "text-blue-500";
    case "error":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

function getAIStatusTooltip(status: string): string {
  switch (status) {
    case "idle":
      return "AI: Bezczynne";
    case "searching":
      return "AI: Wyszukiwanie roślin...";
    case "fitting":
      return "AI: Sprawdzanie dopasowania...";
    case "error":
      return "AI: Błąd - spróbuj ponownie";
    default:
      return "AI: Nieznany status";
  }
}

/**
 * Helpers dla Weather status
 */
function getWeatherStatusColor(status: string): string {
  switch (status) {
    case "idle":
      return "text-muted-foreground";
    case "loading":
      return "text-blue-500";
    case "error":
      return "text-red-500";
    case "stale":
      return "text-yellow-500";
    default:
      return "text-muted-foreground";
  }
}

function getWeatherStatusTooltip(status: string): string {
  switch (status) {
    case "idle":
      return "Pogoda: Aktualna";
    case "loading":
      return "Pogoda: Odświeżanie...";
    case "error":
      return "Pogoda: Błąd pobierania danych";
    case "stale":
      return "Pogoda: Dane nieaktualne - odśwież";
    default:
      return "Pogoda: Nieznany status";
  }
}

/**
 * Helpers dla Session status
 */
function getSessionStatusTooltip(status: string): string {
  switch (status) {
    case "active":
      return "Sesja: Aktywna";
    case "expiring":
      return "Sesja: Wygasa wkrótce";
    case "expired":
      return "Sesja: Wygasła - zaloguj się ponownie";
    default:
      return "Sesja: Nieznany status";
  }
}
