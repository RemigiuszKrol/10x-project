# AI Integration Guide - PlantsPlanner

**Data utworzenia:** 2025-11-22  
**Status:** Ready for AI Provider Integration  
**Zakres:** Dokumentacja integracji AI dla wyszukiwania roślin i oceny dopasowania

---

## 1. Przegląd

PlantsPlanner wykorzystuje AI do dwóch kluczowych funkcjonalności:

1. **Plant Search** - Wyszukiwanie roślin po nazwie zwyczajnej/łacińskiej
2. **Plant Fit Assessment** - Ocena dopasowania rośliny do warunków klimatycznych działki

### Architektura modułu AI

```
src/lib/
├── services/
│   └── ai.service.ts          # AIService - główna logika komunikacji
├── integrations/
│   └── ai.config.ts            # Konfiguracja (endpoints, timeout, mock toggle)
├── validation/
│   └── ai.validation.ts        # Zod schemas dla walidacji responses
├── utils/
│   └── ai-errors.ts            # Error handling utilities
├── hooks/
│   ├── useAIService.ts         # React hook wrapping AIService
│   ├── useAIValidation.ts      # Hook dla walidacji
│   └── useAddPlantFlow.ts      # Orchestrator całego flow
└── mocks/
    └── ai-mock-data.ts         # Mock responses dla developmentu
```

---

## 2. Wymagania AI Provider

### 2.1 Funkcje wymagane

#### A. Plant Search Endpoint

**Input:**
```json
{
  "query": "pomidor"
}
```

**Output:**
```json
{
  "data": {
    "candidates": [
      {
        "name": "Pomidor",
        "latin_name": "Solanum lycopersicum",
        "source": "ai"
      },
      {
        "name": "Pomidor koktajlowy",
        "latin_name": "Solanum lycopersicum var. cerasiforme",
        "source": "ai"
      }
    ]
  }
}
```

**Wymagania:**
- Zwraca 1-5 kandydatów najbardziej pasujących do query
- Każdy kandydat ma `name` (nazwa zwyczajna), `latin_name` (opcjonalna), `source: "ai"`
- Timeout: 10s
- Obsługa błędów: 429 (rate limit), 504 (timeout)

#### B. Plant Fit Assessment Endpoint

**Input:**
```json
{
  "plan_id": "uuid",
  "x": 5,
  "y": 10,
  "plant_name": "Pomidor"
}
```

**Output:**
```json
{
  "data": {
    "sunlight_score": 5,
    "humidity_score": 4,
    "precip_score": 4,
    "overall_score": 5,
    "explanation": "Pomidor wymaga pełnego słońca (6-8h dziennie)...",
    "season_info": {
      "spring": {
        "score": 5,
        "description": "Idealna pora na wysadkę rozsady (maj)"
      },
      "summer": {
        "score": 5,
        "description": "Pełnia wzrostu, wymaga regularnego podlewania"
      },
      "autumn": {
        "score": 3,
        "description": "Zbiory przed pierwszymi przymrozkami"
      },
      "winter": {
        "score": 1,
        "description": "Nie nadaje się do uprawy w gruncie"
      }
    }
  }
}
```

**Wymagania:**
- Scores: integer 1-5 (1=złe, 5=doskonałe)
- `explanation`: string opisujący dlaczego dane scores (min 50 znaków)
- `season_info`: opcjonalny obiekt z ocenami sezonowymi
- Timeout: 10s
- Backend pobiera dane pogodowe z Open-Meteo dla `plan_id` i przekazuje do AI

### 2.2 Dane kontekstowe dla AI

Backend dostarcza AI następujące dane o działce:

```typescript
{
  plan_id: string;           // UUID planu
  location: {
    lat: number;             // Szerokość geograficzna
    lon: number;             // Długość geograficzna
    address: string;         // Adres działki
  };
  orientation: number;       // Orientacja 0-359° (0 = północ)
  climate: {
    zone: string;            // Strefa klimatyczna (np. "6a", "7b")
    annual_temp_avg: number; // Średnia temp. roczna (°C)
    annual_precip: number;   // Roczne opady (mm)
    frost_free_days: number; // Dni bez przymrozków
  };
  cell: {
    x: number;               // Współrzędna X komórki
    y: number;               // Współrzędna Y komórki
    type: "soil";            // Typ komórki (zawsze 'soil' dla roślin)
    sunlight_hours: number;  // Szacowane nasłonecznienie (h/dzień)
  };
  plant_name: string;        // Nazwa rośliny do oceny
}
```

**Źródła danych:**
- Lokalizacja: Google Maps Geocoding API
- Dane pogodowe: Open-Meteo API (już zaimplementowane w `src/lib/integrations/open-meteo.ts`)
- Nasłonecznienie: Kalkulowane na podstawie orientation i położenia komórki

---

## 3. Development z Mock Data

### 3.1 Włączenie Mock Mode

W pliku `.env` (lub `.env.local`):

```bash
PUBLIC_USE_MOCK_AI=true
```

### 3.2 Dostępne Mock Scenarios

Mock data znajdują się w `src/lib/mocks/ai-mock-data.ts`:

**Plant Search:**
- `"pomidor"` → 3 kandydaty (pomidor, koktajlowy, malinowy)
- `"ogórek"` → 2 kandydaty
- `"marchew"` → 1 kandydat
- `"bazylia"` → 3 kandydaty (pospolita, cytrynowa, tajska)
- `"róża"` → 3 kandydaty
- `"lawenda"` → 1 kandydat
- Inne → pusta lista

**Plant Fit:**
- `"pomidor"` → Idealne warunki (scores 4-5)
- `"ogórek"` → Dobre warunki (scores 3-4)
- `"róża"` → Średnie warunki (scores 3)
- `"lawenda"` → Słabe warunki (scores 1-2)
- Inne → Średnie scores (3)

### 3.3 Dodawanie własnych Mock Data

Edytuj `src/lib/mocks/ai-mock-data.ts`:

```typescript
export const MOCK_SEARCH_RESPONSES: Record<string, PlantSearchResultDto> = {
  // Dodaj nowy mock
  "twoja-roslina": {
    data: {
      candidates: [
        {
          name: "Twoja Roślina",
          latin_name: "Planta tua",
          source: "ai",
        },
      ],
    },
  },
};

export const MOCK_FIT_RESPONSES: Record<string, PlantFitResultDto> = {
  // Dodaj nowy mock
  twoja_roslina_ideal: {
    data: {
      sunlight_score: 5,
      humidity_score: 5,
      precip_score: 5,
      overall_score: 5,
      explanation: "Twoja roślina jest idealna!",
      // season_info opcjonalny
    },
  },
};
```

---

## 4. Integracja z AI Provider (OpenRouter/OpenAI/Claude)

### 4.1 Instalacja dependencies

```bash
npm install openai
# lub
npm install @anthropic-ai/sdk
```

### 4.2 Konfiguracja API Key

W `.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
# lub
OPENAI_API_KEY=sk-proj-...
# lub
ANTHROPIC_API_KEY=sk-ant-...
```

### 4.3 Implementacja w AIService

Edytuj `src/lib/services/ai.service.ts`, metoda `request`:

```typescript
private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  // 1. AbortController dla timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

  try {
    // 2. Fetch do backend endpoint
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: this.config.headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: "include", // Supabase auth cookies
    });

    clearTimeout(timeoutId);

    // 3. Obsługa HTTP errors
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw createAIError("rate_limit", endpoint, parseInt(retryAfter || "60"));
    }

    if (response.status === 504) {
      throw createAIError("timeout", endpoint);
    }

    if (!response.ok) {
      throw createAIError("network", endpoint);
    }

    // 4. Parse JSON
    const data = await response.json();
    return data as T;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw createAIError("timeout", endpoint);
    }

    if (error instanceof TypeError) {
      throw createAIError("network", endpoint);
    }

    throw error;
  }
}
```

### 4.4 Backend API Endpoints

Implementacja w Astro API routes:

#### `src/pages/api/ai/plants/search.ts`

```typescript
import type { APIRoute } from "astro";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { query } = await request.json();

    // Wywołanie AI provider
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem ogrodniczym. Użytkownik wpisał nazwę rośliny: "${query}".
          Zwróć listę 1-5 najbardziej pasujących roślin ogrodowych w formacie JSON.
          Format: { "candidates": [{ "name": "Nazwa zwyczajna", "latin_name": "Nazwa łacińska", "source": "ai" }] }
          Tylko JSON, bez dodatkowych komentarzy.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return new Response(
      JSON.stringify({
        data: result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI search error:", error);
    return new Response(
      JSON.stringify({ error: "AI service unavailable" }),
      { status: 504 }
    );
  }
};
```

#### `src/pages/api/ai/plants/fit.ts`

```typescript
import type { APIRoute } from "astro";
import { OpenAI } from "openai";
import { getWeatherData } from "@/lib/integrations/open-meteo";
import { getSupabaseServerClient } from "@/db/supabase.client";

const openai = new OpenAI({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { plan_id, x, y, plant_name } = await request.json();

    // 1. Pobierz dane o planie z bazy
    const supabase = getSupabaseServerClient(request, cookies);
    const { data: plan } = await supabase
      .from("plans")
      .select("latitude, longitude, orientation")
      .eq("id", plan_id)
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404 }
      );
    }

    // 2. Pobierz dane pogodowe
    const weather = await getWeatherData({
      latitude: plan.latitude,
      longitude: plan.longitude,
    });

    // 3. Przygotuj context dla AI
    const context = {
      location: { lat: plan.latitude, lon: plan.longitude },
      orientation: plan.orientation,
      climate: {
        annual_temp_avg: weather.yearly.temperature_2m_mean,
        annual_precip: weather.yearly.precipitation_sum,
      },
      cell: { x, y },
      plant_name,
    };

    // 4. Wywołanie AI
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem ogrodniczym. Oceń dopasowanie rośliny "${plant_name}" do warunków:
          ${JSON.stringify(context, null, 2)}
          
          Zwróć JSON:
          {
            "sunlight_score": 1-5,
            "humidity_score": 1-5,
            "precip_score": 1-5,
            "overall_score": 1-5,
            "explanation": "Szczegółowe wyjaśnienie...",
            "season_info": {
              "spring": { "score": 1-5, "description": "..." },
              "summer": { "score": 1-5, "description": "..." },
              "autumn": { "score": 1-5, "description": "..." },
              "winter": { "score": 1-5, "description": "..." }
            }
          }
          
          Scores: 1=złe, 2=słabe, 3=przeciętne, 4=dobre, 5=doskonałe.
          Tylko JSON, bez komentarzy.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI fit error:", error);
    return new Response(
      JSON.stringify({ error: "AI service unavailable" }),
      { status: 504 }
    );
  }
};
```

---

## 5. Testing

### 5.1 Unit Tests (Mock Mode)

```bash
# W .env.test
PUBLIC_USE_MOCK_AI=true

# Run tests
npm test
```

### 5.2 Manual Testing (Mock Mode)

1. Ustaw `PUBLIC_USE_MOCK_AI=true` w `.env`
2. `npm run dev`
3. Zaloguj się, utwórz plan działki
4. Przejdź do edytora, kliknij na komórkę typu 'soil'
5. Kliknij "Add Plant" → Wyszukaj "pomidor"
6. Wybierz kandydata → Zobacz mock scores
7. Przetestuj różne scenariusze z listy mock data

### 5.3 Integration Testing (Real AI)

1. Ustaw `PUBLIC_USE_MOCK_AI=false` w `.env`
2. Dodaj `OPENROUTER_API_KEY=...` w `.env`
3. Zaimplementuj backend endpoints (patrz sekcja 4.4)
4. `npm run dev`
5. Powtórz testy manualne z prawdziwym AI

### 5.4 Error Scenarios

Przetestuj:
- ❌ Timeout (>10s) → `AIErrorDialog` z opcją retry
- ❌ Rate limit (429) → `AIErrorDialog` z czasem oczekiwania
- ❌ Bad JSON → `AIErrorDialog` z opcją manual entry
- ❌ Network error → `AIErrorDialog` z opcją retry
- ✅ Brak wyników → Empty state w `SearchTab`

---

## 6. Monitoring i Debugging

### 6.1 Console Logs

AIService loguje wszystkie requests/responses:

```typescript
console.log("[AIService] search:", query);
console.log("[AIService] response:", result);
```

### 6.2 Network Tab

W DevTools → Network:
- Sprawdź timing (≤10s)
- Sprawdź payloads (request/response)
- Sprawdź status codes (200, 429, 504)

### 6.3 React Query Devtools

Zainstaluj:

```bash
npm install @tanstack/react-query-devtools
```

Dodaj do `EditorLayout.tsx`:

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// W JSX
<ReactQueryDevtools initialIsOpen={false} />
```

Sprawdź:
- Query keys: `["plants", "search", query]`, `["plants", "fit", command]`
- Cache status (fresh, stale, fetching)
- Error states

---

## 7. Optimization & Best Practices

### 7.1 Caching Strategy

React Query automatycznie cache'uje responses:

```typescript
// W useAIService.ts
const { data, isLoading } = useQuery({
  queryKey: ["plants", "search", query],
  queryFn: () => aiService.search(query),
  staleTime: 5 * 60 * 1000, // 5 minut
  cacheTime: 10 * 60 * 1000, // 10 minut
});
```

### 7.2 Debouncing (Future Enhancement)

Dla search input, użyj `useDebouncedValue`:

```typescript
const debouncedQuery = useDebouncedValue(query, 500); // 500ms delay
```

### 7.3 Rate Limiting

Backend powinien implementować rate limiting per user:
- Max 60 requests / minute
- Header: `X-RateLimit-Remaining: 59`
- Response 429 z `Retry-After: 60`

### 7.4 Cost Optimization

- Cache responses w Redis (backend)
- Użyj tańszego modelu dla search (GPT-3.5-turbo)
- Użyj droższego modelu dla fit (GPT-4-turbo)
- Monitoruj usage w OpenRouter Dashboard

---

## 8. Troubleshooting

### Problem: "AI service unavailable"
**Rozwiązanie:**
1. Sprawdź czy `OPENROUTER_API_KEY` jest ustawiony
2. Sprawdź czy backend endpoints są zaimplementowane
3. Sprawdź logs w konsoli serwera
4. Sprawdź balance na OpenRouter

### Problem: Timeout po 10s
**Rozwiązanie:**
1. Użyj szybszego modelu (GPT-3.5 zamiast GPT-4)
2. Skróć prompt (mniej kontekstu)
3. Zwiększ `timeout` w `ai.config.ts` (ostrożnie!)

### Problem: Bad JSON response
**Rozwiązanie:**
1. Sprawdź czy prompt wymusza `response_format: { type: "json_object" }`
2. Sprawdź czy prompt zawiera przykład poprawnego JSON
3. Dodaj fallback parsing w backend

### Problem: Scores poza zakresem 1-5
**Rozwiązanie:**
1. Zod schemas automatycznie odrzucą niepoprawne scores
2. Sprawdź czy prompt jasno określa zakres 1-5
3. Dodaj clamp w backend: `Math.max(1, Math.min(5, score))`

---

## 9. Roadmap (Future Enhancements)

### v2.0 - Advanced Features
- [ ] Caching w Redis (backend)
- [ ] AI-powered plant recommendations (na podstawie istniejących roślin)
- [ ] Companion planting suggestions (które rośliny dobrze rosną razem)
- [ ] Pest & disease detection (z upload zdjęcia)
- [ ] Planting calendar generation (optymalny harmonogram)

### v2.1 - Multimodal AI
- [ ] Image recognition dla identyfikacji roślin
- [ ] Voice search (Whisper API)
- [ ] AR preview rośliny na działce (mobile)

### v3.0 - AI Garden Designer
- [ ] Pełny layout generator (AI projektuje całą działkę)
- [ ] Style presets (cottage garden, vegetable patch, zen garden)
- [ ] 3D visualization preview

---

## 10. Contact & Support

**Development Team:** PlantsPlanner Team  
**Documentation:** `.ai/docs/ai-integration-guide.md`  
**Mock Data:** `src/lib/mocks/ai-mock-data.ts`  
**Config:** `src/lib/integrations/ai.config.ts`

**Questions?** Open an issue on GitHub or contact the team.

---

**Ostatnia aktualizacja:** 2025-11-22  
**Wersja dokumentu:** 1.0  
**Status implementacji:** ✅ Ready for AI Provider Integration

