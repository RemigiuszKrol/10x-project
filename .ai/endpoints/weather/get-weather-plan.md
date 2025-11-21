# Plan wdrożenia endpointu API: GET /api/plans/:plan_id/weather

## 1. Przegląd punktu końcowego

- Cel: udostępnienie zcache’owanych, miesięcznych metryk pogodowych (`sunlight`, `humidity`, `precip`, `last_refreshed_at`) dla planu działki należącego do obecnie uwierzytelnionego użytkownika.
- Zakres: odczyt danych z tabeli `weather_monthly` z kontrolą własności planu (`plans.user_id`) oraz spójności danych (12 ostatnich miesięcy, skala 0–100).
- Kontekst: handler Astro 5 (`src/pages/api/plans/[planId]/weather.ts`) korzystający z klienta Supabase, schematów Zod, wspólnych helperów odpowiedzi HTTP oraz centralnego loggera.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`.
- Struktura URL: `/api/plans/:plan_id/weather`.
- Nagłówki: `Authorization: Bearer <token>` lub sesja cookie Supabase; `Content-Type` niewymagany (brak body).
- Parametry:
  - Wymagane (path): `plan_id` – UUID planu; walidacja `z.string().uuid()` (np. `PlanIdParamSchema` lub nowe `PlanWeatherPathSchema`).
  - Opcjonalne: brak query parametrów w MVP; ewentualne nieznane parametry ignorujemy lub walidujemy, aby zwrócić 400.
- Request Body: brak (żądanie bez treści).
- Walidacja wejścia:
  - Upewnij się, że w `locals` dostępny jest klient Supabase i logger; brak → błąd konfiguracyjny (500).
  - Pobierz użytkownika poprzez `supabase.auth.getUser()`; brak sesji → 401.
  - Zweryfikuj `plan_id` za pomocą Zod; błędy mapuj na `ValidationError` (400) z `details.field_errors`.
  - Po walidacji schematycznej odczytaj plan i sprawdź, czy `plan.user_id === user.id`; brak rekordu → 404, inny właściciel → 403.
- Typy DTO / Command modele:
  - `PlanWeatherPathSchema` / `PlanWeatherPathParams` – walidacja parametrów ścieżki.
  - `WeatherMonthlyDto` – DTO z polami `{ year, month, sunlight, humidity, precip, last_refreshed_at }`.
  - `GetPlanWeatherCommand` – kontrakt serwisowy (`planId`, `userId`, `client`).
  - `GetPlanWeatherResult` lub bezpośrednio `WeatherMonthlyDto[]` dla czytelności testów.

## 3. Szczegóły odpowiedzi

- Sukces 200:
  - Struktura `ApiListResponse<WeatherMonthlyDto>`: `{ "data": WeatherMonthlyDto[], "pagination": { "next_cursor": null } }`.
  - Dane posortowane malejąco wg `year`, następnie `month`; ograniczenie do dostępnych rekordów (max 12).
  - `last_refreshed_at` serializowane do ISO 8601.
- Błędy mapowane na korporacyjny format `{ "error": { "code", "message", "details" } }`.

## 4. Przepływ danych

1. Klient frontendu wysyła `GET /api/plans/:plan_id/weather` z ważnym tokenem Supabase.
2. Handler Astro pobiera `supabase` i `logger` z `locals`; brak → log i `errorResponse(InternalError)`.
3. Autoryzacja: `supabase.auth.getUser()`; brak użytkownika → `Unauthorized`.
4. Walidacja `plan_id` przez `PlanWeatherPathSchema`; błędy → `ValidationError`.
5. Serwis planów/ pogody pobiera plan: `plans.select('id, user_id').eq('id', planId).eq('user_id', userId).maybeSingle()`.
6. Jeśli plan istnieje → kontynuuj, w przeciwnym razie:
   - brak rekordu → `NotFound`;
   - rekord innego właściciela (RLS error `42501`) → `Forbidden`.
7. Serwis pobiera dane pogody: `weather_monthly.select('year, month, sunlight, humidity, precip, last_refreshed_at').eq('plan_id', planId).order('year', { ascending: false }).order('month', { ascending: false })`.
8. Serwis mapuje rekordy na `WeatherMonthlyDto` (normalizacja typów) i zwraca tablicę.
9. Handler zamyka dane w `jsonResponse({ data, pagination: { next_cursor: null } }, 200)`; loguje metryki (liczba rekordów, czas wykonania) na poziomie debug/info.

## 5. Względy bezpieczeństwa

- Autentykacja: wymagane Supabase JWT lub sesja cookie; brak → 401.
- Autoryzacja: podwójna kontrola (`.eq('user_id', userId)` + RLS) zapobiega enumeracji planów.
- Walidacja wejścia: `plan_id` musi być UUID; odrzucamy/zwracamy 400 dla niepoprawnych wartości.
- Odpowiedzi nie ujawniają szczegółów błędów bazodanowych; szczegóły logujemy po stronie serwera.
- Możliwość dodania rate-limiting middleware (np. w Astro middleware) dla ochrony przed nadużyciami.
- Dane pogodowe są tylko do odczytu; brak skutków ubocznych minimalizuje ryzyko CSRF.

## 6. Obsługa błędów

- 400 `ValidationError`: niepoprawny `plan_id` lub niedozwolone parametry query.
- 401 `Unauthorized`: brak sesji Supabase lub problem z pobraniem użytkownika.
- 403 `Forbidden`: plan nie należy do użytkownika (RLS, brak uprawnień).
- 404 `NotFound`: plan nie istnieje lub został usunięty (brak rekordu przy `.maybeSingle()`).
- 500 `InternalError`: nieprzewidziane problemy z Supabase/SDK/infrastrukturą; logujemy `logger.error('[GET /plans/:plan_id/weather] failed', { planId, userId, error })`.
- W przypadku błędów sieciowych / limitów Supabase (np. timeout) rozważ mapowanie na 500 lub dedykowany kod `UpstreamTimeout` zgodnie z konwencją.

## 7. Rozważania dotyczące wydajności

- Maksymalnie 12 rekordów na plan → minimalny payload, brak potrzeby paginacji; `next_cursor` zawsze `null`.
- Zapytania korzystają z klucza złożonego `PRIMARY KEY (plan_id, year, month)` oraz indeksów po `plans.id`, co daje O(1) dostęp.
- Można dodać caching na poziomie aplikacji (np. `Cache-Control: private, max-age=300`) jeśli odczyty są częste; do potwierdzenia z zespołem.
- Logowanie czasu zapytania (`performance.now()`) ułatwi monitoring ewentualnych spowolnień Supabase.

## 8. Kroki implementacji

1. Dodaj schemat `PlanWeatherPathSchema` (Zod) i typ `PlanWeatherPathParams` w `src/lib/validation/plans.ts` lub nowym module `weather.ts`; wyeksportuj z indexu walidacji.
2. Zdefiniuj DTO `WeatherMonthlyDto` w `src/types.ts` (sekcja API) oraz ewentualny `ApiListResponse<T>` jeśli nie istnieje.
3. Utwórz serwis `getPlanWeather(command: GetPlanWeatherCommand)` w `src/lib/services/weather.service.ts` (lub rozbuduj istniejący `plans.service.ts`), który:
   - weryfikuje własność planu,
   - pobiera rekordy z `weather_monthly`,
   - mapuje wyniki do `WeatherMonthlyDto[]`,
   - rzuca/zwra ca kontrolowane błędy (`NotFoundError`, `ForbiddenError`).
4. Zarejestruj serwis w `src/lib/services/index.ts` (jeśli stosujemy agregujący eksport) oraz dodaj typy komend do `src/lib/services/types.ts`, jeśli istnieje.
5. Utwórz plik endpointu `src/pages/api/plans/[planId]/weather.ts`; ustaw `export const prerender = false`.
6. W handlerze:
   - pobierz Supabase + logger z `locals`,
   - autoryzuj użytkownika,
   - zwaliduj `plan_id`,
   - wywołaj serwis i zmapuj wynik na strukturę odpowiedzi,
   - obsłuż błędy poprzez wspólne helpery `errorResponse`.
7. Dodaj testy jednostkowe/integracyjne lub scenariusze manualne (np. w `.ai/testing/plans-weather-get.md`): sukces (plan z danymi), plan bez wpisów (pusta tablica), brak autoryzacji, plan innego użytkownika, nieprawidłowy `plan_id`.
8. Uzupełnij dokumentację `.ai/api-plan.md` i changelog, uruchom `pnpm lint` / `pnpm test`, a następnie przygotuj PR.
