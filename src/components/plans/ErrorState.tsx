import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/**
 * Komponent wyświetlający komunikat błędu oraz przycisk umożliwiający ponowienie operacji
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-red-100 shadow-xl p-12"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border-2 border-red-200">
          <AlertCircle className="h-8 w-8 text-red-600" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Wystąpił błąd</h2>
        <p className="mt-2 text-center text-gray-600 max-w-md" id="error-message">
          {message}
        </p>
        <Button onClick={onRetry} variant="outline" className="mt-6" aria-describedby="error-message">
          Spróbuj ponownie
        </Button>
      </div>
    </div>
  );
}
