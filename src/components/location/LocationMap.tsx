import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { LatLng, Marker as LeafletMarker } from "leaflet";
import L from "leaflet";

// Fix dla domyślnych ikon Leaflet w bundlerze
// React-leaflet wymaga ręcznej konfiguracji ścieżek do ikon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface LocationMapProps {
  center: { lat: number; lng: number };
  markerPosition?: { lat: number; lng: number };
  onMarkerMove: (position: { lat: number; lng: number }) => void;
  className?: string;
}

/**
 * Komponent pomocniczy do centrowania mapy
 */
function MapCenterController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);

  return null;
}

/**
 * Komponent pomocniczy do obsługi kliknięć na mapie
 */
function MapClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });

  return null;
}

/**
 * Komponent mapy Leaflet z możliwością ustawienia lokalizacji
 *
 * Funkcje:
 * - Wyświetlanie mapy OpenStreetMap
 * - Draggable marker (pinezka)
 * - Kliknięcie na mapę ustawia marker
 * - Centrowanie mapy na zadanych współrzędnych
 */
export function LocationMap({ center, markerPosition, onMarkerMove, className = "" }: LocationMapProps) {
  const markerRef = useRef<LeafletMarker>(null);

  /**
   * Obsługa przeciągania markera
   */
  const handleMarkerDragEnd = () => {
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
    onMarkerMove({ lat: latlng.lat, lng: latlng.lng });
  };

  // Pozycja markera lub domyślnie centrum
  const markerPos = markerPosition || center;

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
        <MapCenterController center={center} />

        {/* Handler kliknięć */}
        <MapClickHandler onClick={handleMapClick} />

        {/* Marker */}
        <Marker
          position={[markerPos.lat, markerPos.lng]}
          draggable={true}
          eventHandlers={{
            dragend: handleMarkerDragEnd,
          }}
          ref={markerRef}
        />
      </MapContainer>

      {/* Informacja dla użytkownika */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-md shadow-lg text-xs z-[1000] max-w-[250px]">
        <p className="text-muted-foreground">
          <strong>Wskazówka:</strong> Kliknij na mapę lub przeciągnij pinezkę aby ustawić lokalizację
        </p>
      </div>
    </div>
  );
}
