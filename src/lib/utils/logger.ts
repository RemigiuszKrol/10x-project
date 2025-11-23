/* eslint-disable no-console */
/**
 * Logger - System rejestrowania błędów w konsoli
 *
 * Logger umożliwia rejestrowanie błędów, ostrzeżeń i informacji w konsoli
 * z możliwością wyłączenia przez zmienną środowiskową ENABLE_ERROR_LOGGING.
 *
 * Jeśli ENABLE_ERROR_LOGGING=false, logger jest no-op (nic nie robi).
 * Domyślnie logowanie jest włączone.
 */

type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogContext {
  endpoint?: string;
  method?: string;
  user_id?: string;
  params?: Record<string, unknown>;
  request_id?: string;
  error_code?: string;
  stack?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Klasa Logger - zarządza logowaniem z możliwością wyłączenia
 */
class Logger {
  private enabled: boolean;

  constructor() {
    // Sprawdź zmienną środowiskową ENABLE_ERROR_LOGGING
    // Domyślnie włączone (jeśli nie ustawione lub "true")
    const envValue = import.meta.env.ENABLE_ERROR_LOGGING;
    this.enabled = envValue !== "false" && envValue !== false;
  }

  /**
   * Loguje błąd
   */
  error(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("error", message, context);
  }

  /**
   * Loguje ostrzeżenie
   */
  warn(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("warn", message, context);
  }

  /**
   * Loguje informację
   */
  info(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("info", message, context);
  }

  /**
   * Loguje debug
   */
  debug(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    this.log("debug", message, context);
  }

  /**
   * Wewnętrzna metoda logowania
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    // Formatowanie dla konsoli
    const formattedMessage = this.formatLogEntry(entry);

    // Wyświetlanie w konsoli z odpowiednim poziomem
    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "info":
        console.info(formattedMessage);
        break;
      case "debug":
        console.debug(formattedMessage);
        break;
    }
  }

  /**
   * Formatuje wpis logu do czytelnej formy
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    parts.push(`[${entry.timestamp}]`);

    // Level
    parts.push(`[${entry.level.toUpperCase()}]`);

    // Message
    parts.push(entry.message);

    // Context (jeśli istnieje)
    if (entry.context) {
      const contextStr = JSON.stringify(entry.context, null, 2);
      parts.push(`\nContext: ${contextStr}`);
    }

    return parts.join(" ");
  }

  /**
   * Sprawdza czy logger jest włączony
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Singleton instance loggera
 */
export const logger = new Logger();

/**
 * Funkcje pomocnicze dla wygody
 */
export function logError(message: string, context?: LogContext): void {
  logger.error(message, context);
}

export function logWarning(message: string, context?: LogContext): void {
  logger.warn(message, context);
}

export function logInfo(message: string, context?: LogContext): void {
  logger.info(message, context);
}

export function logDebug(message: string, context?: LogContext): void {
  logger.debug(message, context);
}
