import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/utils/logger";

interface LanguageContextValue {
  languageCode: string;
  setLanguageCode: (code: string) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
  storageKey?: string;
}

/**
 * Provider dla zarządzania językiem aplikacji
 * Zapisuje preferencje w localStorage
 */
export function LanguageProvider({
  children,
  defaultLanguage = "pl",
  storageKey = "plantsplaner-language",
}: LanguageProviderProps) {
  const [languageCode, setLanguageCodeState] = useState<string>(() => {
    // Próbuj załadować z localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return stored;
        }
      } catch (error) {
        // Ignoruj błędy localStorage
        if (error instanceof Error) {
          logger.warn("Błąd podczas wczytywania języka z localStorage", { error: error.message, storageKey });
        } else {
          logger.warn("Nieoczekiwany błąd podczas wczytywania języka z localStorage", {
            error: String(error),
            storageKey,
          });
        }
      }
    }
    return defaultLanguage;
  });

  // Zapisz w localStorage przy zmianie
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, languageCode);
    } catch (error) {
      // Ignoruj błędy localStorage
      if (error instanceof Error) {
        logger.warn("Błąd podczas zapisywania języka do localStorage", {
          error: error.message,
          storageKey,
          languageCode,
        });
      } else {
        logger.warn("Nieoczekiwany błąd podczas zapisywania języka do localStorage", {
          error: String(error),
          storageKey,
          languageCode,
        });
      }
    }

    // Opcjonalnie: ustaw lang attribute na <html>
    if (typeof document !== "undefined") {
      document.documentElement.lang = languageCode;
    }
  }, [languageCode, storageKey]);

  const setLanguageCode = (code: string) => {
    setLanguageCodeState(code);
  };

  const value: LanguageContextValue = {
    languageCode,
    setLanguageCode,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Hook do korzystania z kontekstu języka
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
