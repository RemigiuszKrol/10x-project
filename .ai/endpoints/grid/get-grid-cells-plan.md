# API Endpoint Implementation Plan: GET /api/plans/:plan_id/grid/cells

## 1. Przegląd punktu końcowego

- Udostępnia listę komórek siatki planu w oparciu o Supabase RLS owner-only.
- Służy do budowy widoku planu i filtracji wg typu komórki lub obszaru.
- Zapewnia paginację kursorem na bazie `updated_at,x,y` dla stabilnego stronicowania.
- Wymusza zgodność koordynatów z wymiarami `grid_width/grid_height` zapisanymi przy planie.

## 2. Szczegóły żądania

- Metoda HTTP: GET.
- Struktura URL: `/api/plans/:plan_id/grid/cells`.
- Parametry wymagane: `plan_id` (UUID ścieżki, weryfikowany przez Zod i Supabase RLS).
- Parametry opcjonalne: `type` (ENUM `grid_cell_type`), para `x`/`y` (oba całkowite, >=0), `bbox` (ciąg `x1,y1,x2,y2`), `limit` (1-100, domyślnie 50), `cursor` (Base64 opakowujący `updated_at|x|y`), `sort`/`order` (whitelist: `updated_at`, `x`; domyślnie `updated_at desc`).
- Treść żądania: brak.
- Walidacja wejścia: unieważnij mieszanie `x/y` z `bbox`, sprawdź że współrzędne mieszczą się w wymiarach planu, odrzuć kursor o złej strukturze lub podpisie.

## 3. Szczegóły odpowiedzi

- Sukces 200: `ApiListResponse<GridCellDto>` z polami `data[]` (`x`,`y`,`type`,`updated_at`) i `pagination.next_cursor`.
- Kursory: Base64(JSON `{ updated_at: string, x: number, y: number }`) generowane po ostatniej rekordzie; `null` gdy brak kolejnej strony.
- Wykorzystywane typy: istniejące `GridCellDto`, `GridCellListQuery`, `ApiListResponse`, `ApiErrorResponse`; nowe pomocnicze `GridCellListQuerySchema`, `GridCellCursorPayload`.
- Mapowanie statusów: 200 sukces, 400 walidacja, 401 brak sesji, 403 RLS, 404 plan nie istnieje, 500 błędy serwera.

## 4. Przepływ danych

- Pobierz `ctx.locals.supabase`; odmów 401 jeśli brak klienta lub usera (`supabase.auth.getUser()`).
- Zweryfikuj `plan_id`, sparsuj zapytanie przez `GridCellListQuerySchema` i odczytaj parametry.
- Pobierz plan (`plans`) z kolumnami `id`, `user_id`, `grid_width`, `grid_height`; brak rekordu -> 404.
- Zbuduj filtry Supabase dla `grid_cells` (`eq("plan_id", planId)` + `eq`/`gte`/`lte` w zależności od `type`, `x/y`, `bbox`) oraz sortowanie (`order("updated_at", { ascending })`, wtórnie `order("x")`, `order("y")`).
- Zastosuj limit+1 dla detekcji kolejnej strony, obsłuż kursor (`lt`/`gt` warunki dla `updated_at` oraz `x`/`y`).
- Zwróć `data` po konwersji do DTO (bez transformacji), policz `next_cursor` jeśli pobrano limit+1, pomiń rekord ekstra.

## 5. Względy bezpieczeństwa

- Autoryzacja JWT: wymagane tokeny Supabase, RLS zapewnia owner-only.
- Walidacja wejścia chroni przed SQL injection i enumeracją (odrzucamy spoza zakresu).
- Obsługa kursora: podpis JSON + Base64 zapobiega manipulacji; błędne kody -> 400.
- Ograniczenie `limit` i brak body minimalizuje ryzyko DoS; loguj tylko błędy 500.
- Nie ujawniamy, czy plan istnieje dla innych użytkowników (RLS + 404 tylko przy braku planu po autoryzacji).

## 6. Obsługa błędów

- 400 `ValidationError`: niepoprawny UUID, JSON zapytania, limit, cursor, brak `y` dla `x`, współrzędne poza siatką.
- 401 `Unauthorized`: brak klienta Supabase, brak sesji użytkownika.
- 403 `Forbidden`: odpowiedź Supabase z kodem RLS/permission.
- 404 `NotFound`: plan nie istnieje lub RLS ukrył zasób (po autoryzacji).
- 500 `InternalError`: inne błędy Supabase, nieudane dekodowanie kursora mimo poprawnego formatu, nieprzewidziane wyjątki.

## 7. Wydajność

- Wykorzystaj indeks `(plan_id, type)` dla filtru typu; przy braku filtru rely on PK `(plan_id,x,y)`.
- Limit 100 i kursory zapewniają stronicowanie O(1) pamięci.
- Sortowanie po `updated_at desc, x asc, y asc` wspiera stabilne pobieranie; rozważ future index `(plan_id, updated_at desc, x, y)`.
- Unikaj dodatkowych roundtripów: plan pobieramy raz, komórki jednym zapytaniem.
- Możliwe cache po stronie klienta bazujące na kursorach; serwer nie wprowadza lokalnego cache.

## 8. Kroki implementacji

1. Utwórz plik `src/pages/api/plans/[plan_id]/grid/cells.ts` z handlerem GET, ustaw `prerender = false`.
2. Dodaj `src/lib/validation/grid.ts` (lub rozszerz istniejące) z `GridCellListQuerySchema` oraz helperem `parseGridCursor`.
3. Dodaj service `src/lib/services/grid-cells.service.ts` z funkcją `listGridCells`, przyjmującą `supabase`, `planId`, `query` i obsługującą kursory oraz łańcuch filtrów.
4. W service zaimplementuj pobranie planu, weryfikację zakresów oraz budowę zapytania `grid_cells`; uwzględnij logikę limit+1 i generowanie kursora.
5. W handlerze GET: pobierz usera, waliduj wejście, wywołaj service, mapuj odpowiedź `ApiListResponse`, zamień błędy Supabase na kody (403, 404, 500) zgodnie z konwencją `errorResponse`.
6. Dodaj testy jednostkowe/usługowe (jeśli dostępna infrastruktura) dla parsera kursora i walidacji; przygotuj manualny scenariusz QA w `.ai/testing/plans-manual-tests.md`.
7. Zaktualizuj dokumentację API (`.ai/api-plan.md` lub odpowiednią sekcję) o nowy endpoint w ramach osobnego zadania, jeśli wymagane.
