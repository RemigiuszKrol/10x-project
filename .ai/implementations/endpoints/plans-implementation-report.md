# Raport implementacji: Endpointy Plans API

## Przegląd

Ten dokument zawiera raport z implementacji endpointów API dla zarządzania planami działek w aplikacji PlantsPlanner.

## Zaimplementowane endpointy

### 1. POST /api/plans

**Status:** ✅ Zaimplementowany

**Ścieżka:** `src/pages/api/plans/index.ts`

**Funkcjonalność:**

- Tworzenie nowego planu działki dla zalogowanego użytkownika
- Automatyczne obliczanie wymiarów siatki (grid_width, grid_height) na podstawie wymiarów fizycznych i rozmiaru komórki
- Walidacja wszystkich parametrów wejściowych
- Obsługa konfliktów nazw (unique constraint na parze user_id, name)

**Powiązane pliki:**

- Handler: `src/pages/api/plans/index.ts`
- Walidacja: `src/lib/validation/plans.ts` (PlanCreateSchema)
- Serwis: `src/lib/services/plans.service.ts` (createPlan)
- Typy: `src/types.ts` (PlanDto, PlanCreateCommand)

**Testy:** Zobacz sekcję "Testy manualne: POST /api/plans" w `.ai/testing/plans-manual-tests.md`

---

### 2. PATCH /api/plans/:plan_id

**Status:** ✅ Zaimplementowany

**Ścieżka:** `src/pages/api/plans/[plan_id].ts`

**Funkcjonalność:**

- Częściowa aktualizacja istniejącego planu działki
- Aktualizacja metadanych (nazwa, lokalizacja, orientacja, półkula)
- Aktualizacja wymiarów fizycznych z automatycznym przeliczeniem siatki
- Mechanizm potwierdzenia dla zmian wpływających na wymiary siatki (confirm_regenerate)
- Wykrywanie i blokowanie nieświadomych zmian wymiarów siatki (które kasują komórki/rośliny)

**Query parametry:**

- `confirm_regenerate` (boolean, domyślnie false) - wymagane do potwierdzenia zmian wymiarów siatki

**Mechanizm bezpieczeństwa:**

- Zmiana width_cm, height_cm lub cell_size_cm może zmienić wymiary siatki (grid_width, grid_height)
- Gdy wymiary siatki ulegają zmianie, użytkownik musi przekazać `confirm_regenerate=true`
- Bez potwierdzenia endpoint zwraca błąd 409 Conflict z wyjaśnieniem
- Chroni przed przypadkową utratą danych (komórek siatki i nasadzeń roślin)

**Powiązane pliki:**

- Handler: `src/pages/api/plans/[plan_id].ts`
- Walidacja: `src/lib/validation/plans.ts` (PlanUpdateSchema, PlanUpdateQuerySchema)
- Serwis: `src/lib/services/plans.service.ts` (updatePlan)
- Błędy: `src/lib/http/errors.ts` (GridChangeRequiresConfirmationError)
- Typy: `src/types.ts` (PlanDto, PlanUpdateCommand, PlanUpdateQuery)

**Testy:** Zobacz sekcję "Testy manualne: PATCH /api/plans/:plan_id" w `.ai/testing/plans-manual-tests.md`

---

### 3. DELETE /api/plans/:plan_id

**Status:** ✅ Zaimplementowany

**Ścieżka:** `src/pages/api/plans/[plan_id].ts`

**Funkcjonalność:**

- Usuwanie istniejącego planu działki wraz z powiązanymi danymi
- Automatyczne kaskadowe usunięcie komórek siatki (grid_cells) i nasadzeń (plant_placements)
- Weryfikacja własności planu przed usunięciem
- Zwracanie 204 No Content przy sukcesie
- Operacja nieodwracalna i destrukcyjna

**Mechanizm bezpieczeństwa:**

- Weryfikacja uwierzytelnienia użytkownika (sesja Supabase)
- Filtrowanie po `user_id` - użytkownik może usunąć tylko własne plany
- Zwracanie 404 dla planów innych użytkowników (bez ujawniania istnienia)
- Walidacja UUID dla plan_id

**Powiązane pliki:**

- Handler: `src/pages/api/plans/[plan_id].ts` (handler DELETE)
- Walidacja: `src/lib/validation/plans.ts` (PlanIdParamSchema)
- Serwis: `src/lib/services/plans.service.ts` (deletePlan)
- Typy: `src/types.ts` (PlanDto - referencja, nie zwracany w 204)

**Testy:** Zobacz sekcję "Testy manualne: DELETE /api/plans/:plan_id" w `.ai/testing/plans-manual-tests.md`

---

### 4. GET /api/plans

**Status:** ✅ Zaimplementowany

**Ścieżka:** `src/pages/api/plans/index.ts`

**Funkcjonalność:**

- Pobieranie paginowanej listy planów działki należących do zalogowanego użytkownika
- Cursor-based pagination (keyset pagination) dla wydajności i stabilności
- Sortowanie po `updated_at` i `id` (stabilne sortowanie)
- Obsługa kierunku sortowania (asc/desc, domyślnie desc)
- Konfigurowalny limit wyników (1-100, domyślnie 20)

**Query parametry:**

- `limit` (number, opcjonalny): liczba wyników na stronę (1-100, domyślnie 20)
- `cursor` (string, opcjonalny): Base64-encoded cursor dla następnej strony
- `sort` (string, opcjonalny): pole sortowania (tylko `updated_at` jest wspierane)
- `order` (string, opcjonalny): kierunek sortowania (`asc` lub `desc`, domyślnie `desc`)

**Mechanizm paginacji:**

- Keyset pagination używając pary (`updated_at`, `id`) jako klucza cursora
- Cursor jest kodowany w Base64 i zawiera JSON: `{"updated_at": "2025-01-15T10:00:00Z", "id": "uuid"}`
- Pobieranie `limit + 1` rekordów do wykrycia czy są kolejne strony
- Zwracanie `next_cursor` w odpowiedzi jeśli są kolejne strony, `null` jeśli to ostatnia strona
- Stabilne sortowanie zapewnia brak duplikatów i pominiętych rekordów między stronami

**Mechanizm bezpieczeństwa:**

- Weryfikacja uwierzytelnienia użytkownika (sesja Supabase)
- Filtrowanie po `user_id` - użytkownik widzi tylko własne plany
- RLS (Row Level Security) zapewnia dodatkową warstwę bezpieczeństwa
- Walidacja wszystkich query parametrów przez Zod
- Walidacja i dekodowanie cursora z obsługą błędów manipulacji

**Powiązane pliki:**

- Handler: `src/pages/api/plans/index.ts` (handler GET)
- Walidacja: `src/lib/validation/plans.ts` (PlanListQuerySchema, encodePlanCursor, decodePlanCursor)
- Serwis: `src/lib/services/plans.service.ts` (listPlans, PlanListQuery, PlanListResult)
- Typy: `src/types.ts` (ApiListResponse, PlanDto, Cursor)

**Testy:** Zobacz sekcję "Testy manualne: GET /api/plans" w `.ai/testing/plans-manual-tests.md`

---

### 5. GET /api/plans/:plan_id

**Status:** ✅ Zaimplementowany

**Ścieżka:** `src/pages/api/plans/[plan_id].ts`

**Funkcjonalność:**

- Pobieranie szczegółów pojedynczego planu działki należącego do zalogowanego użytkownika
- Zwracanie wszystkich metadanych planu (nazwa, wymiary, lokalizacja, orientacja, siatka)
- Weryfikacja własności planu - użytkownik może zobaczyć tylko własne plany
- Operacja tylko do odczytu, bez efektów ubocznych (idempotentna)

**Parametry ścieżki:**

- `plan_id` (UUID, wymagany): identyfikator planu do pobrania

**Odpowiedzi:**

- **200 OK**: Plan został znaleziony i zwrócony
  ```json
  {
    "data": {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Moja działka",
      "latitude": 52.2297,
      "longitude": 21.0122,
      "width_cm": 500,
      "height_cm": 400,
      "cell_size_cm": 25,
      "grid_width": 20,
      "grid_height": 16,
      "orientation": 180,
      "hemisphere": "northern",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  }
  ```
- **400 ValidationError**: Nieprawidłowy UUID w parametrze plan_id
- **401 Unauthorized**: Brak uwierzytelnienia
- **404 NotFound**: Plan nie istnieje lub nie należy do użytkownika
- **500 InternalError**: Nieoczekiwany błąd serwera

**Mechanizm bezpieczeństwa:**

- Weryfikacja uwierzytelnienia użytkownika (sesja Supabase)
- Filtrowanie po `user_id` - użytkownik widzi tylko własne plany
- RLS (Row Level Security) zapewnia dodatkową warstwę bezpieczeństwa
- Walidacja UUID zapobiega SQL injection
- Zwracanie 404 dla planów innych użytkowników (bez ujawniania istnienia planu)
- Brak efektów ubocznych - operacja GET jest bezpieczna i idempotentna

**Wydajność:**

- Zapytanie używa klucza głównego (indeks na `id`)
- Dodatkowy filtr po `user_id` korzysta z indeksu `(user_id, updated_at desc)`
- Oczekiwany czas odpowiedzi < 200ms dla pojedynczego rekordu
- Brak kosztownych operacji - zwracanie tylko wymaganych kolumn

**Powiązane pliki:**

- Handler: `src/pages/api/plans/[plan_id].ts` (handler GET)
- Walidacja: `src/lib/validation/plans.ts` (PlanIdParamSchema, PlanIdParams)
- Serwis: `src/lib/services/plans.service.ts` (getPlanById)
- Typy: `src/types.ts` (ApiItemResponse, PlanDto)
- Błędy: `src/lib/http/errors.ts` (errorResponse, jsonResponse)

**Decyzje projektowe:**

1. **404 zamiast 403**: Gdy użytkownik próbuje pobrać plan innego użytkownika, zwracamy 404 zamiast 403, aby nie ujawniać istnienia planu. To jest standard bezpieczeństwa "security through obscurity" - nie ujawniamy informacji o istnieniu zasobów, do których użytkownik nie ma dostępu.

2. **Użycie maybeSingle()**: W serwisie `getPlanById` używamy `.maybeSingle()` zamiast `.single()`, ponieważ oczekujemy przypadku gdy plan nie istnieje i chcemy zwrócić `null` zamiast rzucać wyjątek.

3. **Podwójna weryfikacja własności**: Pomimo RLS na poziomie bazy danych, jawnie filtrujemy po `user_id` w zapytaniu dla dodatkowej pewności i czytelności kodu.

4. **Walidacja user_id**: Sprawdzamy czy `user.id` z sesji Supabase jest prawidłowym UUID, co jest dodatkowym zabezpieczeniem przed nieoczekiwanymi danymi z systemu uwierzytelniania.

**Testy:** Zobacz sekcję "Testy manualne: GET /api/plans/:plan_id" w `.ai/testing/plans-manual-tests.md`

---

## Szczegóły implementacji

### Walidacja (src/lib/validation/plans.ts)

**PlanCreateSchema:**

- Wszystkie wymagane pola: name, width_cm, height_cm, cell_size_cm, orientation
- Opcjonalne: latitude, longitude, hemisphere
- Walidacja podzielności width_cm i height_cm przez cell_size_cm
- Walidacja zakresów wymiarów siatki (1-200)
- Strict mode - odrzuca nieznane pola

**PlanUpdateSchema:**

- Wszystkie pola opcjonalne
- Wymaga co najmniej jednego pola do aktualizacji
- Walidacja podzielności (jeśli podano width/height i cell_size razem)
- Walidacja zakresów siatki (jeśli podano wszystkie 3 wymiary razem)
- Obsługa nullable dla latitude, longitude, hemisphere
- Strict mode - odrzuca nieznane pola

**PlanUpdateQuerySchema:**

- Walidacja parametru confirm_regenerate z coercion boolean
- Domyślna wartość false

**PlanIdParamSchema:**

- Walidacja parametru ścieżki plan_id jako UUID
- Używany w GET, PATCH i DELETE
- Eksport typu PlanIdParams dla handlera

**PlanListQuerySchema:**

- Walidacja query parametrów dla GET /api/plans
- `limit`: coercion do number, zakres 1-100, domyślnie 20
- `cursor`: opcjonalny string, dekodowany i walidowany w transformacji
- `sort`: enum z jedną wartością `updated_at`
- `order`: enum `asc` lub `desc`
- Transformacja do obiektu z `limit`, `cursorKey`, `isAscending`
- Dekodowanie cursora z obsługą błędów (rzuca ZodError jeśli nieprawidłowy)

**Funkcje pomocnicze paginacji:**

- `encodePlanCursor(key)`: koduje `{updated_at, id}` do Base64 string
- `decodePlanCursor(cursor)`: dekoduje Base64 string i waliduje strukturę, zwraca `PlanCursorKey | null`

### Serwisy (src/lib/services/plans.service.ts)

**getPlanById():**

- Pobiera pojedynczy plan z weryfikacją właściciela (user_id)
- Parametry: `supabase`, `userId`, `planId`
- Zwraca: `PlanDto | null`
- Filtruje po `id` i `user_id` (`.eq("id", planId).eq("user_id", userId)`)
- Używa `.maybeSingle()` - zwraca null jeśli plan nie istnieje
- Zwraca null również gdy plan należy do innego użytkownika (dla zachowania prywatności)
- Propaguje błędy bazy danych (RLS, błędy sieci)

**createPlan():**

- Oblicza grid_width i grid_height
- Wykonuje INSERT z pełnymi danymi
- Zwraca utworzony plan jako PlanDto
- Propaguje błędy bazy danych (unikatowość, RLS)

**updatePlan():**

- Pobiera aktualny plan z weryfikacją właściciela (user_id)
- Merguje nowe wartości z aktualnymi
- Oblicza nowe wymiary siatki
- Wykrywa zmiany wymiarów siatki
- Rzuca GridChangeRequiresConfirmationError jeśli zmiana bez potwierdzenia
- Waliduje zakresy siatki (1-200)
- Wykonuje UPDATE tylko zmienionych pól
- Zwraca null jeśli plan nie istnieje

**UpdatePlanOptions:**

- Interface z opcją confirmRegenerate (boolean)

**deletePlan():**

- Wykonuje DELETE z weryfikacją właściciela (user_id)
- Zwraca boolean: true jeśli plan został usunięty, false jeśli nie istniał/nie należał do użytkownika
- Kaskadowe usunięcie grid_cells i plant_placements obsługuje baza danych (ON DELETE CASCADE)
- Propaguje błędy bazy danych (RLS, błędy sieci)

**listPlans():**

- Pobiera paginowaną listę planów użytkownika
- Parametry: `supabase`, `userId`, `query: PlanListQuery`
- Zwraca: `PlanListResult` z polami `items` i `nextCursor`
- Filtruje po `user_id` (`.eq("user_id", userId)`)
- Sortowanie stabilne: `.order("updated_at", { ascending })` + `.order("id", { ascending })`
- Keyset pagination: używa `.or()` do filtrowania po cursorze
  - DESC: `updated_at < cursor_updated_at OR (updated_at = cursor_updated_at AND id < cursor_id)`
  - ASC: `updated_at > cursor_updated_at OR (updated_at = cursor_updated_at AND id > cursor_id)`
- Pobiera `limit + 1` rekordów do wykrycia czy są kolejne strony
- Generuje `nextCursor` z ostatniego elementu (po odcięciu nadmiarowego rekordu)
- Zwraca pustą listę jeśli brak danych
- Propaguje błędy bazy danych (RLS, błędy sieci)

### Obsługa błędów (src/lib/http/errors.ts)

**GridChangeRequiresConfirmationError:**

- Niestandardowa klasa błędu dla wymuszenia potwierdzenia
- Rozszerzenie Error
- Mapowana na 409 Conflict w handlerze

**Mapowanie błędów w handlerach:**

- 400 ValidationError: nieprawidłowe dane wejściowe, JSON, zakresy
- 401 Unauthorized: brak sesji
- 403 Forbidden: naruszenie RLS
- 404 NotFound: plan nie istnieje (zwracany jako null z serwisu)
- 409 Conflict:
  - GridChangeRequiresConfirmationError (zmiana siatki bez potwierdzenia)
  - code: "23505" (konflikt nazwy)
- 500 InternalError: nieobsłużone błędy

### Routing Astro

Struktura plików:

```
src/pages/api/plans/
├── index.ts          → POST /api/plans
                      → GET /api/plans
└── [plan_id].ts      → PATCH /api/plans/:plan_id
                      → DELETE /api/plans/:plan_id
```

Astro używa file-based routing:

- `index.ts` obsługuje `/api/plans` (bez parametru):
  - Handler POST - tworzenie nowego planu
  - Handler GET - pobieranie listy planów z paginacją
- `[plan_id].ts` obsługuje `/api/plans/:plan_id` (z dynamicznym parametrem):
  - Handler PATCH - aktualizacja planu
  - Handler DELETE - usuwanie planu

Parametr `plan_id` jest dostępny w `ctx.params.plan_id`.
Query parametry są dostępne w `ctx.url.searchParams`.

### Typy (src/types.ts)

**Wykorzystywane typy:**

- `PlanDto` - reprezentacja planu zwracana przez API
- `PlanCreateCommand` - dane wejściowe dla POST
- `PlanUpdateCommand` - dane wejściowe dla PATCH (wszystkie pola opcjonalne)
- `PlanUpdateQuery` - query parametry dla PATCH
- `ApiItemResponse<PlanDto>` - struktura odpowiedzi sukcesu dla pojedynczego elementu (POST, PATCH)
- `ApiListResponse<PlanDto>` - struktura odpowiedzi sukcesu dla listy z paginacją (GET)
- `ApiErrorResponse` - struktura odpowiedzi błędu
- `Cursor` - alias dla string (Base64 encoded cursor)

---

## Bezpieczeństwo

### Uwierzytelnienie

- Wszystkie endpointy wymagają aktywnej sesji Supabase
- Weryfikacja poprzez `supabase.auth.getUser()`
- Odrzucenie zapytań bez sesji (401)

### Autoryzacja

- RLS (Row Level Security) na tabeli `plans`
- Filtry w serwisach: `.eq("user_id", userId)`
- Użytkownik może manipulować tylko swoimi planami
- Plany innych użytkowników zwracają 404 (nie ujawniamy istnienia)

### Walidacja

- Wszystkie parametry walidowane przez Zod
- Strict mode - odrzucenie nieznanych pól
- Walidacja UUID dla plan_id
- Walidacja zakresów dla wszystkich numerycznych pól
- Trim dla stringów

### Ochrona przed utratą danych

- Mechanizm confirm_regenerate dla zmian wymiarów siatki
- Jasne komunikaty błędów wyjaśniające konsekwencje
- Wymuszenie świadomej decyzji użytkownika

---

## Testowanie

### Testy manualne

Pełna dokumentacja testów znajduje się w `.ai/testing/plans-manual-tests.md`.

**POST /api/plans:**

- 17 przypadków testowych
- Pokrycie: sukces, walidacja, uwierzytelnienie, konflikty, edge cases

**PATCH /api/plans/:plan_id:**

- 30 przypadków testowych
- Pokrycie: sukces, walidacja, uwierzytelnienie, autoryzacja, konflikty, mechanizm potwierdzenia, edge cases

**DELETE /api/plans/:plan_id:**

- 9 przypadków testowych
- Pokrycie: sukces, walidacja, uwierzytelnienie, autoryzacja, kaskadowe usuwanie, edge cases

**GET /api/plans:**

- 18 przypadków testowych
- Pokrycie: sukces (różne scenariusze paginacji), walidacja query parametrów, uwierzytelnienie, autoryzacja, izolacja użytkowników, wydajność, stabilność sortowania

### Weryfikacja w bazie danych

Po każdym teście zaleca się weryfikację:

- Poprawność zapisanych danych
- Obliczone wymiary siatki
- Znaczniki czasowe (created_at, updated_at)
- Działanie constraintów

---

## Znane ograniczenia i uwagi

### Walidacja częściowa w PATCH

- PlanUpdateSchema waliduje zakresy siatki tylko gdy wszystkie 3 wartości (width_cm, height_cm, cell_size_cm) są podane razem
- Walidacja z częściowymi danymi jest wykonywana w serwisie updatePlan()
- Serwis merguje nowe wartości z aktualnymi i dopiero wtedy sprawdza zakresy
- Błędy z serwisu są mapowane na 400 ValidationError

### Kasowanie komórek i roślin

- **Dla DELETE:** Kaskadowe usuwanie (ON DELETE CASCADE) działa dla grid_cells i plant_placements
- **Dla PATCH z regeneracją siatki:** Aktualnie nie zaimplementowano automatycznego kasowania komórek i roślin przy zmianie wymiarów siatki
- Może to wymagać:
  - Triggerów w bazie danych
  - Rozszerzenia logiki w serwisie updatePlan
- Do rozważenia w przyszłości

### Polityka nazw

- Ograniczenie unikatowości (user_id, name) na poziomie bazy
- Użytkownik może mieć wiele planów, ale wszystkie muszą mieć unikalne nazwy
- Nie ma limitu długości nazwy (do ustalenia)
- Trim jest aplikowany automatycznie

### Wydajność paginacji GET

- Keyset pagination jest wydajniejsza niż offset-based dla dużych zbiorów danych
- Wymaga indeksu na (user_id, updated_at, id) dla optymalnej wydajności
- Sortowanie po updated_at DESC może powodować częste zmiany kolejności przy aktywnym edytowaniu
- Rozważ dodanie parametru `sort=created_at` jeśli potrzebna jest stabilniejsza kolejność
- Maksymalny limit 100 chroni przed nadużyciami i zapewnia rozsądną wydajność

---

## Rekomendacje na przyszłość

1. **Testy automatyczne:**
   - Unit testy dla serwisów
   - Integration testy dla endpointów
   - Testy E2E z prawdziwą bazą danych

2. **Logowanie:**
   - Structured logging dla ważnych operacji
   - Audit log dla zmian w planach
   - Metryki wydajności

3. **Rate limiting:**
   - Ograniczenie liczby żądań na użytkownika
   - Ochrona przed nadużyciami

4. **Optymalizacja:**
   - Cache dla często odczytywanych planów
   - Batching dla operacji zbiorczych

5. **Rozszerzenia:**
   - GET /api/plans/:plan_id - odczyt pojedynczego planu
   - Soft delete zamiast hard delete (z możliwością przywrócenia)
   - Filtrowanie listy planów (po nazwie, dacie utworzenia, itp.)
   - Sortowanie po innych polach (created_at, name)

6. **Dokumentacja API:**
   - OpenAPI/Swagger specification
   - Przykłady w dokumentacji użytkownika
   - Changelog zmian w API

---

## Historia zmian

### 2025-11-15 (Wdrożenie 3)

- ✅ Zaimplementowano GET /api/plans
- ✅ Dodano serwis listPlans w plans.service.ts z keyset pagination
- ✅ Dodano schemat walidacji PlanListQuerySchema
- ✅ Dodano funkcje pomocnicze encodePlanCursor i decodePlanCursor
- ✅ Dodano typy PlanCursorKey, PlanListQuery, PlanListResult
- ✅ Utworzono 18 testów manualnych dla GET
- ✅ Zaktualizowano dokumentację implementacji

### 2025-11-15 (Wdrożenie 2)

- ✅ Zaimplementowano DELETE /api/plans/:plan_id
- ✅ Dodano serwis deletePlan w plans.service.ts
- ✅ Dodano schemat walidacji PlanIdParamSchema
- ✅ Naprawiono błąd typu w PlanUpdateSchema (usunięto .nullable() dla zgodności z PlanUpdateCommand)
- ✅ Utworzono 9 testów manualnych dla DELETE
- ✅ Zaktualizowano dokumentację implementacji

### 2025-11-15 (Wdrożenie 1)

- ✅ Zaimplementowano POST /api/plans
- ✅ Zaimplementowano PATCH /api/plans/:plan_id
- ✅ Dodano walidację Zod dla obu endpointów
- ✅ Dodano serwisy createPlan i updatePlan
- ✅ Dodano mechanizm potwierdzenia zmian siatki
- ✅ Dodano obsługę błędów GridChangeRequiresConfirmationError
- ✅ Utworzono 47 testów manualnych (17 POST + 30 PATCH)
- ✅ Dokumentacja implementacji
