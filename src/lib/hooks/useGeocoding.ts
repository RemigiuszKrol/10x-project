import { useState, useCallback } from "react";
import type { GeocodeResult } from "@/types";

/**
 * Zwracane wartości hooka useGeocoding
 */
export interface UseGeocodingReturn {
  results: GeocodeResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

/**
 * Struktura odpowiedzi z Nominatim API
 */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
}

// Rate limiting: ostatnie wywołanie API
let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 1000; // 1 sekunda między zapytaniami

/**
 * Hook do geokodowania adresów za pomocą OpenStreetMap Nominatim API
 *
 * Funkcje:
 * - Wyszukiwanie adresów
 * - Rate limiting (1 zapytanie/sekundę)
 * - Timeout (5s)
 * - Sortowanie wyników po importance
 */
export function useGeocoding(): UseGeocodingReturn {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Wyszukuje adres za pomocą Nominatim API
   */
  const search = useCallback(async (query: string): Promise<void> => {
    // Walidacja query
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      setError("Zapytanie musi mieć co najmniej 3 znaki");
      return;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    if (timeSinceLastSearch < MIN_SEARCH_INTERVAL) {
      const waitTime = MIN_SEARCH_INTERVAL - timeSinceLastSearch;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastSearchTime = Date.now();

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      // Timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Budowanie URL
      const params = new URLSearchParams({
        q: trimmedQuery,
        format: "json",
        addressdetails: "1",
        limit: "5",
        // User-Agent wymagany przez Nominatim
        "accept-language": "pl",
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PlantsPlaner/1.0", // Wymagane przez Nominatim
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: NominatimResult[] = await response.json();

      if (data.length === 0) {
        setError(
          "Nie znaleziono wyników dla podanego adresu. Spróbuj innego zapytania lub ustaw lokalizację ręcznie na mapie."
        );
        setResults([]);
        return;
      }

      // Mapowanie i sortowanie wyników
      const mappedResults: GeocodeResult[] = data
        .map((item) => ({
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          display_name: item.display_name,
          type: item.type,
          importance: item.importance,
        }))
        .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)); // Sortowanie po importance (malejąco)

      setResults(mappedResults);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("Przekroczono czas oczekiwania na odpowiedź. Spróbuj ponownie.");
        } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          setError("Nie udało się połączyć z usługą geokodowania. Sprawdź połączenie internetowe.");
        } else {
          setError("Wystąpił błąd podczas wyszukiwania lokalizacji. Spróbuj ponownie.");
        }
      } else {
        setError("Nieoczekiwany błąd. Spróbuj ponownie.");
      }
    }
  }, []);

  /**
   * Czyści wyniki wyszukiwania
   */
  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  /**
   * Czyści błąd
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
    clearError,
  };
}
