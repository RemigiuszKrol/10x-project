import { type ReactNode } from "react";
import { useWeatherData } from "@/lib/hooks/queries/useWeatherData";
import { useRefreshWeather } from "@/lib/hooks/mutations/useRefreshWeather";
import { WeatherMonthlyChart } from "./WeatherMonthlyChart";
import { WeatherMetricsTable } from "./WeatherMetricsTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertCircle, Cloud } from "lucide-react";
import { toast } from "sonner";

/**
 * Props dla WeatherTab
 */
export interface WeatherTabProps {
  planId: string;
}

/**
 * WeatherTab - Zakładka danych pogodowych
 *
 * Features:
 * - Wyświetlanie miesięcznych danych pogodowych (sunlight, humidity, precip)
 * - Wykres trendu (line chart)
 * - Tabela z danymi
 * - Informacja o ostatnim odświeżeniu
 * - Przycisk odświeżenia z obsługą rate limit (429)
 *
 * Layout: Vertical scroll z chart + table + refresh button
 */
export function WeatherTab({ planId }: WeatherTabProps): ReactNode {
  // Query do pobrania danych pogodowych
  const { data, isLoading, error } = useWeatherData(planId);

  // Mutation do odświeżenia cache pogody
  const refreshWeather = useRefreshWeather();

  /**
   * Handler odświeżenia danych pogodowych
   */
  const handleRefresh = async (force = false) => {
    try {
      const result = await refreshWeather.mutateAsync({
        planId,
        command: { force },
      });

      if (result.refreshed) {
        toast.success("Dane pogodowe zaktualizowane", {
          description: `Pobrano dane dla ${result.months} miesięcy`,
        });
      } else {
        toast.info("Dane pogodowe są aktualne", {
          description: "Nie było potrzeby pobierania nowych danych",
        });
      }
    } catch (err) {
      // Error handled by mutation
      if (err instanceof Error) {
        toast.error("Nie udało się odświeżyć danych pogodowych", {
          description: err.message,
        });
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ładowanie danych pogodowych...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  // Empty state (brak danych)
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 text-center">
        <Cloud className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">Brak danych pogodowych</p>
          <p className="text-sm text-muted-foreground">Odśwież dane, aby pobrać informacje o pogodzie</p>
        </div>
        <Button onClick={() => handleRefresh(true)} disabled={refreshWeather.isPending}>
          {refreshWeather.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Pobieranie...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Pobierz dane pogodowe
            </>
          )}
        </Button>
      </div>
    );
  }

  // Ostatnie odświeżenie (z pierwszego rekordu)
  const lastRefreshedAt = data[0]?.last_refreshed_at;
  const lastRefreshedDate = lastRefreshedAt ? new Date(lastRefreshedAt) : null;

  return (
    <div className="space-y-6">
      {/* Header z informacją o odświeżeniu */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Dane pogodowe</h2>
        <p className="text-sm text-muted-foreground">
          Miesięczne dane klimatyczne dla lokalizacji planu (nasłonecznienie, wilgotność, opady).
        </p>
        {lastRefreshedDate && (
          <p className="text-xs text-muted-foreground">
            Ostatnie odświeżenie:{" "}
            {lastRefreshedDate.toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Wykres miesięczny */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Trend roczny</h3>
        <WeatherMonthlyChart data={data} />
      </div>

      {/* Tabela z danymi */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Szczegółowe dane</h3>
        <WeatherMetricsTable data={data} />
      </div>

      {/* Przycisk odświeżenia */}
      <div className="flex flex-col gap-2">
        {refreshWeather.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{refreshWeather.error.message}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => handleRefresh(false)}
          disabled={refreshWeather.isPending}
          className="w-full"
          variant="outline"
        >
          {refreshWeather.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Odświeżanie...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Odśwież dane pogodowe
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Dane pogodowe są cache&apos;owane. Odświeżaj tylko gdy potrzebujesz aktualnych informacji.
        </p>
      </div>
    </div>
  );
}
