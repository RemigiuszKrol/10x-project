import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UiTheme } from "@/types";

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
      } catch {
        // Ignoruj błędy localStorage
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
    } catch {
      // Ignoruj błędy localStorage
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
