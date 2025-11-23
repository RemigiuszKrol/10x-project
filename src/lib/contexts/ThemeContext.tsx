import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UiTheme } from "@/types";
import { logger } from "@/lib/utils/logger";

interface ThemeContextValue {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: UiTheme;
  storageKey?: string;
}

/**
 * Provider dla zarządzania motywem aplikacji
 * Zapisuje preferencje w localStorage i aplikuje klasę 'dark' do <html>
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "plantsplaner-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<UiTheme>(() => {
    // Próbuj załadować z localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === "light" || stored === "dark") {
          return stored;
        }
      } catch (error) {
        // Ignoruj błędy localStorage
        if (error instanceof Error) {
          logger.warn("Błąd podczas wczytywania motywu z localStorage", { error: error.message, storageKey });
        } else {
          logger.warn("Nieoczekiwany błąd podczas wczytywania motywu z localStorage", {
            error: String(error),
            storageKey,
          });
        }
      }
    }
    return defaultTheme;
  });

  // Aplikuj motyw do dokumentu
  useEffect(() => {
    const root = document.documentElement;

    // Usuń poprzednią klasę
    root.classList.remove("light", "dark");

    // Dodaj nową klasę
    root.classList.add(theme);

    // Zapisz w localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      // Ignoruj błędy localStorage
      if (error instanceof Error) {
        logger.warn("Błąd podczas zapisywania motywu do localStorage", { error: error.message, storageKey, theme });
      } else {
        logger.warn("Nieoczekiwany błąd podczas zapisywania motywu do localStorage", {
          error: String(error),
          storageKey,
          theme,
        });
      }
    }
  }, [theme, storageKey]);

  const setTheme = (newTheme: UiTheme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isDark: theme === "dark",
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook do korzystania z kontekstu motywu
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
