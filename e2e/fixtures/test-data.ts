/**
 * Dane testowe dla testów E2E
 * Zawiera przykładowe dane użytkowników, planów i innych encji używanych w testach
 */

export const TEST_USERS = {
  valid: {
    email: process.env.E2E_USER_EMAIL || "test@example.com",
    password: process.env.E2E_USER_PASSWORD || "Test1234!",
  },
  invalid: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
} as const;

/**
 * Funkcja pomocnicza do generowania unikalnego emaila testowego
 * @param prefix - Prefiks dla emaila (domyślnie "test")
 * @returns Unikalny email z timestamp
 */
export function generateTestEmail(prefix = "test"): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@example.com`;
}

/**
 * Funkcja pomocnicza do generowania unikalnego hasła testowego
 * @returns Hasło spełniające wymagania walidacji
 */
export function generateTestPassword(): string {
  return "Test1234!";
}
