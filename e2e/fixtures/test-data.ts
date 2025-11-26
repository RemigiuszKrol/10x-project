/**
 * Dane testowe używane w testach E2E
 */

export const TEST_USERS = {
  valid: {
    email: "test@example.com",
    password: "TestPassword123!",
    fullName: "Test User",
  },
  invalid: {
    email: "invalid@example.com",
    password: "WrongPassword123!",
  },
};

export const TEST_PLANS = {
  basic: {
    name: "Mój ogród testowy",
    width: 10,
    height: 10,
    cellSize: 50,
    locationName: "Warszawa, Polska",
    latitude: 52.2297,
    longitude: 21.0122,
  },
};

export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
};
