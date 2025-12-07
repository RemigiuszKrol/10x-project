## Specyfikacja architektury modułu rejestracji, logowania i odzyskiwania hasła (PlantsPlaner)

Na podstawie PRD (`.ai/prd.md`, szczególnie US‑001, US‑002) oraz stacku (`.ai/tech-stack.md`). Specyfikacja opisuje architekturę UI (Astro + React 19 + Tailwind 4 + shadcn/ui), logikę backendową (Astro SSR + API routes), oraz integrację z Supabase Auth. Dokument nie zawiera implementacji, a jedynie precyzuje komponenty, moduły, kontrakty i przepływy. Uwzględnia wymagania niefunkcjonalne (wydajność, dostępność, obsługa błędów) oraz zachowuje spójność z pozostałym MVP.

### 1. Architektura interfejsu użytkownika

#### 1.1. Strony i layouty

- Nowe strony (Astro, ścieżki publiczne, „non‑auth layout”):
  - `src/pages/auth/login.astro` – logowanie
  - `src/pages/auth/register.astro` – rejestracja
  - `src/pages/auth/forgot-password.astro` – inicjacja odzyskiwania hasła
  - `src/pages/auth/reset-password.astro` – ustawienie nowego hasła po linku z e‑maila

- Istniejące/planowane strony „app” (wymagają sesji, „auth layout”):
  - `src/pages/plans/index.astro` – lista planów (US‑021)
  - `src/pages/profile/index.astro` – profil użytkownika (motyw; US‑004)
  - Inne strony edytora planu.

- Layouty:
  - `src/layouts/AuthLayout.astro` – minimalistyczny układ dla stron auth (logo, panel formularza, brak menu użytkownika).
  - `src/layouts/AppLayout.astro` – układ dla zalogowanych (nagłówek, `UserMenu`, nawigacja do planów/profilu).

- Nawigacja i przekierowania (SSR + middleware):
  - Niezalogowany użytkownik wchodzi na stronę „app” → middleware przekierowuje do `/auth/login`.
  - Zalogowany użytkownik wchodzi na stronę auth → SSR redirect do `/plans` (lub `returnTo`).

#### 1.2. Komponenty React (client‑side, wstrzykiwane w strony Astro)

- Formularze (shadcn/ui, Tailwind 4, kontrolowane komponenty, Zod po stronie klienta):
  - `src/components/auth/LoginForm.tsx`
  - `src/components/auth/RegisterForm.tsx`
  - `src/components/auth/ForgotPasswordForm.tsx`
  - `src/components/auth/ResetPasswordForm.tsx`
  - Wspólne elementy: `FormField`, `FormError`, `SubmitButton`, `AuthFormShell`.

- Komponenty nawigacji/wylogowania:
  - `src/components/UserMenu.tsx` – wyświetla e‑mail użytkownika, akcję „Wyloguj” (POST do `/api/auth/logout`), link do profilu.

- Podział odpowiedzialności:
  - Strony Astro odpowiadają za SSR (SEO, meta, layout), ochronę dostępu (redirect), osadzenie formularza React i przekazanie mu ewentualnych parametrów (np. `returnTo`).
  - Komponenty React odpowiadają za interakcje: kontrolę pól, walidację klienta, wywołanie API (`fetch` do `/api/auth/*`), prezentację błędów, zarządzanie stanem (`loading`, `success`), finalną nawigację (`window.location.assign(redirectTo)`).

#### 1.3. Walidacja i komunikaty błędów (UI)

- Walidacja klienta (Zod) – przed wysłaniem żądania:
  - `email`: poprawny format RFC.
  - `password`: min. 8 znaków; rekomendacja: co najmniej 1 litera i 1 cyfra.
  - `confirmPassword` = `password` (tylko rejestracja i reset hasła).

- Prezentacja błędów:
  - Błędy pól: pod polami, krótkie, zrozumiałe komunikaty w PL.
  - Błąd globalny (baner/toast): np. „Niepoprawne dane logowania” lub „Adres e‑mail zajęty”.
  - Stan niedostępności sieci (timeout, brak odpowiedzi): komunikat z akcją ponów.

- Wskazówki dostępności (A11y):
  - Etykiety `label`, opisy `aria-describedby`, focus ring, role/`aria-live` dla komunikatów błędów.

#### 1.4. Scenariusze

- Rejestracja (US‑001):
  1. Użytkownik wypełnia `email`, `password`, `confirmPassword` → walidacja klienta.
  2. `POST /api/auth/register` → sukces: automatyczne zalogowanie (jeśli w Supabase włączony „autoConfirm” – zgodnie z PRD: brak weryfikacji e‑mail) i redirect do `/plans` (lub `returnTo`).
  3. Błędy: e‑mail zajęty, słabe hasło, problem sieci → czytelne komunikaty.

- Logowanie (US‑002):
  1. `email`, `password` → `POST /api/auth/login`.
  2. Sukces: redirect do strony docelowej (parametr `returnTo` w query/cookie) lub `/plans`.
  3. Błędy: nieprawidłowe dane, blokada konta (jeśli kiedyś będzie), sieć → komunikaty.
  4. Sesja trwa między odsłonami dzięki cookie Supabase.

- Wylogowanie (US‑003):
  - Klik w `UserMenu` → `POST /api/auth/logout` → redirect do `/auth/login`.

- Odzyskiwanie hasła (zgodne z US‑002):
  - „Zapomniałem hasła?” prowadzi do `/auth/forgot-password`:
    - `POST /api/auth/forgot-password` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: <SITE_URL>/auth/reset-password })`.
    - UI zawsze komunikuje „Jeśli e‑mail istnieje, wysłaliśmy link resetu” (brak wycieku informacji).
  - Link z e‑maila → `/auth/reset-password?access_token=...`:
    - Formularz nowego hasła → `POST /api/auth/reset-password` → `supabase.auth.updateUser({ password })` (z aktywną sesją z linku).
    - Po sukcesie redirect do `/auth/login` lub `/plans`.

### 2. Logika backendowa (API, walidacja, obsługa wyjątków, SSR)

#### 2.1. Endpoints API (Astro pages API, `src/pages/api/auth/*.ts`)

Wszystkie endpointy zwracają `application/json`. Struktury DTO w `src/types.ts`, schematy walidacji w `src/lib/validation/auth.ts`.

- `POST /api/auth/register`
  - Body (`RegisterDto`): `{ email: string; password: string; confirmPassword: string }`
  - Walidacja: Zod (email, długość hasła, zgodność hasła).
  - Działanie: `supabase.auth.signUp({ email, password })`.
  - Sukces: `{ success: true, redirectTo: string }` (np. `"/plans"` lub `returnTo`).
  - Błąd: `{ success: false, error: AuthError }`.

- `POST /api/auth/login`
  - Body (`LoginDto`): `{ email: string; password: string }`
  - Działanie: `supabase.auth.signInWithPassword({ email, password })`.
  - Sukces: `{ success: true, redirectTo: string }`.
  - Błąd: `{ success: false, error: AuthError }` (zmapowane z Supabase, bez ujawniania szczegółów).

- `POST /api/auth/logout`
  - Działanie: `supabase.auth.signOut()`.
  - Sukces: `{ success: true, redirectTo: "/auth/login" }`.

- `POST /api/auth/forgot-password`
  - Body: `{ email: string }`
  - Działanie: `supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + "/auth/reset-password" })`.
  - Odpowiedź zawsze: `{ success: true }` (nie ujawniamy istnienia konta).

- `POST /api/auth/reset-password`
  - Body: `{ password: string; confirmPassword: string }`
  - Kontekst: wywoływany przy aktywnej sesji z linku resetującego (token w URL).
  - Działanie: `supabase.auth.updateUser({ password })`.
  - Sukces: `{ success: true, redirectTo: "/auth/login" }`.

#### 2.2. Typy i kontrakty (`src/types.ts` – dopisanie sekcji Auth)

- `AuthError`: `{ code: string; message: string; field?: "email" | "password" | "confirmPassword" }`
- `AuthResponse<T = unknown>`: `{ success: boolean; data?: T; error?: AuthError; redirectTo?: string }`
- `LoginDto`, `RegisterDto`, `ForgotPasswordDto`, `ResetPasswordDto` – jak wyżej.

#### 2.3. Walidacja danych wejściowych (`src/lib/validation/auth.ts`)

- Zod schematy lustrzane do DTO (klient i serwer używają tych samych reguł, po stronie klienta import przez lazy/dynamic).
- Dodatkowe reguły bezpieczeństwa hasła są konfigurowalne (np. min. 8 znaków, wymagania znaków).

#### 2.4. Obsługa wyjątków i mapowanie błędów

- Guard clauses i wczesne zwroty z czytelnymi kodami błędów.
- Mapowanie błędów Supabase (np. `invalid_credentials`, `user_already_exists`) na zlokalizowane komunikaty:
  - Login: zawsze ogólny komunikat „Niepoprawny e‑mail lub hasło”, bez wskazywania które pole jest błędne (minimalizacja wektora ataku).
  - Rejestracja: komunikat „Adres e‑mail jest już zajęty”, jeśli to możliwe.
- Logowanie serwerowe (bez danych wrażliwych), sentry/console – bez wpływu na klienta.

#### 2.5. SSR i middleware (uwzględniając `astro.config.mjs` – output: "server", adapter node)

- `src/middleware/index.ts`:
  - Tworzy klienta Supabase (server) i sprawdza sesję dla żądań SSR.
  - Trasy wymagające sesji (np. `/plans`, `/profile`, edytor): redirect do `/auth/login` jeśli brak sesji.
  - Trasy auth (`/auth/*`): jeśli sesja istnieje → redirect do `/plans` (lub `returnTo`).
  - Wykluczenia: `/api/auth/*`, assets statyczne, `favicon`, `sitemap`, itp.
  - Wstrzyknięcie `Astro.locals.user` (minimum: `id`, `email`) na potrzeby SSR.

- Strony SSR mogą wykrywać `Astro.locals.user` i renderować odpowiednie UI (np. `UserMenu`).

### 3. System autentykacji (Supabase Auth + Astro)

#### 3.1. Klienci Supabase (`src/db/`)

- `src/db/supabase-server.ts`:
  - `getSupabaseServerClient(Astro)`: `createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookies: { get, set, remove } })` – używa cookies z kontekstu Astro.
  - Zapewnia spójność sesji między SSR i API routes.

- `src/db/supabase-browser.ts`:
  - `getSupabaseBrowserClient()`: `createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)` – do ewentualnych interakcji w kliencie (formularze korzystają z `/api/auth/*`, ale klient może być użyty do odczytu stanu sesji).

- Zmienne środowiskowe (plik `.env`):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL` (do linków resetu).

#### 3.2. Przechowywanie sesji i cookies

- Supabase zarządza `sb-` cookies (SameSite=Lax). W SSR przekazywane przez adapter cookies Astro.
- Brak własnego JWT – unifikacja na kliencie i serwerze przez supabase-js.

#### 3.3. Rejestracja i logowanie

- Rejestracja: `supabase.auth.signUp({ email, password })`.
  - Zgodnie z PRD: brak weryfikacji e‑mail → w Supabase należy wyłączyć e‑mail confirmation, aby po rejestracji sesja była dostępna (auto‑login).
- Logowanie: `supabase.auth.signInWithPassword({ email, password })`.
- Wylogowanie: `supabase.auth.signOut()` (API route, bezpośrednio w serwerze – pewność czyszczenia sesji).

#### 3.4. Odzyskiwanie hasła

- Inicjacja: `supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + "/auth/reset-password" })`.
- Ukończenie: po przejściu linku (aktywuje sesję tymczasową) → `supabase.auth.updateUser({ password })`.

#### 3.5. Ochrona tras i nawigacja

- Middleware egzekwuje dostęp dla SSR (brak wycieków stron app dla niezalogowanych).
- Po zalogowaniu: redirect do `returnTo` (jeśli ustawione przez middleware, np. w cookie) lub `/plans`.
- Po wylogowaniu: redirect do `/auth/login`.

### 4. Struktura katalogów i modułów

Zgodnie z regułami projektu.

- `src/pages/auth/login.astro`
- `src/pages/auth/register.astro`
- `src/pages/auth/forgot-password.astro`
- `src/pages/auth/reset-password.astro`
- `src/layouts/AuthLayout.astro`
- `src/layouts/AppLayout.astro`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/UserMenu.tsx`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/register.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/forgot-password.ts`
- `src/pages/api/auth/reset-password.ts`
- `src/db/supabase-server.ts`
- `src/db/supabase-browser.ts`
- `src/lib/validation/auth.ts`
- `src/types.ts` (sekcja Auth DTO/typy)
- `src/middleware/index.ts` (wymuszenie sesji, redirecty)

### 5. Kontrakty (DTO, odpowiedzi API)

#### 5.1. DTO (TypeScript – definicje w `src/types.ts`)

- `LoginDto`: `{ email: string; password: string }`
- `RegisterDto`: `{ email: string; password: string; confirmPassword: string }`
- `ForgotPasswordDto`: `{ email: string }`
- `ResetPasswordDto`: `{ password: string; confirmPassword: string }`

#### 5.2. Odpowiedzi

- `AuthResponse<T = unknown>`:
  - `success: boolean`
  - `data?: T`
  - `error?: { code: string; message: string; field?: "email" | "password" | "confirmPassword" }`
  - `redirectTo?: string`

### 6. Walidacja i bezpieczeństwo

- Walidacja Zod na kliencie i serwerze (ten sam zestaw reguł).
- Brak rozróżniania, czy `email` istnieje (login/forgot) – ochrona przed enumeracją kont.
- CSRF: żądania do `/api/auth/*` – opieramy się na `SameSite=Lax` cookies Supabase; dodatkowo można sprawdzać nagłówek `Origin`/`Referer`.
- Brute force: komunikaty przy logowaniu są uogólnione; opcjonalnie dodać krótkie opóźnienie po kilku błędach (poza MVP).
- Dane wrażliwe nie są logowane. Błędy serwerowe – ogólne komunikaty dla użytkownika.

### 7. i18n, dostępność, UX

- Teksty w PL (MVP).
- Dostępność: odpowiednie role/aria, focus, kontrasty (zgodnie z PRD).
- Responsywność i prostota – desktop first (mysz), czytelne komunikaty błędów.

### 8. Zgodność z innymi wymaganiami PRD

- Nie modyfikujemy strumienia analityki MVP (4 zdarzenia dot. planów). Moduł auth nie dodaje nowych eventów.
- Funkcje auth nie ingerują w edytor siatki czy AI.
- Wydajność: operacje auth są proste; SSR + middleware tylko sprawdza sesję.

### 9. Kryteria akceptacji (mapowanie na US‑001, US‑002, US‑003)

- US‑001 Rejestracja:
  - Dedykowana strona i formularz (z walidacją e‑mail, hasła, potwierdzenia).
  - Utworzenie konta w bazie (Supabase), auto‑login (brak email verification).
  - Czytelne komunikaty błędów (np. e‑mail zajęty, brak sieci).

- US‑002 Logowanie (+ odzyskiwanie hasła):
  - Dedykowana strona logowania.
  - Błędne dane → czytelny komunikat.
  - Po zalogowaniu lista planów widoczna (dzięki middleware/SSR).
  - Sesja trwa między odsłonami (cookies Supabase).
  - Odzyskiwanie hasła: dostępne zawsze.

- US‑003 Wylogowanie:
  - Akcja „Wyloguj” czyści sesję i przenosi do logowania.

### 10. Ryzyka i decyzje

- Konfiguracja Supabase (wyłączona weryfikacja e‑mail) – wymagana, by spełnić auto‑login po rejestracji.
- Ewentualne ograniczenia dostawcy e‑maili dla resetu hasła – obsłużone informacyjnym UI, bez blokowania innych funkcji.
- Spójność z PRD: mimo że w sekcji „Poza zakresem” PRD wskazano „reset hasła” jako poza MVP, zgodnie z pkt 3.1 oraz US‑002 („Odzyskiwanie hasła powinno być możliwe”) traktujemy odzyskiwanie hasła jako element MVP. Ta specyfikacja określa je jako wymagane (strony i endpointy).

— Koniec specyfikacji —
