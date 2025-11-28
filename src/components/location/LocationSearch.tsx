import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import type { GeocodeResult } from "@/types";

export interface LocationSearchProps {
  onSearchResults: (results: GeocodeResult[]) => void;
  onSearchError: (error: string) => void;
  isLoading: boolean;
  onSearch: (query: string) => Promise<void>;
}

/**
 * Komponent wyszukiwania lokalizacji za pomocą adresu
 *
 * Funkcje:
 * - Input dla adresu
 * - Przycisk "Szukaj" z ikoną
 * - Obsługa Enter (submit)
 * - Stan ładowania (spinner)
 * - Walidacja minimalnej długości query
 */
export function LocationSearch({ onSearch, isLoading }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Waliduje query przed wysłaniem
   */
  const validateQuery = useCallback((q: string): boolean => {
    const trimmed = q.trim();

    if (trimmed.length === 0) {
      setValidationError("Wprowadź adres do wyszukania");
      return false;
    }

    if (trimmed.length < 3) {
      setValidationError("Adres musi mieć co najmniej 3 znaki");
      return false;
    }

    setValidationError(null);
    return true;
  }, []);

  /**
   * Obsługa wysłania zapytania
   */
  const handleSearch = useCallback(async () => {
    if (!validateQuery(query)) {
      return;
    }

    try {
      await onSearch(query);
    } catch (error) {
      // Obsługujemy błąd, aby uniknąć unhandled rejection
      // Błąd jest przekazywany do komponentu nadrzędnego przez onSearchError
      // ale jeśli onSearchError nie jest obsłużony, nie rzucamy błędu dalej
      logger.error("Błąd podczas wyszukiwania lokalizacji", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [query, onSearch, validateQuery]);

  /**
   * Obsługa Enter w input
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  /**
   * Obsługa zmiany wartości input
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setValidationError(null); // Czyść błąd walidacji przy wpisywaniu
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="location-search" className="text-sm font-medium">
        Wyszukaj adres
      </Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id="location-search"
            type="text"
            placeholder="np. Warszawa, Plac Defilad 1"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-describedby={validationError ? "location-search-error location-search-help" : "location-search-help"}
            aria-invalid={validationError !== null}
            className={cn(validationError && "!border-red-500")}
          />
          {validationError && (
            <p id="location-search-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
              {validationError}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={isLoading || query.trim().length < 3}
          className="shrink-0"
          aria-label="Wyszukaj lokalizację"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Szukam...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Szukaj
            </>
          )}
        </Button>
      </div>
      <p id="location-search-help" className="text-xs text-muted-foreground">
        Wpisz adres, miasto lub współrzędne aby znaleźć lokalizację na mapie
      </p>
    </div>
  );
}
