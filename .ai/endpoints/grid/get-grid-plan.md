# Plan wdrożenia endpointu API: GET /api/plans/:plan_id/grid

## 1. Przegląd punktu końcowego

- Cel: udostępnienie metadanych siatki (`grid_width`, `grid_height`, `cell_size_cm`, `orientation`) dla wybranego planu działki.
- Użytkownicy: panel webowy (widok planu, edytor siatki) oraz ewentualne automaty wydobywające konfigurację siatki.
- Kluczowe założenia: dostęp tylko dla właściciela planu; dane odczytywane bez modyfikacji; brak dodatkowych wywołań usług zewnętrznych.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/plans/:plan_id/grid` (dynamiczna ścieżka w Astro: `src/pages/api/plans/[planId]/grid.ts`)
- Nagłówki: `Authorization: Bearer <jwt>` (lub sesja cookie Supabase), `Content-Type` nie wymagany (brak body).
- Parametry:
  - Wymagane (path): `plan_id` – identyfikator planu; walidacja `z.string().uuid()` (np. `PlanIdParamSchema`).
  - Opcjonalne: brak.
- Request Body: brak (odrzucamy wszelkie próby przesłania treści; w razie potrzeby ignorujemy lub zwracamy 400).
- Walidacja w warstwie wejściowej:
  - Sprawdzenie obecności klienta Supabase (`ctx.locals.supabase`).
  - `supabase.auth.getUser()` i weryfikacja, że `user.id` jest poprawnym UUID.
  - Walidacja `plan_id` z mapowaniem błędu na `ValidationError`.

## 3. Szczegóły odpowiedzi

- Sukces 200:
  - Typ: `ApiItemResponse<GridMetadataDto>` (z `src/types.ts`).
  - Struktura JSON:
    ```json
    {
      "data": {
        "grid_width": 0,
        "grid_height": 0,
        "cell_size_cm": 0,
        "orientation": 0
      }
    }
    ```
  - Wartości `grid_width` i `grid_height` pobrane z bazy, `cell_size_cm` i `orientation` zgodne z planem.
- Brak dodatkowych pól meta; `pagination` nie dotyczy pojedynczego zasobu.

## 4. Przepływ danych

- Klient → żądanie HTTP do `/api/plans/:plan_id/grid`.
- Warstwa Astro API:
  - Walidacja autentykacji (Supabase JWT) i parametru ścieżki.
  - Wywołanie serwisu `getPlanGridMetadata(supabase, userId, planId)` w `src/lib/services/plans.service.ts` (lub nowym module `grid.service.ts`, jeśli wydzielimy logikę specyficzną dla siatki).
- Serwis:
  - SELECT z tabeli `plans` ograniczone do kolumn: `grid_width`, `grid_height`, `cell_size_cm`, `orientation`, z filtrem `id = planId` i `user_id = auth.uid()` (drugi warunek zapewnia RLS; dodatkowo można użyć `.eq("user_id", userId)`).
  - `.single()` zapewnia, że brak rekordu skutkuje błędem.
- Baza danych:
  - RLS weryfikuje własność rekordu.
  - Indeksy na `(user_id, updated_at)` wspierają zapytanie przez `user_id`.
- Serwis → API route: mapowanie wyniku na `GridMetadataDto`.
- API → Klient: `jsonResponse`.

## 5. Względy bezpieczeństwa

- Autoryzacja: wymagana aktywna sesja Supabase; bez niej zwrot 401.
- Autentykacja użytkownika walidowana każdorazowo (`supabase.auth.getUser()`).
- Autoryzacja zasobu: rely on RLS + jawny filtr `.eq("user_id", userId)` jako podwójne zabezpieczenie przed przypadkowym ujawnieniem danych.
- Wejście `plan_id` walidowane jako UUID, co ogranicza możliwość SQL injection w parametrach dynamicznych.
- Brak logiki modyfikującej dane → minimalizacja ryzyka CSRF; mimo to endpoint korzysta z autoryzacji bearer/cookie.
- Dzienniki błędów: aktualnie brak dedykowanej tabeli; zachowujemy spójne logowanie po stronie infrastruktury (Astro/Supabase). W razie potrzeby integracji w przyszłości można dodać rejestrowanie krytycznych błędów do `analytics_events`.

## 6. Obsługa błędów

- 400 `ValidationError`: niepoprawny `plan_id` (brak, pusty string, nie-UUID), nieparsowalna wartosc.
- 401 `Unauthorized`: brak klienta Supabase w `ctx.locals` lub brak zalogowanego użytkownika.
- 403 `Forbidden`: błąd uprawnień zwrócony przez Supabase (np. brak dostępu z powodu RLS).
- 404 `NotFound`: rekord planu nie istnieje lub został usunięty; mapowane z `.single()` bez danych.
- 500 `InternalError`: nieprzewidziane błędy (sieć, Supabase SDK). Powinniśmy logować w konsoli serwera (np. `console.error`) z bezpiecznym komunikatem.

## 7. Wydajność

- Pojedyncze zapytanie `SELECT` po kluczu głównym + `user_id`; korzysta z indeksu głównego i indeksów po `user_id`.
- Minimalny payload (4 pola), brak dodatkowych joinów → bardzo niskie opóźnienie.
- Brak konieczności cache; ewentualne future enhancement: cache'owanie w kliencie (HTTP cache-control) jeśli dane rzadko się zmieniają.
- Zwracamy uwagę na limit RPS: w razie konieczności można zastosować rate limiting po stronie edge (np. middleware).

## 8. Kroki implementacji

1. Dodać do `src/lib/validation/plans.ts` schemat `PlanGridParamsSchema = z.object({ planId: z.string().uuid() })` (lub osobny plik w `validation/grid.ts`), wraz z typem `PlanGridParams`.
2. W `src/lib/services/plans.service.ts` dopisać funkcję asynchroniczną `getPlanGridMetadata(supabase, userId, planId)` zwracającą `GridMetadataDto`; użyć `.eq("user_id", userId).eq("id", planId).select("grid_width, grid_height, cell_size_cm, orientation").single()`.
3. Obsłużyć błędy w serwisie: gdy `error.code === "PGRST116"` (no rows) → zwrócić niestandardowy błąd (np. `NotFoundError`) lub `null`, aby endpoint mógł zwrócić 404.
4. Utworzyć plik endpointu `src/pages/api/plans/[planId]/grid.ts` z eksportami `prerender = false` oraz funkcją `GET`.
5. W handlerze: przeprowadzić kroki autoryzacji (Supabase + UUID usera), walidację parametru (parsowanie `ctx.params.planId`), wywołanie serwisu oraz mapowanie błędów na spójne `errorResponse`.
6. Ujednolicić obsługę błędów: mapować `ValidationError` (400), brak danych (404), `Forbidden` (403), nieoczekiwane (500) – wykorzystać istniejące helpery `jsonResponse` i `errorResponse` z `src/lib/http/errors`.
7. Dopisać testy jednostkowe / integracyjne (jeśli harness istnieje) lub przygotować scenariusze manualne: (a) sukces, (b) plan nie istnieje, (c) brak autoryzacji, (d) plan innego użytkownika.
8. Zaktualizować dokumentację wewnętrzną / listę endpointów (np. `.ai/endpoints/README.md`, jeśli istnieje) oraz poinformować zespół QA o nowych statusach błędów.
