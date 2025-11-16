# 📧 Quick Start: Testowanie emaili lokalnie

## TL;DR

**Problem:** Emaile z Supabase Auth (reset hasła, weryfikacja konta) nie trafiają na prawdziwe skrzynki.

**Rozwiązanie:** Otwórz **http://localhost:54324** aby zobaczyć wszystkie wysłane emaile.

---

## Jak testować emaile lokalnie

### 1️⃣ Uruchom Supabase i aplikację

```bash
# Terminal 1: Uruchom Supabase
npx supabase start

# Terminal 2: Uruchom aplikację
npm run dev
```

### 2️⃣ Wywołaj akcję wysyłającą email

**Przykład: Reset hasła**

1. Otwórz http://localhost:3000/auth/forgot-password
2. Wpisz email (np. `test@example.com`)
3. Kliknij "Wyślij link resetujący"

**Przykład: Rejestracja**

1. Otwórz http://localhost:3000/auth/register
2. Wypełnij formularz
3. Kliknij "Zarejestruj się"

### 3️⃣ Sprawdź email w Inbucket

1. Otwórz **http://localhost:54324**
2. Znajdź skrzynkę użytkownika (np. `test@example.com`)
3. Kliknij na wiadomość email
4. Kliknij link w emailu lub skopiuj go

---

## Co to jest Inbucket?

**Inbucket** to lokalny "fałszywy" serwer email, który:

- ✅ Przechwytuje wszystkie emaile wysłane przez Supabase
- ✅ Wyświetla je w przeglądarce
- ✅ Nie wysyła prawdziwych emaili (idealne do testów)

---

## Zmiany w konfiguracji

### ✅ Zwiększony limit emaili

**Gdzie:** `supabase/config.toml`

```toml
[auth.rate_limit]
email_sent = 100  # Zwiększone z 2 do 100 dla developmentu
```

**Po co:** Pozwala wysłać więcej emaili testowych (domyślnie tylko 2/h).

### ⚠️ Restart Supabase po zmianach

Po każdej zmianie w `supabase/config.toml`:

```bash
npx supabase stop
npx supabase start
```

---

## Często zadawane pytania (FAQ)

### ❓ Dlaczego email nie trafia na moją skrzynkę Gmail/Outlook?

Lokalne środowisko **nie wysyła prawdziwych emaili**. Wszystkie emaile są przechwytywane przez Inbucket. To normalne zachowanie dla developmentu.

### ❓ Gdzie mogę zobaczyć wysłane emaile?

Otwórz **http://localhost:54324** w przeglądarce.

### ❓ Co jeśli nie widzę emaila w Inbucket?

1. Sprawdź czy Supabase działa: `npx supabase status`
2. Sprawdź czy Inbucket jest włączony (port 54324 powinien być aktywny)
3. Zrestartuj Supabase: `npx supabase stop && npx supabase start`
4. Sprawdź logi: `npx supabase logs`

### ❓ Jak wysłać prawdziwy email (na produkcję)?

Skonfiguruj SMTP w `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
user = "twoj-email@gmail.com"
pass = "env(SMTP_PASSWORD)"
```

⚠️ **Nie zalecane dla developmentu** - lepiej używać Inbucket.

---

## Przydatne linki

- 🌐 **Inbucket:** http://localhost:54324
- 📚 **Pełna dokumentacja:** `.ai/implementations/inbucket-email-testing.md`
- 🔧 **Status Supabase:** `npx supabase status`
- 📋 **Logi:** `npx supabase logs inbucket`

---

## Podsumowanie

✅ **Inbucket działa automatycznie** - nie musisz nic konfigurować  
✅ **Limit emaili zwiększony** - możesz wysłać 100 emaili/h  
✅ **Wszystkie emaile są lokalnie** - brak prawdziwych wysyłek

**Gotowe do użycia!** 🚀
