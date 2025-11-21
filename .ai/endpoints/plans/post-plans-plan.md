# API Endpoint Implementation Plan: POST /api/plans

## 1. Przegląd punktu końcowego

- Tworzy nowy plan działki powiązany z aktualnie zalogowanym użytkownikiem.
- Wykorzystuje zasób `public.plans` z włączonym RLS (owner-only przez `auth.uid()`).
- Zwraca pełny `PlanDto` z wyliczonymi wymiarami siatki (`grid_width`, `grid_height`).
- Wspiera opcjonalne informacje geograficzne (lat/long, hemisfera) dla dalszych integracji pogodowych.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/api/plans`
- Nagłówki: `Authorization: Bearer <JWT>` lub sesyjny cookie Supabase; `Content-Type: application/json`.
- Parametry:
  - Wymagane (body): `name`, `width_cm`, `height_cm`, `cell_size_cm`, `orientation`.
  - Opcjonalne (body): `latitude`, `longitude`, `hemisphere`.
- Treść żądania (JSON):
  ```json
  {
    "name": "string",
    "latitude": 52.1,
    "longitude": 21.0,
    "width_cm": 500,
    "height_cm": 400,
    "cell_size_cm": 25,
    "orientation": 0,
    "hemisphere": "northern"
  }
  ```
- Walidacja wejścia:
  - `PlanCreateSchema` (`src/lib/validation/plans.ts`) zapewnia trim nazwy, dodatnie wymiary, dozwolone wartości `cell_size_cm`, zakres orientacji, poprawność geograficzną i wynikowe siatki 1..200.
  - Po walidacji pola opcjonalne mapujemy na `null` (dla Supabase) lub usuwamy, aby zachować spójność typów.
  - Wymuszenie autoryzacji: obecność `locals.session?.user.id` (lub równoważnego pola) – brak → 401.

## 3. Szczegóły odpowiedzi

- Sukces (`201 Created`):
  ```json
  {
    "data": {
      "id": "uuid",
      "user_id": "uuid",
      "name": "string",
      "latitude": 52.1,
      "longitude": 21.0,
      "width_cm": 500,
      "height_cm": 400,
      "cell_size_cm": 25,
      "grid_width": 20,
      "grid_height": 16,
      "orientation": 0,
      "hemisphere": "northern",
      "created_at": "2025-01-01T12:00:00.000Z",
      "updated_at": "2025-01-01T12:00:00.000Z"
    }
  }
  ```
- Typy w użyciu: `PlanDto` (odpowiedź), `ApiItemResponse<PlanDto>`.
- Kody statusu alternatywne: `400`, `401`, `403`, `409`, `500` (szczegóły w sekcji Obsługa błędów).

## 4. Przepływ danych

1. Klient uwierzytelnia się (JWT/cookie) i wysyła JSON.
2. Handler Astro (`src/pages/api/plans/index.ts`) odpiera żądanie `POST`; inne metody → `405`.
3. Wyciągamy `supabase` z `locals` oraz identyfikator użytkownika (`locals.session?.user.id`).
4. Parsujemy body JSON; walidujemy `PlanCreateSchema`. W błędach zwracamy `400` z mapą `field_errors`.
5. Budujemy `PlanCreateCommand`, zapewniając `null` dla brakujących optionali.
6. Wywołujemy `createPlan(supabase, userId, command)` ze `src/lib/services/plans.service.ts`.
7. Serwis oblicza siatkę, wykonuje `INSERT` i zwraca `PlanDto`.
8. Handler opakowuje wynik w `ApiItemResponse` i zwraca `201`.
9. Błędy Supabase mapujemy na kod statusu oraz logujemy.

## 5. Względy bezpieczeństwa

- Wymagane uwierzytelnienie poprzez Supabase JWT (lub cookie); brak → `401 Unauthorized`.
- Użycie `locals.supabase` zapewnia egzekwowanie RLS (owner-only).
- Minimalizacja danych: zwracamy tylko pola `PlanDto`.
- Walidacja danych wejściowych (Zod) zapobiega niepoprawnym wartościom i ewentualnym injection.
- Upewnić się, że nagłówki CORS/domyslne polityki są zgodne z resztą projektu (Astro konfiguracja).
- Logowanie błędów wyłącznie po stronie serwera (bez wrażliwych danych w odpowiedzi).

## 6. Obsługa błędów

- Format błędu: `ApiErrorResponse` (`error.code`, `message`, opcjonalne `details.field_errors`).
- Scenariusze:
  - Brak sesji / tokenu → `401 Unauthorized`.
  - Brak identyfikatora użytkownika mimo sesji → `403 Forbidden` z komunikatem o niedozwolonym dostępie.
  - Walidacja Zod → `400 ValidationError`, `details.field_errors` z kluczami pól.
  - Konflikt nazwy (`error.code === "23505"`) → `409 Conflict`, komunikat o istnieniu planu o tej nazwie.
  - Inne `PostgrestError` (np. naruszenia CHECK) → `400 ValidationError` z komunikatem z bazy lub zmapowanym komunikatem przyjaznym użytkownikowi.
  - Błędy sieci/serwera Supabase lub nieprzewidziane wyjątki → `500 InternalError`.
- Logowanie: użyć `locals.logger?.error` (jeśli dostępny) lub `console.error`, zapisując `error.code`/`message` bez danych wejściowych użytkownika.

## 7. Wydajność

- Operacja pojedynczego INSERT – korzysta z indeksu `(user_id, updated_at desc)`; brak dodatkowych optymalizacji.
- Walidacja oblicza siatkę w pamięci (proste dzielenie) – znikomy koszt.
- Upewnić się, że handler szybko odrzuca inne metody (`405`), aby uniknąć zbędnego parsowania.
- Można dodać prostą ochronę przed nadmiernym limitowaniem (np. korzystać z istniejącej middlewary rate-limit, jeśli dostępna).

## 8. Kroki implementacji

1. Utwórz/uzupełnij plik `src/pages/api/plans/index.ts`; ustaw `export const prerender = false` oraz `export const POST`.
2. Pobierz `supabase` i sesję z `locals`; weryfikuj identyfikator użytkownika, brak → zwróć `401`.
3. Odczytaj body (`await request.json()`), zastosuj `PlanCreateSchema.safeParseAsync`; błędy → 400 z `field_errors`.
4. Zmapuj wynik na `PlanCreateCommand`, konwertując `undefined` na `null` tam gdzie potrzebne.
5. Wywołaj `createPlan`; obsłuż wyjątki:
   - `PostgrestError` z kodem `23505` → 409.
   - Inne błędy walidacyjne bazy → 400.
   - Pozostałe wyjątki → 500 (zaloguj).
6. Zwróć `Response.json({ data: plan }, { status: 201 })`.
