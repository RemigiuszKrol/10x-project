# OpenRouter Implementation Summary - PlantsPlaner

**Data implementacji:** 2025-11-23  
**Status:** ✅ Completed  
**Czas implementacji:** ~3h

---

## Zaimplementowane komponenty

### 1. Serwis OpenRouter (`src/lib/services/openrouter.service.ts`)

Kompleksowa implementacja serwisu AI zawierająca:

#### Interfejsy i typy

- `OpenRouterConfig` - konfiguracja serwisu
- `PlantFitContext` - kontekst dla oceny dopasowania rośliny
- `CompletionConfig` - konfiguracja zapytania do API
- `ResponseFormat` - format odpowiedzi JSON Schema

#### Hierarchia błędów

- `OpenRouterError` - bazowa klasa błędów
- `TimeoutError` - przekroczenie limitu czasu (10s)
- `RateLimitError` - zbyt wiele zapytań
- `AuthenticationError` - niepoprawny API key
- `ValidationError` - niepoprawna odpowiedź AI
- `NetworkError` - błąd połączenia
- `InsufficientCreditsError` - brak środków na koncie

#### Metody publiczne

- `searchPlants(query: string)` - wyszukiwanie roślin po nazwie
- `checkPlantFit(context: PlantFitContext)` - ocena dopasowania rośliny
- `testConnection()` - test połączenia z API

#### Metody prywatne

- `normalizeConfig()` - normalizacja konfiguracji z defaultami
- `validateConfig()` - walidacja parametrów konfiguracji
- `buildSystemPrompt()` - generowanie promptów systemowych dla search/fit
- `buildUserPrompt()` - generowanie promptów użytkownika
- `buildResponseFormat()` - budowanie JSON Schema dla wymuszenia formatu
- `createCompletion()` - wykonanie zapytania do OpenRouter API
- `handleHttpError()` - mapowanie błędów HTTP na błędy domenowe
- `transformError()` - przekształcanie błędów fetch/timeout
- `validateResponse()` - walidacja odpowiedzi z użyciem Zod schemas
- `executeWithRetry()` - retry logic z exponential backoff
- `sanitizeUserInput()` - sanityzacja danych wejściowych
- `logError()` - logowanie błędów (console w dev, Sentry w prod)

#### Zabezpieczenia

- Timeout 10s (zgodnie z wymaganiami MVP)
- Retry logic z exponential backoff (1s, 2s, 4s...)
- Sanityzacja inputów użytkownika (max 200 znaków, usunięcie HTML)
- Walidacja odpowiedzi AI (Zod schemas)
- Obsługa rate limiting (429)
- Logowanie błędów bez ujawniania API key

---

### 2. Singleton instance (`src/lib/services/openrouter.instance.ts`)

Singleton pattern dla serwisu OpenRouter:

- `getOpenRouterService()` - zwraca singleton instance z automatyczną inicjalizacją
- `resetOpenRouterService()` - resetuje instance (dla testów)

**Inicjalizacja ze zmiennych środowiskowych:**

- `OPENROUTER_API_KEY` (wymagany)
- `OPENROUTER_SEARCH_MODEL` (domyślnie: `openai/gpt-4o-mini`)
- `OPENROUTER_FIT_MODEL` (domyślnie: `openai/gpt-4o-mini`)
- `OPENROUTER_APP_NAME` (domyślnie: `PlantsPlaner`)
- `OPENROUTER_SITE_URL` (opcjonalny)

---

### 3. API Endpoints

#### POST `/api/ai/plants/search` (`src/pages/api/ai/plants/search.ts`)

Wyszukiwanie roślin po nazwie używając AI.

**Request body:**

```json
{
  "query": "pomidor"
}
```

**Response 200:**

```json
{
  "data": {
    "candidates": [
      {
        "name": "Pomidor",
        "latin_name": "Solanum lycopersicum",
        "source": "ai"
      }
    ]
  }
}
```

**Obsługa błędów:**

- 401 Unauthorized - brak użytkownika
- 400 ValidationError - nieprawidłowe zapytanie (min 2, max 200 znaków)
- 429 RateLimited - zbyt wiele zapytań
- 504 UpstreamTimeout - AI nie odpowiada (>10s)
- 500 InternalError - nieznany błąd

---

#### POST `/api/ai/plants/fit` (`src/pages/api/ai/plants/fit.ts`)

Sprawdzanie dopasowania rośliny do warunków działki.

**Request body:**

```json
{
  "plan_id": "uuid",
  "x": 5,
  "y": 10,
  "plant_name": "Pomidor"
}
```

**Response 200:**

```json
{
  "data": {
    "sunlight_score": 5,
    "humidity_score": 4,
    "precip_score": 4,
    "overall_score": 5,
    "explanation": "Pomidor wymaga pełnego słońca (6-8h dziennie) i umiarkowanego podlewania..."
  }
}
```

**Obsługa błędów:**

- 401 Unauthorized - brak użytkownika
- 400 ValidationError - nieprawidłowe dane
- 403 Forbidden - brak dostępu do planu
- 404 NotFound - plan nie istnieje
- 422 UnprocessableEntity - komórka nie istnieje lub nie jest typu 'soil'
- 429 RateLimited - zbyt wiele zapytań
- 504 UpstreamTimeout - AI nie odpowiada (>10s)
- 500 InternalError - nieznany błąd

**Logika endpointu:**

1. Sprawdzenie autoryzacji użytkownika
2. Walidacja request body (Zod)
3. Pobranie danych planu z bazy (lokalizacja, orientacja, hemisphere)
4. Weryfikacja uprawnień użytkownika (czy plan należy do użytkownika)
5. Sprawdzenie typu komórki (musi być 'soil')
6. Pobranie danych pogodowych miesięcznych z `weather_monthly`
7. Przygotowanie kontekstu dla AI (lokalizacja, klimat, pogoda)
8. Wywołanie `openRouterService.checkPlantFit()`
9. Zwrócenie wyniku oceny

---

### 4. Konfiguracja zmiennych środowiskowych

#### `.env.example`

```bash
# OpenRouter API key
OPENROUTER_API_KEY=###

# OpenRouter Models Configuration
OPENROUTER_SEARCH_MODEL=openai/gpt-4o-mini
OPENROUTER_FIT_MODEL=openai/gpt-4o-mini
OPENROUTER_APP_NAME=PlantsPlaner
OPENROUTER_SITE_URL=

# AI Mock Data Toggle
PUBLIC_USE_MOCK_AI=false
```

#### `src/env.d.ts`

Dodano typowanie dla nowych zmiennych środowiskowych:

- `OPENROUTER_API_KEY`
- `OPENROUTER_SEARCH_MODEL`
- `OPENROUTER_FIT_MODEL`
- `OPENROUTER_APP_NAME`
- `OPENROUTER_SITE_URL`
- `PUBLIC_USE_MOCK_AI`

---

### 5. Test script (`scripts/test-openrouter.ts`)

Skrypt testowy do weryfikacji działania serwisu OpenRouter:

**Testy:**

1. **Connection test** - sprawdza połączenie z OpenRouter API
2. **Search test** - testuje wyszukiwanie roślin (query: "pomidor")
3. **Fit test** - testuje ocenę dopasowania (Pomidor w Warszawie)

**Uruchomienie:**

```bash
npm run test:openrouter
```

**Wymagania:**

- Skonfigurowany `OPENROUTER_API_KEY` w `.env`
- Zainstalowane zależności: `tsx`, `dotenv`

---

## Zależności

### Zainstalowane pakiety

- `openai` (v6.9.1) - SDK kompatybilny z OpenRouter API
- `tsx` (v4.20.6) - TypeScript execution dla test scriptu
- `dotenv` (v17.2.3) - ładowanie zmiennych środowiskowych

### Istniejące zależności

- `zod` (v3.23.8) - walidacja schematów
- `@tanstack/react-query` (v5.90.10) - hooki do mutations

---

## Prompty AI

### Search prompt (system)

- Ekspert ogrodniczy
- Zwraca 1-5 najbardziej pasujących roślin
- Rozpoznaje język zapytania (polski, angielski, łaciński)
- Preferuje rośliny ogrodowe nad dzikimi
- Wymusza format JSON z nazwą zwyczajną i łacińską

### Fit prompt (system)

- Ekspert ogrodniczy oceniający dopasowanie
- System scoringu 1-5:
  - 5 (Doskonałe): ≥90% zgodności
  - 4 (Dobre): 80-89% zgodności
  - 3 (Przeciętne): 70-79% zgodności
  - 2 (Słabe): 60-69% zgodności
  - 1 (Złe): <60% zgodności
- Wagi sezonów (półkula północna):
  - Kwiecień-Wrzesień: waga 2x (sezon wzrostu)
  - Październik-Marzec: waga 1x
- Metryki: sunlight_score, humidity_score, precip_score, overall_score
- Wymusza wyjaśnienie min 50 znaków

---

## Zgodność z istniejącym kodem

### Hooki React Query

Istniejące hooki w `src/lib/hooks/mutations/useAIMutations.ts` są w pełni kompatybilne:

- `useSearchPlants()` - wywołuje `/api/ai/plants/search`
- `useCheckPlantFit()` - wywołuje `/api/ai/plants/fit`

### Mock service

Stary mock service w `src/lib/services/ai.service.ts` nadal działa dla trybu developmentu z `PUBLIC_USE_MOCK_AI=true`.

---

## Checklist deployment

### Przed deploymentem

- [x] `.env` ma poprawny `OPENROUTER_API_KEY`
- [x] `.env.example` jest zaktualizowany (BEZ prawdziwego klucza!)
- [x] `.gitignore` zawiera `.env` i `.env.local`
- [x] Dokumentacja jest aktualna
- [x] Wszystkie pliki bez błędów lintingu

### Po deploymencie

- [ ] Sprawdź Dashboard OpenRouter: https://openrouter.ai/activity
- [ ] Monitoruj koszty przez pierwszy tydzień
- [ ] Ustaw alerty na OpenRouter (>$X dziennie)
- [ ] Sprawdź logi serwera pod kątem błędów AI
- [ ] Przygotuj plan B (fallback do mock data) w razie problemów

---

## Dalszy rozwój (post-MVP)

Możliwe optymalizacje i rozszerzenia:

- Caching odpowiedzi AI (Redis)
- Streaming responses dla fit (server-sent events)
- Multimodal AI (image recognition dla roślin)
- Fine-tuning modeli na custom data
- A/B testing różnych promptów
- Cost optimization (tańsze modele dla prostych zapytań)
- Rate limiting po stronie aplikacji (obecnie tylko OpenRouter)
- Monitoring i alerty (Sentry/LogRocket)

---

## Podsumowanie

✅ **Zaimplementowano pełną integrację z OpenRouter:**

- Serwis OpenRouter z pełną obsługą błędów i retry logic
- 2 endpointy API (search, fit)
- Test script do weryfikacji
- Dokumentacja i konfiguracja środowiskowa
- Zgodność z istniejącym kodem (hooki, typy)

🎯 **Zgodność z planem implementacji:**

- Wszystkie wymagania MVP spełnione
- Timeout 10s
- Rate limiting (429)
- Strukturyzowane odpowiedzi (JSON Schema)
- Walidacja (Zod)
- Retry logic (exponential backoff)
- Mock mode dla developmentu

🚀 **Gotowe do testów i deploymentu!**
