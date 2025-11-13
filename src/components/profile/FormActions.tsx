import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface FormActionsProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset?: () => void;
}

/**
 * Przyciski Zapisz i Anuluj dla formularza profilu
 */
export function FormActions({ isDirty, isSubmitting, onReset }: FormActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        type="submit"
        disabled={!isDirty || isSubmitting}
        className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Zapisywanie..." : "Zapisz"}
      </Button>
      {onReset && (
        <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={onReset}>
          Anuluj
        </Button>
      )}
    </div>
  );
}
