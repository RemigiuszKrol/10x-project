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
 * - 4 kolumny: Miesiąc, Nasłonecznienie, Wilgotność, Opady
 * - Styling z shadcn/ui Table
 * - Sortowanie po miesiącu (1-12)
 *
 * Wartości:
 * - sunlight: 0-100 (%)
 * - humidity: 0-100 (%)
 * - precip: 0-100+ (mm)
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

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miesiąc</TableHead>
            <TableHead className="text-right">Nasłonecznienie</TableHead>
            <TableHead className="text-right">Wilgotność</TableHead>
            <TableHead className="text-right">Opady</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => (
            <TableRow key={row.month}>
              <TableCell className="font-medium">{MONTH_NAMES[row.month - 1] || `Miesiąc ${row.month}`}</TableCell>
              <TableCell className="text-right">{formatValue(row.sunlight, "%")}</TableCell>
              <TableCell className="text-right">{formatValue(row.humidity, "%")}</TableCell>
              <TableCell className="text-right">{formatValue(row.precip, " mm")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
