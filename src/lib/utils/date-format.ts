import { formatDistanceToNow, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * Formatuje datę ISO do formy relatywnej (np. "2 dni temu", "wczoraj")
 * @param isoDate - Data w formacie ISO string
 * @returns Sformatowana data relatywna
 */
export function formatRelativeDate(isoDate: string): string {
  try {
    const date = parseISO(isoDate);
    return formatDistanceToNow(date, { addSuffix: true, locale: pl });
  } catch {
    return "Data nieznana";
  }
}
