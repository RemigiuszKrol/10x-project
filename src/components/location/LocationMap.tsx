import { useEffect, useRef, useState } from "react";
import type { LatLng, Marker as LeafletMarker } from "leaflet";

export interface LocationMapProps {
  center: { lat: number; lng: number };
  markerPosition?: { lat: number; lng: number };
  onMarkerMove: (position: { lat: number; lng: number }) => void;
  className?: string;
  readOnly?: boolean;
}

// Typy dla react-leaflet (tylko po stronie klienta)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReactLeafletModule = any;

/**
 * Komponent mapy Leaflet z możliwością ustawienia lokalizacji
 *
 * Funkcje:
 * - Wyświetlanie mapy OpenStreetMap
 * - Draggable marker (pinezka)
 * - Kliknięcie na mapę ustawia marker
 * - Centrowanie mapy na zadanych współrzędnych
 */
export function LocationMap({
  center,
  markerPosition,
  onMarkerMove,
  className = "",
  readOnly = false,
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [MapComponents, setMapComponents] = useState<ReactLeafletModule | null>(null);
  const markerRef = useRef<LeafletMarker>(null);

  // Inicjalizacja tylko po stronie klienta
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamiczny import react-leaflet i leaflet tylko po stronie klienta
    Promise.all([
      import("react-leaflet"),
      import("leaflet").then((L) => {
        // Fix dla domyślnych ikon Leaflet w bundlerze
        const Leaflet = L.default;
        delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
        Leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        return Leaflet;
      }),
    ]).then(([reactLeaflet]) => {
      setMapComponents(reactLeaflet);
      setIsClient(true);
    });
  }, []);

  /**
   * Obsługa przeciągania markera
   */
  const handleMarkerDragEnd = () => {
    if (readOnly) return;
    const marker = markerRef.current;
    if (marker) {
      const position = marker.getLatLng();
      onMarkerMove({ lat: position.lat, lng: position.lng });
    }
  };

  /**
   * Obsługa kliknięcia na mapę
   */
  const handleMapClick = (latlng: LatLng) => {
    if (readOnly) return;
    onMarkerMove({ lat: latlng.lat, lng: latlng.lng });
  };

  // Pozycja markera lub domyślnie centrum
  const markerPos = markerPosition || center;

  // Nie renderuj mapy podczas SSR
  if (!isClient || !MapComponents) {
    return (
      <div
        className={`relative w-full h-[400px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${className} flex items-center justify-center bg-muted/50`}
      >
        <p className="text-sm text-muted-foreground">Ładowanie mapy...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, useMap, useMapEvents } = MapComponents;

  // Komponenty pomocnicze z dostępem do hooków (muszą być zdefiniowane wewnątrz, aby mieć dostęp do zaimportowanych hooków)
  const MapCenterControllerInner = ({ center }: { center: { lat: number; lng: number } }) => {
    const map = useMap();
    useEffect(() => {
      map.setView([center.lat, center.lng], map.getZoom());
    }, [center.lat, center.lng, map]);
    return null;
  };

  const MapClickHandlerInner = ({ onClick, enabled }: { onClick: (latlng: LatLng) => void; enabled: boolean }) => {
    useMapEvents({
      click: (e: { latlng: LatLng }) => {
        if (enabled) {
          onClick(e.latlng);
        }
      },
    });
    return null;
  };

  return (
    <div
      className={`relative w-full h-[400px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${className}`}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
        attributionControl={true}
      >
        {/* TileLayer - kafelki OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Kontroler centrowania */}
        <MapCenterControllerInner center={center} />

        {/* Handler kliknięć - tylko jeśli nie jest readOnly */}
        {!readOnly && <MapClickHandlerInner onClick={handleMapClick} enabled={!readOnly} />}

        {/* Marker */}
        <Marker
          position={[markerPos.lat, markerPos.lng]}
          draggable={!readOnly}
          eventHandlers={{
            dragend: handleMarkerDragEnd,
          }}
          ref={markerRef}
        />
      </MapContainer>

      {/* Informacja dla użytkownika - tylko jeśli nie jest readOnly */}
      {!readOnly && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-md shadow-lg text-xs z-[1000] max-w-[250px]">
          <p className="text-muted-foreground">
            <strong>Wskazówka:</strong> Kliknij na mapę lub przeciągnij pinezkę aby ustawić lokalizację
          </p>
        </div>
      )}
    </div>
  );
}
