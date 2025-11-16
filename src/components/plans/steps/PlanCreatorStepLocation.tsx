import { useState, useCallback } from "react";
import { LocationMap } from "@/components/location/LocationMap";
import { LocationSearch } from "@/components/location/LocationSearch";
import { LocationResultsList } from "@/components/location/LocationResultsList";
import { useGeocoding } from "@/lib/hooks/useGeocoding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, MapPin } from "lucide-react";
import type { PlanLocationFormData, GeocodeResult } from "@/types";

export interface PlanCreatorStepLocationProps {
  data: PlanLocationFormData;
  onChange: (data: PlanLocationFormData) => void;
  errors: Partial<Record<keyof PlanLocationFormData, string>>;
}

// Domyślne centrum mapy (Polska - Warszawa)
const DEFAULT_CENTER = { lat: 52.2297, lng: 21.0122 };

/**
 * Krok 2: Lokalizacja - ustawienie położenia działki
 *
 * Funkcje:
 * - Wyszukiwanie adresu (geokodowanie)
 * - Wybór z listy wyników
 * - Ręczne ustawienie na mapie
 * - Możliwość pominięcia (opcjonalne)
 */
export function PlanCreatorStepLocation({ data, onChange, errors }: PlanCreatorStepLocationProps) {
  const geocoding = useGeocoding();
  const [showNoLocationWarning, setShowNoLocationWarning] = useState(false);

  // Centrum mapy - lokalizacja użytkownika lub domyślne
  const mapCenter = data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : DEFAULT_CENTER;

  // Pozycja markera - tylko jeśli ustawiona
  const markerPosition = data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : undefined;

  /**
   * Obsługa wyszukiwania
   */
  const handleSearch = useCallback(
    async (query: string) => {
      setShowNoLocationWarning(false);
      await geocoding.search(query);
    },
    [geocoding]
  );

  /**
   * Obsługa wyboru wyniku z listy
   */
  const handleSelectResult = useCallback(
    (result: GeocodeResult) => {
      onChange({
        latitude: result.lat,
        longitude: result.lon,
        address: result.display_name,
      });
      geocoding.clearResults();
      setShowNoLocationWarning(false);
    },
    [onChange, geocoding]
  );

  /**
   * Obsługa przesunięcia markera na mapie
   */
  const handleMarkerMove = useCallback(
    (position: { lat: number; lng: number }) => {
      onChange({
        latitude: position.lat,
        longitude: position.lng,
        address: undefined, // Czyścimy adres przy ręcznym ustawieniu
      });
      setShowNoLocationWarning(false);
    },
    [onChange]
  );

  /**
   * Czy lokalizacja jest ustawiona
   */
  const hasLocation = data.latitude !== undefined && data.longitude !== undefined;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Nagłówek */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Lokalizacja działki</h2>
        <p className="text-muted-foreground">
          Ustaw położenie geograficzne swojej działki. To pomoże w pobraniu danych pogodowych i doborze odpowiednich
          roślin.
        </p>
      </div>

      {/* Wyszukiwarka */}
      <div className="space-y-4">
        <LocationSearch
          onSearch={handleSearch}
          onSearchResults={geocoding.clearResults}
          onSearchError={geocoding.clearError}
          isLoading={geocoding.isLoading}
        />

        {/* Błąd geokodowania */}
        {geocoding.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{geocoding.error}</AlertDescription>
          </Alert>
        )}

        {/* Lista wyników */}
        {geocoding.results.length > 0 && (
          <LocationResultsList results={geocoding.results} onSelect={handleSelectResult} />
        )}
      </div>

      {/* Mapa */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Mapa</h3>
        </div>
        <LocationMap center={mapCenter} markerPosition={markerPosition} onMarkerMove={handleMarkerMove} />
      </div>

      {/* Informacja o wybranej lokalizacji */}
      {hasLocation && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
            <span>✓</span>
            Lokalizacja ustawiona
          </h3>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            {data.address && (
              <p>
                <strong>Adres:</strong> {data.address}
              </p>
            )}
            <p className="font-mono">
              <strong>Współrzędne:</strong> {data.latitude?.toFixed(6)}, {data.longitude?.toFixed(6)}
            </p>
          </div>
        </div>
      )}

      {/* Ostrzeżenie o braku lokalizacji */}
      {!hasLocation && showNoLocationWarning && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Lokalizacja nie jest ustawiona.</strong> Bez lokalizacji nie będzie możliwe pobranie danych
            pogodowych dla Twojej działki. Możesz kontynuować bez lokalizacji, ale zalecamy jej ustawienie.
          </AlertDescription>
        </Alert>
      )}

      {/* Informacja dodatkowa */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">💡 Wskazówka</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Użyj wyszukiwarki aby znaleźć adres swojej działki</li>
          <li>Kliknij na mapę lub przeciągnij pinezkę aby precyzyjnie ustawić lokalizację</li>
          <li>Lokalizacja jest opcjonalna, ale zalecana dla pełnej funkcjonalności</li>
        </ul>
      </div>

      {/* Błędy walidacji */}
      {(errors.latitude || errors.longitude) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.latitude || errors.longitude}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
