import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
      } catch {
        // Ignoruj błędy localStorage
      }
    }
    return defaultLanguage;
  });

  // Zapisz w localStorage przy zmianie
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, languageCode);
    } catch {
      // Ignoruj błędy localStorage
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
