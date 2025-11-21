# Testy Manualne: Endpoint Grid Area Type

**Data utworzenia:** 2025-11-18  
**Zakres:** POST /api/plans/:plan_id/grid
**Środowisko:** Development (localhost:4321)  
**Narzędzia:** Konsola przeglądarki (Chrome/Firefox), PowerShell

---

## 1. Przygotowanie do testów

### 1.1 Uruchomienie środowiska dev

```powershell
# PowerShell - uruchom serwer dev
cd C:\dev\10xDevs\10x-project
npm run dev

# Serwer powinien być dostępny na: http://localhost:4321
```

### 1.2 Utworzenie konta testowego

**Opcja A: Przez UI aplikacji**

1. Otwórz przeglądarkę: `http://localhost:4321/auth/register`
2. Zarejestruj się:
   - Email: `test@example.com`
   - Hasło: `Test1234!`
   - Potwierdź hasło: `Test1234!`
3. Po rejestracji:
   - Jeśli email verification włączone: przejdź do Supabase Inbucket (`http://localhost:54324`)
   - Kliknij link weryfikacyjny
4. Zaloguj się: `http://localhost:4321/auth/login`

**Opcja B: Bezpośrednio w Supabase Studio**

1. Otwórz: `http://localhost:54323` (Supabase Studio)
2. Authentication → Users → Add User
3. Utwórz użytkownika z email i hasłem

### 1.3 Utworzenie planu testowego

Przed testami potrzebujesz plan z siatką. Użyj konsoli przeglądarki:

```javascript
// Zaloguj się najpierw w aplikacji, potem otwórz DevTools (F12) → Console

// Utwórz plan testowy
fetch("/api/plans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    name: "Test Grid Area",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Plan utworzony:", data.data);
    console.log("Plan ID:", data.data.id);
    console.log("Grid:", data.data.grid_width, "x", data.data.grid_height);
    // Zapisz ID dla testów
    window.testPlanId = data.data.id;
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik:
// Plan ID: uuid
// Grid: 20 x 16 (500cm / 25cm = 20, 400cm / 25cm = 16)
```

### 1.4 Weryfikacja siatki w bazie

W Supabase Studio → Table Editor → grid_cells:

- Sprawdź czy istnieją rekordy dla Twojego planu
- Wszystkie komórki powinny mieć domyślny typ: `soil`
- Liczba rekordów: grid*width * grid*height (np. 20 * 16 = 320)

---

## 2. Testy GET /api/plans/:plan_id/grid

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz plan testowy (sekcja 1.3)
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 2.1 GET - Sukces: pobranie metadanych siatki (200 OK)

```javascript
// Test: Pobierz metadane siatki dla istniejącego planu
// UWAGA: Użyj window.testPlanId z testu 1.3
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET - Sukces:", data);
    console.log("Grid Width:", data.data.grid_width);
    console.log("Grid Height:", data.data.grid_height);
    console.log("Cell Size:", data.data.cell_size_cm, "cm");
    console.log("Orientation:", data.data.orientation, "°");
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// {
//   "data": {
//     "grid_width": 20,      // dla planu 500cm / 25cm
//     "grid_height": 16,     // dla planu 400cm / 25cm
//     "cell_size_cm": 25,
//     "orientation": 0
//   }
// }
```

### 2.2 GET - Sukces: weryfikacja wszystkich pól (200 OK)

```javascript
// Test: Sprawdź strukturę odpowiedzi
fetch(`/api/plans/${window.testPlanId}/grid`, {
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET - Struktura odpowiedzi:");
    console.log("Czy ma pole data?", "data" in data);
    console.log("Czy data ma grid_width?", "grid_width" in data.data);
    console.log("Czy data ma grid_height?", "grid_height" in data.data);
    console.log("Czy data ma cell_size_cm?", "cell_size_cm" in data.data);
    console.log("Czy data ma orientation?", "orientation" in data.data);
    console.log("Liczba pól w data:", Object.keys(data.data).length);
  });

// Oczekiwany wynik:
// Wszystkie pola obecne, dokładnie 4 pola w data
```

### 2.3 GET - Błąd: plan nie istnieje (404 NotFound)

```javascript
// Test: Pobierz metadane dla nieistniejącego planu
fetch("/api/plans/00000000-0000-0000-0000-000000000000/grid", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - NotFound:", data);
    console.log("Status:", data.error.code);
    console.log("Message:", data.error.message);
  });

// Oczekiwany wynik (404 Not Found):
// {
//   "error": {
//     "code": "NotFound",
//     "message": "Plan not found."
//   }
// }
```

### 2.4 GET - Błąd: nieprawidłowy UUID planu (422 UnprocessableEntity)

```javascript
// Test: Nieprawidłowy format UUID
fetch("/api/plans/not-a-uuid/grid", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - ValidationError (UUID):", data);
    console.log("Błąd:", data.error.message);
    console.log("Field errors:", data.error.details?.field_errors);
  });

// Oczekiwany wynik (422 Unprocessable Entity):
// {
//   "error": {
//     "code": "UnprocessableEntity",
//     "message": "Invalid path parameters.",
//     "details": {
//       "field_errors": {
//         "plan_id": "Plan ID must be a valid UUID"
//       }
//     }
//   }
// }
```

### 2.5 GET - Błąd: pusty UUID (422 UnprocessableEntity)

```javascript
// Test: Pusty string jako plan_id
fetch("/api/plans//grid", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - ValidationError (pusty UUID):", data);
  })
  .catch((err) => {
    // Może zwrócić 404 przez routing Astro
    console.log("❌ Routing error lub 404:", err);
  });

// Oczekiwany wynik: 404 (routing) lub 422 (walidacja)
```

### 2.6 GET - Błąd: brak autoryzacji (401 Unauthorized)

```javascript
// Test: Wyloguj się i spróbuj pobrać metadane
// UWAGA: Najpierw wyloguj się z aplikacji lub użyj fetch bez credentials

fetch(`/api/plans/${window.testPlanId}/grid`, {
  method: "GET",
  credentials: "omit", // Bez wysyłania cookies sesji
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - Unauthorized:", data);
    console.log("Status:", data.error.code);
  });

// Oczekiwany wynik (401 Unauthorized):
// {
//   "error": {
//     "code": "Unauthorized",
//     "message": "You must be logged in to access this resource."
//   }
// }

// Aby przetestować ponownie po wylogowaniu:
// 1. Wyloguj się z aplikacji
// 2. Otwórz Console
// 3. Wykonaj fetch z credentials: 'include'
```

### 2.7 GET - Test bezpieczeństwa: plan innego użytkownika (404 NotFound)

```javascript
// Test: Utwórz drugie konto, stwórz plan, próbuj dostać się do niego z pierwszego konta

// Krok 1: Zapisz ID planu pierwszego użytkownika
const user1PlanId = window.testPlanId;
console.log("Plan użytkownika 1:", user1PlanId);

// Krok 2: Wyloguj się i zaloguj jako inny użytkownik
// (wykonaj przez UI aplikacji)

// Krok 3: Po zalogowaniu jako użytkownik 2, spróbuj pobrać plan użytkownika 1
fetch(`/api/plans/${user1PlanId}/grid`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - Cudzy plan:", data);
    console.log("Status:", data.error.code);
  });

// Oczekiwany wynik (404 Not Found):
// Plan nie zostanie znaleziony, bo nie należy do zalogowanego użytkownika
// RLS + filtr user_id zapewniają, że nie ujawniamy informacji o istnieniu planu
```

### 2.8 GET - Wydajność: pomiar czasu odpowiedzi

```javascript
// Test: Zmierz czas odpowiedzi
const iterations = 10;
const times = [];

for (let i = 0; i < iterations; i++) {
  const start = performance.now();

  await fetch(`/api/plans/${window.testPlanId}/grid`, {
    credentials: "include",
  })
    .then((res) => res.json())
    .then(() => {
      const time = performance.now() - start;
      times.push(time);
      console.log(`Iteracja ${i + 1}: ${time.toFixed(2)}ms`);
    });

  // Krótka przerwa między requestami
  await new Promise((resolve) => setTimeout(resolve, 50));
}

// Statystyki
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const min = Math.min(...times);
const max = Math.max(...times);

console.log("\n📊 Statystyki wydajności:");
console.log(`Średnia: ${avg.toFixed(2)}ms`);
console.log(`Min: ${min.toFixed(2)}ms`);
console.log(`Max: ${max.toFixed(2)}ms`);

// Oczekiwany wynik:
// Średnia < 100ms (pojedyncze zapytanie SELECT po kluczu głównym)
```

### 2.9 GET - Weryfikacja w bazie danych

```javascript
// Po wykonaniu GET, zweryfikuj w Supabase Studio

// Supabase Studio → Table Editor → plans
// Znajdź plan po ID (window.testPlanId)
// Porównaj wartości:
// - grid_width
// - grid_height
// - cell_size_cm
// - orientation

// Przykładowe zapytanie SQL:
/*
SELECT 
  id,
  name,
  grid_width,
  grid_height,
  cell_size_cm,
  orientation
FROM public.plans
WHERE id = 'twoje-uuid-planu';
*/

console.log("ℹ️ Sprawdź wartości w Supabase Studio → Table Editor → plans");
console.log("Plan ID:", window.testPlanId);
```

### 2.10 GET - Test cache (opcjonalny)

```javascript
// Test: Sprawdź czy endpoint nie zwraca cache headers
fetch(`/api/plans/${window.testPlanId}/grid`, {
  credentials: "include",
})
  .then((res) => {
    console.log("📋 Response headers:");
    console.log("Cache-Control:", res.headers.get("Cache-Control"));
    console.log("ETag:", res.headers.get("ETag"));
    console.log("Last-Modified:", res.headers.get("Last-Modified"));

    return res.json();
  })
  .then((data) => {
    console.log("Data:", data);
  });

// Uwaga: Obecnie nie implementujemy cache, ale to miejsce na przyszłe testy
```

---

## 3. Testy POST /api/plans/:plan_id/grid/area-type

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz plan testowy (sekcja 1.3)
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 2.1 POST - Sukces: zmiana typu prostokąta (200 OK)

```javascript
// Test: Zmień typ komórek w prostokącie (x: 0-4, y: 0-4) na 'water'
// UWAGA: Użyj window.testPlanId z testu 1.3
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Sukces:", data);
    console.log("Zmienione komórki:", data.data.affected_cells);
    console.log("Usunięte rośliny:", data.data.removed_plants);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// {
//   "data": {
//     "affected_cells": 25,    // (4-0+1) * (4-0+1) = 5*5 = 25
//     "removed_plants": 0      // Brak roślin w tym obszarze
//   }
// }

// Weryfikacja w DB (Supabase Studio → grid_cells):
// SELECT * FROM grid_cells
// WHERE plan_id = 'twoje-uuid'
//   AND x BETWEEN 0 AND 4
//   AND y BETWEEN 0 AND 4;
// Wszystkie 25 komórek powinny mieć type = 'water'
```

### 2.2 POST - Sukces: zmiana pojedynczej komórki (200 OK)

```javascript
// Test: Zmień typ pojedynczej komórki (x1=y1=x2=y2)
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    type: "building",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Pojedyncza komórka:", data);
    console.log("Zmienione komórki:", data.data.affected_cells);
  });

// Oczekiwany wynik (200 OK):
// affected_cells: 1  // (10-10+1) * (10-10+1) = 1*1 = 1
```

### 2.3 POST - Sukces: zmiana na 'soil' (200 OK)

```javascript
// Test: Zmień typ z powrotem na 'soil'
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    type: "soil",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Zmiana na soil:", data);
  });

// Oczekiwany wynik (200 OK):
// affected_cells: 25, removed_plants: 0
```

### 2.4 POST - Sukces: zmiana całej siatki (200 OK)

```javascript
// Test: Zmień typ wszystkich komórek (0-19, 0-15 dla grid 20x16)
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 19,
    y2: 15,
    type: "path",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Cała siatka:", data);
    console.log("Zmienione komórki:", data.data.affected_cells);
  });

// Oczekiwany wynik (200 OK):
// affected_cells: 320  // 20 * 16 = 320
```

### 2.5 POST - Sukces: różne typy komórek (200 OK)

```javascript
// Test: Przetestuj wszystkie typy komórek

const types = ["soil", "water", "path", "building", "blocked"];
let x = 0;

for (const type of types) {
  await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      x1: x,
      y1: 0,
      x2: x + 2,
      y2: 2,
      type: type,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(`✅ Typ '${type}':`, data.data.affected_cells, "komórek");
    });

  x += 3; // Przesuń o 3 w prawo dla następnego typu
  await new Promise((resolve) => setTimeout(resolve, 100)); // Delay
}

// Każdy typ powinien zwrócić 200 OK z affected_cells: 9 (3*3)
```

### 2.6 POST - Błąd walidacji: x1 > x2 (422 UnprocessableEntity)

```javascript
// Test: Nieprawidłowa kolejność współrzędnych
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 5,
    y1: 0,
    x2: 2, // x2 < x1 - BŁĄD!
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (x1 > x2):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (422 Unprocessable Entity):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "x1 must be less than or equal to x2",
//     "details": {
//       "field_errors": {
//         "x1": "x1 must be less than or equal to x2"
//       }
//     }
//   }
// }
```

### 2.7 POST - Błąd walidacji: y1 > y2 (422 UnprocessableEntity)

```javascript
// Test: Nieprawidłowa kolejność y
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 5, // y1 > y2 - BŁĄD!
    x2: 4,
    y2: 2,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (y1 > y2):", data);
  });

// Oczekiwany wynik (422):
// "y1 must be less than or equal to y2"
```

### 2.8 POST - Błąd walidacji: ujemne współrzędne (422 UnprocessableEntity)

```javascript
// Test: Współrzędne ujemne
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: -1, // BŁĄD!
    y1: 0,
    x2: 4,
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (ujemne x1):", data);
  });

// Oczekiwany wynik (422):
// "x1 must be a non-negative integer"
```

### 2.9 POST - Błąd walidacji: nieprawidłowy typ komórki (422 UnprocessableEntity)

```javascript
// Test: Nieznany typ (dozwolone: soil, water, path, building, blocked)
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    type: "grass", // BŁĄD! Nieznany typ
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (nieprawidłowy typ):", data);
  });

// Oczekiwany wynik (422):
// "Type must be one of: soil, water, path, building, blocked"
```

### 2.10 POST - Błąd walidacji: współrzędne poza granicami siatki (422 UnprocessableEntity)

```javascript
// Test: Współrzędne poza granicami (grid 20x16)
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 25, // BŁĄD! grid_width = 20, max x = 19
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (poza granicami):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (422):
// {
//   "error": {
//     "code": "UnprocessableEntity",
//     "message": "Coordinates out of bounds. Grid dimensions: 20x16, provided: x1=0, y1=0, x2=25, y2=4",
//     "details": {
//       "field_errors": {
//         "x1": "Coordinates out of bounds..."
//       }
//     }
//   }
// }
```

### 2.11 POST - Błąd walidacji: brakujące pola (422 UnprocessableEntity)

```javascript
// Test: Brak wymaganego pola 'type'
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    // type: BRAK!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (brak typu):", data);
  });

// Oczekiwany wynik (422):
// Zod zwróci błąd brakującego pola
```

### 2.12 POST - Błąd walidacji: dodatkowe nieznane pole (422 UnprocessableEntity)

```javascript
// Test: Dodatkowe pole (strict mode)
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    type: "water",
    extra_field: "value", // Nieznane pole
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (dodatkowe pole):", data);
  });

// Oczekiwany wynik (422):
// Zod strict mode odrzuci dodatkowe pola
```

### 2.13 POST - Błąd walidacji: nieprawidłowy typ danych (422 UnprocessableEntity)

```javascript
// Test: String zamiast number dla współrzędnych
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: "0", // String zamiast number
    y1: 0,
    x2: 4,
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (typ danych):", data);
  });

// Oczekiwany wynik (422):
// "x1 must be a number" lub podobny błąd typu
```

### 2.14 POST - Błąd: nieprawidłowy JSON (400 Bad Request)

```javascript
// Test: Nieprawidłowy JSON
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: "{invalid json}",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - Invalid JSON:", data);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Invalid JSON body."
//   }
// }
```

### 2.15 POST - Błąd: nieprawidłowy UUID planu (422 UnprocessableEntity)

```javascript
// Test: Nieprawidłowy format UUID
fetch("/api/plans/not-a-uuid/grid/area-type", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (UUID):", data);
  });

// Oczekiwany wynik (422):
// "Plan ID must be a valid UUID"
```

### 2.16 POST - Błąd: plan nie istnieje (404 NotFound)

```javascript
// Test: Plan nie istnieje
fetch("/api/plans/00000000-0000-0000-0000-000000000000/grid/area-type", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 0,
    y1: 0,
    x2: 4,
    y2: 4,
    type: "water",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - NotFound:", data);
  });

// Oczekiwany wynik (404 Not Found):
// {
//   "error": {
//     "code": "NotFound",
//     "message": "Plan not found."
//   }
// }
```

---

## 3. Testy mechanizmu potwierdzenia usuwania roślin

### 3.1 Przygotowanie: Dodaj rośliny do planu

```javascript
// UWAGA: Najpierw przywróć typ 'soil' w obszarze testowym

// Krok 1: Zmień typ na 'soil'
await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 5,
    y1: 5,
    x2: 9,
    y2: 9,
    type: "soil",
  }),
})
  .then((r) => r.json())
  .then((d) => console.log("✅ Obszar zmieniony na soil:", d));

// Krok 2: Dodaj rośliny (mockowane - zakładamy że istnieje endpoint PUT /plants/:x/:y)
// UWAGA: Ten endpoint może nie być jeszcze zaimplementowany
// Alternatywa: Dodaj rośliny ręcznie w Supabase Studio

// Supabase Studio → Table Editor → plant_placements → Insert Row:
// plan_id: twoje-uuid
// x: 5, y: 5, plant_name: 'Tomato'
// x: 6, y: 6, plant_name: 'Cucumber'
// x: 7, y: 7, plant_name: 'Pepper'

console.log("⚠️ Dodaj 3 rośliny ręcznie w Supabase Studio w obszarze (5-9, 5-9)");
```

### 3.2 POST - Konflikt: usuwanie roślin BEZ potwierdzenia (409 Conflict)

```javascript
// Test: Próba zmiany typu na non-soil gdy są rośliny
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 5,
    y1: 5,
    x2: 9,
    y2: 9,
    type: "water",
    // confirm_plant_removal: BRAK!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - Conflict (brak potwierdzenia):", data);
    console.log("Liczba roślin:", data.error.details?.field_errors?.plant_count);
  });

// Oczekiwany wynik (409 Conflict):
// {
//   "error": {
//     "code": "Conflict",
//     "message": "There are 3 plant(s) in the selected area. Set confirm_plant_removal=true to proceed.",
//     "details": {
//       "field_errors": {
//         "plant_count": "3"
//       }
//     }
//   }
// }
```

### 3.3 POST - Sukces: usuwanie roślin Z potwierdzeniem (200 OK)

```javascript
// Test: Zmiana typu na non-soil Z potwierdzeniem
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 5,
    y1: 5,
    x2: 9,
    y2: 9,
    type: "water",
    confirm_plant_removal: true, // Potwierdzenie!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Usunięcie roślin z potwierdzeniem:", data);
    console.log("Zmienione komórki:", data.data.affected_cells);
    console.log("Usunięte rośliny:", data.data.removed_plants);
  });

// Oczekiwany wynik (200 OK):
// {
//   "data": {
//     "affected_cells": 25,    // (9-5+1) * (9-5+1) = 5*5 = 25
//     "removed_plants": 3      // 3 rośliny zostały usunięte
//   }
// }

// Weryfikacja w DB (Supabase Studio → plant_placements):
// SELECT * FROM plant_placements
// WHERE plan_id = 'twoje-uuid'
//   AND x BETWEEN 5 AND 9
//   AND y BETWEEN 5 AND 9;
// Wynik: 0 rekordów (wszystkie rośliny usunięte)
```

### 3.4 POST - Sukces: zmiana na 'soil' nie wymaga potwierdzenia (200 OK)

```javascript
// Test: Zmiana na 'soil' nigdy nie usuwa roślin (ale ich też tam nie ma po 3.3)
fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 5,
    y1: 5,
    x2: 9,
    y2: 9,
    type: "soil",
    // confirm_plant_removal: NIE JEST WYMAGANE dla 'soil'
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Zmiana na soil:", data);
    console.log("Usunięte rośliny:", data.data.removed_plants);
  });

// Oczekiwany wynik (200 OK):
// removed_plants: 0  (zmiana na 'soil' nigdy nie usuwa roślin)
```

### 3.5 POST - Konflikt: confirm_plant_removal=false nie wystarcza (409 Conflict)

```javascript
// Test: Explicit false nie wystarcza jako potwierdzenie
// Najpierw dodaj ponownie rośliny (Supabase Studio)
// Potem:

fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    x1: 5,
    y1: 5,
    x2: 9,
    y2: 9,
    type: "building",
    confirm_plant_removal: false, // Explicit false - BŁĄD!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - Conflict (false nie wystarcza):", data);
  });

// Oczekiwany wynik (409 Conflict):
// Wymaga confirm_plant_removal: true, a nie false
```

---

## 5. Weryfikacja w bazie danych

### 4.1 Test pełnego cyklu życia obszaru

```javascript
// Scenariusz: Utwórz obszar → Zmień typ → Dodaj rośliny → Zmień z potwierdzeniem → Przywróć

const area = { x1: 10, y1: 10, x2: 14, y2: 14 };

// 1. Zmień na 'soil'
await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ ...area, type: "soil" }),
})
  .then((r) => r.json())
  .then((d) => console.log("1. Soil:", d.data));

// 2. Dodaj rośliny (manualnie w DB lub przez API jeśli dostępne)
console.log("2. ⚠️ Dodaj 2 rośliny w obszarze (10-14, 10-14)");
await new Promise((resolve) => setTimeout(resolve, 5000)); // Poczekaj 5s

// 3. Próba zmiany bez potwierdzenia
await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ ...area, type: "water" }),
})
  .then((r) => r.json())
  .then((d) => console.log("3. Konflikt:", d.error.message));

// 4. Zmiana z potwierdzeniem
await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ ...area, type: "water", confirm_plant_removal: true }),
})
  .then((r) => r.json())
  .then((d) => console.log("4. Z potwierdzeniem:", d.data));

// 5. Przywróć na 'soil'
await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ ...area, type: "soil" }),
})
  .then((r) => r.json())
  .then((d) => console.log("5. Przywrócono:", d.data));

console.log("✅ Pełny cykl zakoĹ„czony");
```

### 4.2 Test wszystkich typów komórek w jednej operacji

```javascript
// Test: Wizualizacja różnych typów

const cellTypes = ["soil", "water", "path", "building", "blocked"];

for (let i = 0; i < cellTypes.length; i++) {
  const type = cellTypes[i];
  await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      x1: i * 4,
      y1: 0,
      x2: i * 4 + 2,
      y2: 2,
      type: type,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(`✅ ${type.padEnd(10)}: ${data.data.affected_cells} komórek`);
    });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Weryfikacja w DB:
// SELECT x, y, type FROM grid_cells
// WHERE plan_id = 'twoje-uuid' AND x < 15 AND y < 3
// ORDER BY x, y;
```

### 4.3 Test edge case: maksymalny prostokąt

```javascript
// Test: Zmiana typu całej siatki (maksymalny prostokąt)

const maxArea = {
  x1: 0,
  y1: 0,
  x2: 19, // grid_width - 1
  y2: 15, // grid_height - 1
  type: "path",
};

fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(maxArea),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Maksymalny prostokąt:", data);
    console.log("Zmienione komórki:", data.data.affected_cells);
    console.log("Oczekiwano:", (19 - 0 + 1) * (15 - 0 + 1)); // 20 * 16 = 320
  });

// Oczekiwany wynik:
// affected_cells: 320
```

### 4.4 Test wydajności: duże prostokąty

```javascript
// Test: Zmiana typu w dużych prostokątach

const rectangles = [
  { x1: 0, y1: 0, x2: 9, y2: 9 }, // 10x10
  { x1: 0, y1: 0, x2: 14, y2: 14 }, // 15x15
  { x1: 0, y1: 0, x2: 19, y2: 15 }, // 20x16 (cała siatka)
];

for (const rect of rectangles) {
  const start = performance.now();

  await fetch(`/api/plans/${window.testPlanId}/grid/area-type`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...rect, type: "water" }),
  })
    .then((res) => res.json())
    .then((data) => {
      const time = (performance.now() - start).toFixed(2);
      console.log(`✅Zmiana komórek: ${time}ms`);
    });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Oczekiwane czasy: < 200ms dla każdego
```

---

## 5. Weryfikacja w bazie danych

### 5.1 Sprawdź komórki bezpośrednio w DB

**Supabase Studio → Table Editor → grid_cells**

```sql
-- SQL Editor
SELECT x, y, type, updated_at
FROM public.grid_cells
WHERE plan_id = 'twoje-uuid-planu'
  AND x BETWEEN 0 AND 4
  AND y BETWEEN 0 AND 4
ORDER BY x, y;

-- Sprawdź:
-- 1. Czy typ komórek się zgadza
-- 2. Czy updated_at zostało zaktualizowane
-- 3. Czy liczba rekordów = (x2-x1+1) * (y2-y1+1)
```

### 5.2 Sprawdź usunięcie roślin (triggery)

```sql
-- Sprawdź czy rośliny zostały usunięte przez trigger
SELECT plan_id, x, y, plant_name, created_at
FROM public.plant_placements
WHERE plan_id = 'twoje-uuid-planu'
  AND x BETWEEN 5 AND 9
  AND y BETWEEN 5 AND 9;

-- Jeśli obszar (5-9, 5-9) został zmieniony na non-soil:
-- Wynik powinien być pusty (0 rekordów)
```

### 5.3 Sprawdź trigger updated_at

```sql
-- Sprawdź czy trigger aktualizuje updated_at
SELECT x, y, type, created_at, updated_at
FROM public.grid_cells
WHERE plan_id = 'twoje-uuid-planu'
  AND x = 10 AND y = 10;

-- updated_at powinien być świeższy niż created_at po aktualizacji
```

---

## 6. Checklist testów

### Testy GET /api/plans/:plan_id/grid - Funkcjonalne

- [ ] Sukces 200 - pobranie metadanych istniejącego planu
- [ ] Sukces 200 - weryfikacja struktury odpowiedzi (4 pola)
- [ ] Wszystkie pola obecne: grid_width, grid_height, cell_size_cm, orientation
- [ ] Wartości zgodne z danymi w bazie

### Testy GET - Błędy walidacji

- [ ] 422 UnprocessableEntity - nieprawidłowy UUID planu
- [ ] 422 UnprocessableEntity - pusty UUID (routing może zwrócić 404)
- [ ] Błędy Zod mapowane na field_errors

### Testy GET - Błędy HTTP

- [ ] 401 Unauthorized - brak sesji użytkownika
- [ ] 404 NotFound - plan nie istnieje
- [ ] 404 NotFound - plan należy do innego użytkownika (bezpieczeństwo)

### Testy GET - Bezpieczeństwo

- [ ] RLS zapobiega dostępowi do cudzego planu (404, nie 403)
- [ ] Nieprawidłowy UUID zwraca 422 z field_errors
- [ ] Brak sesji zwraca 401
- [ ] Plan innego użytkownika nie ujawnia informacji o jego istnieniu

### Testy GET - Wydajność

- [ ] Czas odpowiedzi < 100ms (średnia z 10 requestów)
- [ ] Pojedyncze zapytanie SELECT (sprawdź w logach Supabase)
- [ ] Minimalny payload (tylko 4 pola)

### Testy GET - Integracja

- [ ] Wartości zgodne z tabelą plans w DB
- [ ] Endpoint działa z middleware autentykacji
- [ ] Response headers nie zawierają cache (obecnie)

---

## 7. Checklist testów POST /api/plans/:plan_id/grid/area-type

### Testy funkcjonalne - Sukces

- [ ] Zmiana typu prostokąta (x1-x2, y1-y2)
- [ ] Zmiana pojedynczej komórki (x1=x2, y1=y2)
- [ ] Zmiana typu na 'soil'
- [ ] Zmiana typu całej siatki (maksymalny prostokąt)
- [ ] Wszystkie typy komórek działają (soil, water, path, building, blocked)

### Testy funkcjonalne - Mechanizm potwierdzenia

- [ ] Konflikt 409 gdy rośliny w obszarze i brak potwierdzenia
- [ ] Sukces 200 gdy rośliny w obszarze i jest potwierdzenie
- [ ] Zmiana na 'soil' nie wymaga potwierdzenia (nawet gdy są rośliny)
- [ ] confirm_plant_removal=false nie wystarcza jako potwierdzenie
- [ ] removed_plants w wyniku zawiera poprawną liczbę

### Testy walidacji - Zod schema

- [ ] Błąd gdy x1 > x2
- [ ] Błąd gdy y1 > y2
- [ ] Błąd gdy współrzędne ujemne
- [ ] Błąd gdy nieprawidłowy typ komórki
- [ ] Błąd gdy brakujące pole wymagane
- [ ] Błąd gdy dodatkowe nieznane pole (strict mode)
- [ ] Błąd gdy nieprawidłowy typ danych (string zamiast number)

### Testy walidacji - Serwis

- [ ] Błąd 422 gdy współrzędne poza granicami siatki
- [ ] Błąd 422 gdy x2 >= grid_width
- [ ] Błąd 422 gdy y2 >= grid_height

### Testy błędów HTTP

- [ ] 400 Bad Request - nieprawidłowy JSON
- [ ] 401 Unauthorized - brak sesji
- [ ] 404 Not Found - plan nie istnieje
- [ ] 422 Unprocessable Entity - błędy walidacji
- [ ] 409 Conflict - konflikt roślin

### Testy bezpieczeństwa

- [ ] RLS zapobiega dostępowi do cudzego planu
- [ ] Nieprawidłowy UUID planu zwraca 422
- [ ] Brak sesji zwraca 401

### Testy wydajności

- [ ] Czas odpowiedzi < 200ms dla małych prostokątów (< 100 komórek)
- [ ] Czas odpowiedzi < 500ms dla dużych prostokątów (> 200 komórek)
- [ ] Pojedyncze zapytanie UPDATE (sprawdź logi Supabase)

### Testy w bazie danych

- [ ] Komórki mają poprawny typ po aktualizacji
- [ ] updated_at jest aktualizowany
- [ ] Rośliny są usuwane przez triggery gdy typ != 'soil'
- [ ] Liczba zmienionych komórek = (x2-x1+1) \* (y2-y1+1)

---

## 7. Rozwiązywanie problemów

### Problem: 409 Conflict mimo braku roślin w obszarze

**Rozwiązanie:**

```sql
-- Sprawdź w bazie czy faktycznie są rośliny
SELECT * FROM plant_placements
WHERE plan_id = 'twoje-uuid'
  AND x BETWEEN x1 AND x2
  AND y BETWEEN y1 AND y2;

-- Jeśli są, usuń je ręcznie lub użyj confirm_plant_removal: true
```

### Problem: affected_cells = 0 mimo poprawnych współrzędnych

**Rozwiązanie:**

```javascript
// Sprawdź czy plan istnieje i ma komórki
fetch(`/api/plans/${window.testPlanId}`, {
  credentials: "include",
})
  .then((r) => r.json())
  .then((d) => {
    console.log("Grid:", d.data.grid_width, "x", d.data.grid_height);
  });

// Sprawdź w DB:
// SELECT COUNT(*) FROM grid_cells WHERE plan_id = 'twoje-uuid';
```

### Problem: Triggery nie usuwają roślin

**Rozwiązanie:**

```sql
-- Sprawdź czy trigger istnieje
SELECT * FROM pg_trigger
WHERE tgname LIKE '%plant%' AND tgrelid = 'public.grid_cells'::regclass;

-- Sprawdź czy funkcja triggera istnieje
SELECT * FROM pg_proc WHERE proname LIKE '%plant%';

-- Jeśli nie, utwórz trigger zgodnie z migracją
```

### Problem: 422 mimo poprawnych współrzędnych

**Rozwiązanie:**

```javascript
// Sprawdź dokładne wymiary siatki
fetch(`/api/plans/${window.testPlanId}`, { credentials: "include" })
  .then((r) => r.json())
  .then((d) => {
    const { grid_width, grid_height } = d.data;
    console.log("Wymiary siatki:", grid_width, "x", grid_height);
    console.log("Maksymalne współrzędne: x <", grid_width, ", y <", grid_height);
    console.log("Prawidłowy zakres: x: 0-" + (grid_width - 1) + ", y: 0-" + (grid_height - 1));
  });
```

---

## 8. Raportowanie błędów

Jeśli znajdziesz błąd, zanotuj:

1. **Request:**
   - Metoda: POST
   - URL: /api/plans/:plan_id/grid/area-type
   - Body: { x1, y1, x2, y2, type, confirm_plant_removal }
   - Headers: { ... }

2. **Response:**
   - Status code: 200/400/401/404/409/422/...
   - Body: { ... }

3. **Oczekiwane zachowanie:**
   - Co powinno się stać

4. **Rzeczywiste zachowanie:**
   - Co się faktycznie stało

5. **Stan bazy danych:**
   - Wymiary siatki (grid_width, grid_height)
   - Liczba komórek w obszarze
   - Liczba roślin w obszarze
   - Typ komórek przed/po operacji

6. **Kroki reprodukcji:**
   - Dokładne kroki aby odtworzyć problem

7. **Środowisko:**
   - Przeglądarka: Chrome/Firefox/...
   - System: Windows/Mac/Linux
   - Wersja Node: ...

---

## 4. Testy GET /api/plans/:plan_id/grid/cells

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz plan testowy (sekcja 1.3) lub użyj istniejącego
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 4.1 GET - Sukces: pobranie wszystkich komórek (200 OK)

```javascript
// Test: Pobierz wszystkie komórki siatki (domyślnie limit=50)
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Status 200:", data);
    console.log("Liczba komórek:", data.data.length);
    console.log("Pierwsza komórka:", data.data[0]);
    console.log("Next cursor:", data.pagination.next_cursor);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "data": [
    {
      "x": 0,
      "y": 0,
      "type": "soil",
      "updated_at": "2025-11-18T12:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "next_cursor": "eyJ1cGRhdGVkX2F0IjoiMjAyNS0xMS0xOFQxMjowMDowMC4wMDBaIiwieCI6MCwieSI6MH0=" // lub null
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 200
- ✅ `data` jest tablicą zawierającą max 50 elementów
- ✅ Każdy element ma pola: `x`, `y`, `type`, `updated_at`
- ✅ `pagination.next_cursor` jest string (Base64) lub null
- ✅ Jeśli plan ma >50 komórek, `next_cursor` nie jest null

---

### 4.2 GET - Sukces: paginacja z kursorem (200 OK)

```javascript
// Test: Pobierz drugą stronę wyników używając kursora z poprzedniego zapytania
const planId = window.testPlanId || "twoje-uuid-planu";
const cursor = "PASTE_CURSOR_FROM_PREVIOUS_REQUEST"; // Wklej cursor z poprzedniego testu

fetch(`/api/plans/${planId}/grid/cells?cursor=${encodeURIComponent(cursor)}`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Strona 2:", data);
    console.log("Liczba komórek:", data.data.length);
    console.log("Pierwsze x,y strony 2:", data.data[0].x, data.data[0].y);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ Zwrócone komórki są inne niż na pierwszej stronie
- ✅ Brak duplikatów między stronami
- ✅ Sortowanie jest spójne (domyślnie po `updated_at desc`)

---

### 4.3 GET - Sukces: filtr po typie komórki (200 OK)

```javascript
// Test: Pobierz tylko komórki typu "water"
// NAJPIERW ustaw kilka komórek jako water (użyj POST /grid/area-type z poprzednich testów)

const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?type=water`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log('✅ Komórki "water":', data);
    console.log("Liczba:", data.data.length);
    // Weryfikuj że wszystkie mają type=water
    const allWater = data.data.every((cell) => cell.type === "water");
    console.log("Wszystkie water?", allWater);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ Wszystkie zwrócone komórki mają `type: "water"`
- ✅ Liczba komórek odpowiada liczbie komórek water w planie

---

### 4.4 GET - Sukces: filtr po pojedynczej pozycji x,y (200 OK)

```javascript
// Test: Pobierz komórkę na pozycji (5, 3)
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?x=5&y=3`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Komórka (5,3):", data);
    console.log("Liczba wyników:", data.data.length); // Powinno być 0 lub 1
    if (data.data.length > 0) {
      console.log("x=", data.data[0].x, "y=", data.data[0].y);
    }
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ `data` zawiera max 1 element (dla współrzędnych x=5, y=3)
- ✅ Jeśli element istnieje: `x === 5` i `y === 3`

---

### 4.5 GET - Sukces: filtr po prostokącie bbox (200 OK)

```javascript
// Test: Pobierz komórki z prostokąta (2,2) do (5,4)
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?bbox=2,2,5,4`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Komórki bbox (2,2,5,4):", data);
    console.log("Liczba komórek:", data.data.length);

    // Weryfikuj że wszystkie są w zakresie
    const allInRange = data.data.every((cell) => cell.x >= 2 && cell.x <= 5 && cell.y >= 2 && cell.y <= 4);
    console.log("Wszystkie w zakresie?", allInRange);

    // Oczekiwana liczba: (5-2+1) * (4-2+1) = 4 * 3 = 12
    console.log("Oczekiwano 12, otrzymano:", data.data.length);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ Liczba komórek: (x2-x1+1) × (y2-y1+1) = 4 × 3 = 12
- ✅ Wszystkie komórki mają x ∈ [2,5] i y ∈ [2,4]

---

### 4.6 GET - Sukces: niestandardowy limit (200 OK)

```javascript
// Test: Pobierz tylko 10 komórek
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?limit=10`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Limit 10:", data);
    console.log("Liczba komórek:", data.data.length); // <= 10
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ `data.length` <= 10
- ✅ Jeśli plan ma >10 komórek, `next_cursor` nie jest null

---

### 4.7 GET - Sukces: sortowanie po x asc (200 OK)

```javascript
// Test: Pobierz komórki posortowane po x rosnąco
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?sort=x&order=asc&limit=5`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Sort x asc:", data);
    const xValues = data.data.map((c) => c.x);
    console.log("Wartości x:", xValues);

    // Weryfikuj sortowanie
    const isSorted = xValues.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
    console.log("Posortowane rosnąco?", isSorted);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ Wartości x są posortowane rosnąco
- ✅ Przy równych x, sortowanie wtórne po y rosnąco

---

### 4.8 GET - Sukces: pusty wynik dla filtra bez dopasowań (200 OK)

```javascript
// Test: Filtr który nie zwróci wyników (np. bbox poza obszarem z komórkami danego typu)
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?type=building&bbox=0,0,1,1`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Pusty wynik:", data);
    console.log("Liczba komórek:", data.data.length); // Prawdopodobnie 0
    console.log("Next cursor:", data.pagination.next_cursor); // null
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Status HTTP: 200
- ✅ `data` jest pustą tablicą `[]`
- ✅ `pagination.next_cursor` === null

---

### 4.9 GET - Błąd: brak autoryzacji (401 Unauthorized)

```javascript
// Test: Wywołanie bez zalogowania
// WAŻNE: Wyloguj się najpierw lub użyj trybu incognito

const planId = "any-uuid";

fetch(`/api/plans/${planId}/grid/cells`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ Powinno być 401, otrzymano:", data);
  })
  .catch((err) => console.error("✅ Expected error:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "Unauthorized",
    "message": "You must be logged in to access this resource."
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 401
- ✅ `error.code` === "Unauthorized"

---

### 4.10 GET - Błąd: niepoprawny UUID planu (400 ValidationError)

```javascript
// Test: Niepoprawny format UUID
const invalidPlanId = "not-a-uuid";

fetch(`/api/plans/${invalidPlanId}/grid/cells`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid path parameters.",
    "details": {
      "field_errors": {
        "plan_id": "Plan ID must be a valid UUID"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"
- ✅ `details.field_errors.plan_id` zawiera komunikat błędu

---

### 4.11 GET - Błąd: plan nie istnieje (404 NotFound)

```javascript
// Test: Poprawny UUID ale plan nie istnieje
const nonExistentPlanId = "00000000-0000-0000-0000-000000000000";

fetch(`/api/plans/${nonExistentPlanId}/grid/cells`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ NotFound:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "NotFound",
    "message": "Plan not found."
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 404
- ✅ `error.code` === "NotFound"

---

### 4.12 GET - Błąd: niepoprawny limit (400 ValidationError)

```javascript
// Test: Limit poza zakresem (>100)
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?limit=150`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla limit:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid query parameters.",
    "details": {
      "field_errors": {
        "limit": "Number must be less than or equal to 100"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"
- ✅ Błąd dla pola `limit`

---

### 4.13 GET - Błąd: tylko x bez y (400 ValidationError)

```javascript
// Test: Podano x ale nie podano y
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?x=5`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla x bez y:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid query parameters.",
    "details": {
      "field_errors": {
        "x": "Both x and y must be provided together, or neither"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"
- ✅ Komunikat wymaga obu współrzędnych

---

### 4.14 GET - Błąd: mieszanie x/y z bbox (400 ValidationError)

```javascript
// Test: Podano zarówno x/y jak i bbox
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?x=5&y=3&bbox=0,0,10,10`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla x/y + bbox:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid query parameters.",
    "details": {
      "field_errors": {
        "x": "Cannot use both x/y and bbox filters together"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"
- ✅ Komunikat zabrania mieszania filtrów

---

### 4.15 GET - Błąd: współrzędne poza siatką (400 ValidationError)

```javascript
// Test: x lub y poza grid_width/grid_height
// Przykład: grid 20x16, ale próbujemy x=25
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?x=25&y=5`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla out of bounds:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Coordinates out of bounds. Grid dimensions: 20x16, provided: x=25, y=5",
    "details": {
      "field_errors": {
        "x": "Coordinates out of bounds..."
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"
- ✅ Komunikat zawiera wymiary siatki

---

### 4.16 GET - Błąd: bbox poza siatką (400 ValidationError)

```javascript
// Test: bbox wykraczający poza grid_width/grid_height
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?bbox=0,0,100,100`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla bbox out of bounds:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Bbox coordinates out of bounds. Grid dimensions: 20x16, provided: x1=0, y1=0, x2=100, y2=100",
    "details": {
      "field_errors": {
        "bbox": "Bbox coordinates out of bounds..."
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"

---

### 4.17 GET - Błąd: niepoprawny format bbox (400 ValidationError)

```javascript
// Test: bbox z niepoprawnym formatem
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?bbox=invalid`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla złego formatu bbox:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid query parameters.",
    "details": {
      "field_errors": {
        "bbox": "bbox must be in format 'x1,y1,x2,y2'"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"

---

### 4.18 GET - Błąd: bbox z x1 > x2 (400 ValidationError)

```javascript
// Test: bbox z niepoprawną kolejnością współrzędnych
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?bbox=10,5,2,3`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla bbox x1>x2:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid query parameters.",
    "details": {
      "field_errors": {
        "bbox": "bbox must have x1 <= x2 and y1 <= y2"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"

---

### 4.19 GET - Błąd: niepoprawny cursor (400 ValidationError)

```javascript
// Test: Cursor który nie jest poprawnym Base64 lub ma złą strukturę
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?cursor=invalid-cursor`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla złego cursora:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid cursor: ...",
    "details": {
      "field_errors": {
        "cursor": "Invalid cursor: ..."
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"
- ✅ Komunikat wskazuje problem z kursorem

---

### 4.20 GET - Błąd: niepoprawny typ sortowania (400 ValidationError)

```javascript
// Test: Nieobsługiwana wartość sort
const planId = window.testPlanId || "twoje-uuid-planu";

fetch(`/api/plans/${planId}/grid/cells?sort=invalid`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ ValidationError dla złego sort:", data);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

```json
{
  "error": {
    "code": "ValidationError",
    "message": "Invalid query parameters.",
    "details": {
      "field_errors": {
        "sort": "Invalid enum value. Expected 'updated_at' | 'x', received 'invalid'"
      }
    }
  }
}
```

**Weryfikacje:**

- ✅ Status HTTP: 400
- ✅ `error.code` === "ValidationError"

---

## 5. Scenariusze integracyjne (Grid Cells + inne endpointy)

### 5.1 Scenariusz: Stwórz plan → Ustaw typy komórek → Pobierz komórki

```javascript
// Krok 1: Stwórz plan
fetch("/api/plans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    name: "Integration Test Plan",
    width_cm: 300,
    height_cm: 300,
    cell_size_cm: 50,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Plan utworzony:", data.data.id);
    window.integrationPlanId = data.data.id;

    // Krok 2: Ustaw prostokąt komórek jako "water"
    return fetch(`/api/plans/${data.data.id}/grid/area-type`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        x1: 1,
        y1: 1,
        x2: 3,
        y2: 3,
        type: "water",
      }),
    });
  })
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Komórki zmienione:", data.data);

    // Krok 3: Pobierz tylko komórki "water"
    return fetch(`/api/plans/${window.integrationPlanId}/grid/cells?type=water`, {
      method: "GET",
      credentials: "include",
    });
  })
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Komórki water:", data);
    console.log("Liczba:", data.data.length); // Powinno być 9 (3x3)

    // Weryfikuj że wszystkie są w bbox (1,1,3,3)
    const allInRange = data.data.every(
      (cell) => cell.x >= 1 && cell.x <= 3 && cell.y >= 1 && cell.y <= 3 && cell.type === "water"
    );
    console.log("✅ Wszystkie water w zakresie?", allInRange);
  })
  .catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Plan został utworzony
- ✅ 9 komórek zostało zmienionych na "water" (3×3)
- ✅ GET /grid/cells?type=water zwraca dokładnie 9 komórek
- ✅ Wszystkie komórki mają `type: "water"` i są w zakresie (1,1)-(3,3)

---

### 5.2 Scenariusz: Paginacja przez całą siatkę

```javascript
// Test: Pobierz wszystkie komórki iterując przez kursorowany wynik
const planId = window.testPlanId || "twoje-uuid-planu";
let allCells = [];
let cursor = null;
let pageCount = 0;

async function fetchAllCells() {
  do {
    pageCount++;
    const url = cursor
      ? `/api/plans/${planId}/grid/cells?limit=20&cursor=${encodeURIComponent(cursor)}`
      : `/api/plans/${planId}/grid/cells?limit=20`;

    const res = await fetch(url, { method: "GET", credentials: "include" });
    const data = await res.json();

    console.log(`Strona ${pageCount}: ${data.data.length} komórek`);
    allCells = allCells.concat(data.data);
    cursor = data.pagination.next_cursor;
  } while (cursor !== null);

  console.log("✅ Wszystkie komórki pobrane:", allCells.length);
  console.log("Liczba stron:", pageCount);

  // Weryfikuj że nie ma duplikatów
  const uniqueKeys = new Set(allCells.map((c) => `${c.x},${c.y}`));
  console.log("Unikalne komórki:", uniqueKeys.size);
  console.log("Brak duplikatów?", uniqueKeys.size === allCells.length);
}

fetchAllCells().catch((err) => console.error("❌ Błąd:", err));
```

**Oczekiwany wynik:**

- ✅ Wszystkie komórki zostały pobrane (liczba = grid_width × grid_height)
- ✅ Brak duplikatów (każda para x,y unikalna)
- ✅ Paginacja działała poprawnie przez wszystkie strony

---

## 6. Checklist zakończenia testów

Po zakończeniu wszystkich testów:

- [ ] Wszystkie testy podstawowe (4.1-4.8) przeszły pomyślnie
- [ ] Wszystkie testy błędów (4.9-4.20) zwróciły poprawne kody HTTP i komunikaty
- [ ] Scenariusze integracyjne (5.1-5.2) działają zgodnie z oczekiwaniami
- [ ] Paginacja działa bez duplikatów i pominięć
- [ ] Filtry (type, x/y, bbox) zwracają poprawne podzbiory danych
- [ ] Sortowanie jest spójne i stabilne
- [ ] Walidacja odrzuca niepoprawne parametry z odpowiednimi komunikatami
- [ ] RLS zabezpiecza dostęp do planów innych użytkowników
- [ ] Brak błędów w konsoli serwera (sprawdź terminal)

---

## 7. Raportowanie problemów

Jeśli znajdziesz błąd podczas testów, zgłoś go w formacie:

1. **Tytuł:** Krótki opis problemu

2. **Test:** Numer testu (np. 4.15)

3. **Oczekiwany wynik:** Co powinno się stać

4. **Rzeczywisty wynik:** Co faktycznie się stało

5. **Kod testu:** Skopiuj kod który wywołał problem

6. **Kroki reprodukcji:**
   - Dokładne kroki aby odtworzyć problem

7. **Środowisko:**
   - Przeglądarka: Chrome/Firefox/...
   - System: Windows/Mac/Linux
   - Wersja Node: ...

---

## 8. PUT /api/plans/:plan_id/grid/cells/:x/:y - Aktualizacja typu pojedynczej komórki

### 8.1 Happy Path - Zmiana typu komórki wewnątrz siatki

**Cel:** Weryfikacja że endpoint poprawnie aktualizuje typ pojedynczej komórki siatki.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` należący do użytkownika
- Plan ma siatkę o wymiarach np. 10x10 (grid_width=10, grid_height=10)

**Kroki:**

1. Przygotuj request PUT do `/api/plans/{plan_id}/grid/cells/5/5`:
   ```json
   {
     "type": "path"
   }
   ```
2. Wyślij request z tokenem JWT użytkownika w nagłówku `Authorization: Bearer {token}`
3. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `200 OK`
- Body:
  ```json
  {
    "data": {
      "x": 5,
      "y": 5,
      "type": "path",
      "updated_at": "2025-11-18T12:00:00.000Z"
    }
  }
  ```
- Komórka (5,5) w bazie ma teraz typ `path`

**Uwagi:**

- Endpoint używa UPSERT - jeśli komórka nie istniała, zostanie utworzona
- Timestamp `updated_at` jest ustawiany automatycznie przez trigger w bazie

---

### 8.2 Idempotencja - Wielokrotna aktualizacja tej samej komórki

**Cel:** Weryfikacja że endpoint jest idempotentny i można bezpiecznie powtarzać request.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` należący do użytkownika
- Komórka (3,3) już istnieje w bazie z typem `soil`

**Kroki:**

1. Przygotuj request PUT do `/api/plans/{plan_id}/grid/cells/3/3`:
   ```json
   {
     "type": "water"
   }
   ```
2. Wyślij ten sam request 3 razy z rzędu
3. Sprawdź odpowiedzi

**Oczekiwany rezultat:**

- Wszystkie 3 requesty zwracają status `200 OK`
- Wszystkie odpowiedzi zawierają te same dane (poza `updated_at`)
- W bazie istnieje tylko jedna komórka (3,3) z typem `water`
- Każdy request aktualizuje `updated_at`

**Uwagi:**

- UPSERT zapewnia idempotencję operacji
- Wielokrotne wywołanie nie tworzy duplikatów

---

### 8.3 Zmiana typu na nie-soil - Automatyczne usunięcie nasadzeń

**Cel:** Weryfikacja że zmiana typu komórki na inny niż `soil` automatycznie usuwa powiązane nasadzenia.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` należący do użytkownika
- Komórka (7,7) ma typ `soil`
- W komórce (7,7) znajduje się nasadzenie rośliny (rekord w `plant_placements`)

**Kroki:**

1. Sprawdź że nasadzenie istnieje: GET `/api/plans/{plan_id}/plants?x=7&y=7`
2. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/7/7`:
   ```json
   {
     "type": "building"
   }
   ```
3. Sprawdź odpowiedź
4. Ponownie sprawdź nasadzenia: GET `/api/plans/{plan_id}/plants?x=7&y=7`

**Oczekiwany rezultat:**

- Status: `200 OK`
- Komórka ma teraz typ `building`
- Nasadzenie rośliny zostało automatycznie usunięte przez trigger w bazie
- Drugie zapytanie o nasadzenia zwraca pustą listę

**Uwagi:**

- To jest zachowanie po stronie bazy danych (CASCADE DELETE lub trigger)
- Endpoint nie zwraca informacji o usuniętych nasadzeniach
- W przyszłości można dodać potwierdzenie usunięcia jak w POST /grid/area-type

---

### 8.4 Validation Error - Nieprawidłowy typ komórki

**Cel:** Weryfikacja walidacji typu komórki.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` należący do użytkownika

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/2/2`:
   ```json
   {
     "type": "invalid_type"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `400 Bad Request`
- Body:
  ```json
  {
    "error": {
      "code": "ValidationError",
      "message": "Invalid request body.",
      "details": {
        "field_errors": {
          "type": "Type must be one of: soil, path, water, building, blocked"
        }
      }
    }
  }
  ```

**Uwagi:**

- Walidacja Zod odrzuca nieznane wartości typu
- Dozwolone wartości: `soil`, `path`, `water`, `building`, `blocked`

---

### 8.5 Validation Error - Współrzędne poza zakresem siatki

**Cel:** Weryfikacja walidacji zakresów współrzędnych.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` z siatką 10x10 (grid_width=10, grid_height=10)

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/15/3`:
   ```json
   {
     "type": "soil"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `400 Bad Request`
- Body:
  ```json
  {
    "error": {
      "code": "ValidationError",
      "message": "Coordinates out of grid bounds.",
      "details": {
        "field_errors": {
          "x": "x must be between 0 and 9 (grid width: 10)"
        }
      }
    }
  }
  ```

**Uwagi:**

- Walidacja następuje po pobraniu metadanych planu
- Współrzędne muszą być: 0 <= x < grid_width, 0 <= y < grid_height

---

### 8.6 Validation Error - Ujemne współrzędne

**Cel:** Weryfikacja walidacji ujemnych współrzędnych.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}`

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/-1/5`:
   ```json
   {
     "type": "soil"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `400 Bad Request`
- Body:
  ```json
  {
    "error": {
      "code": "ValidationError",
      "message": "Invalid path parameters.",
      "details": {
        "field_errors": {
          "x": "x must be a non-negative integer"
        }
      }
    }
  }
  ```

**Uwagi:**

- Walidacja Zod z `.min(0)` odrzuca ujemne wartości
- Błąd występuje na etapie walidacji parametrów ścieżki

---

### 8.7 Validation Error - Nieprawidłowy format UUID planu

**Cel:** Weryfikacja walidacji formatu UUID parametru plan_id.

**Warunki wstępne:**

- Użytkownik jest zalogowany

**Kroki:**

1. Wyślij request PUT do `/api/plans/invalid-uuid/grid/cells/0/0`:
   ```json
   {
     "type": "soil"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `400 Bad Request`
- Body:
  ```json
  {
    "error": {
      "code": "ValidationError",
      "message": "Invalid path parameters.",
      "details": {
        "field_errors": {
          "plan_id": "Plan ID must be a valid UUID"
        }
      }
    }
  }
  ```

**Uwagi:**

- Walidacja UUID przez Zod `.uuid()`
- Błąd występuje przed zapytaniem do bazy

---

### 8.8 Validation Error - Nieprawidłowy JSON body

**Cel:** Weryfikacja obsługi nieprawidłowego JSONa w body requestu.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}`

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/0/0` z nieprawidłowym JSONem:
   ```
   { type: "soil" (brak zamykającego nawiasu)
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `400 Bad Request`
- Body:
  ```json
  {
    "error": {
      "code": "ValidationError",
      "message": "Invalid JSON body.",
      "details": {
        "field_errors": {
          "body": "Request body must be valid JSON"
        }
      }
    }
  }
  ```

**Uwagi:**

- Try-catch przy parsowaniu JSONa
- Jasny komunikat błędu parsowania

---

### 8.9 Validation Error - Nieznane pola w body (strict mode)

**Cel:** Weryfikacja że schemat Zod w trybie strict odrzuca nieznane pola.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}`

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/0/0`:
   ```json
   {
     "type": "soil",
     "unknown_field": "value"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `400 Bad Request`
- Body zawiera błąd walidacji o nierozpoznanym polu

**Uwagi:**

- Schemat używa `.strict()` zgodnie z planem
- Zapobiega przesyłaniu niepotrzebnych danych

---

### 8.10 Unauthorized - Brak tokena JWT

**Cel:** Weryfikacja wymagania uwierzytelnienia.

**Warunki wstępne:**

- Brak tokena JWT w requestcie (użytkownik niezalogowany)

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/0/0` BEZ nagłówka Authorization:
   ```json
   {
     "type": "soil"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `401 Unauthorized`
- Body:
  ```json
  {
    "error": {
      "code": "Unauthorized",
      "message": "You must be logged in to access this resource."
    }
  }
  ```

**Uwagi:**

- Endpoint wymaga ważnej sesji Supabase
- Brak tokena = brak dostępu

---

### 8.11 Forbidden - Próba dostępu do planu innego użytkownika

**Cel:** Weryfikacja że użytkownik może modyfikować tylko własne plany.

**Warunki wstępne:**

- Użytkownik A jest zalogowany
- Istnieje plan o ID `{plan_id}` należący do użytkownika B (innego niż A)

**Kroki:**

1. Zaloguj się jako użytkownik A
2. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/0/0` (plan należy do B):
   ```json
   {
     "type": "soil"
   }
   ```
3. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `404 Not Found` (nie ujawniamy istnienia planu)
- Body:
  ```json
  {
    "error": {
      "code": "NotFound",
      "message": "Plan not found or you do not have access to it."
    }
  }
  ```

**Uwagi:**

- `getPlanGridMetadata` filtruje po `user_id`
- Zwracamy 404 zamiast 403 aby nie ujawniać istnienia planu
- RLS w bazie zapewnia dodatkową ochronę

---

### 8.12 Not Found - Nieistniejący plan

**Cel:** Weryfikacja obsługi nieistniejącego planu.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Plan o ID `00000000-0000-0000-0000-000000000000` nie istnieje

**Kroki:**

1. Wyślij request PUT do `/api/plans/00000000-0000-0000-0000-000000000000/grid/cells/0/0`:
   ```json
   {
     "type": "soil"
   }
   ```
2. Sprawdź odpowiedź

**Oczekiwany rezultat:**

- Status: `404 Not Found`
- Body:
  ```json
  {
    "error": {
      "code": "NotFound",
      "message": "Plan not found or you do not have access to it."
    }
  }
  ```

**Uwagi:**

- `getPlanGridMetadata` zwraca null gdy plan nie istnieje
- Jednolity komunikat błędu dla nieistniejącego planu i braku dostępu

---

### 8.13 Edge Case - Aktualizacja komórki (0,0) i maksymalnych współrzędnych

**Cel:** Weryfikacja prawidłowego działania dla skrajnych współrzędnych siatki.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` z siatką 10x10

**Kroki:**

1. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/0/0`:
   ```json
   {
     "type": "water"
   }
   ```
2. Sprawdź odpowiedź (powinno być 200 OK)
3. Wyślij request PUT do `/api/plans/{plan_id}/grid/cells/9/9`:
   ```json
   {
     "type": "building"
   }
   ```
4. Sprawdź odpowiedź (powinno być 200 OK)

**Oczekiwany rezultat:**

- Oba requesty zwracają status `200 OK`
- Komórki (0,0) i (9,9) są poprawnie zaktualizowane
- Brak błędów off-by-one

**Uwagi:**

- Współrzędne są 0-indexed
- Maksymalne współrzędne to (grid_width-1, grid_height-1)

---

### 8.14 Performance - Sekwencja wielu aktualizacji

**Cel:** Weryfikacja wydajności przy wielu kolejnych aktualizacjach pojedynczych komórek.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` z siatką 10x10

**Kroki:**

1. Wykonaj 20 requestów PUT do różnych komórek sekwencyjnie:
   - `/api/plans/{plan_id}/grid/cells/0/0` z `{"type": "path"}`
   - `/api/plans/{plan_id}/grid/cells/0/1` z `{"type": "path"}`
   - ... (i tak dalej)
2. Zmierz czas odpowiedzi dla każdego requestu
3. Sprawdź wszystkie odpowiedzi

**Oczekiwany rezultat:**

- Wszystkie requesty zwracają status `200 OK`
- Czas odpowiedzi < 200ms dla każdego requestu (przy lokalnej bazie)
- Brak degradacji wydajności przy kolejnych requestach

**Uwagi:**

- Endpoint jest zoptymalizowany pod single-cell updates
- Dla dużych aktualizacji obszarów lepiej użyć POST /grid/area-type
- Indeksy na (plan_id, x, y) zapewniają O(1) dostęp

---

### 8.15 Integracja - Weryfikacja przez GET po PUT

**Cel:** Weryfikacja że zmiana przez PUT jest widoczna przez GET.

**Warunki wstępne:**

- Użytkownik jest zalogowany
- Istnieje plan o ID `{plan_id}` z siatką 10x10

**Kroki:**

1. Sprawdź aktualny stan komórki: GET `/api/plans/{plan_id}/grid/cells?x=4&y=4`
2. Zaktualizuj komórkę: PUT `/api/plans/{plan_id}/grid/cells/4/4`:
   ```json
   {
     "type": "blocked"
   }
   ```
3. Ponownie sprawdź stan: GET `/api/plans/{plan_id}/grid/cells?x=4&y=4`
4. Porównaj odpowiedzi

**Oczekiwany rezultat:**

- PUT zwraca `200 OK` z nowym typem `blocked`
- Drugie GET pokazuje komórkę z typem `blocked`
- Timestamp `updated_at` jest nowszy po aktualizacji

**Uwagi:**

- Test spójności między operacjami PUT i GET
- Trigger updated_at działa prawidłowo

---

### 8.16 Szablon raportu z testów dla PUT /grid/cells/:x/:y

**Data testów:** \***\*\_\_\_\*\***  
**Tester:** \***\*\_\_\_\*\***  
**Środowisko:** Dev / Staging / Production

| #    | Test Case                            | Status          | Uwagi |
| ---- | ------------------------------------ | --------------- | ----- |
| 8.1  | Happy Path - zmiana typu             | ⬜ Pass ⬜ Fail |       |
| 8.2  | Idempotencja                         | ⬜ Pass ⬜ Fail |       |
| 8.3  | Usunięcie nasadzeń przy zmianie typu | ⬜ Pass ⬜ Fail |       |
| 8.4  | Nieprawidłowy typ                    | ⬜ Pass ⬜ Fail |       |
| 8.5  | Współrzędne poza zakresem            | ⬜ Pass ⬜ Fail |       |
| 8.6  | Ujemne współrzędne                   | ⬜ Pass ⬜ Fail |       |
| 8.7  | Nieprawidłowy UUID                   | ⬜ Pass ⬜ Fail |       |
| 8.8  | Nieprawidłowy JSON                   | ⬜ Pass ⬜ Fail |       |
| 8.9  | Nieznane pola (strict)               | ⬜ Pass ⬜ Fail |       |
| 8.10 | Brak tokena JWT                      | ⬜ Pass ⬜ Fail |       |
| 8.11 | Plan innego użytkownika              | ⬜ Pass ⬜ Fail |       |
| 8.12 | Nieistniejący plan                   | ⬜ Pass ⬜ Fail |       |
| 8.13 | Współrzędne skrajne                  | ⬜ Pass ⬜ Fail |       |
| 8.14 | Wydajność - wiele aktualizacji       | ⬜ Pass ⬜ Fail |       |
| 8.15 | Integracja GET-PUT                   | ⬜ Pass ⬜ Fail |       |

**Środowisko testowe:**

- URL API: ...
- Przeglądarka: Chrome/Firefox/...
- System: Windows/Mac/Linux
- Wersja Node: ...

---

**Dokument utworzony:** 2025-11-18  
**Ostatnia aktualizacja:** 2025-11-18  
**Autor:** AI Assistant  
**Status:** ✅ Gotowy do użycia
