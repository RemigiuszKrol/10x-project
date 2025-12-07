# PlantsPlaner

[![Node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Astro](https://img.shields.io/badge/astro-5.x-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
![Status](https://img.shields.io/badge/status-MVP%20in%20progress-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Opis projektu

PlantsPlaner to aplikacja webowa wspierająca planowanie i ocenę rozmieszczenia roślin w ogrodzie. Aplikacja rozwiązuje problem trudności w doborze gatunków i ich rozmieszczeniu, wynikający z braku znajomości lokalnych warunków pogodowych i potrzeb roślin.

**Główne funkcjonalności MVP:**
- Tworzenie planów działki na siatce z możliwością określenia typów powierzchni (ziemia, ścieżka, woda, zabudowa)
- Dodawanie roślin do planu z oceną dopasowania do lokalnych warunków
- Integracja z mapami (Leaflet + OpenStreetMap) do określenia lokalizacji działki
- Automatyczne pobieranie danych pogodowych (Open-Meteo) dla lokalizacji działki
- Wykorzystanie AI do wyszukiwania roślin i oceny ich dopasowania do warunków

**Dokumentacja:**
- [Product Requirements (PRD)](.ai/docs/prd.md) - Szczegółowe wymagania produktu
- [Tech Stack](.ai/docs/tech-stack.md) - Szczegóły techniczne
- [UI Plan](.ai/docs/ui-plan.md) - Plan interfejsu użytkownika
- [API Plan](.ai/docs/api-plan.md) - Dokumentacja API

## Spis treści

- [Funkcjonalności MVP](#funkcjonalności-mvp)
- [Tech Stack](#tech-stack)
- [Architektura projektu](#architektura-projektu)
- [Wymagania systemowe](#wymagania-systemowe)
- [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
- [Konfiguracja środowiska](#konfiguracja-środowiska)
- [Struktura projektu](#struktura-projektu)
- [Dostępne skrypty](#dostępne-skrypty)
- [Testowanie](#testowanie)
- [API Endpoints](#api-endpoints)
- [Baza danych](#baza-danych)
- [Integracje zewnętrzne](#integracje-zewnętrzne)
- [Zakres projektu](#zakres-projektu)
- [Deployment](#deployment)
- [Rozwój i kontrybucja](#rozwój-i-kontrybucja)
- [Troubleshooting](#troubleshooting)
- [Dokumentacja dodatkowa](#dokumentacja-dodatkowa)
- [Status projektu](#status-projektu)
- [Licencja](#licencja)

## Funkcjonalności MVP

### Uwierzytelnianie i profil
- Rejestracja i logowanie e-mail/hasło
- Wylogowanie z sesji
- Strona profilu z preferencjami motywu kolorystycznego
- Odzyskiwanie hasła

### Plany działki
- Utworzenie planu z nazwą, lokalizacją (geokodowanie), orientacją (0–359°), wymiarami rzeczywistymi i jednostką kratki (10/25/50/100 cm)
- Generowanie siatki na podstawie wymiarów i jednostki (limit 200×200 pól)
- Edycja siatki: zaznaczanie obszarów i przypisywanie typów pól (ziemia/ścieżka/woda/zabudowa)
- Zmiana typu pola/obszaru z potwierdzeniem, jeśli usunie to rośliny
- Zapis stanu planu i siatki

### Rośliny
- Dodawanie rośliny do pojedynczego pola (1 roślina = 1 pole); tylko na polu typu ziemia
- Usuwanie rośliny z pola
- Wyszukiwanie roślin po nazwie z potwierdzeniem wyboru
- Ocena dopasowania rośliny do warunków lokalnych przez AI (scores 1–5)

### Mapy i lokalizacja
- Leaflet.js + OpenStreetMap do prezentacji mapy i darmowego geokodowania
- Ustawianie pinezki lokalizacji działki z informacją o możliwej niskiej dokładności

### Dane pogodowe
- Jednorazowe pobranie danych pogodowych po ustawieniu lokalizacji lub przy pierwszym uruchomieniu AI dla planu
- Cache miesięczny per plan; odświeżanie po upływie miesiąca
- Mapowanie zmiennych: nasłonecznienie, wilgotność, opady, temperatura; normalizacja do wspólnej skali

### AI (wyszukiwanie i ocena dopasowania)
- Wyszukiwanie roślin po nazwie z potwierdzeniem wyboru przez użytkownika
- Odpowiedź AI wyłącznie w stałym schemacie JSON; sanity-check formatu i wartości
- Scoring parametrów 1–5 z progami: ≥90=5, 80–89=4, 70–79=3, 60–69=2, <60=1
  - Parametry oceny: nasłonecznienie, wilgotność, opady, temperatura
- Średnia ważona miesięcy: IV–IX waga 2, pozostałe 1; automatyczne dostosowanie do półkuli
- Timeout 10 s; po przekroczeniu czytelny błąd i opcja ponowienia
- **Mock data mode**: Ustaw `PUBLIC_USE_MOCK_AI=true` w `.env` dla developmentu bez AI providera

### Analityka
- Zapis do bazy wyłącznie 4 zdarzeń: `plan_created`, `grid_saved`, `area_typed`, `plant_confirmed`
- Wykorzystanie zdarzeń do analizy lejka i KPI

## Tech Stack

### Frontend
- **Astro 5** - Framework z SSR dla layoutów i stron statycznych
- **React 19** - Komponenty interaktywne
- **TypeScript 5** - Typowanie statyczne
- **Tailwind CSS 4** - Styling utility-first (via `@tailwindcss/vite`)
- **shadcn/ui** - Komponenty UI oparte na Radix UI
- **Radix UI** - Primitives dla dostępności
- **lucide-react** - Ikony

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL - Baza danych
  - Supabase Auth - Uwierzytelnianie (JWT)
  - Row Level Security (RLS) - Bezpieczeństwo na poziomie wierszy
- **@astrojs/node** - Adapter Node.js (standalone mode)

### Integracje zewnętrzne
- **Leaflet.js + OpenStreetMap** - Mapy i geokodowanie (darmowe)
- **Open-Meteo API** - Dane pogodowe historyczne
- **OpenRouter** - AI do wyszukiwania i oceny roślin

### Narzędzia deweloperskie
- **Vitest** - Testy jednostkowe (z Happy-DOM)
- **Playwright** - Testy end-to-end
- **ESLint 9** - Linting kodu
- **Prettier** - Formatowanie kodu
- **Husky + lint-staged** - Git hooks
- **MSW** - Mockowanie API w testach
- **Zod** - Walidacja schematów

### Konfiguracja
- **Vite** - Build tool (via Astro)
- **TypeScript** - Konfiguracja z aliasem `@/*`
- **React Query** - Zarządzanie stanem serwerowym

## Architektura projektu

### Wzorce architektoniczne

**Frontend:**
- **Astro** dla layoutów i stron statycznych (file-based routing)
- **React** dla komponentów interaktywnych (client-side)
- **React Query** (`@tanstack/react-query`) dla synchronizacji danych serwerowych
- **Context API** dla lokalnego stanu (motyw kolorystyczny)

**Backend:**
- **Supabase** jako BaaS (Backend as a Service)
- **RLS (Row Level Security)** - kontrola dostępu na poziomie bazy danych
- **API Routes** w Astro (`src/pages/api/**`) - endpointy REST

**Styling:**
- **Tailwind CSS 4** - utility-first CSS
- **shadcn/ui** - komponenty oparte na Radix UI
- **CSS Variables** - dla motywów (light/dark)

**Walidacja:**
- **Zod** - schematy walidacji dla API i formularzy
- Walidacja po stronie klienta i serwera

**Autoryzacja:**
- **Supabase Auth** - JWT tokens
- **Middleware** (`src/middleware/index.ts`) - weryfikacja sesji
- **Cookie-based sessions** - zarządzanie sesjami przez `@supabase/ssr`

### Przepływ danych

```
Użytkownik → React Component → React Query Hook → API Route → Supabase Client → PostgreSQL
                                                                    ↓
                                                              RLS Policies
```

## Wymagania systemowe

- **Node.js** 22.14.0 (sprawdź `.nvmrc`)
- **npm** 10+ (lub yarn/pnpm)
- **Docker Desktop** - wymagane dla lokalnego Supabase
- **Git** - kontrola wersji

## Instalacja i uruchomienie

### Krok 1: Klonowanie repozytorium

```bash
git clone <repo-url>
cd plantsplaner
```

### Krok 2: Instalacja zależności

```bash
npm install
```

### Krok 3: Uruchomienie Supabase lokalnie

```bash
npx supabase start
```

Po uruchomieniu Supabase zobaczysz output z URL-ami i kluczami. Zapisz je - będą potrzebne w następnym kroku.

**Supabase services:**
- API: `http://localhost:54321`
- Studio (UI): `http://localhost:54323`
- Inbucket (email testing): `http://localhost:54324` 📧

> **Uwaga:** Wszystkie e-maile (potwierdzenie konta, reset hasła) są przechwytywane przez Inbucket. Otwórz `http://localhost:54324` aby je zobaczyć. Odzyskiwanie hasła działa podobnie jak potwierdzenie konta - link resetujący jest wysyłany na e-mail i przechwytywany przez Inbucket w środowisku lokalnym.

### Krok 4: Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` w katalogu głównym projektu:

```bash
cp .env.example .env  # Jeśli istnieje .env.example
```

Edytuj `.env` i ustaw następujące zmienne (wartości z outputu `supabase start`):

```env
# Supabase (wymagane)
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=<anon-key-z-supabase-start>

# OpenRouter AI (wymagane dla funkcji AI)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Opcjonalne - OpenRouter
OPENROUTER_SEARCH_MODEL=openai/gpt-4o-mini
OPENROUTER_FIT_MODEL=openai/gpt-4o-mini
OPENROUTER_APP_NAME=PlantsPlaner
OPENROUTER_SITE_URL=

# Opcjonalne - Open-Meteo
OPEN_METEO_API_URL=https://archive-api.open-meteo.com/v1/archive

# Opcjonalne - Mock AI dla developmentu (bez prawdziwego API)
PUBLIC_USE_MOCK_AI=true

# Opcjonalne - Logowanie błędów
ENABLE_ERROR_LOGGING=true
```

### Krok 5: Uruchomienie serwera deweloperskiego

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000` (lub portem wskazanym przez Astro CLI).

### Weryfikacja instalacji

1. Otwórz `http://localhost:3000` w przeglądarce
2. Sprawdź czy strona się ładuje
3. Sprawdź Supabase Studio: `http://localhost:54323`
4. Sprawdź Inbucket: `http://localhost:54324`

## Konfiguracja środowiska

### Wymagane zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `SUPABASE_URL` | URL projektu Supabase | `http://localhost:54321` (dev) lub `https://xxx.supabase.co` (prod) |
| `SUPABASE_KEY` | Anon key z Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `OPENROUTER_API_KEY` | Klucz API OpenRouter | `sk-or-v1-...` |

### Opcjonalne zmienne środowiskowe

| Zmienna | Opis | Domyślna wartość |
|---------|------|------------------|
| `PUBLIC_USE_MOCK_AI` | Użyj mock danych AI (dev) | `false` |
| `OPENROUTER_SEARCH_MODEL` | Model do wyszukiwania roślin | `openai/gpt-4o-mini` |
| `OPENROUTER_FIT_MODEL` | Model do oceny dopasowania | `openai/gpt-4o-mini` |
| `OPENROUTER_APP_NAME` | Nazwa aplikacji dla OpenRouter | `PlantsPlaner` |
| `OPENROUTER_SITE_URL` | URL strony dla OpenRouter | - |
| `OPEN_METEO_API_URL` | URL API Open-Meteo | `https://archive-api.open-meteo.com/v1/archive` |
| `ENABLE_ERROR_LOGGING` | Włącz logowanie błędów | `true` |

### Konfiguracja dla różnych środowisk

**Development:**
- Użyj lokalnego Supabase (`npx supabase start`)
- Ustaw `PUBLIC_USE_MOCK_AI=true` aby uniknąć kosztów API podczas developmentu

**Production:**
- Użyj produkcyjnego projektu Supabase
- Ustaw prawdziwe klucze API
- `PUBLIC_USE_MOCK_AI` powinno być `false` lub nieustawione

> **⚠️ Bezpieczeństwo:** Nigdy nie commituj pliku `.env` do repozytorium! Użyj `.env.example` jako szablonu.

## Struktura projektu

```
plantsplaner/
├── src/
│   ├── components/         # Komponenty React i Astro
│   │   ├── auth/           # Komponenty uwierzytelniania
│   │   ├── editor/         # Komponenty edytora planu
│   │   ├── location/       # Komponenty mapy i lokalizacji
│   │   ├── plans/          # Komponenty listy i tworzenia planów
│   │   ├── profile/        # Komponenty profilu użytkownika
│   │   └── ui/             # Komponenty UI (shadcn/ui)
│   ├── pages/              # Strony i API endpoints
│   │   ├── api/            # API routes (REST endpoints)
│   │   │   ├── ai/         # Endpointy AI
│   │   │   ├── analytics/  # Endpointy analityki
│   │   │   ├── auth/       # Endpointy uwierzytelniania
│   │   │   └── plans/      # Endpointy planów
│   │   ├── auth/           # Strony uwierzytelniania
│   │   └── plans/          # Strony planów
│   ├── layouts/            # Layouty Astro
│   ├── lib/                # Logika biznesowa
│   │   ├── contexts/       # React Context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # Serwisy (API clients, integracje)
│   │   ├── utils/          # Funkcje pomocnicze
│   │   └── validation/    # Schematy Zod
│   ├── db/                 # Supabase client i typy
│   │   ├── supabase.client.ts
│   │   └── database.types.ts
│   ├── middleware/         # Astro middleware
│   ├── styles/             # Globalne style CSS
│   └── types.ts            # Wspólne typy TypeScript
├── supabase/
│   ├── migrations/         # Migracje bazy danych
│   ├── templates/           # Szablony emaili
│   └── config.toml         # Konfiguracja Supabase
├── e2e/                    # Testy end-to-end (Playwright)
├── public/                 # Statyczne pliki publiczne
├── astro.config.mjs        # Konfiguracja Astro
├── vitest.config.ts        # Konfiguracja testów jednostkowych
├── playwright.config.ts    # Konfiguracja testów E2E
└── package.json
```

### Opis głównych katalogów

- **`src/components/`** - Komponenty UI podzielone na kategorie funkcjonalne
- **`src/pages/api/`** - API endpoints zgodne z REST API plan
- **`src/lib/services/`** - Serwisy komunikujące się z API i integracjami zewnętrznymi
- **`src/lib/hooks/`** - Custom hooks dla logiki biznesowej i React Query
- **`src/db/`** - Klient Supabase i typy generowane z bazy danych
- **`supabase/migrations/`** - Migracje SQL dla struktury bazy danych

## Dostępne skrypty

### Development

```bash
npm run dev              # Uruchomienie serwera deweloperskiego
npm run dev:debug        # Uruchomienie z debuggerem Node.js
```

### Build i preview

```bash
npm run build            # Build produkcyjny
npm run preview          # Podgląd builda produkcyjnego lokalnie
```

### Testowanie

```bash
npm run test            # Uruchomienie testów jednostkowych (Vitest)
npm run test:coverage   # Testy z raportem pokrycia kodu
npm run test:e2e        # Uruchomienie testów end-to-end (Playwright)
npm run test:e2e:retry-failed  # Ponowne uruchomienie nieudanych testów E2E
```

### Jakość kodu

```bash
npm run lint            # Sprawdzenie kodu przez ESLint
npm run lint:fix        # Automatyczna naprawa błędów ESLint
npm run format          # Formatowanie kodu przez Prettier
```

### Inne

```bash
npm run astro           # Bezpośredni dostęp do Astro CLI
npm run test:openrouter # Test integracji z OpenRouter (skrypt pomocniczy)
```

## Testowanie

### Testy jednostkowe (Vitest)

Testy jednostkowe używają **Vitest** z **Happy-DOM** jako środowiskiem DOM.

```bash
# Uruchomienie wszystkich testów
npm run test

# Testy z pokryciem kodu
npm run test:coverage
```

**Konfiguracja:**
- Środowisko: `happy-dom` (szybsze niż jsdom)
- Pokrycie: Cel 80% dla statements, branches, functions, lines
- Mockowanie: MSW (Mock Service Worker) dla API
- Lokalizacja: `src/**/*.{test,spec}.{ts,tsx}`

### Testy end-to-end (Playwright)

Testy E2E używają **Playwright** i testują aplikację w rzeczywistej przeglądarce.

```bash
# Uruchomienie testów E2E
npm run test:e2e

# Ponowne uruchomienie nieudanych testów
npm run test:e2e:retry-failed
```

**Wymagania:**
- Aplikacja musi być zbudowana (`npm run build`)
- Supabase musi być uruchomiony lokalnie (`npx supabase start`)
- Zmienne środowiskowe w `.env.test`

**Konfiguracja:**
- Przeglądarka: Chromium (zgodnie z regułami projektu)
- Timeout: 120s na test
- Retry: 2x w CI, 0 lokalnie
- Screenshots/video: Tylko przy błędzie

**Struktura testów:**
- `e2e/` - Katalog z testami
- `e2e/fixtures/` - Helpery i dane testowe
- `e2e/pages/` - Page Object Model

### Pokrycie kodu

Cel pokrycia: **80%** dla:
- Statements
- Branches
- Functions
- Lines

Sprawdź raport pokrycia po uruchomieniu `npm run test:coverage` - otwórz `coverage/index.html` w przeglądarce.

## API Endpoints

Aplikacja udostępnia REST API zgodne z [API Plan](.ai/docs/api-plan.md).

### Base URL

```
/api
```

### Autoryzacja

Wszystkie endpointy (oprócz auth) wymagają autoryzacji przez JWT token w nagłówku:

```
Authorization: Bearer <token>
```

Token jest automatycznie zarządzany przez Supabase Auth i przekazywany w cookies.

### Główne grupy endpointów

#### Profile

- `GET /api/profile` - Pobierz profil użytkownika
- `PUT /api/profile` - Aktualizuj profil (motyw)

#### Plany działki

- `GET /api/plans` - Lista planów użytkownika
- `POST /api/plans` - Utwórz nowy plan
- `GET /api/plans/:plan_id` - Pobierz szczegóły planu
- `PATCH /api/plans/:plan_id` - Aktualizuj plan
- `DELETE /api/plans/:plan_id` - Usuń plan

#### Siatka planu

- `GET /api/plans/:plan_id/grid` - Pobierz metadane siatki
- `GET /api/plans/:plan_id/grid/cells` - Lista komórek siatki
- `PUT /api/plans/:plan_id/grid/cells/:x/:y` - Ustaw typ komórki
- `POST /api/plans/:plan_id/grid/area-type` - Nadaj typ obszarowi

#### Rośliny

- `GET /api/plans/:plan_id/plants` - Lista roślin w planie
- `PUT /api/plans/:plan_id/plants/:x/:y` - Dodaj/aktualizuj roślinę
- `DELETE /api/plans/:plan_id/plants/:x/:y` - Usuń roślinę

#### Pogoda

- `GET /api/plans/:plan_id/weather` - Pobierz zcache'owane dane pogodowe
- `POST /api/plans/:plan_id/weather/refresh` - Odśwież cache pogody

#### AI

- `POST /api/ai/plants/search` - Wyszukaj rośliny po nazwie
- `POST /api/ai/plants/fit` - Oceń dopasowanie rośliny do warunków

#### Analityka

- `POST /api/analytics/events` - Zapisz zdarzenie analityczne

Szczegółowa dokumentacja API znajduje się w [`.ai/docs/api-plan.md`](.ai/docs/api-plan.md).

## Baza danych

### Schema Supabase

Baza danych składa się z następujących tabel:

| Tabela | Opis |
|--------|------|
| `profiles` | Profile użytkowników (preferencje motywu kolorystycznego) |
| `plans` | Plany działki (nazwa, lokalizacja, wymiary, orientacja) |
| `grid_cells` | Komórki siatki planu (typ pola: soil/path/water/building) |
| `plant_placements` | Nasadzenia roślin (pozycja, nazwa, scores AI) |
| `weather_monthly` | Cache danych pogodowych (miesięczne metryki) |
| `analytics_events` | Zdarzenia analityczne (4 typy w MVP) |

### Migracje

Migracje znajdują się w `supabase/migrations/` i są automatycznie aplikowane przy:
- `npx supabase start` (lokalnie)
- Deploy do Supabase (produkcja)

**Aktualne migracje:**
- `20251104120000_init_plantsplanner_schema.sql` - Inicjalizacja schematu
- `20251113000000_auto_create_profile_trigger.sql` - Auto-tworzenie profilu
- `20251119000000_auto_populate_grid_cells.sql` - Auto-wypełnianie siatki
- `20251121120000_add_temperature_to_weather_monthly.sql` - Dodanie temperatury
- `20251121130000_add_temperature_score_to_plant_placements.sql` - Score temperatury

### Row Level Security (RLS)

Wszystkie tabele mają włączone **RLS** z politykami **owner-only**:
- Użytkownik widzi tylko swoje zasoby
- Polityki oparte o `auth.uid()` z Supabase Auth
- Automatyczna kontrola dostępu na poziomie bazy danych

### Triggery

- **Auto-tworzenie profilu** - przy rejestracji użytkownika
- **Auto-wypełnianie siatki** - przy utworzeniu planu
- **Walidacja granic komórek** - sprawdzanie czy `x,y` są w zakresie siatki
- **Purge roślin** - usuwanie roślin przy zmianie typu pola na nie-`soil`
- **Aktualizacja `updated_at`** - automatyczne timestampy

## Integracje zewnętrzne

### Leaflet + OpenStreetMap

**Cel:** Mapy i geokodowanie lokalizacji działki

**Funkcjonalności:**
- Wyświetlanie mapy z możliwością przesuwania pinezki
- Wyszukiwanie adresów (geokodowanie przez Nominatim API)
- Ustawianie lokalizacji działki przez kliknięcie na mapie

**Zastosowanie:**
- Komponent `LocationMap` w kreatorze planu
- Komponent `LocationSearch` do wyszukiwania adresów

**Ograniczenia:**
- Możliwa niska dokładność danych mapowych (komunikat dla użytkownika)
- Rate limiting Nominatim (max 1 request/s)

### Open-Meteo API

**Cel:** Dane pogodowe historyczne dla lokalizacji działki

**Funkcjonalności:**
- Pobieranie danych miesięcznych (12 miesięcy)
- Cache w bazie danych (`weather_monthly` table)
- Odświeżanie cache po upływie miesiąca
- Normalizacja metryk do skali 0-100

**Metryki:**
- **Nasłonecznienie** - kombinacja `shortwave_radiation` i `sunshine_duration`
- **Wilgotność** - `relative_humidity_2m`
- **Opady** - `precipitation_sum`
- **Temperatura** - średnia temperatura dzienna

**Zastosowanie:**
- Automatyczne pobieranie po ustawieniu lokalizacji planu
- Używane przez AI do oceny dopasowania roślin

**Rate limiting:**
- Cache miesięczny per plan
- Ręczne odświeżanie przez endpoint `/weather/refresh`
- Limit: 2 odświeżeń na godzinę per plan

### OpenRouter (AI)

**Cel:** Wyszukiwanie roślin i ocena dopasowania do warunków

**Funkcjonalności:**
- **Wyszukiwanie roślin** - po nazwie (polskiej lub łacińskiej)
- **Ocena dopasowania** - scores 1-5 dla czterech parametrów: nasłonecznienie, wilgotność, opady, temperatura
- **Timeout 10s** - po przekroczeniu błąd z możliwością ponowienia
- **Strict JSON schema** - sanity-check odpowiedzi AI

**Modele:**
- Domyślnie: `openai/gpt-4o-mini`
- Konfigurowalne przez zmienne środowiskowe

**Mock mode:**
- Ustaw `PUBLIC_USE_MOCK_AI=true` dla developmentu
- Zwraca przykładowe dane bez wywołań API
- Przydatne do testów i developmentu bez kosztów API

**Rate limiting:**
- 10 requestów/min per użytkownik dla `/api/ai/*`
- Implementowane przez `rate-limiter.ts`

**Obsługa błędów:**
- Timeout → komunikat + opcja ponowienia
- Niepoprawny JSON → sanity-check + błąd walidacji
- Błąd API → komunikat + możliwość pominięcia kroku

## Zakres projektu

### MVP (w zakresie)

✅ **Uwierzytelnianie:**
- Rejestracja i logowanie e-mail/hasło
- Profil użytkownika (motyw)
- Odzyskiwanie hasła (działa podobnie jak potwierdzenie konta - przez e-mail/Inbucket lokalnie)

✅ **Plany działki:**
- Tworzenie planu z lokalizacją, wymiarami, orientacją
- Generowanie siatki (max 200×200 pól)
- Edycja typów pól (ziemia/ścieżka/woda/zabudowa)
- Zapis stanu planu

✅ **Rośliny:**
- Dodawanie roślin do pól typu ziemia (1 roślina = 1 pole)
- Wyszukiwanie roślin przez AI
- Ocena dopasowania przez AI
- Usuwanie roślin

✅ **Mapy i lokalizacja:**
- Leaflet + OpenStreetMap
- Geokodowanie adresów
- Ustawianie lokalizacji działki

✅ **Dane pogodowe:**
- Automatyczne pobieranie dla lokalizacji
- Cache miesięczny
- Metryki: nasłonecznienie, wilgotność, opady, temperatura

✅ **AI:**
- Wyszukiwanie roślin
- Ocena dopasowania (scores 1-5)
- Timeout 10s
- Mock mode dla developmentu

✅ **Analityka:**
- 4 zdarzenia: `plan_created`, `grid_saved`, `area_typed`, `plant_confirmed`

### Ograniczenia MVP

- **Limit siatki:** Maksymalnie 200×200 pól
- **Brak cofania:** Operacje są nieodwracalne (z potwierdzeniami)
- **Minimalistyczna analityka:** Tylko 4 zdarzenia
- **Cache pogody:** Miesięczny per plan
- **AI timeout:** 10 sekund

## Deployment

### Build produkcyjny

```bash
npm run build
```

Build tworzy katalog `dist/` z gotową aplikacją.

### Wymagania produkcyjne

1. **Supabase project** - produkcyjny projekt Supabase
2. **Zmienne środowiskowe** - wszystkie wymagane zmienne ustawione
3. **Node.js 22.14.0** - na serwerze produkcyjnym

### Adapter Node.js

Aplikacja używa `@astrojs/node` w trybie `standalone`, co oznacza:
- Aplikacja działa jako standalone Node.js server
- Nie wymaga zewnętrznego serwera HTTP (np. Nginx)
- Port konfigurowalny przez zmienną środowiskową `PORT`

### CI/CD

Projekt używa **GitHub Actions** do automatycznych testów przy każdym PR:
- Testy jednostkowe
- Testy E2E
- Build aplikacji
- Linting

Konfiguracja w `.github/workflows/`.

### Deployment checklist

- [ ] Utworzenie produkcyjnego projektu Supabase
- [ ] Ustawienie zmiennych środowiskowych
- [ ] Uruchomienie migracji bazy danych
- [ ] Build aplikacji (`npm run build`)
- [ ] Test builda lokalnie (`npm run preview`)
- [ ] Deploy do serwera/hostingu
- [ ] Weryfikacja działania aplikacji
- [ ] Konfiguracja domeny i SSL

## Rozwój i kontrybucja

### Git workflow

1. Utwórz branch z feature/fix: `git checkout -b feature/nazwa-funkcji`
2. Wprowadź zmiany
3. Sprawdź linting: `npm run lint`
4. Uruchom testy: `npm run test && npm run test:e2e`
5. Commit zmian: `git commit -m "feat: opis zmian"`
6. Push branch: `git push origin feature/nazwa-funkcji`
7. Utwórz Pull Request

### Code style

**ESLint:**
- Konfiguracja w `eslint.config.js`
- Automatyczna naprawa: `npm run lint:fix`

**Prettier:**
- Konfiguracja w `.prettierrc`
- Formatowanie: `npm run format`

**Git hooks:**
- Husky uruchamia lint-staged przed commitem
- Automatyczne formatowanie i linting zmienionych plików

## Dokumentacja dodatkowa

### Główne dokumenty

- **[Product Requirements (PRD)](.ai/docs/prd.md)** - Szczegółowe wymagania produktu, user stories, KPI
- **[Tech Stack](.ai/docs/tech-stack.md)** - Szczegóły techniczne, konfiguracja, narzędzia
- **[UI Plan](.ai/docs/ui-plan.md)** - Architektura UI, widoki, komponenty, przepływ użytkownika
- **[API Plan](.ai/docs/api-plan.md)** - Dokumentacja REST API, endpointy, walidacja, autoryzacja

### Inne dokumenty

- `e2e/README.md` - Dokumentacja testów E2E
- `src/__tests__/README.md` - Dokumentacja testów jednostkowych

## Status projektu

### Obecny stan

**Status:**

Projekt zawiera:
- ✅ Fundament techniczny (Astro 5 + React 19 + Tailwind 4)
- ✅ Konfiguracja Supabase (lokalna i produkcyjna)
- ✅ Integracja z Leaflet/OSM
- ✅ Integracja z Open-Meteo
- ✅ Integracja z OpenRouter (AI)
- ✅ Testy jednostkowe i E2E
- ✅ Narzędzia jakości kodu (ESLint, Prettier)

## Licencja

MIT

---

**PlantsPlaner** - Planowanie ogrodu z AI i danymi pogodowymi 🌱
