# Testy Manualne: Endpointy Profile

**Data utworzenia:** 2025-11-13  
**Zakres:** GET /api/profile, PUT /api/profile  
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
  .split(';')
  .filter(c => c.includes('sb-'))
  .forEach(c => console.log(c.trim()));

// Powinny być widoczne cookie sb-*-auth-token
```

### 1.4 Weryfikacja profilu w bazie

W Supabase Studio → Table Editor → profiles:
- Sprawdź czy istnieje rekord z Twoim user ID
- Domyślne wartości: `language_code: "pl"`, `theme: "light"`

---

## 2. Testy w konsoli przeglądarki

### Przygotowanie

1. Zaloguj się w aplikacji
2. Otwórz DevTools (F12)
3. Przejdź do zakładki Console
4. Skopiuj i wykonaj poniższe testy

### 2.1 GET /api/profile - Pobierz profil (sukces)

```javascript
// Test: Pobierz profil zalogowanego użytkownika
fetch('/api/profile', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include' // Ważne! Wysyła cookies sesji
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ GET /api/profile - Sukces:', data);
    console.log('User ID:', data.data.id);
    console.log('Language:', data.data.language_code);
    console.log('Theme:', data.data.theme);
  })
  .catch(err => console.error('❌ Błąd:', err));

// Oczekiwany wynik (200 OK):
// {
//   "data": {
//     "id": "uuid",
//     "language_code": "pl",
//     "theme": "light",
//     "created_at": "2025-11-13T10:00:00Z",
//     "updated_at": "2025-11-13T10:00:00Z"
//   }
// }
```

### 2.2 PUT /api/profile - Aktualizuj theme (sukces)

```javascript
// Test: Zmień motyw na dark
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    theme: 'dark'
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ PUT /api/profile (theme) - Sukces:', data);
    console.log('Nowy theme:', data.data.theme);
    console.log('Updated at:', data.data.updated_at);
  })
  .catch(err => console.error('❌ Błąd:', err));

// Oczekiwany wynik (200 OK):
// {
//   "data": {
//     "id": "uuid",
//     "language_code": "pl",
//     "theme": "dark",  // ← Zmienione!
//     "created_at": "2025-11-13T10:00:00Z",
//     "updated_at": "2025-11-13T10:05:00Z"  // ← Nowy timestamp!
//   }
// }
```

### 2.3 PUT /api/profile - Aktualizuj language_code (sukces)

```javascript
// Test: Zmień język na angielski
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    language_code: 'en'
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ PUT /api/profile (language) - Sukces:', data);
    console.log('Nowy język:', data.data.language_code);
  })
  .catch(err => console.error('❌ Błąd:', err));

// Oczekiwany wynik (200 OK):
// language_code: "en"
```

### 2.4 PUT /api/profile - Aktualizuj oba pola (sukces)

```javascript
// Test: Zmień język i motyw jednocześnie
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    language_code: 'en-US',
    theme: 'light'
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ PUT /api/profile (oba pola) - Sukces:', data);
    console.log('Language:', data.data.language_code);
    console.log('Theme:', data.data.theme);
  })
  .catch(err => console.error('❌ Błąd:', err));

// Oczekiwany wynik (200 OK):
// language_code: "en-US", theme: "light"
```

### 2.5 PUT /api/profile - Błąd walidacji: nieprawidłowy language_code

```javascript
// Test: Nieprawidłowy format kodu języka (wielkie litery)
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    language_code: 'PL' // Nieprawidłowe - powinno być "pl"
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('❌ PUT /api/profile - ValidationError:', data);
    console.log('Błąd:', data.error.message);
    console.log('Pole:', data.error.details?.field_errors);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Invalid input data.",
//     "details": {
//       "field_errors": {
//         "language_code": "Invalid ISO language code"
//       }
//     }
//   }
// }
```

### 2.6 PUT /api/profile - Błąd walidacji: nieprawidłowy theme

```javascript
// Test: Nieprawidłowa wartość motywu
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    theme: 'blue' // Nieprawidłowe - dozwolone: "light" lub "dark"
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('❌ PUT /api/profile - ValidationError:', data);
    console.log('Pole:', data.error.details?.field_errors);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "Invalid input data.",
//     "details": {
//       "field_errors": {
//         "theme": "Must be 'light' or 'dark'"
//       }
//     }
//   }
// }
```

### 2.7 PUT /api/profile - Błąd walidacji: puste body

```javascript
// Test: Puste body (brak pól)
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({})
})
  .then(res => res.json())
  .then(data => {
    console.log('❌ PUT /api/profile - ValidationError (puste body):', data);
    console.log('Komunikat:', data.error.message);
  });

// Oczekiwany wynik (400 Bad Request):
// {
//   "error": {
//     "code": "ValidationError",
//     "message": "At least one field must be provided"
//   }
// }
```

### 2.8 PUT /api/profile - Błąd walidacji: dodatkowe pole

```javascript
// Test: Dodatkowe pole (strict mode)
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    theme: 'dark',
    extra_field: 'should be rejected' // Dodatkowe pole
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('❌ PUT /api/profile - ValidationError (dodatkowe pole):', data);
  });

// Oczekiwany wynik (400 Bad Request):
// Zod strict mode odrzuci dodatkowe pola
```

### 2.9 GET /api/profile - Unauthorized (wyloguj się najpierw)

```javascript
// UWAGA: Przed tym testem wyloguj się z aplikacji!
// http://localhost:4321/auth/login → Wyloguj → Otwórz DevTools

fetch('/api/profile', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => {
    console.log('❌ GET /api/profile - Unauthorized:', data);
  });

// Oczekiwany wynik (401 Unauthorized):
// {
//   "error": {
//     "code": "Unauthorized",
//     "message": "Authentication required."
//   }
// }
```

### 2.10 PUT /api/profile - Nieprawidłowy JSON

```javascript
// Test: Nieprawidłowy JSON w body
fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: 'invalid json here'
})
  .then(res => res.json())
  .then(data => {
    console.log('❌ PUT /api/profile - Invalid JSON:', data);
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

## 3. Testy w PowerShell

### Przygotowanie

```powershell
# Ustaw zmienne
$baseUrl = "http://localhost:4321"

# WAŻNE: Musisz najpierw uzyskać sesję!
# Opcja 1: Zaloguj się w przeglądarce, skopiuj cookie sb-*-auth-token
# Opcja 2: Użyj Invoke-WebRequest do logowania (patrz sekcja 3.1)
```

### 3.1 Logowanie i uzyskanie sesji

```powershell
# Zaloguj się i zachowaj sesję
$loginBody = @{
    email = "test@example.com"
    password = "Test1234!"
} | ConvertTo-Json

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginResponse = Invoke-WebRequest `
    -Uri "$baseUrl/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $loginBody `
    -WebSession $session

Write-Host "Status logowania: $($loginResponse.StatusCode)"

# Sprawdź cookies
$session.Cookies.GetCookies($baseUrl) | ForEach-Object {
    Write-Host "Cookie: $($_.Name) = $($_.Value)"
}
```

### 3.2 GET /api/profile - Pobierz profil (sukces)

```powershell
# Test: Pobierz profil zalogowanego użytkownika
$response = Invoke-WebRequest `
    -Uri "$baseUrl/api/profile" `
    -Method GET `
    -WebSession $session

Write-Host "Status: $($response.StatusCode)"
$data = $response.Content | ConvertFrom-Json
Write-Host "Profil:" -ForegroundColor Green
$data.data | Format-List

# Oczekiwany wynik:
# Status: 200
# id            : uuid
# language_code : pl
# theme         : light
# created_at    : timestamp
# updated_at    : timestamp
```

### 3.3 PUT /api/profile - Aktualizuj theme (sukces)

```powershell
# Test: Zmień motyw na dark
$body = @{
    theme = "dark"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "$baseUrl/api/profile" `
    -Method PUT `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body `
    -WebSession $session

Write-Host "Status: $($response.StatusCode)"
$data = $response.Content | ConvertFrom-Json
Write-Host "Zaktualizowany profil:" -ForegroundColor Green
$data.data | Format-List

# Oczekiwany wynik:
# Status: 200
# theme: dark
```

### 3.4 PUT /api/profile - Aktualizuj language_code (sukces)

```powershell
# Test: Zmień język na en-US
$body = @{
    language_code = "en-US"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "$baseUrl/api/profile" `
    -Method PUT `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body `
    -WebSession $session

Write-Host "Status: $($response.StatusCode)"
$data = $response.Content | ConvertFrom-Json
Write-Host "Language code: $($data.data.language_code)" -ForegroundColor Green

# Oczekiwany wynik:
# Status: 200
# Language code: en-US
```

### 3.5 PUT /api/profile - Aktualizuj oba pola (sukces)

```powershell
# Test: Zmień oba pola jednocześnie
$body = @{
    language_code = "pl"
    theme = "light"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "$baseUrl/api/profile" `
    -Method PUT `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body `
    -WebSession $session

Write-Host "Status: $($response.StatusCode)"
$data = $response.Content | ConvertFrom-Json
$data.data | Format-List

# Oczekiwany wynik:
# Status: 200
# Oba pola zaktualizowane
```

### 3.6 PUT /api/profile - Błąd walidacji: nieprawidłowy language_code

```powershell
# Test: Nieprawidłowy format kodu języka
$body = @{
    language_code = "PL"  # Nieprawidłowe - wielkie litery
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/profile" `
        -Method PUT `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -WebSession $session
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Błąd walidacji:" -ForegroundColor Yellow
    $errorData.error | Format-List
}

# Oczekiwany wynik:
# Status: 400
# code    : ValidationError
# message : Invalid input data.
# details : field_errors = @{language_code="Invalid ISO language code"}
```

### 3.7 PUT /api/profile - Błąd walidacji: nieprawidłowy theme

```powershell
# Test: Nieprawidłowa wartość theme
$body = @{
    theme = "blue"  # Nieprawidłowe - dozwolone: light, dark
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/profile" `
        -Method PUT `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -WebSession $session
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Field error: $($errorData.error.details.field_errors.theme)" -ForegroundColor Yellow
}

# Oczekiwany wynik:
# Status: 400
# Field error: Must be 'light' or 'dark'
```

### 3.8 PUT /api/profile - Błąd walidacji: puste body

```powershell
# Test: Puste body
$body = @{} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/profile" `
        -Method PUT `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -WebSession $session
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Message: $($errorData.error.message)" -ForegroundColor Yellow
}

# Oczekiwany wynik:
# Status: 400
# Message: At least one field must be provided
```

### 3.9 GET /api/profile - Unauthorized (bez sesji)

```powershell
# Test: Żądanie bez sesji (nowy request bez WebSession)
try {
    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/profile" `
        -Method GET
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($errorData.error.message)" -ForegroundColor Yellow
}

# Oczekiwany wynik:
# Status: 401
# Error: Authentication required.
```

### 3.10 PUT /api/profile - Nieprawidłowy JSON

```powershell
# Test: Nieprawidłowy JSON
try {
    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/profile" `
        -Method PUT `
        -Headers @{"Content-Type"="application/json"} `
        -Body "invalid json here" `
        -WebSession $session
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Message: $($errorData.error.message)" -ForegroundColor Yellow
}

# Oczekiwany wynik:
# Status: 400
# Message: Invalid JSON body.
```

---

## 4. Scenariusze testowe zaawansowane

### 4.1 Test cyklu życia preferencji użytkownika

```javascript
// Konsola przeglądarki - pełny flow

// 1. Pobierz początkowy stan
const initialState = await fetch('/api/profile', {
  credentials: 'include'
}).then(r => r.json());
console.log('Stan początkowy:', initialState.data);

// 2. Zmień na dark mode
const darkMode = await fetch('/api/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ theme: 'dark' })
}).then(r => r.json());
console.log('Po zmianie na dark:', darkMode.data.theme);

// 3. Zmień język
const enLang = await fetch('/api/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ language_code: 'en' })
}).then(r => r.json());
console.log('Po zmianie języka:', enLang.data.language_code);

// 4. Przywróć ustawienia domyślne
const reset = await fetch('/api/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ language_code: 'pl', theme: 'light' })
}).then(r => r.json());
console.log('Po resecie:', reset.data);

// 5. Weryfikuj że updated_at się zmienia
console.log('Timestamps:');
console.log('- Początkowy:', initialState.data.updated_at);
console.log('- Po dark mode:', darkMode.data.updated_at);
console.log('- Po zmianie języka:', enLang.data.updated_at);
console.log('- Po resecie:', reset.data.updated_at);
```

### 4.2 Test wszystkich poprawnych kodów języków

```javascript
// Test różnych formatów ISO language codes
const validCodes = ['pl', 'en', 'de', 'fr', 'en-US', 'en-GB', 'de-DE'];

for (const code of validCodes) {
  const result = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language_code: code })
  }).then(r => r.json());
  
  console.log(`${code}: ${result.data ? '✅' : '❌'}`, 
              result.data?.language_code || result.error?.message);
  
  await new Promise(resolve => setTimeout(resolve, 100)); // Delay
}

// Wszystkie powinny się powieść
```

### 4.3 Test niepoprawnych kodów języków

```javascript
// Test niepoprawnych formatów
const invalidCodes = [
  'PL',        // wielkie litery
  'eng',       // 3 litery
  '123',       // cyfry
  'en_US',     // underscore zamiast dash
  'en-us',     // mała litera kraju
  'en-USA',    // 3 litery kraju
  '',          // pusty string
];

for (const code of invalidCodes) {
  const result = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language_code: code })
  }).then(r => r.json());
  
  console.log(`"${code}": ${result.error ? '❌ Odrzucone' : '✅ Zaakceptowane (BUG!)'}`);
}

// Wszystkie powinny być odrzucone z ValidationError
```

### 4.4 Test RLS (wymaga drugiego użytkownika)

**Nie można bezpośrednio przetestować z poziomu klienta**, ale możesz to zweryfikować w Supabase Studio:

1. Otwórz Supabase Studio → SQL Editor
2. Wykonaj:

```sql
-- Sprawdź czy RLS jest włączone
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- rowsecurity powinno być true

-- Sprawdź policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Powinny być policies dla authenticated i anon
```

---

## 5. Weryfikacja w bazie danych

### 5.1 Sprawdź profil bezpośrednio w DB

**Supabase Studio → Table Editor → profiles**

```sql
-- SQL Editor
SELECT id, language_code, theme, created_at, updated_at 
FROM public.profiles 
WHERE id = auth.uid();

-- Sprawdź:
-- 1. Czy wartości się zgadzają z API
-- 2. Czy updated_at faktycznie się zmienia po aktualizacji
-- 3. Czy created_at pozostaje niezmienne
```

### 5.2 Sprawdź trigger updated_at

```sql
-- Wykonaj ręczną aktualizację
UPDATE public.profiles 
SET theme = 'dark' 
WHERE id = auth.uid();

-- Pobierz z powrotem
SELECT updated_at FROM public.profiles WHERE id = auth.uid();

-- updated_at powinien być świeży (now())
```

---

## 6. Checklist testów

### Testy funkcjonalne

- [ ] GET /api/profile zwraca profil zalogowanego użytkownika
- [ ] PUT /api/profile aktualizuje theme
- [ ] PUT /api/profile aktualizuje language_code
- [ ] PUT /api/profile aktualizuje oba pola jednocześnie
- [ ] Aktualizacja jednego pola nie zmienia drugiego
- [ ] updated_at jest aktualizowany po każdej zmianie
- [ ] created_at pozostaje niezmienne

### Testy walidacji

- [ ] Puste body {} zwraca 400 ValidationError
- [ ] Nieprawidłowy language_code zwraca 400 z field_errors
- [ ] Nieprawidłowy theme zwraca 400 z field_errors
- [ ] Dodatkowe pola są odrzucane (strict mode)
- [ ] Nieprawidłowy JSON zwraca 400
- [ ] Poprawne kody ISO są akceptowane: "pl", "en", "en-US"
- [ ] Niepoprawne kody są odrzucane: "PL", "eng", "en_US"

### Testy bezpieczeństwa

- [ ] GET bez sesji zwraca 401 Unauthorized
- [ ] PUT bez sesji zwraca 401 Unauthorized
- [ ] RLS policy zapobiega dostępowi do cudzych profili
- [ ] Brak możliwości zmiany id użytkownika
- [ ] Brak możliwości zmiany created_at

### Testy wydajności (manualna obserwacja)

- [ ] Czas odpowiedzi GET < 200ms
- [ ] Czas odpowiedzi PUT < 200ms
- [ ] Brak N+1 queries (sprawdź logi Supabase)

---

## 7. Rozwiązywanie problemów

### Problem: 401 Unauthorized mimo że jestem zalogowany

**Rozwiązanie:**

```javascript
// Sprawdź sesję w konsoli
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Sesja:', session);

// Jeśli brak sesji, zaloguj się ponownie
```

### Problem: Cookie nie są wysyłane w fetch

**Rozwiązanie:**

```javascript
// Upewnij się że używasz credentials: 'include'
fetch('/api/profile', {
  credentials: 'include' // ← To jest konieczne!
})
```

### Problem: PowerShell nie zachowuje sesji

**Rozwiązanie:**

```powershell
# Musisz użyć -WebSession we wszystkich requestach
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Najpierw zaloguj się
Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -WebSession $session ...

# Potem używaj tej samej sesji
Invoke-WebRequest -Uri "$baseUrl/api/profile" -WebSession $session
```

### Problem: Profil nie istnieje (404)

**Rozwiązanie:**

```sql
-- Sprawdź w Supabase Studio czy profil został utworzony
SELECT * FROM public.profiles WHERE id = 'twoje-user-id';

-- Jeśli nie istnieje, utwórz ręcznie:
INSERT INTO public.profiles (id, language_code, theme)
VALUES ('twoje-user-id', 'pl', 'light');
```

### Problem: Trigger nie tworzy profilu przy rejestracji

**Rozwiązanie:**

```sql
-- Sprawdź czy trigger istnieje
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Sprawdź czy funkcja istnieje
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Jeśli nie, wykonaj migrację:
-- supabase/migrations/20251113000000_auto_create_profile_trigger.sql
```

---

## 8. Raportowanie błędów

Jeśli znajdziesz błąd, zanotuj:

1. **Request:**
   - Metoda: GET/PUT
   - URL: /api/profile
   - Body: { ... }
   - Headers: { ... }

2. **Response:**
   - Status code: 200/400/401/...
   - Body: { ... }

3. **Oczekiwane zachowanie:**
   - Co powinno się stać

4. **Rzeczywiste zachowanie:**
   - Co się faktycznie stało

5. **Kroki reprodukcji:**
   - Dokładne kroki aby odtworzyć problem

6. **Środowisko:**
   - Przeglądarka: Chrome/Firefox/...
   - System: Windows/Mac/Linux
   - Wersja Node: ...

---

**Dokument utworzony:** 2025-11-13  
**Ostatnia aktualizacja:** 2025-11-13  
**Autor:** AI Assistant  
**Status:** ✅ Gotowy do użycia

