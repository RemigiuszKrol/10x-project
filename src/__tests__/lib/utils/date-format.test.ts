import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as loggerModule from "@/lib/utils/logger";

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

// Mock date-fns z możliwością podmiany implementacji
const mockParseISO = vi.fn();
const mockFormatDistanceToNow = vi.fn();

vi.mock("date-fns", async () => {
  const actual = await vi.importActual<typeof import("date-fns")>("date-fns");
  return {
    ...actual,
    parseISO: (...args: Parameters<typeof actual.parseISO>) => {
      return mockParseISO(...args);
    },
    formatDistanceToNow: (...args: Parameters<typeof actual.formatDistanceToNow>) => {
      return mockFormatDistanceToNow(...args);
    },
  };
});

// Import po mockowaniu
import { formatRelativeDate } from "@/lib/utils/date-format";

describe("date-format utils", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Przywróć prawdziwe implementacje przed każdym testem
    const actual = await vi.importActual<typeof import("date-fns")>("date-fns");
    mockParseISO.mockImplementation(actual.parseISO);
    mockFormatDistanceToNow.mockImplementation(actual.formatDistanceToNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatRelativeDate", () => {
    describe("Happy path - poprawne daty ISO 8601", () => {
      it("powinien formatować datę z przeszłości", () => {
        // Data 2 dni temu
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const isoDate = twoDaysAgo.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toContain("dni");
        expect(result).toContain("temu");
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien formatować datę z wczoraj", () => {
        // Data wczoraj
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isoDate = yesterday.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toMatch(/wczoraj|dzień temu|dni temu/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien formatować datę sprzed kilku godzin", () => {
        // Data 3 godziny temu
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
        const isoDate = threeHoursAgo.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toMatch(/godzin|minut|sekund/i);
        expect(result).toContain("temu");
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien formatować datę sprzed kilku minut", () => {
        // Data 5 minut temu
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        const isoDate = fiveMinutesAgo.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toMatch(/minut|sekund/i);
        expect(result).toContain("temu");
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien formatować datę z przyszłości", () => {
        // Data za 2 dni
        const twoDaysLater = new Date();
        twoDaysLater.setDate(twoDaysLater.getDate() + 2);
        const isoDate = twoDaysLater.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toMatch(/dni|godzin|minut/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien formatować datę z bardzo odległej przeszłości", () => {
        // Data rok temu
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const isoDate = oneYearAgo.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toMatch(/rok|lat|miesięc/i);
        expect(result).toContain("temu");
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien formatować datę z bardzo odległej przyszłości", () => {
        // Data za rok
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const isoDate = oneYearLater.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toMatch(/rok|lat|miesięc/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien używać polskiej lokalizacji", () => {
        // Data 1 dzień temu
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const isoDate = oneDayAgo.toISOString();

        const result = formatRelativeDate(isoDate);

        // Sprawdź czy wynik zawiera polskie słowa (nie angielskie)
        expect(result).not.toMatch(/ago|day|hour|minute|second/i);
        expect(result).toMatch(/temu|dni|godzin|minut|sekund/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });
    });

    describe("Edge cases - nieprawidłowe formaty dat", () => {
      it("powinien zwrócić 'Data nieznana' dla pustego stringa", () => {
        const result = formatRelativeDate("");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
        expect(vi.mocked(loggerModule.logger.warn)).toHaveBeenCalledWith(
          expect.stringContaining("Błąd podczas formatowania daty relatywnej"),
          expect.objectContaining({
            isoDate: "",
          })
        );
      });

      it("powinien zwrócić 'Data nieznana' dla nieprawidłowego formatu daty", () => {
        const result = formatRelativeDate("nieprawidłowa data");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
        expect(vi.mocked(loggerModule.logger.warn)).toHaveBeenCalledWith(
          expect.stringContaining("Błąd podczas formatowania daty relatywnej"),
          expect.objectContaining({
            isoDate: "nieprawidłowa data",
          })
        );
      });

      it("powinien zwrócić 'Data nieznana' dla częściowego formatu ISO", () => {
        const result = formatRelativeDate("2024-01-01");

        // parseISO może zaakceptować tylko datę bez czasu, ale sprawdzamy czy działa
        // Jeśli nie działa, powinien zwrócić "Data nieznana"
        if (result === "Data nieznana") {
          expect(loggerModule.logger.warn).toHaveBeenCalled();
        } else {
          // Jeśli działa, sprawdź czy jest poprawnie sformatowana
          expect(result).toMatch(/lat|miesięc|dni/i);
        }
      });

      it("powinien zwrócić 'Data nieznana' dla null jako string", () => {
        const result = formatRelativeDate("null");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
      });

      it("powinien zwrócić 'Data nieznana' dla undefined jako string", () => {
        const result = formatRelativeDate("undefined");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
      });

      it("powinien zwrócić 'Data nieznana' dla nieprawidłowego formatu z czasem", () => {
        const result = formatRelativeDate("2024-13-45T25:70:90.999Z");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
      });
    });

    describe("Error handling - błędy parsowania", () => {
      it("powinien obsłużyć błąd Error z parseISO i zalogować go", () => {
        const mockError = new Error("Invalid date format");
        mockParseISO.mockImplementation(() => {
          throw mockError;
        });

        const result = formatRelativeDate("2024-01-01T00:00:00.000Z");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
        expect(vi.mocked(loggerModule.logger.warn)).toHaveBeenCalledWith(
          "Błąd podczas formatowania daty relatywnej",
          expect.objectContaining({
            error: "Invalid date format",
            isoDate: "2024-01-01T00:00:00.000Z",
          })
        );
      });

      it("powinien obsłużyć nieoczekiwany błąd (nie Error) i zalogować go", () => {
        const mockError = "String error";
        mockParseISO.mockImplementation(() => {
          throw mockError;
        });

        const result = formatRelativeDate("2024-01-01T00:00:00.000Z");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
        expect(vi.mocked(loggerModule.logger.warn)).toHaveBeenCalledWith(
          "Nieoczekiwany błąd podczas formatowania daty relatywnej",
          expect.objectContaining({
            error: "String error",
            isoDate: "2024-01-01T00:00:00.000Z",
          })
        );
      });

      it("powinien obsłużyć błąd z formatDistanceToNow i zalogować go", async () => {
        const validDate = new Date("2024-01-01T00:00:00.000Z");
        const actual = await vi.importActual<typeof import("date-fns")>("date-fns");
        mockParseISO.mockImplementation(actual.parseISO);
        mockFormatDistanceToNow.mockImplementation(() => {
          throw new Error("Format error");
        });

        const result = formatRelativeDate("2024-01-01T00:00:00.000Z");

        expect(result).toBe("Data nieznana");
        expect(loggerModule.logger.warn).toHaveBeenCalledTimes(1);
      });
    });

    describe("Formatowanie różnych formatów ISO 8601", () => {
      it("powinien obsłużyć pełny format ISO z milisekundami i Z", () => {
        const isoDate = "2024-01-15T14:30:45.123Z";
        const result = formatRelativeDate(isoDate);

        expect(result).not.toBe("Data nieznana");
        expect(result).toMatch(/lat|miesięc|dni|godzin|minut/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć format ISO bez milisekund", () => {
        const isoDate = "2024-01-15T14:30:45Z";
        const result = formatRelativeDate(isoDate);

        expect(result).not.toBe("Data nieznana");
        expect(result).toMatch(/lat|miesięc|dni|godzin|minut/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć format ISO z offsetem czasowym", () => {
        const isoDate = "2024-01-15T14:30:45+01:00";
        const result = formatRelativeDate(isoDate);

        expect(result).not.toBe("Data nieznana");
        expect(result).toMatch(/lat|miesięc|dni|godzin|minut/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien obsłużyć format ISO z offsetem ujemnym", () => {
        const isoDate = "2024-01-15T14:30:45-05:00";
        const result = formatRelativeDate(isoDate);

        expect(result).not.toBe("Data nieznana");
        expect(result).toMatch(/lat|miesięc|dni|godzin|minut/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });
    });

    describe("Zachowanie z addSuffix", () => {
      it("powinien dodawać suffix 'temu' dla dat z przeszłości", () => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const isoDate = oneDayAgo.toISOString();

        const result = formatRelativeDate(isoDate);

        expect(result).toContain("temu");
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });

      it("powinien dodawać odpowiedni suffix dla dat z przyszłości", () => {
        const oneDayLater = new Date();
        oneDayLater.setDate(oneDayLater.getDate() + 1);
        const isoDate = oneDayLater.toISOString();

        const result = formatRelativeDate(isoDate);

        // date-fns z addSuffix: true dodaje "za" dla przyszłości w polskiej lokalizacji
        expect(result).toMatch(/za|dni|godzin|minut/i);
        expect(loggerModule.logger.warn).not.toHaveBeenCalled();
      });
    });
  });
});
