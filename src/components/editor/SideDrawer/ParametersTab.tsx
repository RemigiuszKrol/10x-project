import { type ReactNode, useState, useEffect, lazy, Suspense } from "react";
import type { PlanDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { logger } from "@/lib/utils/logger";

// Dynamiczny import LocationMap - tylko po stronie klienta (Leaflet wymaga window)
const LocationMap = lazy(() =>
  import("@/components/location/LocationMap").then((mod) => ({ default: mod.LocationMap }))
);

/**
 * Props dla ParametersTab
 */
export interface ParametersTabProps {
  plan: PlanDto;
  onUpdate: (updates: Partial<PlanDto>) => Promise<void>;
  isUpdating?: boolean;
}

/**
 * ParametersTab - Formularz parametrów planu
 *
 * Pola edytowalne:
 * - name: Nazwa planu (Input)
 * - orientation: Orientacja 0-359 (Input number)
 *
 * Pola tylko do odczytu:
 * - hemisphere: Półkula (Input readOnly)
 * - cell_size_cm: Rozmiar kratki (Input readOnly)
 * - latitude/longitude: Lokalizacja działki (Mapa + współrzędne)
 */
export function ParametersTab({ plan, onUpdate, isUpdating }: ParametersTabProps): ReactNode {
  const [name, setName] = useState(plan.name);
  const [orientation, setOrientation] = useState(plan.orientation.toString());
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingLocationName, setIsLoadingLocationName] = useState(false);

  const hasChanges = name !== plan.name || parseInt(orientation) !== plan.orientation;

  // Sprawdź czy lokalizacja jest ustawiona
  const hasLocation = plan.latitude !== null && plan.longitude !== null;
  const locationCenter =
    hasLocation && plan.latitude !== null && plan.longitude !== null
      ? { lat: plan.latitude, lng: plan.longitude }
      : { lat: 52.2297, lng: 21.0122 }; // Domyślne centrum (Warszawa)

  // Reverse geocoding - pobierz nazwę lokalizacji na podstawie współrzędnych
  useEffect(() => {
    if (!hasLocation || plan.latitude === null || plan.longitude === null) {
      setLocationName(null);
      return;
    }

    let cancelled = false;

    const fetchLocationName = async () => {
      if (plan.latitude === null || plan.longitude === null) return;

      setIsLoadingLocationName(true);
      try {
        const params = new URLSearchParams({
          lat: plan.latitude.toString(),
          lon: plan.longitude.toString(),
          format: "json",
          addressdetails: "1",
          "accept-language": "pl",
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
          headers: {
            "User-Agent": "PlantsPlaner/1.0", // Wymagane przez Nominatim
          },
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as { display_name?: string };
        if (cancelled) return;

        setLocationName(data.display_name || null);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error) {
          logger.error("Błąd podczas pobierania nazwy lokalizacji", { error: error.message });
        } else {
          logger.error("Nieoczekiwany błąd podczas pobierania nazwy lokalizacji", { error: String(error) });
        }
        setLocationName(null);
      } finally {
        if (!cancelled) {
          setIsLoadingLocationName(false);
        }
      }
    };

    // Rate limiting - opóźnienie 1 sekunda przed zapytaniem
    const timeoutId = setTimeout(() => {
      fetchLocationName();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [hasLocation, plan.latitude, plan.longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<PlanDto> = {};

    if (name !== plan.name) {
      updates.name = name;
    }

    if (parseInt(orientation) !== plan.orientation) {
      updates.orientation = parseInt(orientation);
    }

    if (Object.keys(updates).length > 0) {
      try {
        await onUpdate(updates);
      } catch (error) {
        if (error instanceof Error) {
          logger.error("Błąd podczas aktualizacji parametrów planu", { error: error.message });
        } else {
          logger.error("Nieoczekiwany błąd podczas aktualizacji parametrów planu", { error: String(error) });
        }
        // Błąd jest obsłużony - komponent pozostaje w stanie, w którym był
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Parametry planu</h2>
        <p className="text-sm text-muted-foreground">Edytuj podstawowe parametry planu działki</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="plan-name">Nazwa planu</Label>
          <Input
            id="plan-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mój ogród"
            required
          />
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label htmlFor="plan-orientation">Orientacja (stopnie)</Label>
          <Input
            id="plan-orientation"
            type="number"
            min="0"
            max="359"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Orientacja działki względem północy (0° = północ, 90° = wschód)
          </p>
        </div>

        {/* Hemisphere - tylko do odczytu */}
        <div className="space-y-2">
          <Label htmlFor="plan-hemisphere">Półkula</Label>
          <Input
            id="plan-hemisphere"
            type="text"
            value={plan.hemisphere === "northern" ? "Północna" : plan.hemisphere === "southern" ? "Południowa" : "—"}
            readOnly
            className="bg-muted cursor-not-allowed"
            aria-label="Półkula (tylko do odczytu)"
          />
          <p className="text-xs text-muted-foreground">Półkula nie może być zmieniona po utworzeniu planu</p>
        </div>

        {/* Cell Size - tylko do odczytu */}
        <div className="space-y-2">
          <Label htmlFor="plan-cell-size">Rozmiar kratki (cm)</Label>
          <Input
            id="plan-cell-size"
            type="text"
            value={`${plan.cell_size_cm} cm`}
            readOnly
            className="bg-muted cursor-not-allowed"
            aria-label="Rozmiar kratki (tylko do odczytu)"
          />
          <p className="text-xs text-muted-foreground">Rozmiar kratki nie może być zmieniony po utworzeniu planu</p>
        </div>

        {/* Location - tylko do odczytu */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="plan-location">Lokalizacja działki</Label>
          </div>

          {hasLocation ? (
            <>
              {/* Nazwa lokalizacji */}
              {locationName && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm font-medium text-foreground">{locationName}</p>
                </div>
              )}
              {isLoadingLocationName && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Pobieranie nazwy lokalizacji...</p>
                </div>
              )}

              {/* Współrzędne */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="plan-latitude" className="text-xs text-muted-foreground">
                    Szerokość geograficzna
                  </Label>
                  <Input
                    id="plan-latitude"
                    type="text"
                    value={plan.latitude?.toFixed(6) ?? "—"}
                    readOnly
                    className="bg-muted cursor-not-allowed text-sm"
                    aria-label="Szerokość geograficzna (tylko do odczytu)"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="plan-longitude" className="text-xs text-muted-foreground">
                    Długość geograficzna
                  </Label>
                  <Input
                    id="plan-longitude"
                    type="text"
                    value={plan.longitude?.toFixed(6) ?? "—"}
                    readOnly
                    className="bg-muted cursor-not-allowed text-sm"
                    aria-label="Długość geograficzna (tylko do odczytu)"
                  />
                </div>
              </div>

              {/* Mapa - tylko do odczytu */}
              <div className="relative">
                <Suspense
                  fallback={
                    <div className="h-[300px] flex items-center justify-center bg-muted/50 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Ładowanie mapy...</p>
                    </div>
                  }
                >
                  <LocationMap
                    center={locationCenter}
                    markerPosition={locationCenter}
                    onMarkerMove={() => {
                      // Pusta funkcja - mapa jest tylko do odczytu
                    }}
                    className="h-[300px]"
                    readOnly={true}
                  />
                </Suspense>
                <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground border z-[1000]">
                  Tylko do odczytu
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Lokalizacja działki nie jest ustawiona</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lokalizacja może być ustawiona tylko podczas tworzenia planu
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={!hasChanges || isUpdating} className="flex-1">
            {isUpdating ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setName(plan.name);
              setOrientation(plan.orientation.toString());
            }}
            disabled={!hasChanges}
          >
            Resetuj
          </Button>
        </div>
      </form>
    </div>
  );
}
