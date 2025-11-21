# Testy Manualne: Endpointy Plans

**Data utworzenia:** 2025-11-15  
**Zakres:** POST /api/plans, GET /api/plans, GET /api/plans/:plan_id, PATCH /api/plans/:plan_id, DELETE /api/plans/:plan_id  
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

### 1.3 Weryfikacja sesji

Po zalogowaniu, sprawdź w konsoli przeglądarki:

```javascript
// Sprawdź cookies Supabase
document.cookie
  .split(";")
  .filter((c) => c.includes("sb-"))
  .forEach((c) => console.log(c.trim()));

// Powinny być widoczne cookie sb-*-auth-token
```

### 1.4 Weryfikacja tabel w bazie

W Supabase Studio → Table Editor:

- Sprawdź czy istnieje tabela `plans`
- Sprawdź czy RLS jest włączone

---

## 2. Testy POST /api/plans - Tworzenie planu

### Przygotowanie

1. Zaloguj się w aplikacji
2. Otwórz DevTools (F12)
3. Przejdź do zakładki Console
4. Skopiuj i wykonaj poniższe testy

### 2.1 POST - Sukces: minimalny poprawny plan (201 Created)

```javascript
// Test: Utwórz minimalny plan działki
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Moja działka",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST /api/plans - Sukces:", data);
    console.log("Plan ID:", data.data.id);
    console.log("Grid:", data.data.grid_width, "x", data.data.grid_height);
    // Zapisz ID dla kolejnych testów
    window.testPlanId = data.data.id;
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (201 Created):
// {
//   "data": {
//     "id": "uuid",
//     "user_id": "user_uuid",
//     "name": "Moja działka",
//     "latitude": null,
//     "longitude": null,
//     "width_cm": 500,
//     "height_cm": 400,
//     "cell_size_cm": 25,
//     "grid_width": 20,
//     "grid_height": 16,
//     "orientation": 0,
//     "hemisphere": null,
//     "created_at": "timestamp",
//     "updated_at": "timestamp"
//   }
// }
```

### 2.2 POST - Sukces: pełny plan z lokalizacją (201 Created)

```javascript
// Test: Utwórz plan z danymi GPS
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Ogród z GPS",
    width_cm: 1000,
    height_cm: 1000,
    cell_size_cm: 50,
    orientation: 180,
    latitude: 52.2297,
    longitude: 21.0122,
    hemisphere: "northern",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST /api/plans (z GPS) - Sukces:", data);
    console.log("Lokalizacja:", data.data.latitude, data.data.longitude);
    console.log("Półkula:", data.data.hemisphere);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (201 Created):
// latitude: 52.2297, longitude: 21.0122, hemisphere: "northern"
```

### 2.3 POST - Błąd walidacji: brak nazwy (400 ValidationError)

```javascript
// Test: Pusta nazwa
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (pusta nazwa):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Plan name is required",
//     "details": {
//       "field_errors": {
//         "name": "Plan name is required"
//       }
//     }
//   }
// }
```

### 2.4 POST - Błąd walidacji: nieprawidłowy cell_size_cm (400 ValidationError)

```javascript
// Test: Nieprawidłowy rozmiar komórki (dozwolone: 10, 25, 50, 100)
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 30, // Nieprawidłowe!
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (cell_size):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Cell size must be 10, 25, 50, or 100 cm"
```

### 2.5 POST - Błąd walidacji: wymiary niepodzielne przez cell_size (400 ValidationError)

```javascript
// Test: SzerokośÄ‡ niepodzielna przez rozmiar komórki
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 503, // 503 % 25 != 0
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (niepodzielne):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Width must be divisible by cell size"
```

### 2.6 POST - Błąd walidacji: siatka większa niż 200 (400 ValidationError)

```javascript
// Test: Za duża siatka (max 200x200)
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Za duża działka",
    width_cm: 20100, // 201 komórek
    height_cm: 20100,
    cell_size_cm: 100,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (za duża siatka):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Calculated grid dimensions must be between 1 and 200"
```

### 2.7 POST - Błąd walidacji: nieprawidłowa orientacja (400 ValidationError)

```javascript
// Test: Orientacja poza zakresem (0-359)
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 360, // Max to 359!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (orientacja):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Orientation must be between 0 and 359"
```

### 2.8 POST - Błąd walidacji: nieprawidłowa szerokośÄ‡ geograficzna (400 ValidationError)

```javascript
// Test: Latitude poza zakresem (-90 do 90)
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
    latitude: 91, // Max to 90!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (latitude):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Latitude must be between -90 and 90"
```

### 2.9 POST - Błąd walidacji: nieprawidłowa długośÄ‡ geograficzna (400 ValidationError)

```javascript
// Test: Longitude poza zakresem (-180 do 180)
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
    longitude: -181, // Min to -180!
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (longitude):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Longitude must be between -180 and 180"
```

### 2.10 POST - Błąd walidacji: nieprawidłowa półkula (400 ValidationError)

```javascript
// Test: Nieprawidłowa wartośÄ‡ hemisphere
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
    hemisphere: "eastern", // Dozwolone: 'northern' lub 'southern'
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (hemisphere):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Hemisphere must be 'northern' or 'southern'"
```

### 2.11 POST - Błąd walidacji: dodatkowe nieznane pole (400 ValidationError)

```javascript
// Test: Dodatkowe pole (strict mode)
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
    extra_field: "value", // Nieznane pole
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - ValidationError (dodatkowe pole):", data);
  });

// Oczekiwany wynik (400 Bad Request):
// Zod strict mode odrzuci dodatkowe pola
```

### 2.12 POST - Błąd: konflikt nazwy (409 Conflict)

```javascript
// Test: Duplikat nazwy
// UWAGA: Najpierw utwórz plan o nazwie "Istniejący plan", potem uruchom ten test

fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Istniejący plan", // Ta nazwa już istnieje
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ POST - Conflict:", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (409 Conflict):
// {
//   "error": {
//     "code": "Conflict",
//     "message": "Plan with this name already exists."
//   }
// }
```

### 2.13 POST - Błąd: nieprawidłowy JSON (400 ValidationError)

```javascript
// Test: Nieprawidłowy JSON
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
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

### 2.14 POST - Edge case: maksymalne wymiary (201 Created)

```javascript
// Test: Maksymalna siatka 200x200
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Maksymalna siatka",
    width_cm: 20000,
    height_cm: 20000,
    cell_size_cm: 100,
    orientation: 359,
    latitude: 90,
    longitude: 180,
    hemisphere: "northern",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Max wymiary:", data);
    console.log("Grid:", data.data.grid_width, "x", data.data.grid_height);
  });

// Oczekiwany wynik (201 Created):
// grid_width: 200, grid_height: 200
```

### 2.15 POST - Edge case: minimalne wymiary (201 Created)

```javascript
// Test: Minimalna siatka 1x1
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Minimalna siatka",
    width_cm: 10,
    height_cm: 10,
    cell_size_cm: 10,
    orientation: 0,
    latitude: -90,
    longitude: -180,
    hemisphere: "southern",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Min wymiary:", data);
    console.log("Grid:", data.data.grid_width, "x", data.data.grid_height);
  });

// Oczekiwany wynik (201 Created):
// grid_width: 1, grid_height: 1
```

### 2.16 POST - Edge case: nazwa z białymi znakami (201 Created)

```javascript
// Test: Trim białych znaków w nazwie
fetch("/api/plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "  Plan z spacjami  ",
    width_cm: 500,
    height_cm: 400,
    cell_size_cm: 25,
    orientation: 0,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ POST - Trim:", data);
    console.log("Nazwa po trim:", data.data.name);
  });

// Oczekiwany wynik (201 Created):
// name: "Plan z spacjami" (bez spacji na początku i koĹ„cu)
```

---

## 3. Testy PATCH /api/plans/:plan_id - Aktualizacja planu

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz plan testowy używając testu 2.1 (zapisz `window.testPlanId`)
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 3.1 PATCH - Sukces: aktualizacja nazwy (200 OK)

```javascript
// Test: Zmień nazwę planu
// UWAGA: Użyj window.testPlanId z testu 2.1 lub podaj swoje ID bezpośrednio
const planId = window.testPlanId || "9f8c6943-44a4-457e-a463-8ac08994a384"; // Zastąp swoim ID jeśli potrzebne

if (!planId) {
  console.error("❌ Błąd: Brak ID planu. Uruchom najpierw test 2.1 lub ustaw window.testPlanId.");
} else {
  fetch(`/api/plans/${planId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      name: "Nowa nazwa",
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("✅ PATCH - Zmiana nazwy:", data);
      console.log("Nowa nazwa:", data.data.name);
      console.log("Updated at:", data.data.updated_at);
    })
    .catch((err) => console.error("❌ Błąd:", err));
}

// Oczekiwany wynik (200 OK):
// name: "Nowa nazwa", updated_at: <nowy timestamp>
```

### 3.2 PATCH - Sukces: aktualizacja lokalizacji i orientacji (200 OK)

```javascript
// Test: Zaktualizuj dane GPS i orientację
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    latitude: 52.2297,
    longitude: 21.0122,
    orientation: 90,
    hemisphere: "northern",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ PATCH - Lokalizacja:", data);
    console.log("GPS:", data.data.latitude, data.data.longitude);
    console.log("Orientacja:", data.data.orientation);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// latitude: 52.2297, longitude: 21.0122, orientation: 90, hemisphere: "northern"
```

### 3.3 PATCH - Sukces: zmiana wymiarów BEZ zmiany siatki (200 OK)

```javascript
// Test: ZmieĹ„ wymiary proporcjonalnie - siatka pozostaje taka sama
// Warunki: Plan ma 500x400 cm, cell_size 25, grid 20x16
// Zmiana na: 1000x800 cm, cell_size 50, grid nadal 20x16
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    width_cm: 1000,
    height_cm: 800,
    cell_size_cm: 50,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ PATCH - Wymiary bez zmiany siatki:", data);
    console.log("Grid:", data.data.grid_width, "x", data.data.grid_height);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// grid_width: 20, grid_height: 16 (bez zmiany)
```

### 3.4 PATCH - Konflikt: zmiana wymiarów siatki BEZ potwierdzenia (409 Conflict)

```javascript
// Test: Próba zmiany wymiarów siatki bez potwierdzenia
// 600cm / 25cm = 24 komórki (zmiana z 20)
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    width_cm: 600,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - Conflict (brak potwierdzenia):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (409 Conflict):
// {
//   "error": {
//     "code": "Conflict",
//     "message": "Changing grid dimensions will reset all cells and plants. Set confirm_regenerate=true to proceed."
//   }
// }
```

### 3.5 PATCH - Sukces: zmiana wymiarów siatki Z potwierdzeniem (200 OK)

```javascript
// Test: Zmiana wymiarów siatki z potwierdzeniem
fetch(`/api/plans/${window.testPlanId}?confirm_regenerate=true`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    width_cm: 600,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ PATCH - Zmiana siatki z potwierdzeniem:", data);
    console.log("Nowy grid_width:", data.data.grid_width);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// grid_width: 24 (zmienione z 20)
```

### 3.6 PATCH - Sukces: zmiana cell_size_cm Z potwierdzeniem (200 OK)

```javascript
// Test: ZmieĹ„ rozmiar komórki z potwierdzeniem
// 500cm / 50cm = 10 komórek (zmiana z 20)
fetch(`/api/plans/${window.testPlanId}?confirm_regenerate=true`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    cell_size_cm: 50,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ PATCH - Zmiana cell_size:", data);
    console.log("Nowy cell_size:", data.data.cell_size_cm);
    console.log("Nowy grid_width:", data.data.grid_width);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// cell_size_cm: 50, grid_width: 10 (500/50)
```

### 3.7 PATCH - Błąd walidacji: puste body (400 ValidationError)

```javascript
// Test: Puste body (brak pól do aktualizacji)
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({}),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (puste body):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "At least one field must be provided for update"
//   }
// }
```

### 3.8 PATCH - Błąd walidacji: pusta nazwa (400 ValidationError)

```javascript
// Test: Pusta nazwa
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (pusta nazwa):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Plan name cannot be empty"
```

### 3.9 PATCH - Błąd walidacji: nieprawidłowy cell_size_cm (400 ValidationError)

```javascript
// Test: Nieprawidłowy cell_size (dozwolone: 10, 25, 50, 100)
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    cell_size_cm: 30,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (cell_size):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Cell size must be 10, 25, 50, or 100 cm"
```

### 3.10 PATCH - Błąd walidacji: wymiary niepodzielne przez cell_size (400 ValidationError)

```javascript
// Test: SzerokośÄ‡ niepodzielna przez rozmiar komórki
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    width_cm: 503,
    cell_size_cm: 50,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (niepodzielne):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Width must be divisible by cell size"
```

### 3.11 PATCH - Błąd walidacji: siatka przekracza limit 200 (400 ValidationError)

```javascript
// Test: Za duża siatka po zmianie
fetch(`/api/plans/${window.testPlanId}?confirm_regenerate=true`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    width_cm: 20100,
    cell_size_cm: 100,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (za duża siatka):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// "Calculated grid dimensions must be between 1 and 200 and must be integers"
```

### 3.12 PATCH - Błąd walidacji: nieprawidłowa orientacja (400 ValidationError)

```javascript
// Test: Orientacja poza zakresem
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    orientation: 360, // Max to 359
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (orientacja):", data);
  });

// Oczekiwany wynik (400 Bad Request):
// "Orientation must be between 0 and 359"
```

### 3.13 PATCH - Błąd walidacji: nieprawidłowa latitude (400 ValidationError)

```javascript
// Test: Latitude poza zakresem
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    latitude: 91, // Max to 90
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (latitude):", data);
  });

// Oczekiwany wynik (400 Bad Request):
// "Latitude must be between -90 and 90"
```

### 3.14 PATCH - Błąd walidacji: nieprawidłowa longitude (400 ValidationError)

```javascript
// Test: Longitude poza zakresem
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    longitude: -181, // Min to -180
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (longitude):", data);
  });

// Oczekiwany wynik (400 Bad Request):
// "Longitude must be between -180 and 180"
```

### 3.15 PATCH - Błąd walidacji: nieprawidłowa półkula (400 ValidationError)

```javascript
// Test: Nieprawidłowa wartośÄ‡ hemisphere
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    hemisphere: "eastern", // Dozwolone: 'northern' lub 'southern'
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (hemisphere):", data);
  });

// Oczekiwany wynik (400 Bad Request):
// "Hemisphere must be 'northern' or 'southern'"
```

### 3.16 PATCH - Błąd walidacji: dodatkowe nieznane pole (400 ValidationError)

```javascript
// Test: Dodatkowe pole (strict mode)
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
    extra_field: "value", // Nieznane pole
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (dodatkowe pole):", data);
  });

// Oczekiwany wynik (400 Bad Request):
// Zod strict mode odrzuci dodatkowe pola
```

### 3.17 PATCH - Błąd walidacji: nieprawidłowy plan_id (400 ValidationError)

```javascript
// Test: Nieprawidłowy format UUID
fetch("/api/plans/not-a-uuid", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - ValidationError (plan_id):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Invalid plan_id. Must be a valid UUID."
//   }
// }
```

### 3.18 PATCH - Błąd: plan nie istnieje (404 NotFound)

```javascript
// Test: Plan nie istnieje
fetch("/api/plans/00000000-0000-0000-0000-000000000000", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Test",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - NotFound:", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (404 Not Found):
// {
//   "error": {
//     "code": "NotFound",
//     "message": "Plan not found or access denied."
//   }
// }
```

### 3.19 PATCH - Błąd: konflikt nazwy (409 Conflict)

```javascript
// Test: Duplikat nazwy
// UWAGA: Najpierw utwórz drugi plan o nazwie "Inny plan"
// Potem spróbuj zmieniÄ‡ nazwę pierwszego planu na "Inny plan"

fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    name: "Inny plan", // Ta nazwa już istnieje
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - Conflict:", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (409 Conflict):
// {
//   "error": {
//     "code": "Conflict",
//     "message": "Plan with this name already exists."
//   }
// }
```

### 3.20 PATCH - Błąd: nieprawidłowy JSON (400 ValidationError)

```javascript
// Test: Nieprawidłowy JSON
fetch(`/api/plans/${window.testPlanId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: "{invalid json}",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ PATCH - Invalid JSON:", data);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Invalid JSON body."
//   }
// }
```

---

## 4. Testy DELETE /api/plans/:plan_id - Usuwanie planu

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz plan testowy do usunięcia
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 4.1 DELETE - Sukces: usunięcie planu (204 No Content)

```javascript
// Test: UsuĹ„ plan
// UWAGA: Ten test usuwa plan! Najpierw utwórz plan do usunięcia
fetch(`/api/plans/${window.testPlanId}`, {
  method: "DELETE",
  credentials: "include",
})
  .then((res) => {
    if (res.status === 204) {
      console.log("✅ DELETE - Sukces: Plan usunięty (204)");
      console.log("Brak treści w odpowiedzi (zgodnie ze specyfikacją)");
    } else {
      return res.json().then((data) => {
        console.log("❌ DELETE - Nieoczekiwany status:", res.status, data);
      });
    }
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik:
// Status 204 No Content
// Pusta odpowiedź
```

### 4.2 DELETE - Błąd walidacji: nieprawidłowy plan_id (400 ValidationError)

```javascript
// Test: Nieprawidłowy format UUID
fetch("/api/plans/not-a-uuid", {
  method: "DELETE",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ DELETE - ValidationError (plan_id):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Plan ID must be a valid UUID"
//   }
// }
```

### 4.3 DELETE - Błąd: plan nie istnieje (404 NotFound)

```javascript
// Test: Próba usunięcia nieistniejącego planu
fetch("/api/plans/00000000-0000-0000-0000-000000000000", {
  method: "DELETE",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ DELETE - NotFound:", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (404 Not Found):
// {
//   "error": {
//     "code": "NotFound",
//     "message": "Plan not found or access denied."
//   }
// }
```

### 4.4 DELETE - Błąd: próba usunięcia tego samego planu dwukrotnie (404 NotFound)

```javascript
// Test: UsuĹ„ plan drugi raz (po teście 4.1)
// UWAGA: Ten test zadziała tylko jeśli wcześniej usunąłeś plan w teście 4.1
fetch(`/api/plans/${window.testPlanId}`, {
  method: "DELETE",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ DELETE - NotFound (już usunięty):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (404 Not Found):
// {
//   "error": {
//     "code": "NotFound",
//     "message": "Plan not found or access denied."
//   }
// }
```

---

## 5. Testy GET /api/plans - Lista planów z paginacją

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz kilka planów testowych (minimum 5 dla testów paginacji)
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 5.1 GET - Sukces: pierwsza strona z domyślnym limitem (200 OK)

```javascript
// Test: Pobierz listę planów (domyślny limit: 20)
fetch("/api/plans", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET /api/plans - Sukces:", data);
    console.log("Liczba planów:", data.data.length);
    console.log("Next cursor:", data.pagination.next_cursor);

    // Zapisz cursor dla kolejnych testów
    if (data.pagination.next_cursor) {
      window.nextCursor = data.pagination.next_cursor;
    }
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// {
//   "data": [
//     {
//       "id": "uuid",
//       "user_id": "user_uuid",
//       "name": "Plan 1",
//       "latitude": 52.2297,
//       "longitude": 21.0122,
//       "width_cm": 1000,
//       "height_cm": 800,
//       "cell_size_cm": 50,
//       "grid_width": 20,
//       "grid_height": 16,
//       "orientation": 0,
//       "hemisphere": "northern",
//       "created_at": "timestamp",
//       "updated_at": "timestamp"
//     },
//     // ... max 20 elementów
//   ],
//   "pagination": {
//     "next_cursor": "base64_string" // lub null jeśli to ostatnia strona
//   }
// }
```

### 5.2 GET - Sukces: pierwsza strona z customowym limitem (200 OK)

```javascript
// Test: Pobierz listę z limitem 5
fetch("/api/plans?limit=5", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET /api/plans (limit=5) - Sukces:", data);
    console.log("Liczba planów:", data.data.length);
    console.log("Next cursor:", data.pagination.next_cursor);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// data zawiera max 5 elementów
```

### 5.3 GET - Sukces: następna strona z cursorem (200 OK)

```javascript
// Test: Pobierz następną stronę używając cursora
// UWAGA: Najpierw uruchom test 5.2 i uzupełnij window.nextCursor uzyskaną wartością
if (!window.nextCursor) {
  console.error("❌ Błąd: window.nextCursor nie jest ustawiony. Uruchom najpierw test 5.1.");
} else {
  // Enkoduj cursor w URL (Base64 może zawierać znaki specjalne)
  const encodedCursor = encodeURIComponent(window.nextCursor);
  fetch(`/api/plans?limit=5&cursor=${encodedCursor}`, {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("✅ GET /api/plans (z cursorem) - Sukces:", data);
      console.log("Liczba planów:", data.data.length);
      console.log("Next cursor:", data.pagination.next_cursor);
    })
    .catch((err) => console.error("❌ Błąd:", err));
}

// Oczekiwany wynik (200 OK):
// Następne 5 elementów (różne od pierwszej strony)
// Brak duplikatów
```

### 5.4 GET - Sukces: ostatnia strona (200 OK, next_cursor=null)

```javascript
// Test: Pobierz wszystkie plany (limit 100)
fetch("/api/plans?limit=100", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET /api/plans (limit=100) - Sukces:", data);
    console.log("Liczba planów:", data.data.length);
    console.log("Next cursor (powinno byÄ‡ null):", data.pagination.next_cursor);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// Wszystkie plany użytkownika
// pagination.next_cursor: null
```

### 5.5 GET - Sukces: pusta lista (200 OK)

```javascript
// Test: Pobierz listę gdy użytkownik nie ma planów
// UWAGA: UsuĹ„ wszystkie plany przed tym testem
fetch("/api/plans", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET /api/plans (pusta lista) - Sukces:", data);
    console.log("Liczba planów:", data.data.length);
    console.log("Next cursor:", data.pagination.next_cursor);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// {
//   "data": [],
//   "pagination": {
//     "next_cursor": null
//   }
// }
```

### 5.6 GET - Sukces: sortowanie ascending (200 OK)

```javascript
// Test: Sortowanie rosnąco po updated_at
fetch("/api/plans?order=asc&limit=5", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET /api/plans (order=asc) - Sukces:", data);
    console.log("Pierwsze updated_at:", data.data[0]?.updated_at);
    console.log("Ostatnie updated_at:", data.data[data.data.length - 1]?.updated_at);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// Plany posortowane rosnąco (najstarsze pierwsze)
```

### 5.7 GET - Błąd walidacji: limit poza zakresem min (400 ValidationError)

```javascript
// Test: Limit poniżej minimum (min: 1)
fetch("/api/plans?limit=0", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - ValidationError (limit min):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Limit must be at least 1"
//   }
// }
```

### 5.8 GET - Błąd walidacji: limit poza zakresem max (400 ValidationError)

```javascript
// Test: Limit powyżej maksimum (max: 100)
fetch("/api/plans?limit=101", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - ValidationError (limit max):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Limit must be at most 100"
//   }
// }
```

### 5.9 GET - Błąd walidacji: nieprawidłowy cursor (400 ValidationError)

```javascript
// Test: Nieprawidłowy format cursora
fetch("/api/plans?cursor=invalid-base64!!!", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET - ValidationError (cursor):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Invalid cursor format"
//   }
// }
```

---

## 6. Testy GET /api/plans/:plan_id - Szczegóły planu

### Przygotowanie

1. Zaloguj się w aplikacji
2. Utwórz plan testowy używając testu 2.1 (zapisz `window.testPlanId`)
3. Otwórz DevTools (F12) → Console
4. Skopiuj i wykonaj poniższe testy

### 6.1 GET - Sukces: pobranie istniejącego planu (200 OK)

```javascript
// Test: Pobierz szczegóły planu
fetch(`/api/plans/${window.testPlanId}`, {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ GET /api/plans/:id - Sukces:", data);
    console.log("Plan:", data.data.name);
    console.log("Grid:", data.data.grid_width, "x", data.data.grid_height);
  })
  .catch((err) => console.error("❌ Błąd:", err));

// Oczekiwany wynik (200 OK):
// {
//   "data": {
//     "id": "uuid",
//     "user_id": "user_uuid",
//     "name": "Moja działka",
//     "latitude": null,
//     "longitude": null,
//     "width_cm": 500,
//     "height_cm": 400,
//     "cell_size_cm": 25,
//     "grid_width": 20,
//     "grid_height": 16,
//     "orientation": 0,
//     "hemisphere": null,
//     "created_at": "timestamp",
//     "updated_at": "timestamp"
//   }
// }
```

### 6.2 GET - Błąd: plan nie istnieje (404 NotFound)

```javascript
// Test: Próba pobrania nieistniejącego planu
fetch("/api/plans/00000000-0000-0000-0000-000000000000", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET /:id - NotFound:", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (404 Not Found):
// {
//   "error": {
//     "code": "NotFound",
//     "message": "Plan not found."
//   }
// }
```

### 6.3 GET - Błąd walidacji: nieprawidłowy UUID (400 ValidationError)

```javascript
// Test: Nieprawidłowy format UUID
fetch("/api/plans/invalid-uuid-format", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((data) => {
    console.log("❌ GET /:id - ValidationError (UUID):", data);
    console.log("Błąd:", data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Plan ID must be a valid UUID"
//   }
// }
```

---

## 7. Scenariusze testowe zaawansowane

### 7.1 Test pełnego cyklu życia planu

```javascript
// Scenariusz: Utwórz → Pobierz → Zaktualizuj → Pobierz → UsuĹ„

// 1. Utwórz plan
const createPlan = async () => {
  const res = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: "Test Lifecycle",
      width_cm: 500,
      height_cm: 400,
      cell_size_cm: 25,
      orientation: 0,
    }),
  });
  const data = await res.json();
  console.log("1. Plan utworzony:", data.data.id);
  return data.data.id;
};

// 2. Pobierz plan
const getPlan = async (id) => {
  const res = await fetch(`/api/plans/${id}`, {
    credentials: "include",
  });
  const data = await res.json();
  console.log("2. Plan pobrany:", data.data.name);
  return data.data;
};

// 3. Zaktualizuj plan
const updatePlan = async (id) => {
  const res = await fetch(`/api/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: "Test Lifecycle Updated",
      latitude: 52.2297,
      longitude: 21.0122,
    }),
  });
  const data = await res.json();
  console.log("3. Plan zaktualizowany:", data.data.name);
  return data.data;
};

// 4. UsuĹ„ plan
const deletePlan = async (id) => {
  const res = await fetch(`/api/plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  console.log("4. Plan usunięty, status:", res.status);
};

// Uruchom pełny scenariusz
(async () => {
  try {
    const planId = await createPlan();
    await getPlan(planId);
    await updatePlan(planId);
    await getPlan(planId);
    await deletePlan(planId);
    console.log("✅ Pełny cykl życia planu zakoĹ„czony");
  } catch (err) {
    console.error("❌ Błąd w cyklu życia:", err);
  }
})();
```

---

## 8. Checklist testów

### Testy POST /api/plans

- [ ] Utworzenie minimalnego planu
- [ ] Utworzenie planu z danymi GPS
- [ ] Błędy walidacji: pusta nazwa, nieprawidłowy cell_size, niepodzielne wymiary
- [ ] Błędy walidacji: za duża siatka, nieprawidłowa orientacja
- [ ] Błędy walidacji: nieprawidłowe latitude/longitude/hemisphere
- [ ] Błąd: konflikt nazwy (409)
- [ ] Edge cases: maksymalne i minimalne wymiary

### Testy PATCH /api/plans/:plan_id

- [ ] Aktualizacja nazwy
- [ ] Aktualizacja lokalizacji GPS
- [ ] Zmiana wymiarów bez zmiany siatki
- [ ] Konflikt przy zmianie siatki bez potwierdzenia (409)
- [ ] Zmiana siatki z potwierdzeniem (confirm_regenerate=true)
- [ ] Błędy walidacji: puste body, nieprawidłowe wartości
- [ ] Błąd: plan nie istnieje (404)
- [ ] Błąd: konflikt nazwy (409)

### Testy DELETE /api/plans/:plan_id

- [ ] Usunięcie planu (204)
- [ ] Błąd: plan nie istnieje (404)
- [ ] Błąd: próba usunięcia dwukrotnie (404)
- [ ] Błąd walidacji: nieprawidłowy UUID

### Testy GET /api/plans

- [ ] Pierwsza strona z domyślnym limitem
- [ ] Pierwsza strona z customowym limitem
- [ ] Następna strona z cursorem
- [ ] Ostatnia strona (next_cursor=null)
- [ ] Pusta lista
- [ ] Sortowanie ascending/descending
- [ ] Błędy walidacji: limit poza zakresem, nieprawidłowy cursor

### Testy GET /api/plans/:plan_id

- [ ] Pobranie istniejącego planu
- [ ] Błąd: plan nie istnieje (404)
- [ ] Błąd walidacji: nieprawidłowy UUID

### Testy zaawansowane

- [ ] Pełny cykl życia planu (create → read → update → read → delete)
- [ ] Izolacja użytkowników (RLS)
- [ ] Weryfikacja w bazie danych

---

**Dokument utworzony:** 2025-11-15  
**Ostatnia aktualizacja:** 2025-11-15  
**Autor:** AI Assistant  
**Status:** ✅ Gotowy do użycia
