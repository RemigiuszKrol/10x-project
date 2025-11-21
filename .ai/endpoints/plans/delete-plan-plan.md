# Plan wdrożenia endpointu API: DELETE `/api/plans/:plan_id`

## 1. Przegląd punktu końcowego

Endpoint usuwa plan działki oraz powiązane komórki siatki i nasadzenia. Operacja jest dostępna tylko dla właściciela planu i wymaga poprawnej sesji Supabase (JWT/cookie). Sukces kończy się kodem 204 bez treści.

## 2. Szczegóły żądania

- **Metoda HTTP:** DELETE
- **Struktura URL:** `/api/plans/:plan_id`
- **Parametry:**
  - **Wymagane:** `plan_id` (UUID) – identyfikator planu w ścieżce.
  - **Opcjonalne:** brak parametrów zapytania ani ciała żądania.
- **Nagłówki:** `Authorization: Bearer <jwt>` lub sesyjny cookie Supabase.
- **Body:** brak.

## 3. Szczegóły odpowiedzi

- **Typy i modele:**
  - `plan_id` – walidacja `z.string().uuid()` w schemacie ścieżki.
  - `ApiErrorResponse` – wspólny kształt błędów w projekcie.
  - Opcjonalny model serwisowy `PlanDeleteCommand = { planId: string; userId: string; }` (jeśli wymagane dla spójności warstwy usług).
  - `PlanDto` – referencja dla logowania lub testów, nie zwracamy go w odpowiedzi 204.

- **204 No Content** – plan usunięty.
- **Format błędu:** JSON zgodny ze schematem `ApiErrorResponse`.
- **Kody błędów:**
  - 400 – niepoprawne dane wejściowe (np. `plan_id` nie jest UUID).
  - 401 – brak uwierzytelnienia.
  - 403 – użytkownik nie jest właścicielem planu (RLS/explicit check).
  - 404 – plan nie istnieje (dla danego właściciela).
  - 500 – nieoczekiwany błąd Supabase lub wewnętrzny.

## 4. Przepływ danych

1. Middleware Astro uwierzytelnia użytkownika i umieszcza klienta Supabase w `locals`.
2. Handler API parsuje `plan_id`, waliduje przez Zod.
3. Pobiera identyfikator użytkownika z sesji (`locals.session.user.id`).
4. Wywołuje usługę `deletePlan(supabase, userId, planId)`.
5. Service wykonuje:
   - Opcjonalne sprawdzenie istnienia planu przed usunięciem (`select` wraz z `eq("user_id", userId)`).
   - `delete` na tabeli `plans` z filtrami `id` i `user_id`.
   - Polega na kaskadzie bazy do usunięcia `grid_cells` i `plant_placements`.
6. Zwraca kontrolę do handlera, który odpowiada kodem 204.
7. W przypadku błędu service rzuca wyjątek mapowany do odpowiedniego kodu i `ApiErrorResponse`.

## 5. Względy bezpieczeństwa

- Użycie `locals.supabase` zapewnia RLS i kontekst użytkownika.
- Weryfikacja poprawności UUID zapobiega atakom typu injection.
- Brak ujawniania informacji o istnieniu planu innych użytkowników: zwracamy 404 lub 403 w zależności od polityki (preferowane 404 dla nieistniejącego, 403 dla złamanej RLS).
- Logowanie zdarzeń błędu bez ujawniania danych wrażliwych.
- Obsługa sesji poprzez Supabase (cookies/JWT) – brak implementacji własnego mechanizmu auth.

## 6. Obsługa błędów

- Walidacja Zod zwraca 400 wraz z `details.field_errors.plan_id`.
- Brak sesji lub `user.id` → 401 z komunikatem `Unauthorized`.
- RLS lub brak rekordu → mapowanie Supabase error code `PGRST116`/`406` na 403/404.
- Nieoczekiwany błąd (np. błąd sieci Supabase) → log + 500 `InternalError`.
- Logowanie: użyć `console.error` lub wspólnego loggera Astro; brak dedykowanej tabeli błędów.

## 7. Rozważania dotyczące wydajności

- Operacja dotyczy pojedynczego rekordu, używa indeksu `(user_id, updated_at)` oraz PK, więc jest tania.
- Kaskadowe usunięcie zależy od liczby komórek/nasadzeń; Supabase obsłuży w transakcji – monitorować czas wykonania, ewentualnie dodać limit retry.
- Brak potrzeby cache.

## 8. Kroki implementacji

1. **Routing** – utworzyć plik `src/pages/api/plans/[plan_id].ts` (lub zagnieżdżony katalog) z handlerem DELETE; oznaczyć `export const prerender = false`.
2. **Walidacja Zod** – zdefiniować schemat path params (`z.object({ plan_id: z.string().uuid() })`).
3. **Pozyskanie kontekstu** – wyciągnąć `supabase` i `session` z `locals`; zwrócić 401 gdy brak.
4. **Warstwa serwisowa** – dodać do `plans.service.ts` funkcję `deletePlan(supabase, userId, planId)`:
   - `select` (`.maybeSingle()`) dla weryfikacji własności; alternatywnie `delete().eq("id", planId).eq("user_id", userId).select("id")`.
   - Mapować `error.code` na aplikacyjne wyjątki (`ForbiddenError`, `NotFoundError`).
5. **Mapowanie błędów** – w handlerze przechwycić wyjątki; przygotować helper do budowy `ApiErrorResponse`.
6. **Odpowiedź** – po sukcesie zwrócić `new Response(null, { status: 204 })`.
7. **Testy jednostkowe/integracyjne** – dodać scenariusze do .ai/testing/plans-manual-tests.md: sukces, brak auth, zły UUID, nieistniejący plan, plan innego użytkownika, błąd Supabase.
