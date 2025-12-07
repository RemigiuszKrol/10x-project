# Architektura UI dla PlantsPlaner

## 1. Przegląd struktury UI

Interfejs PlantsPlaner składa się z wąsko zdefiniowanych obszarów funkcjonalnych: uwierzytelniania, zarządzania profilami, zarządzania planami oraz pełnoekranowego edytora planu zintegrowanego z danymi pogodowymi i AI. Globalny topbar zapewnia nawigację pomiędzy listą planów i profilem oraz dostęp do stanu sesji. Edytor planu wykorzystuje widok siatki zajmujący całą szerokość obszaru roboczego, kontekstowy boczny drawer z parametrami planu i sekcjami operacyjnymi oraz dolny panel statusu dla komunikatów, postępu zapytań AI i informacji o pogodzie. Zarządzanie stanem realizowane jest przez React Query (synchronizacja zasobów API) uzupełnione lekkim kontekstem edytora przechowującym lokalne preferencje (tryb zaznaczania, rozmiar komórek, filtrowanie roślin). Wszystkie widoki spełniają WCAG 2.1 AA, wykorzystują komponenty shadcn/ui z rozszerzoną obsługą fokusu, aria-live dla komunikatów i jasnym sygnalizowaniem skutków krytycznych operacji.

## 2. Lista widoków

### Widok: Logowanie

- Ścieżka widoku: `/auth/login`
- Główny cel: Umożliwić użytkownikom zalogowanie się przy użyciu e-maila i hasła.
- Kluczowe informacje do wyświetlenia: pola `email`, `password`, komunikaty błędów walidacji i serwera, link do odzyskania hasła.
- Kluczowe komponenty widoku: formularz logowania, przycisk zaloguj (disabled podczas wysyłki), komunikaty błędów typu toast oraz aria-live region dla błędów.
- UX, dostępność i względy bezpieczeństwa: wymuszenie focusu na pierwszym polu, maskowanie hasła, komunikaty błędów po polsku, obsługa 401/422 inline, wsparcie klawiatury, zabezpieczenie przed brute force poprzez informację o limitach (UI) i blokada kopiowania tokenów.

### Widok: Rejestracja

- Ścieżka widoku: `/auth/register`
- Główny cel: Pozwolić nowym użytkownikom założyć konto.
- Kluczowe informacje do wyświetlenia: pola `email`, `password`, `passwordConfirm`, walidacje formatów, informacje o podstawowych zasadach haseł i polityce prywatności.
- Kluczowe komponenty widoku: wielopolowy formularz, checkbox akceptacji regulaminu, komunikaty walidacyjne inline, toast sukcesu, link do logowania.
- UX, dostępność i względy bezpieczeństwa: informowanie o wymaganiach hasła przed wysyłką, aria-describedBy dla walidacji, minimalizacja błędów dzięki potwierdzeniu hasła, sanitizacja wejścia, obsługa błędów 409 (email zajęty) w postaci bannera.

### Widok: Potwierdzenie e-mail (opcjonalny przepływ Supabase)

- Ścieżka widoku: `/auth/confirm`
- Główny cel: Obsługa przekierowania po linku aktywacyjnym lub otwarciu aplikacji z tokenem.
- Kluczowe informacje do wyświetlenia: status potwierdzenia, spinner, przyciski powrotu do logowania lub listy planów.
- Kluczowe komponenty widoku: sekcja stanu z ikoną, logika automatycznego przekierowania.
- UX, dostępność i względy bezpieczeństwa: aria-live polite dla statusu, fallback manualnego odświeżenia, komunikaty o błędach tokenu lub wygaśnięciu.

### Widok: Lista planów

- Ścieżka widoku: `/plans`
- Główny cel: Wyświetlić listę planów użytkownika i wejście do edytora.
- Kluczowe informacje do wyświetlenia: nazwa planu, lokalizacja (adres/koordynaty), data modyfikacji, skrócone statystyki (liczba roślin), status danych pogodowych (ostatnie odświeżenie), CTA do edycji i usunięcia.
- Kluczowe komponenty widoku: tabela planów, przycisk „Nowy plan”, modal potwierdzenia usunięcia, wskaźnik ładowania, paginacja if needed.
- UX, dostępność i względy bezpieczeństwa: rola `main`, sortowanie po `updated_at`, filtry tekstowe, potwierdzenie usunięcia z informacją o konsekwencjach, integracja z React Query (GET `/api/plans`), fallback offline (pokazanie szkicu zapisanych progresów), aria-labels dla ikon akcji.

### Widok: Kreator nowego planu

- Ścieżka widoku: `/plans/new`
- Główny cel: Przeprowadzić użytkownika przez etapowe utworzenie planu przed finalnym zapisem.
- Kluczowe informacje do wyświetlenia: postęp kroków, pola nazwy, lokalizacji (mapa i wyszukiwarka), wymiary działki, jednostka kratki, orientacja, półkula, podsumowanie.
- Kluczowe komponenty widoku: komponent Stepper, formularze krokowe, mapa Leaflet, mini-kompas, walidacje w czasie rzeczywistym, przycisk zapisz szkic (lokalnie/IndexedDB), przycisk kontynuuj.
- UX, dostępność i względy bezpieczeństwa: możliwość zapisu i wznowienia szkicu (local storage + ostrzeżenie), walidacje limitu siatki (komunikat 200×200), confirm dialog przed finalnym POST, informacja o braku cofania, aria-live dla błędów geokodowania, blokada przejścia bez spełnienia wymagań.

### Widok: Edytor planu – Siatka

- Ścieżka widoku: `/plans/:id`
- Główny cel: Umożliwić edycję planu: typowanie obszarów, dodawanie roślin, przegląd danych pogodowych i parametrów.
- Kluczowe informacje do wyświetlenia: reprezentacja siatki, typy pól, zaznaczenie obszarów, informacje o wybranej komórce, lista roślin, status AI i pogody.
- Kluczowe komponenty widoku: pełnoekranowa siatka (canvas/grid layout), boczny drawer z zakładkami (`Parametry`, `Rośliny`, `Pogoda`), toolbar kontekstowy (wybór narzędzia: zaznacz, dodaj roślinę, zmień typ), panel dolny z logiem operacji, moduł toasts, modale potwierdzeń (409), tooltip brak cofania.
- UX, dostępność i względy bezpieczeństwa: obsługa klawiatury dla nawigacji po siatce, aria rola `application`, focus ring dla aktualnej komórki, ostrzeżenia przed operacjami destrukcyjnymi, brak zoomu – dynamiczne skalowanie komórek, pionowy scroll dla mniejszych ekranów, tryb wysokiego kontrastu, automatyczne wysyłanie zdarzeń analitycznych (hook) przy `grid_saved`, `area_typed`, `plant_confirmed`.

### Podwidok edytora: Drawer „Parametry planu”

- Ścieżka (komponent w `/plans/:id`)
- Główny cel: Edycja parametrów planu (nazwa, orientacja, półkula, jednostki) z kontrolą wpływu na siatkę.
- Kluczowe informacje do wyświetlenia: formularz parametrów, ostrzeżenia o wpływie zmian, podsumowanie rozmiarów siatki, przycisk zapisz.
- Kluczowe komponenty widoku: formularze z walidacją, sekcja ostrzeżeń, modal potwierdzający regenerację siatki (obsługa 409), nagłówek z datą ostatniej aktualizacji planu.
- UX, dostępność i względy bezpieczeństwa: guard clause zapobiegający utracie danych bez potwierdzenia, aria-live dla komunikatów walidacji, focus trap w modalach, integracja z PATCH `/api/plans/:id` z parametrem `confirm_regenerate`.

### Podwidok edytora: Drawer „Rośliny”

- Ścieżka (komponent w `/plans/:id`)
- Główny cel: Zarządzanie roślinami przypisanymi do komórek oraz wywołania AI.
- Kluczowe informacje do wyświetlenia: lista roślin w planie, wyszukiwarka, szczegóły zaznaczonej komórki (status `soil`/occupied), wyniki dopasowania AI (scores), historia działań.
- Kluczowe komponenty widoku: lista/panel roślin (React Query GET `/plants`), formularz dodania/edycji rośliny, modale potwierdzeń, integracja z AI (przycisk „Sprawdź dopasowanie”, spinner, fallback toast przy timeout 10 s).
- UX, dostępność i względy bezpieczeństwa: blokada dodania rośliny na nie-soil (422) z komunikatem aria-live, możliwość filtrowania listy roślin, przechowywanie ostatnich wyników AI, informowanie o sanitize JSON (US-027), logowanie zdarzeń analitycznych.

### Podwidok edytora: Drawer „Pogoda”

- Ścieżka (komponent w `/plans/:id`)
- Główny cel: Prezentacja danych pogodowych i ręczne odświeżanie cache.
- Kluczowe informacje do wyświetlenia: tabela/miesięczny wykres metryk (nasłonecznienie, wilgotność, opady), data ostatniego odświeżenia, status półkuli i wag sezonowych.
- Kluczowe komponenty widoku: karty z metrykami, wykres trendu, przycisk „Odśwież dane” (POST `/weather/refresh` via backend proxy), status ładowania i ograniczenia limitów.
- UX, dostępność i względy bezpieczeństwa: aria-live polite dla statusów, potwierdzenie odświeżenia przy ograniczeniach (429), informacja o degradacji gdy dane niedostępne (US-019), zabezpieczenie przy błędach upstream (504) z możliwością ponowienia.

### Widok: Profil użytkownika

- Ścieżka widoku: `/profile`
- Główny cel: Umożliwić aktualizację preferencji motywu kolorystycznego.
- Kluczowe informacje do wyświetlenia: aktualne preferencje, tryby motywu, ostatnia aktualizacja.
- Kluczowe komponenty widoku: formularz z przełącznikami (radio/select), przycisk zapisz, podgląd motywu.
- UX, dostępność i względy bezpieczeństwa: natychmiastowe zastosowanie motywu (preview), informacja o zapisie i fallbacku przy błędach (toast), integracja z GET/PUT `/api/profile`.

### Widok: Globalny modal odnowienia sesji

- Ścieżka: overlay dostępny w dowolnym widoku
- Główny cel: Informować o utracie sesji Supabase i wymuszać ponowne zalogowanie bez utraty danych.
- Kluczowe informacje do wyświetlenia: komunikat o wylogowaniu, countdown/informacja o utrzymaniu stanu szkicu, przyciski „Zaloguj ponownie” i „Wyloguj”.
- Kluczowe komponenty widoku: modal z focus trapem, integracja z listenerem stanu sesji, formularz logowania inline.
- UX, dostępność i względy bezpieczeństwa: aria-modal true, klawisz Escape, zapobieganie interakcjom w tle, ochrona danych formularzy przed utratą.

## 3. Mapa podróży użytkownika

1. Użytkownik odwiedza `/auth/login` lub `/auth/register` w zależności od stanu konta. Po pomyślnym uwierzytelnieniu następuje przekierowanie na `/plans`.
2. W widoku listy planów użytkownik może przeglądać istniejące plany lub wybrać „Nowy plan”. Usunięcie planu wymaga potwierdzenia w modalnym dialogu. Lista pobiera dane z GET `/api/plans` i reaguje na zmiany przez React Query.
3. Wybierając „Nowy plan”, użytkownik trafia do kreatora `/plans/new`. Kreator prowadzi przez kroki: (a) Nazwa i lokalizacja (wyszukiwarka + mapa), (b) Wymiary i jednostka siatki (walidacja limitu 200×200), (c) Orientacja i półkula (mini-kompas, automatycznie na podstawie lokalizacji), (d) Podsumowanie. Każdy krok zapisuje szkic lokalnie i umożliwia powrót. Na koniec użytkownik potwierdza utworzenie planu, co wywołuje POST `/api/plans` i event `plan_created`. Po sukcesie następuje przekierowanie do edytora `/plans/:id`.
4. W edytorze domyślnie otwierana jest zakładka „Siatka”. Użytkownik może zaznaczać obszary i zmieniać typy pól (POST `/grid/area-type`, PUT `/grid/cells/:x/:y`). Gdy operacja wymaga usunięcia roślin, pojawia się modal 409 z potwierdzeniem (US-010, US-031). Zapis siatki uruchamia `grid_saved`. Drawer „Rośliny” umożliwia dodawanie roślin do komórek typu `soil` (PUT `/plants/:x/:y`), wyszukiwanie gatunków (POST `/ai/plants/search`) oraz ocenę dopasowania (POST `/ai/plants/fit`). Wyniki są prezentowane wraz z oceną i zapisywane po akceptacji (`plant_confirmed`). Błędy AI (timeout, niezgodny JSON) są obsługiwane przez toasty i komunikaty inline z opcją ponowienia lub możliwością pominięcia tego kroku (US-027, US-028).
5. Drawer „Pogoda” prezentuje dane z GET `/weather`. Użytkownik może zainicjować odświeżenie (POST `/weather/refresh` przez serwer). Błędy API (np. 504) nie blokują edytora i są sygnalizowane w panelu statusu (US-019). Zmiany parametrów planu w drawerze „Parametry” wykonują PATCH `/plans/:id`, a w razie wymaganej regeneracji siatki UI pokazuje modal potwierdzenia, po czym ponownie pobiera dane siatki i roślin.
6. Użytkownik może przejść do widoku profilu `/profile` z topbaru, gdzie aktualizuje preferencje motywu (PUT `/api/profile`). Po zapisie motyw stosuje się natychmiast, a sukces potwierdza toast.
7. W dowolnym momencie utrata sesji wywołuje globalny modal proszący o ponowne logowanie. Użytkownik loguje się bez opuszczania bieżącego stanu; po sukcesie odświeżane są zapytania React Query.

## 4. Układ i struktura nawigacji

- Topbar (sticky): logo/brand, przyciski nawigacyjne (`Plany`, `Profil`), wskaźnik stanu sesji (avatar z menu rozwijanym: „Wyloguj”) oraz przycisk dodania planu (CTA w prawym rogu).
- Widoki auth działają bez topbaru, aby skupić uwagę na formularzach.
- Edytor planu posiada układ trójstrefowy: topbar globalny, centralna siatka (wypełnia viewport), prawy drawer kontekstowy (parametry/rośliny/pogoda) oraz dolny panel statusu (postęp operacji, log zdarzeń, aria-live). Drawer można zwijać, ale nie zasłania siatki dzięki overlay w stylu push.
- Nawigacja między krokami kreatora realizowana jest przez Stepper z możliwością powrotu i skipu tylko po spełnieniu walidacji. Główne CTA („Zapisz plan”, „Przejdź do edytora”) znajdują się w dolnym barze kroku.
- Widok profilu dziedziczy topbar i używa układu dwukolumnowego (formularz + podgląd motywu), zachowując responsywność (kolumny przechodzą w pion poniżej 1024 px).

## 5. Kluczowe komponenty

- `TopbarNavigation`: stały pasek nawigacji z obsługą motywu i stanu sesji.
- `SessionWatcherModal`: globalny modal reagujący na utratę sesji Supabase, zapewniający szybkie ponowne logowanie.
- `PlansList`: komponent listy/kafelków planów z integracją React Query i akcjami (edytuj, usuń, otwórz).
- `PlanWizard`: krokowy kreator z lokalnym zapisem szkicu i integracją mapy, walidacją limitów siatki oraz finalnym zapisem.
- `GardenGrid`: wizualizacja siatki planu z interakcjami (zaznaczanie, przypisywanie typów, highlight komórek, focus management).
- `EditorToolbar`: zestaw narzędzi edytora (wybór trybu, cofnij niedostępne z tooltipem, zapis siatki, status AI/pogody).
- `PlanSettingsDrawer`: formularze parametrów planu z logiką potwierdzania zmian i komunikatami 409.
- `PlantsDrawer`: panel zarządzania roślinami, integracja z wyszukiwaniem AI, listą roślin, ocenami i potwierdzeniami zapisu.
- `WeatherDrawer`: sekcja prezentująca dane pogodowe, wykresy oraz przycisk odświeżenia z obsługą limitów.
- `AnalyticsHook`: hook do automatycznego wysyłania zdarzeń `plan_created`, `grid_saved`, `area_typed`, `plant_confirmed` w odpowiednich momentach interakcji.
- `NotificationCenter`: zunifikowane toasty, bannery i aria-live do obsługi błędów (409, 422, 504) i sukcesów.
