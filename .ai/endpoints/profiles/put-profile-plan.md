# API Endpoint Implementation Plan: PUT /api/profile

## 1. Przegląd punktu końcowego

- **Cel**: Aktualizacja preferencji użytkownika (`language_code` i/lub `theme`) w tabeli `public.profiles` dla zalogowanego użytkownika.
- **Stack**: Astro 5 (API Routes), TypeScript 5, Supabase (Auth + DB), Zod (walidacja), zgodnie z regułami projektu.
- **Zasada**: Częściowa aktualizacja (partial update) – klient może przesłać jedno lub oba pola; wymaga aktywnej sesji użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP**: PUT
- **URL**: `/api/profile`
- **Parametry URL**: brak (użytkownik identyfikowany przez sesję)
- **Request Body** (JSON):
  - **Content-Type**: `application/json`
  - **Schema**:

```json
{
  "language_code": "pl",
  "theme": "light"
}
```

- **Wymagane pola**: co najmniej jedno z `language_code` lub `theme`
- **Opcjonalne pola**:
  - `language_code`: string ISO code (np. "pl", "en", "en-US")
  - `theme`: enum `"light"` | `"dark"`

- **Uwierzytelnienie**: wymagane (sesja Supabase Auth przez `locals.supabase`).

### Zasady walidacji (szczegółowo):

1. **language_code**:
   - Format: ISO 639-1 (dwuliterowy) lub ISO 639-1 + ISO 3166-1 (np. "en-US")
   - Regex: `/^[a-z]{2}(-[A-Z]{2})?$/`
   - Przykłady poprawne: "pl", "en", "en-US", "de-DE"
   - Przykłady niepoprawne: "PL", "eng", "123", "en_US"

2. **theme**:
   - Dozwolone wartości: dokładnie `"light"` lub `"dark"`
   - Case-sensitive (nie "Light", "DARK", itp.)

3. **Body całościowo**:
   - Co najmniej jedno pole musi być obecne
   - Dodatkowe pola są ignorowane (opcjonalnie można zwrócić błąd walidacji)
   - Puste body (`{}`) zwraca 400 ValidationError

## 3. Wykorzystywane typy

Z `src/types.ts`:

- **ProfileDto**: odpowiedź zwracana po aktualizacji

  ```typescript
  Pick<DbProfile, "id" | "language_code" | "theme" | "created_at" | "updated_at">;
  ```

- **ProfileUpdateCommand**: schemat body requestu

  ```typescript
  Partial<Pick<DbProfile, "language_code" | "theme">>;
  ```

- **ApiItemResponse<ProfileDto>**: wrapper odpowiedzi sukcesu

  ```typescript
  {
    data: ProfileDto;
  }
  ```

- **ApiErrorResponse**: wrapper odpowiedzi błędu
  ```typescript
  {
    error: {
      code: 'ValidationError' | 'Unauthorized' | 'Forbidden' | 'NotFound' | 'InternalError';
      message: string;
      details?: { field_errors?: Record<string, string> };
    }
  }
  ```

## 4. Szczegóły odpowiedzi

### Sukces

**200 OK** – pomyślna aktualizacja:

```json
{
  "data": {
    "id": "uuid",
    "language_code": "pl",
    "theme": "dark",
    "created_at": "2025-11-10T10:00:00Z",
    "updated_at": "2025-11-10T10:30:00Z"
  }
}
```

### Błędy

**400 ValidationError** – nieprawidłowe dane wejściowe:

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid input data.",
    "details": {
      "field_errors": {
        "language_code": "Invalid ISO language code",
        "theme": "Must be 'light' or 'dark'"
      }
    }
  }
}
```

**400 ValidationError** – brak pól w body:

```json
{
  "error": {
    "code": "ValidationError",
    "message": "At least one field must be provided."
  }
}
```

**401 Unauthorized** – brak sesji użytkownika:

```json
{
  "error": {
    "code": "Unauthorized",
    "message": "Authentication required."
  }
}
```

**403 Forbidden** – odmowa przez RLS:

```json
{
  "error": {
    "code": "Forbidden",
    "message": "Access denied."
  }
}
```

**404 NotFound** – profil nie istnieje:

```json
{
  "error": {
    "code": "NotFound",
    "message": "Profile not found."
  }
}
```

**500 InternalError** – błąd serwera:

```json
{
  "error": {
    "code": "InternalError",
    "message": "Unexpected server error."
  }
}
```

## 5. Przepływ danych

1. **Klient** wysyła `PUT /api/profile` z JSON body zawierającym `language_code` i/lub `theme`.

2. **Middleware Astro** udostępnia `locals.supabase` (klient Supabase z sesją użytkownika).

3. **Handler PUT**:
   - Sprawdza obecność `locals.supabase`
   - Pobiera sesję użytkownika: `supabase.auth.getUser()`
   - Jeśli brak sesji → zwraca **401 Unauthorized**
   - Waliduje user.id (UUID)
   - Parsuje i waliduje body przez **Zod schema**
   - Jeśli walidacja nie powiedzie się → zwraca **400 ValidationError** z `field_errors`
   - Wywołuje serwis: `profileService.updateProfileByUserId(supabase, userId, command)`
   - Jeśli profil nie znaleziony → zwraca **404 NotFound**
   - Jeśli błąd RLS → zwraca **403 Forbidden**
   - Jeśli sukces → zwraca **200 OK** z `ApiItemResponse<ProfileDto>`

4. **Profile Service** (`src/lib/services/profile.service.ts`):
   - Wykonuje `UPDATE profiles SET ... WHERE id = userId`
   - Automatycznie aktualizuje `updated_at` (przez trigger DB lub explicit)
   - Zwraca zaktualizowany rekord lub `null` jeśli nie znaleziono

5. **Supabase RLS** gwarantuje, że UPDATE może wykonać tylko właściciel profilu (`id = auth.uid()`).

## 6. Względy bezpieczeństwa

### Uwierzytelnianie i autoryzacja

- **Auth wymagane**: endpoint dostępny tylko dla zalogowanych użytkowników
- **RLS policy**: UPDATE na `public.profiles` tylko gdy `id = auth.uid()`
- **Zero ryzyka IDOR**: brak parametrów user_id w URL – użytkownik identyfikowany przez sesję
- **Least privilege**: użytkownik może zmienić tylko własne preferencje

### Walidacja danych wejściowych

- **Zod schema** zapewnia type-safety i runtime validation
- **Whitelist approach**: akceptowane tylko zdefiniowane pola (`language_code`, `theme`)
- **Sanityzacja**: Zod automatycznie odrzuca nieprawidłowe typy
- **Enum validation**: `theme` może być tylko "light" lub "dark"
- **Regex validation**: `language_code` musi być poprawnym ISO code

### Ochrona przed nadużyciami

- **Rate limiting**: zalecane (np. max 10 requestów/minutę per user) – implementacja na poziomie reverse proxy lub middleware
- **CORS**: domyślnie same-origin; jeśli cross-origin, należy skonfigurować whitelist domen

### Bezpieczeństwo danych

- **Brak danych wrażliwych**: endpoint operuje tylko na preferencjach UI
- **Immutable fields**: `id`, `created_at` nie mogą być zmieniane
- **Audit trail**: `updated_at` rejestruje czas ostatniej zmiany

### Logowanie i monitoring

- **Nie logować body requestu** (zgodność z GDPR, choć tu brak wrażliwych danych)
- **Logować błędy** z request ID dla debugowania
- **Opcjonalnie**: rejestrować event w `analytics_events` (typ: `profile_updated`)

## 7. Obsługa błędów

### Mapowanie błędów

| Scenariusz                    | HTTP Status | Error Code      | Szczegóły                                                    |
| ----------------------------- | ----------- | --------------- | ------------------------------------------------------------ |
| Body nie jest JSON            | 400         | ValidationError | "Invalid JSON body"                                          |
| Brak pól w body               | 400         | ValidationError | "At least one field must be provided"                        |
| Nieprawidłowy `language_code` | 400         | ValidationError | field_errors: { language_code: "Invalid ISO language code" } |
| Nieprawidłowy `theme`         | 400         | ValidationError | field_errors: { theme: "Must be 'light' or 'dark'" }         |
| Brak sesji                    | 401         | Unauthorized    | "Authentication required"                                    |
| Token wygasły/nieważny        | 401         | Unauthorized    | "Authentication required"                                    |
| RLS deny                      | 403         | Forbidden       | "Access denied"                                              |
| Profil nie istnieje           | 404         | NotFound        | "Profile not found"                                          |
| Błąd DB                       | 500         | InternalError   | "Unexpected server error"                                    |
| Nieoczekiwany błąd            | 500         | InternalError   | "Unexpected server error"                                    |

### Strategie obsługi

1. **Early returns** (guard clauses):
   - Sprawdzanie auth na początku funkcji
   - Walidacja przed wywołaniem service
   - Natychmiastowy zwrot przy błędzie

2. **Centralized error mapping**:
   - Helper function `errorResponse()` w `src/lib/http/errors.ts`
   - Spójne struktury odpowiedzi błędów

3. **Logging**:
   - `console.error()` dla błędów 500 z pełnym stack trace
   - `console.warn()` dla błędów 400/401/403 (możliwe próby nadużyć)
   - Include request ID lub correlation ID

4. **Graceful degradation**:
   - Nie wycieka szczegółów DB w odpowiedziach
   - Przyjazne komunikaty dla użytkownika końcowego

## 8. Rozważania dotyczące wydajności

### Optymalizacje zapytań

- **Pojedynczy UPDATE**: operacja O(1) po PRIMARY KEY (id)
- **Returning clause**: `UPDATE ... RETURNING *` zwraca dane bez dodatkowego SELECT
- **Index**: PK na `id` (automatyczny) zapewnia najszybszy dostęp

### Payload

- **Minimalne body**: tylko 1-2 pola, zazwyczaj < 100 bytes
- **Odpowiedź**: pełny ProfileDto (~200 bytes) – akceptowalne
- **Kompresja**: dla HTTP/2+ automatyczna przez serwer

### Caching

- **Brak cache serwera**: dane preferencji muszą być zawsze aktualne
- **Cache klienta**: możliwy krótki TTL (np. 1 min) w localStorage/memory cache
- **ETags**: opcjonalnie dla optymistycznego cachowania (nie priorytet w MVP)

### Database

- **Trigger `updated_at`**: automatyczne ustawianie przez `on update current_timestamp` lub trigger – unika race conditions
- **Connection pooling**: zapewnione przez Supabase
- **No N+1 queries**: pojedyncze zapytanie UPDATE + SELECT (lub RETURNING)

### Monitoring

- **Metryki**: średni czas odpowiedzi (target < 200ms dla p95)
- **Alerting**: spike w błędach 500 lub nagły wzrost opóźnień

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie Profile Service

**Plik**: `src/lib/services/profile.service.ts` (utworzyć lub rozszerzyć)

**Funkcja do dodania**:

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDto, ProfileUpdateCommand } from "@/types";

/**
 * Pobiera profil użytkownika po ID
 */
export async function getProfileByUserId(supabase: SupabaseClient, userId: string): Promise<ProfileDto | null> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("id, language_code, theme, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error && status !== 406) {
    throw error;
  }

  return data as ProfileDto | null;
}

/**
 * Aktualizuje profil użytkownika (partial update)
 * Zwraca zaktualizowany profil lub null jeśli nie znaleziono
 */
export async function updateProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
  command: ProfileUpdateCommand
): Promise<ProfileDto | null> {
  // Przygotowanie danych do update (tylko pola, które zostały podane)
  const updateData: Partial<{
    language_code: string;
    theme: string;
    updated_at: string;
  }> = {
    updated_at: new Date().toISOString(), // explicit set
  };

  if (command.language_code !== undefined) {
    updateData.language_code = command.language_code;
  }

  if (command.theme !== undefined) {
    updateData.theme = command.theme;
  }

  const { data, error, status } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select("id, language_code, theme, created_at, updated_at")
    .maybeSingle();

  if (error && status !== 406) {
    throw error;
  }

  return data as ProfileDto | null;
}
```

**Uwagi**:

- `maybeSingle()` zwraca `null` gdy brak rekordów (vs. `single()` który rzuca błąd)
- `.select()` po `.update()` zwraca zaktualizowane dane (pattern RETURNING)
- `updated_at` ustawiany explicite (alternatywnie: trigger DB)

### Krok 2: HTTP Helpers (jeśli nie istnieją)

**Plik**: `src/lib/http/errors.ts`

```typescript
import type { ApiErrorResponse } from "@/types";

export function errorResponse(
  code: ApiErrorResponse["error"]["code"],
  message: string,
  details?: ApiErrorResponse["error"]["details"]
): ApiErrorResponse {
  return { error: { code, message, details } };
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

### Krok 3: Zod Validation Schema

**Plik**: `src/lib/validation/profile.schema.ts` (nowy)

```typescript
import { z } from "zod";

// Regex dla ISO language codes: "pl", "en", "en-US", etc.
const ISO_LANGUAGE_CODE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

export const ProfileUpdateSchema = z
  .object({
    language_code: z.string().regex(ISO_LANGUAGE_CODE_REGEX, "Invalid ISO language code").optional(),
    theme: z
      .enum(["light", "dark"], {
        errorMap: () => ({ message: "Must be 'light' or 'dark'" }),
      })
      .optional(),
  })
  .strict() // odrzuca dodatkowe pola
  .refine((data) => data.language_code !== undefined || data.theme !== undefined, {
    message: "At least one field must be provided",
  });

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
```

**Uwagi**:

- `.strict()` zapewnia, że dodatkowe pola w body są odrzucane
- `.refine()` sprawdza, że co najmniej jedno pole jest obecne
- Custom error messages dla lepszej UX

### Krok 4: Implementacja API Endpoint

**Plik**: `src/pages/api/profile.ts` (utworzyć lub rozszerzyć)

```typescript
import type { APIContext } from "astro";
import type { ApiItemResponse, ProfileDto } from "@/types";
import { errorResponse, jsonResponse } from "@/lib/http/errors";
import { getProfileByUserId, updateProfileByUserId } from "@/lib/services/profile.service";
import { ProfileUpdateSchema } from "@/lib/validation/profile.schema";
import { z } from "zod";

export const prerender = false;

/**
 * GET /api/profile - Pobierz profil zalogowanego użytkownika
 */
export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // Sanity-check user id
  const idSchema = z.string().uuid();
  const parse = idSchema.safeParse(user.id);
  if (!parse.success) {
    return jsonResponse(errorResponse("Unprocessable", "Invalid user id."), 400);
  }

  try {
    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) {
      return jsonResponse(errorResponse("NotFound", "Profile not found."), 404);
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return jsonResponse(body, 200);
  } catch (e: any) {
    // Heurystyka dla 403 (RLS)
    const msg = String(e?.message ?? "");
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || e?.code === "PGRST301";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    console.error("GET /api/profile error:", e);
    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}

/**
 * PUT /api/profile - Aktualizuj profil zalogowanego użytkownika
 */
export async function PUT(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  if (!supabase) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 1. Sprawdź sesję użytkownika
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return jsonResponse(errorResponse("Unauthorized", "Authentication required."), 401);
  }

  // 2. Sanity-check user id
  const idSchema = z.string().uuid();
  const idParse = idSchema.safeParse(user.id);
  if (!idParse.success) {
    return jsonResponse(errorResponse("Unprocessable", "Invalid user id."), 400);
  }

  // 3. Parsuj i waliduj body
  let requestBody: unknown;
  try {
    requestBody = await ctx.request.json();
  } catch {
    return jsonResponse(errorResponse("ValidationError", "Invalid JSON body."), 400);
  }

  const bodyParse = ProfileUpdateSchema.safeParse(requestBody);
  if (!bodyParse.success) {
    // Mapowanie błędów Zod na field_errors
    const fieldErrors: Record<string, string> = {};
    for (const issue of bodyParse.error.issues) {
      const field = issue.path[0]?.toString() || "unknown";
      fieldErrors[field] = issue.message;
    }

    // Jeśli błąd to refine (co najmniej jedno pole), użyj głównego message
    const mainError = bodyParse.error.issues.find((issue) => issue.path.length === 0);
    const message = mainError?.message || "Invalid input data.";

    return jsonResponse(errorResponse("ValidationError", message, { field_errors: fieldErrors }), 400);
  }

  const command = bodyParse.data;

  // 4. Aktualizuj profil
  try {
    const profile = await updateProfileByUserId(supabase, user.id, command);
    if (!profile) {
      return jsonResponse(errorResponse("NotFound", "Profile not found."), 404);
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return jsonResponse(body, 200);
  } catch (e: any) {
    // Heurystyka dla 403 (RLS)
    const msg = String(e?.message ?? "");
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || e?.code === "PGRST301";

    if (isForbidden) {
      return jsonResponse(errorResponse("Forbidden", "Access denied."), 403);
    }

    console.error("PUT /api/profile error:", e);
    return jsonResponse(errorResponse("InternalError", "Unexpected server error."), 500);
  }
}
```

**Uwagi implementacyjne**:

- **Guard clauses**: sprawdzanie auth i walidacja na początku
- **Early returns**: każdy błąd zwraca Response natychmiast
- **Error mapping**: Zod errors → field_errors w ApiErrorResponse
- **Logging**: console.error dla 500, pomija wrażliwe dane
- **Type-safety**: pełne typy z `src/types.ts`

### Krok 5: Weryfikacja Middleware

**Plik**: `src/middleware/index.ts` (sprawdzić/utworzyć)

**Wymagania**:

- Middleware musi ustawiać `locals.supabase` jako instancję SupabaseClient
- Klient musi być skonfigurowany z cookies request/response
- Przykład (jeśli brak):

```typescript
import { defineMiddleware } from "astro:middleware";
import { createSupabaseClient } from "@/db/supabase.client";

export const onRequest = defineMiddleware(async (ctx, next) => {
  // Utwórz klienta Supabase z cookies
  ctx.locals.supabase = createSupabaseClient(ctx.request, ctx);

  return next();
});
```

### Krok 6: Weryfikacja RLS Policies (Database)

**W Supabase Dashboard lub migracji**:

Upewnić się, że istnieją policies dla UPDATE na `public.profiles`:

```sql
-- Policy dla authenticated users
CREATE POLICY profiles_update_authenticated ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

**Weryfikacja**:

- Policy powinna być już utworzona przez migrację `20251104120000_init_plantsplanner_schema.sql`
- Sprawdzić w Supabase Dashboard → Authentication → Policies

### Krok 7: Weryfikacja Trigger `updated_at`

**Opcja A: DB Trigger (preferowane)**

```sql
-- Funkcja do automatycznego ustawiania updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

**Opcja B: Explicit w Service** (już zaimplementowane w kroku 1)

### Krok 8: Testy manualne

#### Test 1: Sukces - aktualizacja theme

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"theme": "dark"}'

# Oczekiwany wynik: 200 OK
# {
#   "data": {
#     "id": "...",
#     "language_code": "pl",
#     "theme": "dark",
#     "created_at": "...",
#     "updated_at": "..." // nowy timestamp
#   }
# }
```

#### Test 2: Sukces - aktualizacja obu pól

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"language_code": "en", "theme": "light"}'

# Oczekiwany wynik: 200 OK
```

#### Test 3: Błąd walidacji - nieprawidłowy language_code

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"language_code": "PL"}'

# Oczekiwany wynik: 400 ValidationError
# {
#   "error": {
#     "code": "ValidationError",
#     "message": "Invalid input data.",
#     "details": {
#       "field_errors": {
#         "language_code": "Invalid ISO language code"
#       }
#     }
#   }
# }
```

#### Test 4: Błąd walidacji - nieprawidłowy theme

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"theme": "blue"}'

# Oczekiwany wynik: 400 ValidationError
# {
#   "error": {
#     "code": "ValidationError",
#     "message": "Invalid input data.",
#     "details": {
#       "field_errors": {
#         "theme": "Must be 'light' or 'dark'"
#       }
#     }
#   }
# }
```

#### Test 5: Błąd walidacji - puste body

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{}'

# Oczekiwany wynik: 400 ValidationError
# {
#   "error": {
#     "code": "ValidationError",
#     "message": "At least one field must be provided"
#   }
# }
```

#### Test 6: Unauthorized - brak sesji

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'

# Oczekiwany wynik: 401 Unauthorized
```

#### Test 7: Nieprawidłowy JSON

```bash
curl -i -X PUT https://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d 'invalid json'

# Oczekiwany wynik: 400 ValidationError
# {
#   "error": {
#     "code": "ValidationError",
#     "message": "Invalid JSON body."
#   }
# }
```

### Krok 9: Kontrola jakości

#### Linting i formatowanie

```bash
npm run lint
npm run format
```

#### Type checking

```bash
npx tsc --noEmit
```

#### Checklist

- [ ] Brak błędów ESLint
- [ ] Kod sformatowany przez Prettier
- [ ] Brak błędów TypeScript
- [ ] Wszystkie importy używają aliasu `@/*`
- [ ] Zgodność z regułami projektu (guard clauses, early returns)
- [ ] Spójność typów z `src/types.ts`
- [ ] Service wyodrębniony do `src/lib/services/`
- [ ] Walidacja przez Zod
- [ ] Obsługa wszystkich scenariuszy błędów (400, 401, 403, 404, 500)
- [ ] Logowanie błędów bez wycieków wrażliwych danych

### Krok 10: Dokumentacja

#### Aktualizacja API docs (jeśli istnieją)

- Dodać przykłady request/response dla PUT /api/profile
- Opisać wszystkie kody błędów
- Dodać przykłady użycia w frontend

#### Code comments

- Dodać JSDoc dla funkcji publicznych w service
- Komentarze wyjaśniające nietrywialne logiki

## 10. Kryteria akceptacji

### Funkcjonalne

- [ ] Zalogowany użytkownik może zaktualizować `language_code` i/lub `theme`
- [ ] Aktualizacja jednego pola nie wpływa na drugie
- [ ] Endpoint zwraca zaktualizowany profil (200 OK)
- [ ] Niezalogowany użytkownik otrzymuje 401
- [ ] Nieprawidłowe dane zwracają 400 z field_errors
- [ ] Puste body zwraca 400
- [ ] RLS zapobiega aktualizacji cudzego profilu (403)
- [ ] `updated_at` jest aktualizowane przy każdej zmianie

### Techniczne

- [ ] Zgodność z TypeScript (strict mode)
- [ ] Walidacja przez Zod
- [ ] Service wyodrębniony do `src/lib/services/profile.service.ts`
- [ ] Spójność z typami z `src/types.ts`
- [ ] Używa `locals.supabase` (nie bezpośredni import)
- [ ] `export const prerender = false`
- [ ] Uppercase handler names (GET, PUT)
- [ ] Guard clauses i early returns
- [ ] Centralized error responses

### Bezpieczeństwo

- [ ] RLS policies działają poprawnie
- [ ] Brak możliwości zmiany cudzego profilu
- [ ] Walidacja wszystkich wejść
- [ ] Brak wycieków wrażliwych danych w błędach
- [ ] Logowanie błędów bez PII

### Wydajność

- [ ] Czas odpowiedzi < 200ms (p95)
- [ ] Pojedyncze zapytanie UPDATE (bez N+1)
- [ ] Minimalne payload (tylko potrzebne pola)

### Jakość kodu

- [ ] Brak błędów linter/prettier
- [ ] Brak błędów TypeScript
- [ ] Zgodność z coding practices projektu
- [ ] Code review passed
