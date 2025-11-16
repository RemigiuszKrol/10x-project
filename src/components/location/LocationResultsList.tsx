import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { GeocodeResult } from "@/types";

export interface LocationResultsListProps {
  results: GeocodeResult[];
  onSelect: (result: GeocodeResult) => void;
}

/**
 * Komponent wyświetlający listę wyników geokodowania
 *
 * Funkcje:
 * - Wyświetlanie listy adresów z wyników wyszukiwania
 * - Przycisk "Wybierz" dla każdego wyniku
 * - Wyróżnienie typu lokalizacji (jeśli dostępny)
 * - Hover efekt
 */
export function LocationResultsList({ results, onSelect }: LocationResultsListProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Znalezione lokalizacje ({results.length})</h3>
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={`${result.lat}-${result.lon}-${index}`}
            className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            {/* Ikona */}
            <div className="shrink-0 mt-0.5">
              <MapPin className="h-5 w-5 text-primary" />
            </div>

            {/* Informacje */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground break-words">{result.display_name}</div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {result.type && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{result.type}</span>
                )}
                <span className="text-xs text-muted-foreground font-mono">
                  {result.lat.toFixed(6)}, {result.lon.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Przycisk wyboru */}
            <div className="shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => onSelect(result)}
                aria-label={`Wybierz lokalizację: ${result.display_name}`}
              >
                Wybierz
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
