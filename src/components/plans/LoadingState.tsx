import { Loader2 } from "lucide-react";

/**
 * Komponent wyświetlający wskaźnik ładowania podczas pobierania danych z API
 */
export function LoadingState() {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl border border-green-100 dark:border-gray-700 shadow-xl p-12"
      role="status"
      aria-live="polite"
      aria-label="Ładowanie planów"
    >
      <div className="flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-500/10 dark:to-emerald-500/10 rounded-full blur-xl animate-pulse" />
          <Loader2 className="relative h-12 w-12 animate-spin text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Ładowanie planów...</p>
      </div>
    </div>
  );
}
