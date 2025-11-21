# API Endpoint Implementation Plan: POST /api/plans/:plan_id/weather/refresh

## 1. Przegląd punktu końcowego

Endpoint użytkownika służący do odświeżania cache'u danych pogodowych dla konkretnego planu. Pobiera dane z [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api), normalizuje je do skali 0-100 i zapisuje w tabeli `weather_monthly`. Endpoint używa standardowej autoryzacji JWT użytkownika z Row Level Security (RLS).

**Cel biznesowy**: Umożliwienie użytkownikom aktualizacji danych pogodowych dla swoich planów, co pozwala AI na dokładną ocenę dopasowania roślin do warunków klimatycznych.

**Charakterystyka**:

- Endpoint użytkownika z autoryzacją JWT (Supabase Auth)
- Pobiera dane z ostatnich 12 miesięcy
- Cache miesięczny z możliwością wymuszenia odświeżenia
- Synchroniczne wykonanie w MVP (async opcjonalnie w przyszłości)
- RLS zapewnia że użytkownik może odświeżyć tylko swoje plany

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/plans/:plan_id/weather/refresh`
- **Content-Type**: `application/json`
- **Authorization**: JWT Bearer token (Supabase Auth)

### Parametry URL:

**Wymagane:**

- `plan_id` (UUID) - identyfikator planu, dla którego mają być odświeżone dane pogodowe

### Request Body:

```json
{
  "force": false
}
```

**Pola:**

- `force` (boolean, opcjonalny, domyślnie `false`) - jeśli `true`, wymusza odświeżenie nawet jeśli cache jest aktualny (< 30 dni od ostatniego odświeżenia)

### Request Headers:

```
Authorization: Bearer <user-jwt-token>
Content-Type: application/json
```

### Przykładowe żądanie:

```bash
curl -X POST \
  https://app.plantsplaner.com/api/plans/550e8400-e29b-41d4-a716-446655440000/weather/refresh \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts):

```typescript
// Command dla body żądania
export interface WeatherRefreshCommand {
  force?: boolean;
}

// DTO dla odpowiedzi
export interface WeatherRefreshResultDto {
  refreshed: boolean;
  months: number;
}

// DTO dla pojedynczego miesiąca (używane wewnętrznie)
export type WeatherMonthlyDto = Pick<
  DbWeatherMonthly,
  "year" | "month" | "sunlight" | "humidity" | "precip" | "last_refreshed_at"
>;

// Typy z bazy danych
export type DbPlan = Tables<"plans">;
export type DbWeatherMonthly = Tables<"weather_monthly">;
```

### Nowe typy wewnętrzne (dla WeatherService):

```typescript
// src/lib/services/weather.service.ts

interface OpenMeteoRawResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    shortwave_radiation_sum: number[];
    sunshine_duration: number[];
    relative_humidity_2m_mean: number[];
    precipitation_sum: number[];
  };
}

interface NormalizedMonthlyData {
  year: number;
  month: number; // 1-12
  sunlight: number; // 0-100
  humidity: number; // 0-100
  precip: number; // 0-100
}
```

## 4. Szczegóły odpowiedzi

### Success Response (200 OK):

```json
{
  "data": {
    "refreshed": true,
    "months": 12
  }
}
```

**Pola:**

- `refreshed` (boolean) - `true` jeśli dane zostały pobrane i zaktualizowane, `false` jeśli cache był aktualny i `force` nie było ustawione
- `months` (number) - liczba zaktualizowanych miesięcy (zazwyczaj 12)

### Success Response (202 Accepted) - opcjonalnie w przyszłości:

```json
{
  "data": {
    "status": "processing",
    "job_id": "uuid"
  }
}
```

### Error Response (4xx/5xx):

```json
{
  "error": {
    "code": "NotFound",
    "message": "Plan with ID 550e8400-e29b-41d4-a716-446655440000 not found"
  }
}
```

## 5. Przepływ danych

### Schemat przepływu:

```
1. Request → Endpoint Handler
   ↓
2. Walidacja JWT (Astro context.locals.supabase)
   ↓
3. Walidacja UUID plan_id
   ↓
4. Parsowanie i walidacja body (Zod)
   ↓
5. Sprawdzenie istnienia planu i ownership (RLS automatycznie)
   ↓ (jeśli plan nie istnieje lub user nie jest właścicielem)
   └→ Return 404 Not Found
   ↓
6. WeatherService.refreshWeatherForPlan(supabase, planId, userId, force)
   ↓
7. Pobranie planu z lat/lon (z RLS)
   ↓
8. Walidacja że plan ma lat/lon
   ↓ (jeśli brak)
   └→ Throw PlanMissingLocationError (422)
   ↓
9. Sprawdzenie czy refresh potrzebny (!force && last_refresh < 30 dni)
   ↓ (jeśli NIE potrzebny)
   └→ Return { refreshed: false, months: 0 }
   ↓ (jeśli potrzebny)
10. Rate limit check (in-memory) - max 1 req/15min per plan
    ↓ (jeśli rate limited)
    └→ Return 429 Too Many Requests
    ↓
11. Fetch data z Open-Meteo Historical Weather API
    - Endpoint: https://archive-api.open-meteo.com/v1/archive
    - Parametry: lat, lon, last 12 months, daily metrics
    - Według dokumentacji: https://open-meteo.com/en/docs/historical-weather-api
    ↓
12. Normalizacja danych surowych do 0-100
    - Agregacja dniowa → miesięczna
    - Normalizacja każdej metryki
    ↓
13. Upsert do weather_monthly (ON CONFLICT UPDATE)
    - Batch insert/update 12 rekordów
    - RLS pozwala zapisać tylko dla własnych planów
    ↓
14. Return { refreshed: true, months: 12 }
```

### Szczegóły integracji Open-Meteo:

Zgodnie z [oficjalną dokumentacją Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api):

**Endpoint**: `https://archive-api.open-meteo.com/v1/archive`

**Uwaga o licencji**: Open-Meteo oferuje [różne plany licencyjne](https://open-meteo.com/en/pricing):

- **Non-Commercial**: Darmowy dla użytku niekomercyjnego
- **Commercial**: Wymaga subskrypcji dla aplikacji komercyjnych
- **Self-Hosted**: Możliwość hostowania własnej instancji

Dla produkcji należy wybrać odpowiednią licencję zgodnie z charakterem aplikacji.

**Dlaczego Archive API?**: Używamy Historical Weather API (Archive) zamiast Weather Forecast API, ponieważ potrzebujemy **rzeczywistych** danych pogodowych z ostatnich 12 miesięcy, a nie prognoz. Archive API przechowuje dane od 1940 roku do ~5 dni wstecz.

**Parametry zapytania**:

```
?latitude=52.52
&longitude=13.41
&start_date=2024-11-01
&end_date=2025-10-31
&daily=shortwave_radiation_sum,sunshine_duration,relative_humidity_2m_mean,precipitation_sum
&timezone=auto
```

**Dostępne metryki daily** (według dokumentacji):

- `shortwave_radiation_sum` - suma promieniowania słonecznego (MJ/m²)
- `sunshine_duration` - czas nasłonecznienia (sekundy)
- `relative_humidity_2m_mean` - średnia wilgotność względna (%)
- `precipitation_sum` - suma opadów (mm)

**Normalizacja metryk**:

1. **Sunlight (0-100)**:
   - Źródło: `shortwave_radiation_sum` (MJ/m²) + `sunshine_duration` (s → h)
   - Sunshine duration jest w sekundach, konwersja: `sunshine_duration / 3600`
   - Formula: `(radiation_normalized * 0.6 + sunshine_normalized * 0.4)`
   - Normalizacja radiation: typowy zakres 0-30 MJ/m²/dzień
   - Normalizacja sunshine: typowy zakres 0-16 godzin/dzień
2. **Humidity (0-100)**:
   - Źródło: `relative_humidity_2m_mean` (%)
   - Formula: bezpośrednio wartość % (już 0-100)
3. **Precipitation (0-100)**:
   - Źródło: `precipitation_sum` (mm)
   - Formula: min-max scaling względem typowych zakresów (0-300mm/miesiąc)
   - Normalizacja: `min(precipitation / 3, 100)`

### Interakcje z bazą danych:

Wszystkie zapytania wykonywane z kontekstem użytkownika (JWT), RLS automatycznie filtruje wyniki:

1. **Odczyt planu** (z RLS):

   ```sql
   SELECT id, user_id, latitude, longitude
   FROM plans
   WHERE id = $1
   -- RLS automatycznie doda: AND user_id = auth.uid()
   ```

2. **Check ostatniego odświeżenia**:

   ```sql
   SELECT MAX(last_refreshed_at) as last_refresh
   FROM weather_monthly
   WHERE plan_id = $1
   -- RLS przez foreign key do plans zapewnia dostęp tylko do własnych
   ```

3. **Upsert danych pogodowych**:
   ```sql
   INSERT INTO weather_monthly
     (plan_id, year, month, sunlight, humidity, precip, last_refreshed_at)
   VALUES ($1, $2, $3, $4, $5, $6, NOW())
   ON CONFLICT (plan_id, year, month)
   DO UPDATE SET
     sunlight = EXCLUDED.sunlight,
     humidity = EXCLUDED.humidity,
     precip = EXCLUDED.precip,
     last_refreshed_at = NOW()
   -- RLS zapewnia że można zapisać tylko dla własnych planów
   ```

## 6. Względy bezpieczeństwa

### Autoryzacja:

1. **JWT Authentication (Supabase Auth)**:
   - Endpoint wymaga ważnego JWT token w nagłówku `Authorization: Bearer <token>`
   - Token jest weryfikowany przez Supabase automatycznie
   - Brak tokenu lub nieważny token → 401 Unauthorized

   ```typescript
   // W Astro endpoint handler
   const supabase = context.locals.supabase;
   const {
     data: { user },
     error,
   } = await supabase.auth.getUser();

   if (error || !user) {
     return new Response(
       JSON.stringify({
         error: {
           code: "Unauthorized",
           message: "Authentication required",
         },
       }),
       { status: 401 }
     );
   }
   ```

2. **Row Level Security (RLS)**:
   - Wszystkie operacje na bazie używają RLS
   - Użytkownik może odświeżyć tylko swoje plany
   - RLS policy na `plans`: `user_id = auth.uid()`
   - RLS policy na `weather_monthly`: poprzez foreign key do `plans`
   - Próba dostępu do cudzego planu → 404 Not Found (plan "nie istnieje" z perspektywy użytkownika)

3. **Ownership Verification**:
   - RLS automatycznie zapewnia że użytkownik ma dostęp tylko do swoich planów
   - Nie trzeba ręcznie sprawdzać `user_id` - Supabase to robi
   - Jeśli plan nie istnieje lub nie należy do użytkownika, query zwróci `null`

### Rate Limiting:

- **Per-plan limit**: Maximum 1 żądanie na 15 minut per `plan_id`
- Implementacja: Simple in-memory Map z timestamps (dla MVP) lub Redis (produkcja)
- Response: 429 Too Many Requests z header `Retry-After`
- Rate limit jest per plan (nie per user), aby zapobiec nadmiernemu obciążeniu Open-Meteo API

```typescript
// Prosta implementacja in-memory rate limiter
const refreshAttempts = new Map<string, number>();

function checkRateLimit(planId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const lastAttempt = refreshAttempts.get(planId) || 0;
  const fifteenMinutes = 15 * 60 * 1000;
  const timeSinceLastAttempt = now - lastAttempt;

  if (timeSinceLastAttempt < fifteenMinutes) {
    return {
      allowed: false,
      retryAfter: Math.ceil((fifteenMinutes - timeSinceLastAttempt) / 1000),
    };
  }

  refreshAttempts.set(planId, now);
  return { allowed: true };
}
```

### Walidacja wejść:

1. **UUID validation** dla `plan_id`:

   ```typescript
   const uuidSchema = z.string().uuid();
   ```

2. **Body validation** z Zod:

   ```typescript
   const weatherRefreshSchema = z.object({
     force: z.boolean().optional().default(false),
   });
   ```

3. **Sanitizacja** - wszystkie wartości z Open-Meteo API walidowane przed zapisem

### Ochrona przed atakami:

- **SQL Injection**: Używamy parametryzowanych zapytań Supabase
- **Timing Attacks**: Constant-time comparison dla service key
- **DoS**: Rate limiting per plan
- **SSRF**: Open-Meteo API jest whitelisted, nie akceptujemy custom URLs

## 7. Obsługa błędów

### Kody statusu i scenariusze:

#### 400 Bad Request

**Przypadki:**

- Nieprawidłowy format UUID w `plan_id`
- Nieprawidłowy format body (nie JSON, złe typy)

**Response:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid plan_id format",
    "details": {
      "field_errors": {
        "plan_id": "Must be a valid UUID"
      }
    }
  }
}
```

#### 401 Unauthorized

**Przypadki:**

- Brak JWT token w nagłówku `Authorization`
- Nieprawidłowy lub wygasły JWT token
- Użytkownik nie jest zalogowany

**Response:**

```json
{
  "error": {
    "code": "Unauthorized",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found

**Przypadki:**

- Plan o podanym ID nie istnieje

**Response:**

```json
{
  "error": {
    "code": "NotFound",
    "message": "Plan with ID 550e8400-e29b-41d4-a716-446655440000 not found"
  }
}
```

#### 422 Unprocessable Entity

**Przypadki:**

- Plan nie ma ustawionej lokalizacji (latitude/longitude są null)

**Response:**

```json
{
  "error": {
    "code": "UnprocessableEntity",
    "message": "Plan must have location (latitude/longitude) set before weather data can be fetched"
  }
}
```

#### 429 Too Many Requests

**Przypadki:**

- Rate limit exceeded (więcej niż 1 żądanie na 15 minut dla tego planu)

**Response:**

```json
{
  "error": {
    "code": "RateLimited",
    "message": "Weather refresh rate limit exceeded. Please try again in 12 minutes."
  }
}
```

**Headers:**

```
Retry-After: 720
```

#### 502 Bad Gateway

**Przypadki:**

- Open-Meteo API zwróciło błąd (status 4xx/5xx)
- Nieprawidłowy format odpowiedzi z Open-Meteo

**Response:**

```json
{
  "error": {
    "code": "UpstreamError",
    "message": "Failed to fetch weather data from external service"
  }
}
```

#### 504 Gateway Timeout

**Przypadki:**

- Open-Meteo API nie odpowiedziało w timeout (np. 30 sekund)

**Response:**

```json
{
  "error": {
    "code": "UpstreamTimeout",
    "message": "Weather service request timed out"
  }
}
```

#### 500 Internal Server Error

**Przypadki:**

- Błędy bazy danych (connection error, constraint violation)
- Nieprzewidziane błędy w logice
- Błędy normalizacji danych

**Response:**

```json
{
  "error": {
    "code": "InternalError",
    "message": "An unexpected error occurred while refreshing weather data"
  }
}
```

### Error Handling Strategy:

```typescript
try {
  // Main logic
} catch (error) {
  console.error("[WeatherRefresh] Error:", error);

  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "ValidationError",
          message: "Invalid request data",
          details: { field_errors: formatZodErrors(error) },
        },
      }),
      { status: 400 }
    );
  }

  if (error instanceof UpstreamError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UpstreamError",
          message: error.message,
        },
      }),
      { status: 502 }
    );
  }

  // Generic fallback
  return new Response(
    JSON.stringify({
      error: {
        code: "InternalError",
        message: "An unexpected error occurred",
      },
    }),
    { status: 500 }
  );
}
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Open-Meteo API latency**:
   - Typowy czas odpowiedzi: 500-2000ms
   - Timeout: 30 sekund
   - Mitigation: Cache results, async processing w przyszłości

2. **Database write operations**:
   - 12 upsert operations (jeden per miesiąc)
   - Mitigation: Batch upsert w jednej transakcji

3. **Memory usage**:
   - Przechowywanie ~365 dni _ 4 metryki _ 8 bytes ≈ 11.7KB per request
   - Mitigation: Stream processing jeśli dane rosną

### Optymalizacje:

1. **Batch Database Operations**:

   ```typescript
   // Zamiast 12 osobnych INSERT
   const { data, error } = await supabase.from("weather_monthly").upsert(allMonthsData, {
     onConflict: "plan_id,year,month",
     ignoreDuplicates: false,
   });
   ```

2. **Early Returns**:
   - Check cache freshness przed API call
   - Return wcześnie jeśli `!force` i cache < 30 dni

3. **Connection Pooling**:
   - Supabase client używa connection pooling out-of-the-box
   - Reuse client instance, nie tworzyć nowego per request

4. **Caching strategy**:
   - Last refresh timestamp per plan
   - Default: refresh jeśli > 30 dni
   - `force=true` bypass cache check

### Monitoring:

```typescript
// Metryki do śledzenia:
- weatherRefreshDuration (histogram)
- openMeteoApiDuration (histogram)
- weatherRefreshErrors (counter by error type)
- rateLimitHits (counter)
```

## 9. Kroki implementacji

### Krok 1: Przygotowanie środowiska

- [ ] Dodać zmienne środowiskowe do `.env` (jeśli jeszcze nie ma):
  ```env
  OPEN_METEO_API_URL=https://archive-api.open-meteo.com/v1/archive
  ```
- [ ] Zaktualizować `env.d.ts` z nową zmienną (jeśli potrzeba)
- [ ] Upewnić się że Supabase jest skonfigurowany w `src/middleware/index.ts`

### Krok 2: Sprawdzenie RLS Policies

**Upewnić się że istnieją odpowiednie RLS policies:**

```sql
-- Policy dla plans - użytkownik może czytać tylko swoje plany
CREATE POLICY "Users can read own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id);

-- Policy dla weather_monthly - użytkownik może czytać/pisać dla swoich planów
CREATE POLICY "Users can read weather for own plans"
  ON weather_monthly FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = weather_monthly.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert weather for own plans"
  ON weather_monthly FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = weather_monthly.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update weather for own plans"
  ON weather_monthly FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = weather_monthly.plan_id
      AND plans.user_id = auth.uid()
    )
  );
```

### Krok 3: Utworzenie Weather Service

**Plik:** `src/lib/services/weather.service.ts`

**Struktura:**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";

export class WeatherService {
  constructor(private supabase: SupabaseClient) {}

  // Główna metoda - przyjmuje supabase client z kontekstem użytkownika
  async refreshWeatherForPlan(planId: string, force: boolean = false): Promise<WeatherRefreshResultDto>;

  // Prywatne metody pomocnicze
  private async fetchPlan(planId: string): Promise<DbPlan | null>;
  private async shouldRefresh(planId: string, force: boolean): Promise<boolean>;
  private async fetchFromOpenMeteo(lat: number, lon: number): Promise<OpenMeteoRawResponse>;
  private normalizeWeatherData(raw: OpenMeteoRawResponse): NormalizedMonthlyData[];
  private async saveWeatherData(planId: string, data: NormalizedMonthlyData[]): Promise<number>;
}
```

**Implementacja kluczowych metod:**

1. `refreshWeatherForPlan` - orchestrator
2. `fetchPlan` - query Supabase dla planu (z RLS, zwróci null jeśli nie należy do użytkownika)
3. `shouldRefresh` - check last_refreshed_at
4. `fetchFromOpenMeteo` - HTTP fetch z error handling, zgodnie z dokumentacją Open-Meteo
5. `normalizeWeatherData` - transformacja surowych danych
6. `saveWeatherData` - batch upsert do DB (z RLS)

### Krok 4: Implementacja Rate Limiter

**Plik:** `src/lib/utils/rate-limiter.ts`

```typescript
export class InMemoryRateLimiter {
  private attempts = new Map<string, number>();

  constructor(private windowMs: number) {}

  check(key: string): { allowed: boolean; retryAfter?: number };
  reset(key: string): void;
}

// Export singleton instance
export const weatherRefreshLimiter = new InMemoryRateLimiter(15 * 60 * 1000);
```

### Krok 5: Walidacja Zod schemas

**Plik:** `src/lib/validation/weather.schemas.ts`

```typescript
import { z } from "zod";

export const weatherRefreshCommandSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const planIdParamSchema = z.string().uuid({
  message: "Invalid plan_id format",
});
```

### Krok 6: Helper funkcje dla odpowiedzi

**Plik:** `src/lib/utils/api-responses.ts`

```typescript
import { z } from "zod";

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: {
        code: "Unauthorized",
        message: "Authentication required",
      },
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function createNotFoundResponse(message: string) {
  return new Response(
    JSON.stringify({
      error: {
        code: "NotFound",
        message,
      },
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  return error.errors.reduce(
    (acc, err) => {
      const path = err.path.join(".") || "root";
      acc[path] = err.message;
      return acc;
    },
    {} as Record<string, string>
  );
}
```

### Krok 7: Utworzenie API Endpoint Handler

**Plik:** `src/pages/api/plans/[plan_id]/weather/refresh.ts`

```typescript
import type { APIRoute } from "astro";
import { createUnauthorizedResponse, formatZodErrors } from "@/lib/utils/api-responses";
import { weatherRefreshCommandSchema, planIdParamSchema } from "@/lib/validation/weather.schemas";
import { WeatherService } from "@/lib/services/weather.service";
import { weatherRefreshLimiter } from "@/lib/utils/rate-limiter";
import {
  PlanNotFoundError,
  PlanMissingLocationError,
  UpstreamError,
  UpstreamTimeoutError,
} from "@/lib/errors/weather.errors";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  // 1. Authenticate user via JWT (z middleware)
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createUnauthorizedResponse();
  }

  // 2. Validate plan_id param
  const planIdResult = planIdParamSchema.safeParse(params.plan_id);
  if (!planIdResult.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "ValidationError",
          message: "Invalid plan_id format",
          details: { field_errors: { plan_id: planIdResult.error.errors[0].message } },
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const planId = planIdResult.data;

  // 3. Check rate limit
  const rateLimitCheck = weatherRefreshLimiter.check(planId);
  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          code: "RateLimited",
          message: `Weather refresh rate limit exceeded. Please try again in ${Math.ceil(rateLimitCheck.retryAfter! / 60)} minutes.`,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rateLimitCheck.retryAfter! / 1000)),
        },
      }
    );
  }

  // 4. Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "ValidationError",
          message: "Invalid JSON in request body",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const commandResult = weatherRefreshCommandSchema.safeParse(body);
  if (!commandResult.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "ValidationError",
          message: "Invalid request data",
          details: { field_errors: formatZodErrors(commandResult.error) },
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 5. Execute weather refresh
  try {
    const weatherService = new WeatherService(supabase);

    const result = await weatherService.refreshWeatherForPlan(planId, commandResult.data.force);

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleWeatherServiceError(error);
  }
};

// Helper dla obsługi błędów service
function handleWeatherServiceError(error: unknown): Response {
  console.error("[WeatherRefresh] Error:", error);

  // Custom error types
  if (error instanceof PlanNotFoundError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "NotFound",
          message: error.message,
        },
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (error instanceof PlanMissingLocationError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UnprocessableEntity",
          message: error.message,
        },
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (error instanceof UpstreamTimeoutError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UpstreamTimeout",
          message: "Weather service request timed out",
        },
      }),
      {
        status: 504,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (error instanceof UpstreamError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UpstreamError",
          message: "Failed to fetch weather data from external service",
        },
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Generic error
  return new Response(
    JSON.stringify({
      error: {
        code: "InternalError",
        message: "An unexpected error occurred while refreshing weather data",
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

### Krok 8: Custom Error Classes

**Plik:** `src/lib/errors/weather.errors.ts`

```typescript
export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherServiceError";
  }
}

export class PlanNotFoundError extends WeatherServiceError {
  constructor(planId: string) {
    super(`Plan with ID ${planId} not found`);
    this.name = "PlanNotFoundError";
  }
}

export class PlanMissingLocationError extends WeatherServiceError {
  constructor(planId: string) {
    super(`Plan ${planId} must have location (latitude/longitude) set before weather data can be fetched`);
    this.name = "PlanMissingLocationError";
  }
}

export class UpstreamError extends WeatherServiceError {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class UpstreamTimeoutError extends WeatherServiceError {
  constructor() {
    super("Weather service request timed out");
    this.name = "UpstreamTimeoutError";
  }
}
```

### Krok 9: Open-Meteo Integration Helper

**Plik:** `src/lib/integrations/open-meteo.ts`

Zgodnie z [oficjalną dokumentacją Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api):

```typescript
import { UpstreamError, UpstreamTimeoutError } from "@/lib/errors/weather.errors";

interface OpenMeteoParams {
  latitude: number;
  longitude: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

interface OpenMeteoRawResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    shortwave_radiation_sum: string;
    sunshine_duration: string;
    relative_humidity_2m_mean: string;
    precipitation_sum: string;
  };
  daily: {
    time: string[]; // ISO dates ["2024-01-01", "2024-01-02", ...]
    shortwave_radiation_sum: number[]; // MJ/m²
    sunshine_duration: number[]; // seconds
    relative_humidity_2m_mean: number[]; // %
    precipitation_sum: number[]; // mm
  };
}

/**
 * Oblicza zakres dat dla ostatnich 12 miesięcy
 * Zwraca [startDate, endDate] w formacie YYYY-MM-DD
 */
export function getLast12MonthsRange(): [string, string] {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 5); // Archive API ma ~5 dni opóźnienia

  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 12);

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  return [formatDate(startDate), formatDate(endDate)];
}

/**
 * Pobiera dane historyczne z Open-Meteo Archive API
 * Dokumentacja: https://open-meteo.com/en/docs/historical-weather-api
 */
export async function fetchWeatherArchive(params: OpenMeteoParams, timeoutMs = 30000): Promise<OpenMeteoRawResponse> {
  const baseUrl = import.meta.env.OPEN_METEO_API_URL || "https://archive-api.open-meteo.com/v1/archive";
  const url = new URL(baseUrl);

  // Parametry zgodnie z dokumentacją
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  url.searchParams.set("start_date", params.startDate);
  url.searchParams.set("end_date", params.endDate);
  url.searchParams.set(
    "daily",
    "shortwave_radiation_sum,sunshine_duration,relative_humidity_2m_mean,precipitation_sum"
  );
  url.searchParams.set("timezone", "auto");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "PlantsPlaner/1.0", // Opcjonalnie, dla identyfikacji
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new UpstreamError(`Open-Meteo API returned ${response.status}: ${errorText}`, response.status);
    }

    const data = await response.json();

    // Walidacja podstawowej struktury odpowiedzi
    if (!data.daily || !data.daily.time || !Array.isArray(data.daily.time)) {
      throw new UpstreamError("Invalid response structure from Open-Meteo API");
    }

    return data as OpenMeteoRawResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamTimeoutError();
    }
    if (error instanceof UpstreamError || error instanceof UpstreamTimeoutError) {
      throw error;
    }
    throw new UpstreamError(`Failed to fetch from Open-Meteo: ${error}`);
  } finally {
    clearTimeout(timeout);
  }
}
```

### Krok 10: Normalizacja danych pogodowych

**Implementacja w:** `src/lib/services/weather.service.ts`

Zgodnie z dokumentacją Open-Meteo:

- `shortwave_radiation_sum` jest w **MJ/m²** (nie kWh)
- `sunshine_duration` jest w **sekundach** (nie godzinach)

```typescript
interface NormalizedMonthlyData {
  year: number;
  month: number;
  sunlight: number; // 0-100
  humidity: number; // 0-100
  precip: number;   // 0-100
}

private normalizeWeatherData(raw: OpenMeteoRawResponse): NormalizedMonthlyData[] {
  const dailyData = raw.daily;
  const grouped = new Map<string, {
    radiation: number[];
    sunshine: number[];
    humidity: number[];
    precip: number[];
  }>();

  // 1. Grupuj po miesiącach
  for (let i = 0; i < dailyData.time.length; i++) {
    const date = new Date(dailyData.time[i]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        radiation: [],
        sunshine: [],
        humidity: [],
        precip: []
      });
    }

    const month = grouped.get(key)!;
    month.radiation.push(dailyData.shortwave_radiation_sum[i] || 0);
    month.sunshine.push(dailyData.sunshine_duration[i] || 0);
    month.humidity.push(dailyData.relative_humidity_2m_mean[i] || 0);
    month.precip.push(dailyData.precipitation_sum[i] || 0);
  }

  // 2. Oblicz średnie miesięczne i normalizuj
  const normalized: NormalizedMonthlyData[] = [];

  for (const [key, values] of grouped.entries()) {
    const [year, month] = key.split('-').map(Number);

    // Średnie dzienne (dla miesięcznych agregatów)
    const avgRadiation = average(values.radiation); // MJ/m²/day
    const avgSunshineSec = average(values.sunshine); // seconds/day
    const avgHumidity = average(values.humidity); // %
    const totalPrecip = sum(values.precip); // mm/month

    // Konwersja sunshine z sekund na godziny
    const avgSunshineHours = avgSunshineSec / 3600;

    // Normalizacja do 0-100
    const sunlight = Math.round(
      normalizeRadiation(avgRadiation) * 0.6 +
      normalizeSunshine(avgSunshineHours) * 0.4
    );

    const humidity = Math.round(avgHumidity); // już 0-100

    const precip = Math.round(
      Math.min((totalPrecip / 300) * 100, 100)
    );

    normalized.push({
      year,
      month,
      sunlight: clamp(sunlight, 0, 100),
      humidity: clamp(humidity, 0, 100),
      precip: clamp(precip, 0, 100)
    });
  }

  return normalized.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

// Helpers
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Normalizuje promieniowanie słoneczne z MJ/m²/day do 0-100
 * Typowy zakres: 0-30 MJ/m²/day
 */
function normalizeRadiation(mjPerM2: number): number {
  return Math.min((mjPerM2 / 30) * 100, 100);
}

/**
 * Normalizuje czas nasłonecznienia z godzin/dzień do 0-100
 * Typowy zakres: 0-16 godzin/dzień
 */
function normalizeSunshine(hours: number): number {
  return Math.min((hours / 16) * 100, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

### Krok 11: Testy jednostkowe

**Plik:** `src/lib/services/weather.service.test.ts`

Testy dla:

- Normalizacji danych
- Rate limiting
- Walidacji service key
- Error handling
- Logiki cache freshness

### Krok 12: Dokumentacja

- [ ] Zaktualizować API docs
- [ ] Dodać przykłady użycia
- [ ] Dokumentacja setup service key
- [ ] Dokumentacja troubleshooting

### Krok 13: Testing w środowisku dev

- [ ] Test z prawidłowym JWT token użytkownika
- [ ] Test bez JWT token (401)
- [ ] Test z cudzym planem (404 - RLS blokuje dostęp)
- [ ] Test z nieprawidłowym plan_id format (400)
- [ ] Test z własnym planem bez lokalizacji (422)
- [ ] Test rate limiting (429) - dwukrotne wywołanie w krótkim czasie
- [ ] Test force refresh (z `force: true`)
- [ ] Test normalnego refresh gdy cache jest świeży (refreshed: false)
- [ ] Test integracji z Open-Meteo API
- [ ] Weryfikacja zapisanych danych w weather_monthly
- [ ] Test z błędem Open-Meteo API (symulacja timeout/błąd)

### Krok 14: Deployment checklist

- [ ] Ustawić zmienne środowiskowe w produkcji (OPEN_METEO_API_URL jeśli custom)
- [ ] Weryfikacja RLS policies na tabelach plans i weather_monthly
- [ ] Verify Open-Meteo API access z produkcji
- [ ] Setup monitoring/alerting dla:
  - Rate limit violations
  - Open-Meteo API errors
  - Długie czasy odpowiedzi (>5s)
- [ ] Deploy do staging
- [ ] Smoke tests z prawdziwymi użytkownikami i planami
- [ ] Deploy do produkcji
- [ ] Post-deployment verification

---

## Podsumowanie

Ten endpoint jest kluczowy dla funkcjonalności AI w aplikacji. Zapewnia aktualny cache danych pogodowych potrzebnych do oceny dopasowania roślin. Implementacja używa standardowej autoryzacji JWT z Row Level Security, co zapewnia bezpieczeństwo i izolację danych użytkowników.

Kluczowe aspekty:

- **Security first**: JWT authentication, RLS policies, ownership verification
- **Robustness**: Comprehensive error handling, timeout, retry logic
- **Performance**: Batch operations, cache strategy (30 dni), early returns, rate limiting
- **Observability**: Proper logging, error tracking
- **Integration**: [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) z oficjalną dokumentacją
- **Data Quality**: Normalizacja metryk do wspólnej skali 0-100 dla consistency
