# API Endpoint Implementation Plan: DELETE /api/plans/:plan_id/plants/:x/:y

## 1. Przegląd punktu końcowego

- Cel: Usunięcie nasadzenia rośliny z konkretnej komórki planu działki należącego do uwierzytelnionego użytkownika bez modyfikacji typu komórki.
- Zakres: Operacja na tabeli `plant_placements` z kontrolą przynależności planu, granic siatki oraz istnienia komórki i wpisu rośliny.
- Kontekst: Handler Astro 5 w `src/pages/api`, korzystający z Supabase JS, Zod, helperów odpowiedzi HTTP oraz centralnego loggera.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/plans/:plan_id/plants/:x/:y`
- Parametry:
  - Wymagane (ścieżka):
    - `plan_id`: UUID planu, musi należeć do bieżącego użytkownika.
    - `x`: liczba całkowita ≥ 0, < `grid_width`.
    - `y`: liczba całkowita ≥ 0, < `grid_height`.
  - Opcjonalne: brak.
- Nagłówki: `Authorization: Bearer <token>` (Supabase JWT) lub sesja cookie Supabase.
- Request Body: brak (żądanie bez treści).
- Walidacja wejścia:
  - Zod schema `PlantPlacementPathSchema` (`uuid` + `z.coerce.number().int().min(0).max(199)`).
  - Po walidacji schematycznej sprawdzenie wymiarów planu (`grid_width`, `grid_height`) w bazie.
  - Weryfikacja istnienia komórki w `grid_cells` oraz wpisu w `plant_placements`.
- **Wykorzystywane typy**:
  - `PlantPlacementPathParams` – wynik inferowania Zod dla parametrów ścieżki.
  - `DeletePlantPlacementCommand` – interfejs serwisowy (`planId`, `x`, `y`, `userId`, `client`).
  - `DeletePlantPlacementResult` – struktura pomocnicza (np. `{ deleted: boolean }`) dla łatwiejszego testowania/logowania.
  - `SupabaseClient<Database>` – typ klienta z `src/db`.

## 3. Szczegóły odpowiedzi

- Sukces 204 No Content – brak ciała odpowiedzi.
- Błędy:
  - 400 `ValidationError` – nieprawidłowe parametry ścieżki lub współrzędne poza zakresem siatki.
  - 401 `Unauthorized` – brak ważnego tokenu.
  - 403 `Forbidden` – próba dostępu do planu innego użytkownika (RLS / jawny check).
  - 404 `NotFound` – plan nie istnieje, komórka nie istnieje lub brak nasadzenia w tej komórce.
  - 500 `InternalError` – nieprzewidziany błąd Supabase lub serwera.

## 4. Przepływ danych

1. Pobierz `supabase` i `logger` z `locals`; brak klienta → 500 (konfiguracja) lub 401 jeśli wynika z braku sesji.
2. Odczytaj użytkownika poprzez `supabase.auth.getUser()`; brak → 401.
3. Zweryfikuj parametry ścieżki za pomocą Zod; błędy mapuj na 400 z `details.field_errors`.
4. Pobierz plan (`select id, user_id, grid_width, grid_height from plans where id = :plan_id`) i upewnij się, że istnieje oraz `user_id` = `user.id`; brak planu → 404, inny właściciel → 403.
5. Sprawdź, czy `(x, y)` mieści się w granicach siatki; naruszenie → 400.
6. Pobierz komórkę z `grid_cells`; brak → 404 (komórka nie została zdefiniowana dla planu).
7. Pobierz wpis z `plant_placements`; brak → 404 (nic do usunięcia).
8. Wywołaj serwis `deletePlantPlacement`, który wykona `.delete().eq('plan_id', planId).eq('x', x)...` i zweryfikuje, że usunięto dokładnie jeden rekord.
9. Zwróć `jsonResponse(null, 204)`; wszystkie wyjątki przechwyć, zmapuj przez `errorResponse`, zaloguj szczegóły (`logger.error`).

## 5. Względy bezpieczeństwa

- Wymagana autoryzacja Supabase; korzystaj z `Authorization` lub sesji cookie.
- RLS owner-only: dodatkowa walidacja `plan.user_id` chroni przed ujawnieniem, nawet jeśli RLS jest aktywny.
- Ścisła walidacja parametrów ścieżki zapobiega wstrzyknięciom i nadmiernym zapytaniom.
- Nie ujawniaj szczegółów błędów Supabase w odpowiedzi; loguj je po stronie serwera.
- Rozważ rejestrowanie powtarzających się naruszeń (403/400) w loggerze/monitoringu.

## 6. Obsługa błędów

- Walidacja Zod → 400 `ValidationError` z `field_errors`.
- Brak uwierzytelnienia → 401 `Unauthorized`.
- Plan innego użytkownika (błąd RLS `42501` lub jawny check) → 403 `Forbidden`.
- Brak planu/komórki/nasadzenia → 404 `NotFound`.
- Błędy Supabase (np. połączenie, timeout) → 500 `InternalError`; loguj `error.code`, `planId`, `x`, `y`.
- Wszystkie błędy loguj poprzez `logger.error('[DELETE /plants] failed', { planId, x, y, userId, error })`.

## 7. Wydajność

- Zapytania korzystają z kluczy głównych i indeksów (`plans.id`, `grid_cells(plan_id,x,y)`, `plant_placements(plan_id,x,y)`), co gwarantuje O(1) odczyty/usunięcia.
- Minimalna liczba zapytań: plan + komórka + nasadzenie + delete (4). Można połączyć krok 6 i 7 w jedno zapytanie `plant_placements` z `single()` aby zmniejszyć liczbę hitów.
- Użycie `.single()`/`.maybeSingle()` ogranicza ilość danych; brak pętli.
- Odpowiedź 204 bez ciała redukuje transfer.

## 8. Kroki implementacji

1. Dodaj/rozszerz schemat `PlantPlacementPathSchema` oraz typy `PlantPlacementPathParams` w `src/lib/validation/plant-placements.ts`.
2. Utwórz funkcję `deletePlantPlacement(command: DeletePlantPlacementCommand)` w `src/lib/services/plant-placements.service.ts`, zwracającą `DeletePlantPlacementResult` i mapującą błędy Supabase.
3. Zapewnij eksport serwisu/typów w `src/lib/services/index.ts` oraz ewentualnie w `src/types.ts` (jeżeli projekt tak robi).
4. Dodaj handler `src/pages/api/plans/[planId]/plants/[x]/[y].ts` (lub `.astro.ts`), ustaw `export const prerender = false`, załaduj schemat, serwis i helpery `jsonResponse`/`errorResponse`.
5. Zaimplementuj orkiestrację w handlerze: autoryzacja, walidacja, odczyt planu i komórki, delegacja do serwisu, mapowanie błędów.
6. Dodaj testy jednostkowe/kontraktowe lub scenariusze manualne w `.ai/testing/plans-plants-delete.md` obejmujące przypadki: sukces, brak rośliny, brak komórki, plan innego użytkownika, brak tokenu, Parametry spoza zakresu.
7. Uzupełnij dokumentację API (np. `.ai/api-plan.md`) o nowy endpoint i uruchom `pnpm lint`/`pnpm test` przed PR.
