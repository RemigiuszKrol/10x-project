import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  InMemoryRateLimiter,
  type RateLimitResult,
  weatherRefreshLimiter,
  aiEndpointsLimiter,
} from "@/lib/utils/rate-limiter";

describe("rate-limiter", () => {
  describe("InMemoryRateLimiter", () => {
    let limiter: InMemoryRateLimiter;
    const windowMs = 1000; // 1 sekunda dla testów

    beforeEach(() => {
      limiter = new InMemoryRateLimiter(windowMs);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      limiter.reset("test-key");
    });

    describe("check", () => {
      it("powinien pozwolić na pierwsze żądanie dla danego klucza", () => {
        const result = limiter.check("test-key");

        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeUndefined();
      });

      it("powinien zablokować kolejne żądanie w oknie czasowym", () => {
        limiter.check("test-key");

        // Przesuń czas o 500ms (wciąż w oknie)
        vi.advanceTimersByTime(500);

        const result = limiter.check("test-key");

        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBe(1); // Math.ceil((1000 - 500) / 1000) = 1
      });

      it("powinien pozwolić na żądanie po upływie okna czasowego", () => {
        limiter.check("test-key");

        // Przesuń czas o pełne okno + 1ms
        vi.advanceTimersByTime(windowMs + 1);

        const result = limiter.check("test-key");

        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeUndefined();
      });

      it("powinien zwrócić poprawne retryAfter dla różnych momentów w oknie", () => {
        limiter.check("test-key");

        // Test 1: 100ms po pierwszym żądaniu
        vi.advanceTimersByTime(100);
        let result = limiter.check("test-key");
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBe(1); // Math.ceil((1000 - 100) / 1000) = 1

        // Test 2: 999ms po pierwszym żądaniu
        vi.advanceTimersByTime(899); // 100 + 899 = 999ms
        result = limiter.check("test-key");
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBe(1); // Math.ceil((1000 - 999) / 1000) = 1

        // Test 3: dokładnie na granicy okna
        vi.advanceTimersByTime(1); // 999 + 1 = 1000ms
        result = limiter.check("test-key");
        expect(result.allowed).toBe(true);
      });

      it("powinien utrzymywać niezależne limity dla różnych kluczy", () => {
        // Pierwsze wywołanie dla key1
        const result1 = limiter.check("key1");
        expect(result1.allowed).toBe(true);

        // Przesuń czas o 500ms (key1 będzie zablokowany)
        vi.advanceTimersByTime(500);
        const result1Blocked = limiter.check("key1");
        expect(result1Blocked.allowed).toBe(false);

        // key2 może być wywołany w dowolnym momencie i ma swój własny limit
        // Pierwsze wywołanie dla key2 powinno być allowed (niezależny klucz)
        const result2First = limiter.check("key2");
        expect(result2First.allowed).toBe(true);

        // Przesuń czas o 500ms (key2 będzie zablokowany, ale key1 już może być allowed)
        vi.advanceTimersByTime(500);
        const result2Blocked = limiter.check("key2");
        expect(result2Blocked.allowed).toBe(false);

        // key1 powinien być teraz allowed (minęło 1000ms od pierwszego wywołania)
        const result1Allowed = limiter.check("key1");
        expect(result1Allowed.allowed).toBe(true);
      });

      it("powinien aktualizować timestamp przy każdym dozwolonym żądaniu", () => {
        limiter.check("test-key");
        vi.advanceTimersByTime(windowMs + 1);

        // Drugie żądanie powinno być dozwolone i zaktualizować timestamp
        const result1 = limiter.check("test-key");
        expect(result1.allowed).toBe(true);

        // Trzecie żądanie zaraz po drugim powinno być zablokowane
        const result2 = limiter.check("test-key");
        expect(result2.allowed).toBe(false);
      });

      it("powinien obsługiwać klucze z pustym stringiem", () => {
        const result = limiter.check("");

        expect(result.allowed).toBe(true);
      });

      it("powinien obsługiwać klucze ze specjalnymi znakami", () => {
        const specialKey = "key-with-special-chars-!@#$%^&*()";
        const result = limiter.check(specialKey);

        expect(result.allowed).toBe(true);
      });
    });

    describe("reset", () => {
      it("powinien zresetować limit dla danego klucza", () => {
        limiter.check("test-key");
        vi.advanceTimersByTime(500);

        // Sprawdź że limit jest aktywny
        let result = limiter.check("test-key");
        expect(result.allowed).toBe(false);

        // Resetuj limit
        limiter.reset("test-key");

        // Sprawdź że limit został zresetowany
        result = limiter.check("test-key");
        expect(result.allowed).toBe(true);
      });

      it("powinien obsłużyć reset nieistniejącego klucza bez błędu", () => {
        expect(() => limiter.reset("non-existent-key")).not.toThrow();
      });

      it("powinien zresetować tylko wskazany klucz, nie wpływając na inne", () => {
        limiter.check("key1");
        limiter.check("key2");

        vi.advanceTimersByTime(500);

        // Oba powinny być zablokowane
        expect(limiter.check("key1").allowed).toBe(false);
        expect(limiter.check("key2").allowed).toBe(false);

        // Resetuj tylko key1
        limiter.reset("key1");

        // key1 powinien być dozwolony, key2 nadal zablokowany
        expect(limiter.check("key1").allowed).toBe(true);
        expect(limiter.check("key2").allowed).toBe(false);
      });
    });

    describe("cleanup", () => {
      it("powinien usunąć wpisy starsze niż okno czasowe", () => {
        limiter.check("old-key");
        limiter.check("recent-key");

        // Przesuń czas tak, że old-key jest poza oknem, ale recent-key wciąż w oknie
        vi.advanceTimersByTime(windowMs + 1);

        limiter.check("recent-key"); // To zaktualizuje timestamp dla recent-key

        // Cleanup powinien usunąć old-key
        limiter.cleanup();

        // old-key powinien być dozwolony (nie istnieje w mapie)
        const resultOld = limiter.check("old-key");
        expect(resultOld.allowed).toBe(true);

        // recent-key powinien być zablokowany (wciąż w oknie)
        const resultRecent = limiter.check("recent-key");
        expect(resultRecent.allowed).toBe(false);
      });

      it("powinien zachować wpisy w oknie czasowym", () => {
        limiter.check("key1");
        vi.advanceTimersByTime(500); // Wciąż w oknie

        limiter.cleanup();

        // key1 powinien nadal być zablokowany
        const result = limiter.check("key1");
        expect(result.allowed).toBe(false);
      });

      it("powinien obsłużyć cleanup pustej mapy bez błędu", () => {
        expect(() => limiter.cleanup()).not.toThrow();
      });

      it("powinien usunąć wszystkie stare wpisy podczas cleanup", () => {
        limiter.check("key1");
        limiter.check("key2");
        limiter.check("key3");

        // Przesuń czas poza okno
        vi.advanceTimersByTime(windowMs + 1);

        // Dodaj nowy wpis
        limiter.check("key4");

        limiter.cleanup();

        // Wszystkie stare klucze powinny być dozwolone
        expect(limiter.check("key1").allowed).toBe(true);
        expect(limiter.check("key2").allowed).toBe(true);
        expect(limiter.check("key3").allowed).toBe(true);

        // Nowy klucz powinien być zablokowany
        expect(limiter.check("key4").allowed).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("powinien obsłużyć bardzo krótkie okno czasowe (1ms)", () => {
        const shortLimiter = new InMemoryRateLimiter(1);
        vi.useFakeTimers();

        shortLimiter.check("test-key");
        const result1 = shortLimiter.check("test-key");
        expect(result1.allowed).toBe(false);

        vi.advanceTimersByTime(1);
        const result2 = shortLimiter.check("test-key");
        expect(result2.allowed).toBe(true);

        vi.useRealTimers();
      });

      it("powinien obsłużyć bardzo długie okno czasowe", () => {
        const longLimiter = new InMemoryRateLimiter(24 * 60 * 60 * 1000); // 24 godziny
        vi.useFakeTimers();

        longLimiter.check("test-key");
        vi.advanceTimersByTime(1000);
        const result = longLimiter.check("test-key");

        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeGreaterThan(0);

        vi.useRealTimers();
      });

      it("powinien poprawnie zaokrąglać retryAfter w górę", () => {
        limiter.check("test-key");

        // 501ms - powinno zaokrąglić do 1 sekundy
        vi.advanceTimersByTime(501);
        const result = limiter.check("test-key");

        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBe(1); // Math.ceil((1000 - 501) / 1000) = 1
      });

      it("powinien obsłużyć wiele kolejnych żądań dla tego samego klucza", () => {
        const results: RateLimitResult[] = [];

        for (let i = 0; i < 10; i++) {
          results.push(limiter.check("test-key"));
          vi.advanceTimersByTime(100);
        }

        // Tylko pierwsze powinno być dozwolone
        expect(results[0].allowed).toBe(true);
        expect(results.slice(1).every((r) => r.allowed === false)).toBe(true);
      });
    });
  });

  describe("weatherRefreshLimiter singleton", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      weatherRefreshLimiter.reset("test-plan-id");
    });

    afterEach(() => {
      vi.useRealTimers();
      weatherRefreshLimiter.reset("test-plan-id");
    });

    it("powinien mieć okno czasowe 2 minuty (120000ms)", () => {
      weatherRefreshLimiter.check("test-plan-id");

      // Przesuń czas o 1 minutę (wciąż w oknie)
      vi.advanceTimersByTime(60 * 1000);
      const result1 = weatherRefreshLimiter.check("test-plan-id");
      expect(result1.allowed).toBe(false);

      // Przesuń czas o kolejną minutę (poza oknem)
      vi.advanceTimersByTime(60 * 1000);
      const result2 = weatherRefreshLimiter.check("test-plan-id");
      expect(result2.allowed).toBe(true);
    });

    it("powinien zwrócić poprawne retryAfter w sekundach", () => {
      weatherRefreshLimiter.check("test-plan-id");

      // Przesuń czas o 30 sekund
      vi.advanceTimersByTime(30 * 1000);
      const result = weatherRefreshLimiter.check("test-plan-id");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThanOrEqual(90); // Pozostało ~90 sekund
      expect(result.retryAfter).toBeLessThanOrEqual(91);
    });
  });

  describe("aiEndpointsLimiter singleton", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      aiEndpointsLimiter.reset("test-user-id");
    });

    afterEach(() => {
      vi.useRealTimers();
      aiEndpointsLimiter.reset("test-user-id");
    });

    it("powinien mieć okno czasowe 1 minuta (60000ms)", () => {
      aiEndpointsLimiter.check("test-user-id");

      // Przesuń czas o 30 sekund (wciąż w oknie)
      vi.advanceTimersByTime(30 * 1000);
      const result1 = aiEndpointsLimiter.check("test-user-id");
      expect(result1.allowed).toBe(false);

      // Przesuń czas o kolejne 30 sekund (poza oknem)
      vi.advanceTimersByTime(30 * 1000);
      const result2 = aiEndpointsLimiter.check("test-user-id");
      expect(result2.allowed).toBe(true);
    });

    it("powinien zwrócić poprawne retryAfter w sekundach", () => {
      aiEndpointsLimiter.check("test-user-id");

      // Przesuń czas o 15 sekund
      vi.advanceTimersByTime(15 * 1000);
      const result = aiEndpointsLimiter.check("test-user-id");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThanOrEqual(45); // Pozostało ~45 sekund
      expect(result.retryAfter).toBeLessThanOrEqual(46);
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      weatherRefreshLimiter.reset("plan-1");
      weatherRefreshLimiter.reset("plan-2");
      aiEndpointsLimiter.reset("user-1");
      aiEndpointsLimiter.reset("user-2");
    });

    it("powinien obsłużyć równoczesne użycie różnych limiterów dla różnych zasobów", () => {
      // Weather limiter dla planów
      const weatherResult1 = weatherRefreshLimiter.check("plan-1");
      const weatherResult2 = weatherRefreshLimiter.check("plan-2");

      // AI limiter dla użytkowników
      const aiResult1 = aiEndpointsLimiter.check("user-1");
      const aiResult2 = aiEndpointsLimiter.check("user-2");

      expect(weatherResult1.allowed).toBe(true);
      expect(weatherResult2.allowed).toBe(true);
      expect(aiResult1.allowed).toBe(true);
      expect(aiResult2.allowed).toBe(true);

      // Przesuń czas o 30 sekund
      vi.advanceTimersByTime(30 * 1000);

      // Weather limiter powinien nadal blokować (okno 2 minuty)
      expect(weatherRefreshLimiter.check("plan-1").allowed).toBe(false);

      // AI limiter powinien nadal blokować (okno 1 minuta)
      expect(aiEndpointsLimiter.check("user-1").allowed).toBe(false);
    });

    it("powinien obsłużyć sekwencję żądań z różnymi interwałami", () => {
      const results: { time: number; allowed: boolean }[] = [];

      // Pierwsze żądanie
      results.push({ time: 0, allowed: weatherRefreshLimiter.check("plan-1").allowed });

      // Kolejne żądania co 30 sekund
      for (let i = 1; i <= 6; i++) {
        vi.advanceTimersByTime(30 * 1000);
        results.push({
          time: i * 30,
          allowed: weatherRefreshLimiter.check("plan-1").allowed,
        });
      }

      // Tylko pierwsze i piąte (po 2 minutach) powinny być dozwolone
      expect(results[0].allowed).toBe(true); // 0s
      expect(results[1].allowed).toBe(false); // 30s
      expect(results[2].allowed).toBe(false); // 60s
      expect(results[3].allowed).toBe(false); // 90s
      expect(results[4].allowed).toBe(true); // 120s (2 minuty - nowe okno)
      expect(results[5].allowed).toBe(false); // 150s
      expect(results[6].allowed).toBe(false); // 180s
    });
  });
});
