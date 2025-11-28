import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock console methods przed importem loggera
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleInfo = vi.fn();
const mockConsoleDebug = vi.fn();

// Zastąp console methods przed importem
const originalConsole = { ...console };

describe("logger", () => {
  beforeEach(() => {
    // Przywróć oryginalne console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;

    // Ustaw mocki
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
    console.info = mockConsoleInfo;
    console.debug = mockConsoleDebug;

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Przywróć oryginalne console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;

    vi.restoreAllMocks();
  });

  describe("Logger class - enabled state", () => {
    it("powinien być włączony domyślnie gdy ENABLE_ERROR_LOGGING nie jest ustawione", async () => {
      // Arrange - usuń zmienną środowiskową
      vi.stubEnv("ENABLE_ERROR_LOGGING", undefined);
      vi.resetModules();

      // Act - dynamiczny import po ustawieniu env
      const { logger } = await import("@/lib/utils/logger");

      // Assert
      expect(logger.isEnabled()).toBe(true);
    });

    it("powinien być włączony gdy ENABLE_ERROR_LOGGING='true'", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();

      // Act
      const { logger } = await import("@/lib/utils/logger");

      // Assert
      expect(logger.isEnabled()).toBe(true);
    });

    it("powinien być wyłączony gdy ENABLE_ERROR_LOGGING='false'", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();

      // Act
      const { logger } = await import("@/lib/utils/logger");

      // Assert
      expect(logger.isEnabled()).toBe(false);
    });

    it("powinien być wyłączony gdy ENABLE_ERROR_LOGGING=false (boolean)", async () => {
      // Arrange - Vitest może przekazać boolean przez vi.stubEnv
      // Ale w Astro/Vite env vars są zawsze stringami, więc testujemy string "false"
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();

      // Act
      const { logger } = await import("@/lib/utils/logger");

      // Assert
      expect(logger.isEnabled()).toBe(false);
    });
  });

  describe("Logger class - error()", () => {
    it("powinien logować błąd gdy logger jest włączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test error message";

      // Act
      logger.error(message);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain("[ERROR]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });

    it("powinien logować błąd z kontekstem", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test error with context";
      const context = {
        endpoint: "/api/test",
        method: "POST",
        user_id: "user-123",
      };

      // Act
      logger.error(message, context);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain("[ERROR]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain("Context:");
      expect(loggedMessage).toContain('"endpoint": "/api/test"');
      expect(loggedMessage).toContain('"method": "POST"');
      expect(loggedMessage).toContain('"user_id": "user-123"');
    });

    it("nie powinien logować gdy logger jest wyłączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test error message";

      // Act
      logger.error(message);

      // Assert
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it("powinien logować błąd z pełnym kontekstem (wszystkie pola)", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Full context error";
      const context = {
        endpoint: "/api/plants",
        method: "GET",
        user_id: "user-456",
        params: { plan_id: "plan-123", x: 5, y: 10 },
        request_id: "req-789",
        error_code: "ValidationError",
        stack: "Error: Test\n  at test.js:1:1",
        custom_field: "custom_value",
      };

      // Act
      logger.error(message, context);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain("Context:");
      expect(loggedMessage).toContain('"endpoint": "/api/plants"');
      expect(loggedMessage).toContain('"method": "GET"');
      expect(loggedMessage).toContain('"user_id": "user-456"');
      expect(loggedMessage).toContain('"plan_id": "plan-123"');
      expect(loggedMessage).toContain('"error_code": "ValidationError"');
      expect(loggedMessage).toContain('"custom_field": "custom_value"');
    });
  });

  describe("Logger class - warn()", () => {
    it("powinien logować ostrzeżenie gdy logger jest włączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test warning message";

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleWarn.mock.calls[0][0];
      expect(loggedMessage).toContain("[WARN]");
      expect(loggedMessage).toContain(message);
    });

    it("powinien logować ostrzeżenie z kontekstem", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test warning with context";
      const context = { endpoint: "/api/test", method: "GET" };

      // Act
      logger.warn(message, context);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleWarn.mock.calls[0][0];
      expect(loggedMessage).toContain("[WARN]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain("Context:");
    });

    it("nie powinien logować gdy logger jest wyłączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test warning message";

      // Act
      logger.warn(message);

      // Assert
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe("Logger class - info()", () => {
    it("powinien logować informację gdy logger jest włączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test info message";

      // Act
      logger.info(message);

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain("[INFO]");
      expect(loggedMessage).toContain(message);
    });

    it("powinien logować informację z kontekstem", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test info with context";
      const context = { user_id: "user-123" };

      // Act
      logger.info(message, context);

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain("[INFO]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain("Context:");
    });

    it("nie powinien logować gdy logger jest wyłączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test info message";

      // Act
      logger.info(message);

      // Assert
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });
  });

  describe("Logger class - debug()", () => {
    it("powinien logować debug gdy logger jest włączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test debug message";

      // Act
      logger.debug(message);

      // Assert
      expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleDebug.mock.calls[0][0];
      expect(loggedMessage).toContain("[DEBUG]");
      expect(loggedMessage).toContain(message);
    });

    it("powinien logować debug z kontekstem", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test debug with context";
      const context = { params: { x: 1, y: 2 } };

      // Act
      logger.debug(message, context);

      // Assert
      expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleDebug.mock.calls[0][0];
      expect(loggedMessage).toContain("[DEBUG]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain("Context:");
    });

    it("nie powinien logować gdy logger jest wyłączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Test debug message";

      // Act
      logger.debug(message);

      // Assert
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe("Logger class - formatLogEntry", () => {
    it("powinien formatować log bez kontekstu poprawnie", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Simple message";

      // Act
      logger.info(message);

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      // Format: [timestamp] [LEVEL] message
      expect(loggedMessage).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(loggedMessage).toContain("[INFO]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).not.toContain("Context:");
    });

    it("powinien formatować log z kontekstem poprawnie", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Message with context";
      const context = { key: "value" };

      // Act
      logger.info(message, context);

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain("[INFO]");
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain("Context:");
      expect(loggedMessage).toContain('"key": "value"');
    });

    it("powinien formatować timestamp jako ISO 8601", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const beforeTime = new Date().toISOString();

      // Act
      logger.info("Test timestamp");

      // Assert
      const afterTime = new Date().toISOString();
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      const timestampMatch = loggedMessage.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      expect(timestampMatch).not.toBeNull();
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        const logTime = new Date(timestamp).getTime();
        const before = new Date(beforeTime).getTime();
        const after = new Date(afterTime).getTime();
        expect(logTime).toBeGreaterThanOrEqual(before);
        expect(logTime).toBeLessThanOrEqual(after);
      }
    });

    it("powinien formatować poziom logowania wielkimi literami", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");

      // Act & Assert
      logger.error("Error test");
      expect(mockConsoleError.mock.calls[0][0]).toContain("[ERROR]");

      logger.warn("Warn test");
      expect(mockConsoleWarn.mock.calls[0][0]).toContain("[WARN]");

      logger.info("Info test");
      expect(mockConsoleInfo.mock.calls[0][0]).toContain("[INFO]");

      logger.debug("Debug test");
      expect(mockConsoleDebug.mock.calls[0][0]).toContain("[DEBUG]");
    });
  });

  describe("Helper functions - logError", () => {
    it("powinien wywołać logger.error", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logError } = await import("@/lib/utils/logger");
      const message = "Helper error message";

      // Act
      logError(message);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
    });

    it("powinien przekazać kontekst do logger.error", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logError } = await import("@/lib/utils/logger");
      const message = "Helper error with context";
      const context = { endpoint: "/api/test" };

      // Act
      logError(message, context);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('"endpoint": "/api/test"');
    });

    it("nie powinien logować gdy logger jest wyłączony", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "false");
      vi.resetModules();
      const { logError } = await import("@/lib/utils/logger");
      const message = "Helper error message";

      // Act
      logError(message);

      // Assert
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("Helper functions - logWarning", () => {
    it("powinien wywołać logger.warn", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logWarning } = await import("@/lib/utils/logger");
      const message = "Helper warning message";

      // Act
      logWarning(message);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleWarn.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
    });

    it("powinien przekazać kontekst do logger.warn", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logWarning } = await import("@/lib/utils/logger");
      const message = "Helper warning with context";
      const context = { method: "POST" };

      // Act
      logWarning(message, context);

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleWarn.mock.calls[0][0];
      expect(loggedMessage).toContain('"method": "POST"');
    });
  });

  describe("Helper functions - logInfo", () => {
    it("powinien wywołać logger.info", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logInfo } = await import("@/lib/utils/logger");
      const message = "Helper info message";

      // Act
      logInfo(message);

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
    });

    it("powinien przekazać kontekst do logger.info", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logInfo } = await import("@/lib/utils/logger");
      const message = "Helper info with context";
      const context = { user_id: "user-123" };

      // Act
      logInfo(message, context);

      // Assert
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain('"user_id": "user-123"');
    });
  });

  describe("Helper functions - logDebug", () => {
    it("powinien wywołać logger.debug", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logDebug } = await import("@/lib/utils/logger");
      const message = "Helper debug message";

      // Act
      logDebug(message);

      // Assert
      expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleDebug.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
    });

    it("powinien przekazać kontekst do logger.debug", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logDebug } = await import("@/lib/utils/logger");
      const message = "Helper debug with context";
      const context = { params: { x: 1 } };

      // Act
      logDebug(message, context);

      // Assert
      expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleDebug.mock.calls[0][0];
      expect(loggedMessage).toContain('"x": 1');
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć pusty kontekst (undefined)", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Message without context";

      // Act
      logger.error(message, undefined);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).not.toContain("Context:");
    });

    it("powinien obsłużyć pusty obiekt kontekstu", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Message with empty context";
      const context = {};

      // Act
      logger.error(message, context);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain("Context:");
      expect(loggedMessage).toContain("{}");
    });

    it("powinien obsłużyć kontekst z wartościami null i undefined", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Message with null/undefined";
      const context = {
        nullValue: null,
        undefinedValue: undefined,
        stringValue: "test",
      };

      // Act
      logger.error(message, context);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain("Context:");
      expect(loggedMessage).toContain('"nullValue": null');
      expect(loggedMessage).toContain('"stringValue": "test"');
      // undefined values są pomijane w JSON.stringify
    });

    it("powinien obsłużyć bardzo długi message", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const longMessage = "A".repeat(1000);

      // Act
      logger.error(longMessage);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(longMessage);
    });

    it("powinien obsłużyć kontekst z zagnieżdżonymi obiektami", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");
      const message = "Message with nested context";
      const context = {
        nested: {
          level1: {
            level2: "deep value",
          },
        },
      };

      // Act
      logger.error(message, context);

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain("Context:");
      expect(loggedMessage).toContain('"level2": "deep value"');
    });

    it("powinien używać odpowiednich metod console dla każdego poziomu", async () => {
      // Arrange
      vi.stubEnv("ENABLE_ERROR_LOGGING", "true");
      vi.resetModules();
      const { logger } = await import("@/lib/utils/logger");

      // Act
      logger.error("error");
      logger.warn("warn");
      logger.info("info");
      logger.debug("debug");

      // Assert
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("error")
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("warn")
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("info")
      );
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining("debug")
      );
    });
  });
});

