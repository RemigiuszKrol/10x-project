import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlansListHeaderProps {
  onCreateNew: () => void;
}

/**
 * Nagłówek sekcji zawierający tytuł strony oraz główny przycisk CTA do tworzenia nowego planu
 */
export function PlansListHeader({ onCreateNew }: PlansListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Moje plany</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Zarządzaj swoimi planami działek ogrodowych</p>
      </div>
      <Button onClick={onCreateNew} size="lg" className="shrink-0">
        <Plus className="mr-2 h-5 w-5" />
        Nowy plan
      </Button>
    </div>
  );
}
