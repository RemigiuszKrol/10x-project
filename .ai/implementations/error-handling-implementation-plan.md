# Plan Implementacji: System Obsługi Błędów

## 1. Przegląd

Plan implementacji systemu obsługi błędów dla aplikacji PlantsPlanner, obejmujący:
- **Toast notifications na froncie** - centralny system wyświetlania błędów API jako toastów dla użytkownika
- **Logger na backendzie** - system rejestrowania błędów w konsoli z możliwością wyłączenia

**Status:** 📋 Plan  
**Data utworzenia:** 2025-01-21

## 2. Cele

### 2.1 Frontend - Toast Notifications

- Centralizacja obsługi błędów z API w jednym miejscu
- Automatyczne wyświetlanie toastów dla błędów z React Query mutations
- Spójne komunikaty błędów dla użytkownika
- Obsługa różnych typów błędów (ValidationError, NotFound, RateLimited, itp.)
- Integracja z istniejącym systemem Sonner

### 2.2 Backend - Logger

- Rejestrowanie wszystkich błędów w konsoli z kontekstem
- Możliwość wyłączenia logowania przez zmienną środowiskową
- Strukturalne logowanie z poziomami (error, warn, info)
- Kontekst błędów (endpoint, user_id, request_id, stack trace)
- Nie wycieka wrażliwych danych w logach

## 3. Analiza Obecnego Stanu

### 3.1 Frontend

**Istniejące komponenty:**
- `src/components/ui/sonner.tsx` - komponent Toaster z Sonner
- `src/components/editor/ToastProvider.tsx` - provider dla toastów
- Toast używany lokalnie w komponentach (`toast.success()`, `toast.error()`)

**Problemy:**
- Brak centralnego systemu obsługi błędów z API
- Każdy hook mutation obsługuje błędy ręcznie
- Brak spójności w komunikatach błędów
- Duplikacja kodu obsługi błędów

**Przykłady użycia toast:**
- `src/components/editor/EditorLayout.tsx` - toast.success/error
- `src/components/editor/SideDrawer/WeatherTab.tsx` - toast.success/info/error
- `src/components/editor/SideDrawer/PlantsList.tsx` - toast.success/error
- `src/lib/hooks/mutations/useRefreshWeather.ts` - ręczna obsługa błędów HTTP

### 3.2 Backend

**Istniejące komponenty:**
- `src/lib/http/errors.ts` - helpery `errorResponse()` i `jsonResponse()`
- `src/lib/http/weather.errors.ts` - custom error classes dla Weather Service
- Endpointy zwracają `ApiErrorResponse` z kodami błędów

**Problemy:**
- Brak logowania błędów w konsoli
- Brak możliwości debugowania problemów produkcyjnych
- Brak kontekstu błędów (endpoint, user, request)

**Przykłady endpointów:**
- `src/pages/api/plans/[plan_id]/weather/refresh.ts` - obsługa błędów bez logowania
- `src/pages/api/plans/[plan_id].ts` - obsługa błędów bez logowania
- `src/pages/api/plans/[plan_id]/grid/area-type.ts` - obsługa błędów bez logowania

## 4. Struktura Implementacji

### 4.1 Frontend - Toast Error Handler

**Katalog:** `src/lib/utils/`

**Pliki do utworzenia:**
1. `src/lib/utils/toast-error-handler.ts` - główna funkcja mapująca błędy API na toasty
2. `src/lib/utils/api-error-mapper.ts` - mapowanie kodów błędów na komunikaty użytkownika

**Pliki do modyfikacji:**
1. `src/lib/hooks/mutations/useRefreshWeather.ts` - użycie toast error handler
2. `src/lib/hooks/mutations/useUpdatePlan.ts` - użycie toast error handler
3. `src/lib/hooks/mutations/useSetAreaType.ts` - użycie toast error handler
4. `src/lib/hooks/mutations/usePlantMutations.ts` - użycie toast error handler
5. `src/lib/hooks/mutations/useAIMutations.ts` - użycie toast error handler
6. `src/lib/hooks/usePlansApi.ts` - użycie toast error handler (jeśli istnieje)

**Integracja z React Query:**
- Wykorzystanie `onError` w `useMutation` do automatycznego wyświetlania toastów
- Opcjonalny parametr do wyłączenia automatycznego toast (dla custom obsługi)

### 4.2 Backend - Logger

**Katalog:** `src/lib/utils/`

**Pliki do utworzenia:**
1. `src/lib/utils/logger.ts` - główny moduł loggera z możliwością wyłączenia
2. `src/lib/http/error-handler.ts` - wrapper dla obsługi błędów z logowaniem

**Pliki do modyfikacji:**
1. `src/pages/api/plans/[plan_id]/weather/refresh.ts` - dodanie logowania błędów
2. `src/pages/api/plans/[plan_id].ts` - dodanie logowania błędów
3. `src/pages/api/plans/[plan_id]/grid/area-type.ts` - dodanie logowania błędów
4. `src/pages/api/plans/[plan_id]/grid/cells/[x]/[y].ts` - dodanie logowania błędów
5. `src/pages/api/plans/[plan_id]/plants/[x]/[y].ts` - dodanie logowania błędów
6. `src/pages/api/plans/index.ts` - dodanie logowania błędów
7. `src/pages/api/profile.ts` - dodanie logowania błędów
8. `src/pages/api/analytics/events.ts` - dodanie logowania błędów
9. Wszystkie inne endpointy w `src/pages/api/`

**Zmienne środowiskowe:**
- `ENABLE_ERROR_LOGGING` (boolean, domyślnie `true`) - włącza/wyłącza logowanie

## 5. Szczegółowy Plan Implementacji

### 5.1 Frontend - Toast Error Handler

#### 5.1.1 Utworzenie `src/lib/utils/api-error-mapper.ts`

**Funkcjonalność:**
- Mapowanie kodów błędów `ApiErrorResponse["error"]["code"]` na komunikaty użytkownika
- Obsługa różnych typów błędów z odpowiednimi komunikatami
- Obsługa `field_errors` dla ValidationError
- Lokalizacja komunikatów (na razie tylko polski)

**Typy błędów do obsługi:**
- `ValidationError` - błędy walidacji z `field_errors`
- `Unauthorized` - brak autoryzacji (redirect do login)
- `Forbidden` - brak uprawnień
- `NotFound` - zasób nie znaleziony
- `Conflict` - konflikt (np. duplikat nazwy)
- `RateLimited` - przekroczony limit zapytań
- `UpstreamTimeout` - timeout zewnętrznego serwisu
- `UnprocessableEntity` - nieprawidłowy stan (np. brak lokalizacji)
- `InternalError` - błąd serwera

#### 5.1.2 Utworzenie `src/lib/utils/toast-error-handler.ts`

**Funkcjonalność:**
- Funkcja `handleApiError(error: unknown, options?: ToastErrorOptions)`
- Parsowanie `ApiErrorResponse` z odpowiedzi HTTP
- Wywołanie `api-error-mapper` do mapowania na komunikaty
- Wyświetlanie toastów przez `toast.error()` z Sonner
- Obsługa błędów sieciowych (brak odpowiedzi)
- Obsługa błędów parsowania JSON

**Opcje:**
- `skipToast?: boolean` - wyłącza automatyczny toast
- `customMessage?: string` - nadpisuje domyślny komunikat
- `onError?: (error: ApiErrorResponse) => void` - callback dla custom obsługi

#### 5.1.3 Modyfikacja React Query Hooks

**Wzorzec użycia:**
```typescript
useMutation({
  mutationFn: async (params) => {
    // ... fetch logic
  },
  onError: (error) => {
    handleApiError(error);
  },
  onSuccess: () => {
    toast.success("Operacja zakończona pomyślnie");
  },
});
```

**Hooks do modyfikacji:**
1. `src/lib/hooks/mutations/useRefreshWeather.ts`
2. `src/lib/hooks/mutations/useUpdatePlan.ts`
3. `src/lib/hooks/mutations/useSetAreaType.ts`
4. `src/lib/hooks/mutations/usePlantMutations.ts`
5. `src/lib/hooks/mutations/useAIMutations.ts`

**Zachowanie:**
- Usunięcie ręcznej obsługi błędów HTTP z każdego hooka
- Zastąpienie przez `handleApiError()` w `onError`
- Zachowanie custom obsługi tam gdzie jest potrzebna (np. 409 confirmation)

### 5.2 Backend - Logger

#### 5.2.1 Utworzenie `src/lib/utils/logger.ts`

**Funkcjonalność:**
- Klasa `Logger` z metodami: `error()`, `warn()`, `info()`, `debug()`
- Sprawdzanie zmiennej środowiskowej `ENABLE_ERROR_LOGGING`
- Jeśli wyłączone - logger jest no-op (nic nie robi)
- Strukturalne logowanie z kontekstem:
  - Timestamp
  - Poziom (error/warn/info)
  - Komunikat
  - Kontekst (endpoint, user_id, request_id, error stack)
  - Opcjonalne dodatkowe dane

**Format logów:**
```typescript
{
  timestamp: "2025-01-21T10:30:00.000Z",
  level: "error",
  message: "Plan not found",
  context: {
    endpoint: "POST /api/plans/:plan_id/weather/refresh",
    plan_id: "550e8400-e29b-41d4-a716-446655440000",
    user_id: "user-uuid",
    error_code: "NotFound",
    stack?: "..."
  }
}
```

**Eksport:**
- Singleton `logger` - główna instancja loggera
- Funkcje pomocnicze: `logError()`, `logWarning()`, `logInfo()`

#### 5.2.2 Utworzenie `src/lib/http/error-handler.ts`

**Funkcjonalność:**
- Funkcja `logApiError(error: unknown, context: ErrorContext): void`
- Parsowanie różnych typów błędów (custom errors, Supabase errors, unknown errors)
- Wywołanie loggera z odpowiednim kontekstem
- Nie zmienia istniejącego flow obsługi błędów (tylko dodaje logowanie)

**Kontekst błędów:**
```typescript
interface ErrorContext {
  endpoint: string; // "POST /api/plans/:plan_id/weather/refresh"
  method: string; // "POST"
  user_id?: string; // UUID użytkownika
  params?: Record<string, unknown>; // Parametry endpointu
  request_id?: string; // Opcjonalny ID requestu (dla przyszłości)
}
```

#### 5.2.3 Modyfikacja Endpointów API

**Wzorzec użycia:**
```typescript
export async function POST(ctx: APIContext) {
  try {
    // ... logika endpointu
  } catch (error) {
    // Logowanie błędu PRZED zwróceniem odpowiedzi
    logApiError(error, {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user?.id,
      params: { plan_id: ctx.params.plan_id },
    });
    
    // Istniejąca obsługa błędów (bez zmian)
    return handleWeatherServiceError(error);
  }
}
```

**Endpointy do modyfikacji:**
1. `src/pages/api/plans/[plan_id]/weather/refresh.ts`
2. `src/pages/api/plans/[plan_id].ts` (PATCH, DELETE)
3. `src/pages/api/plans/index.ts` (POST, GET)
4. `src/pages/api/plans/[plan_id]/grid/area-type.ts`
5. `src/pages/api/plans/[plan_id]/grid/cells/[x]/[y].ts`
6. `src/pages/api/plans/[plan_id]/grid/cells.ts`
7. `src/pages/api/plans/[plan_id]/plants/[x]/[y].ts`
8. `src/pages/api/plans/[plan_id]/plants.ts`
9. `src/pages/api/profile.ts`
10. `src/pages/api/analytics/events.ts`
11. Wszystkie endpointy w `src/pages/api/auth/`

**Zasady:**
- Logowanie TYLKO błędów (nie sukcesów)
- Logowanie PRZED zwróceniem odpowiedzi
- Nie logowanie wrażliwych danych (hasła, tokeny)
- Logowanie custom error classes z pełnym kontekstem

#### 5.2.4 Zmienne Środowiskowe

**Plik:** `src/env.d.ts`

**Dodanie:**
```typescript
readonly ENABLE_ERROR_LOGGING?: string; // "true" | "false" | undefined (domyślnie "true")
```

**Domyślne zachowanie:**
- Jeśli `ENABLE_ERROR_LOGGING` nie jest ustawione → logowanie włączone
- Jeśli `ENABLE_ERROR_LOGGING="false"` → logowanie wyłączone
- Jeśli `ENABLE_ERROR_LOGGING="true"` → logowanie włączone

## 6. Katalogi i Pliki

### 6.1 Frontend

**Nowe pliki:**
```
src/lib/utils/
  ├── api-error-mapper.ts          # Mapowanie kodów błędów na komunikaty
  └── toast-error-handler.ts       # Główny handler błędów API dla toastów
```

**Modyfikowane pliki:**
```
src/lib/hooks/mutations/
  ├── useRefreshWeather.ts         # Dodanie handleApiError w onError
  ├── useUpdatePlan.ts             # Dodanie handleApiError w onError
  ├── useSetAreaType.ts            # Dodanie handleApiError w onError
  ├── usePlantMutations.ts         # Dodanie handleApiError w onError
  └── useAIMutations.ts            # Dodanie handleApiError w onError
```

**Opcjonalne modyfikacje:**
```
src/components/editor/
  ├── EditorLayout.tsx             # Możliwe uproszczenie obsługi błędów
  ├── SideDrawer/WeatherTab.tsx     # Możliwe uproszczenie obsługi błędów
  └── SideDrawer/PlantsList.tsx    # Możliwe uproszczenie obsługi błędów
```

### 6.2 Backend

**Nowe pliki:**
```
src/lib/utils/
  └── logger.ts                    # Główny moduł loggera

src/lib/http/
  └── error-handler.ts             # Helper do logowania błędów API
```

**Modyfikowane pliki:**
```
src/env.d.ts                       # Dodanie ENABLE_ERROR_LOGGING

src/pages/api/
  ├── plans/
  │   ├── index.ts                 # Logowanie błędów
  │   ├── [plan_id].ts             # Logowanie błędów
  │   └── [plan_id]/
  │       ├── grid/
  │       │   ├── area-type.ts     # Logowanie błędów
  │       │   ├── cells.ts         # Logowanie błędów
  │       │   └── cells/[x]/[y].ts # Logowanie błędów
  │       ├── plants/
  │       │   ├── [x]/[y].ts       # Logowanie błędów
  │       │   └── plants.ts        # Logowanie błędów
  │       └── weather/
  │           └── refresh.ts        # Logowanie błędów
  ├── profile.ts                   # Logowanie błędów
  ├── analytics/
  │   └── events.ts                # Logowanie błędów
  └── auth/
      ├── login.ts                 # Logowanie błędów
      ├── register.ts              # Logowanie błędów
      ├── logout.ts                # Logowanie błędów
      ├── forgot-password.ts       # Logowanie błędów
      └── reset-password.ts        # Logowanie błędów
```

## 7. Kolejność Implementacji

### Faza 1: Backend Logger (Podstawa)
1. ✅ Utworzenie `src/lib/utils/logger.ts`
2. ✅ Dodanie `ENABLE_ERROR_LOGGING` do `src/env.d.ts`
3. ✅ Utworzenie `src/lib/http/error-handler.ts`
4. ✅ Modyfikacja przykładowego endpointu (np. `weather/refresh.ts`)
5. ✅ Testowanie loggera (włączenie/wyłączenie)

### Faza 2: Frontend Toast Handler (Podstawa)
1. ✅ Utworzenie `src/lib/utils/api-error-mapper.ts`
2. ✅ Utworzenie `src/lib/utils/toast-error-handler.ts`
3. ✅ Modyfikacja przykładowego hooka (np. `useRefreshWeather.ts`)
4. ✅ Testowanie toast handlera

### Faza 3: Integracja Backend (Wszystkie Endpointy)
1. ✅ Modyfikacja wszystkich endpointów w `src/pages/api/plans/`
2. ✅ Modyfikacja `src/pages/api/profile.ts`
3. ✅ Modyfikacja `src/pages/api/analytics/events.ts`
4. ✅ Modyfikacja wszystkich endpointów w `src/pages/api/auth/`
5. ✅ Testowanie logowania we wszystkich scenariuszach

### Faza 4: Integracja Frontend (Wszystkie Hooks)
1. ✅ Modyfikacja wszystkich hooks w `src/lib/hooks/mutations/`
2. ✅ Opcjonalne uproszczenie obsługi błędów w komponentach
3. ✅ Testowanie toastów we wszystkich scenariuszach

### Faza 5: Dokumentacja i Refaktoring
1. ✅ Aktualizacja dokumentacji
2. ✅ Refaktoring duplikacji kodu (jeśli występuje)
3. ✅ Finalne testy end-to-end

## 8. Testy

### 8.1 Backend Logger

**Scenariusze testowe:**
- ✅ Logger włączony - błędy są logowane w konsoli
- ✅ Logger wyłączony (`ENABLE_ERROR_LOGGING=false`) - błędy nie są logowane
- ✅ Różne typy błędów (ValidationError, NotFound, InternalError)
- ✅ Kontekst błędów zawiera endpoint, user_id, params
- ✅ Stack trace dla unknown errors
- ✅ Brak wycieku wrażliwych danych w logach

### 8.2 Frontend Toast Handler

**Scenariusze testowe:**
- ✅ ValidationError - wyświetla toast z field_errors
- ✅ Unauthorized - wyświetla toast i redirect do login
- ✅ NotFound - wyświetla toast z komunikatem
- ✅ RateLimited - wyświetla toast z informacją o retry
- ✅ Network error - wyświetla toast o braku połączenia
- ✅ Unknown error - wyświetla ogólny komunikat
- ✅ Opcja `skipToast` - pomija automatyczny toast
- ✅ Custom message - nadpisuje domyślny komunikat

## 9. Przykłady Użycia

### 9.1 Frontend - Toast Handler

```typescript
// W React Query mutation
useMutation({
  mutationFn: async (params) => {
    const response = await fetch("/api/plans/123", {
      method: "PATCH",
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(JSON.stringify(errorData));
    }
    
    return await response.json();
  },
  onError: (error) => {
    handleApiError(error); // Automatyczny toast
  },
  onSuccess: () => {
    toast.success("Plan zaktualizowany");
  },
});
```

### 9.2 Backend - Logger

```typescript
export async function POST(ctx: APIContext) {
  const supabase = ctx.locals.supabase;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  
  try {
    // ... logika endpointu
    return jsonResponse({ data: result }, 200);
  } catch (error) {
    // Logowanie błędu
    logApiError(error, {
      endpoint: "POST /api/plans/:plan_id/weather/refresh",
      method: "POST",
      user_id: user?.id,
      params: { plan_id: ctx.params.plan_id },
    });
    
    // Istniejąca obsługa błędów
    return handleWeatherServiceError(error);
  }
}
```

## 10. Bezpieczeństwo

### 10.1 Frontend

- ✅ Nie logowanie wrażliwych danych w toastach
- ✅ Sanityzacja komunikatów błędów przed wyświetleniem
- ✅ Obsługa XSS w komunikatach błędów (Sonner automatycznie)

### 10.2 Backend

- ✅ Nie logowanie hasła, tokenów, danych osobowych
- ✅ Logowanie tylko kodów błędów, nie pełnych stack trace w produkcji (opcjonalnie)
- ✅ Możliwość wyłączenia logowania dla compliance

## 11. Przyszłe Rozszerzenia

### 11.1 Frontend

- [ ] Lokalizacja komunikatów błędów (i18n)
- [ ] Różne style toastów dla różnych typów błędów
- [ ] Retry mechanism dla niektórych błędów (RateLimited, Network)
- [ ] Error boundary dla nieobsłużonych błędów

### 11.2 Backend

- [ ] Structured logging do pliku (Winston/Pino)
- [ ] Integracja z systemem monitoringu (Sentry, Datadog)
- [ ] Request ID tracking dla distributed tracing
- [ ] Log levels (error, warn, info, debug)
- [ ] Log rotation i retention policies

## 12. Checklist Implementacji

### Backend Logger
- [ ] Utworzenie `src/lib/utils/logger.ts`
- [ ] Dodanie `ENABLE_ERROR_LOGGING` do `src/env.d.ts`
- [ ] Utworzenie `src/lib/http/error-handler.ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id]/weather/refresh.ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id].ts`
- [ ] Modyfikacja `src/pages/api/plans/index.ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id]/grid/area-type.ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id]/grid/cells/[x]/[y].ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id]/grid/cells.ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id]/plants/[x]/[y].ts`
- [ ] Modyfikacja `src/pages/api/plans/[plan_id]/plants.ts`
- [ ] Modyfikacja `src/pages/api/profile.ts`
- [ ] Modyfikacja `src/pages/api/analytics/events.ts`
- [ ] Modyfikacja endpointów auth (5 plików)
- [ ] Testowanie włączenia/wyłączenia loggera
- [ ] Testowanie różnych typów błędów

### Frontend Toast Handler
- [ ] Utworzenie `src/lib/utils/api-error-mapper.ts`
- [ ] Utworzenie `src/lib/utils/toast-error-handler.ts`
- [ ] Modyfikacja `src/lib/hooks/mutations/useRefreshWeather.ts`
- [ ] Modyfikacja `src/lib/hooks/mutations/useUpdatePlan.ts`
- [ ] Modyfikacja `src/lib/hooks/mutations/useSetAreaType.ts`
- [ ] Modyfikacja `src/lib/hooks/mutations/usePlantMutations.ts`
- [ ] Modyfikacja `src/lib/hooks/mutations/useAIMutations.ts`
- [ ] Testowanie różnych typów błędów
- [ ] Testowanie opcji `skipToast` i `customMessage`
- [ ] Opcjonalne uproszczenie komponentów

---

**Status:** 📋 Plan gotowy do implementacji  
**Następny krok:** Rozpoczęcie Fazy 1 - Backend Logger

