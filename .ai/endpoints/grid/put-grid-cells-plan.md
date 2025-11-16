# API Endpoint Implementation Plan: PUT /api/plans/:plan_id/grid/cells/:x/:y

## 1. Przegląd punktu końcowego
- Ustawia typ pojedynczej komórki siatki w planie działki, aktualizując stan powierzchni (`soil`, `path`, `water`, `building`, `blocked`).
- Zmiana typu komórki może uruchomić triggery w bazie (np. automatyczne usunięcie nasadzeń przy przejściu na typ inny niż `soil`), dlatego operacja musi przebiegać atomowo.
- Endpoint jest dostępny wyłącznie dla właściciela planu dzięki Supabase RLS i wymaga ważnego tokena JWT przesyłanego w nagłówku `Authorization`.

## 2. Szczegóły żądania
- Metoda HTTP: `PUT`
- URL: `/api/plans/:plan_id/grid/cells/:x/:y`
- Nagłówki:
  - `Authorization: Bearer <JWT>` – wymagany; Supabase użyje sesji do weryfikacji RLS.
  - `Content-Type: application/json`
- Parametry ścieżki (parsowane z `ctx.params` i weryfikowane Zod-em):
  - `plan_id` – wymagany UUID; walidacja `z.string().uuid()`.
  - `x` – wymagane całkowite `>= 0`; walidacja `z.coerce.number().int().min(0)`.
  - `y` – wymagane całkowite `>= 0`; walidacja `z.coerce.number().int().min(0)`.
- Parametry zapytania: brak.
- Body (JSON, walidowane schematem `GridCellUpdateSchema`):
  ```json
  { "type": "soil" | "path" | "water" | "building" | "blocked" }
  ```
  - Wewnętrzny typ komend: `GridCellUpdateCommand`.
  - Schemat powinien być restrykcyjny (`strict()`), aby odrzucać nieznane pola.
- Walidacja dodatkowa:
  - Po pobraniu planu należy sprawdzić, czy `0 <= x < grid_width` oraz `0 <= y < grid_height`.
  - Upewnić się, że wartość `type` należy do enumu `grid_cell_type` z Supabase (`GridCellType` z `src/types.ts`), dzięki czemu mapowanie jest spójne z definicją bazy.

## 3. Szczegóły odpowiedzi
- Sukces (`200 OK`):
  ```json
  {
    "data": {
      "x": number,
      "y": number,
      "type": "soil" | "path" | "water" | "building" | "blocked",
      "updated_at": "2025-01-01T12:00:00.000Z"
    }
  }
  ```
  - Struktura zgodna z `ApiItemResponse<GridCellDto>`. W `select()` należy pobrać `x, y, type, updated_at`, aby interfejs pozostał zgodny z DTO.
- Błędy: patrz sekcja 6 – wszystkie odpowiedzi błędów korzystają z helpera `errorResponse` i `jsonResponse`.
- Nagłówki odpowiedzi: `Content-Type: application/json`.

## 4. Przepływ danych
1. Pobranie `supabase` z `ctx.locals`; w razie braku – zwrócenie `401 Unauthorized`.
2. Wywołanie `supabase.auth.getUser()` dla kontekstu requestu; brak użytkownika => `401`.
3. Walidacja `user.id` jako UUID (Zod) w celu wykrycia anomalii tokenu.
4. Walidacja parametrów ścieżki (`plan_id`, `x`, `y`) i ciała (`GridCellUpdateSchema`). Błędy walidacji → `400 ValidationError` z mapowaniem `field_errors`.
5. Pobranie planu z `plans` przy użyciu dedykowanego serwisu (np. `getPlanGridMetadata`) zwracającego `grid_width`, `grid_height`, `cell_size_cm`. Kwerenda powinna filtrować po `id` oraz `user_id` (redundantna kontrola wraz z RLS) i zwracać `404` jeśli brak rekordu.
6. Sprawdzenie zakresów `x` i `y` względem `grid_width/grid_height`; w razie przekroczenia → `400 ValidationError` z komunikatem `{"field_errors": { "x": "...", "y": "..." } }`.
7. Wysłanie komendy do serwisu warstwy danych (`updateGridCellType`) realizującego `upsert`/`update` na `grid_cells` (pojedynczy rekord). Funkcja powinna zwrócić obiekt `GridCellDto`.
8. Serwis powinien mapować błędy Supabase:
   - naruszenia constraintów, np. `23514` lub komunikaty triggera → propagacja do warstwy API w formie `Unprocessable`.
   - błędy uprawnień (`PGRST301`, komunikaty zawierające `permission`/`rls`) → sygnalizacja `Forbidden`.
9. Endpoint formatuje sukces za pomocą `jsonResponse({ data: gridCell }, 200)` i zwraca.

## 5. Względy bezpieczeństwa
- Uwierzytelnianie: wymagany token JWT Supabase; brak tokenu kończy się `401`.
- Autoryzacja: rely on Supabase RLS (owner-only), ale dodatkowe filtrowanie po `user_id` w zapytaniu do `plans` minimalizuje niejednoznaczności i ogranicza wycieki czasowe.
- Walidacja wejścia: pełna walidacja Zod dla parametrów i body, aby uniknąć wstrzyknięć (np. `NaN`, ciągi SQL).
- Ochrona przed enumeracją zasobów: przy braku planu zwracamy `404 NotFound`, nie ujawniając szczegółów.
- Dane wrażliwe: endpoint nie zwraca informacji poza zakresem danej komórki; brak logowania szczegółów domenowych poza `console.error` przy błędach 500.

## 6. Obsługa błędów
- `400 Bad Request / ValidationError` – nieprawidłowy JSON, brak wymaganych pól, błędny format `plan_id`, `x`, `y` lub wartości spoza zakresu przed wejściem do bazy.
- `401 Unauthorized` – brak Supabase clienta w `ctx.locals` lub brak sesji użytkownika.
- `403 Forbidden` – naruszenie RLS (wyjątki `PGRST301`, komunikaty o braku uprawnień); odpowiedź `errorResponse("Forbidden", "Access denied.")`.
- `404 Not Found` – plan nie istnieje lub jest niewidoczny dla użytkownika (zapytanie do `plans` zwróciło pusty wynik).
- `422 Unprocessable` – naruszenia constraintów/triggerów po stronie bazy (np. `x`/`y` poza zakresem wykryte na triggerze, próba osadzenia rośliny przy typie innym niż `soil`). Mapować na `errorResponse("Unprocessable", message)`.
- `500 Internal Server Error` – nieoczekiwane błędy Supabase/IO; logować przez `console.error` (lub docelowo mechanizm obserwacyjny) przed zwróceniem odpowiedzi.

## 7. Rozważania dotyczące wydajności
- Operacja wymaga dwóch kwerend: odczyt planu (małe payload) oraz `upsert/update` komórki; obie korzystają z istniejących indeksów (`plans (user_id, updated_at)` oraz PK `grid_cells(plan_id,x,y)`), co zapewnia O(1) dostęp.
- Użycie `select(...).single()` ogranicza przesyłane dane i zapobiega niekontrolowanym listom.
- Włączenie `upsert({ onConflict: "plan_id,x,y", ignoreDuplicates: false })` zapewni idempotencję i atomiczność bez dodatkowych zapytań.
- Rekomendowane jest zawężenie pól zwracanych przez Supabase do absolutnego minimum (`x, y, type, updated_at`), aby zmniejszyć rozmiar JSON.
- W przypadku dużej liczby aktualizacji seryjnych można w przyszłości rozważyć batching (POST area-type), lecz pojedynczy endpoint pozostaje lekki.

## 8. Kroki implementacji
1. **Walidacja** – utwórz `GridCellUpdateSchema` (np. `src/lib/validation/grid.ts`) z `z.object({ type: z.enum(["soil", "path", "water", "building", "blocked"]) }).strict()`, eksportując typ `GridCellUpdateInput`.
2. **Serwis danych** – dodaj `src/lib/services/grid-cells.service.ts` z funkcjami:
   - `getPlanGridMetadata(supabase, userId, planId)` → zwraca `grid_width`, `grid_height`.
   - `updateGridCellType(supabase, planId, x, y, command)` → wykonuje `upsert` i zwraca `GridCellDto`.
   - Helper do mapowania błędów Supabase na własne klasy (np. rzutowanie na `UnprocessableError`).
3. **Obsługa błędów serwisu** – zdefiniuj lub wykorzystaj istniejące klasy/utility do rozróżnienia kodów (`isPostgrestForbiddenError`, `isConstraintViolation`). W razie braku – dodaj mały helper w serwisie.
4. **Nowy plik routingu** – utwórz `src/pages/api/plans/[plan_id]/grid/cells/[x]/[y].ts`:
   - pobierz `supabase` z kontekstu i sprawdź sesję,
   - waliduj parametry i body,
   - pobierz metadane planu,
   - zweryfikuj zakresy,
   - wywołaj serwis aktualizacji komórki,
   - zwróć `jsonResponse({ data: gridCell }, 200)`,
   - zmapuj błędy zgodnie z sekcją 6.
5. **Testy/manual QA** – przygotuj scenariusze:
   - zmiana typu wewnątrz siatki,
   - próba zmiany typu poza zakresem (powinien zostać 400/422),
   - użytkownik bez dostępu (403/404),
   - zmiana typu na nie-`soil` i weryfikacja, że powiązane nasadzenia znikają (trigger).
6. **Dokumentacja** – zaktualizuj dokumentację API (np. w repozytorium `.ai` lub README) jeśli obowiązuje; odnotuj nowe endpointy/kontrakty.
7. **Monitorowanie** – upewnij się, że błędy `500` są logowane (`console.error`) i w przyszłości można je powiązać z systemem alertów.

