import { type ReactNode } from "react";
import type { WeatherMonthlyDto } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Props dla WeatherMetricsTable
 */
export interface WeatherMetricsTableProps {
  data: WeatherMonthlyDto[];
}

/**
 * Nazwy miesięcy po polsku
 */
const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

/**
 * WeatherMetricsTable - Tabela z danymi pogodowymi
 *
 * Features:
 * - 12 wierszy (miesiące)
 * - 5 kolumn: Miesiąc, Nasłonecznienie, Wilgotność, Opady, Temperatura
 * - Styling z shadcn/ui Table
 * - Sortowanie po miesiącu (1-12)
 *
 * Wartości:
 * - sunlight: 0-100 (%)
 * - humidity: 0-100 (%)
 * - precip: 0-100+ (mm)
 * - temperature: 0-100 (znormalizowana) + °C (rzeczywista)
 */
export function WeatherMetricsTable({ data }: WeatherMetricsTableProps): ReactNode {
  // Sortowanie po miesiącu (ascending)
  const sortedData = [...data].sort((a, b) => a.month - b.month);

  /**
   * Formatowanie wartości z jednostkami
   */
  const formatValue = (value: number | null, unit: string): string => {
    if (value === null) return "—";
    return `${value}${unit}`;
  };

  /**
   * Konwersja znormalizowanej temperatury (0-100) z powrotem do °C
   * Zakres normalizacji: -30°C do +50°C → 0-100
   * Formuła odwrotna: ((temp / 100) * 80) - 30
   */
  const denormalizeTemperature = (normalized: number | null): number | null => {
    if (normalized === null) return null;
    return Math.round((normalized / 100) * 80 - 30);
  };

  /**
   * Formatowanie temperatury: znormalizowana wartość + rzeczywista w °C
   */
  const formatTemperature = (value: number | null): string => {
    if (value === null) return "—";
    const celsius = denormalizeTemperature(value);
    if (celsius === null) return `${value}%`;
    return `${value}% (${celsius > 0 ? "+" : ""}${celsius}°C)`;
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miesiąc</TableHead>
            <TableHead className="text-right">Nasłonecznienie</TableHead>
            <TableHead className="text-right">Wilgotność</TableHead>
            <TableHead className="text-right">Opady</TableHead>
            <TableHead className="text-right">Temperatura</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => (
            <TableRow key={row.month}>
              <TableCell className="font-medium">{MONTH_NAMES[row.month - 1] || `Miesiąc ${row.month}`}</TableCell>
              <TableCell className="text-right">{formatValue(row.sunlight, "%")}</TableCell>
              <TableCell className="text-right">{formatValue(row.humidity, "%")}</TableCell>
              <TableCell className="text-right">{formatValue(row.precip, " mm")}</TableCell>
              <TableCell className="text-right">{formatTemperature(row.temperature)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
