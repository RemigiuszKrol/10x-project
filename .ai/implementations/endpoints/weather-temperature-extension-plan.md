# Plan Wdrożenia: Rozszerzenie danych pogodowych o średnią temperaturę miesięczną

## 1. Podsumowanie

Rozszerzenie istniejącego systemu pobierania danych pogodowych z Open-Meteo o **średnią temperaturę w każdym miesiącu**. Temperatura będzie pobierana, normalizowana i przechowywana w taki sam sposób jak pozostałe metryki (sunlight, humidity, precip).

**Status:** 📋 Plan do zatwierdzenia  
**Data:** 2025-01-21

## 2. Analiza obecnej implementacji

### 2.1 Obecne metryki pogodowe

Obecnie system pobiera i przechowuje:
- **Sunlight** (0-100) - znormalizowana wartość z `shortwave_radiation_sum` + `sunshine_duration`
- **Humidity** (0-100) - bezpośrednio z `relative_humidity_2m_mean` (%)
- **Precip** (0-100) - znormalizowana wartość z `precipitation_sum` (mm)

### 2.2 Architektura

```
Open-Meteo API → Integration Layer → Weather Service → Database
                                      ↓
                                 Normalization (0-100)
                                      ↓
                                 Frontend Components
```

### 2.3 Pliki do modyfikacji

1. **Baza danych:**
   - `supabase/migrations/` - migracja dodająca kolumnę `temperature`

2. **Backend:**
   - `src/lib/integrations/open-meteo.ts` - dodanie `temperature_2m_mean` do parametrów API
   - `src/lib/services/weather.service.ts` - normalizacja temperatury i zapis do DB
   - `src/types.ts` - aktualizacja `WeatherMonthlyDto`

3. **Frontend (opcjonalnie):**
   - `src/components/editor/SideDrawer/WeatherMonthlyChart.tsx` - wyświetlanie temperatury
   - `src/components/editor/SideDrawer/WeatherMetricsTable.tsx` - tabela z temperaturą

4. **Dokumentacja:**
   - `.ai/implementations/endpoints/weather-implementation-report.md` - aktualizacja

## 3. Szczegółowy plan wdrożenia

### 3.1 Krok 1: Migracja bazy danych

**Plik:** `supabase/migrations/YYYYMMDDHHMMSS_add_temperature_to_weather_monthly.sql`

**Zmiany:**
- Dodanie kolumny `temperature` do tabeli `weather_monthly`
- Typ: `smallint NOT NULL CHECK (temperature BETWEEN 0 AND 100)`
- Domyślna wartość dla istniejących rekordów: `NULL` (lub 0, w zależności od strategii)
- Aktualizacja constraintów i indeksów (jeśli potrzebne)

**SQL:**
```sql
ALTER TABLE public.weather_monthly
ADD COLUMN temperature smallint CHECK (temperature BETWEEN 0 AND 100);

-- Opcjonalnie: ustawienie wartości domyślnej dla istniejących rekordów
-- UPDATE public.weather_monthly SET temperature = 0 WHERE temperature IS NULL;

-- Opcjonalnie: zmiana na NOT NULL po wypełnieniu danych
-- ALTER TABLE public.weather_monthly ALTER COLUMN temperature SET NOT NULL;
```

**Uwagi:**
- Rozważyć strategię dla istniejących rekordów (NULL vs 0)
- Sprawdzić czy RLS policies wymagają aktualizacji
- Zaktualizować typy TypeScript po migracji (`src/db/database.types.ts`)

### 3.2 Krok 2: Aktualizacja integracji Open-Meteo

**Plik:** `src/lib/integrations/open-meteo.ts`

**Zmiany:**

1. **Interfejs `OpenMeteoRawResponse`:**
   - Dodanie `temperature_2m_mean: string` do `daily_units`
   - Dodanie `temperature_2m_mean: number[]` do `daily`

2. **Funkcja `fetchWeatherArchive()`:**
   - Dodanie `temperature_2m_mean` do parametru `daily` w URL (linia ~89)
   - Dodanie `temperature_2m_mean` do listy `requiredFields` w walidacji (linia ~118)

**Przykładowe zmiany:**
```typescript
// W daily_units:
temperature_2m_mean: string; // "°C"

// W daily:
temperature_2m_mean: number[]; // °C

// W parametrze URL:
url.searchParams.set(
  "daily",
  "shortwave_radiation_sum,sunshine_duration,relative_humidity_2m_mean,precipitation_sum,temperature_2m_mean"
);

// W walidacji:
const requiredFields = [
  "shortwave_radiation_sum",
  "sunshine_duration",
  "relative_humidity_2m_mean",
  "precipitation_sum",
  "temperature_2m_mean", // NOWE
];
```

**Dokumentacja Open-Meteo:**
- Parametr: `temperature_2m_mean` - średnia temperatura dzienna na wysokości 2m
- Jednostka: °C (Celsius)
- Format: tablica wartości dziennych

### 3.3 Krok 3: Aktualizacja Weather Service

**Plik:** `src/lib/services/weather.service.ts`

**Zmiany:**

1. **Interfejs `NormalizedMonthlyData`:**
   - Dodanie `temperature: number; // 0-100`

2. **Metoda `normalizeWeatherData()`:**
   - Dodanie `temperature: number[]` do struktury `grouped` Map
   - Zbieranie wartości `temperature_2m_mean` w pętli grupującej
   - Obliczenie średniej miesięcznej temperatury
   - Normalizacja temperatury do skali 0-100
   - Dodanie `temperature` do obiektu zwracanego w `normalized.push()`

3. **Metoda `saveWeatherData()`:**
   - Dodanie `temperature: d.temperature` do mapowania rekordów

4. **Funkcja `getPlanWeather()`:**
   - Dodanie `temperature` do `.select()` w zapytaniu do bazy

**Normalizacja temperatury:**

**Propozycja zakresu:** -20°C do +40°C → 0-100
- Zakres: -20°C (min) do +40°C (max)
- Formuła: `((temp - (-20)) / (40 - (-20))) * 100`
- Uproszczenie: `((temp + 20) / 60) * 100`
- Clamp: `clamp(temperature, 0, 100)`

**Alternatywne zakresy do rozważenia:**
- **Opcja 1 (szeroki):** -30°C do +50°C → lepsze pokrycie ekstremów
- **Opcja 2 (wąski):** -10°C do +35°C → lepsze rozdzielczość dla typowych klimatów
- **Opcja 3 (średni):** -20°C do +40°C → kompromis (proponowany)

**Przykładowe zmiany:**
```typescript
// W NormalizedMonthlyData:
interface NormalizedMonthlyData {
  year: number;
  month: number;
  sunlight: number;
  humidity: number;
  precip: number;
  temperature: number; // NOWE
}

// W grupowaniu:
temperature: number[];

// W normalizacji:
const avgTemperature = average(values.temperature); // °C
const temperature = Math.round(clamp(normalizeTemperature(avgTemperature), 0, 100));

// Funkcja pomocnicza:
function normalizeTemperature(celsius: number): number {
  // Zakres -20°C do +40°C → 0-100
  return ((celsius + 20) / 60) * 100;
}
```

### 3.4 Krok 4: Aktualizacja typów TypeScript

**Plik:** `src/types.ts`

**Zmiany:**

1. **Typ `WeatherMonthlyDto`:**
   - Dodanie `"temperature"` do `Pick<DbWeatherMonthly, ...>`

**Przykładowe zmiany:**
```typescript
export type WeatherMonthlyDto = Pick<
  DbWeatherMonthly,
  "year" | "month" | "sunlight" | "humidity" | "precip" | "temperature" | "last_refreshed_at"
>;
```

**Uwagi:**
- Po migracji bazy danych, typ `DbWeatherMonthly` zostanie automatycznie zaktualizowany przez Supabase CLI
- Jeśli typy nie są automatycznie generowane, trzeba ręcznie zaktualizować `src/db/database.types.ts`

### 3.5 Krok 5: Aktualizacja komponentów frontendowych (opcjonalne)

**Pliki:**
- `src/components/editor/SideDrawer/WeatherMonthlyChart.tsx`
- `src/components/editor/SideDrawer/WeatherMetricsTable.tsx`

**Zmiany:**
- Dodanie wyświetlania temperatury w wykresie (jeśli używany)
- Dodanie kolumny "Temperatura" w tabeli
- Formatowanie: wyświetlanie znormalizowanej wartości (0-100) lub konwersja z powrotem do °C

**Uwagi:**
- Jeśli komponenty są generyczne i automatycznie wyświetlają wszystkie pola z `WeatherMonthlyDto`, mogą nie wymagać zmian
- Rozważyć czy wyświetlać wartość znormalizowaną (0-100) czy rzeczywistą (°C)
- Jeśli wyświetlamy °C, potrzebna funkcja denormalizacji: `((temp / 100) * 60) - 20`

### 3.6 Krok 6: Aktualizacja dokumentacji

**Pliki:**
- `.ai/implementations/endpoints/weather-implementation-report.md`
- `.ai/endpoints/weather/post-weather-plan.md` (jeśli istnieje)
- `.ai/endpoints/weather/get-weather-plan.md` (jeśli istnieje)

**Zmiany:**
- Aktualizacja sekcji "Metryki pobierane"
- Aktualizacja sekcji "Normalizacja metryk" (dodanie temperatury)
- Aktualizacja przykładów odpowiedzi API
- Aktualizacja diagramów przepływu danych

## 4. Szczegóły techniczne

### 4.1 Parametr Open-Meteo API

**Nazwa:** `temperature_2m_mean`  
**Typ:** `daily` parameter  
**Jednostka:** °C (Celsius)  
**Opis:** Średnia temperatura dzienna na wysokości 2 metrów nad ziemią

**Dokumentacja:** https://open-meteo.com/en/docs/historical-weather-api

### 4.2 Normalizacja temperatury

**Zakres wejściowy:** -20°C do +40°C  
**Zakres wyjściowy:** 0-100  
**Formuła:** `((temp + 20) / 60) * 100`

**Przykłady:**
- -20°C → 0
- 0°C → 33.33
- 10°C → 50
- 20°C → 66.67
- 40°C → 100

**Obsługa wartości poza zakresem:**
- Wartości < -20°C → clamp do 0
- Wartości > +40°C → clamp do 100

### 4.3 Strategia dla istniejących rekordów

**Opcja A: NULL dla starych rekordów**
- Zalety: wyraźne oznaczenie braku danych
- Wady: wymaga obsługi NULL w frontendzie

**Opcja B: Wartość domyślna (0)**
- Zalety: brak NULL, prostsza obsługa
- Wady: może być mylące (0 = -20°C)

**Opcja C: Backfill przy pierwszym refresh**
- Zalety: wszystkie rekordy mają pełne dane
- Wady: wymaga dodatkowej logiki

**Rekomendacja:** Opcja A (NULL) z możliwością backfill przy następnym refresh

## 5. Testowanie

### 5.1 Testy jednostkowe (do rozważenia)

- Test normalizacji temperatury (różne wartości wejściowe)
- Test walidacji odpowiedzi Open-Meteo (brak temperatury)
- Test zapisu do bazy (wszystkie metryki włącznie z temperaturą)

### 5.2 Testy integracyjne (manualne)

1. **Test pobierania danych:**
   - Wywołanie `POST /api/plans/:plan_id/weather/refresh`
   - Weryfikacja że temperatura jest w odpowiedzi Open-Meteo
   - Weryfikacja że temperatura jest zapisana w bazie

2. **Test odczytu danych:**
   - Wywołanie `GET /api/plans/:plan_id/weather`
   - Weryfikacja że temperatura jest w odpowiedzi
   - Weryfikacja że wartość jest znormalizowana (0-100)

3. **Test normalizacji:**
   - Sprawdzenie różnych wartości temperatury
   - Weryfikacja clamp dla wartości ekstremalnych

4. **Test kompatybilności wstecznej:**
   - Sprawdzenie czy stare rekordy (bez temperatury) są obsługiwane
   - Sprawdzenie czy frontend działa z NULL/brakiem temperatury

## 6. Checklist wdrożenia

### Faza 1: Baza danych
- [ ] Utworzenie migracji dodającej kolumnę `temperature`
- [ ] Uruchomienie migracji na środowisku dev/staging
- [ ] Weryfikacja struktury tabeli
- [ ] Aktualizacja typów TypeScript (`database.types.ts`)

### Faza 2: Backend - Integracja
- [ ] Aktualizacja `OpenMeteoRawResponse` interface
- [ ] Dodanie `temperature_2m_mean` do parametrów API
- [ ] Dodanie walidacji `temperature_2m_mean` w odpowiedzi
- [ ] Test pobrania danych z Open-Meteo (manualny)

### Faza 3: Backend - Service
- [ ] Aktualizacja `NormalizedMonthlyData` interface
- [ ] Implementacja normalizacji temperatury
- [ ] Aktualizacja `normalizeWeatherData()` - grupowanie i obliczenia
- [ ] Aktualizacja `saveWeatherData()` - zapis temperatury
- [ ] Aktualizacja `getPlanWeather()` - odczyt temperatury
- [ ] Test end-to-end refresh (manualny)

### Faza 4: Typy i API
- [ ] Aktualizacja `WeatherMonthlyDto` w `src/types.ts`
- [ ] Test GET endpoint - weryfikacja że temperatura jest w odpowiedzi
- [ ] Test POST endpoint - weryfikacja że temperatura jest zapisywana

### Faza 5: Frontend (opcjonalne)
- [ ] Sprawdzenie czy komponenty wymagają zmian
- [ ] Aktualizacja `WeatherMonthlyChart.tsx` (jeśli potrzebne)
- [ ] Aktualizacja `WeatherMetricsTable.tsx` (jeśli potrzebne)
- [ ] Test wizualny wyświetlania temperatury

### Faza 6: Dokumentacja
- [ ] Aktualizacja raportu implementacji
- [ ] Aktualizacja dokumentacji API endpoints
- [ ] Aktualizacja komentarzy w kodzie

### Faza 7: Deployment
- [ ] Code review
- [ ] Testy na staging
- [ ] Migracja na produkcję
- [ ] Weryfikacja po deploymencie
- [ ] Monitorowanie błędów (jeśli dostępne)

## 7. Potencjalne problemy i rozwiązania

### 7.1 Open-Meteo API nie zwraca temperatury

**Problem:** API może nie zwracać `temperature_2m_mean` dla niektórych lokalizacji lub okresów.

**Rozwiązanie:**
- Walidacja w `fetchWeatherArchive()` - sprawdzenie czy pole istnieje
- Obsługa NULL/braku danych w normalizacji
- Logowanie ostrzeżenia jeśli temperatura nie jest dostępna

### 7.2 Wartości ekstremalne poza zakresem normalizacji

**Problem:** Niektóre lokalizacje mogą mieć temperatury < -20°C lub > +40°C.

**Rozwiązanie:**
- Użycie funkcji `clamp()` do ograniczenia wartości
- Rozważenie szerszego zakresu normalizacji (-30°C do +50°C)
- Logowanie wartości ekstremalnych dla analizy

### 7.3 Kompatybilność wsteczna z istniejącymi rekordami

**Problem:** Stare rekordy w bazie nie będą miały wartości temperatury.

**Rozwiązanie:**
- Kolumna `temperature` jako nullable (lub z wartością domyślną)
- Frontend musi obsługiwać brak temperatury
- Opcjonalny backfill przy następnym refresh

### 7.4 Wydajność zapytania Open-Meteo

**Problem:** Dodanie kolejnego parametru może zwiększyć czas odpowiedzi API.

**Rozwiązanie:**
- Monitorowanie czasu odpowiedzi
- Rozważenie zwiększenia timeout (obecnie 30s)
- Cache'owanie odpowiedzi (w przyszłości)

## 8. Decyzje do podjęcia

### 8.1 Zakres normalizacji temperatury

**Pytanie:** Jaki zakres temperatury użyć do normalizacji?

**Opcje:**
- **A:** -20°C do +40°C (proponowany)
- **B:** -30°C do +50°C (szerszy, lepsze pokrycie ekstremów)
- **C:** -10°C do +35°C (węższy, lepsza rozdzielczość dla typowych klimatów)

**Rekomendacja:** Opcja A (-20°C do +40°C) jako kompromis

### 8.2 Strategia dla istniejących rekordów

**Pytanie:** Jak obsłużyć stare rekordy bez temperatury?

**Opcje:**
- **A:** NULL (wymaga obsługi w frontendzie)
- **B:** Wartość domyślna 0 (może być mylące)
- **C:** Backfill przy następnym refresh (wymaga dodatkowej logiki)

**Rekomendacja:** Opcja A (NULL) z możliwością backfill

### 8.3 Wyświetlanie temperatury w frontendzie

**Pytanie:** Wyświetlać wartość znormalizowaną (0-100) czy rzeczywistą (°C)?

**Opcje:**
- **A:** Wartość znormalizowana (0-100) - spójność z innymi metrykami
- **B:** Wartość rzeczywista (°C) - bardziej czytelna dla użytkownika
- **C:** Obie wartości - znormalizowana dla porównań, rzeczywista dla czytelności

**Rekomendacja:** Opcja B (°C) - bardziej użyteczne dla użytkownika

## 9. Szacowany czas wdrożenia

- **Migracja bazy danych:** 15 min
- **Aktualizacja integracji Open-Meteo:** 30 min
- **Aktualizacja Weather Service:** 1-2 godz
- **Aktualizacja typów:** 15 min
- **Aktualizacja frontendu (opcjonalne):** 1-2 godz
- **Testowanie:** 1-2 godz
- **Dokumentacja:** 30 min

**Łącznie:** ~5-7 godzin

## 10. Podsumowanie

Plan zakłada minimalne zmiany w istniejącej architekturze, dodając temperaturę w sposób spójny z obecnymi metrykami. Wszystkie zmiany są backward-compatible (z wyjątkiem migracji bazy danych, która wymaga planowania).

**Kluczowe decyzje do podjęcia:**
1. Zakres normalizacji temperatury (-20°C do +40°C vs inne)
2. Strategia dla istniejących rekordów (NULL vs wartość domyślna)
3. Format wyświetlania w frontendzie (znormalizowany vs °C)

**Następne kroki:**
1. Zatwierdzenie planu
2. Podjęcie decyzji dotyczących punktów z sekcji 8
3. Rozpoczęcie implementacji zgodnie z checklist (sekcja 6)

---

**Przygotował:** AI Assistant  
**Data:** 2025-01-21  
**Status:** Oczekuje na feedback przed implementacją

