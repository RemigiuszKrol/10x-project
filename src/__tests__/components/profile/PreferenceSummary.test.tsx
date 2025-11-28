import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreferenceSummary, type PreferenceSummaryProps } from "@/components/profile/PreferenceSummary";

// Mock logger
const mockLoggerWarn = vi.fn();
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("PreferenceSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować nagłówek 'Informacje o profilu'", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      expect(screen.getByRole("heading", { name: /informacje o profilu/i })).toBeInTheDocument();
    });

    it("powinien renderować sekcję z datą utworzenia", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      expect(screen.getByText(/utworzono:/i)).toBeInTheDocument();
    });

    it("powinien renderować sekcję z datą ostatniej aktualizacji", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      expect(screen.getByText(/ostatnia aktualizacja:/i)).toBeInTheDocument();
    });

    it("powinien renderować opis informacyjny o synchronizacji", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      expect(
        screen.getByText(/twoje preferencje językowe i motywu są zapisywane automatycznie/i)
      ).toBeInTheDocument();
    });

    it("powinien renderować element aside z odpowiednimi klasami CSS", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      const { container } = render(<PreferenceSummary {...props} />);

      // Assert
      const aside = container.querySelector("aside");
      expect(aside).toBeInTheDocument();
      expect(aside).toHaveClass("rounded-2xl", "border", "shadow-lg", "p-6");
      expect(aside).toHaveClass("border-green-100", "dark:border-gray-700");
      expect(aside).toHaveClass("bg-white", "dark:bg-gray-800");
    });
  });

  describe("Formatowanie dat", () => {
    it("powinien formatować datę utworzenia w formacie polskim", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      expect(createdAtText).toBeTruthy();
      // Sprawdź czy data zawiera polskie formatowanie (np. "15 stycznia 2024" lub podobne)
      expect(createdAtText).toMatch(/\d{1,2}/); // Zawiera dzień
    });

    it("powinien formatować datę aktualizacji w formacie polskim", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;
      expect(updatedAtText).toBeTruthy();
      // Sprawdź czy data zawiera polskie formatowanie
      expect(updatedAtText).toMatch(/\d{1,2}/); // Zawiera dzień
    });

    it("powinien formatować różne formaty dat ISO", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-12-31T23:59:59.999Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;

      expect(createdAtText).toBeTruthy();
      expect(updatedAtText).toBeTruthy();
      expect(createdAtText).not.toBe("2024-12-31T23:59:59.999Z");
      expect(updatedAtText).not.toBe("2025-01-01T00:00:00.000Z");
    });

    it("powinien formatować daty z różnymi strefami czasowymi", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-06-15T12:00:00+02:00",
        updatedAt: "2024-06-15T12:00:00-05:00",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;

      expect(createdAtText).toBeTruthy();
      expect(updatedAtText).toBeTruthy();
    });
  });

  describe("Obsługa błędów formatowania", () => {
    it("powinien wyświetlić oryginalną wartość ISO gdy formatowanie się nie powiedzie", () => {
      // Arrange
      const invalidDate = "invalid-date-string";
      const props: PreferenceSummaryProps = {
        createdAt: invalidDate,
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      expect(createdAtText).toBe(invalidDate);
    });

    it("powinien zalogować błąd przez logger.warn gdy formatowanie się nie powiedzie", () => {
      // Arrange
      const invalidDate = "invalid-date-string";
      const props: PreferenceSummaryProps = {
        createdAt: invalidDate,
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        "Błąd podczas formatowania daty",
        expect.objectContaining({
          error: expect.any(String),
          isoDate: invalidDate,
        })
      );
    });

    it("powinien obsłużyć pusty string jako datę", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      expect(createdAtText).toBe("");
      expect(mockLoggerWarn).toHaveBeenCalled();
    });

    it("powinien obsłużyć bardzo długi string jako datę", () => {
      // Arrange
      const longInvalidDate = "a".repeat(1000);
      const props: PreferenceSummaryProps = {
        createdAt: longInvalidDate,
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      expect(createdAtText).toBe(longInvalidDate);
      expect(mockLoggerWarn).toHaveBeenCalled();
    });
  });

  describe("Różne scenariusze dat", () => {
    it("powinien obsłużyć daty z początku epoki Unix", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "1970-01-01T00:00:00Z",
        updatedAt: "1970-01-01T00:00:00.001Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;

      expect(createdAtText).toBeTruthy();
      expect(updatedAtText).toBeTruthy();
    });

    it("powinien obsłużyć daty z przyszłości", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2099-12-31T23:59:59Z",
        updatedAt: "2100-01-01T00:00:00Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;

      expect(createdAtText).toBeTruthy();
      expect(updatedAtText).toBeTruthy();
    });

    it("powinien obsłużyć identyczne daty utworzenia i aktualizacji", () => {
      // Arrange
      const sameDate = "2024-01-15T10:30:00Z";
      const props: PreferenceSummaryProps = {
        createdAt: sameDate,
        updatedAt: sameDate,
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;

      expect(createdAtText).toBe(updatedAtText);
    });

    it("powinien obsłużyć daty z różnymi precyzjami milisekund", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-15T10:30:00.123Z",
      };

      // Act
      render(<PreferenceSummary {...props} />);

      // Assert
      const createdAtText = screen.getByText(/utworzono:/i).nextSibling?.textContent;
      const updatedAtText = screen.getByText(/ostatnia aktualizacja:/i).nextSibling?.textContent;

      expect(createdAtText).toBeTruthy();
      expect(updatedAtText).toBeTruthy();
    });
  });

  describe("Struktura DOM", () => {
    it("powinien używać semantycznego HTML (dl, dt, dd)", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      const { container } = render(<PreferenceSummary {...props} />);

      // Assert
      const dl = container.querySelector("dl");
      const dtElements = container.querySelectorAll("dt");
      const ddElements = container.querySelectorAll("dd");

      expect(dl).toBeInTheDocument();
      expect(dtElements).toHaveLength(2);
      expect(ddElements).toHaveLength(2);
    });

    it("powinien mieć odpowiednią strukturę zagnieżdżenia", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      const { container } = render(<PreferenceSummary {...props} />);

      // Assert
      const aside = container.querySelector("aside");
      const heading = aside?.querySelector("h3");
      const dl = aside?.querySelector("dl");
      const p = aside?.querySelector("p");

      expect(aside).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(dl).toBeInTheDocument();
      expect(p).toBeInTheDocument();
    });
  });

  describe("Dark mode support", () => {
    it("powinien mieć klasy CSS dla dark mode", () => {
      // Arrange
      const props: PreferenceSummaryProps = {
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:45:00Z",
      };

      // Act
      const { container } = render(<PreferenceSummary {...props} />);

      // Assert
      const aside = container.querySelector("aside");
      expect(aside).toHaveClass("dark:border-gray-700", "dark:bg-gray-800");

      const heading = container.querySelector("h3");
      expect(heading).toHaveClass("dark:text-gray-100");

      const dtElements = container.querySelectorAll("dt");
      dtElements.forEach((dt) => {
        expect(dt).toHaveClass("dark:text-gray-300");
      });

      const ddElements = container.querySelectorAll("dd");
      ddElements.forEach((dd) => {
        expect(dd).toHaveClass("dark:text-gray-400");
      });

      const p = container.querySelector("p");
      expect(p).toHaveClass("dark:text-gray-400");
    });
  });
});

