# API Endpoint Implementation Plan: POST /api/analytics/events

## 1. Przegląd punktu końcowego

Punkt końcowy rejestruje zdarzenia analityczne MVP (`plan_created`, `grid_saved`, `area_typed`, `plant_confirmed`) przypisane do aktualnie zalogowanego użytkownika. Po pomyślnym zapisaniu zwraca pełny rekord zdarzenia z metadanymi (id, czasy, atrybuty).

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/analytics/events`
- **Nagłówki:** `Authorization: Bearer <token>` lub cookie Supabase; `Content-Type: application/json`
- **Parametry zapytania:** brak
- **Request Body (JSON):**
  - **Wymagane:**
    - `event_type`: string ∈ {`plan_created`, `grid_saved`, `area_typed`, `plant_confirmed`}
  - **Opcjonalne:**
    - `plan_id`: UUID lub `null`; wymagane, gdy zdarzenie dotyczy konkretnego planu
    - `attributes`: obiekt JSON (dowolna zagnieżdżona struktura; domyślnie `{}`); zakaz wartości nie-JSON

## 3. Wykorzystywane typy

- `AnalyticsEventCreateCommand` – dane wejściowe po walidacji (typ już istnieje w `src/types.ts`)
- `AnalyticsEventDto` – obiekt zwracany klientowi
- `ApiItemResponse<AnalyticsEventDto>` – standardowa obwiednia odpowiedzi
- Nowy schemat walidacyjny Zod: `AnalyticsEventCreateSchema` w `src/lib/validation/analytics.ts`
- Nowy serwis domenowy: `createAnalyticsEvent` w `src/lib/services/analytics-events.service.ts`

## 4. Szczegóły odpowiedzi

- **201 Created (sukces):**
  ```json
  {
    "data": {
      "id": "uuid",
      "user_id": "uuid",
      "plan_id": "uuid|null",
      "event_type": "plan_created",
      "attributes": {
        /* oryginalny JSON */
      },
      "created_at": "iso-datetime"
    }
  }
  ```
- **Format błędów:** zgodny z `errorResponse(...)` (kod, message, opcjonalne `details.field_errors`)
- **Pozostałe kody:** 400, 401, 403, 404, 422, 500

## 5. Przepływ danych

1. `POST` trafia do `src/pages/api/analytics/events.ts` (nowy plik).
2. Z `ctx.locals.supabase` pobieramy instancję Supabase; brak → 401.
3. `supabase.auth.getUser()` weryfikuje sesję; brak użytkownika → 401.
4. Walidacja `user.id` (UUID) przy pomocy `z.string().uuid()`.
5. Próba `request.json()`; błąd parsowania → 400 (ValidationError, „Invalid JSON body.”).
6. Walidacja body przy użyciu `AnalyticsEventCreateSchema.safeParse()`. Błędy mapowane na `ValidationError` (kod 400 z `field_errors`).
7. Dodatkowa kontrola biznesowa:
   - Jeśli `plan_id` != null → odpytać `plans` z Supabase (`select("id").eq("id", plan_id).maybeSingle()`).
     - Brak rekordu → 404 (NotFound, „Plan not found.”).
     - Błąd uprawnień (RLS) → 403 (Forbidden, „Access denied.”).
   - Walidacja logiczna atrybutów (opcjonalna sanity-check: np. limit rozmiaru w bajtach, jeżeli implementacja będzie potrzebna w przyszłości).
8. Zmontowany `AnalyticsEventCreateCommand` przekazywany do `createAnalyticsEvent(supabase, user.id, command)`.
9. Serwis wykonuje `insert` do `analytics_events` i zwraca `AnalyticsEventDto`.
10. API otacza wynik w `ApiItemResponse` i zwraca 201.
11. Błędy Supabase mapowane na odpowiednie kody (23503 → 422, RLS → 403, inne → 500).

## 6. Względy bezpieczeństwa

- Uwierzytelnianie oparte o JWT Supabase; brak tokenu → 401.
- RLS w `analytics_events` i `plans` gwarantuje dostęp tylko do zasobów użytkownika.
- Walidacja `event_type` whitelistuje do czterech dozwolonych wartości, zapobiegając nadużyciom telemetrii.
- Ograniczenie `attributes` do poprawnego JSON i (opcjonalnie) limit rozmiaru chroni przed nadużyciami pamięci / log injection.
- Kontrola `plan_id` avant insert zapobiega próbą użycia `plan_id` należącego do innego użytkownika (403).
- Zachować ostrożność przy logowaniu – nie logować surowych `attributes`, bo mogą zawierać dane wrażliwe.

## 7. Obsługa błędów

- **401 Unauthorized:** brak klienta Supabase lub brak sesji użytkownika.
- **400 ValidationError:** niepoprawny JSON, brak `event_type`, nieprawidłowa wartość `event_type`, błędna struktura `attributes`.
- **404 NotFound:** `plan_id` wskazuje plan, którego użytkownik nie posiada / nie istnieje (po walidacji).
- **403 Forbidden:** RLS odrzucił dostęp do planu lub tabeli zdarzeń.
- **422 Unprocessable:** naruszenie ograniczeń bazy (np. `plan_id` usunięty w międzyczasie → FK 23503).
- **500 InternalError:** pozostałe nieprzewidziane błędy Supabase, bądź błędy serwera.
- Wszystkie błędy zwracają `errorResponse` z kodem logicznym i komunikatem; logowanie serwerowe ograniczyć do minimalnego stack trace (bez danych wrażliwych).

## 8. Rozważania dotyczące wydajności

- Operacja `insert` jest lekka; jedyne potencjalne obciążenie to walidacyjny `select` planu. Użyć `maybeSingle()` z ograniczeniem kolumn do `id`.
- Zapewnienie indeksów: `analytics_events(user_id, created_at desc)` już istnieje; zapytania użyją klucza głównego, więc brak dodatkowych indeksów.
- W przyszłości warto rozważyć batchowanie zdarzeń lub kolejkę, lecz na MVP pojedyncze wpisy są wystarczające.

## 9. Etapy wdrożenia

1. Utworzyć `AnalyticsEventCreateSchema` w `src/lib/validation/analytics.ts` wraz z testami jednostkowymi schematu (jeśli framework testowy dostępny).
2. Stworzyć `src/lib/services/analytics-events.service.ts` z funkcją `createAnalyticsEvent(supabase, userId, command)`:
   - Trim / normalizacja danych (np. fallback `attributes` na `{}`).
   - Insert z `select()` zwracający komplet pól DTO.
   - Rzucanie błędów Supabase bez maskowania.
3. Dodać nowy route `src/pages/api/analytics/events.ts`:
   - Wzorcować strukturę na `plans/index.ts` (guardy, walidacja, mapowanie błędów).
   - Obsłużyć mapowanie błędów Supabase na 403, 404, 422, 500.
4. Zarejestrować schemat i serwis w eksportach/indeksach (jeśli istnieją).
5. Dodać testy integracyjne lub kontraktowe (np. z wykorzystaniem `supabase` mock) obejmujące sukces, brak autoryzacji, błędny JSON, `event_type`, plan nieistniejący.
6. Zweryfikować linter (pnpm lint) oraz formatowanie.
7. Uzupełnić dokumentację API / changelog, jeśli wymagane.
