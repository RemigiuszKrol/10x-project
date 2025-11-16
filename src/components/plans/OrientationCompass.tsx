import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";

export interface OrientationCompassProps {
  value: number; // 0..359
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Komponent mini-kompasu do ustawiania orientacji działki
 *
 * Funkcje:
 * - Wizualizacja SVG z kierunkami świata (N, S, E, W)
 * - Wskaźnik kierunku (strzałka) rotowany według orientacji
 * - Input numeryczny (0-359)
 * - Przyciski +/- do inkrementacji orientacji
 */
export function OrientationCompass({ value, onChange, className = "" }: OrientationCompassProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  /**
   * Normalizuje wartość orientacji do zakresu 0..359
   */
  const normalizeOrientation = useCallback((val: number): number => {
    let normalized = val % 360;
    if (normalized < 0) normalized += 360;
    return Math.round(normalized);
  }, []);

  /**
   * Obsługa zmiany w input
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      const numVal = parseInt(val, 10);
      if (!isNaN(numVal)) {
        const normalized = normalizeOrientation(numVal);
        onChange(normalized);
      }
    },
    [onChange, normalizeOrientation]
  );

  /**
   * Obsługa blur - korekta wartości
   */
  const handleInputBlur = useCallback(() => {
    const numVal = parseInt(inputValue, 10);
    if (isNaN(numVal)) {
      setInputValue(value.toString());
    } else {
      const normalized = normalizeOrientation(numVal);
      setInputValue(normalized.toString());
      onChange(normalized);
    }
  }, [inputValue, value, onChange, normalizeOrientation]);

  /**
   * Zwiększa orientację o 15 stopni
   */
  const increment = useCallback(() => {
    const newValue = normalizeOrientation(value + 15);
    onChange(newValue);
    setInputValue(newValue.toString());
  }, [value, onChange, normalizeOrientation]);

  /**
   * Zmniejsza orientację o 15 stopni
   */
  const decrement = useCallback(() => {
    const newValue = normalizeOrientation(value - 15);
    onChange(newValue);
    setInputValue(newValue.toString());
  }, [value, onChange, normalizeOrientation]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* SVG Compass */}
      <div className="flex justify-center">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          className="drop-shadow-md"
          aria-label={`Orientacja: ${value} stopni`}
        >
          {/* Tło okręgu */}
          <circle cx="80" cy="80" r="75" fill="white" stroke="currentColor" strokeWidth="2" className="text-gray-300" />

          {/* Kierunki świata */}
          <g className="text-gray-600 font-semibold text-sm">
            {/* N - Północ */}
            <text x="80" y="20" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor">
              N
            </text>
            {/* S - Południe */}
            <text x="80" y="148" textAnchor="middle" fontSize="16" fill="currentColor">
              S
            </text>
            {/* E - Wschód */}
            <text x="148" y="85" textAnchor="middle" fontSize="16" fill="currentColor">
              E
            </text>
            {/* W - Zachód */}
            <text x="12" y="85" textAnchor="middle" fontSize="16" fill="currentColor">
              W
            </text>
          </g>

          {/* Znaczniki co 45 stopni */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const x1 = 80 + 65 * Math.cos(rad);
            const y1 = 80 + 65 * Math.sin(rad);
            const x2 = 80 + 70 * Math.cos(rad);
            const y2 = 80 + 70 * Math.sin(rad);

            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-300"
              />
            );
          })}

          {/* Wskaźnik orientacji (strzałka) */}
          <g transform={`rotate(${value} 80 80)`} className="transition-transform duration-300 ease-out">
            {/* Linia wskaźnika */}
            <line x1="80" y1="80" x2="80" y2="20" stroke="currentColor" strokeWidth="3" className="text-primary" />
            {/* Grotka strzałki */}
            <polygon points="80,15 75,25 85,25" fill="currentColor" className="text-primary" />
            {/* Punkt centralny */}
            <circle cx="80" cy="80" r="5" fill="currentColor" className="text-primary" />
          </g>
        </svg>
      </div>

      {/* Kontrolki */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="orientation-input" className="text-sm font-medium">
          Orientacja (stopnie)
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrement}
            aria-label="Zmniejsz orientację o 15 stopni"
            className="shrink-0"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Input
            id="orientation-input"
            type="number"
            min={0}
            max={359}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="text-center"
            aria-describedby="orientation-help"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={increment}
            aria-label="Zwiększ orientację o 15 stopni"
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p id="orientation-help" className="text-xs text-muted-foreground">
          0° = północ, 90° = wschód, 180° = południe, 270° = zachód
        </p>
      </div>
    </div>
  );
}
