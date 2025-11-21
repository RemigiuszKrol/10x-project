# Testy manualne: Endpointy /api/plans/:plan_id/plants

Ten dokument zawiera testy manualne dla wszystkich endpointów związanych z nasadzeniami roślin:

- GET /api/plans/:plan_id/plants - Listowanie nasadzeń
- PUT /api/plans/:plan_id/plants/:x/:y - Dodawanie/aktualizacja nasadzenia
- DELETE /api/plans/:plan_id/plants/:x/:y - Usuwanie nasadzenia

---

# Testy manualne: GET /api/plans/:plan_id/plants

## Przygotowanie środowiska testowego (GET)

Przed wykonaniem testów upewnij się, że:

1. Jesteś zalogowany do aplikacji
2. Masz dostęp do konsoli przeglądarki (F12 → Console)
3. Masz utworzony przynajmniej jeden plan działki z nasadzeniami roślin

## Pobieranie ID planu testowego

```javascript
// Pobierz listę swoich planów
const plansResponse = await fetch("/api/plans", {
  credentials: "include",
});
const plansData = await plansResponse.json();
console.log("Twoje plany:", plansData);

// Zapisz ID pierwszego planu do zmiennej
const testPlanId = plansData.data[0]?.id;
console.log("ID planu testowego:", testPlanId);
```

## Utworzenie testowych nasadzeń

```javascript
// Utwórz kilka testowych nasadzeń różnych roślin
const plants = [
  { x: 0, y: 0, plant_name: "Pomidor Cherry", overall_score: 5 },
  { x: 0, y: 1, plant_name: "Pomidor Malinowy", overall_score: 4 },
  { x: 1, y: 0, plant_name: "Bazylia", overall_score: 5 },
  { x: 1, y: 1, plant_name: "Bazylia Cytrynowa", overall_score: 4 },
  { x: 2, y: 0, plant_name: "Ogórek", overall_score: 3 },
];

for (const plant of plants) {
  const response = await fetch(`/api/plans/${testPlanId}/plants/${plant.x}/${plant.y}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plant_name: plant.plant_name,
      overall_score: plant.overall_score,
    }),
  });
  console.log(`Utworzono: ${plant.plant_name} (${response.status})`);
}
```

---

## Test GET-1: Sukces - Podstawowe listowanie bez filtrów

**Cel:** Weryfikacja poprawnego pobrania listy wszystkich nasadzeń dla planu.

**Warunki wstępne:** Użytkownik jest zalogowany i posiada plan z nasadzeniami.

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants`, {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 200
// Struktura: {
//   data: [
//     {
//       x: 0,
//       y: 0,
//       plant_name: "Bazylia",
//       sunlight_score: null,
//       humidity_score: null,
//       precip_score: null,
//       overall_score: 5,
//       created_at: "iso-datetime",
//       updated_at: "iso-datetime"
//     },
//     // ... więcej nasadzeń
//   ],
//   pagination: {
//     next_cursor: null  // lub string jeśli jest więcej wyników
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ `data` jest tablicą obiektów
- ✅ Każdy element zawiera pola: `x`, `y`, `plant_name`, `sunlight_score`, `humidity_score`, `precip_score`, `overall_score`, `created_at`, `updated_at`
- ✅ Nasadzenia są posortowane alfabetycznie po `plant_name`, potem po `x`, następnie po `y`
- ✅ `pagination.next_cursor` jest `null` (jeśli wyników ≤ 25) lub stringiem Base64 (jeśli więcej)

---

## Test GET-2: Sukces - Listowanie z limitem

**Cel:** Weryfikacja działania parametru `limit`.

**Warunki wstępne:** Użytkownik posiada plan z co najmniej 3 nasadzeniami.

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants?limit=2`, {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Ilość wyników:", data.data.length);
console.log("Cursor:", data.pagination.next_cursor);

// Oczekiwany wynik:
// Status: 200
// data.length: 2
// pagination.next_cursor: string (Base64) - kursor do następnej strony
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ Zwrócono dokładnie 2 elementy (lub mniej jeśli jest mniej niż 2 nasadzenia)
- ✅ `pagination.next_cursor` jest stringiem Base64 (jeśli jest więcej niż 2 nasadzenia)
- ✅ Nasadzenia są posortowane alfabetycznie po `plant_name`

---

## Test GET-3: Sukces - Paginacja z cursorem

**Cel:** Weryfikacja cursor-based pagination (pobieranie kolejnych stron).

**Warunki wstępne:** Użytkownik posiada plan z co najmniej 3 nasadzeniami.

```javascript
// Krok 1: Pobierz pierwszą stronę z limitem 2
const firstPage = await fetch(`/api/plans/${testPlanId}/plants?limit=2`, {
  credentials: "include",
});
const firstData = await firstPage.json();
console.log(
  "Pierwsza strona:",
  firstData.data.map((p) => p.plant_name)
);
console.log("Cursor:", firstData.pagination.next_cursor);

// Krok 2: Użyj cursora do pobrania drugiej strony
const cursor = firstData.pagination.next_cursor;
if (cursor) {
  const secondPage = await fetch(`/api/plans/${testPlanId}/plants?limit=2&cursor=${encodeURIComponent(cursor)}`, {
    credentials: "include",
  });
  const secondData = await secondPage.json();
  console.log(
    "Druga strona:",
    secondData.data.map((p) => p.plant_name)
  );
  console.log("Cursor:", secondData.pagination.next_cursor);
}

// Oczekiwany wynik:
// Pierwsza strona: ['Bazylia', 'Bazylia Cytrynowa']
// Druga strona: ['Ogórek', 'Pomidor Cherry']
// Brak duplikatów między stronami
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK dla obu zapytań
- ✅ Brak duplikatów między stronami
- ✅ Każda strona zawiera max `limit` elementów
- ✅ Sortowanie jest spójne między stronami
- ✅ Ostatnia strona ma `next_cursor: null`

---

## Test GET-4: Sukces - Filtrowanie po nazwie (prefiks)

**Cel:** Weryfikacja działania filtru `name` (wyszukiwanie prefiksowe ILIKE).

**Warunki wstępne:** Użytkownik posiada plan z nasadzeniami różnych roślin.

```javascript
// Test 1: Filtr "Pomidor" - powinien znaleźć "Pomidor Cherry", "Pomidor Malinowy"
const response1 = await fetch(`/api/plans/${testPlanId}/plants?name=Pomidor`, {
  credentials: "include",
});
const data1 = await response1.json();
console.log("Status:", response1.status);
console.log(
  "Znalezione rośliny:",
  data1.data.map((p) => p.plant_name)
);

// Test 2: Filtr "Bazyl" - powinien znaleźć "Bazylia", "Bazylia Cytrynowa"
const response2 = await fetch(`/api/plans/${testPlanId}/plants?name=Bazyl`, {
  credentials: "include",
});
const data2 = await response2.json();
console.log(
  "Znalezione rośliny:",
  data2.data.map((p) => p.plant_name)
);

// Test 3: Filtr nieistniejącej rośliny
const response3 = await fetch(`/api/plans/${testPlanId}/plants?name=Marchew`, {
  credentials: "include",
});
const data3 = await response3.json();
console.log("Znalezione rośliny (pusta lista):", data3.data);

// Oczekiwany wynik:
// Test 1: ['Pomidor Cherry', 'Pomidor Malinowy']
// Test 2: ['Bazylia', 'Bazylia Cytrynowa']
// Test 3: []
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK dla wszystkich zapytań
- ✅ Filtr działa jako prefiks (ILIKE 'term%')
- ✅ Filtr jest case-insensitive (wielkie/małe litery nie mają znaczenia)
- ✅ Pusta lista gdy brak wyników (nie błąd 404)
- ✅ `pagination.next_cursor` działa poprawnie z filtrem

---

## Test GET-5: Sukces - Filtrowanie + paginacja

**Cel:** Weryfikacja kombinacji filtru `name` i paginacji.

**Warunki wstępne:** Użytkownik posiada plan z wieloma nasadzeniami tego samego prefiksu.

```javascript
// Pobierz pierwszą stronę roślin rozpoczynających się na "Pomidor"
const firstPage = await fetch(`/api/plans/${testPlanId}/plants?name=Pomidor&limit=1`, {
  credentials: "include",
});
const firstData = await firstPage.json();
console.log(
  "Pierwsza strona:",
  firstData.data.map((p) => p.plant_name)
);

// Pobierz drugą stronę używając cursora
if (firstData.pagination.next_cursor) {
  const cursor = encodeURIComponent(firstData.pagination.next_cursor);
  const secondPage = await fetch(`/api/plans/${testPlanId}/plants?name=Pomidor&limit=1&cursor=${cursor}`, {
    credentials: "include",
  });
  const secondData = await secondPage.json();
  console.log(
    "Druga strona:",
    secondData.data.map((p) => p.plant_name)
  );
}

// Oczekiwany wynik:
// Pierwsza strona: ['Pomidor Cherry']
// Druga strona: ['Pomidor Malinowy']
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ Filtr jest stosowany na obu stronach
- ✅ Paginacja działa poprawnie z filtrem
- ✅ Wszystkie wyniki pasują do prefiksu

---

## Test GET-6: Sukces - Pusty wynik (brak nasadzeń)

**Cel:** Weryfikacja odpowiedzi gdy plan nie ma żadnych nasadzeń.

**Warunki wstępne:** Użytkownik posiada plan bez nasadzeń (nowy plan).

```javascript
// Utwórz nowy pusty plan
const newPlanResponse = await fetch("/api/plans", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Plan testowy - pusty",
    width_cm: 1000,
    height_cm: 1000,
    cell_size_cm: 25,
    orientation: 0,
  }),
});
const newPlan = await newPlanResponse.json();
const emptyPlanId = newPlan.data.id;

// Pobierz listę nasadzeń (powinna być pusta)
const response = await fetch(`/api/plans/${emptyPlanId}/plants`, {
  credentials: "include",
});
const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 200
// data: []
// pagination.next_cursor: null
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK (nie 404)
- ✅ `data` jest pustą tablicą `[]`
- ✅ `pagination.next_cursor` jest `null`

---

## Test GET-7: Błąd 400 - Niepoprawny UUID planu

**Cel:** Weryfikacja walidacji plan_id (musi być UUID).

```javascript
const response = await fetch("/api/plans/invalid-uuid/plants", {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 400
// {
//   error: {
//     code: "ValidationError",
//     message: "Plan ID must be a valid UUID",
//     details: {
//       field_errors: {
//         plan_id: "Plan ID must be a valid UUID"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `error.details.field_errors.plan_id` zawiera komunikat błędu

---

## Test GET-8: Błąd 400 - Niepoprawny limit

**Cel:** Weryfikacja walidacji parametru `limit` (1-100).

```javascript
// Test 1: Limit = 0 (za mały)
const response1 = await fetch(`/api/plans/${testPlanId}/plants?limit=0`, {
  credentials: "include",
});
const data1 = await response1.json();
console.log("Status (limit=0):", response1.status);
console.log("Błąd:", data1);

// Test 2: Limit = 101 (za duży)
const response2 = await fetch(`/api/plans/${testPlanId}/plants?limit=101`, {
  credentials: "include",
});
const data2 = await response2.json();
console.log("Status (limit=101):", response2.status);
console.log("Błąd:", data2);

// Test 3: Limit = "abc" (nie liczba)
const response3 = await fetch(`/api/plans/${testPlanId}/plants?limit=abc`, {
  credentials: "include",
});
const data3 = await response3.json();
console.log("Status (limit=abc):", response3.status);
console.log("Błąd:", data3);

// Oczekiwany wynik dla wszystkich:
// Status: 400
// error.code: "ValidationError"
// error.message: Odpowiedni komunikat o limicie
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request dla wszystkich przypadków
- ✅ `error.code` to `"ValidationError"`
- ✅ Komunikat błędu wskazuje problem z limitem

---

## Test GET-9: Błąd 400 - Niepoprawny cursor

**Cel:** Weryfikacja walidacji parametru `cursor` (musi być poprawny Base64 z właściwą strukturą).

```javascript
// Test 1: Niepoprawny Base64
const response1 = await fetch(`/api/plans/${testPlanId}/plants?cursor=invalid!!!base64`, { credentials: "include" });
const data1 = await response1.json();
console.log("Status (invalid base64):", response1.status);
console.log("Błąd:", data1);

// Test 2: Poprawny Base64 ale niepoprawna struktura JSON
const invalidCursor = btoa('{"wrong": "structure"}');
const response2 = await fetch(`/api/plans/${testPlanId}/plants?cursor=${invalidCursor}`, { credentials: "include" });
const data2 = await response2.json();
console.log("Status (invalid structure):", response2.status);
console.log("Błąd:", data2);

// Oczekiwany wynik:
// Status: 400
// error.code: "ValidationError"
// error.message: "Invalid cursor format" lub "Invalid cursor structure"
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ Komunikat błędu wskazuje problem z cursorem
- ✅ Nie ujawnia wewnętrznych szczegółów struktury

---

## Test GET-10: Błąd 400 - Filtr name za krótki

**Cel:** Weryfikacja walidacji parametru `name` (min 1 znak).

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants?name=`, {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 400
// error.code: "ValidationError"
// error.message: "Name filter must be at least 1 character"
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ Komunikat błędu wskazuje problem z filtrem name

---

## Test GET-11: Błąd 401 - Brak autoryzacji

**Cel:** Weryfikacja wymagania autoryzacji (Supabase JWT).

```javascript
// Wyloguj się lub otwórz nowe okno incognito i wywołaj:
const response = await fetch(`/api/plans/${testPlanId}/plants`, {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 401
// {
//   error: {
//     code: "Unauthorized",
//     message: "Authentication required."
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 401 Unauthorized
- ✅ `error.code` to `"Unauthorized"`
- ✅ Odpowiedź nie zawiera żadnych danych o nasadzeniach

---

## Test GET-12: Błąd 404 - Plan nie istnieje

**Cel:** Weryfikacja obsługi nieistniejącego plan_id.

```javascript
// Użyj poprawnego UUID który nie istnieje
const nonExistentPlanId = "00000000-0000-0000-0000-000000000000";

const response = await fetch(`/api/plans/${nonExistentPlanId}/plants`, {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 404
// {
//   error: {
//     code: "NotFound",
//     message: "Plan not found."
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found
- ✅ `error.code` to `"NotFound"`
- ✅ Nie ujawnia czy plan istnieje ale należy do innego użytkownika

---

## Test GET-13: Błąd 403/404 - Plan innego użytkownika

**Cel:** Weryfikacja RLS (Row Level Security) - użytkownik nie może zobaczyć nasadzeń cudzego planu.

**Warunki wstępne:**

1. Zaloguj się jako Użytkownik A
2. Utwórz plan i zapisz jego ID
3. Zaloguj się jako Użytkownik B
4. Spróbuj pobrać nasadzenia planu Użytkownika A

```javascript
// (Po zalogowaniu jako Użytkownik B)
const userAPlanId = "PLAN_ID_FROM_USER_A";

const response = await fetch(`/api/plans/${userAPlanId}/plants`, {
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 404  (RLS sprawia że plan "nie istnieje" z perspektywy Użytkownika B)
// {
//   error: {
//     code: "NotFound",
//     message: "Plan not found."
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found (nie 403, aby nie ujawniać istnienia planu)
- ✅ `error.code` to `"NotFound"`
- ✅ RLS blokuje dostęp na poziomie bazy danych

---

## Test GET-14: Wydajność - Duża liczba nasadzeń

**Cel:** Weryfikacja wydajności przy paginacji dużej ilości danych.

**Warunki wstępne:** Plan z co najmniej 50 nasadzeniami.

```javascript
// Utwórz 50 testowych nasadzeń
const createPromises = [];
for (let i = 0; i < 50; i++) {
  const x = i % 10;
  const y = Math.floor(i / 10);
  createPromises.push(
    fetch(`/api/plans/${testPlanId}/plants/${x}/${y}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plant_name: `Roślina ${String(i).padStart(2, "0")}`,
        overall_score: (i % 5) + 1,
      }),
    })
  );
}
await Promise.all(createPromises);
console.log("Utworzono 50 nasadzeń");

// Test paginacji z limitem 25
const startTime = performance.now();
const response = await fetch(`/api/plans/${testPlanId}/plants?limit=25`, {
  credentials: "include",
});
const data = await response.json();
const endTime = performance.now();

console.log("Status:", response.status);
console.log("Ilość wyników:", data.data.length);
console.log("Czas odpowiedzi:", Math.round(endTime - startTime), "ms");
console.log("Cursor:", data.pagination.next_cursor ? "present" : "null");

// Oczekiwany wynik:
// Status: 200
// data.length: 25
// Czas odpowiedzi: < 500ms (zależy od infrastruktury)
// Cursor: present (Base64 string)
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ Zwrócono dokładnie 25 elementów (limit)
- ✅ Czas odpowiedzi akceptowalny (< 1s)
- ✅ `pagination.next_cursor` obecny (są następne strony)

---

## Test GET-15: Edge case - Znaki specjalne w filtrze name

**Cel:** Weryfikacja escape'owania znaków specjalnych ILIKE (%, \_) w filtrze name.

```javascript
// Utwórz nasadzenie z nazwą zawierającą znak %
await fetch(`/api/plans/${testPlanId}/plants/5/5`, {
  method: "PUT",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    plant_name: "Roślina 100% organiczna",
    overall_score: 5,
  }),
});

// Wyszukaj używając znaku %
const response = await fetch(`/api/plans/${testPlanId}/plants?name=${encodeURIComponent("Roślina 100%")}`, {
  credentials: "include",
});
const data = await response.json();
console.log("Status:", response.status);
console.log(
  "Znalezione:",
  data.data.map((p) => p.plant_name)
);

// Oczekiwany wynik:
// Status: 200
// Znalezione: ['Roślina 100% organiczna']
// Znak % nie działa jako wildcard, tylko jako literalny znak
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ Znak `%` jest traktowany literalnie (nie jako wildcard SQL)
- ✅ Znak `_` jest traktowany literalnie (nie jako wildcard SQL)
- ✅ Brak SQL injection przez znaki specjalne

---

## Podsumowanie testów GET

### Testy sukcesu (200 OK):

1. ✅ GET-1: Podstawowe listowanie
2. ✅ GET-2: Listowanie z limitem
3. ✅ GET-3: Paginacja z cursorem
4. ✅ GET-4: Filtrowanie po nazwie
5. ✅ GET-5: Filtrowanie + paginacja
6. ✅ GET-6: Pusty wynik

### Testy błędów walidacji (400 Bad Request):

7. ✅ GET-7: Niepoprawny UUID
8. ✅ GET-8: Niepoprawny limit
9. ✅ GET-9: Niepoprawny cursor
10. ✅ GET-10: Filtr name za krótki

### Testy błędów dostępu (401/403/404):

11. ✅ GET-11: Brak autoryzacji (401)
12. ✅ GET-12: Plan nie istnieje (404)
13. ✅ GET-13: Plan innego użytkownika (404)

### Testy wydajnościowe i edge cases:

14. ✅ GET-14: Wydajność (50 nasadzeń)
15. ✅ GET-15: Znaki specjalne w filtrze

**Łącznie GET:** 15 testów

---

# Testy manualne: PUT /api/plans/:plan_id/plants/:x/:y

## Przygotowanie środowiska testowego

Przed wykonaniem testów upewnij się, że:

1. Jesteś zalogowany do aplikacji
2. Masz dostęp do konsoli przeglądarki (F12 → Console)
3. Masz utworzony przynajmniej jeden plan działki z siatką

## Pobieranie ID planu testowego i wymiarów siatki

```javascript
// Pobierz listę swoich planów
const plansResponse = await fetch("/api/plans", {
  credentials: "include",
});
const plansData = await plansResponse.json();
console.log("Twoje plany:", plansData);

// Zapisz ID pierwszego planu do zmiennej
const testPlanId = plansData.data[0]?.id;
console.log("ID planu testowego:", testPlanId);

// Pobierz metadane siatki (wymiary)
const gridResponse = await fetch(`/api/plans/${testPlanId}/grid`, {
  credentials: "include",
});
const gridData = await gridResponse.json();
console.log("Wymiary siatki:", gridData);
// { data: { grid_width: 40, grid_height: 40, cell_size_cm: 25, orientation: 0 } }
```

## Sprawdzenie i przygotowanie komórki typu 'soil'

```javascript
// Pobierz komórki siatki (pierwsze 50)
const cellsResponse = await fetch(`/api/plans/${testPlanId}/grid/cells?limit=50`, {
  credentials: "include",
});
const cellsData = await cellsResponse.json();
console.log("Komórki siatki:", cellsData);

// Znajdź pierwszą komórkę typu 'soil'
const soilCell = cellsData.data.find((cell) => cell.type === "soil");
console.log("Komórka typu soil:", soilCell);

// Jeśli brak komórek soil, ustaw jedną na współrzędnych (5, 5)
if (!soilCell) {
  const updateResponse = await fetch(`/api/plans/${testPlanId}/grid/cells/5/5`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "soil" }),
  });
  const updateData = await updateResponse.json();
  console.log("Ustawiono komórkę (5, 5) jako soil:", updateData);
}

// Współrzędne testowe
const testX = soilCell?.x || 5;
const testY = soilCell?.y || 5;
console.log(`Współrzędne testowe: (${testX}, ${testY})`);
```

---

## Test 1: Sukces - Dodanie nowej rośliny

**Cel:** Weryfikacja poprawnego utworzenia nowego nasadzenia rośliny w komórce typu 'soil'.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Plan istnieje
- Komórka (testX, testY) ma typ 'soil'
- Brak rośliny na tej pozycji

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Pomidor",
    sunlight_score: 4,
    humidity_score: 3,
    precip_score: 4,
    overall_score: 4,
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 200
// Struktura: {
//   data: {
//     x: 5,
//     y: 5,
//     plant_name: "Pomidor",
//     sunlight_score: 4,
//     humidity_score: 3,
//     precip_score: 4,
//     overall_score: 4,
//     created_at: "iso-datetime",
//     updated_at: "iso-datetime"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ Zwrócone współrzędne `x`, `y` zgadzają się z żądaniem
- ✅ `plant_name` to `"Pomidor"`
- ✅ Wszystkie score'y są poprawnie zapisane (4, 3, 4, 4)
- ✅ `created_at` i `updated_at` są ustawione

---

## Test 2: Sukces - Aktualizacja istniejącej rośliny (upsert)

**Cel:** Weryfikacja aktualizacji rośliny na tej samej pozycji (operacja idempotentna).

**Warunki wstępne:** Roślina z Testu 1 istnieje na pozycji (testX, testY).

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Pomidor Cherry",
    sunlight_score: 5,
    humidity_score: 2,
    precip_score: 3,
    overall_score: 4,
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 200
// Struktura: {
//   data: {
//     x: 5,
//     y: 5,
//     plant_name: "Pomidor Cherry",
//     sunlight_score: 5,
//     humidity_score: 2,
//     precip_score: 3,
//     overall_score: 4,
//     created_at: "iso-datetime" (STARE),
//     updated_at: "iso-datetime" (NOWE - zaktualizowane)
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ `plant_name` został zaktualizowany na `"Pomidor Cherry"`
- ✅ Score'y zostały zaktualizowane (5, 2, 3, 4)
- ✅ `created_at` pozostaje bez zmian (data pierwszego utworzenia)
- ✅ `updated_at` jest nowsze niż `created_at`

---

## Test 3: Sukces - Roślina z opcjonalnymi score'ami (null)

**Cel:** Weryfikacja zapisu rośliny bez ocen dopasowania.

**Warunki wstępne:** Komórka (testX+1, testY) ma typ 'soil'.

```javascript
// Najpierw upewnij się, że komórka (testX+1, testY) jest typu 'soil'
await fetch(`/api/plans/${testPlanId}/grid/cells/${testX + 1}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "soil" }),
});

const response = await fetch(`/api/plans/${testPlanId}/plants/${testX + 1}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Bazylia",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 200
// Struktura: {
//   data: {
//     x: 6,
//     y: 5,
//     plant_name: "Bazylia",
//     sunlight_score: null,
//     humidity_score: null,
//     precip_score: null,
//     overall_score: null,
//     created_at: "iso-datetime",
//     updated_at: "iso-datetime"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ `plant_name` to `"Bazylia"`
- ✅ Wszystkie score'y są `null`
- ✅ Rekord został poprawnie utworzony

---

## Test 4: Błąd 400 - Brak wymaganego pola plant_name

**Cel:** Weryfikacja walidacji wymaganego pola.

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sunlight_score: 4,
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid request body",
//     details: {
//       field_errors: {
//         "plant_name": "Plant name is required"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `field_errors.plant_name` zawiera komunikat o wymaganym polu

---

## Test 5: Błąd 400 - Niepoprawny zakres score

**Cel:** Weryfikacja walidacji zakresu wartości score (1-5).

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
    sunlight_score: 10, // Niepoprawna wartość (max 5)
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid request body",
//     details: {
//       field_errors: {
//         "sunlight_score": "Sunlight score must be between 1 and 5"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `field_errors.sunlight_score` zawiera komunikat o zakresie 1-5

---

## Test 6: Błąd 400 - Niepoprawny UUID planu

**Cel:** Weryfikacja walidacji formatu UUID w parametrze ścieżki.

```javascript
const invalidPlanId = "not-a-uuid";

const response = await fetch(`/api/plans/${invalidPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         "plan_id": "Plan ID must be a valid UUID"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `field_errors.plan_id` zawiera komunikat o wymaganym UUID

---

## Test 7: Błąd 400 - Niepoprawne współrzędne (ujemne)

**Cel:** Weryfikacja walidacji zakresu współrzędnych (min 0).

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/-1/5`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         "x": "X coordinate must be at least 0"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `field_errors.x` zawiera komunikat o minimalnej wartości

---

## Test 8: Błąd 400 - Niepoprawne współrzędne (powyżej 199)

**Cel:** Weryfikacja walidacji zakresu współrzędnych (max 199).

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/200/5`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         "x": "X coordinate must be at most 199"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `field_errors.x` zawiera komunikat o maksymalnej wartości

---

## Test 9: Błąd 404 - Plan nie istnieje

**Cel:** Weryfikacja odpowiedzi gdy plan o podanym ID nie istnieje.

```javascript
const nonExistentPlanId = "00000000-0000-0000-0000-000000000000";

const response = await fetch(`/api/plans/${nonExistentPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 404
// Struktura: {
//   error: {
//     code: "NotFound",
//     message: "Plan not found or access denied"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found
- ✅ `error.code` to `"NotFound"`
- ✅ `error.message` wskazuje na brak planu lub brak dostępu

---

## Test 10: Błąd 404 - Komórka nie istnieje

**Cel:** Weryfikacja odpowiedzi gdy próbujemy dodać roślinę do nieistniejącej komórki.

**Uwaga:** Ten test może nie być możliwy, jeśli wszystkie komórki są automatycznie generowane. W takim przypadku przejdź do Testu 11.

```javascript
// Spróbuj uzyskać dostęp do komórki, która teoretycznie nie istnieje
// (Może wymagać ręcznego usunięcia rekordu z grid_cells przez admina DB)

const response = await fetch(`/api/plans/${testPlanId}/plants/199/199`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Jeśli komórka nie istnieje:
// Status: 404
// Struktura: {
//   error: {
//     code: "NotFound",
//     message: "Cell at coordinates (199, 199) not found"
//   }
// }

// Jeśli komórka istnieje (automatyczne generowanie), może być błąd 422 (jeśli typ != soil)
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found (jeśli komórka nie istnieje)
- ✅ `error.code` to `"NotFound"`
- ✅ `error.message` wskazuje współrzędne nieistniejącej komórki

---

## Test 11: Błąd 422 - Komórka nie jest typu 'soil'

**Cel:** Weryfikacja walidacji typu komórki (tylko 'soil' może zawierać rośliny).

```javascript
// Najpierw ustaw komórkę (testX+2, testY) jako 'path'
await fetch(`/api/plans/${testPlanId}/grid/cells/${testX + 2}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "path" }),
});

// Teraz spróbuj dodać roślinę na tę komórkę
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX + 2}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 422
// Struktura: {
//   error: {
//     code: "UnprocessableEntity",
//     message: "Cell at coordinates (7, 5) has type 'path', but only 'soil' cells can contain plants"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 422 Unprocessable Entity
- ✅ `error.code` to `"UnprocessableEntity"`
- ✅ `error.message` wskazuje typ komórki i wymaganie typu 'soil'

---

## Test 12: Błąd 422 - Współrzędne poza zakresem siatki

**Cel:** Weryfikacja walidacji granic siatki (grid_width, grid_height).

```javascript
// Pobierz wymiary siatki
const gridResponse = await fetch(`/api/plans/${testPlanId}/grid`, {
  credentials: "include",
});
const gridData = await gridResponse.json();
const gridWidth = gridData.data.grid_width;
const gridHeight = gridData.data.grid_height;

console.log(`Wymiary siatki: ${gridWidth}x${gridHeight}`);

// Spróbuj dodać roślinę poza zakresem siatki
const response = await fetch(`/api/plans/${testPlanId}/plants/${gridWidth}/${gridHeight}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 422
// Struktura: {
//   error: {
//     code: "UnprocessableEntity",
//     message: "Coordinates (40, 40) are out of grid bounds (40x40)"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 422 Unprocessable Entity
- ✅ `error.code` to `"UnprocessableEntity"`
- ✅ `error.message` wskazuje współrzędne i rzeczywiste wymiary siatki

---

## Test 13: Błąd 401 - Brak autentykacji

**Cel:** Weryfikacja wymagania autentykacji.

```javascript
// Wykonaj żądanie bez credentials (symulacja braku sesji)
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 401
// Struktura: {
//   error: {
//     code: "Unauthorized",
//     message: "Invalid or missing authentication token"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 401 Unauthorized
- ✅ `error.code` to `"Unauthorized"`
- ✅ `error.message` wskazuje brak lub niepoprawną autentykację

---

## Test 14: Błąd 403 - Dostęp do cudzego planu

**Cel:** Weryfikacja kontroli dostępu (RLS - Row Level Security).

**Uwaga:** Ten test wymaga posiadania UUID planu należącego do innego użytkownika. W normalnych warunkach RLS powinien blokować dostęp i endpoint powinien zwrócić 404 (plan nie znaleziony) zamiast 403 (brak uprawnień), aby nie ujawniać istnienia cudzych planów.

```javascript
// Użyj UUID planu innego użytkownika (jeśli znasz)
const otherUserPlanId = "INNY_UZYTKOWNIK_PLAN_UUID";

const response = await fetch(`/api/plans/${otherUserPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "Test",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik (zgodnie z bezpieczeństwem):
// Status: 404 (lub 403 jeśli RLS rzuci explicit error)
// Struktura: {
//   error: {
//     code: "NotFound" (lub "Forbidden"),
//     message: "Plan not found or access denied" (lub "Access to this plan is forbidden")
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found lub 403 Forbidden
- ✅ Brak dostępu do cudzego planu
- ✅ Komunikat nie ujawnia szczegółów planu innego użytkownika

---

## Test 15: Sukces - Długa nazwa rośliny (100 znaków)

**Cel:** Weryfikacja obsługi maksymalnej długości nazwy rośliny.

```javascript
const longName = "A".repeat(100); // 100 znaków 'A'

const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: longName,
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Długość nazwy:", data.data?.plant_name?.length);

// Oczekiwany wynik:
// Status: 200
// plant_name.length: 100
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ Nazwa rośliny ma dokładnie 100 znaków
- ✅ Rekord został poprawnie zapisany

---

## Test 16: Błąd 400 - Zbyt długa nazwa rośliny (101 znaków)

**Cel:** Weryfikacja walidacji maksymalnej długości nazwy rośliny.

```javascript
const tooLongName = "A".repeat(101); // 101 znaków 'A'

const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: tooLongName,
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid request body",
//     details: {
//       field_errors: {
//         "plant_name": "Plant name must be at most 100 characters"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ `error.code` to `"ValidationError"`
- ✅ `field_errors.plant_name` zawiera komunikat o maksymalnej długości

---

## Test 17: Sukces - Nazwa rośliny z białymi znakami (trimming)

**Cel:** Weryfikacja automatycznego usuwania białych znaków z początku i końca nazwy.

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plant_name: "   Truskawka   ",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Nazwa:", `"${data.data?.plant_name}"`);

// Oczekiwany wynik:
// Status: 200
// plant_name: "Truskawka" (bez spacji na początku i końcu)
```

**Weryfikacja:**

- ✅ Status HTTP: 200 OK
- ✅ `plant_name` to `"Truskawka"` (bez spacji)
- ✅ Automatyczny trim działa poprawnie

---

## Podsumowanie testów

### Testy sukcesu (200 OK):

1. ✅ Dodanie nowej rośliny ze wszystkimi score'ami
2. ✅ Aktualizacja istniejącej rośliny (upsert)
3. ✅ Dodanie rośliny bez score'ów (null)
4. ✅ Długa nazwa rośliny (100 znaków)
5. ✅ Automatyczne usuwanie białych znaków (trim)

### Testy błędów walidacji (400 Bad Request):

4. ✅ Brak wymaganego pola `plant_name`
5. ✅ Niepoprawny zakres score (>5)
6. ✅ Niepoprawny UUID planu
7. ✅ Ujemne współrzędne
8. ✅ Współrzędne >199
9. ✅ Zbyt długa nazwa rośliny (>100)

### Testy błędów dostępu (401/403/404):

9. ✅ Plan nie istnieje (404)
10. ✅ Komórka nie istnieje (404)
11. ✅ Brak autentykacji (401)
12. ✅ Dostęp do cudzego planu (403/404)

### Testy błędów logiki biznesowej (422):

11. ✅ Komórka nie jest typu 'soil'
12. ✅ Współrzędne poza zakresem siatki

**Łącznie:** 17 testów pokrywających wszystkie scenariusze użycia i błędów.

---

# Testy manualne: DELETE /api/plans/:plan_id/plants/:x/:y

## Przygotowanie środowiska testowego

Przed wykonaniem testów DELETE upewnij się, że:

1. Jesteś zalogowany do aplikacji
2. Masz dostęp do konsoli przeglądarki (F12 → Console)
3. Masz utworzony przynajmniej jeden plan działki z siatką
4. Masz nasadzoną przynajmniej jedną roślinę do testowego usunięcia

## Przygotowanie nasadzenia testowego

```javascript
// Użyj zmiennych z poprzednich testów PUT (testPlanId, testX, testY)
// Lub pobierz nowe

// Dodaj roślinę testową do usunięcia
const setupResponse = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    plant_name: "Roślina do usunięcia",
    sunlight_score: 3,
    humidity_score: 3,
    precip_score: 3,
    overall_score: 3,
  }),
});
const setupData = await setupResponse.json();
console.log("Nasadzenie testowe utworzone:", setupData);
```

---

## Test DEL-1: Sukces - Usunięcie istniejącego nasadzenia

**Cel:** Weryfikacja poprawnego usunięcia nasadzenia rośliny z komórki.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Plan istnieje i należy do użytkownika
- Komórka (testX, testY) istnieje
- Roślina jest posadzona na tej pozycji

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "DELETE",
  credentials: "include",
});

console.log("Status:", response.status);
console.log("Status Text:", response.statusText);
console.log("Body:", await response.text()); // powinno być puste

// Oczekiwany wynik:
// Status: 204
// Status Text: "No Content"
// Body: "" (pusty string)
```

**Weryfikacja:**

- ✅ Status HTTP: 204 No Content
- ✅ Brak body w odpowiedzi
- ✅ Nasadzenie zostało usunięte z bazy

**Weryfikacja usunięcia:**

```javascript
// Sprawdź czy roślina została usunięta
const verifyResponse = await fetch(`/api/plans/${testPlanId}/plants?limit=100`, {
  credentials: "include",
});
const verifyData = await verifyResponse.json();
const deletedPlant = verifyData.data.find((p) => p.x === testX && p.y === testY);
console.log("Roślina nadal istnieje?", deletedPlant ? "TAK - BŁĄD!" : "NIE - OK");
```

---

## Test DEL-2: Błąd - Usunięcie nieistniejącego nasadzenia

**Cel:** Weryfikacja odpowiedzi 404 gdy próbujemy usunąć nasadzenie, którego nie ma.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Plan istnieje
- Komórka istnieje
- **BRAK** nasadzenia na pozycji (testX, testY)

```javascript
// Najpierw upewnij się, że nie ma nasadzenia (wykonaj DEL-1 jeśli jeszcze nie)
// Lub użyj innej pustej komórki

const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 404
// Struktura: {
//   error: {
//     code: "NotFound",
//     message: "No plant placement found at coordinates (X, Y)"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found
- ✅ Kod błędu: "NotFound"
- ✅ Komunikat zawiera współrzędne

---

## Test DEL-3: Błąd - Usunięcie z nieistniejącej komórki

**Cel:** Weryfikacja odpowiedzi 404 gdy komórka nie istnieje.

```javascript
// Użyj współrzędnych komórki, która nie została jeszcze utworzona
// Np. wysokie współrzędne w zakresie siatki, ale bez zdefiniowanej komórki
const unusedX = 15;
const unusedY = 15;

const response = await fetch(`/api/plans/${testPlanId}/plants/${unusedX}/${unusedY}`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 404
// Struktura: {
//   error: {
//     code: "NotFound",
//     message: "Cell at coordinates (15, 15) not found"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found
- ✅ Kod błędu: "NotFound"
- ✅ Komunikat: "Cell at coordinates (...) not found"

---

## Test DEL-4: Błąd - Nieprawidłowy UUID planu

**Cel:** Weryfikacja walidacji UUID planu.

```javascript
const invalidPlanId = "not-a-valid-uuid";

const response = await fetch(`/api/plans/${invalidPlanId}/plants/${testX}/${testY}`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         plan_id: "Plan ID must be a valid UUID"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: "ValidationError"
- ✅ Szczegóły błędu dla pola `plan_id`

---

## Test DEL-5: Błąd - Współrzędne poza zakresem siatki

**Cel:** Weryfikacja kontroli granic siatki.

```javascript
// Pobierz wymiary siatki jeśli jeszcze nie masz
const gridResponse = await fetch(`/api/plans/${testPlanId}/grid`, {
  credentials: "include",
});
const gridData = await gridResponse.json();
const gridWidth = gridData.data.grid_width;
const gridHeight = gridData.data.grid_height;

// Użyj współrzędnych poza zakresem
const outOfBoundsX = gridWidth; // Równe szerokości (pierwszy poza zakresem)
const outOfBoundsY = gridHeight; // Równe wysokości (pierwszy poza zakresem)

const response = await fetch(`/api/plans/${testPlanId}/plants/${outOfBoundsX}/${outOfBoundsY}`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Coordinates (X, Y) are out of grid bounds (widthxheight)"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: "ValidationError"
- ✅ Komunikat zawiera rzeczywiste wymiary siatki

---

## Test DEL-6: Błąd - Ujemne współrzędne

**Cel:** Weryfikacja walidacji ujemnych współrzędnych.

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/-1/-1`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         x: "X coordinate must be at least 0",
//         y: "Y coordinate must be at least 0"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: "ValidationError"
- ✅ Błędy dla obu współrzędnych

---

## Test DEL-7: Błąd - Współrzędne >199

**Cel:** Weryfikacja walidacji maksymalnych współrzędnych (limit schematu Zod).

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/200/200`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         x: "X coordinate must be at most 199",
//         y: "Y coordinate must be at most 199"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: "ValidationError"
- ✅ Błędy dla obu współrzędnych

---

## Test DEL-8: Błąd - Plan nie istnieje

**Cel:** Weryfikacja odpowiedzi 404 gdy plan o podanym UUID nie istnieje.

```javascript
// Użyj prawidłowego UUID, który nie istnieje w bazie
const nonExistentPlanId = "00000000-0000-0000-0000-000000000000";

const response = await fetch(`/api/plans/${nonExistentPlanId}/plants/${testX}/${testY}`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 404
// Struktura: {
//   error: {
//     code: "NotFound",
//     message: "Plan not found or access denied"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found
- ✅ Kod błędu: "NotFound"
- ✅ Komunikat: "Plan not found or access denied"

---

## Test DEL-9: Błąd - Brak autentykacji

**Cel:** Weryfikacja wymagania uwierzytelnienia.

**Uwaga:** Ten test wymaga wylogowania się z aplikacji lub użycia trybu prywatnego/incognito.

```javascript
// WYLOGUJ SIĘ z aplikacji lub otwórz nową kartę incognito

const response = await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 401
// Struktura: {
//   error: {
//     code: "Unauthorized",
//     message: "Invalid or missing authentication token"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 401 Unauthorized
- ✅ Kod błędu: "Unauthorized"

---

## Test DEL-10: Błąd - Dostęp do cudzego planu

**Cel:** Weryfikacja ochrony przed dostępem do planów innych użytkowników.

**Uwaga:** Ten test wymaga dwóch kont użytkowników.

```javascript
// 1. Zaloguj się jako Użytkownik A
// 2. Utwórz plan i zapisz jego ID
const userAPlanId = "..."; // ID planu Użytkownika A

// 3. Wyloguj się i zaloguj jako Użytkownik B
// 4. Spróbuj usunąć nasadzenie z planu Użytkownika A

const response = await fetch(`/api/plans/${userAPlanId}/plants/5/5`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 404 (lub 403 jeśli RLS zwróci błąd 42501)
// Struktura: {
//   error: {
//     code: "NotFound" lub "Forbidden",
//     message: "Plan not found or access denied" lub "Access to this plan is forbidden"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found lub 403 Forbidden
- ✅ Użytkownik B nie może usunąć nasadzenia z planu Użytkownika A
- ✅ Komunikat nie ujawnia szczegółów (bezpieczeństwo)

---

## Test DEL-11: Weryfikacja braku modyfikacji typu komórki

**Cel:** Potwierdzenie, że usunięcie nasadzenia nie zmienia typu komórki.

```javascript
// 1. Dodaj roślinę
await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "PUT",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    plant_name: "Test komórki",
    overall_score: 3,
  }),
});

// 2. Sprawdź typ komórki przed usunięciem
const beforeResponse = await fetch(`/api/plans/${testPlanId}/grid/cells/${testX}/${testY}`, {
  credentials: "include",
});
const beforeData = await beforeResponse.json();
const typeBefore = beforeData.data.type;
console.log("Typ komórki przed usunięciem:", typeBefore);

// 3. Usuń nasadzenie
await fetch(`/api/plans/${testPlanId}/plants/${testX}/${testY}`, {
  method: "DELETE",
  credentials: "include",
});

// 4. Sprawdź typ komórki po usunięciu
const afterResponse = await fetch(`/api/plans/${testPlanId}/grid/cells/${testX}/${testY}`, {
  credentials: "include",
});
const afterData = await afterResponse.json();
const typeAfter = afterData.data.type;
console.log("Typ komórki po usunięciu:", typeAfter);

// Weryfikacja
console.log("Typ się nie zmienił?", typeBefore === typeAfter ? "TAK - OK" : "NIE - BŁĄD!");
```

**Weryfikacja:**

- ✅ Typ komórki pozostaje niezmieniony po usunięciu nasadzenia
- ✅ Komórka nadal istnieje w bazie

---

## Test DEL-12: Nieprawidłowy format współrzędnych

**Cel:** Weryfikacja obsługi nieprawidłowych typów danych dla współrzędnych.

```javascript
const response = await fetch(`/api/plans/${testPlanId}/plants/abc/xyz`, {
  method: "DELETE",
  credentials: "include",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 400
// Struktura: {
//   error: {
//     code: "ValidationError",
//     message: "Invalid path parameters",
//     details: {
//       field_errors: {
//         x: "X coordinate must be an integer",
//         y: "Y coordinate must be an integer"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: "ValidationError"
- ✅ Błędy walidacji dla współrzędnych

---

## Podsumowanie testów DELETE

### Testy sukcesu (204 No Content):

1. ✅ DEL-1: Usunięcie istniejącego nasadzenia

### Testy błędów walidacji (400 Bad Request):

4. ✅ DEL-4: Nieprawidłowy UUID planu
5. ✅ DEL-5: Współrzędne poza zakresem siatki
6. ✅ DEL-6: Ujemne współrzędne
7. ✅ DEL-7: Współrzędne >199
8. ✅ DEL-12: Nieprawidłowy format współrzędnych

### Testy błędów dostępu (401/403/404):

2. ✅ DEL-2: Usunięcie nieistniejącego nasadzenia (404)
3. ✅ DEL-3: Usunięcie z nieistniejącej komórki (404)
4. ✅ DEL-8: Plan nie istnieje (404)
5. ✅ DEL-9: Brak autentykacji (401)
6. ✅ DEL-10: Dostęp do cudzego planu (403/404)

### Testy logiki biznesowej:

11. ✅ DEL-11: Brak modyfikacji typu komórki po usunięciu

**Łącznie:** 12 testów DELETE pokrywających wszystkie scenariusze użycia i błędów.

---

## Podsumowanie wszystkich testów (GET + PUT + DELETE)

**GET /api/plans/:plan_id/plants:** 15 testów  
**PUT /api/plans/:plan_id/plants/:x/:y:** 17 testów  
**DELETE /api/plans/:plan_id/plants/:x/:y:** 12 testów  
**Łącznie:** 44 testy manualne
