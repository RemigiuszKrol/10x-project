import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AutoRefresh } from "@/components/AutoRefresh";

// Mock window.location.assign
const mockAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    assign: mockAssign,
  },
  writable: true,
});

describe("AutoRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Przekierowanie", () => {
    it("powinien przekierować użytkownika po domyślnym czasie (3000ms)", async () => {
      const redirectTo = "/test-page";

      render(<AutoRefresh redirectTo={redirectTo} />);

      // Sprawdź, że przekierowanie nie zostało jeszcze wywołane
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o 2999ms (tuż przed przekierowaniem)
      vi.advanceTimersByTime(2999);
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o 1ms więcej (łącznie 3000ms)
      vi.advanceTimersByTime(1);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });

    it("powinien przekierować użytkownika po niestandardowym czasie", async () => {
      const redirectTo = "/custom-page";
      const customDelay = 5000;

      render(<AutoRefresh redirectTo={redirectTo} delay={customDelay} />);

      // Przesuń czas o 4999ms
      vi.advanceTimersByTime(4999);
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o 1ms więcej (łącznie 5000ms)
      vi.advanceTimersByTime(1);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });

    it("powinien przekierować natychmiast gdy delay=0", () => {
      const redirectTo = "/immediate-page";

      render(<AutoRefresh redirectTo={redirectTo} delay={0} />);

      // Przekierowanie powinno nastąpić natychmiast (w następnym tick)
      vi.advanceTimersByTime(0);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });

    it("powinien obsłużyć bardzo długi delay", () => {
      const redirectTo = "/long-delay-page";
      const longDelay = 60000; // 60 sekund

      render(<AutoRefresh redirectTo={redirectTo} delay={longDelay} />);

      // Przesuń czas o 59999ms
      vi.advanceTimersByTime(59999);
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o 1ms więcej
      vi.advanceTimersByTime(1);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });
  });

  describe("Cleanup", () => {
    it("powinien anulować przekierowanie gdy komponent zostanie odmontowany przed upływem czasu", () => {
      const redirectTo = "/test-page";

      const { unmount } = render(<AutoRefresh redirectTo={redirectTo} />);

      // Przesuń czas o 1500ms (połowa domyślnego czasu)
      vi.advanceTimersByTime(1500);
      expect(mockAssign).not.toHaveBeenCalled();

      // Odmontuj komponent
      unmount();

      // Przesuń czas o pozostałe 1500ms
      vi.advanceTimersByTime(1500);

      // Przekierowanie nie powinno zostać wywołane
      expect(mockAssign).not.toHaveBeenCalled();
    });

    it("powinien anulować przekierowanie nawet gdy komponent zostanie odmontowany tuż przed upływem czasu", () => {
      const redirectTo = "/test-page";

      const { unmount } = render(<AutoRefresh redirectTo={redirectTo} />);

      // Przesuń czas o 2999ms (tuż przed przekierowaniem)
      vi.advanceTimersByTime(2999);
      expect(mockAssign).not.toHaveBeenCalled();

      // Odmontuj komponent
      unmount();

      // Przesuń czas o 1ms więcej
      vi.advanceTimersByTime(1);

      // Przekierowanie nie powinno zostać wywołane
      expect(mockAssign).not.toHaveBeenCalled();
    });
  });

  describe("Zmiana props", () => {
    it("powinien zaktualizować przekierowanie gdy zmieni się redirectTo", () => {
      const { rerender } = render(<AutoRefresh redirectTo="/page1" />);

      // Przesuń czas o 1500ms
      vi.advanceTimersByTime(1500);
      expect(mockAssign).not.toHaveBeenCalled();

      // Zmień redirectTo
      rerender(<AutoRefresh redirectTo="/page2" />);

      // Przesuń czas o pozostałe 1500ms (nowy timeout powinien być ustawiony)
      vi.advanceTimersByTime(1500);
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o kolejne 1500ms (łącznie 3000ms od zmiany)
      vi.advanceTimersByTime(1500);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith("/page2");
    });

    it("powinien zaktualizować delay gdy zmieni się prop delay", () => {
      const { rerender } = render(<AutoRefresh redirectTo="/test" delay={5000} />);

      // Przesuń czas o 2000ms
      vi.advanceTimersByTime(2000);
      expect(mockAssign).not.toHaveBeenCalled();

      // Zmień delay na 1000ms
      rerender(<AutoRefresh redirectTo="/test" delay={1000} />);

      // Przesuń czas o 1000ms (nowy timeout powinien być ustawiony)
      vi.advanceTimersByTime(1000);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith("/test");
    });

    it("powinien anulować poprzedni timeout i ustawić nowy gdy zmienią się oba props", () => {
      const { rerender } = render(<AutoRefresh redirectTo="/page1" delay={5000} />);

      // Przesuń czas o 2000ms
      vi.advanceTimersByTime(2000);
      expect(mockAssign).not.toHaveBeenCalled();

      // Zmień oba props
      rerender(<AutoRefresh redirectTo="/page2" delay={1000} />);

      // Przesuń czas o 1000ms (nowy timeout)
      vi.advanceTimersByTime(1000);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith("/page2");

      // Upewnij się, że stary timeout nie został wywołany
      // (gdyby został, mockAssign zostałby wywołany 2 razy)
      expect(mockAssign).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("powinien obsłużyć bardzo krótki delay (1ms)", () => {
      const redirectTo = "/short-delay-page";

      render(<AutoRefresh redirectTo={redirectTo} delay={1} />);

      // Przesuń czas o 0ms
      vi.advanceTimersByTime(0);
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o 1ms
      vi.advanceTimersByTime(1);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });

    it("powinien obsłużyć ujemny delay (traktowany jako 0)", () => {
      const redirectTo = "/negative-delay-page";

      render(<AutoRefresh redirectTo={redirectTo} delay={-100} />);

      // Przekierowanie powinno nastąpić natychmiast
      vi.advanceTimersByTime(0);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });

    it("powinien obsłużyć bardzo długi URL", () => {
      const longUrl = "/" + "a".repeat(2000);
      const redirectTo = longUrl;

      render(<AutoRefresh redirectTo={redirectTo} />);

      vi.advanceTimersByTime(3000);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith(redirectTo);
    });

    it("powinien obsłużyć pusty string jako redirectTo", () => {
      const redirectTo = "";

      render(<AutoRefresh redirectTo={redirectTo} />);

      vi.advanceTimersByTime(3000);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith("");
    });
  });

  describe("Renderowanie", () => {
    it("powinien zwrócić null (nie renderować żadnego UI)", () => {
      const { container } = render(<AutoRefresh redirectTo="/test" />);

      // Komponent nie powinien renderować żadnych elementów DOM
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Wielokrotne renderowanie", () => {
    it("powinien poprawnie obsłużyć wiele instancji komponentu jednocześnie", () => {
      const { unmount: unmount1 } = render(
        <AutoRefresh redirectTo="/page1" delay={2000} />
      );
      const { unmount: unmount2 } = render(
        <AutoRefresh redirectTo="/page2" delay={3000} />
      );

      // Przesuń czas o 2000ms - pierwszy powinien się przekierować
      vi.advanceTimersByTime(2000);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith("/page1");

      // Przesuń czas o kolejne 1000ms - drugi powinien się przekierować
      vi.advanceTimersByTime(1000);
      expect(mockAssign).toHaveBeenCalledTimes(2);
      expect(mockAssign).toHaveBeenNthCalledWith(2, "/page2");

      unmount1();
      unmount2();
    });

    it("powinien poprawnie obsłużyć unmount jednej instancji bez wpływu na drugą", () => {
      const { unmount: unmount1 } = render(
        <AutoRefresh redirectTo="/page1" delay={2000} />
      );
      const { unmount: unmount2 } = render(
        <AutoRefresh redirectTo="/page2" delay={3000} />
      );

      // Odmontuj pierwszą instancję
      unmount1();

      // Przesuń czas o 2000ms - pierwsza nie powinna się przekierować
      vi.advanceTimersByTime(2000);
      expect(mockAssign).not.toHaveBeenCalled();

      // Przesuń czas o kolejne 1000ms - druga powinna się przekierować
      vi.advanceTimersByTime(1000);
      expect(mockAssign).toHaveBeenCalledTimes(1);
      expect(mockAssign).toHaveBeenCalledWith("/page2");

      unmount2();
    });
  });
});

