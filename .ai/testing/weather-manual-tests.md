# Testy Manualne: POST /api/plans/:plan_id/weather/refresh

## Przygotowanie środowiska testowego

### 1. Konfiguracja zmiennych środowiskowych

Upewnij się, że w pliku `.env` znajduje się:

```env
OPEN_METEO_API_URL=https://archive-api.open-meteo.com/v1/archive
SUPABASE_URL=<twój_supabase_url>
SUPABASE_KEY=<twój_supabase_key>
```

### 2. Uruchomienie serwera deweloperskiego

```bash
npm run dev
```

### 3. Przygotowanie danych testowych

**A. Zaloguj się jako użytkownik testowy**

Otwórz konsolę przeglądarki i wykonaj login:

```javascript
// W konsoli przeglądarki na localhost:4321
const email = "test@example.com";
const password = "test123456";

// Jeśli nie masz konta, utwórz je:
const response = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, confirmPassword: password }),
});
console.log("Register:", await response.json());

// Następnie zaloguj się:
const loginResponse = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log("Login:", await loginResponse.json());
```

**B. Utwórz plan testowy z lokalizacją**

```javascript
// Plan z lokalizacją (Warszawa)
const planResponse = await fetch("/api/plans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Test Weather Plan",
    latitude: 52.2297,
    longitude: 21.0122,
    width_cm: 1000,
    height_cm: 1000,
    cell_size_cm: 25,
    orientation: 0,
    hemisphere: "northern",
  }),
});
const plan = await planResponse.json();
console.log("Created plan:", plan);

// Zapisz plan_id do użycia w testach
const PLAN_ID = plan.data.id;
console.log("PLAN_ID:", PLAN_ID);
```

**C. Plan bez lokalizacji (do testu 422)**

```javascript
const planNoLocationResponse = await fetch("/api/plans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Plan Without Location",
    width_cm: 1000,
    height_cm: 1000,
    cell_size_cm: 25,
    orientation: 0,
  }),
});
const planNoLocation = await planNoLocationResponse.json();
const PLAN_NO_LOCATION_ID = planNoLocation.data.id;
console.log("PLAN_NO_LOCATION_ID:", PLAN_NO_LOCATION_ID);
```

---

## Scenariusze testowe

### Test 1: Pierwszy refresh dla nowego planu (200 OK - refreshed: true)

**Cel:** Sprawdzenie podstawowego flow odświeżania danych pogodowych

```javascript
const test1 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result1 = await test1.json();
console.log("Test 1 Status:", test1.status);
console.log("Test 1 Response:", result1);

// Oczekiwany rezultat:
// Status: 200
// Body: { data: { refreshed: true, months: 12 } }
```

**Weryfikacja:**

1. ✅ Status code: 200
2. ✅ `refreshed: true`
3. ✅ `months: 12` (lub ~12, zależnie od dostępności danych)
4. ✅ Brak błędów w konsoli serwera
5. ✅ Czas odpowiedzi: 2-5 sekund (pierwszy request do Open-Meteo)

**Weryfikacja w bazie danych:**

```javascript
const weatherData = await fetch(`/api/plans/${PLAN_ID}/weather`);
const weather = await weatherData.json();
console.log("Weather data in DB:", weather);

// Powinno zwrócić ~12 rekordów z danymi 0-100
```

---

### Test 2: Drugi refresh w ciągu 30 dni (200 OK - refreshed: false)

**Cel:** Sprawdzenie cache logic (nie refreshuje jeśli <30 dni)

```javascript
// Natychmiast po Test 1
const test2 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result2 = await test2.json();
console.log("Test 2 Status:", test2.status);
console.log("Test 2 Response:", result2);

// Oczekiwany rezultat:
// Status: 200
// Body: { data: { refreshed: false, months: 0 } }
```

**Weryfikacja:**

1. ✅ Status code: 200
2. ✅ `refreshed: false` (cache był aktualny)
3. ✅ `months: 0`
4. ✅ Czas odpowiedzi: <500ms (no API call)

---

### Test 3: Wymuszony refresh (force: true)

**Cel:** Sprawdzenie wymuszenia odświeżenia mimo aktualnego cache

```javascript
const test3 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ force: true }),
});

const result3 = await test3.json();
console.log("Test 3 Status:", test3.status);
console.log("Test 3 Response:", result3);

// Oczekiwany rezultat:
// Status: 200
// Body: { data: { refreshed: true, months: 12 } }
```

**Weryfikacja:**

1. ✅ Status code: 200
2. ✅ `refreshed: true` (mimo aktualnego cache)
3. ✅ `months: 12`
4. ✅ Czas odpowiedzi: 2-5 sekund

---

### Test 4: Rate limiting (429 Too Many Requests)

**Cel:** Sprawdzenie rate limitera (1 request / 15 minut per plan)

```javascript
// Bezpośrednio po Test 3 (który był z force=true)
const test4 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ force: true }),
});

const result4 = await test4.json();
console.log("Test 4 Status:", test4.status);
console.log("Test 4 Headers:", {
  retryAfter: test4.headers.get("Retry-After"),
});
console.log("Test 4 Response:", result4);

// Oczekiwany rezultat:
// Status: 429
// Headers: { Retry-After: "899" } (około 15 minut w sekundach)
// Body: { error: { code: "RateLimited", message: "..." } }
```

**Weryfikacja:**

1. ✅ Status code: 429
2. ✅ Header `Retry-After` obecny (wartość w sekundach)
3. ✅ Error code: `"RateLimited"`
4. ✅ Message zawiera informację o czasie oczekiwania

---

### Test 5: Plan nie istnieje (404 Not Found)

**Cel:** Sprawdzenie obsługi nieistniejącego planu

```javascript
const FAKE_PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";

const test5 = await fetch(`/api/plans/${FAKE_PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result5 = await test5.json();
console.log("Test 5 Status:", test5.status);
console.log("Test 5 Response:", result5);

// Oczekiwany rezultat:
// Status: 404
// Body: { error: { code: "NotFound", message: "Plan with ID ... not found" } }
```

**Weryfikacja:**

1. ✅ Status code: 404
2. ✅ Error code: `"NotFound"`
3. ✅ Message zawiera plan_id

---

### Test 6: Plan bez lokalizacji (422 Unprocessable Entity)

**Cel:** Sprawdzenie walidacji że plan ma lat/lon

```javascript
const test6 = await fetch(`/api/plans/${PLAN_NO_LOCATION_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result6 = await test6.json();
console.log("Test 6 Status:", test6.status);
console.log("Test 6 Response:", result6);

// Oczekiwany rezultat:
// Status: 422
// Body: { error: { code: "UnprocessableEntity", message: "Plan ... must have location ..." } }
```

**Weryfikacja:**

1. ✅ Status code: 422
2. ✅ Error code: `"UnprocessableEntity"`
3. ✅ Message informuje o brakującej lokalizacji

---

### Test 7: Nieprawidłowy plan_id format (400 Bad Request)

**Cel:** Sprawdzenie walidacji UUID

```javascript
const test7 = await fetch("/api/plans/invalid-uuid/weather/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result7 = await test7.json();
console.log("Test 7 Status:", test7.status);
console.log("Test 7 Response:", result7);

// Oczekiwany rezultat:
// Status: 400
// Body: { error: { code: "ValidationError", message: "Invalid plan_id format", details: {...} } }
```

**Weryfikacja:**

1. ✅ Status code: 400
2. ✅ Error code: `"ValidationError"`
3. ✅ `field_errors.plan_id` obecne

---

### Test 8: Nieprawidłowy JSON body (400 Bad Request)

**Cel:** Sprawdzenie walidacji JSON

```javascript
const test8 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "invalid json{",
});

const result8 = await test8.json();
console.log("Test 8 Status:", test8.status);
console.log("Test 8 Response:", result8);

// Oczekiwany rezultat:
// Status: 400
// Body: { error: { code: "ValidationError", message: "Invalid JSON in request body." } }
```

**Weryfikacja:**

1. ✅ Status code: 400
2. ✅ Error code: `"ValidationError"`
3. ✅ Message informuje o nieprawidłowym JSON

---

### Test 9: Nieprawidłowy typ pola 'force' (400 Bad Request)

**Cel:** Sprawdzenie walidacji typu boolean

```javascript
const test9 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ force: "yes" }), // string zamiast boolean
});

const result9 = await test9.json();
console.log("Test 9 Status:", test9.status);
console.log("Test 9 Response:", result9);

// Oczekiwany rezultat:
// Status: 400
// Body: { error: { code: "ValidationError", message: "...", details: { field_errors: {...} } } }
```

**Weryfikacja:**

1. ✅ Status code: 400
2. ✅ Error code: `"ValidationError"`
3. ✅ `field_errors` zawiera błąd dla 'force'

---

### Test 10: Brak autoryzacji (401 Unauthorized)

**Cel:** Sprawdzenie wymuszenia JWT authentication

```javascript
// Wyloguj się najpierw
await fetch("/api/auth/logout", { method: "POST" });

const test10 = await fetch(`/api/plans/${PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result10 = await test10.json();
console.log("Test 10 Status:", test10.status);
console.log("Test 10 Response:", result10);

// Oczekiwany rezultat:
// Status: 401
// Body: { error: { code: "Unauthorized", message: "Authentication required." } }
```

**Weryfikacja:**

1. ✅ Status code: 401
2. ✅ Error code: `"Unauthorized"`

**Po tym teście zaloguj się ponownie:**

```javascript
await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test@example.com", password: "test123456" }),
});
```

---

### Test 11: Dostęp do cudzego planu (404 Not Found przez RLS)

**Cel:** Sprawdzenie że RLS blokuje dostęp do planów innych użytkowników

**Przygotowanie:**

1. Utwórz drugie konto użytkownika
2. Utwórz plan jako drugi użytkownik
3. Zapisz plan_id
4. Zaloguj się ponownie jako pierwszy użytkownik
5. Spróbuj odświeżyć weather dla planu drugiego użytkownika

```javascript
// Jako drugi użytkownik (user2@example.com)
// ... utwórz plan i zapisz OTHER_USER_PLAN_ID

// Zaloguj się jako pierwszy użytkownik (test@example.com)
const test11 = await fetch(`/api/plans/${OTHER_USER_PLAN_ID}/weather/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result11 = await test11.json();
console.log("Test 11 Status:", test11.status);
console.log("Test 11 Response:", result11);

// Oczekiwany rezultat:
// Status: 404 (RLS powoduje że plan "nie istnieje" dla tego użytkownika)
// Body: { error: { code: "NotFound", message: "Plan with ID ... not found" } }
```

**Weryfikacja:**

1. ✅ Status code: 404
2. ✅ Error code: `"NotFound"`
3. ✅ RLS skutecznie blokuje dostęp (plan jest invisible dla użytkownika)

---

### Test 12: Weryfikacja znormalizowanych danych

**Cel:** Sprawdzenie poprawności normalizacji metryk do 0-100

```javascript
// Po udanym refresh (Test 1 lub 3)
const weatherResponse = await fetch(`/api/plans/${PLAN_ID}/weather`);
const weatherData = await weatherResponse.json();

console.log("Weather data check:");
weatherData.data.forEach((month) => {
  console.log(`${month.year}-${month.month}:`, {
    sunlight: month.sunlight,
    humidity: month.humidity,
    precip: month.precip,
    isValid:
      month.sunlight >= 0 &&
      month.sunlight <= 100 &&
      month.humidity >= 0 &&
      month.humidity <= 100 &&
      month.precip >= 0 &&
      month.precip <= 100,
  });
});

// Wszystkie wartości powinny być w zakresie 0-100
```

**Weryfikacja:**

1. ✅ Wszystkie `sunlight` values: 0-100
2. ✅ Wszystkie `humidity` values: 0-100
3. ✅ Wszystkie `precip` values: 0-100
4. ✅ `last_refreshed_at` jest recent timestamp
5. ✅ Dane posortowane DESC (year, month)

---

## Checklist końcowy

Po wykonaniu wszystkich testów, sprawdź:

### Funkcjonalność

- [ ] Test 1: Pierwszy refresh działa (200, refreshed: true)
- [ ] Test 2: Cache logic działa (200, refreshed: false)
- [ ] Test 3: Force refresh działa (200, refreshed: true)
- [ ] Test 4: Rate limiting działa (429, Retry-After header)
- [ ] Test 5: NotFound dla nieistniejącego planu (404)
- [ ] Test 6: UnprocessableEntity dla planu bez lokalizacji (422)
- [ ] Test 7: ValidationError dla invalid UUID (400)
- [ ] Test 8: ValidationError dla invalid JSON (400)
- [ ] Test 9: ValidationError dla invalid field type (400)
- [ ] Test 10: Unauthorized bez JWT (401)
- [ ] Test 11: RLS blokuje cudze plany (404)
- [ ] Test 12: Dane znormalizowane poprawnie (0-100)

### Performance

- [ ] Pierwszy refresh: 2-5 sekund
- [ ] Cache hit (no refresh): <500ms
- [ ] Rate limit check: <100ms

### Baza danych

- [ ] Dane zapisane w `weather_monthly`
- [ ] Wszystkie 12 miesięcy (lub ~12)
- [ ] `last_refreshed_at` aktualizowane
- [ ] ON CONFLICT UPDATE działa (drugi refresh)

### Bezpieczeństwo

- [ ] JWT wymagany (401 bez tokenu)
- [ ] RLS działa (cudzych planów nie widać)
- [ ] Rate limiting funkcjonuje
- [ ] Walidacja UUID
- [ ] Walidacja JSON body

### Error Handling

- [ ] Wszystkie error codes poprawne
- [ ] Error messages user-friendly
- [ ] field_errors dla validation errors
- [ ] Retry-After header dla 429

---

## Debugowanie

### Problem: 500 Internal Server Error

**Sprawdź:**

1. Logi serwera w terminalu
2. Czy `.env` ma poprawne zmienne
3. Czy Open-Meteo API jest dostępne:
   ```bash
   curl "https://archive-api.open-meteo.com/v1/archive?latitude=52.22&longitude=21.01&start_date=2024-11-01&end_date=2024-11-21&daily=shortwave_radiation_sum,sunshine_duration,relative_humidity_2m_mean,precipitation_sum&timezone=auto"
   ```

### Problem: 502 Bad Gateway (UpstreamError)

**Możliwe przyczyny:**

1. Open-Meteo API down lub rate limited
2. Network connectivity issues
3. Invalid lat/lon coordinates

**Debug:**

```javascript
// Sprawdź czy Open-Meteo działa bezpośrednio
fetch(
  "https://archive-api.open-meteo.com/v1/archive?latitude=52.22&longitude=21.01&start_date=2024-10-01&end_date=2024-11-01&daily=shortwave_radiation_sum&timezone=auto"
)
  .then((r) => r.json())
  .then(console.log);
```

### Problem: Rate limiter nie działa

**Reset rate limiter:**

```javascript
// W kodzie źródłowym można dodać endpoint do resetu (tylko dla dev):
// src/lib/utils/rate-limiter.ts
// weatherRefreshLimiter.reset(planId);
```

Alternatywnie: Restart serwera dev (in-memory limiter się wyczyści)

---

## Notatki

- Open-Meteo Archive API ma ~5 dni opóźnienia, więc dane są do 5 dni wstecz
- Free tier Open-Meteo może mieć ograniczenia - dla production rozważ commercial license
- Rate limiter jest in-memory - nie przetrwa restartów serwera
- W production należy użyć Redis dla shared rate limiting state

---

**Dokument przygotowany:** 2025-11-21  
**Autor:** AI Assistant  
**Wersja:** 1.0
