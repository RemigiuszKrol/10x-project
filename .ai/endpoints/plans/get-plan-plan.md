# API Endpoint Implementation Plan: GET /api/plans/:plan_id

## 1. Przegląd punktu końcowego

- Cel: Udostępnić szczegóły pojedynczego planu działki należącego do zalogowanego użytkownika.
- Zakres: Odczyt danych tylko właściciela (RLS owner-only), brak modyfikacji ani danych z innych tabel.
- Zależności: Supabase (PostgREST) z włączonym RLS, helpery `jsonResponse` i `errorResponse`, `PlanDto` z `src/types.ts`, `zod` do walidacji.

## 2. Szczegóły żądania

- Metoda: GET.
- URL: `/api/plans/:plan_id`.
- Parametry:
  - Wymagane: `plan_id` w ścieżce (UUID).
  - Opcjonalne: brak parametrów zapytania.
- Treść żądania: brak.
- Walidacja wejścia:
  - Nowy schemat `PlanIdParamSchema` w `src/lib/validation/plans.ts` (`z.object({ plan_id: z.string().uuid() })`).
  - Parser ścieżki w handlerze zwraca 400 przy nieudanej walidacji i mapuje błędy na `field_errors`.

## 3. Wykorzystywane typy

- `PlanDto` jako wyjściowy DTO (już dostępny w `src/types.ts`).
- `ApiItemResponse<PlanDto>` oraz `ApiErrorResponse` z `src/types.ts`.
- Nowy typ pomocniczy `PlanIdParams = z.infer<typeof PlanIdParamSchema>` dla handlera.
- W serwisie nowa sygnatura `getPlanById(supabase, userId: string, planId: string): Promise<PlanDto> | null`.

## 4. Szczegóły odpowiedzi

- Sukces 200: `{ "data": PlanDto }` z `Content-Type: application/json`.
- Kody statusu:
  - 200 gdy plan istnieje i należy do użytkownika.
  - 400 przy błędnym `plan_id`.
  - 401 gdy brak sesji Supabase.
  - 403 przy naruszeniu RLS (Supabase błąd uprawnień).
  - 404 gdy plan nie istnieje lub nie należy do użytkownika.
  - 500 przy nieoczekiwanym błędzie serwera.

## 5. Przepływ danych

- Handler pobiera `supabase` z `ctx.locals`; brak → 401.
- `supabase.auth.getUser()` weryfikuje sesję; brak `user` → 401; walidacja `user.id` przez `z.string().uuid()` → 400 przy błędzie.
- Walidacja `ctx.params` przez `PlanIdParamSchema`; niepowodzenie → 400 i `ValidationError`.
- Wywołanie serwisu `getPlanById` z przekazaniem `supabase`, `user.id` oraz `plan_id`.
- Serwis wykonuje zapytanie:
  - `.from("plans").select("id, user_id, name, latitude, longitude, width_cm, height_cm, cell_size_cm, grid_width, grid_height, orientation, hemisphere, created_at, updated_at")`.
  - `.eq("id", planId)` oraz `.eq("user_id", userId)` dla redundancji względem RLS.
  - `.single()` aby otrzymać dokładnie jeden rekord.
- Gdy zapytanie zwróci `null`, handler odpowiada 404.
- Przy sukcesie handler zwraca `jsonResponse({ data: plan }, 200)`.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie Supabase JWT; brak tokenu → 401.
- Autoryzacja wymuszana przez RLS oraz dodatkowy filtr `user_id` w zapytaniu serwisu.
- Walidacja UUID zapobiega SQL injection i nieprawidłowym zapytaniom.
- Odpowiedź błędów nie ujawnia wrażliwych szczegółów (standardowa struktura `ApiErrorResponse`).
- Brak danych pochodnych (np. współdzielonych) — minimalizuje wycieki informacji.

## 7. Obsługa błędów

- 400 `ValidationError`: `plan_id` nie jest prawidłowym UUID lub brak parametru ścieżki.
- 401 `Unauthorized`: brak klienta Supabase lub brak zalogowanego użytkownika.
- 403 `Forbidden`: Supabase zwraca błąd uprawnień (np. naruszenie RLS) → zamapować na `Forbidden`.
- 404 `NotFound`: zapytanie nie zwraca rekordu (Supabase `.single()` zwraca `null` lub `PGRST116`) → odpowiadamy `errorResponse("NotFound", "Plan not found.")`.
- 500 `InternalError`: inne nieobsłużone wyjątki; logowanie przez `console.error` (brak dedykowanej tabeli błędów) oraz odpowiedź 500.

## 8. Rozważania dotyczące wydajności

- Zapytanie zwraca pojedynczy rekord po kluczu głównym; korzysta z indeksu `plans_pkey`.
- Filtr `user_id` współdziałający z RLS dodatkowo wykorzystuje indeks `(user_id, updated_at desc)` bez istotnych kosztów.
- Brak kosztownych obliczeń po stronie serwera; odpowiedź zawiera tylko wymagane kolumny.

## 9. Etapy wdrożenia

1. Rozszerz `src/lib/validation/plans.ts` o `PlanIdParamSchema` i eksport typu `PlanIdParams`.
2. Dodaj do `src/lib/services/plans.service.ts` funkcję `getPlanById` z obsługą filtrów `user_id` i mapowaniem błędów (puste dane → `null`, kody Supabase dla RLS → wyjątek do handlera).
3. Utwórz nowy plik `src/pages/api/plans/[planId].ts` z `export const prerender = false` oraz handlerem `GET`.
4. Zaimplementuj handler w `src/pages/api/plans/[planId].ts`: pobierz i zweryfikuj `supabase` oraz użytkownika (`z.string().uuid()`), waliduj `ctx.params`, wywołaj `getPlanById`, mapuj wyniki i błędy (`Forbidden`, `NotFound`, `InternalError`) oraz loguj przypadki 500.
5. Dodaj scenariusze testów manualnych/automatycznych do `.ai/testing/plans-manual-tests.md` (sukces, plan innego użytkownika, brak planu, błędny UUID, brak tokenu).
6. Uruchom lint (`npx lint` lub odpowiednik) i przeprowadź review zmian.
