# Testowanie emaili lokalnie z Inbucket

Data utworzenia: 2025-11-10  
Status: ✅ Aktywny

## Problem

Przy lokalnym developmencie z Supabase na Dockerze, emaile nie są wysyłane na prawdziwe skrzynki pocztowe. Zamiast tego są przechwytywane przez **Inbucket** - lokalny serwer do testowania emaili.

## Rozwiązanie

### 1. Dostęp do Inbucket

Inbucket jest włączony domyślnie w konfiguracji Supabase (`supabase/config.toml`):

```toml
[inbucket]
enabled = true
port = 54324
```

**Aby przeglądać wysłane emaile:**

🌐 Otwórz w przeglądarce: **http://localhost:54324**

### 2. Jak sprawdzić emaile

#### Sposób 1: Przez listę skrzynek

1. Otwórz http://localhost:54324
2. Zobaczysz listę wszystkich skrzynek pocztowych (adresów email)
3. Kliknij na adres email, do którego został wysłany email
4. Zobaczysz listę wszystkich emaili dla tego użytkownika

#### Sposób 2: Bezpośredni dostęp

Możesz otworzyć bezpośrednio skrzynkę konkretnego użytkownika:

```
http://localhost:54324/monitor
```

### 3. Typy emaili w PlantsPlaner

#### Rejestracja (Email Verification)

- **Kiedy:** Po rejestracji nowego użytkownika
- **Endpoint:** `POST /api/auth/register`
- **Zawartość:** Link do potwierdzenia emaila
- **Format linku:** `http://localhost:3000/auth/confirm?token=...`

#### Reset hasła (Password Reset)

- **Kiedy:** Po żądaniu resetu hasła
- **Endpoint:** `POST /api/auth/forgot-password`
- **Zawartość:** Link do ustawienia nowego hasła
- **Format linku:** `http://localhost:3000/auth/reset-password?token=...`

### 4. Testowanie przepływu rejestracji

```bash
# 1. Uruchom Supabase lokalnie
npx supabase start

# 2. Uruchom aplikację
npm run dev

# 3. Zarejestruj użytkownika
# - Wejdź na http://localhost:3000/auth/register
# - Wypełnij formularz (np. test@example.com)
# - Kliknij "Zarejestruj się"

# 4. Sprawdź email w Inbucket
# - Otwórz http://localhost:54324
# - Znajdź "test@example.com"
# - Kliknij na email z potwierdzeniem
# - Skopiuj link potwierdzający lub kliknij go bezpośrednio
```

### 5. Testowanie przepływu resetu hasła

```bash
# 1. Przejdź do strony zapomnienia hasła
# http://localhost:3000/auth/forgot-password

# 2. Wprowadź email użytkownika
# Np. test@example.com

# 3. Sprawdź email w Inbucket
# - Otwórz http://localhost:54324
# - Znajdź "test@example.com"
# - Kliknij na email z resetem hasła
# - Użyj linku do ustawienia nowego hasła
```

## Konfiguracja

### Zwiększenie limitu emaili (dla developmentu)

W pliku `supabase/config.toml` zwiększono limit emaili z 2 do 100 na godzinę:

```toml
[auth.rate_limit]
# Number of emails that can be sent per hour.
# Zwiększony limit dla lokalnego developmentu
email_sent = 100
```

**Uwaga:** W produkcji limit powinien być niższy (np. 10-20) dla bezpieczeństwa.

### Restart Supabase po zmianie konfiguracji

Po każdej zmianie w `supabase/config.toml` należy zrestartować Supabase:

```bash
npx supabase stop
npx supabase start
```

## Alternatywne rozwiązania (opcjonalne)

### Opcja 1: Użycie prawdziwego SMTP (dla testów produkcyjnych)

Jeśli chcesz testować z prawdziwymi emailami, możesz skonfigurować SMTP w `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
user = "twoj-email@gmail.com"
pass = "env(SMTP_PASSWORD)"
admin_email = "admin@plantsplaner.com"
sender_name = "PlantsPlaner"
```

**Uwaga:** Wymaga dodania zmiennej `SMTP_PASSWORD` do `.env` i wygenerowania "App Password" w Gmail.

### Opcja 2: Mailtrap (dla team development)

Dla zespołów można użyć Mailtrap (darmowy tier):

1. Załóż konto na https://mailtrap.io
2. Pobierz dane SMTP z panelu
3. Skonfiguruj w `supabase/config.toml`

## Troubleshooting

### Problem: "Email nie pojawia się w Inbucket"

**Rozwiązania:**

1. Sprawdź czy Inbucket jest włączony w `config.toml`
2. Zrestartuj Supabase: `npx supabase stop && npx supabase start`
3. Sprawdź logi Supabase: `npx supabase logs`
4. Upewnij się że przekroczony nie został limit emaili (100/h)

### Problem: "Inbucket nie otwiera się na porcie 54324"

**Rozwiązania:**

1. Sprawdź czy Supabase działa: `npx supabase status`
2. Sprawdź czy port 54324 jest wolny:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :54324
   ```
3. Zmień port w `config.toml` jeśli zajęty

### Problem: "Link z emaila nie działa"

**Przyczyna:** Link w emailu może wskazywać na niewłaściwy URL.

**Rozwiązanie:** Ustaw `SITE_URL` w `supabase/config.toml`:

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000"]
```

## Przydatne komendy

```bash
# Sprawdź status Supabase (w tym Inbucket)
npx supabase status

# Wyświetl wszystkie porty
npx supabase status

# Restart Supabase
npx supabase stop
npx supabase start

# Sprawdź logi emaili
npx supabase logs inbucket

# Wyczyść wszystkie dane (w tym emaile w Inbucket)
npx supabase db reset
```

## Dodatkowe informacje

### Inbucket API (zaawansowane)

Inbucket udostępnia REST API na http://localhost:54324/api/v1:

```bash
# Lista wszystkich skrzynek
curl http://localhost:54324/api/v1/mailbox

# Emaile dla konkretnego użytkownika
curl http://localhost:54324/api/v1/mailbox/test

# Szczegóły konkretnego emaila
curl http://localhost:54324/api/v1/mailbox/test/[email-id]
```

### Konfiguracja SMTP w Inbucket (rzadko potrzebne)

Jeśli chcesz wysyłać emaile ręcznie do Inbucket:

```toml
[inbucket]
enabled = true
port = 54324
smtp_port = 54325  # Odkomentuj jeśli potrzebne
pop3_port = 54326  # Odkomentuj jeśli potrzebne
```

## Podsumowanie

✅ **Dla lokalnego developmentu - używaj Inbucket (http://localhost:54324)**  
✅ **Limit emaili zwiększony do 100/h**  
✅ **Brak potrzeby konfiguracji SMTP**  
✅ **Wszystkie emaile przechwytywane lokalnie**

**Status:** ✅ Gotowe do użycia  
**Dokumentacja:** Aktualna na dzień 2025-11-10
