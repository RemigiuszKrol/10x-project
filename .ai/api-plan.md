## REST API Plan


## 1. Zasoby

- **Profile** → tabela: `public.profiles`
- **Plany działki (Plans)** → tabela: `public.plans`
- **Komórki siatki (GridCells)** → tabela: `public.grid_cells`
- **Nasadzenia (PlantPlacements)** → tabela: `public.plant_placements`
- **Pogoda miesięczna (WeatherMonthly)** → tabela: `public.weather_monthly`
- **Zdarzenia analityczne (AnalyticsEvents)** → tabela: `public.analytics_events`

Uwagi projektowe:
- RLS (Row Level Security) włączone dla wszystkich tabel domenowych; wzorzec owner-only oparty o `auth.uid()`.
- Indeksy pod listowanie i typowe filtry: m.in. `(user_id, updated_at desc)` dla planów, `(plan_id, type)` dla komórek, `(plan_id, plant_name)` dla nasadzeń, `(user_id, created_at desc)` i `(plan_id, created_at desc)` dla analityki.
- Ograniczenia walidacyjne w bazie, kluczowe dla API: rozmiary siatki i jednostka kratki (10/25/50/100), granice współrzędnych komórek względem `grid_width/grid_height`, typ komórki `soil` wymagany do posadzenia rośliny, skale ocen (1–5) i metryk pogody (0–100), zakres orientacji (0–359). Triggery utrzymują spójność (`updated_at`, granice komórek, rośliny tylko na `soil`, purge roślin przy zmianie typu pola).


## 2. Endpointy

Konwencje ogólne:
- Base URL: `/api`
- Autoryzacja: Supabase JWT w nagłówku `Authorization: Bearer <token>` (lub cookie). Serwer używa klienta Supabase ze względu na RLS.
- Paginacja: `?limit=<1..100>&cursor=<opaque>` (cursor-based). Odpowiedź zawiera `pagination.next_cursor` lub `null`.
- Sortowanie: `?sort=<field>&order=asc|desc` (whitelist pól indeksowanych). Domyślne sortowanie według aktualnej logiki indeksów.
- Filtrowanie: jawne, przez bezpieczne parametry (whitelist).
- Format sukcesu (listy):
  ```json
  {
    "data": [ /* ... */ ],
    "pagination": { "next_cursor": "string|null" }
  }
  ```
- Format sukcesu (pojedynczy zasób):
  ```json
  { "data": { /* ... */ } }
  ```
- Format błędu (spójny w całym API):
  ```json
  {
    "error": {
      "code": "string",    // np. ValidationError, Unauthorized, Forbidden, NotFound, Conflict, RateLimited, UpstreamTimeout
      "message": "string",
      "details": { "field_errors": { "field": "reason" } } // opcjonalnie
    }
  }
  ```

### 2.1 Profile

- GET `/api/profile`
  - Opis: Pobierz profil zalogowanego użytkownika.
  - Parametry: brak
  - Odpowiedź 200:
    ```json
    {
      "data": {
        "id": "uuid",
        "language_code": "pl",
        "theme": "light",
        "created_at": "iso-datetime",
        "updated_at": "iso-datetime"
      }
    }
    ```
  - Błędy: 401 Unauthorized, 403 Forbidden (RLS), 404 NotFound (brak profilu)

- PUT `/api/profile`
  - Opis: Aktualizuj `language_code` i/lub `theme` bieżącego użytkownika.
  - Body (JSON):
    ```json
    {
      "language_code": "pl",
      "theme": "light"
    }
    ```
  - Zasady walidacji:
    - `language_code`: wymagane ISO code (np. "pl", "en")
    - `theme`: enum `light|dark`
  - Odpowiedź 200: jak GET
  - Błędy: 400 ValidationError, 401, 403

### 2.2 Plany działki (Plans)

- GET `/api/plans?limit&cursor&sort=updated_at&order=desc`
  - Opis: Lista planów zalogowanego użytkownika (RLS). Domyślnie sort po `updated_at desc`.
  - Odpowiedź 200:
    ```json
    {
      "data": [
        {
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
          "created_at": "iso-datetime",
          "updated_at": "iso-datetime"
        }
      ],
      "pagination": { "next_cursor": null }
    }
    ```
  - Błędy: 401, 403

- POST `/api/plans`
  - Opis: Utwórz nowy plan (wymaga sesji).
  - Body (JSON):
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
  - Zasady walidacji:
    - `name`: required, non-empty
    - `width_cm`, `height_cm` > 0
    - `cell_size_cm` ∈ {10,25,50,100}
    - `width_cm % cell_size_cm === 0`, `height_cm % cell_size_cm === 0`
    - `grid_width = width_cm / cell_size_cm` i `grid_height = height_cm / cell_size_cm` w zakresie 1..200 (CHECK w DB)
    - `orientation` 0..359
  - Odpowiedź 201: `{ "data": { ...plan } }`
  - Błędy: 400 ValidationError, 401, 403, 409 Conflict (unikat `user_id+name`)

- GET `/api/plans/:plan_id`
  - Opis: Pobierz szczegóły planu.
  - Odpowiedź 200: `{ "data": { ...plan } }`
  - Błędy: 401, 403, 404

- PATCH `/api/plans/:plan_id?confirm_regenerate=false`
  - Opis: Częściowa aktualizacja. Zmiany wpływające na siatkę (wymiary/jednostka) wymagają potwierdzenia.
  - Body (JSON) – pola opcjonalne:
    ```json
    {
      "name": "string",
      "latitude": 52.1,
      "longitude": 21.0,
      "width_cm": 500,
      "height_cm": 400,
      "cell_size_cm": 25,
      "orientation": 90,
      "hemisphere": "southern"
    }
    ```
  - Zasady walidacji jak w POST. Jeśli zmiana generuje inne `grid_width/grid_height`:
    - Gdy `confirm_regenerate !== true`: 409 Conflict z komunikatem o konieczności potwierdzenia (wpływ na komórki/rośliny).
    - Gdy `confirm_regenerate === true`: dozwól zmianę; UI wcześniej potwierdza utratę roślin przy regeneracji siatki.
  - Odpowiedź 200: `{ "data": { ...plan } }`
  - Błędy: 400, 401, 403, 404, 409

- DELETE `/api/plans/:plan_id`
  - Opis: Usuń plan (kaskadowo usunie komórki i nasadzenia).
  - Odpowiedź 204 (bez treści)
  - Błędy: 401, 403, 404

### 2.3 Komórki siatki (GridCells)

- GET `/api/plans/:plan_id/grid`
  - Opis: Pobierz metadane siatki (wymiary i parametry).
  - Odpowiedź 200:
    ```json
    {
      "data": {
        "grid_width": 20,
        "grid_height": 16,
        "cell_size_cm": 25,
        "orientation": 0
      }
    }
    ```
  - Błędy: 401, 403, 404

- GET `/api/plans/:plan_id/grid/cells?type=soil&bbox=0,0,19,15&limit=100&cursor=`
  - Opis: Lista komórek w planie z filtrami: `type`, pojedyncza pozycja `x,y` lub `bbox=x1,y1,x2,y2`.
  - Zasady walidacji filtrów: współrzędne w zakresie siatki, `type` ∈ ENUM.
  - Odpowiedź 200 (fragment):
    ```json
    {
      "data": [
        { "x": 0, "y": 0, "type": "soil", "updated_at": "iso-datetime" }
      ],
      "pagination": { "next_cursor": null }
    }
    ```
  - Błędy: 400, 401, 403, 404

- PUT `/api/plans/:plan_id/grid/cells/:x/:y`
  - Opis: Ustaw typ pojedynczej komórki.
  - Body (JSON):
    ```json
    { "type": "soil" }
    ```
  - Zasady walidacji: `x,y` w granicach siatki; typ w ENUM. Zmiana typu ≠ `soil` spowoduje usunięcie rośliny w tej komórce (trigger).
  - Odpowiedź 200:
    ```json
    { "data": { "x": 1, "y": 2, "type": "path" } }
    ```
  - Błędy: 400, 401, 403, 404, 422 Unprocessable (poza granicami – komunikat z triggera)

- POST `/api/plans/:plan_id/grid/area-type`
  - Opis: Nadaj typ prostokątnemu obszarowi siatki (edytor obszarów).
  - Body (JSON):
    ```json
    {
      "x1": 0, "y1": 0,
      "x2": 5, "y2": 5,
      "type": "water",
      "confirm_plant_removal": true
    }
    ```
  - Zasady walidacji:
    - Koordynaty w granicach siatki, `x1<=x2`, `y1<=y2`
    - Jeśli w obszarze znajdują się rośliny i `type !== 'soil'`:
      - Gdy `confirm_plant_removal !== true`: 409 Conflict (wymóg potwierdzenia usunięcia roślin)
      - Gdy `confirm_plant_removal === true`: wykonać zmianę; rośliny zostaną usunięte (trigger purge)
  - Odpowiedź 200:
    ```json
    {
      "data": {
        "affected_cells": 36,
        "removed_plants": 4
      }
    }
    ```
  - Błędy: 400, 401, 403, 404, 409, 422

### 2.4 Nasadzenia (PlantPlacements)

- GET `/api/plans/:plan_id/plants?name=tomato&limit=50&cursor=`
  - Opis: Lista nasadzeń w planie z filtrem po `plant_name` (prefiks/ILIKE) i paginacją.
  - Odpowiedź 200 (fragment):
    ```json
    {
      "data": [
        {
          "x": 3, "y": 7,
          "plant_name": "tomato",
          "sunlight_score": 4,
          "humidity_score": 3,
          "precip_score": 5,
          "overall_score": 4,
          "created_at": "iso-datetime",
          "updated_at": "iso-datetime"
        }
      ],
      "pagination": { "next_cursor": null }
    }
    ```
  - Błędy: 401, 403, 404

- PUT `/api/plans/:plan_id/plants/:x/:y`
  - Opis: Dodaj/aktualizuj roślinę w komórce (`1 komórka = 1 roślina`). Dozwolone tylko na `soil`.
  - Body (JSON):
    ```json
    {
      "plant_name": "tomato",
      "sunlight_score": 4,
      "humidity_score": 3,
      "precip_score": 5,
      "overall_score": 4
    }
    ```
  - Zasady walidacji:
    - `x,y` w granicach siatki, komórka istnieje i ma `type='soil'` (trigger wymusi)
    - Skale ocen: 1..5 (opcjonalne; mogą być null przy wstawieniu „wstępnym”)
  - Odpowiedź 200:
    ```json
    {
      "data": {
        "x": 3, "y": 7,
        "plant_name": "tomato",
        "sunlight_score": 4,
        "humidity_score": 3,
        "precip_score": 5,
        "overall_score": 4,
        "updated_at": "iso-datetime"
      }
    }
    ```
  - Błędy: 400, 401, 403, 404, 422 (komórka nie-`soil`/poza granicami)

- DELETE `/api/plans/:plan_id/plants/:x/:y`
  - Opis: Usuń roślinę z komórki (pole staje się puste – typ komórki bez zmian).
  - Odpowiedź 204
  - Błędy: 401, 403, 404

### 2.5 Pogoda miesięczna (WeatherMonthly)

- GET `/api/plans/:plan_id/weather`
  - Opis: Pobierz zcache’owane metryki pogody (miesięczne) dla planu.
  - Odpowiedź 200 (fragment):
    ```json
    {
      "data": [
        {
          "year": 2025,
          "month": 4,
          "sunlight": 78,
          "humidity": 55,
          "precip": 42,
          "last_refreshed_at": "iso-datetime"
        }
      ]
    }
    ```
  - Błędy: 401, 403, 404

- POST `/api/plans/:plan_id/weather/refresh`
  - Opis: Odśwież cache pogody (wywołanie serwerowe). Wymaga nagłówka wewnętrznego z kluczem serwisowym i wykonywane jest z rolą `service_role` (poza RLS klienta).
  - Body (JSON):
    ```json
    { "force": false }
    ```
  - Odpowiedź 202 (akceptacja i rozpoczęcie odświeżania) lub 200 (odświeżono synchronizacyjnie; MVP może zrobić sync):
    ```json
    { "data": { "refreshed": true, "months": 12 } }
    ```
  - Błędy: 401, 403, 404, 429 (rate limit per plan), 502/504 (upstream error/timeout)

### 2.6 AI: wyszukiwanie i ocena dopasowania

- POST `/api/ai/plants/search`
  - Opis: Wyszukiwanie roślin po nazwie (LLM/źródła zewn.).
  - Body (JSON):
    ```json
    { "query": "tomato" }
    ```
  - Odpowiedź 200 (fragment):
    ```json
    {
      "data": {
        "candidates": [
          { "name": "tomato", "latin_name": "Solanum lycopersicum", "source": "ai" }
        ]
      }
    }
    ```
  - Błędy: 400, 401, 403, 429 (rate limit), 504 UpstreamTimeout (timeout 10 s)

- POST `/api/ai/plants/fit`
  - Opis: Ocena dopasowania rośliny do planu/pozycji z wykorzystaniem cache pogody. Walidacja i sanity-check JSON odpowiedzi.
  - Body (JSON):
    ```json
    {
      "plan_id": "uuid",
      "x": 3,
      "y": 7,
      "plant_name": "tomato"
    }
    ```
  - Odpowiedź 200:
    ```json
    {
      "data": {
        "sunlight_score": 4,
        "humidity_score": 3,
        "precip_score": 5,
        "overall_score": 4,
        "explanation": "string (opcjonalnie)"
      }
    }
    ```
  - Błędy: 400, 401, 403, 404 (plan/komórka), 422 (poza granicami), 429, 504 (timeout 10 s)

### 2.7 Zdarzenia analityczne (AnalyticsEvents)

- POST `/api/analytics/events`
  - Opis: Zapisz jedno z minimalnych zdarzeń MVP: `plan_created`, `grid_saved`, `area_typed`, `plant_confirmed`.
  - Body (JSON):
    ```json
    {
      "event_type": "plan_created",
      "plan_id": "uuid|null",
      "attributes": { "any": "json" }
    }
    ```
  - Odpowiedź 201:
    ```json
    {
      "data": {
        "id": "uuid",
        "user_id": "uuid",
        "plan_id": "uuid|null",
        "event_type": "plan_created",
        "attributes": { "any": "json" },
        "created_at": "iso-datetime"
      }
    }
    ```
  - Błędy: 400, 401, 403, 422

- GET `/api/analytics/events?plan_id=&limit=&cursor=`
  - Opis: (opcjonalne w MVP) Lista zdarzeń użytkownika, filtrowalna po `plan_id`.
  - Odpowiedź 200: lista zdarzeń z paginacją.
  - Błędy: 401, 403


## 3. Uwierzytelnianie i autoryzacja

- Mechanizm: Supabase Auth (e‑mail/hasło w MVP). API przyjmuje token JWT w `Authorization: Bearer` (lub sesję w cookie). Po stronie serwera wykorzystywany jest klient Supabase z kontekstem użytkownika.
- Model dostępu: RLS (owner‑only) dla wszystkich tabel domenowych:
  - `profiles`: dostęp wyłącznie do własnego profilu.
  - `plans`, `grid_cells`, `plant_placements`, `weather_monthly`: dostęp tylko do zasobów należących do bieżącego `auth.uid()` (via relacja do planu).
  - `analytics_events`: użytkownik widzi i tworzy tylko własne zdarzenia.
- Operacje uprzywilejowane:
  - Odświeżanie pogody (`/weather/refresh`) wymaga roli `service_role` (sekret serwerowy przekazywany wyłącznie z backendu) i dodatkowego nagłówka np. `X-Internal-Key`.
- Strefa zaufania:
  - Endpointy AI i pogody działają tylko z serwera (SSR/route handler) i nigdy z przeglądarki bezpośrednio do dostawców.


## 4. Walidacja i logika biznesowa

Walidacja (poza constraintami DB) implementowana Zodem po stronie API. Kluczowe reguły, które muszą być egzekwowane w API (i/lub wynikają z DB/triggerów):

- Profile:
  - `language_code` – poprawny kod języka.
  - `theme` – `light|dark`.

- Plany (`plans`):
  - `name` wymagane, niepuste.
  - `width_cm`, `height_cm` > 0; `cell_size_cm` ∈ {10,25,50,100}.
  - `width_cm % cell_size_cm == 0`, `height_cm % cell_size_cm == 0`.
  - `grid_width`, `grid_height` 1..200 (CHECK).
  - `orientation` 0..359.
  - Unikalność `(user_id, name)` — zwracaj 409 Conflict przy kolizji.
  - Zmiany wpływające na siatkę: jeśli brak `confirmRegenerate=true`, zwróć 409 z wymaganiem potwierdzenia (UI wyświetla ostrzeżenie o usunięciu roślin).

- Komórki (`grid_cells`):
  - `x,y` w granicach [0..grid_width-1], [0..grid_height-1] — triggery `validate_cell_bounds` wymuszą 422 z komunikatem.
  - `type` ∈ ENUM (`soil|path|water|building|blocked`).
  - Zmiana typu ≠ `soil` usuwa rośliny w tych komórkach (trigger `purge_plant_on_cell_type_change`). Operacje obszarowe wymagają parametru potwierdzającego, gdy istnieją rośliny.

- Nasadzenia (`plant_placements`):
  - Dozwolone tylko w komórkach `soil` (trigger `ensure_plant_on_soil`); w innym przypadku 422.
  - Skale ocen: `sunlight_score|humidity_score|precip_score|overall_score` ∈ [1..5] (opcjonalne przy pierwszym zapisie).
  - Klucz główny `(plan_id, x, y)` – jedna roślina na komórkę.

- Pogoda (`weather_monthly`):
  - `year` 1900..2100; `month` 1..12; metryki 0..100.
  - Aktualizacja/usuwanie dozwolone tylko rolą serwisową; z poziomu użytkownika tylko Odczyt/Insert (cache).

- Analityka (`analytics_events`):
  - `event_type` ∈ {`plan_created`,`grid_saved`,`area_typed`,`plant_confirmed`} (MVP).
  - `attributes` dowolny `jsonb` (rozsądny rozmiar; można limitować do np. 8KB).

Logika biznesowa ponad CRUD (odwzorowana w endpointach):
- Edycja obszaru siatki z potwierdzeniem możliwej utraty roślin (`/grid/area-type`).
- Wstawienie rośliny wyłącznie na `soil` (wymuszane triggerem; API zwraca 422).
- Cache pogody per plan z odświeżaniem kontrolowanym i rate limit.
- AI: twardy schemat JSON, sanity-check, timeout 10 s, mapowanie metryk do ocen 1–5 z wagami sezonów (IV–IX waga 2; półkula wg planu, z możliwością ręcznej korekty).

Bezpieczeństwo i wydajność:
- Rate limiting (zalecenia na poziomie API gateway/adaptera):
  - AI: np. 10/min/user na `/api/ai/*`
  - Weather refresh: np. 2/h/plan na `/weather/refresh`
  - Analityka: 60/min/user na `/api/analytics/events`
- Idempotencja:
  - Operacje obszarowe i stany siatki — rozważyć `idempotency-key` w nagłówku (opcjonalnie w MVP).
- Transakcyjność:
  - Aktualizacje obszarowe gridu wykonywać w jednej transakcji (jeśli używamy RPC/bulk); MVP może iterować batchem z kompensacją błędów.
- Indeksy:
  - Projekt list/filtrów dopasowany do indeksów wymienionych wyżej (np. listowanie planów po `user_id, updated_at desc`).
- Rejestrowanie błędów:
  - Nie ujawniać komunikatów SQL do klienta; mapować na spójne kody i komunikaty.

Implementacja (Astro/TypeScript, zgodnie ze stackiem):
- Lokalizacja endpointów: `src/pages/api/**` (route handlers).
- Klient DB/Auth: `src/db/supabase.client.ts` — tworzenie klienta z tokenem użytkownika (SSR) lub z rolą serwisową (tylko dla wewnętrznych akcji).
- Walidacja: Zod schematy dla body/query i serializacji odpowiedzi.
- Obsługa błędów: wczesne zwroty, spójny kształt błędu.
- i18n: komunikaty błędów po polsku (MVP min. PL); kody błędów stałe po angielsku.


