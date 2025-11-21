# Plan implementacji widoku Profil użytkownika

## 1. Przegląd

- Widok `/profile` umożliwia zalogowanemu użytkownikowi podgląd i aktualizację preferencji językowych i motywu.
- Formularz ma zapewnić natychmiastową zmianę motywu (podgląd + ThemeProvider) oraz propagację języka do warstwy i18n.
- Widok korzysta z istniejących komponentów globalnych (`TopbarNavigation`, `NotificationCenter`) i integruje się z API `/api/profile`.

## 2. Routing widoku

- Astro page: `src/pages/profile.astro` (SSR disabled – korzystamy z klienta Supabase z kontekstu middleware).
- Widok dostępny wyłącznie dla zalogowanego użytkownika; w przypadku braku sesji middleware przekierowuje do logowania.

## 3. Struktura komponentów

- `ProfilePage` (React, entry point hydratowany w `profile.astro`)
  - `TopbarNavigation`
  - `NotificationCenter`
  - `ProfileContent` (sekcja główna)
    - `ProfileForm`
      - `LanguageSelector`
      - `ThemeSelector`
      - `ThemePreview`
      - `FormActions`
    - `PreferenceSummary` (ostatnia aktualizacja, identyfikator profilu)
  - Stany dodatkowe: `ProfileSkeleton`, `ProfileErrorFallback`

## 4. Szczegóły komponentów

### ProfilePage

- Opis: Komponent kontenerowy, pobiera dane profilu, zarządza stanem i kontekstami (język, motyw).
- Główne elementy: wrapper layout (`<main>`), `TopbarNavigation`, `NotificationCenter`, `ProfileContent`.
- Obsługiwane interakcje: inicjalne `useEffect` (GET `/api/profile`), `handleRetry`, przekazywanie `onSubmit`.
- Obsługiwana walidacja: brak bezpośredniej walidacji; kontrola, czy `profile` zawiera wymagane pola.
- Typy: `ProfileDto`, `ProfileViewModel`, `ProfileState`.
- Propsy: brak (entry point). Korzysta z globalnych providerów (`ThemeProvider`, `I18nProvider`).

### ProfileContent

- Opis: Renderuje sekcję główną w zależności od stanu (loading, error, data).
- Główne elementy: wrapper grid/flex, `ProfileSkeleton` lub `ProfileForm` + `PreferenceSummary`.
- Obsługiwane interakcje: `onRetry` (przekazane do `ProfileErrorFallback`).
- Obsługiwana walidacja: brak, wykorzystuje dane z rodzica.
- Typy: `ProfileContentProps` (`state`, `onSubmit`, `onRetry`).
- Propsy: `{ state: ProfileState; onSubmit: (payload: ProfileUpdatePayload) => Promise<void>; onRetry: () => void; }`.

### ProfileForm

- Opis: Formularz edycji preferencji z kontrolkami języka i motywu, obsługuje wysyłkę PUT.
- Główne elementy: `<form>`, `LanguageSelector`, `ThemeSelector`, `ThemePreview`, `FormActions`.
- Obsługiwane interakcje: `onLanguageChange`, `onThemeChange`, `onSubmit`.
- Obsługiwana walidacja:
  - co najmniej jedno pole różni się od wartości pierwotnych (aktywny przycisk zapisu).
  - `language_code` ograniczone do dozwolonych wartości (`["pl", "en"]` rozszerzalne konfiguracyjnie).
  - `theme` ograniczone do `["light", "dark"]`.
- Typy: `ProfileFormProps`, `ProfileFormValues`, `ProfileFormErrors`.
- Propsy: `{ initialValues: ProfileFormValues; isSubmitting: boolean; onSubmit: (values) => void; palettes: ThemePalette[]; languages: LanguageOption[]; }`.

### LanguageSelector

- Opis: Kontrolka wyboru języka (radio group lub select) z opisami i etykietami dostępności.
- Główne elementy: `RadioGroup` lub `Select` z shadcn/ui, etykieta `<label>`, opis `<p>`.
- Obsługiwane interakcje: `onChange(languageCode)`.
- Walidacja: wymagane wybranie jednej pozycji; dopuszczalne wartości z `LanguageOption`.
- Typy: `LanguageOption` (`code`, `label`, `nativeLabel`?), `LanguageSelectorProps`.
- Propsy: `{ options: LanguageOption[]; value: string; disabled: boolean; onChange: (code: string) => void; error?: string; }`.

### ThemeSelector

- Opis: Przełącznik motywu (toggle lub radio) z ikonami słoneczko/księżyc.
- Główne elementy: `SegmentedControl` lub `SwitchGroup` z shadcn/ui, ikonografia `lucide-react`.
- Obsługiwane interakcje: `onChange(theme)`.
- Walidacja: ograniczenie do `light|dark`.
- Typy: `ThemeOption`, `ThemeSelectorProps`.
- Propsy: `{ options: ThemeOption[]; value: UiTheme; disabled: boolean; onChange: (theme: UiTheme) => void; }`.

### ThemePreview

- Opis: Podgląd motywu przedstawiający fragment UI z bieżącą selekcją (np. karta, przyciski).
- Główne elementy: `<section>` z klasami Tailwind generowanymi w oparciu o `UiTheme`.
- Obsługiwane interakcje: brak bezpośrednich; reaguje na propsy.
- Walidacja: brak.
- Typy: `ThemePreviewProps`.
- Propsy: `{ theme: UiTheme; languageLabel: string; }`.

### FormActions

- Opis: Przyciski `Zapisz`, `Anuluj` (opcjonalnie reset do wartości oryginalnych).
- Główne elementy: `<div>` z buttonami shadcn/ui.
- Obsługiwane interakcje: `onSubmit` (domyślne wysłanie form), `onReset`.
- Walidacja: przycisk `Zapisz` disabled, gdy brak zmian lub formularz niepoprawny.
- Typy: `FormActionsProps`.
- Propsy: `{ isDirty: boolean; isSubmitting: boolean; onReset?: () => void; }`.

### PreferenceSummary

- Opis: Sekcja informacyjna wyświetlająca ID profilu, datę utworzenia/aktualizacji, opis funkcji.
- Główne elementy: `<aside>` lub `<dl>`.
- Obsługiwane interakcje: brak.
- Walidacja: formatowanie dat ISO -> lokalna prezentacja (np. `Intl.DateTimeFormat`).
- Typy: `PreferenceSummaryProps`.
- Propsy: `{ createdAt: string; updatedAt: string; profileId: string; }`.

### ProfileSkeleton

- Opis: Placeholder w trakcie ładowania danych.
- Główne elementy: `Skeleton` komponenty z shadcn/ui.
- Obsługiwane interakcje: brak.
- Walidacja: brak.
- Typy: `ProfileSkeletonProps` (opcjonalnie `count`).
- Propsy: `{}` lub brak.

### ProfileErrorFallback

- Opis: Sekcja błędu z przyciskiem ponów i komunikatem w zależności od kodu.
- Główne elementy: `Alert` (shadcn/ui), `Retry` button.
- Obsługiwane interakcje: `onRetry`.
- Walidacja: brak.
- Typy: `ProfileError`, `ProfileErrorFallbackProps`.
- Propsy: `{ error: ProfileError; onRetry: () => void; }`.

## 5. Typy

- `ProfileViewModel`:
  - `id: string`
  - `languageCode: string` (ISO, np. `"pl"`)
  - `theme: UiTheme`
  - `createdAt: string`
  - `updatedAt: string`
- `ProfileState` (union):
  - `{ status: "loading" }`
  - `{ status: "error"; error: ProfileError }`
  - `{ status: "ready"; data: ProfileViewModel; isDirty: boolean; isSaving: boolean; fieldErrors?: ProfileFormErrors }`
- `ProfileFormValues`:
  - `languageCode: string`
  - `theme: UiTheme`
- `ProfileFormErrors`:
  - `languageCode?: string`
  - `theme?: string`
  - `global?: string`
- `ProfileUpdatePayload` (wysyłka PUT):
  - `language_code?: string`
  - `theme?: UiTheme`
- `LanguageOption`:
  - `code: string`
  - `label: string` (np. „Polski”)
  - `nativeLabel?: string`
- `ThemeOption`:
  - `value: UiTheme`
  - `label: string`
  - `icon: ReactNode`
- `ProfileError`:
  - `code: ApiErrorResponse["error"]["code"]`
  - `message: string`
  - `fieldErrors?: ProfileFormErrors`

## 6. Zarządzanie stanem

- Globalne konteksty:
  - `ThemeProvider`: aktualizacja motywu przy zmianie `theme`.
  - `I18nProvider` / `LanguageContext`: aktualizacja języka i wymuszenie re-render UI (przekazanie `languageCode`).
- Lokalne stany w `ProfilePage` / `ProfileForm`:
  - `profileState` zarządzające `status`, `data`, `isDirty`, `isSaving`.
  - `formValues` kontrolujące elementy formularza.
- Custom hooki:
  - `useProfilePreferences()`:
    - Fetch GET `/api/profile`, mapuje do `ProfileViewModel`, zarządza `status`.
    - Zwraca `{ state, refetch }`.
  - `useUpdateProfile()`:
    - Zapewnia funkcję `mutate(payload)` z obsługą optimistic update (aktualizacja kontekstu i revert w razie błędu).
- Integracja z preview:
  - `useEffect` w `ProfilePage` do aktualizacji kontekstów przy zmianie `formValues` (optimistic), a w `catch` przy błędzie – rollback do poprzednich wartości.

## 7. Integracja API

- GET `/api/profile`:
  - Żądanie wykonywane w `useProfilePreferences` podczas montowania; oczekuje `ApiItemResponse<ProfileDto>`.
  - Mapowanie `data` na `ProfileViewModel`.
  - Obsługa błędów:
    - 401/403: trigger przekierowanie do logowania lub toast z komunikatem, `ProfileErrorFallback`.
    - 404: wyświetlenie komunikatu „Profil nie został jeszcze utworzony” + opcja ponów (można spróbować utworzyć fallback).
    - Inne: `NotificationCenter` z komunikatem ogólnym.
- PUT `/api/profile`:
  - Payload budowany z różnic: wysyłamy tylko pola zmienione.
  - Odpowiedź sukces `ApiItemResponse<ProfileDto>` aktualizuje stan formularza i konteksty.
  - Obsługa błędów: `ValidationError` (field errors), `Unauthorized`, `Forbidden`, `InternalError`.
- Dodatkowe: po sukcesie emisja toast (`NotificationCenter.showSuccess("Preferencje zapisane")`).

## 8. Interakcje użytkownika

- Wejście na stronę: widok ładuje dane, pokazuje skeleton → wypełniony formularz.
- Zmiana języka: natychmiast aktualizuje `LanguageContext` i UI (np. topbar). Pozostaje w stanie `dirty`.
- Zmiana motywu: natychmiast zmienia `ThemeProvider` oraz podgląd.
- Kliknięcie `Zapisz`: wywołuje PUT; podczas zapisów przycisk disabled, spinner w przycisku.
- Kliknięcie `Anuluj`/`Resetuj`: przywraca `formValues` do `ProfileViewModel`.
- Błąd walidacji: komunikaty inline + toast błędu.
- Błąd sieci/API: `NotificationCenter` (toast) + `ProfileErrorFallback` (dla GET) lub reset kontekstu do poprzednich wartości (dla PUT).

## 9. Warunki i walidacja

- Formularz zapewnia:
  - Wartości języka z listy (`ISO_LANGUAGE_CODE_REGEX`), UI nie pozwala na dowolny input.
  - Wartości motywu tylko `light` lub `dark`.
  - Co najmniej jedna zmiana względem oryginału przed wysyłką (inaczej blokada przycisku `Zapisz`).
- API refine („at least one field”) – komponent wysyła tylko zmienione pola, więc warunek spełniony.
- W przypadku błędów walidacji z API (`field_errors`), mapujemy je do kontrolek (`language_code` → `LanguageSelector`, `theme` → `ThemeSelector`).

## 10. Obsługa błędów

- 400 `ValidationError`: wyświetlenie inline + toast z message; nie resetujemy zmian, pozwalamy poprawić.
- 401/403: toast + przekierowanie/wezwanie do ponownego logowania (do ustalenia z auth flow); `ProfileErrorFallback` z CTA „Przejdź do logowania”.
- 404: informacja, że profil nie istnieje; CTA „Utwórz profil” lub `Zapisz`, który stworzy rekord (PUT zwróci 404? – zespół backend potwierdza, czy autokreacja). Tymczasowo – blokujemy formularz i oferujemy ponowienie.
- 500/Upstream: toast „Wystąpił nieoczekiwany błąd” + logi konsolowe dla dev; utrzymanie stanu zmian.
- Timeout/Fetch error: `NotificationCenter` + możliwość ponowienia.
- Optimistic update: jeśli PUT się nie powiedzie, cofamy zmiany w Theme/Language contextach i pokazujemy toast.

## 11. Kroki implementacji

1. Utwórz stronę `src/pages/profile.astro` z hydratowanym komponentem `ProfilePage`, zapewniając SSR guard (tylko zalogowani).
2. Dodaj context dostępu do Supabase/Auth (jeśli brak) i zapewnij przekazywanie do `ProfilePage`.
3. Zaimplementuj hook `useProfilePreferences` w `src/lib/hooks/useProfilePreferences.ts` (fetch + mapowanie + obsługa błędów).
4. Zaimplementuj hook `useUpdateProfile` w `src/lib/hooks/useUpdateProfile.ts` (PUT + optimistic update + mapowanie błędów).
5. Stwórz folder `src/components/profile/` i zaimplementuj komponenty: `ProfilePage`, `ProfileContent`, `ProfileForm`, `LanguageSelector`, `ThemeSelector`, `ThemePreview`, `PreferenceSummary`, `ProfileSkeleton`, `ProfileErrorFallback`, `FormActions`.
6. W `ProfilePage` zintegruj hooki, obsłuż przekazywanie `NotificationCenter` (np. `NotificationCenter.showSuccess/Error`).
7. Zapewnij aktualizację `ThemeProvider` i `LanguageContext` – dodaj helper `applyPreferencesToContext` oraz mechanizm rollback w razie błędu.
8. Dodaj mapping błędów walidacji (`field_errors`) na kontrolki i toasty.
9. Zaimplementuj testy manualne / e2e check-listę z pliku `.ai/testing/profiles-manual-tests.md` (sekcja preferencje), aktualizując w razie potrzeby.
10. Zweryfikuj linter/format, uruchom `npm run lint` i manualnie przetestuj scenariusze: sukces, brak zmian, walidacja błędna, 500, 401.
