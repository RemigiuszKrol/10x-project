import { useEffect } from "react";

/**
 * Komponent auto-refresh
 * Automatycznie przekierowuje użytkownika po określonym czasie
 */
interface AutoRefreshProps {
  redirectTo: string;
  delay?: number;
}

export function AutoRefresh({ redirectTo, delay = 3000 }: AutoRefreshProps) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      window.location.assign(redirectTo);
    }, delay);

    // Cleanup function - anuluj timeout jeśli komponent zostanie odmontowany
    return () => clearTimeout(timeoutId);
  }, [redirectTo, delay]);

  return null;
}
