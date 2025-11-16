# API Endpoint Implementation Plan: PATCH /api/plans/:plan_id

## 1. Przegląd punktu końcowego
- Częściowa aktualizacja istniejącego planu działki użytkownika.
- Pozwala na zmianę metadanych (nazwa, lokalizacja, orientacja, półkula) oraz parametrów siatki.
- Aktualizacja wymiarów siatki (`width_cm`, `height_cm`, `cell_size_cm`) wymaga potwierdzenia `confirm_regenerate=true`, co sygnalizuje klientowi utratę komórek/roślin.
- Zwraca zaktualizowany `PlanDto` w strukturze `ApiItemResponse`.

## 2. Szczegóły żądania
- Metoda HTTP: `PATCH`
- Struktura URL: `/api/plans/:plan_id`
- Parametry:
  - Wymagane: `plan_id` (UUID w segmencie ścieżki).
  - Opcjonalne: `confirm_regenerate` (query string, boolean; domyślnie `false`).
- Request Body (JSON, pola opcjonalne, co najmniej jedno wymagane):
  - `name: string`
  - `latitude: number | null`
  - `longitude: number | null`
  - `width_cm: number`
  - `height_cm: number`
  - `cell_size_cm: 10 | 25 | 50 | 100`
  - `orientation: number (0-359)`
  - `hemisphere: "northern" | "southern"`
- Walidacja zapytania: odrzucamy dodatkowe pola i puste body; zapewniamy podzielność wymiarów przez `cell_size_cm`, zakresy współrzędnych i dopuszczalne rozmiary siatki.

## 3. Wykorzystywane typy
- Istniejące: `PlanDto`, `PlanUpdateCommand`, `PlanUpdateQuery`, `ApiItemResponse`, `ApiErrorResponse` z `src/types.ts`.
- Nowe/rozszerzone:
  - `PlanUpdateSchema` w `src/lib/validation/plans.ts` (opcjonalne pola + refine na co najmniej jedno pole, kontrola podzielności i zakresów).
  - `PlanUpdateParsed` (alias infer dla wygody w handlerze) – opcjonalnie.
  - Pomocniczy typ wyniku serwisu `UpdatePlanResult` (alias `PlanDto`).

## 4. Szczegóły odpowiedzi
- Sukces (`200 OK`):
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
      "orientation": 90,
      "hemisphere": "northern",
      "created_at": "ISO",
      "updated_at": "ISO"
    }
  }
  ```
- Błędy stosują standardową strukturę `errorResponse` z odpowiednim kodem statusu (`400/401/403/404/409/500`).

## 5. Przepływ danych
- `ctx.locals.supabase` → pobranie klienta Supabase i weryfikacja sesji (`supabase.auth.getUser`).
- Walidacja `plan_id` (Zod `uuid`), query (`confirm_regenerate` → `z.coerce.boolean()`), body (`PlanUpdateSchema`).
- Serwis `updatePlan` w `src/lib/services/plans.service.ts`:
  1. Pobierz aktualny plan (`select ... .eq("id", planId).eq("user_id", userId).maybeSingle()`).
  2. Jeśli brak danych → zwróć `null` (handler → 404).
  3. Oblicz proponowane wartości (`nextWidth`, `nextHeight`, `nextCellSize`) na podstawie wejścia + stanu.
  4. Wylicz nowe `grid_width/grid_height`; sprawdź zakres 1..200 i podzielność.
  5. Jeśli zmiana siatki i `confirm_regenerate !== true` → zgłoś kontrolowany błąd (`throw new GridChangeRequiresConfirmationError`).
  6. Przygotuj `updateData` z `updated_at: now()` (opcjonalnie rely na trigger) i wywołaj `supabase.from("plans").update(updateData).eq("id", planId).select(...).single()`.
  7. Propaguj błąd konfliktu (23505), RLS (`PGRST301`) i pozostałe.
- Handler mapuje wynik serwisu na `ApiItemResponse<PlanDto>` lub błędy.

## 6. Względy bezpieczeństwa
- Wymagane uwierzytelnienie Supabase; odrzucenie braku sesji (401).
- Walidacja `plan_id` jako UUID eliminuje wstrzyknięcia.
- RLS owner-only + filtr `user_id` w `updatePlan` gwarantuje dostęp wyłącznie do własnych planów.
- `confirm_regenerate` wymusza świadomą utratę danych siatki/roślin – chroni przed przypadkowymi zmianami.
- Brak logowania wrażliwych danych;

## 7. Obsługa błędów
- `400 ValidationError`: nieprawidłowy JSON, brak pól w body, błędne zakresy/liczby, błędny query param.
- `401 Unauthorized`: brak lub nieważna sesja.
- `403 Forbidden`: RLS odrzuca aktualizację (np. plan nie należy do użytkownika po stronie RLS).
- `404 NotFound`: plan nie istnieje lub został usunięty (serwis zwraca `null`).
- `409 Conflict`: 
  - zmiana siatki bez `confirm_regenerate=true`,
  - konflikt unikalności nazwy (`code === "23505"`).
- `500 InternalError`: inne, nieprzewidziane błędy; log w serwerze i ogólny komunikat.

## 8. Rozważania dotyczące wydajności
- Pojedyncze zapytanie SELECT + UPDATE → dwa roundtripy do Supabase; brak pętli.
- Wykorzystanie istniejących indeksów `(user_id, updated_at)` zapewnia szybkie wyszukanie planu.
- Wyliczenia na poziomie aplikacji są O(1); brak ciężkich operacji.
- Możliwość batching: brak – operacja dotyczy pojedynczego planu.
- Cache: brak potrzeby; rely na Supabase.

## 9. Etapy wdrożenia
1. **Walidacja**: rozszerz `src/lib/validation/plans.ts` o `PlanUpdateSchema` (opcjonalne pola, refine na co najmniej jedno pole, walidacje zakresów i podzielności; eksport typu inferowanych danych).
2. **Serwis**: rozbuduj `src/lib/services/plans.service.ts` o: 
   - `getPlanByIdForUser` (lub logikę wbudowaną w `updatePlan`),
   - `updatePlan(supabase, userId, planId, command, options)` obsługujące potwierdzenie regeneracji i mapowanie błędów.
3. **Endpoint**: dodaj plik `src/pages/api/plans/[plan_id].ts` z handlerem `PATCH`:
   - `export const prerender = false`,
   - pobranie sesji, walidacja parametrów, body i query,
   - wywołanie `updatePlan`, mapowanie wyników na `jsonResponse`.
4. **Obsługa błędów**: w handlerze zaimplementuj mapowanie wyjątków (ValidationError, Forbidden, Conflict, NotFound, InternalError); wykorzystaj istniejące `errorResponse`.
5. **Testy manualne**: dodaj scenariusze do `.ai/testing/plans-manual-tests.md` (sukces, zmiana bez confirm → 409, confirm → 200, konflikt nazwy, nieprawidłowe zakresy, brak autoryzacji).
6. **Kontrola jakości**: uruchom `npm run lint` i `npm run typecheck`; upewnij się, że nowe funkcje mają typy.
7. **Dokumentacja**: zaktualizuj `.ai/implementations/endpoints/plans-implementation-raport.md` po wdrożeniu (raport + instrukcje testowe).
