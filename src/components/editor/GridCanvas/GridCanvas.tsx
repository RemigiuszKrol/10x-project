import { type ReactNode, useRef, memo, useState, useEffect } from "react";
import type { GridMetadataDto, GridCellDto, CellSelection, CellPosition, EditorTool, PlantPlacementDto } from "@/types";
import { useGridSelection } from "@/lib/hooks/useGridSelection";
import { SelectionOverlay } from "./SelectionOverlay";
import { PlantIcon } from "./PlantIcon";
import { PlantTooltip } from "./PlantTooltip";

/**
 * Props dla komponentu GridCanvas
 */
export interface GridCanvasProps {
  gridMetadata: GridMetadataDto;
  cells: GridCellDto[];
  plants?: PlantPlacementDto[]; // NOWE: Lista roślin do wyświetlenia
  currentTool: EditorTool;
  selectedArea: CellSelection | null;
  focusedCell: CellPosition | null;
  onCellClick: (x: number, y: number) => void;
  onSelectionChange: (selection: CellSelection | null) => void;
  onSelectionComplete?: () => void;
}

/**
 * Props dla komponentu GridCell
 */
interface GridCellProps {
  x: number;
  y: number;
  cell: GridCellDto | undefined;
  plant: PlantPlacementDto | undefined;
  isSelected: boolean;
  isFocused: boolean;
  currentTool: EditorTool;
  isDragging: boolean;
  cellSize: number; // Rozmiar komórki w pikselach (dla responsywnego skalowania ikon)
  onCellClick: (x: number, y: number) => void;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
}

/**
 * GridCell - Pojedyncza komórka siatki zoptymalizowana z React.memo
 */
const GridCell = memo(
  function GridCell({
    x,
    y,
    cell,
    plant,
    isSelected,
    isFocused,
    currentTool,
    isDragging,
    cellSize,
    onCellClick,
    startSelection,
    updateSelection,
  }: GridCellProps) {
    // Klasy dla focus - używamy ring dla focus, bo to jest tymczasowe
    const focusedClasses = isFocused ? "ring-1 ring-blue-500" : "";

    // Klasy dla tekstu w zaznaczonej komórce - mniejszy tekst dla mniejszych komórek
    const textClasses = isSelected
      ? "text-[9px] font-bold text-foreground leading-none"
      : "text-[8px] text-muted-foreground/40 leading-none";

    // Handler dla rozpoczęcia zaznaczania
    const handleMouseDown = (e: React.MouseEvent) => {
      if (currentTool === "select") {
        e.preventDefault();
        startSelection(x, y);
      } else {
        onCellClick(x, y);
      }
    };

    // Handler dla aktualizacji zaznaczania podczas drag
    const handleMouseEnter = () => {
      if (isDragging && currentTool === "select") {
        updateSelection(x, y);
      }
    };

    return (
      <div
        className={`
        relative flex items-center justify-center rounded border transition-all
        ${getCellTypeColor(cell?.type || "soil")}
        ${focusedClasses}
        ${currentTool === "select" ? "hover:brightness-110" : "hover:brightness-110 cursor-pointer"}
      `}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onClick={() => {
          if (currentTool !== "select") {
            onCellClick(x, y);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCellClick(x, y);
          }
        }}
        role="gridcell"
        aria-label={`Komórka ${x},${y}, typ: ${cell?.type || "soil"}${plant ? `, roślina: ${plant.plant_name}` : ""}`}
        tabIndex={isFocused ? 0 : -1}
      >
        <span className={textClasses}>
          {x + 1},{y + 1}
        </span>

        {/* Renderowanie ikony rośliny jeśli jest na komórce */}
        {plant && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <PlantTooltip plant={plant}>
              <div className="pointer-events-auto">
                <PlantIcon plantName={plant.plant_name} cellSize={cellSize} />
              </div>
            </PlantTooltip>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Funkcja porównująca dla React.memo
    // Zwraca true jeśli komponenty są równe (nie trzeba re-renderować)
    return (
      prevProps.x === nextProps.x &&
      prevProps.y === nextProps.y &&
      prevProps.cell?.type === nextProps.cell?.type &&
      prevProps.plant?.plant_name === nextProps.plant?.plant_name &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.currentTool === nextProps.currentTool &&
      prevProps.isDragging === nextProps.isDragging &&
      prevProps.cellSize === nextProps.cellSize
    );
  }
);

/**
 * GridCanvas - Komponent renderujący interaktywną siatkę planu
 *
 * Odpowiedzialności:
 * - Renderowanie siatki komórek (grid layout)
 * - Obsługa zaznaczania obszarów (drag selection)
 * - Focus management (nawigacja klawiaturą)
 * - Hover tooltips
 * - Wizualizacja zaznaczenia i focus ring
 *
 * Wydajność:
 * - Używa CSS Grid dla layoutu
 * - React.memo dla GridCell - zapobiega niepotrzebnym re-renderom komórek
 */
export function GridCanvas({
  gridMetadata,
  cells,
  plants = [], // NOWE: Default empty array
  currentTool,
  selectedArea,
  focusedCell,
  onCellClick,
  onSelectionChange,
  onSelectionComplete,
}: GridCanvasProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  const { grid_width, grid_height } = gridMetadata;

  // Minimalna wielkość komórki
  const minCellSize = 24; // px
  const gap = 1; // px
  const containerPadding = 16; // px (p-4 = 4 * 4px)

  // Stan dla responsywnego rozmiaru komórki
  const [cellSize, setCellSize] = useState(minCellSize);

  // Obliczanie responsywnego rozmiaru komórki na podstawie dostępnej szerokości
  useEffect(() => {
    if (!scrollableContainerRef.current || !grid_width || grid_width === 0) {
      setCellSize(minCellSize);
      return;
    }

    const updateCellSize = () => {
      const container = scrollableContainerRef.current;
      if (!container) return;

      // Dostępna szerokość = szerokość kontenera - padding (16px z każdej strony = 32px)
      const availableWidth = container.clientWidth - containerPadding * 2;

      // Oblicz optymalny rozmiar komórki
      // Szerokość potrzebna na grid = grid_width * cellSize + (grid_width - 1) * gap
      // Rozwiązujemy: availableWidth = grid_width * cellSize + (grid_width - 1) * gap
      // cellSize = (availableWidth - (grid_width - 1) * gap) / grid_width
      const calculatedSize = (availableWidth - (grid_width - 1) * gap) / grid_width;

      // Użyj większej wartości: obliczona lub minimalna
      const finalSize = Math.max(calculatedSize, minCellSize);

      setCellSize(Math.floor(finalSize));
    };

    // Oblicz początkowy rozmiar
    updateCellSize();

    // Obserwuj zmiany rozmiaru kontenera
    const resizeObserver = new ResizeObserver(updateCellSize);
    resizeObserver.observe(scrollableContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [grid_width, minCellSize, gap, containerPadding]);

  // Hook dla drag-to-select
  const { isDragging, startSelection, updateSelection, endSelection, cancelSelection } = useGridSelection({
    gridWidth: grid_width ?? 0,
    gridHeight: grid_height ?? 0,
    enabled: currentTool === "select",
    onSelectionChange,
    onSelectionComplete,
  });

  // Generowanie siatki komórek (placeholder - później załadujemy z API)
  const cellsMap = new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell]));

  // NOWE: Mapa roślin dla szybkiego lookup
  const plantsMap = new Map(plants.map((plant) => [`${plant.x},${plant.y}`, plant]));

  // Helper do sprawdzenia czy komórka jest zaznaczona
  const isCellSelected = (x: number, y: number): boolean => {
    if (!selectedArea) return false;
    return x >= selectedArea.x1 && x <= selectedArea.x2 && y >= selectedArea.y1 && y <= selectedArea.y2;
  };

  // Helper do sprawdzenia czy komórka ma focus
  const isCellFocused = (x: number, y: number): boolean => {
    return focusedCell?.x === x && focusedCell?.y === y;
  };

  // Handler dla onMouseUp i onMouseLeave - zakończenie zaznaczania
  const handleMouseUp = () => {
    if (isDragging) {
      endSelection();
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      cancelSelection();
    }
  };

  // Cursor style na podstawie narzędzia i stanu
  const cursorStyle = (() => {
    if (currentTool === "select") {
      return isDragging ? "cursor-grabbing" : "cursor-crosshair";
    }
    return "cursor-default";
  })();

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col ${cursorStyle}`}
      role="application"
      aria-label="Siatka planu działki, naciśnij Spację aby zaznaczyć obszar"
    >
      {/* Info header - zawsze widoczny */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">Siatka:</span> {grid_width} × {grid_height}
          </div>
          <div>
            <span className="font-medium">Komórek:</span> {cells.length}
          </div>
          <div>
            <span className="font-medium">Narzędzie:</span> {currentTool}
          </div>
        </div>
      </div>

      {/* Scrollable grid container */}
      <div ref={scrollableContainerRef} className="relative flex-1 overflow-auto">
        {/* Grid container */}
        <div className="relative inline-block bg-muted/50 p-4">
          <div
            className="inline-grid"
            style={{
              gridTemplateColumns: `repeat(${grid_width ?? 0}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${grid_height ?? 0}, ${cellSize}px)`,
              gap: `${gap}px`,
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            role="grid"
            aria-label="Siatka planu"
            tabIndex={-1}
          >
            {/* Renderowanie komórek */}
            {Array.from({ length: grid_height ?? 0 }, (_, y) =>
              Array.from({ length: grid_width ?? 0 }, (_, x) => {
                const cellKey = `${x},${y}`;
                const cell = cellsMap.get(cellKey);
                const plant = plantsMap.get(cellKey);
                const isSelected = isCellSelected(x, y);
                const isFocused = isCellFocused(x, y);

                return (
                  <GridCell
                    key={cellKey}
                    x={x}
                    y={y}
                    cell={cell}
                    plant={plant}
                    isSelected={isSelected}
                    isFocused={isFocused}
                    currentTool={currentTool}
                    isDragging={isDragging}
                    cellSize={cellSize}
                    onCellClick={onCellClick}
                    startSelection={startSelection}
                    updateSelection={updateSelection}
                  />
                );
              })
            )}
          </div>

          {/* Selection overlay */}
          {selectedArea && (
            <SelectionOverlay
              selection={selectedArea}
              cellSizePx={cellSize}
              gapPx={gap}
              gridOffsetX={containerPadding}
              gridOffsetY={containerPadding}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper do mapowania typu komórki na kolor tła
 */
function getCellTypeColor(type: string): string {
  switch (type) {
    case "soil":
      return "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700";
    case "water":
      return "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700";
    case "path":
      return "bg-gray-100 border-gray-300 dark:bg-gray-800/30 dark:border-gray-600";
    case "building":
      return "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
    case "blocked":
      return "bg-zinc-200 border-zinc-400 dark:bg-zinc-700/50 dark:border-zinc-600";
    default:
      return "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700";
  }
}
