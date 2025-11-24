import { FileQuestion, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateNew: () => void;
}

/**
 * Komponent wyświetlany gdy użytkownik nie posiada jeszcze żadnych planów
 */
export function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-green-100 dark:border-gray-700 shadow-xl p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-500/10 dark:to-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-800">
            <FileQuestion className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Brak planów</h2>
        <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
          Nie masz jeszcze żadnych planów działki. Utwórz pierwszy plan, aby rozpocząć planowanie swojego ogrodu.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button onClick={onCreateNew} size="lg" className="gap-2">
            <Sprout className="h-5 w-5" />
            Utwórz pierwszy plan
          </Button>
        </div>
        <div className="mt-8 pt-8 border-t border-green-100 dark:border-gray-700 w-full max-w-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 <strong>Wskazówka:</strong> Plan działki pomoże Ci optymalnie rozmieścić rośliny w ogrodzie
          </p>
        </div>
      </div>
    </div>
  );
}
