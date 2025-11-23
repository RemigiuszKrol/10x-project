import { useState, useCallback, useRef } from "react";
import type { OperationLogEntry } from "@/types";

/**
 * Maksymalna liczba wpisów w logu operacji
 */
const MAX_OPERATIONS = 50;

/**
 * Hook do zarządzania logiem operacji w edytorze
 *
 * Funkcjonalności:
 * - Dodawanie wpisów do logu
 * - Automatyczne ograniczenie do MAX_OPERATIONS wpisów
 * - Generowanie unikalnych ID dla wpisów
 * - Zwracanie listy operacji do wyświetlenia
 *
 * @returns Obiekt z operacjami i funkcjami do logowania
 */
export function useOperationLog() {
  const [operations, setOperations] = useState<OperationLogEntry[]>([]);
  const idCounterRef = useRef(0);

  /**
   * Generuje unikalne ID dla wpisu
   */
  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `op-${Date.now()}-${idCounterRef.current}`;
  }, []);

  /**
   * Dodaje wpis do logu operacji
   */
  const addOperation = useCallback(
    (message: string, type: OperationLogEntry["type"] = "info") => {
      const entry: OperationLogEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        message,
        type,
      };

      setOperations((prev) => {
        const updated = [...prev, entry];
        // Ogranicz do MAX_OPERATIONS wpisów (zachowaj najnowsze)
        if (updated.length > MAX_OPERATIONS) {
          return updated.slice(-MAX_OPERATIONS);
        }
        return updated;
      });
    },
    [generateId]
  );

  /**
   * Loguje operację sukcesu
   */
  const logSuccess = useCallback(
    (message: string) => {
      addOperation(message, "success");
    },
    [addOperation]
  );

  /**
   * Loguje operację błędu
   */
  const logError = useCallback(
    (message: string) => {
      addOperation(message, "error");
    },
    [addOperation]
  );

  /**
   * Loguje operację ostrzeżenia
   */
  const logWarning = useCallback(
    (message: string) => {
      addOperation(message, "warning");
    },
    [addOperation]
  );

  /**
   * Loguje operację informacyjną
   */
  const logInfo = useCallback(
    (message: string) => {
      addOperation(message, "info");
    },
    [addOperation]
  );

  /**
   * Czyści log operacji
   */
  const clearLog = useCallback(() => {
    setOperations([]);
  }, []);

  return {
    operations,
    addOperation,
    logSuccess,
    logError,
    logWarning,
    logInfo,
    clearLog,
  };
}
