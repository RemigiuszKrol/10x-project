# API Endpoint Implementation Plan: GET /api/plans/:plan_id/plants

## 1. Przegląd punktu końcowego

- Cel: Zwrócić stronicowaną listę nasadzeń (`plant_placements`) należących do określonego planu i użytkownika, z opcjonalnym filtrem prefiksowym po nazwie rośliny.
- Zakres: Odczyt danych wyłącznie właściciela planu (RLS owner-only); brak zmian w bazie.
- Kontekst: Endpoint działa w Astro 5 (pages API), z autoryzacją Supabase JWT i standardową strukturą odpowiedzi API.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/plans/:plan_id/plants`
- Parametry:
  - Wymagane: `plan_id` (UUID) w ścieżce.
  - Opcjonalne: `name` (string, prefiks/ILIKE, długość 1–100), `limit` (number, 1–100, domyślna wartość 25), `cursor` (opaque string Base64 reprezentujący ostatnią pozycję).
- Request Body: brak.
- Walidacja:
  - Utworzyć `PlantPlacementsPathSchema` (`z.object({ plan_id: z.string().uuid() })`).
  - Utworzyć `PlantPlacementsQuerySchema` (`limit` z wartości domyślnej, `name` trymerowane, `cursor` walidowane jako Base64 i dekodowane do struktury `{ plant_name: string; x: number; y: number }`).
  - Walidować `supabase` i `user.id` (UUID) w handlerze; błędy mapować na 400/401.

## 3. Szczegóły odpowiedzi

- Typ danych: `ApiListResponse<PlantPlacementDto>` z `pagination.next_cursor` (string | null).
- Zawartość elementu listy: pola `x`, `y`, `plant_name`, `sunlight_score`, `humidity_score`, `precip_score`, `overall_score`, `created_at`, `updated_at`.
- Kody statusu:
  - 200 — sukces (lista może być pusta).
  - 400 — `ValidationError` (niepoprawny UUID/limit/cursor/name).
  - 401 — `Unauthorized` (brak sesji Supabase).
  - 403 — `Forbidden` (naruszenie RLS/plan nie należy do użytkownika).
  - 404 — `NotFound` (plan nie istnieje lub niedostępny).
  - 500 — `InternalError` (nieoczekiwany błąd serwera).

## 4. Przepływ danych

- Handler:
  - Pobiera `supabase` z `ctx.locals`; brak → 401.
  - `supabase.auth.getUser()` → brak `user` → 401; walidacja `user.id` przez Zod.
  - Waliduje `ctx.params` i `ctx.request.url` przy użyciu nowych schematów; błędy → 400 z `field_errors`.
  - Dla pierwszej strony (brak `cursor`) weryfikuje istnienie planu: szybkie zapytanie `.from("plans").select("id").eq("id", planId).maybeSingle()`; brak rekordu → 404.
  - Wywołuje serwis `listPlantPlacements` z przekazaniem `limit`, `cursorPayload`, `name`.
- Service `listPlantPlacements`:
  - Buduje bazowe zapytanie `.from("plant_placements")` z `.select(...)` ograniczające kolumny.
  - Dodaje `.eq("plan_id", planId)` oraz `.order("plant_name", { ascending: true })`, `.order("x", { ascending: true })`, `.order("y", { ascending: true })`.
  - Filtr `name`: `.ilike("plant_name", \`\${escaped}%\`)`; escape znaków `%/\_`przez`replace`.
  - Obsługuje kursor klucza złożonego: po dekodowaniu ustawia warunek `or(...)` z trzema gałęziami (`plant_name >`, `plant_name == && x >`, `plant_name == && x == && y >`), wykorzystując helper do bezpiecznego tworzenia wyrażeń.
  - Stosuje limit `limit + 1` dla detekcji `next_cursor`.
  - Po wykonaniu zapytania:
    - Jeśli Supabase zwróci błąd `PGRST116` → 404.
    - Jeżeli wyników > `limit`, ostatni element służy do wygenerowania kursora (Base64 JSON); usuwa się go z listy.
  - Zwraca `{ items, nextCursor }`.
- Handler mapuje wynik na `jsonResponse({ data: items, pagination: { next_cursor } }, 200)`.

## 5. Względy bezpieczeństwa

- Autoryzacja: wymagany nagłówek/cookie z Supabase JWT; brak → 401.
- Autoryzacja właścicielska: RLS + jawne `.eq("user_id", user.id)` przy sprawdzaniu planu (redundancja i szybsza walidacja).
- Walidacja wejścia eliminuje wstrzyknięcia (`uuid`, `limit`, sanitizacja `name`, jawne dodanie `%`).
- Kursory podpisane (Base64 + JSON) i walidowane; błędne kursory → 400, bez ujawniania szczegółów.
- Odpowiedzi błędów dostosowane do `errorResponse`, bez logiki, która mogłaby ujawnić strukturę bazy.

## 6. Obsługa błędów

- 400 `ValidationError`: Zod `safeParse` dla ścieżki, zapytania, kursora, filtrów; `details.field_errors` z mapowaniem nazwy parametru.
- 401 `Unauthorized`: brak klienta Supabase lub sesji.
- 403 `Forbidden`: Supabase zwróci błąd uprawnień (`error.code === "42501"` lub `error.message` z RLS); mapowanie na `Forbidden`.
- 404 `NotFound`: brak planu (zapytanie do `plans` zwraca `null`/`PGRST116`) lub Supabase błąd `PGRST116` podczas pobierania; postępujemy zgodnie ze standardowym komunikatem „Plan not found”.
- 500 `InternalError`: inne błędy (parse kursora, błędy Supabase nie zmapowane). Logowanie `console.error("[GET /plants] ...", error)`; brak dedykowanej tabeli błędów.
- Puste listy przy sukcesie nie są błędem (next_cursor = null).

## 7. Wydajność

- Wykorzystanie indeksu `(plan_id, plant_name)` poprzez sortowanie i filtr prefiksowy; dodatkowe porządki `x`, `y` korzystają z klucza głównego (`plan_id, x, y`).
- Limit ≤ 100 minimalizuje zużycie zasobów; pobieramy `limit + 1` rekordów tylko na potrzeby kursora.
- Prefiksowy filtr po `plant_name` wspiera `ILIKE 'term%'` korzystając z indeksu po literach (Warto rozważyć w przyszłości indeks GIN/Trigram, ale nie wymagany na tym etapie).
- Weryfikacja planu wykonuje pojedyncze zapytanie (`maybeSingle`) tylko przy pierwszej stronie; kolejne strony bazują na kursorze i nie wymagają dodatkowego hitu.

## 8. Kroki implementacji

1. Dodaj moduł `src/lib/validation/plant-placements.ts` z `PlantPlacementsPathSchema`, `PlantPlacementsQuerySchema`, helperami `PlantPlacementsPathParams`, `PlantPlacementsQuery`.
2. Utwórz helper `src/lib/pagination/cursor.ts` (lub rozszerz istniejący, jeśli powstanie wcześniej) z funkcjami `encodeCursor(payload)` / `decodeCursor(payload)` używając Base64 i bezpiecznego JSON parse (rzuca `ValidationError` przy niepowodzeniu).
3. Stwórz serwis `src/lib/services/plant-placements.service.ts` implementujący `listPlantPlacements`, korzystając z SupabaseClient z kontekstu oraz nowej logiki kursora i filtrów.
4. Dodaj eksporty typów/serwisu w miejscach centralnych (np. `index.ts` jeśli istnieje) — upewnij się, że re-exporty są spójne z resztą kodu.
5. Utwórz endpoint `src/pages/api/plans/[planId]/plants.ts`: `export const prerender = false`, handler `GET`, wykorzystanie walidacji, autoryzacji, wywołanie serwisu, mapowanie błędów przy pomocy `errorResponse`/`jsonResponse`.
6. Zaimplementuj generowanie i walidację kursorów w handlerze/serwisie (limit+1, next cursor, obsługa `cursor` w zapytaniu Supabase).
7. Dodaj testy manualne (lub automatyczne, jeśli istnieje framework) do `.ai/testing/plans-manual-tests.md`: przypadki sukcesu, filtr `name`, paginacja, błędny kursor, brak planu, plan innego użytkownika, limit > 100.
8. Uruchom lint/testy (`pnpm lint`, ew. `pnpm test`) i przygotuj PR z opisem zmian.
