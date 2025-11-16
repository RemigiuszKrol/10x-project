# API Endpoint Implementation Plan: POST /api/plans/:plan_id/grid/area-type

## 1. Przegląd punktu końcowego
Endpoint umożliwia hurtową zmianę typu komórek w prostokątnym obszarze siatki planu działki. Autoryzowany użytkownik może ustawić nowy typ powierzchni dla wybranego prostokąta, przy zachowaniu ograniczeń geometrii siatki i spójności danych. Operacja wykorzystuje Supabase z włączonym RLS oraz triggery bazy, które usuwają nasadzenia z komórek o typie innym niż `soil`.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/plans/:plan_id/grid/area-type`
- Parametry:
  - Wymagane:
    - `plan_id` (UUID) – identyfikator planu w ścieżce.
  - Opcjonalne: brak.
- Nagłówki:
  - `Authorization: Bearer <token>` – Supabase JWT, wymagany.
  - `Content-Type: application/json`.
- Body (`GridAreaTypeCommand` z `src/types.ts`):
  - `x1`, `y1`, `x2`, `y2` (`number`) – indeksy komórek 0-based definiujące prostokąt; wymagane `x1 ≤ x2`, `y1 ≤ y2`.
  - `type` (`GridCellType`) – docelowy typ powierzchni (`soil`, `water`, `path`, `building`, ...).
  - `confirm_plant_removal` (`boolean`, opcjonalne) – wymagane `true`, gdy w obszarze znajdują się rośliny, a nowy typ ≠ `soil`.
- Typy wejściowe i walidacja:
  - `GridCellType` (enum Supabase) – lista dozwolonych wartości typu.
  - `gridAreaTypePathSchema` (nowy schemat Zod) – walidacja `plan_id` jako UUID.
  - `gridAreaTypePayloadSchema` (nowy schemat Zod) – walidacja payloadu (tych samych pól co w `GridAreaTypeCommand`) i sprawdzenie zależności `x1 ≤ x2`, `y1 ≤ y2`.

## 3. Szczegóły odpowiedzi
- 200 OK – `ApiItemResponse<GridAreaTypeResultDto>` z polami:
  - `affected_cells` (`number`) – liczba komórek, które zmieniły typ (domyślnie `(x2 - x1 + 1) * (y2 - y1 + 1)`).
  - `removed_plants` (`number`) – liczba roślin usuniętych przez triggery w wyniku zmiany typu (0 dla `soil`).
- Format błędów – `ApiErrorResponse` utrzymany globalnie.
- Brak paginacji ani dodatkowych metadanych.

## 4. Przepływ danych
1. Handler API pobiera `plan_id` ze ścieżki i klienta Supabase z `context.locals`.
2. Walidacja `plan_id` i body odbywa się przez Zod; błędy strukturalne są zwracane jako `422 Unprocessable Entity`.
3. Supabase pobiera plan (`public.plans`) ograniczony do aktualnego użytkownika (`user_id = auth.uid()`), aby:
   - potwierdzić istnienie planu,
   - odczytać `grid_width`/`grid_height` potrzebne do walidacji zakresu.
4. Dodatkowa walidacja domenowa sprawdza, czy `0 ≤ x1 ≤ x2 < grid_width` oraz `0 ≤ y1 ≤ y2 < grid_height`; naruszenia zwracają `422`.
5. Jeżeli nowy `type` jest różny od `soil`, serwis liczy rośliny w `plant_placements` w podanym obszarze (`select(..., { count: 'exact', head: true })`).
   - Jeśli licznik > 0 i `confirm_plant_removal` !== `true`, endpoint zwraca `409 Conflict` z kodem `Conflict` i informacją, że wymagane jest potwierdzenie.
6. Logika merytoryczna jest kapsułkowana w serwisie `GridAreaService.setAreaType`, który:
   - otrzymuje parametry (`plan_id`, `x1`, `y1`, `x2`, `y2`, `type`),
   - wykonuje aktualizację `grid_cells` pojedynczym zapytaniem `.update({ type }).eq('plan_id', planId).gte('x', x1).lte('x', x2).gte('y', y1).lte('y', y2)` z opcją `select`/`count` do weryfikacji liczby rekordów,
   - oblicza `affected_cells` na podstawie metadanych prostokąta (zabezpieczenie na wypadek braku rekordów),
   - zwraca `removed_plants` wyliczone z kroku 5 (bo triggery usuwają wszystkie rośliny w obszarze).
7. Handler serializuje wynik do `ApiItemResponse` i zwraca `200`.
8. W przypadku wyjątków sieciowych/serwerowych endpoint loguje błąd (np. `console.error` lub dedykowany logger) i zwraca `500 Internal Server Error` zgodnie z konwencją.

## 5. Względy bezpieczeństwa
- Wymagana autoryzacja Supabase (JWT w nagłówku); brak tokena skutkuje `401`.
- RLS owner-only na tabelach `plans`, `grid_cells` i `plant_placements` zabezpiecza dostęp do danych innych użytkowników.
- Dodatkowa walidacja planu po `plan_id` eliminuje możliwość enumeracji, zwracając `404` dla nieistniejącego planu zamiast błędów szczegółowych.
- Zod i whitelisting typów zapobiegają wstrzyknięciom i błędnym wartościom spoza `GridCellType`.
- Wymuszenie `confirm_plant_removal` minimalizuje ryzyko niezamierzonej utraty danych.
- Odpowiedzi nie ujawniają szczegółów wewnętrznych (np. struktury RLS), jedynie kody biznesowe.

## 6. Obsługa błędów
- `400 Bad Request` – nieprawidłowy JSON lub brak wymaganych pól w body (błąd parsera).
- `401 Unauthorized` – brak/nieprawidłowy token Supabase.
- `403 Forbidden` – odrzucony dostęp przez RLS (np. plan nie należy do użytkownika), mapowany na `Forbidden`.
- `404 Not Found` – plan nie istnieje lub nie jest widoczny dla użytkownika.
- `409 Conflict` – w obszarze znajdują się rośliny, a brak potwierdzenia usunięcia.
- `422 Unprocessable Entity` – naruszenie ograniczeń (granic siatki, kolejności współrzędnych, nieobsługiwany typ).
- `500 Internal Server Error` – błędy nieoczekiwane (np. błąd Supabase, timeout); logowane i zwracane z kodem `InternalError`.

## 7. Wydajność
- Aktualizacja wykonywana pojedynczym zapytaniem `UPDATE`, co minimalizuje round-tripy.
- Liczenie roślin wykorzystuje zapytanie z indeksem `(plan_id, plant_name)` oraz filtrem po współrzędnych; warto dopilnować użycia zakresów po `(x, y)` aby wspierać istniejące indeksy.
- Obliczenie `affected_cells` wykonywane w pamięci – brak dodatkowych zapytań.
- W razie bardzo dużych prostokątów (maks. 40 000 komórek) operacja pozostaje w granicach ograniczeń bazy; w przyszłości można rozważyć funkcję SQL z `WHERE` po przedziałach dla lepszej atomowości.
- Monitorować limit zapytań Supabase; oba zapytania (`count`, `update`) mieszczą się w rozsądnym budżecie.

## 8. Kroki implementacji
1. Dodać schematy `gridAreaTypePathSchema` i `gridAreaTypePayloadSchema` (Zod) w nowym module `src/lib/validation/grid-area.ts`, eksportować typy inferowane.
2. Utworzyć serwis `src/lib/services/grid-area.service.ts` z funkcją `setAreaType`, odpowiedzialną za liczenie roślin oraz aktualizację `grid_cells` (wykorzystując typy `GridAreaTypeCommand` i wynikowy interfejs `GridAreaTypeResultDto`).
3. Przygotować endpoint w `src/pages/api/plans/[plan_id]/grid/area-type.ts`:
   - `export const prerender = false`,
   - pobrać klienta Supabase z `context.locals`,
   - przeprowadzić walidację, autoryzację i delegować logikę do serwisu.
4. Zaimplementować mapowanie błędów serwisu na `ApiErrorResponse` (np. dedykowane klasy błędów dla konfliktu i naruszeń walidacji).
5. Dodać testy jednostkowe serwisu (mock Supabase) oraz testy integracyjne endpointu (np. z wykorzystaniem msw / supabase local lub kontraktowych snapshotów) obejmujące sukces, konflikt nasadzeń oraz naruszenie granic.
6. Uaktualnić dokumentację OpenAPI/README (jeżeli istnieje) i dodać wpis do changelogu / release notes.
7. Zweryfikować endpoint ręcznie (np. `curl` lub kolekcja w Thunder Client) z tokenem testowym.
8. Monitorować logi po wdrożeniu; dodać alerty jeśli często występują konflikty lub 500.

