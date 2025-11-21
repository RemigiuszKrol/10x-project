# API Endpoint Implementation Plan: PUT /api/plans/:plan_id/plants/:x/:y

## 1. Przegląd punktu końcowego

- Cel: Dodanie lub aktualizacja pojedynczej rośliny w komórce siatki planu ogrodowego należącego do uwierzytelnionego użytkownika.
- Zakres: Operacja idempotentna (upsert) na tabeli `plant_placements`, z weryfikacją planu, komórki oraz typu powierzchni `soil`.
- Kontekst: Handler Astro 5 (`/src/pages/api`) wykorzystujący Supabase JS, Zod do walidacji i standardowe helpery `jsonResponse` / `errorResponse`.

## 2. Szczegóły żądania

- Metoda HTTP: PUT
- Struktura URL: `/api/plans/:plan_id/plants/:x/:y`
- Parametry:
  - Wymagane (ścieżka):
    - `plan_id`: UUID (właściciel planu = `user.id`).
    - `x`: integer (0 ≤ x < `grid_width`).
    - `y`: integer (0 ≤ y < `grid_height`).
  - Opcjonalne: brak.
- Request Body (JSON):
  - Wymagane: `plant_name` (trimowany string, 1–100 znaków).
  - Opcjonalne: `sunlight_score?`, `humidity_score?`, `precip_score?`, `overall_score?` — integer 1–5 lub `null`.
- Walidacja wejścia:
  - Schemat ścieżki `PlantPlacementPathSchema` (`z.object({ plan_id: z.string().uuid(), x: z.coerce.number().int().min(0).max(199), y: ... })`).
  - Schemat treści `PlantPlacementUpsertSchema` z trimowaniem i normalizacją `null` dla score’ów; wykorzystać `z.union([z.null(), z.number().int().min(1).max(5)])`.
  - Po walidacji schematycznej: pobranie `grid_width`, `grid_height` planu i sprawdzenie granic x/y.
  - Walidacja autoryzacji użytkownika (`supabase.auth.getUser()`), w tym sprawdzenie `user.id` przez Zod.

## 3. Wykorzystywane typy

- `PlantPlacementPathParams` (zapis wyników walidacji ścieżki).
- `PlantPlacementUpsertBody` (typ inferowany z Zod schema dla body).
- `PlantPlacementDto` (typ odpowiedzi – pola: `x`, `y`, `plant_name`, `sunlight_score`, `humidity_score`, `precip_score`, `overall_score`, `updated_at`).
- `UpsertPlantPlacementCommand` (interfejs serwisowy: `planId`, `x`, `y`, `payload`, `userId`).
- Reuse typu Supabase `Database` (jeśli istnieje w `src/db/types`) do adnotacji klienta.

## 4. Szczegóły odpowiedzi

- Sukces 200:
  ```json
  {
    "data": {
      "x": 3,
      "y": 7,
      "plant_name": "tomato",
      "sunlight_score": 4,
      "humidity_score": 3,
      "precip_score": 5,
      "overall_score": 4,
      "updated_at": "2025-01-01T10:00:00.000Z"
    }
  }
  ```
- Inne kody statusu:
  - 400 `ValidationError` — niepoprawne parametry ścieżki/ciała.
  - 401 `Unauthorized` — brak tokenu lub użytkownika.
  - 403 `Forbidden` — RLS odrzucił dostęp do planu.
  - 404 `NotFound` — plan lub komórka nie istnieją.
  - 422 `UnprocessableEntity` — komórka nie ma typu `soil` lub poza zasięgiem siatki.
  - 500 `InternalError` — nieprzewidziane błędy serwera/Supabase.

## 5. Przepływ danych

1. Handler pobiera `supabase` z `locals`; brak → 401.
2. Autoryzuje użytkownika (`supabase.auth.getUser()`), waliduje `user.id`.
3. Waliduje parametry ścieżki oraz ciało żądania przy użyciu Zod; mapuje błędy na 400 z `field_errors`.
4. Pobiera plan (`plans`) ograniczając kolumny do `id`, `user_id`, `grid_width`, `grid_height`; brak planu lub inny `user_id` → 404/403.
5. Sprawdza granice `x`,`y` względem parametrów planu; naruszenie → 422.
6. Pobiera komórkę z `grid_cells` (`select type`) i upewnia się, że `type === 'soil'`; brak rekordu → 404, inny typ → 422.
7. Wywołuje serwis `upsertPlantPlacement` przekazując `planId`, `x`, `y`, walidowane body oraz klienta Supabase.
8. Serwis wykonuje upsert (`from('plant_placements').upsert({...}, { onConflict: 'plan_id,x,y', returning: 'representation' })`) z `updated_at` z wyniku.
9. Serwis mapuje wynik do DTO i zwraca do handlera.
10. Handler zwraca `jsonResponse({ data: dto }, 200)`; błędy łapie i mapuje przez `errorResponse`.

## 6. Względy bezpieczeństwa

- Supabase JWT wymagany w `Authorization` lub cookie; brak → 401.
- RLS owner-only: weryfikacja `plan.user_id === user.id` przed zapisami, mimo domyślnego RLS.
- Walidacja i normalizacja `plant_name` oraz score’ów zapobiega wstrzyknięciom i niezgodnym typom.
- Ograniczenie granic `x`,`y` po stronie aplikacji (0–199) zapobiega nadmiernym zapytaniom.
- Nie zwracać szczegółów błędów Supabase; mapować do ogólnych kodów (422/500) z bezpiecznym komunikatem.
- Rozważyć rejestrowanie prób naruszenia (422/403) w loggerze lub `analytics_events` (opcjonalnie).

## 7. Obsługa błędów

- Walidacja Zod → `ValidationError` (400) z `details.field_errors`.
- Supabase `auth` bez użytkownika → 401 `Unauthorized`.
- RLS (`error.code === "42501"`) → 403 `Forbidden`.
- Brak planu (`maybeSingle()` zwraca null) → 404 `NotFound`.
- Brak komórki w `grid_cells` → 404 `NotFound` (`Cell not found`).
- `type !== 'soil'` lub przekroczenie granic → 422 `UnprocessableEntity`.
- Błędy constraint (np. score poza zakresem) wychwycone z Supabase → 400 jeśli wynikają z danych wejściowych, w pozostałych przypadkach 500.
- Wszystkie wyjątki logować (`logger.error('[PUT /plants] upsert failed', { planId, x, y, error })`).

## 8. Rozważania dotyczące wydajności

- Minimalizacja liczby zapytań: plan + komórka + upsert (3 hitty). Można rozważyć pojedynczy `rpc` w przyszłości, ale prostota ma priorytet.
- Zapytania korzystają z indeksów `(plan_id, x, y)` (PK) oraz RLS, więc są O(1) dla pojedynczych rekordów.
- Użycie `.single()` / `.maybeSingle()` ogranicza transfer danych do niezbędnych kolumn.
- Brak pętli, brak ryzyka blokad; upsert na pojedynczym rekordzie.

## 9. Etapy wdrożenia

1. Dodaj schematy Zod w `src/lib/validation/plant-placements.ts` (ścieżka + body + typy inferowane) i wyeksportuj helpery.
2. Utwórz/uzupełnij serwis `src/lib/services/plant-placements.service.ts` funkcją `upsertPlantPlacement`, uwzględniając mapowanie błędów Supabase.
3. Dodaj ewentualne re-eksporty serwisu i typów w centralnych plikach (`src/lib/services/index.ts`, `src/types.ts`).
4. Zaimplementuj handler `src/pages/api/plans/[planId]/plants/[x]/[y].ts` (`export const prerender = false`), wykorzystaj schematy, serwis, helpery odpowiedzi.
5. Zapewnij spójne logowanie (`logger.error`) dla błędów serwisu, zgodnie z konwencją projektu.
6. Rozszerz dokumentację/testy ręczne w `.ai/testing/plans-plants-put.md` (lub istniejącym pliku) o przypadki: sukces, tworzenie, nadpisanie, typ != soil, brak komórki, brak uprawnień, błędne score’y.
7. Uruchom `pnpm lint` / `pnpm test` i przygotuj opis zmian do PR.
