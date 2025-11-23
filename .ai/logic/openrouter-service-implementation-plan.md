# Plan Wdrożenia Usługi OpenRouter - PlantsPlaner

**Data utworzenia:** 2025-11-23  
**Wersja:** 1.0  
**Status:** Ready for Implementation  
**Zakres:** Kompleksowy przewodnik implementacji serwisu OpenRouter dla funkcji AI w PlantsPlaner

---

## 1. Opis usługi

### 1.1 Cel biznesowy

Usługa OpenRouter stanowi kluczowy komponent integracji AI w PlantsPlaner, umożliwiając:

1. **Wyszukiwanie roślin** - Inteligentne wyszukiwanie roślin po nazwie zwyczajnej/łacińskiej z wykorzystaniem modeli językowych (LLM)
2. **Ocena dopasowania rośliny** - Analiza zgodności wymagań hodowlanych rośliny z warunkami klimatycznymi działki

### 1.2 Wymagania funkcjonalne

- **Timeout:** maksymalnie 10 sekund na zapytanie (wymaganie MVP)
- **Rate limiting:** obsługa błędów 429 (zbyt wiele zapytań)
- **Strukturyzowane odpowiedzi:** wymuszenie formatu JSON przez `response_format`
- **Walidacja:** sanity-check odpowiedzi AI po stronie aplikacji (Zod schemas)
- **Retry logic:** pojedyncze ponowienie w przypadku błędu sieciowego
- **Mock mode:** możliwość pracy bez faktycznego providera AI (development)

### 1.3 Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useAIMutations (React Query hooks)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (fetch)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Astro API Routes)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/ai/plants/search                               │   │
│  │  /api/ai/plants/fit                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  OpenRouterService (nowa usługa)                     │   │
│  │  - createCompletion()                                │   │
│  │  - buildSystemPrompt()                               │   │
│  │  - buildUserPrompt()                                 │   │
│  │  - validateResponse()                                │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenRouter API                                  │
│  https://openrouter.ai/api/v1/chat/completions              │
│  - Model selection (openai/gpt-4o-mini)            │
│  - JSON mode (response_format)                              │
│  - Streaming (opcjonalnie)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Opis konstruktora

### 2.1 Interfejs konfiguracji

```typescript
/**
 * Konfiguracja usługi OpenRouter
 */
export interface OpenRouterConfig {
  /** Klucz API z OpenRouter (OPENROUTER_API_KEY) */
  apiKey: string;
  
  /** Base URL API (domyślnie: https://openrouter.ai/api/v1) */
  baseUrl?: string;
  
  /** Model do wyszukiwania roślin (szybszy, tańszy) */
  searchModel: string;
  
  /** Model do oceny dopasowania (bardziej zaawansowany) */
  fitModel: string;
  
  /** Timeout w milisekundach (domyślnie: 10000) */
  timeout?: number;
  
  /** Maksymalna liczba prób ponowienia (domyślnie: 1) */
  maxRetries?: number;
  
  /** Temperatura modelu (0-2, domyślnie: 0.7) */
  temperature?: number;
  
  /** Top P sampling (0-1, domyślnie: 1) */
  topP?: number;
  
  /** Maksymalna liczba tokenów w odpowiedzi (domyślnie: 1000) */
  maxTokens?: number;
  
  /** Identyfikator aplikacji dla OpenRouter (opcjonalny) */
  appName?: string;
  
  /** URL strony aplikacji (opcjonalny) */
  siteUrl?: string;
}
```

### 2.2 Przykład inicjalizacji

```typescript
// src/lib/services/openrouter.service.ts

import { OpenRouterService } from './openrouter.service';

// Inicjalizacja z minimalnymi parametrami
const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  searchModel: 'openai/gpt-4o-mini', 
  fitModel: 'openai/gpt-4o-mini', 
});

// Inicjalizacja z pełną konfiguracją
const openRouterServiceFull = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: 'https://openrouter.ai/api/v1',
  searchModel: 'openai/gpt-4o-mini',
  fitModel: 'openai/gpt-4o-mini',
  timeout: 10000,
  maxRetries: 1,
  temperature: 0.7,
  topP: 1,
  maxTokens: 1000,
  appName: 'PlantsPlaner',
  siteUrl: 'https://plantsplaner.app',
});
```

### 2.3 Walidacja konfiguracji

Konstruktor powinien walidować:
- `apiKey` nie może być pusty
- `timeout` > 0
- `maxRetries` >= 0
- `temperature` w zakresie 0-2
- `topP` w zakresie 0-1
- `maxTokens` > 0
- Nazwy modeli są niepuste stringi

---

## 3. Publiczne metody i pola

### 3.1 Metoda `searchPlants()`

#### Sygnatura

```typescript
async searchPlants(query: string): Promise<PlantSearchResultDto>
```

#### Parametry

- **query** (string): Nazwa rośliny wpisana przez użytkownika (np. "pomidor", "tomato", "Solanum lycopersicum")

#### Zwraca

```typescript
interface PlantSearchResultDto {
  candidates: Array<{
    name: string;           // Nazwa zwyczajna
    latin_name?: string;    // Nazwa łacińska (opcjonalna)
    source: "ai";           // Zawsze "ai"
  }>;
}
```

#### Opis działania

1. Buduje system prompt z instrukcjami dla AI
2. Buduje user prompt z query użytkownika
3. Wywołuje OpenRouter API z modelem `searchModel`
4. Wymusza format JSON przez `response_format`
5. Waliduje odpowiedź (Zod schema)
6. Zwraca 1-5 kandydatów

#### Przykład użycia

```typescript
const result = await openRouterService.searchPlants("pomidor");
console.log(result.candidates);
// [
//   { name: "Pomidor", latin_name: "Solanum lycopersicum", source: "ai" },
//   { name: "Pomidor koktajlowy", latin_name: "Solanum lycopersicum var. cerasiforme", source: "ai" }
// ]
```

---

### 3.2 Metoda `checkPlantFit()`

#### Sygnatura

```typescript
async checkPlantFit(context: PlantFitContext): Promise<PlantFitResultDto>
```

#### Parametry

```typescript
interface PlantFitContext {
  plant_name: string;        // Nazwa rośliny
  location: {
    lat: number;             // Szerokość geograficzna
    lon: number;             // Długość geograficzna
    address?: string;        // Adres (opcjonalny)
  };
  orientation: number;       // Orientacja działki 0-359° (0 = północ)
  climate: {
    zone?: string;           // Strefa klimatyczna (np. "6a")
    annual_temp_avg: number; // Średnia temp. roczna (°C)
    annual_precip: number;   // Roczne opady (mm)
    frost_free_days?: number;// Dni bez przymrozków
  };
  cell: {
    x: number;               // Współrzędna X
    y: number;               // Współrzędna Y
    sunlight_hours?: number; // Nasłonecznienie (h/dzień)
  };
  weather_monthly?: Array<{  // Dane miesięczne z Open-Meteo
    month: number;           // 1-12
    temperature: number;     // °C
    sunlight: number;        // Znormalizowane 0-100
    humidity: number;        // Znormalizowane 0-100
    precip: number;          // Znormalizowane 0-100
  }>;
}
```

#### Zwraca

```typescript
interface PlantFitResultDto {
  sunlight_score: number;    // 1-5
  humidity_score: number;    // 1-5
  precip_score: number;      // 1-5
  overall_score: number;     // 1-5
  explanation?: string;      // Wyjaśnienie (min 50 znaków)
}
```

#### Opis działania

1. Buduje system prompt z instrukcjami scoringu (progi, wagi sezonów)
2. Buduje user prompt z pełnym kontekstem (klimat, pogoda, lokalizacja)
3. Wywołuje OpenRouter API z modelem `fitModel`
4. Wymusza format JSON z JSON Schema
5. Waliduje odpowiedź (scores 1-5, explanation)
6. Zwraca wynik oceny

#### Przykład użycia

```typescript
const result = await openRouterService.checkPlantFit({
  plant_name: "Pomidor",
  location: { lat: 52.2297, lon: 21.0122, address: "Warszawa" },
  orientation: 180,
  climate: {
    zone: "6a",
    annual_temp_avg: 8.5,
    annual_precip: 550,
    frost_free_days: 180
  },
  cell: { x: 5, y: 10, sunlight_hours: 7 },
  weather_monthly: [
    { month: 4, temperature: 9, sunlight: 60, humidity: 70, precip: 40 },
    { month: 5, temperature: 14, sunlight: 70, humidity: 65, precip: 55 },
    // ... więcej miesięcy
  ]
});

console.log(result);
// {
//   sunlight_score: 5,
//   humidity_score: 4,
//   precip_score: 4,
//   overall_score: 5,
//   explanation: "Pomidor wymaga pełnego słońca (6-8h dziennie) i umiarkowanego podlewania..."
// }
```

---

### 3.3 Metoda `testConnection()`

#### Sygnatura

```typescript
async testConnection(): Promise<{ success: boolean; model?: string; error?: string }>
```

#### Opis

Testuje połączenie z OpenRouter API i sprawdza poprawność API key. Przydatne do:
- Weryfikacji konfiguracji podczas deploymentu
- Health checks
- Debugowania problemów z połączeniem

#### Przykład

```typescript
const status = await openRouterService.testConnection();
if (status.success) {
  console.log(`✅ Połączono z modelem: ${status.model}`);
} else {
  console.error(`❌ Błąd połączenia: ${status.error}`);
}
```

---

## 4. Prywatne metody i pola

### 4.1 `buildSystemPrompt(type: 'search' | 'fit'): string`

Tworzy prompt systemowy dostosowany do typu operacji.

#### Dla `search`:

```typescript
Jesteś ekspertem ogrodniczym specjalizującym się w botanice i roślinach ogrodowych.
Twoim zadaniem jest znalezienie 1-5 najbardziej pasujących roślin ogrodowych na podstawie zapytania użytkownika.

ZASADY:
1. Rozpoznaj język zapytania (polski, angielski, łaciński)
2. Zwróć rośliny w tej samej kolejności co trafność dopasowania
3. Dla każdej rośliny podaj:
   - name: Nazwa zwyczajna w języku zapytania
   - latin_name: Pełna nazwa naukowa (genus + species + var. jeśli dotyczy)
   - source: Zawsze "ai"
4. Jeśli zapytanie jest wieloznaczne, zwróć różne interpretacje
5. Preferuj rośliny ogrodowe (warzywa, kwiaty, zioła, drzewa owocowe) nad dzikimi

FORMAT ODPOWIEDZI:
{
  "candidates": [
    {
      "name": "Nazwa zwyczajna",
      "latin_name": "Genus species var. varietatis",
      "source": "ai"
    }
  ]
}

WAŻNE: Zwróć TYLKO poprawny JSON bez dodatkowych komentarzy.
```

#### Dla `fit`:

```typescript
Jesteś ekspertem ogrodniczym oceniającym dopasowanie rośliny do warunków działki.
Otrzymasz szczegółowe dane klimatyczne i musisz ocenić, jak dobrze roślina będzie rosła w tych warunkach.

SYSTEM SCORINGU (1-5):
- 5 (Doskonałe): Warunki idealne, ≥90% zgodności z wymaganiami
- 4 (Dobre): Warunki sprzyjające, 80-89% zgodności
- 3 (Przeciętne): Roślina przeżyje, ale nie osiągnie pełni potencjału, 70-79% zgodności
- 2 (Słabe): Warunki trudne, wymaga intensywnej opieki, 60-69% zgodności
- 1 (Złe): Warunki nieodpowiednie, <60% zgodności, roślina prawdopodobnie nie przeżyje

WAGI SEZONÓW (dla półkuli północnej):
- Kwiecień-Wrzesień (miesiące 4-9): waga 2x (sezon wzrostu)
- Październik-Marzec (miesiące 10-3): waga 1x

METRYKI DO OCENY:
1. sunlight_score: Nasłonecznienie (sunlight + sunlight_hours)
2. humidity_score: Wilgotność powietrza (humidity)
3. precip_score: Opady (precip)
4. overall_score: Ogólna ocena (weighted average z wagami sezonów)

FORMAT ODPOWIEDZI:
{
  "sunlight_score": 1-5,
  "humidity_score": 1-5,
  "precip_score": 1-5,
  "overall_score": 1-5,
  "explanation": "Szczegółowe wyjaśnienie uwzględniające: specyficzne wymagania rośliny, analizę danych klimatycznych, rekomendacje (min 50 znaków)"
}

WAŻNE:
- Zwróć TYLKO poprawny JSON bez dodatkowych komentarzy
- explanation MUSI mieć minimum 50 znaków
- Wszystkie scores MUSZĄ być liczbami całkowitymi 1-5
```

---

### 4.2 `buildUserPrompt(type: 'search', data: {...}): string`

Tworzy prompt użytkownika z kontekstem zapytania.

#### Dla `search`:

```typescript
Użytkownik wpisał: "{query}"

Znajdź najbardziej pasujące rośliny ogrodowe.
```

#### Dla `fit`:

```typescript
Oceń dopasowanie rośliny "{plant_name}" do następujących warunków:

LOKALIZACJA:
- Szerokość: {lat}°N
- Długość: {lon}°E
- Adres: {address}
- Strefa klimatyczna: {climate.zone}
- Orientacja działki: {orientation}° (0 = północ)

KLIMAT ROCZNY:
- Średnia temperatura: {climate.annual_temp_avg}°C
- Opady roczne: {climate.annual_precip}mm
- Dni bez przymrozków: {climate.frost_free_days}

POZYCJA NA DZIAŁCE:
- Komórka: ({cell.x}, {cell.y})
- Szacowane nasłonecznienie: {cell.sunlight_hours}h/dzień

DANE MIESIĘCZNE (średnie):
{weather_monthly.map(m => `
- Miesiąc ${m.month}: temp ${m.temperature}°C, słońce ${m.sunlight}/100, wilgotność ${m.humidity}/100, opady ${m.precip}/100
`).join('')}

Oceń dopasowanie rośliny do tych warunków.
```

---

### 4.3 `buildResponseFormat(type: 'search' | 'fit'): ResponseFormat`

Buduje strukturę `response_format` dla JSON Schema mode.

#### Dla `search`:

```typescript
{
  type: 'json_schema',
  json_schema: {
    name: 'plant_search_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              latin_name: { type: 'string' },
              source: { type: 'string', enum: ['ai'] }
            },
            required: ['name', 'source'],
            additionalProperties: false
          },
          minItems: 1,
          maxItems: 5
        }
      },
      required: ['candidates'],
      additionalProperties: false
    }
  }
}
```

#### Dla `fit`:

```typescript
{
  type: 'json_schema',
  json_schema: {
    name: 'plant_fit_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sunlight_score: { type: 'integer', minimum: 1, maximum: 5 },
        humidity_score: { type: 'integer', minimum: 1, maximum: 5 },
        precip_score: { type: 'integer', minimum: 1, maximum: 5 },
        overall_score: { type: 'integer', minimum: 1, maximum: 5 },
        explanation: { type: 'string', minLength: 50 }
      },
      required: ['sunlight_score', 'humidity_score', 'precip_score', 'overall_score', 'explanation'],
      additionalProperties: false
    }
  }
}
```

---

### 4.4 `createCompletion(config: {...}): Promise<Response>`

Niskopoziomowa metoda wykonująca zapytanie do OpenRouter API.

#### Parametry

```typescript
interface CompletionConfig {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  response_format: ResponseFormat;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}
```

#### Implementacja

```typescript
private async createCompletion(config: CompletionConfig): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

  try {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.config.siteUrl || '',
        'X-Title': this.config.appName || '',
      },
      body: JSON.stringify({
        model: config.model,
        messages: config.messages,
        response_format: config.response_format,
        temperature: config.temperature ?? this.config.temperature,
        top_p: config.top_p ?? this.config.topP,
        max_tokens: config.max_tokens ?? this.config.maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await this.handleHttpError(response);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw this.transformError(error);
  }
}
```

---

### 4.5 `handleHttpError(response: Response): Promise<Error>`

Przekształca błędy HTTP na domenowe błędy aplikacji.

```typescript
private async handleHttpError(response: Response): Promise<Error> {
  const status = response.status;
  
  // 401: Niepoprawny API key
  if (status === 401) {
    return new Error('OPENROUTER_API_KEY jest niepoprawny lub wygasł');
  }
  
  // 429: Rate limit
  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    return new Error(`Rate limit przekroczony. Spróbuj ponownie za ${retryAfter}s`);
  }
  
  // 402: Brak środków
  if (status === 402) {
    return new Error('Brak środków na koncie OpenRouter. Doładuj konto.');
  }
  
  // 500+: Błąd serwera OpenRouter
  if (status >= 500) {
    return new Error('OpenRouter API jest niedostępne. Spróbuj później.');
  }
  
  // Inne błędy
  const errorBody = await response.text();
  return new Error(`OpenRouter API error (${status}): ${errorBody}`);
}
```

---

### 4.6 `transformError(error: unknown): Error`

Przekształca błędy fetch/timeout na przyjazne komunikaty.

```typescript
private transformError(error: unknown): Error {
  // Timeout (AbortError)
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error('Przekroczono limit czasu (10s). Spróbuj ponownie.');
  }
  
  // Network error
  if (error instanceof TypeError) {
    return new Error('Błąd połączenia z OpenRouter. Sprawdź internet.');
  }
  
  // Już przekształcony błąd
  if (error instanceof Error) {
    return error;
  }
  
  // Nieznany błąd
  return new Error('Nieznany błąd komunikacji z AI');
}
```

---

### 4.7 `validateResponse(data: unknown, type: 'search' | 'fit'): T`

Waliduje odpowiedź z użyciem Zod schemas.

```typescript
import { z } from 'zod';

// Schema dla search
const PlantSearchResultSchema = z.object({
  candidates: z.array(
    z.object({
      name: z.string().min(1),
      latin_name: z.string().optional(),
      source: z.literal('ai'),
    })
  ).min(1).max(5),
});

// Schema dla fit
const PlantFitResultSchema = z.object({
  sunlight_score: z.number().int().min(1).max(5),
  humidity_score: z.number().int().min(1).max(5),
  precip_score: z.number().int().min(1).max(5),
  overall_score: z.number().int().min(1).max(5),
  explanation: z.string().min(50),
});

private validateResponse<T>(data: unknown, type: 'search' | 'fit'): T {
  const schema = type === 'search' ? PlantSearchResultSchema : PlantFitResultSchema;
  
  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Niepoprawna odpowiedź AI: ${issues}`);
    }
    throw error;
  }
}
```

---

### 4.8 Prywatne pola

```typescript
class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  
  constructor(config: OpenRouterConfig) {
    this.config = this.normalizeConfig(config);
  }
  
  private normalizeConfig(config: OpenRouterConfig): Required<OpenRouterConfig> {
    return {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
      searchModel: config.searchModel,
      fitModel: config.fitModel,
      timeout: config.timeout || 10000,
      maxRetries: config.maxRetries ?? 1,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 1,
      maxTokens: config.maxTokens ?? 1000,
      appName: config.appName || 'PlantsPlaner',
      siteUrl: config.siteUrl || '',
    };
  }
}
```

---

## 5. Obsługa błędów

### 5.1 Hierarchia błędów

```typescript
/**
 * Bazowa klasa błędów OpenRouter
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * Błąd przekroczenia czasu
 */
export class TimeoutError extends OpenRouterError {
  constructor() {
    super(
      'Przekroczono limit czasu oczekiwania (10s)',
      'TIMEOUT',
      true // retryable
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Błąd rate limiting
 */
export class RateLimitError extends OpenRouterError {
  constructor(retryAfter: number) {
    super(
      `Zbyt wiele zapytań. Spróbuj ponownie za ${retryAfter}s`,
      'RATE_LIMIT',
      true, // retryable
      retryAfter
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Błąd autoryzacji
 */
export class AuthenticationError extends OpenRouterError {
  constructor() {
    super(
      'OPENROUTER_API_KEY jest niepoprawny lub wygasł',
      'AUTHENTICATION',
      false // nie retryable
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Błąd walidacji odpowiedzi
 */
export class ValidationError extends OpenRouterError {
  constructor(details: string) {
    super(
      `Niepoprawna odpowiedź AI: ${details}`,
      'VALIDATION',
      false // nie retryable (AI zwróciło złe dane)
    );
    this.name = 'ValidationError';
  }
}

/**
 * Błąd sieci
 */
export class NetworkError extends OpenRouterError {
  constructor() {
    super(
      'Błąd połączenia z OpenRouter',
      'NETWORK',
      true // retryable
    );
    this.name = 'NetworkError';
  }
}

/**
 * Błąd niedostatecznych środków
 */
export class InsufficientCreditsError extends OpenRouterError {
  constructor() {
    super(
      'Brak środków na koncie OpenRouter',
      'INSUFFICIENT_CREDITS',
      false // nie retryable
    );
    this.name = 'InsufficientCreditsError';
  }
}
```

### 5.2 Mapowanie błędów HTTP

| Status | Błąd | Retryable | Komunikat |
|--------|------|-----------|-----------|
| 401 | `AuthenticationError` | ❌ | OPENROUTER_API_KEY jest niepoprawny |
| 402 | `InsufficientCreditsError` | ❌ | Brak środków na koncie |
| 429 | `RateLimitError` | ✅ | Zbyt wiele zapytań (retry after Xs) |
| 500-599 | `NetworkError` | ✅ | Błąd serwera OpenRouter |
| timeout | `TimeoutError` | ✅ | Przekroczono limit czasu (10s) |
| parse error | `ValidationError` | ❌ | Niepoprawna odpowiedź AI |

### 5.3 Strategia retry

```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  retries: number = this.config.maxRetries
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Nie retry dla błędów nie-retryable
      if (error instanceof OpenRouterError && !error.retryable) {
        throw error;
      }
      
      // Ostatnia próba - throw
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`[OpenRouterService] Retry ${attempt + 1}/${retries} po błędzie:`, error);
    }
  }
  
  throw lastError!;
}
```

### 5.4 Logowanie błędów

```typescript
private logError(context: string, error: Error, metadata?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      name: error.name,
      message: error.message,
      code: error instanceof OpenRouterError ? error.code : 'UNKNOWN',
      retryable: error instanceof OpenRouterError ? error.retryable : false,
    },
    metadata,
  };
  
  // Development: console
  if (import.meta.env.DEV) {
    console.error('[OpenRouterService]', logEntry);
  }
  
  // Production: Sentry/LogRocket/etc.
  if (import.meta.env.PROD) {
    // TODO: Integracja z monitoring service
    // Sentry.captureException(error, { contexts: { openrouter: logEntry } });
  }
}
```

---

## 6. Kwestie bezpieczeństwa

### 6.1 Ochrona API Key

#### ✅ Dobre praktyki

```typescript
// .env (NIE commituj do repo!)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx

// .env.example (commituj jako szablon)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

// astro.config.mjs - dostęp tylko na serwerze
export default defineConfig({
  vite: {
    define: {
      'import.meta.env.OPENROUTER_API_KEY': undefined, // Blokuj na kliencie
    }
  }
});
```

#### ❌ Złe praktyki

```typescript
// NIE rob tego - API key w kodzie klienta!
const apiKey = import.meta.env.PUBLIC_OPENROUTER_API_KEY; // ❌

// NIE rob tego - hardcoded API key
const apiKey = "sk-or-v1-xxxxx"; // ❌

// NIE rob tego - API key w URL/query params
fetch(`https://api.com?key=${apiKey}`); // ❌
```

### 6.2 Rate limiting po stronie aplikacji

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async checkLimit(userId: string, maxPerMinute: number = 10): Promise<boolean> {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Usuń requesty starsze niż 1 minuta
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= maxPerMinute) {
      return false; // Limit przekroczony
    }
    
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    return true;
  }
}

// W API route
const rateLimiter = new RateLimiter();

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.user?.id;
  
  if (!await rateLimiter.checkLimit(userId, 10)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  
  // Kontynuuj...
};
```

### 6.3 Sanityzacja inputów użytkownika

```typescript
private sanitizeUserInput(input: string): string {
  return input
    .trim()
    .slice(0, 200) // Max długość
    .replace(/[<>]/g, '') // Usuń potencjalne tagi HTML
    .replace(/[\r\n]+/g, ' '); // Zamień newlines na spacje
}

// W metodach publicznych
async searchPlants(query: string): Promise<PlantSearchResultDto> {
  const sanitizedQuery = this.sanitizeUserInput(query);
  
  if (!sanitizedQuery || sanitizedQuery.length < 2) {
    throw new Error('Zapytanie musi mieć minimum 2 znaki');
  }
  
  // Kontynuuj z sanitizedQuery...
}
```

### 6.4 Walidacja odpowiedzi AI (Injection Prevention)

```typescript
// Upewnij się, że AI nie może wstrzyknąć złośliwych danych
private validateSearchResult(data: any): PlantSearchResultDto {
  const validated = PlantSearchResultSchema.parse(data);
  
  // Dodatkowa sanityzacja string fields
  validated.candidates = validated.candidates.map(c => ({
    name: this.sanitizeUserInput(c.name),
    latin_name: c.latin_name ? this.sanitizeUserInput(c.latin_name) : undefined,
    source: 'ai' as const,
  }));
  
  return validated;
}
```

### 6.5 Monitoring i alerty

```typescript
// Monitoruj podejrzane zachowania
class SecurityMonitor {
  detectAnomalies(userId: string, requestData: any) {
    // 1. Zbyt wiele identycznych zapytań w krótkim czasie (potential attack)
    // 2. Nietypowe długości zapytań (potential injection)
    // 3. Nietypowe wzorce w danych wejściowych
    
    if (this.isSuspicious(requestData)) {
      this.sendAlert({
        userId,
        reason: 'Suspicious activity detected',
        data: requestData,
      });
    }
  }
}
```

---

## 7. Plan wdrożenia krok po kroku

### Faza 1: Setup i konfiguracja (1-2h)

#### Krok 1.1: Instalacja zależności

```bash
# OpenRouter działa z OpenAI SDK
npm install openai

# Walidacja
npm install zod  # Już zainstalowane w projekcie

# TypeScript types
npm install -D @types/node  # Jeśli brakuje
```

#### Krok 1.2: Konfiguracja zmiennych środowiskowych

Utwórz/zaktualizuj `.env`:

```bash
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here

# Modele (możesz zmienić później)
OPENROUTER_SEARCH_MODEL=openai/gpt-3.5-turbo
OPENROUTER_FIT_MODEL=openai/gpt-4-turbo-preview

# Opcjonalnie
OPENROUTER_APP_NAME=PlantsPlaner
OPENROUTER_SITE_URL=https://plantsplaner.app
```

Zaktualizuj `.env.example` (do commita):

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_SEARCH_MODEL=openai/gpt-4o-mini
OPENROUTER_FIT_MODEL=openai/gpt-4o-mini
OPENROUTER_APP_NAME=PlantsPlaner
OPENROUTER_SITE_URL=
```

#### Krok 1.3: Aktualizacja typu zmiennych środowiskowych

`src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Existing...
  readonly PUBLIC_USE_MOCK_AI?: string;
  
  // OpenRouter (server-only)
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_SEARCH_MODEL?: string;
  readonly OPENROUTER_FIT_MODEL?: string;
  readonly OPENROUTER_APP_NAME?: string;
  readonly OPENROUTER_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

### Faza 2: Implementacja serwisu (3-4h)

#### Krok 2.1: Utworzenie pliku serwisu

Utwórz `src/lib/services/openrouter.service.ts`:

```typescript
import { z } from 'zod';
import type { PlantSearchResultDto, PlantFitResultDto } from '@/types';

// 1. Interfejsy i typy (skopiuj z sekcji 2.1)
export interface OpenRouterConfig { /* ... */ }
export interface PlantFitContext { /* ... */ }

// 2. Klasy błędów (skopiuj z sekcji 5.1)
export class OpenRouterError extends Error { /* ... */ }
export class TimeoutError extends OpenRouterError { /* ... */ }
// ... pozostałe klasy błędów

// 3. Zod schemas (skopiuj z sekcji 4.7)
const PlantSearchResultSchema = z.object({ /* ... */ });
const PlantFitResultSchema = z.object({ /* ... */ });

// 4. Główna klasa serwisu
export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;
  
  constructor(config: OpenRouterConfig) {
    this.config = this.normalizeConfig(config);
    this.validateConfig();
  }
  
  // Publiczne metody (skopiuj z sekcji 3)
  async searchPlants(query: string): Promise<PlantSearchResultDto> { /* ... */ }
  async checkPlantFit(context: PlantFitContext): Promise<PlantFitResultDto> { /* ... */ }
  async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> { /* ... */ }
  
  // Prywatne metody (skopiuj z sekcji 4)
  private normalizeConfig(config: OpenRouterConfig): Required<OpenRouterConfig> { /* ... */ }
  private validateConfig(): void { /* ... */ }
  private buildSystemPrompt(type: 'search' | 'fit'): string { /* ... */ }
  private buildUserPrompt(type: 'search', data: any): string { /* ... */ }
  private buildResponseFormat(type: 'search' | 'fit'): any { /* ... */ }
  private async createCompletion(config: any): Promise<any> { /* ... */ }
  private async handleHttpError(response: Response): Promise<Error> { /* ... */ }
  private transformError(error: unknown): Error { /* ... */ }
  private validateResponse<T>(data: unknown, type: 'search' | 'fit'): T { /* ... */ }
  private async executeWithRetry<T>(operation: () => Promise<T>, retries?: number): Promise<T> { /* ... */ }
  private sanitizeUserInput(input: string): string { /* ... */ }
  private logError(context: string, error: Error, metadata?: any): void { /* ... */ }
}
```

#### Krok 2.2: Singleton instance

Utwórz `src/lib/services/openrouter.instance.ts`:

```typescript
import { OpenRouterService } from './openrouter.service';

/**
 * Singleton instance serwisu OpenRouter
 * Używany przez API routes
 */
let openRouterInstance: OpenRouterService | null = null;

export function getOpenRouterService(): OpenRouterService {
  if (!openRouterInstance) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }
    
    openRouterInstance = new OpenRouterService({
      apiKey,
      searchModel: import.meta.env.OPENROUTER_SEARCH_MODEL || 'openai/gpt-4o-mini',
      fitModel: import.meta.env.OPENROUTER_FIT_MODEL || 'openai/gpt-4o-mini',
      timeout: 10000,
      maxRetries: 1,
      temperature: 0.7,
      topP: 1,
      maxTokens: 1000,
      appName: import.meta.env.OPENROUTER_APP_NAME || 'PlantsPlaner',
      siteUrl: import.meta.env.OPENROUTER_SITE_URL || '',
    });
  }
  
  return openRouterInstance;
}

/**
 * Reset instance (dla testów)
 */
export function resetOpenRouterService(): void {
  openRouterInstance = null;
}
```

---

### Faza 3: Integracja z API routes (2-3h)

#### Krok 3.1: Utworzenie endpoint `/api/ai/plants/search`

Utwórz `src/pages/api/ai/plants/search.ts`:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getOpenRouterService } from '@/lib/services/openrouter.instance';
import type { ApiItemResponse, ApiErrorResponse, PlantSearchResultDto } from '@/types';

// Walidacja request body
const SearchRequestSchema = z.object({
  query: z.string().min(2).max(200),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check (użytkownik musi być zalogowany)
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'Unauthorized',
            message: 'Musisz być zalogowany',
          },
        } satisfies ApiErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Parse i walidacja body
    const body = await request.json();
    const validation = SearchRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'ValidationError',
            message: 'Nieprawidłowe zapytanie',
            details: { field_errors: validation.error.flatten().fieldErrors },
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Rate limiting (opcjonalnie - TODO)
    // await checkRateLimit(locals.user.id);
    
    // 4. Wywołanie OpenRouter
    const openRouter = getOpenRouterService();
    const result = await openRouter.searchPlants(validation.data.query);
    
    // 5. Zwrócenie wyniku
    return new Response(
      JSON.stringify({
        data: result,
      } satisfies ApiItemResponse<PlantSearchResultDto>),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[API] /api/ai/plants/search error:', error);
    
    // Timeout
    if (error instanceof Error && error.message.includes('Przekroczono limit czasu')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UpstreamTimeout',
            message: 'AI nie odpowiada. Spróbuj ponownie lub dodaj roślinę ręcznie.',
          },
        } satisfies ApiErrorResponse),
        { status: 504, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Rate limit
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'RateLimited',
            message: error.message,
          },
        } satisfies ApiErrorResponse),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60',
          } 
        }
      );
    }
    
    // Inne błędy
    return new Response(
      JSON.stringify({
        error: {
          code: 'InternalError',
          message: 'Nie udało się wyszukać roślin',
        },
      } satisfies ApiErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

#### Krok 3.2: Utworzenie endpoint `/api/ai/plants/fit`

Utwórz `src/pages/api/ai/plants/fit.ts`:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getOpenRouterService } from '@/lib/services/openrouter.instance';
import { getSupabaseServerClient } from '@/db/supabase.client';
import type { 
  ApiItemResponse, 
  ApiErrorResponse, 
  PlantFitResultDto,
  PlantFitContext 
} from '@/types';

// Walidacja request body
const FitRequestSchema = z.object({
  plan_id: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  plant_name: z.string().min(1).max(200),
});

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    // 1. Auth check
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'Unauthorized',
            message: 'Musisz być zalogowany',
          },
        } satisfies ApiErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Parse i walidacja body
    const body = await request.json();
    const validation = FitRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'ValidationError',
            message: 'Nieprawidłowe dane',
            details: { field_errors: validation.error.flatten().fieldErrors },
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { plan_id, x, y, plant_name } = validation.data;
    
    // 3. Pobierz dane planu z bazy
    const supabase = getSupabaseServerClient(request, cookies);
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('user_id, latitude, longitude, orientation, hemisphere')
      .eq('id', plan_id)
      .single();
    
    if (planError || !plan) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NotFound',
            message: 'Plan nie został znaleziony',
          },
        } satisfies ApiErrorResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Sprawdź czy użytkownik jest właścicielem planu
    if (plan.user_id !== locals.user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'Forbidden',
            message: 'Brak dostępu do tego planu',
          },
        } satisfies ApiErrorResponse),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 5. Sprawdź czy komórka jest typu 'soil'
    const { data: cell, error: cellError } = await supabase
      .from('grid_cells')
      .select('type')
      .eq('plan_id', plan_id)
      .eq('x', x)
      .eq('y', y)
      .single();
    
    if (cellError || !cell) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UnprocessableEntity',
            message: 'Komórka nie istnieje',
          },
        } satisfies ApiErrorResponse),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (cell.type !== 'soil') {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UnprocessableEntity',
            message: 'Roślinę można dodać tylko na komórce typu "ziemia"',
          },
        } satisfies ApiErrorResponse),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 6. Pobierz dane pogodowe (cached w tabeli weather_monthly)
    const { data: weatherData } = await supabase
      .from('weather_monthly')
      .select('month, temperature, sunlight, humidity, precip')
      .eq('plan_id', plan_id)
      .order('month', { ascending: true });
    
    // 7. Przygotuj kontekst dla AI
    const context: PlantFitContext = {
      plant_name,
      location: {
        lat: plan.latitude!,
        lon: plan.longitude!,
      },
      orientation: plan.orientation,
      climate: {
        annual_temp_avg: weatherData?.reduce((sum, w) => sum + w.temperature, 0) / (weatherData?.length || 1) || 0,
        annual_precip: weatherData?.reduce((sum, w) => sum + w.precip, 0) || 0,
      },
      cell: { x, y },
      weather_monthly: weatherData || [],
    };
    
    // 8. Wywołanie OpenRouter
    const openRouter = getOpenRouterService();
    const result = await openRouter.checkPlantFit(context);
    
    // 9. Zwrócenie wyniku
    return new Response(
      JSON.stringify({
        data: result,
      } satisfies ApiItemResponse<PlantFitResultDto>),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[API] /api/ai/plants/fit error:', error);
    
    // Obsługa błędów (podobnie jak w search)
    if (error instanceof Error && error.message.includes('Przekroczono limit czasu')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UpstreamTimeout',
            message: 'AI nie odpowiada. Możesz dodać roślinę bez oceny dopasowania.',
          },
        } satisfies ApiErrorResponse),
        { status: 504, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: {
          code: 'InternalError',
          message: 'Nie udało się sprawdzić dopasowania rośliny',
        },
      } satisfies ApiErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

### Faza 4: Testing i walidacja (2-3h)

#### Krok 4.1: Test connection script

Utwórz `scripts/test-openrouter.ts`:

```typescript
import { OpenRouterService } from '../src/lib/services/openrouter.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }
  
  const service = new OpenRouterService({
    apiKey,
    searchModel: 'openai/gpt-3.5-turbo',
    fitModel: 'openai/gpt-4-turbo-preview',
    timeout: 10000,
    maxRetries: 1,
  });
  
  console.log('🔍 Testing OpenRouter connection...\n');
  
  // Test 1: Connection
  try {
    const status = await service.testConnection();
    if (status.success) {
      console.log(`✅ Connection OK (model: ${status.model})`);
    } else {
      console.error(`❌ Connection failed: ${status.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
  
  // Test 2: Search
  console.log('\n🔍 Testing plant search...');
  try {
    const searchResult = await service.searchPlants('pomidor');
    console.log('✅ Search OK:');
    console.log(JSON.stringify(searchResult, null, 2));
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
  
  // Test 3: Fit (simplified context)
  console.log('\n🔍 Testing plant fit check...');
  try {
    const fitResult = await service.checkPlantFit({
      plant_name: 'Pomidor',
      location: { lat: 52.2297, lon: 21.0122 },
      orientation: 180,
      climate: {
        annual_temp_avg: 8.5,
        annual_precip: 550,
      },
      cell: { x: 5, y: 10 },
      weather_monthly: [
        { month: 4, temperature: 9, sunlight: 60, humidity: 70, precip: 40 },
        { month: 5, temperature: 14, sunlight: 70, humidity: 65, precip: 55 },
      ],
    });
    console.log('✅ Fit check OK:');
    console.log(JSON.stringify(fitResult, null, 2));
  } catch (error) {
    console.error('❌ Fit check failed:', error);
  }
  
  console.log('\n✨ All tests completed!');
}

main().catch(console.error);
```

Dodaj do `package.json`:

```json
{
  "scripts": {
    "test:openrouter": "tsx scripts/test-openrouter.ts"
  }
}
```

Uruchom:

```bash
npm run test:openrouter
```

#### Krok 4.2: Integracja z istniejącymi hookami

Zaktualizuj `src/lib/hooks/mutations/useAIMutations.ts` - upewnij się, że endpointy są prawidłowe:

```typescript
// Bez zmian - endpointy już są poprawne:
// POST /api/ai/plants/search
// POST /api/ai/plants/fit
```

#### Krok 4.3: Manual testing w aplikacji

1. Ustaw `.env`:
```bash
PUBLIC_USE_MOCK_AI=false
OPENROUTER_API_KEY=sk-or-v1-twoj-klucz
```

2. Uruchom dev server:
```bash
npm run dev
```

3. Testuj flow:
   - Zaloguj się
   - Utwórz plan działki z lokalizacją
   - Przejdź do edytora
   - Kliknij na komórkę typu 'soil'
   - Kliknij "Add Plant"
   - Wyszukaj "pomidor" (search endpoint)
   - Wybierz kandydata (fit endpoint)
   - Sprawdź scores i explanation
   - Potwierdź dodanie

4. Sprawdź:
   - Timeout handling (rozłącz internet na moment)
   - Rate limiting (spróbuj >10 zapytań w minucie)
   - Błędne zapytania (puste, za długie)
   - Invalid cell types (próba dodania na 'path')

---

### Faza 5: Dokumentacja i optymalizacja (1-2h)

#### Krok 5.1: Zaktualizuj dokumentację projektu

Zaktualizuj `.ai/docs/ai-integration-guide.md`:

```markdown
## 4. Integracja z OpenRouter (✅ ZAIMPLEMENTOWANE)

### 4.1 Architektura

PlantsPlaner używa OpenRouter jako unified API dla różnych modeli LLM:
- **Search**: GPT-3.5 Turbo (szybki i tani)
- **Fit**: GPT-4 Turbo Preview (dokładny i zaawansowany)

### 4.2 Konfiguracja

Zobacz `.env.example` dla wymaganych zmiennych środowiskowych.

### 4.3 Użycie

```typescript
import { getOpenRouterService } from '@/lib/services/openrouter.instance';

const openRouter = getOpenRouterService();
const result = await openRouter.searchPlants('pomidor');
```

### 4.4 Modele wspierane

Lista wszystkich dostępnych modeli: https://openrouter.ai/models

Zalecane:
- Search: `openai/gpt-4o-mini`
- Fit: `openai/gpt-4o-mini`

### 4.5 Monitoring kosztów

Dashboard OpenRouter: https://openrouter.ai/activity
```

#### Krok 5.2: README update

Zaktualizuj `README.md`:

```markdown
## AI Integration (OpenRouter)

PlantsPlaner uses OpenRouter for AI-powered plant search and fit assessment.

### Setup

1. Get API key from https://openrouter.ai
2. Add to `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key
```
3. (Optional) Configure models in `.env`

### Development mode

For development without AI provider, use mock data:
```bash
PUBLIC_USE_MOCK_AI=true
```

See `.ai/docs/ai-integration-guide.md` for details.
```

#### Krok 5.3: Optymalizacja promptów

Po testach, możesz zoptymalizować prompty w `buildSystemPrompt()` i `buildUserPrompt()`:

- Skróć prompt jeśli timeout > 8s
- Dodaj przykłady dla lepszej jakości odpowiedzi
- Dostosuj temperature (niższa = deterministyczne, wyższa = kreatywne)

Przykładowa optymalizacja:

```typescript
private buildSystemPrompt(type: 'search'): string {
  if (type === 'search') {
    return `You are a botanical expert. Find 1-5 garden plants matching the user's query.

RULES:
1. Recognize language (Polish, English, Latin)
2. Order by relevance
3. Return format:
{
  "candidates": [
    { "name": "Common name", "latin_name": "Genus species", "source": "ai" }
  ]
}

Return ONLY valid JSON.`;
  }
  // ... fit prompt
}
```

---

### Faza 6: Deployment checklist (30min)

#### Przed deploymentem

- [ ] `.env` ma poprawny `OPENROUTER_API_KEY`
- [ ] `.env.example` jest zaktualizowany (BEZ prawdziwego klucza!)
- [ ] `.gitignore` zawiera `.env` i `.env.local`
- [ ] Rate limiting działa (test ręczny)
- [ ] Error handling działa (test timeout, rate limit)
- [ ] Logi nie zawierają API key (NIGDY nie loguj `apiKey`)
- [ ] Dokumentacja jest aktualna
- [ ] Test suite przechodzi (`npm run test:openrouter`)

#### Po deploymencie

- [ ] Sprawdź Dashboard OpenRouter: https://openrouter.ai/activity
- [ ] Monitoruj koszty przez pierwszy tydzień
- [ ] Ustaw alerty na OpenRouter (>$X dziennie)
- [ ] Sprawdź logi serwera pod kątem błędów AI
- [ ] Przygotuj plan B (fallback do mock data) w razie problemów

---

## 8. Podsumowanie

### Co zostało osiągnięte

Po zaimplementowaniu tego planu będziesz miał:

1. ✅ **Pełną integrację z OpenRouter** - działająca komunikacja z różnymi modelami LLM
2. ✅ **Strukturyzowane odpowiedzi** - wymuszony format JSON przez `response_format`
3. ✅ **Sanity-check** - walidacja Zod dla odpowiedzi AI
4. ✅ **Timeout handling** - maksymalnie 10s na zapytanie
5. ✅ **Rate limiting** - obsługa błędów 429
6. ✅ **Retry logic** - automatyczne ponowienie dla błędów network/timeout
7. ✅ **Error handling** - przyjazne komunikaty dla użytkownika
8. ✅ **Security** - ochrona API key, sanityzacja inputów
9. ✅ **Mock mode** - development bez faktycznego AI providera
10. ✅ **Dokumentacja** - kompleksowy przewodnik i przykłady

### Szacowany czas implementacji

- **Faza 1 (Setup):** 1-2h
- **Faza 2 (Serwis):** 3-4h
- **Faza 3 (API routes):** 2-3h
- **Faza 4 (Testing):** 2-3h
- **Faza 5 (Docs):** 1-2h
- **Faza 6 (Deploy):** 30min

**Łącznie:** ~10-15h (1 developer)

### Dalszy rozwój (post-MVP)

- Caching odpowiedzi AI (Redis)
- Streaming responses dla fit (server-sent events)
- Multimodal AI (image recognition dla roślin)
- Fine-tuning modeli na custom data
- A/B testing różnych promptów
- Cost optimization (tańsze modele dla prostych zapytań)

### Wsparcie

W razie problemów:
1. Sprawdź `.ai/docs/ai-integration-guide.md` (troubleshooting)
2. Uruchom `npm run test:openrouter` (diagnostyka)
3. Sprawdź logi OpenRouter Dashboard
4. Włącz mock mode i porównaj zachowanie

---

**Dokument utworzony:** 2025-11-23  
**Autor:** AI Architect Assistant  
**Status:** ✅ Ready for Implementation

**Powodzenia z implementacją! 🚀**

