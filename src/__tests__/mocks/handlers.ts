import { http, HttpResponse } from "msw";

/**
 * Mock handlers dla MSW (Mock Service Worker)
 * Dodaj tutaj handlery dla API endpoints, które chcesz mockować w testach
 */

export const handlers = [
  // Przykład: Mock endpoint dla profilu użytkownika
  http.get("/api/profile", () => {
    return HttpResponse.json({
      id: "test-user-id",
      email: "test@example.com",
      full_name: "Test User",
      theme: "light",
      language: "pl",
    });
  }),

  // Przykład: Mock endpoint dla planów
  http.get("/api/plans", () => {
    return HttpResponse.json({
      plans: [
        {
          id: "plan-1",
          name: "Mój ogród",
          location_name: "Warszawa",
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
    });
  }),

  // Możesz dodać więcej handlerów tutaj...
];
