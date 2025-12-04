import { createAndActivateTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Global setup dla testów E2E
 * Uruchamia się przed wszystkimi testami
 *
 * Zapewnia, że użytkownik testowy istnieje i jest aktywowany
 */
async function globalSetup() {
  const testEmail = TEST_USERS.valid.email;
  const testPassword = TEST_USERS.valid.password;

  // Sprawdź czy użytkownik już istnieje - jeśli nie, utwórz go
  const result = await createAndActivateTestUser(testEmail, testPassword);

  if (result.success) {
    // Nie rzucamy błędu - testy mogą próbować utworzyć użytkownika samodzielnie
  }
}

export default globalSetup;
