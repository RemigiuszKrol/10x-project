import { useMemo } from "react";

export interface GridPreviewProps {
  gridWidth: number; // Liczba pól w poziomie
  gridHeight: number; // Liczba pól w pionie
  cellSizeCm: number; // Rozmiar pojedynczej kratki w cm
  orientation: number; // Orientacja w stopniach (0-359)
  className?: string;
}

/**
 * Komponent wizualizujący miniaturę siatki działki
 *
 * Funkcje:
 * - Wyświetlanie proporcji działki
 * - Informacje o wymiarach (pola i centymetry)
 * - Wizualizacja orientacji (obrót wskaźnika północy)
 * - Responsywny podgląd
 */
export function GridPreview({ gridWidth, gridHeight, cellSizeCm, orientation, className = "" }: GridPreviewProps) {
  /**
   * Oblicza wymiary rzeczywiste
   */
  const dimensions = useMemo(() => {
    const widthCm = gridWidth * cellSizeCm;
    const heightCm = gridHeight * cellSizeCm;

    // Konwersja do metrów jeśli > 100cm
    const widthDisplay = widthCm >= 100 ? `${(widthCm / 100).toFixed(1)} m` : `${widthCm} cm`;
    const heightDisplay = heightCm >= 100 ? `${(heightCm / 100).toFixed(1)} m` : `${heightCm} cm`;

    return {
      widthCm,
      heightCm,
      widthDisplay,
      heightDisplay,
    };
  }, [gridWidth, gridHeight, cellSizeCm]);

  /**
   * Oblicza skalę dla SVG (maksymalnie 200x200 px)
   */
  const scale = useMemo(() => {
    const maxDimension = Math.max(gridWidth, gridHeight);
    const maxSize = 200; // Maksymalny rozmiar w px
    return maxSize / maxDimension;
  }, [gridWidth, gridHeight]);

  /**
   * Wymiary SVG viewBox
   */
  const svgWidth = useMemo(() => Math.ceil(gridWidth * scale), [gridWidth, scale]);
  const svgHeight = useMemo(() => Math.ceil(gridHeight * scale), [gridHeight, scale]);

  /**
   * Generuje linie siatki
   */
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];

    // Linie pionowe
    for (let x = 0; x <= gridWidth; x++) {
      const xPos = x * scale;
      lines.push(
        <line
          key={`v-${x}`}
          x1={xPos}
          y1={0}
          x2={xPos}
          y2={svgHeight}
          stroke="currentColor"
          strokeWidth={x % 5 === 0 ? "1" : "0.5"}
          className={x % 5 === 0 ? "text-gray-400" : "text-gray-300"}
        />
      );
    }

    // Linie poziome
    for (let y = 0; y <= gridHeight; y++) {
      const yPos = y * scale;
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={yPos}
          x2={svgWidth}
          y2={yPos}
          stroke="currentColor"
          strokeWidth={y % 5 === 0 ? "1" : "0.5"}
          className={y % 5 === 0 ? "text-gray-400" : "text-gray-300"}
        />
      );
    }

    return lines;
  }, [gridWidth, gridHeight, scale, svgWidth, svgHeight]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Tytuł */}
      <div>
        <h3 className="text-sm font-medium mb-1">Podgląd siatki</h3>
        <p className="text-xs text-muted-foreground">Wizualizacja proporcji działki</p>
      </div>

      {/* SVG Grid */}
      <div className="flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div className="relative">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="drop-shadow-sm"
            aria-label={`Siatka ${gridWidth} na ${gridHeight} pól`}
          >
            {/* Tło */}
            <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="white" className="dark:fill-gray-800" />

            {/* Linie siatki */}
            {gridLines}
          </svg>

          {/* Wskaźnik północy */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ transform: `translateX(-50%) rotate(${orientation}deg)` }}
            aria-label={`Orientacja: ${orientation} stopni`}
          >
            <div className="text-xs font-semibold text-primary">N</div>
            <div className="w-0.5 h-4 bg-primary"></div>
          </div>
        </div>
      </div>

      {/* Informacje o wymiarach */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs">Wymiary siatki</div>
          <div className="font-mono font-semibold">
            {gridWidth} × {gridHeight} pól
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs">Wymiary rzeczywiste</div>
          <div className="font-mono font-semibold">
            {dimensions.widthDisplay} × {dimensions.heightDisplay}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs">Rozmiar kratki</div>
          <div className="font-mono font-semibold">{cellSizeCm} cm</div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs">Orientacja</div>
          <div className="font-mono font-semibold">{orientation}°</div>
        </div>
      </div>

      {/* Status walidacji */}
      {gridWidth > 0 && gridHeight > 0 && (
        <div className="text-xs text-center">
          {gridWidth <= 200 && gridHeight <= 200 ? (
            <span className="text-green-600 dark:text-green-400">✓ Siatka mieści się w limicie (200 × 200)</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">✗ Siatka przekracza limit 200 × 200 pól</span>
          )}
        </div>
      )}
    </div>
  );
}
