# Plan Wdrożenia: Dodanie temperatury do oceny dopasowania rośliny

**Data utworzenia:** 2025-01-23  
**Wersja:** 1.0  
**Status:** Ready for Implementation  
**Zakres:** Rozszerzenie systemu oceny dopasowania rośliny o metrykę temperatury

---

## 1. Opis zmian

### 1.1 Cel biznesowy

Obecnie system oceny dopasowania rośliny (`checkPlantFit`) uwzględnia tylko 3 metryki:

- `sunlight_score` - nasłonecznienie
- `humidity_score` - wilgotność powietrza
- `precip_score` - opady

**Brakuje metryki temperatury**, która jest kluczowa dla oceny dopasowania rośliny do warunków klimatycznych działki.

### 1.2 Obecny stan

✅ **Zaimplementowane:**

- Temperatura jest już pobierana z Open-Meteo i zapisywana w bazie danych (`weather_monthly.temperature`)
- Temperatura jest znormalizowana do skali 0-100 (zakres -30°C do +50°C)
- Temperatura jest przekazywana w `PlantFitContext.weather_monthly[].temperature`
- Temperatura jest wyświetlana w prompt użytkownika (ale błędnie jako °C zamiast znormalizowanej wartości)

❌ **Brakuje:**

- Osobna metryka `temperature_score` w odpowiedzi AI
- Uwzględnienie temperatury w system prompt jako osobnej metryki do oceny
- Aktualizacja JSON Schema dla odpowiedzi fit
- Poprawne wyświetlanie temperatury w prompt użytkownika (denormalizacja do °C)

### 1.3 Wymagania funkcjonalne

1. **Dodanie `temperature_score`** do `PlantFitResultDto` (1-5, jak pozostałe metryki)
2. **Aktualizacja system prompt** - dodanie temperatury jako 4. metryki do oceny
3. **Aktualizacja JSON Schema** - wymuszenie zwracania `temperature_score` przez AI
4. **Poprawa prompt użytkownika** - denormalizacja temperatury z 0-100 do °C dla czytelności
5. **Aktualizacja Zod schema** - walidacja `temperature_score` w odpowiedzi
6. **Zachowanie kompatybilności wstecznej** - stare odpowiedzi bez `temperature_score` powinny być obsłużone

---

## 2. Analiza obecnej implementacji

### 2.1 Normalizacja temperatury

**Funkcja normalizacji:**

```typescript
// src/lib/services/weather.service.ts
function normalizeTemperature(celsius: number): number {
  return ((celsius + 30) / 80) * 100;
}
```

**Zakres:**

- Wejście: -30°C do +50°C
- Wyjście: 0-100
- Formuła denormalizacji: `((temp / 100) * 80) - 30`

**Przykłady:**

- -30°C → 0
- 0°C → 37.5
- 10°C → 50
- 20°C → 62.5
- 50°C → 100

### 2.2 Obecna struktura danych

**PlantFitContext** (już zawiera temperaturę):

```typescript
weather_monthly?: {
  month: number;
  temperature: number;  // 0-100 (znormalizowana)
  sunlight: number;     // 0-100
  humidity: number;    // 0-100
  precip: number;       // 0-100
}[]
```

**PlantFitResultDto** (brakuje temperature_score):

```typescript
interface PlantFitResultDto {
  sunlight_score: number; // 1-5
  humidity_score: number; // 1-5
  precip_score: number; // 1-5
  overall_score: number; // 1-5
  explanation?: string;
  // ❌ BRAKUJE: temperature_score
}
```

### 2.3 Obecny system prompt

**Metryki do oceny (linia 421-425):**

```
METRYKI DO OCENY:
1. sunlight_score: Nasłonecznienie (sunlight + sunlight_hours)
2. humidity_score: Wilgotność powietrza (humidity)
3. precip_score: Opady (precip)
4. overall_score: Ogólna ocena (weighted average z wagami sezonów)
```

**Brakuje:** `temperature_score` jako osobna metryka.

### 2.4 Obecny prompt użytkownika

**Błędne wyświetlanie temperatury (linia 460):**

```typescript
`- Miesiąc ${m.month}: temp ${m.temperature}°C, słońce ${m.sunlight}/100, wilgotność ${m.humidity}/100, opady ${m.precip}/100`;
```

**Problem:** `m.temperature` jest znormalizowane (0-100), a wyświetlane jako °C.

---

## 3. Szczegółowy plan wdrożenia

### 3.1 Krok 1: Aktualizacja typów TypeScript

**Plik:** `src/types.ts`

**Zmiany:**

1. Dodanie `temperature_score` do `PlantFitResultDto`

**Przed:**

```typescript
export interface PlantFitResultDto {
  sunlight_score: NonNullable<DbPlantPlacement["sunlight_score"]>;
  humidity_score: NonNullable<DbPlantPlacement["humidity_score"]>;
  precip_score: NonNullable<DbPlantPlacement["precip_score"]>;
  overall_score: NonNullable<DbPlantPlacement["overall_score"]>;
  explanation?: string;
}
```

**Po:**

```typescript
export interface PlantFitResultDto {
  sunlight_score: NonNullable<DbPlantPlacement["sunlight_score"]>;
  humidity_score: NonNullable<DbPlantPlacement["humidity_score"]>;
  precip_score: NonNullable<DbPlantPlacement["precip_score"]>;
  temperature_score: NonNullable<DbPlantPlacement["sunlight_score"]>; // 1-5, jak pozostałe
  overall_score: NonNullable<DbPlantPlacement["overall_score"]>;
  explanation?: string;
}
```

**Uwagi:**

- Używamy tego samego typu co `sunlight_score` (1-5)
- `temperature_score` jest wymagane (nie opcjonalne)

---

### 3.2 Krok 2: Aktualizacja system prompt

**Plik:** `src/lib/services/openrouter.service.ts`

**Metoda:** `buildSystemPrompt(type: 'fit')`

**Zmiany:**

1. Dodanie `temperature_score` jako 4. metryki do oceny
2. Aktualizacja sekcji "METRYKI DO OCENY"
3. Aktualizacja sekcji "FORMAT ODPOWIEDZI"

**Przed:**

```
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
  "explanation": "..."
}
```

**Po:**

```
METRYKI DO OCENY:
1. sunlight_score: Nasłonecznienie (sunlight + sunlight_hours)
2. humidity_score: Wilgotność powietrza (humidity)
3. precip_score: Opady (precip)
4. temperature_score: Temperatura powietrza (temperature) - średnia miesięczna w °C
5. overall_score: Ogólna ocena (weighted average z wagami sezonów, uwzględniając wszystkie 4 metryki)

FORMAT ODPOWIEDZI:
{
  "sunlight_score": 1-5,
  "humidity_score": 1-5,
  "precip_score": 1-5,
  "temperature_score": 1-5,
  "overall_score": 1-5,
  "explanation": "Szczegółowe wyjaśnienie uwzględniające: specyficzne wymagania rośliny (w tym zakres temperatur), analizę danych klimatycznych, rekomendacje (min 50 znaków)"
}
```

**Uwagi:**

- `temperature_score` jest oceniane na podstawie średniej miesięcznej temperatury w °C
- AI powinno uwzględniać wymagania temperaturowe rośliny (min/max temperatura, optymalna temperatura)
- `overall_score` powinien uwzględniać wszystkie 4 metryki (nie tylko 3)

---

### 3.3 Krok 3: Aktualizacja JSON Schema

**Plik:** `src/lib/services/openrouter.service.ts`

**Metoda:** `buildResponseFormat(type: 'fit')`

**Zmiany:**

1. Dodanie `temperature_score` do `properties`
2. Dodanie `temperature_score` do `required`

**Przed:**

```typescript
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
```

**Po:**

```typescript
schema: {
  type: 'object',
  properties: {
    sunlight_score: { type: 'integer', minimum: 1, maximum: 5 },
    humidity_score: { type: 'integer', minimum: 1, maximum: 5 },
    precip_score: { type: 'integer', minimum: 1, maximum: 5 },
    temperature_score: { type: 'integer', minimum: 1, maximum: 5 },
    overall_score: { type: 'integer', minimum: 1, maximum: 5 },
    explanation: { type: 'string', minLength: 50 }
  },
  required: ['sunlight_score', 'humidity_score', 'precip_score', 'temperature_score', 'overall_score', 'explanation'],
  additionalProperties: false
}
```

---

### 3.4 Krok 4: Aktualizacja Zod schema

**Plik:** `src/lib/services/openrouter.service.ts`

**Zmiana:** `PlantFitResultSchema`

**Przed:**

```typescript
const PlantFitResultSchema = z.object({
  sunlight_score: z.number().int().min(1).max(5),
  humidity_score: z.number().int().min(1).max(5),
  precip_score: z.number().int().min(1).max(5),
  overall_score: z.number().int().min(1).max(5),
  explanation: z.string().min(50),
});
```

**Po:**

```typescript
const PlantFitResultSchema = z.object({
  sunlight_score: z.number().int().min(1).max(5),
  humidity_score: z.number().int().min(1).max(5),
  precip_score: z.number().int().min(1).max(5),
  temperature_score: z.number().int().min(1).max(5),
  overall_score: z.number().int().min(1).max(5),
  explanation: z.string().min(50),
});
```

---

### 3.5 Krok 5: Poprawa prompt użytkownika

**Plik:** `src/lib/services/openrouter.service.ts`

**Metoda:** `buildUserPrompt(type: 'fit', data: PlantFitContext)`

**Zmiany:**

1. Denormalizacja temperatury z 0-100 do °C przed wyświetleniem
2. Poprawne formatowanie temperatury w prompt

**Funkcja pomocnicza (dodaj przed `buildUserPrompt`):**

```typescript
/**
 * Denormalizuje temperaturę z 0-100 do °C
 * Zakres: 0-100 → -30°C do +50°C
 */
private denormalizeTemperature(normalized: number): number {
  return ((normalized / 100) * 80) - 30;
}
```

**Przed:**

```typescript
const weatherMonthlyText =
  context.weather_monthly && context.weather_monthly.length > 0
    ? context.weather_monthly
        .map(
          (m) =>
            `- Miesiąc ${m.month}: temp ${m.temperature}°C, słońce ${m.sunlight}/100, wilgotność ${m.humidity}/100, opady ${m.precip}/100`
        )
        .join("\n")
    : "Brak szczegółowych danych miesięcznych";
```

**Po:**

```typescript
const weatherMonthlyText =
  context.weather_monthly && context.weather_monthly.length > 0
    ? context.weather_monthly
        .map((m) => {
          const tempCelsius = this.denormalizeTemperature(m.temperature);
          return `- Miesiąc ${m.month}: temp ${tempCelsius.toFixed(1)}°C, słońce ${m.sunlight}/100, wilgotność ${m.humidity}/100, opady ${m.precip}/100`;
        })
        .join("\n")
    : "Brak szczegółowych danych miesięcznych";
```

**Uwagi:**

- Temperatura jest denormalizowana do °C dla czytelności
- Formatowanie do 1 miejsca po przecinku (`toFixed(1)`)
- Pozostałe metryki pozostają znormalizowane (0-100)

---

### 3.6 Krok 6: Aktualizacja obliczania średniej temperatury rocznej

**Plik:** `src/pages/api/ai/plants/fit.ts`

**Zmiany:**

1. Denormalizacja temperatury przed obliczeniem średniej rocznej
2. Poprawne wyświetlanie średniej temperatury w prompt

**Funkcja pomocnicza (dodaj na początku pliku):**

```typescript
/**
 * Denormalizuje temperaturę z 0-100 do °C
 */
function denormalizeTemperature(normalized: number): number {
  return (normalized / 100) * 80 - 30;
}
```

**Przed:**

```typescript
climate: {
  annual_temp_avg:
    weatherData.length > 0 ? weatherData.reduce((sum, w) => sum + w.temperature, 0) / weatherData.length : 0,
  annual_precip: weatherData.length > 0 ? weatherData.reduce((sum, w) => sum + w.precip, 0) : 0,
},
```

**Po:**

```typescript
climate: {
  annual_temp_avg:
    weatherData.length > 0
      ? weatherData.reduce((sum, w) => sum + denormalizeTemperature(w.temperature), 0) / weatherData.length
      : 0,
  annual_precip: weatherData.length > 0 ? weatherData.reduce((sum, w) => sum + w.precip, 0) : 0,
},
```

**Uwagi:**

- `annual_temp_avg` powinien być w °C (nie znormalizowany)
- Obecnie jest błędnie obliczany jako średnia z znormalizowanych wartości

---

## 4. Testowanie

### 4.1 Testy jednostkowe (do rozważenia)

1. **Test denormalizacji temperatury:**
   - Sprawdzenie różnych wartości wejściowych (0, 50, 100)
   - Weryfikacja poprawności formuły

2. **Test walidacji odpowiedzi:**
   - Sprawdzenie czy `temperature_score` jest wymagane
   - Weryfikacja zakresu 1-5

### 4.2 Testy integracyjne (manualne)

1. **Test endpoint fit:**
   - Wywołanie `POST /api/ai/plants/fit`
   - Weryfikacja że odpowiedź zawiera `temperature_score`
   - Weryfikacja że `temperature_score` jest w zakresie 1-5

2. **Test prompt użytkownika:**
   - Sprawdzenie czy temperatura jest wyświetlana w °C (nie znormalizowana)
   - Weryfikacja formatowania (1 miejsce po przecinku)

3. **Test system prompt:**
   - Sprawdzenie czy AI zwraca `temperature_score`
   - Weryfikacja czy `overall_score` uwzględnia temperaturę

4. **Test kompatybilności wstecznej:**
   - Sprawdzenie czy stare odpowiedzi (bez `temperature_score`) są obsłużone
   - Weryfikacja fallback dla brakujących danych

---

## 5. Checklist wdrożenia

### Faza 1: Typy i schemas

- [ ] Aktualizacja `PlantFitResultDto` w `src/types.ts` (dodanie `temperature_score`)
- [ ] Aktualizacja `PlantFitResultSchema` w `openrouter.service.ts` (dodanie walidacji)
- [ ] Aktualizacja JSON Schema w `buildResponseFormat()` (dodanie `temperature_score`)

### Faza 2: Prompty AI

- [ ] Aktualizacja system prompt (dodanie `temperature_score` jako 4. metryki)
- [ ] Aktualizacja prompt użytkownika (denormalizacja temperatury do °C)
- [ ] Dodanie funkcji `denormalizeTemperature()` w `openrouter.service.ts`

### Faza 3: Endpoint API

- [ ] Aktualizacja obliczania `annual_temp_avg` w `fit.ts` (denormalizacja)
- [ ] Dodanie funkcji `denormalizeTemperature()` w `fit.ts`

### Faza 4: Testowanie

- [ ] Test endpoint fit - weryfikacja `temperature_score` w odpowiedzi
- [ ] Test prompt użytkownika - weryfikacja formatowania temperatury
- [ ] Test system prompt - weryfikacja że AI zwraca `temperature_score`
- [ ] Test kompatybilności wstecznej - obsługa starych odpowiedzi

### Faza 5: Dokumentacja

- [ ] Aktualizacja dokumentacji API (dodanie `temperature_score` do przykładów)
- [ ] Aktualizacja komentarzy w kodzie
- [ ] Aktualizacja `.ai/docs/openrouter-implementation-summary.md`

---

## 6. Potencjalne problemy i rozwiązania

### 6.1 AI nie zwraca temperature_score

**Problem:** AI może nie zwracać `temperature_score` w odpowiedzi (stare zachowanie).

**Rozwiązanie:**

- JSON Schema wymusza zwracanie `temperature_score` (strict mode)
- Zod schema waliduje obecność `temperature_score`
- Jeśli brakuje, walidacja zwróci błąd z opisem

### 6.2 Błędna denormalizacja temperatury

**Problem:** Formuła denormalizacji może być niepoprawna.

**Rozwiązanie:**

- Weryfikacja formuły: `((normalized / 100) * 80) - 30`
- Testy jednostkowe dla różnych wartości
- Sprawdzenie wartości granicznych (-30°C, 0°C, 50°C)

### 6.3 Kompatybilność wsteczna

**Problem:** Stare odpowiedzi AI mogą nie zawierać `temperature_score`.

**Rozwiązanie:**

- JSON Schema w strict mode wymusza wszystkie pola
- Jeśli AI nie zwróci `temperature_score`, walidacja zwróci błąd
- Użytkownik zobaczy komunikat błędu i może spróbować ponownie

### 6.4 Błędne obliczenie annual_temp_avg

**Problem:** Obecnie `annual_temp_avg` jest obliczane jako średnia z znormalizowanych wartości (0-100), a powinno być w °C.

**Rozwiązanie:**

- Denormalizacja każdej wartości przed obliczeniem średniej
- Weryfikacja że wynik jest w °C (np. dla Polski: ~5-10°C)

---

## 7. Decyzje do podjęcia

### 7.1 Format wyświetlania temperatury w prompt

**Pytanie:** Wyświetlać temperaturę w °C czy jako znormalizowaną wartość (0-100)?

**Opcje:**

- **A:** °C (denormalizacja) - bardziej czytelne dla AI
- **B:** 0-100 (znormalizowana) - spójność z innymi metrykami

**Rekomendacja:** Opcja A (°C) - AI lepiej rozumie rzeczywiste wartości temperatury w °C.

### 7.2 Waga temperatury w overall_score

**Pytanie:** Czy temperatura powinna mieć taką samą wagę jak pozostałe metryki w `overall_score`?

**Opcje:**

- **A:** Równa waga (1/4 dla każdej metryki)
- **B:** Wyższa waga dla temperatury (np. 1/3 dla temperatury, 1/3 dla pozostałych)
- **C:** AI decyduje dynamicznie w zależności od rośliny

**Rekomendacja:** Opcja C - AI powinno dynamicznie ocenić wagę temperatury w zależności od wymagań rośliny (niektóre rośliny są bardziej wrażliwe na temperaturę).

---

## 8. Szacowany czas wdrożenia

- **Aktualizacja typów:** 15 min
- **Aktualizacja schemas:** 30 min
- **Aktualizacja promptów:** 1 godz
- **Aktualizacja endpoint:** 30 min
- **Testowanie:** 1-2 godz
- **Dokumentacja:** 30 min

**Łącznie:** ~4-5 godzin

---

## 9. Podsumowanie

Plan zakłada minimalne zmiany w istniejącej architekturze, dodając `temperature_score` jako 4. metrykę oceny dopasowania rośliny. Wszystkie zmiany są backward-compatible z wyjątkiem walidacji odpowiedzi AI (która wymusza `temperature_score`).

**Kluczowe zmiany:**

1. Dodanie `temperature_score` do `PlantFitResultDto`
2. Aktualizacja system prompt (4. metryka)
3. Aktualizacja JSON Schema (wymuszenie `temperature_score`)
4. Poprawa prompt użytkownika (denormalizacja temperatury do °C)
5. Poprawa obliczania `annual_temp_avg` (denormalizacja)

**Następne kroki:**

1. Zatwierdzenie planu
2. Podjęcie decyzji dotyczących punktów z sekcji 7
3. Rozpoczęcie implementacji zgodnie z checklist (sekcja 5)

---

**Przygotował:** AI Assistant  
**Data:** 2025-01-23  
**Status:** ✅ Ready for Implementation
