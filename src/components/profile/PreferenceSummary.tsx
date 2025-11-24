import { logger } from "@/lib/utils/logger";

export interface PreferenceSummaryProps {
  createdAt: string;
  updatedAt: string;
}

/**
 * Sekcja informacyjna wyświetlająca metadane profilu
 */
export function PreferenceSummary({ createdAt, updatedAt }: PreferenceSummaryProps) {
  // Formatuj daty do lokalnego formatu
  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(date);
    } catch (error) {
      if (error instanceof Error) {
        logger.warn("Błąd podczas formatowania daty", { error: error.message, isoDate });
      } else {
        logger.warn("Nieoczekiwany błąd podczas formatowania daty", { error: String(error), isoDate });
      }
      return isoDate;
    }
  };

  return (
    <aside className="rounded-2xl border border-green-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-6">
      <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">Informacje o profilu</h3>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="inline font-medium text-gray-700 dark:text-gray-300">Utworzono:</dt>
          <dd className="inline ml-2 text-gray-600 dark:text-gray-400">{formatDate(createdAt)}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-700 dark:text-gray-300">Ostatnia aktualizacja:</dt>
          <dd className="inline ml-2 text-gray-600 dark:text-gray-400">{formatDate(updatedAt)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Twoje preferencje językowe i motywu są zapisywane automatycznie i synchronizowane na wszystkich urządzeniach.
      </p>
    </aside>
  );
}
