## API Endpoint Implementation Plan: GET /api/profile

### 1. Przegląd punktu końcowego

- **Cel**: Zwraca preferencje zalogowanego użytkownika (profil) 1:1 z rekordem w `public.profiles` powiązanym z `auth.users.id`.
- **Stack**: Astro 5 (API Routes), TypeScript 5, Supabase (Auth + DB), Zod (walidacja), zgodnie z regułami projektu.
- **Zasada**: Pobranie profilu wyłącznie dla aktualnie zalogowanego użytkownika (brak parametrów wejściowych).

### 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **URL**: `/api/profile`
- **Parametry**:
  - **Wymagane**: brak
  - **Opcjonalne**: brak
- **Request Body**: brak
- **Uwierzytelnienie**: wymagane (Supabase Auth przez `locals.supabase` w Astro).

### 3. Wykorzystywane typy

- Z `src/types.ts`:
  - **ProfileDto**: `Pick<DbProfile, 'id' | 'language_code' | 'theme' | 'created_at' | 'updated_at'>`
  - **ApiItemResponse<T>**: `{ data: T }`
  - **ApiErrorResponse**: ustandaryzowana struktura błędów (`code`, `message`, opcjonalne `details`)

### 4. Szczegóły odpowiedzi

- **200 OK** – poprawne pobranie:

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

- **401 Unauthorized** – brak sesji użytkownika:

```json
{
  "error": {
    "code": "Unauthorized",
    "message": "Authentication required."
  }
}
```

- **403 Forbidden** – odmowa przez RLS (jeśli wystąpi):

```json
{
  "error": {
    "code": "Forbidden",
    "message": "Access denied."
  }
}
```

- **404 NotFound** – profil nie istnieje:

```json
{
  "error": {
    "code": "NotFound",
    "message": "Profile not found."
  }
}
```

- **500 Internal Server Error** – błąd niespodziewany:

```json
{
  "error": {
    "code": "InternalError",
    "message": "Unexpected server error."
  }
}
```

### 5. Przepływ danych

1. Klient wywołuje `GET /api/profile` z aktywną sesją (cookie Supabase).
2. Middleware Astro udostępnia `locals.supabase` (zgodnie z regułami projektu).
3. Handler `GET`:
   - Pobiera sesję użytkownika z `locals.supabase.auth.getUser()` lub analogicznego helpera w middleware.
   - Jeśli brak sesji → 401.
   - Wywołuje serwis `profileService.getProfileByUserId(supabase, userId)`.
   - Jeśli brak rekordu → 404.
   - Zwraca `ApiItemResponse<ProfileDto>` (200) z ograniczonym zestawem pól.
4. Supabase RLS gwarantuje dostęp tylko do rekordu użytkownika.

### 6. Względy bezpieczeństwa

- **Auth**: wymagane uwierzytelnienie; brak identyfikatorów w URL – zero ryzyka IDOR przez parametry.
- **RLS**: reguły na `public.profiles` muszą pozwalać `SELECT` wyłącznie, gdy `id = auth.uid()`.
- **Least privilege**: zapytanie selekcjonuje tylko potrzebne kolumny (`id`, `language_code`, `theme`, `created_at`, `updated_at`).
- **Brak danych wrażliwych**: endpoint nie zwraca żadnych danych poza preferencjami profilu.
- **CORS**: jeżeli endpoint używany cross-origin, należy dopasować politykę CORS; domyślnie same-origin.
- **Rate limiting**: opcjonalnie (np. na warstwie reverse proxy) dla ochrony przed nadużyciami.

### 7. Obsługa błędów

- Mapowanie błędów Supabase:
  - Brak sesji → 401 `Unauthorized`.
  - `select().single()` z `404` (no rows) → 404 `NotFound`.
  - Błędy uprawnień/RLS → 403 `Forbidden`.
  - Pozostałe błędy → 500 z `code: "InternalError"` (spójnie z `ApiErrorResponse`).
- Logowanie serwerowe (console/logger) z korelacją requestu.
- Opcjonalne: rejestrowanie zdarzeń w analityce (np. `analytics_events`) dla obserwowalności błędów (bez wrażliwych danych).

### 8. Rozważania dotyczące wydajności

- Pojedyncze `SELECT ... WHERE id = $1 LIMIT 1` – operacja O(1) po PK, bardzo szybka.
- Zmniejszenie payloadu: selekcja tylko wymaganych pól.
- Brak cache po stronie serwera wymagany – dane preferencji mogą zmieniać się rzadko; ewentualny krótki TTL możliwy, ale niekonieczny.

### 9. Etapy wdrożenia

1. Utwórz serwis profilu: `src/lib/services/profile.service.ts`
   - Eksportuj funkcję:

```ts
import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDto } from "@/types";

export async function getProfileByUserId(supabase: SupabaseClient, userId: string): Promise<ProfileDto | null> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("id, language_code, theme, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle(); // zwraca null gdy brak, bez wyjątku

  if (error && status !== 406) {
    // bubble up; handler przemapuje na 4xx/5xx
    throw error;
  }

  return data as ProfileDto | null;
}
```

2. Dodaj helper do odpowiedzi błędów (opcjonalnie wspólny): `src/lib/http/errors.ts`

```ts
import type { ApiErrorResponse } from "@/types";

export function errorResponse(
  code: ApiErrorResponse["error"]["code"],
  message: string,
  details?: ApiErrorResponse["error"]["details"]
): ApiErrorResponse {
  return { error: { code, message, details } };
}
```

3. Zaimplementuj endpoint: `src/pages/api/profile.ts`

```ts
import type { APIContext } from "astro";
import { z } from "zod";
import type { ApiItemResponse, ProfileDto } from "@/types";
import { errorResponse } from "@/lib/http/errors";
import { getProfileByUserId } from "@/lib/services/profile.service";

export const prerender = false;

export async function GET(ctx: APIContext) {
  const supabase = ctx.locals.supabase; // zapewnione przez middleware
  if (!supabase) {
    return new Response(JSON.stringify(errorResponse("Unauthorized", "Authentication required.")), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return new Response(JSON.stringify(errorResponse("Unauthorized", "Authentication required.")), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // sanity-check id użytkownika
  const idSchema = z.string().uuid();
  const parse = idSchema.safeParse(user.id);
  if (!parse.success) {
    return new Response(JSON.stringify(errorResponse("Unprocessable", "Invalid user id.")), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) {
      return new Response(JSON.stringify(errorResponse("NotFound", "Profile not found.")), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: ApiItemResponse<ProfileDto> = { data: profile };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    // heurystyka dla 403 (RLS) – zależnie od treści błędu Supabase
    const msg = String(e?.message ?? "Unexpected server error.");
    const isForbidden =
      msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls") || e?.code === "PGRST301";

    if (isForbidden) {
      return new Response(JSON.stringify(errorResponse("Forbidden", "Access denied.")), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // log
    console.error("GET /api/profile error:", e);
    return new Response(JSON.stringify(errorResponse("InternalError", "Unexpected server error.")), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

4. Middleware (jeśli brak): `src/middleware/index.ts`
   - Zapewnij dostęp do `locals.supabase` oraz poprawną ekstrakcję sesji przez `supabase.auth.getUser()`.

5. RLS (DB) – weryfikacja polityk na `public.profiles` (w Supabase):
   - `SELECT`: `USING (id = auth.uid())`

6. Testy manualne (przykłady)

```bash
# 200 OK (po zalogowaniu w tej samej przeglądarce/sesji)
curl -i https://localhost:4321/api/profile

# 401 Unauthorized (brak sesji)
curl -i -H "Cookie: <brak>" https://localhost:4321/api/profile
```

7. Kontrola jakości:
   - ESLint/Prettier bez błędów.
   - Spójność typów z `src/types.ts`.
   - Przegląd logów na 403/404, brak wycieku danych wrażliwych w odpowiedziach.

### 10. Kryteria akceptacji

- Dla zalogowanego usera `GET /api/profile` zwraca 200 i `ApiItemResponse<ProfileDto>` z właściwymi polami.
- Dla niezalogowanego usera zwraca 401.
- Dla usera bez rekordu w `profiles` zwraca 404.
- Błędy RLS zwracają 403.
- Brak błędów lint/typów, zgodność z regułami projektu (Astro, Supabase, Zod, middleware).
