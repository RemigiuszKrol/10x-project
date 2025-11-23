import type { CellSelection } from "@/types";

/**
 * Propsy komponentu SelectionOverlay
 */
interface SelectionOverlayProps {
  selection: CellSelection;
  cellSizePx: number; // rozmiar komórki w pikselach na ekranie
  gapPx: number; // odstęp między komórkami
  gridOffsetX?: number; // offset canvas (dla scroll + padding)
  gridOffsetY?: number;
}

/**
 * Komponent wizualizujący zaznaczony prostokątny obszar na siatce
 *
 * Renderuje:
 * - Semi-transparent overlay z borderem
 * - Badge z wymiarami w prawym górnym rogu (np. "5×3")
 *
 * Funkcjonalność:
 * - Absolute positioned nad GridCanvas
 * - Pointer-events-none (nie blokuje interakcji)
 * - Dynamiczne obliczanie pozycji i rozmiaru z uwzględnieniem gap
 *
 * @param props - Parametry zaznaczenia i rozmiaru komórek
 */
export function SelectionOverlay({
  selection,
  cellSizePx,
  gapPx,
  gridOffsetX = 0,
  gridOffsetY = 0,
}: SelectionOverlayProps) {
  // Oblicz wymiary zaznaczenia
  const width = selection.x2 - selection.x1 + 1;
  const height = selection.y2 - selection.y1 + 1;

  // Border overlay (border-2 = 2px) vs border komórek (border = 1px)
  // Różnica to 1px, więc przesuwamy o 0.5px w każdą stronę, aby wyrównać
  const borderOffset = 0.5;

  // Problem z pozycjonowaniem dla małych komórek:
  // CSS Grid używa subpixel rendering, a komórki mają border (1px) który jest częścią box model
  // W GridCanvas, cellSize jest zaokrąglany w dół (Math.floor), co może powodować kumulację błędu
  // Dla małych komórek (24px) błąd subpixel rendering jest bardziej widoczny
  //
  // Korekta pozycji Y - overlay jest za wysoko dla małych komórek
  // Używamy progresywnej korekty: im mniejsza komórka, tym większa korekta
  // Zwiększone wartości korekty dla lepszego wyrównania
  const yCorrection = cellSizePx <= 24 ? 4 : cellSizePx < 28 ? 3 : cellSizePx <= 40 ? 1 : 0;

  // Oblicz pozycję i rozmiar overlay z uwzględnieniem gap między komórkami
  // Każda komórka zajmuje (cellSizePx + gapPx), oprócz ostatniej która nie ma gap po sobie
  // Border overlay jest większy niż border komórek, więc przesuwamy o borderOffset
  const style = {
    left: `${selection.x1 * (cellSizePx + gapPx) + gridOffsetX - borderOffset}px`,
    top: `${selection.y1 * (cellSizePx + gapPx) + gridOffsetY - borderOffset + yCorrection}px`,
    width: `${width * cellSizePx + (width - 1) * gapPx + borderOffset * 2}px`,
    height: `${height * cellSizePx + (height - 1) * gapPx + borderOffset * 2}px`,
  };

  return (
    <div
      className="absolute pointer-events-none border-2 border-primary bg-primary/10 transition-opacity duration-200"
      style={style}
      role="region"
      aria-label={`Zaznaczony obszar: ${width}×${height}`}
    >
      {/* Badge z wymiarami */}
      <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
        {width}×{height}
      </span>
    </div>
  );
}
