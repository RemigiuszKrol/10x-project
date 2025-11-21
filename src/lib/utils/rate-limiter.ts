/**
 * In-Memory Rate Limiter
 *
 * Prosta implementacja rate limitera z użyciem Map dla MVP.
 * W produkcji należy rozważyć Redis lub podobne rozwiązanie dla shared state.
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // sekundy do następnej próby
}

export class InMemoryRateLimiter {
  private attempts = new Map<string, number>();

  constructor(private windowMs: number) {}

  /**
   * Sprawdza czy request dla danego klucza jest dozwolony
   * @param key - unikalny identyfikator (np. plan_id)
   * @returns obiekt z informacją czy request jest dozwolony i czas do następnej próby
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const lastAttempt = this.attempts.get(key) || 0;
    const timeSinceLastAttempt = now - lastAttempt;

    if (timeSinceLastAttempt < this.windowMs) {
      return {
        allowed: false,
        retryAfter: Math.ceil((this.windowMs - timeSinceLastAttempt) / 1000),
      };
    }

    this.attempts.set(key, now);
    return { allowed: true };
  }

  /**
   * Resetuje rate limit dla danego klucza (dla testów)
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Czyści wszystkie wpisy starsze niż windowMs (periodic cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.attempts.entries()) {
      if (now - timestamp > this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }
}

/**
 * Singleton instance dla weather refresh rate limiting
 * Limit: 1 request na 15 minut per plan
 */
export const weatherRefreshLimiter = new InMemoryRateLimiter(15 * 60 * 1000);

// Periodic cleanup co godzinę
if (typeof setInterval !== "undefined") {
  setInterval(() => weatherRefreshLimiter.cleanup(), 60 * 60 * 1000);
}
