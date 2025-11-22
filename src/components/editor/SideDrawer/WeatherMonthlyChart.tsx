import { type ReactNode } from "react";
import type { WeatherMonthlyDto } from "@/types";

/**
 * Props dla WeatherMonthlyChart
 */
export interface WeatherMonthlyChartProps {
  data: WeatherMonthlyDto[];
}

/**
 * Skrócone nazwy miesięcy
 */
const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

/**
 * WeatherMonthlyChart - Wykres linii dla danych pogodowych
 *
 * Features:
 * - 3 linie: sunlight (żółty), humidity (niebieski), precip (granatowy)
 * - 12 punktów (miesiące)
 * - Legenda z kolorami
 * - Responsive SVG
 * - Tooltips na hover (title attribute)
 *
 * Implementacja:
 * - Prosty SVG line chart bez zewnętrznych bibliotek
 * - Skalowanie do 0-100 (normalizacja dla precip)
 * - Grid lines dla czytelności
 */
export function WeatherMonthlyChart({ data }: WeatherMonthlyChartProps): ReactNode {
  // Sortowanie po miesiącu
  const sortedData = [...data].sort((a, b) => a.month - b.month);

  // Wymiary wykresu
  const width = 320;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Maksymalne wartości dla skalowania
  const maxSunlight = 100;
  const maxHumidity = 100;
  const maxPrecip = Math.max(...sortedData.map((d) => d.precip || 0), 100);

  /**
   * Konwersja wartości do współrzędnych Y
   */
  const scaleY = (value: number | null, max: number): number => {
    if (value === null) return chartHeight;
    const normalized = Math.max(0, Math.min(value, max));
    return chartHeight - (normalized / max) * chartHeight;
  };

  /**
   * Konwersja miesiąca do współrzędnych X
   */
  const scaleX = (month: number): number => {
    return ((month - 1) / 11) * chartWidth;
  };

  /**
   * Generowanie ścieżki SVG dla linii
   */
  const generatePath = (dataKey: "sunlight" | "humidity" | "precip", max: number): string => {
    return sortedData
      .map((d, i) => {
        const x = scaleX(d.month);
        const y = scaleY(d[dataKey], max);
        return `${i === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  };

  // Ścieżki linii
  const sunlightPath = generatePath("sunlight", maxSunlight);
  const humidityPath = generatePath("humidity", maxHumidity);
  const precipPath = generatePath("precip", maxPrecip);

  return (
    <div className="space-y-4">
      {/* Wykres SVG */}
      <div className="flex justify-center">
        <svg width={width} height={height} className="rounded-lg border bg-card">
          {/* Grid lines (horizontal) */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = padding.top + scaleY(value, 100);
            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                />
                <text x={padding.left - 8} y={y + 4} fontSize="10" fill="currentColor" opacity="0.5" textAnchor="end">
                  {value}
                </text>
              </g>
            );
          })}

          {/* Linie danych */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Linia nasłonecznienia (żółta) */}
            <path d={sunlightPath} fill="none" stroke="#eab308" strokeWidth="2" />

            {/* Linia wilgotności (niebieska) */}
            <path d={humidityPath} fill="none" stroke="#3b82f6" strokeWidth="2" />

            {/* Linia opadów (granatowa, dotted) */}
            <path d={precipPath} fill="none" stroke="#1e40af" strokeWidth="2" strokeDasharray="4 2" />

            {/* Punkty danych (tooltips) */}
            {sortedData.map((d) => {
              const x = scaleX(d.month);
              return (
                <g key={d.month}>
                  <circle cx={x} cy={scaleY(d.sunlight, maxSunlight)} r="3" fill="#eab308">
                    <title>
                      {MONTH_LABELS[d.month - 1]}: Nasłonecznienie {d.sunlight}%
                    </title>
                  </circle>
                  <circle cx={x} cy={scaleY(d.humidity, maxHumidity)} r="3" fill="#3b82f6">
                    <title>
                      {MONTH_LABELS[d.month - 1]}: Wilgotność {d.humidity}%
                    </title>
                  </circle>
                  <circle cx={x} cy={scaleY(d.precip, maxPrecip)} r="3" fill="#1e40af">
                    <title>
                      {MONTH_LABELS[d.month - 1]}: Opady {d.precip} mm
                    </title>
                  </circle>
                </g>
              );
            })}
          </g>

          {/* Etykiety miesięcy (oś X) */}
          <g transform={`translate(${padding.left}, ${height - padding.bottom + 20})`}>
            {sortedData.map((d) => {
              const x = scaleX(d.month);
              return (
                <text key={d.month} x={x} y={0} fontSize="10" fill="currentColor" opacity="0.7" textAnchor="middle">
                  {MONTH_LABELS[d.month - 1]}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded bg-[#eab308]" />
          <span className="text-muted-foreground">Nasłonecznienie (%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded bg-[#3b82f6]" />
          <span className="text-muted-foreground">Wilgotność (%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded border-2 border-dashed border-[#1e40af]" />
          <span className="text-muted-foreground">Opady (mm, normalizowane)</span>
        </div>
      </div>

      {maxPrecip > 100 && (
        <p className="text-xs text-center text-muted-foreground">
          Uwaga: Opady przekraczają 100mm - wykres znormalizowany do {Math.round(maxPrecip)}mm
        </p>
      )}
    </div>
  );
}
