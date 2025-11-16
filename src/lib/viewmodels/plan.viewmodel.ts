import type { PlanDto } from "@/types";
import { formatRelativeDate } from "@/lib/utils/date-format";

/**
 * Model widoku dla pojedynczego planu na liście
 * Zawiera przetworzone dane z PlanDto gotowe do wyświetlenia
 */
export interface PlanViewModel {
  /** UUID planu */
  id: string;

  /** Nazwa planu */
  name: string;

  /** Informacje o lokalizacji */
  location: PlanLocationViewModel;

  /** Rozmiar siatki (grid_width × grid_height) */
  gridSize: string;

  /** Data ostatniej modyfikacji (ISO string) */
  updatedAt: string;

  /** Sformatowana data modyfikacji do wyświetlenia (relatywna) */
  updatedAtDisplay: string;
}

/**
 * Model widoku dla lokalizacji planu
 */
export interface PlanLocationViewModel {
  /** Czy plan ma przypisaną lokalizację */
  hasLocation: boolean;

  /** Tekst do wyświetlenia, np. "52.1°N, 21.0°E" lub "Brak lokalizacji" */
  displayText: string;

  /** Szerokość geograficzna */
  latitude: number | null;

  /** Długość geograficzna */
  longitude: number | null;
}

/**
 * Funkcja konwertująca PlanDto do PlanViewModel
 */
export function planDtoToViewModel(dto: PlanDto): PlanViewModel {
  return {
    id: dto.id,
    name: dto.name,
    location: formatPlanLocation(dto.latitude, dto.longitude),
    gridSize: `${dto.grid_width} × ${dto.grid_height}`,
    updatedAt: dto.updated_at,
    updatedAtDisplay: formatRelativeDate(dto.updated_at),
  };
}

/**
 * Pomocnicza funkcja formatująca lokalizację
 */
function formatPlanLocation(latitude: number | null, longitude: number | null): PlanLocationViewModel {
  if (latitude === null || longitude === null) {
    return {
      hasLocation: false,
      displayText: "Brak lokalizacji",
      latitude: null,
      longitude: null,
    };
  }

  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  const displayText = `${Math.abs(latitude).toFixed(1)}°${latDir}, ${Math.abs(longitude).toFixed(1)}°${lonDir}`;

  return {
    hasLocation: true,
    displayText,
    latitude,
    longitude,
  };
}
