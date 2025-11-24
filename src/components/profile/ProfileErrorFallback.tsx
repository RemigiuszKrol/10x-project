import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ProfileError } from "@/lib/hooks/useProfilePreferences";

export interface ProfileErrorFallbackProps {
  error: ProfileError;
  onRetry: () => void;
}

/**
 * Komponent wyświetlający błąd z przyciskiem ponów
 */
export function ProfileErrorFallback({ error, onRetry }: ProfileErrorFallbackProps) {
  // Dostosuj tytuł i opis w zależności od kodu błędu
  const getErrorContent = () => {
    switch (error.code) {
      case "Unauthorized":
      case "Forbidden":
        return {
          title: "Brak dostępu",
          description: error.message,
          showRetry: false,
          actionLabel: "Przejdź do logowania",
          actionHref: "/auth/login",
        };
      case "NotFound":
        return {
          title: "Profil nie znaleziony",
          description: error.message,
          showRetry: true,
          actionLabel: "Spróbuj ponownie",
        };
      case "InternalError":
      case "UpstreamTimeout":
        return {
          title: "Wystąpił błąd",
          description: error.message,
          showRetry: true,
          actionLabel: "Spróbuj ponownie",
        };
      default:
        return {
          title: "Wystąpił błąd",
          description: error.message || "Nie udało się załadować profilu.",
          showRetry: true,
          actionLabel: "Spróbuj ponownie",
        };
    }
  };

  const { title, description, showRetry, actionLabel, actionHref } = getErrorContent();

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-red-200 dark:border-red-900/30 bg-white dark:bg-gray-800 shadow-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            {showRetry ? (
              <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {actionLabel}
              </Button>
            ) : actionHref ? (
              <Button asChild variant="outline" size="sm">
                <a href={actionHref}>{actionLabel}</a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
