# API Endpoint Implementation Plan: GET /api/plans

## 1. Przegląd punktu końcowego
- Cel: Udostępnić paginowaną listę planów działki należących do aktualnie uwierzytelnionego użytkownika.
- Zakres: Odczyt danych tylko właściciela (RLS owner-only), bez możliwości listowania cudzych planów ani zaawansowanych filtrów.
- Zależności: Supabase (PostgREST) z RLS, `jsonResponse`/`errorResponse` helpery HTTP, istniejący typ `PlanDto`.

## 2. Szczegóły żądania
- Metoda: GET
- URL: `/api/plans`
- Parametry zapytania:
  - `limit` (opcjonalny): liczba całkowita 1–100, domyślnie 20. Wartości spoza zakresu → 400.
  - `cursor` (opcjonalny): ciąg Base64 z zakodowaną parą `{ updated_at: string, id: string }`. Gdy obecny, wczytaj następne strony po rekordzie.
  - `sort` (opcjonalny): akceptujemy wyłącznie `updated_at`; inne wartości → 400. Brak parametru → użyj `updated_at`.
  - `order` (opcjonalny): `desc` lub `asc`. Domyślnie `desc`; `asc` wspieramy tylko w kodzie (walidacja), ale MVP może ustawiać `desc` niezależnie od wejścia, dopóki spec nie wymaga innych kierunków.
- Treść żądania: brak (endpoint bazuje na query string).
- Walidacja wejścia:
  - Zod schemat `PlanListQuerySchema` w `src/lib/validation/plans.ts` z transformacjami string → number oraz dekodowaniem `cursor`.
  - Przygotuj wynikowy typ `PlanListQueryInput` (np. `z.infer`), który mapuje się na nowy typ usługowy `PlanListQuery`.

## 3. Szczegóły odpowiedzi
- Sukces 200: struktura `ApiListResponse<PlanDto>` (`{ data: PlanDto[], pagination: { next_cursor: string|null } }`), `Content-Type: application/json`.
- `pagination.next_cursor`: jeśli pobrano `limit`+1 rekordów, zwróć Base64 z ostatniego elementu (po odcięciu nadmiarowego). W przeciwnym razie `null`.
- Typy/DTO wykorzystywane w implementacji:
  - `PlanDto` (`src/types.ts`) dla elementów listy.
  - `ApiListResponse` i `ApiErrorResponse` dla spójnego kontraktu HTTP.
  - Nowy typ `PlanListQuery` w warstwie serwisu, mapujący z walidacji.
- Kody statusu: `200` sukces, `400` walidacja query/cursor, `401` brak sesji, `403` naruszenie RLS, `500` błąd wewnętrzny.

## 4. Przepływ danych
- Pobierz `supabase` z `ctx.locals`. Brak klienta → 401.
- Wywołaj `supabase.auth.getUser()` i zweryfikuj `user.id` (Zod `uuid`). Brak użytkownika → 401.
- Odczytaj `ctx.url.searchParams`, przekaż do `PlanListQuerySchema.safeParse`, obsłuż błędy walidacji (mapowanie na `field_errors`).
- Utwórz obiekt `query` z normalizowanymi wartościami (`limit`, opcjonalny `cursorKey`, `isAscending`).
- Wywołaj nową funkcję `listPlans(supabase, user.id, query)` w `plans.service.ts`.
  - Serwis konstruuje zapytanie `.from("plans")`, `.select(...)` z polami `PlanDto`.
  - Ustaw `.eq("user_id", userId)`.
  - Ustaw `.order("updated_at", { ascending })` oraz `.order("id", { ascending })` dla stabilnego sortowania.
  - Jeśli `cursor` obecny, zdekoduj go do `{ updatedAt, id }` i zastosuj keyset pagination: `supabase.or(\`updated_at.${op}.${updatedAt},and(updated_at.eq.${updatedAt},id.${opId}.${id})\`)` (używając `.or` z parametrami) przy czym `op` zależy od kierunku (`lt` dla `desc`, `gt` dla `asc`).
  - Ogranicz wynik do `limit + 1` dla detekcji `hasMore`.
  - Serwis zwraca `{ items: PlanDto[], nextCursor: string | null }`; `nextCursor` powstaje przez `Base64(JSON.stringify({ updated_at, id }))` ostatniego elementu po odcięciu nadmiarowego rekordu.
- Handler API transformuje wynik serwisu na `ApiListResponse` i zwraca przez `jsonResponse`.
- Niepowodzenia Supabase są przechwytywane i odwzorowane na odpowiednie statusy.

## 5. Względy bezpieczeństwa
- Uwierzytelnianie obowiązkowe: brak sesji JWT → 401; brak ręcznego przekazywania `user_id` z klienta.
- Autoryzacja: opieramy się na RLS w `plans`; dodatkowo wymuszamy `eq("user_id", user.id)` w zapytaniu serwisu.
- Walidacja danych wejściowych usuwa możliwość SQL injection (whitelist wartości `sort`, `order`, limit).
- Cursor jest podpisany implicitnie (Base64 z pary), dekodujemy i weryfikujemy schemat, aby uniknąć manipulacji.
- Odpowiedzi błędów nie ujawniają szczegółów wewnętrznych; generujemy komunikaty przyjazne użytkownikowi.

## 6. Obsługa błędów
- `400 ValidationError`: błędny JSON query (np. `limit` poza zakresem, cursor niepoprawny Base64 lub schema) → `errorResponse("ValidationError", ...)` z `field_errors`.
- `401 Unauthorized`: brak klienta Supabase, brak użytkownika lub `user.id` nie przechodzi walidacji.
- `403 Forbidden`: supabase zwróci błąd RLS/permission → mapuj na `errorResponse("Forbidden", "Access denied.")`.
- `500 InternalError`: inne błędy Supabase/nieoczekiwane wyjątki → `errorResponse("InternalError", "Unexpected server error.")` + log `console.error`.
- Rejestrowanie błędów: brak dedykowanej tabeli błędów; krótkoterminowo logujemy w Astro/server logach (do rotacji), pozostawiając TODO na integrację z observability, jeśli będzie wymagane.

## 7. Wydajność
- Keyset pagination (`limit + 1`) eliminuje `offset`, korzysta z indeksu `(user_id, updated_at desc)`.
- Limit 100 chroni przed nadużyciami; domyślnie 20 zmniejsza obciążenie.
- Zapytanie wybiera tylko kolumny `PlanDto`, unika zbędnych pól i konwersji.
- Obliczenia siatki są już przechowywane (`grid_width`, `grid_height`), brak dodatkowych kalkulacji po stronie aplikacji.

## 8. Kroki implementacji
1. Dodaj do `src/lib/validation/plans.ts` schemat `PlanListQuerySchema` (z typem `PlanListQueryInput`) oraz pomocnicze funkcje `encodePlanCursor`/`decodePlanCursor` (ew. w nowym module `src/lib/pagination/cursors.ts`, jeśli chcemy reużywalności).
2. Rozszerz `src/lib/services/plans.service.ts` o typ `PlanListQuery` i funkcję `listPlans`, korzystając z Supabase keyset pagination i zwracając `{ items, nextCursor }`.
3. Zaktualizuj `src/pages/api/plans/index.ts`: dodaj handler `export async function GET(ctx)` wykorzystujący walidację i nowy serwis; zachowaj istniejącą logikę `POST`.
4. Dodaj mapowanie błędów (walidacja, RLS, inne) zgodne z sekcją obsługi błędów oraz rozsądne logowanie w przypadku 500.
5. Uzupełnij dokumentację/manulane testy w `.ai/testing/plans-manual-tests.md` o scenariusze GET (brak cursor, z cursorem, limit graniczny, błędny limit).
6. Przejrzyj lint (np. `npx lint`).

