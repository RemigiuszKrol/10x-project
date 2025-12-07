# Dokument wymagań produktu (PRD) - PlantsPlaner

## 1. Przegląd produktu

PlantsPlaner to aplikacja webowa (desktop, obsługa myszy) wspierająca planowanie i ocenę rozmieszczenia roślin w ogrodzie. MVP umożliwia użytkownikom tworzenie planu działki na siatce, ustawienie orientacji i lokalizacji, wprowadzanie typów powierzchni, dodawanie roślin (zasada: 1 roślina = 1 pole) oraz wykorzystanie danych pogodowych (Open‑Meteo) i AI do oceny dopasowania roślin do lokalnych warunków. Aplikacja posiada proste konta użytkowników (e‑mail/hasło), stronę profilu (preferencje motywu kolorystycznego) i minimalistyczną analitykę (4 zdarzenia).

Założone persony: użytkownicy indywidualni planujący ogród przydomowy oraz projektanci zieleni oczekujący prostego, szybkiego narzędzia do weryfikacji koncepcji.

Słownik pojęć (MVP):

- Plan działki: zapis konfiguracji siatki (wymiary, jednostka kratki), lokalizacji (geokodowanie), orientacji (0–359°), typów pól oraz rozmieszczenia roślin.
- Kratka/pole: najmniejsza jednostka siatki planu, o boku 10/25/50/100 cm.
- Typ pola: ziemia, ścieżka, woda, zabudowa, pola niedostępne, roślina
- Orientacja działki: kąt względem północy geograficznej (0–359°), ustawiany przez użytkownika (mini‑kompas).
- Nasłonecznienie (metryka): połączenie shortwave_radiation i sunshine_duration z Open‑Meteo, znormalizowane do wspólnej skali.

Zależności zewnętrzne: Leaflet.js + OpenStreetMap (mapy, geokodowanie – darmowe), Open‑Meteo (pogoda), usługa AI (LLM, odpowiedź w stałym JSON), lokalna baza danych aplikacji (plany, użytkownicy, analityka).

Założenia i ograniczenia MVP:

- Brak mechanizmu cofania/warstw/drag&drop.
- Limit siatki: maks. 200 × 200 pól.
- Uwierzytelnianie: e‑mail/hasło, bez weryfikacji e‑mail.
- Cache danych pogodowych: miesięczny per plan.
- AI: timeout 10 s, twardy schemat JSON, sanity‑check po stronie aplikacji.

## 2. Problem użytkownika

Planowanie ogrodu wymaga znajomości warunków lokalnych i potrzeb roślin. Dobór gatunków i ich rozmieszczenie jest trudny z uwagi na zmienność pogody, nasłonecznienia, wilgotności i opadów oraz ograniczenia przestrzenne działki. Użytkownicy potrzebują prostego narzędzia, które łączy kontekst lokalizacji (mapy + pogoda), jasny edytor siatki oraz inteligentne podpowiedzi AI, by szybko sprawdzić, czy dana roślina ma szansę dobrze rosnąć w konkretnym miejscu działki i jak ją optymalnie umiejscowić.

## 3. Wymagania funkcjonalne

3.1 Uwierzytelnianie i konto

- Rejestracja i logowanie e‑mail/hasło (bez weryfikacji e‑mail).
- Wylogowanie z sesji.
- Strona profilu: zapis preferencji motywu kolorystycznego.
- Odzyskiwanie hasła (działa podobnie jak potwierdzenie konta - przez e-mail).

  3.2 Plany działki (CRUD w zakresie tworzenia/odczytu/edycji)

- Utworzenie planu: nazwa, lokalizacja (geokodowanie), orientacja (0–359°), wymiary rzeczywiste działki, jednostka kratki (10/25/50/100 cm), limit 200 × 200 pól.
- Generowanie siatki na podstawie wymiarów i jednostki.
- Edycja siatki: zaznaczanie obszaru i przypisywanie typu pól (ziemia/ścieżka/woda/zabudowa).
- Zmiana typu pola/obszaru z potwierdzeniem, jeśli usunie to rośliny z danego obszaru.
- Zapis stanu planu i siatki.

  3.3 Rośliny

- Dodawanie rośliny do pojedynczego pola (1 roślina = 1 pole); tylko na polu typu ziemia.
- Usuwanie rośliny z pola.
- Blokada dodawania roślin do pól innych niż ziemia, z czytelnym komunikatem.

  3.4 Lokalizacja i mapy

- Leaflet.js + OpenStreetMap do prezentacji mapy i darmowego geokodowania.
- Ustawianie pinezki lokalizacji działki; informacja o możliwej niskiej dokładności.

  3.5 Dane pogodowe (Open‑Meteo)

- Jednorazowe pobranie danych pogodowych po ustawieniu lokalizacji lub przy pierwszym uruchomieniu AI dla planu.
- Cache miesięczny per plan; odświeżanie po upływie miesiąca.
- Mapowanie zmiennych: nasłonecznienie = shortwave_radiation + sunshine_duration, wilgotność = relative_humidity_2m, opady = precipitation_sum, temperatura = średnia temperatura dzienna; normalizacja do wspólnej skali porównawczej.

  3.6 AI (wyszukiwanie i ocena dopasowania)

- Wyszukiwanie roślin po nazwie z potwierdzeniem wyboru przez użytkownika.
- Odpowiedź AI wyłącznie w stałym schemacie JSON; sanity‑check formatu i wartości po stronie aplikacji.
- Scoring parametrów 1–5 z progami: ≥90 = 5, 80–89 = 4, 70–79 = 3, 60–69 = 2, <60 = 1. Parametry oceny: nasłonecznienie, wilgotność, opady, temperatura.
- Średnia ważona miesięcy: IV–IX waga 2, pozostałe 1; automatyczne dostosowanie do półkuli; możliwość ręcznej korekty sezonu.
- Timeout 10 s; po przekroczeniu czytelny błąd i opcja ponowienia.

  3.7 Analityka

- Zapis do bazy wyłącznie 4 zdarzeń: plan_created, grid_saved, area_typed, plant_confirmed.
- Wykorzystanie zdarzeń do analizy lejka i KPI.

  3.8 Niefunkcjonalne

- Wydajność do 200 × 200 pól; operacje na obszarach muszą być responsywne.
- Dostępność: czytelne kontrasty, fokusy, komunikaty o błędach; nawigacja myszą.
- Obsługa błędów: czytelne komunikaty, możliwość ponowienia operacji (AI, pogoda, geokodowanie).
- Bezpieczeństwo: sesje użytkowników, podstawowe hasła; brak weryfikacji e‑mail w MVP; resetu i odzyskiwanie hasła działa podobnie jak potwierdzenie konta.

  3.9 Dane i model (wysoki poziom)

- User: e‑mail, hasz hasła, preferencje (motyw).
- Plan: userId, nazwa, lokalizacja (współrzędne, adres), orientacja (0–359°), wymiary, jednostka kratki, siatka, rośliny.
- GridCell: typ pola, opcjonalnie roślina.
- PlantPlacement: identyfikator rośliny/nazwa, wynik AI, daty.
- WeatherCache: dane miesięczne per plan (ostatnia aktualizacja).
- AnalyticsEvent: typ, planId, userId, timestamp, atrybuty minimalne.

## 4. Granice produktu

Poza zakresem MVP:

- Współdzielenie planów działki.
- Tworzenie wewnętrznej bazy wymagań hodowlanych roślin.
- Zaawansowany asystent przesadzania roślin.
- Asystent planów pielęgnacji w ciągu roku.
- Drag&drop, cofanie, warstwy edycji.
- Polityka złożoności haseł, CAPTCHA.

Ograniczenia i decyzje świadome:

- Limit siatki 200 × 200.
- Minimalistyczna analityka (4 zdarzenia).
- Leaflet + OSM i Open‑Meteo mogą mieć ograniczenia dostępności; w razie braku danych degradacja z komunikatem.

Ryzyka i kwestie otwarte (do doprecyzowania):

- Polityka bezpieczeństwa logowania (złożoność haseł, rate‑limiting, CAPTCHA).
- Dokładna funkcja normalizacji i jednostki dla metryki nasłonecznienia (ujednolicenie shortwave_radiation i sunshine_duration).
- Zarządzanie limitami/dostępnością dostawców (progi, czasy cache, fallbacki).
- Czy dodać eventy analityczne dla AI‑usage (np. ai_result_viewed) poza MVP.

## 5. Historyjki użytkowników

US-001
Tytuł: Rejestracja konta e‑mail/hasło
Opis: Jako nowy użytkownik chcę założyć konto, aby zapisywać swoje plany.
Kryteria akceptacji:

- Rejestracja odbywają się na dedykowanych stronach.
- Formularz przyjmuje e‑mail i hasło; walidacja formatu e‑mail.
- Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
- Utworzenie konta zapisuje użytkownika w bazie; loguje po sukcesie.
- Błędy (e‑mail zajęty, brak sieci) wyświetlają komunikat i nie tworzą konta.

US-002
Tytuł: Logowanie do aplikacji
Opis: Jako użytkownik chcę się zalogować, aby uzyskać dostęp do swoich planów.
Kryteria akceptacji:

- Logowanie odbywają się na dedykowanych stronach.
- Formularz e‑mail/hasło; błędne dane zwracają komunikat.
- Po zalogowaniu widoczna jest lista moich planów.
- Sesja trwa między odsłonami przeglądarki do wylogowania.
- Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
- Odzyskiwanie hasła działa podobnie jak potwierdzenie konta - przez e-mail z linkiem resetującym.

US-003
Tytuł: Wylogowanie
Opis: Jako użytkownik chcę się wylogować, aby zakończyć sesję.
Kryteria akceptacji:

- Akcja wyloguj czyści sesję i przenosi do ekranu logowania.

US-004
Tytuł: Ustawienia profilu (motyw)
Opis: Jako użytkownik chcę ustawić motyw kolorystyczny.
Kryteria akceptacji:

- Formularz zapisuje motyw do profilu użytkownika.
- Zmiana stosuje się natychmiast w UI i po ponownym zalogowaniu.

US-005
Tytuł: Utworzenie nowego planu
Opis: Jako użytkownik chcę utworzyć plan działki, aby rozpocząć pracę.
Kryteria akceptacji:

- Pole nazwy planu jest wymagane.
- Ustawienie lokalizacji przez wyszukiwarkę/geokodowanie lub wskazanie na mapie.
- Zapis planu tworzy rekord i generuje zdarzenie plan_created.

US-006
Tytuł: Ustawienie orientacji działki
Opis: Jako użytkownik chcę ustawić orientację działki w stopniach.
Kryteria akceptacji:

- Input 0–359° z mini‑kompasem; zapis z dokładnością 1° w planie.
- Zmiana orientacji jest widoczna w podglądzie i zapisywana.

US-007
Tytuł: Definicja wymiarów i jednostki siatki
Opis: Jako użytkownik chcę określić wymiary działki i rozmiar kratki.
Kryteria akceptacji:

- Jednostka kratki: 10/25/50/100 cm; walidacja, by siatka nie przekroczyła 200 × 200.
- Generacja siatki na podstawie danych; błędy walidacji z komunikatem.

US-008
Tytuł: Zapis siatki planu
Opis: Jako użytkownik chcę zapisać wygenerowaną siatkę.
Kryteria akceptacji:

- Zapis utrwala siatkę i parametry planu.
- Emisja zdarzenia grid_saved przy sukcesie.

US-009
Tytuł: Zaznaczanie obszaru i przypisywanie typu pól
Opis: Jako użytkownik chcę zaznaczyć prostokątny obszar siatki i nadać mu typ.
Kryteria akceptacji:

- Dostępne typy: ziemia/ścieżka/woda/zabudowa.
- Po przypisaniu typ jest widoczny na siatce.
- Zdarzenie area_typed rejestrowane przy zatwierdzeniu operacji.

US-010
Tytuł: Potwierdzenie usunięcia roślin przy zmianie typu
Opis: Jako użytkownik chcę być ostrzeżony, że zmiana typu usunie rośliny.
Kryteria akceptacji:

- Jeśli w obszarze są rośliny, aplikacja prosi o potwierdzenie.
- Potwierdzenie usuwa rośliny i zmienia typ; anulowanie przerywa operację.

US-011
Tytuł: Dodanie rośliny do pola ziemi
Opis: Jako użytkownik chcę dodać roślinę do konkretnego pola ziemi.
Kryteria akceptacji:

- Kliknięcie pola ziemi uruchamia dodawanie rośliny.
- Jedno pole może zawierać maksymalnie jedną roślinę.

US-012
Tytuł: Wyszukiwanie rośliny po nazwie i potwierdzenie
Opis: Jako użytkownik chcę wyszukać roślinę po nazwie i potwierdzić wybór.
Kryteria akceptacji:

- Pole wyszukiwania z listą dopasowań; wybór wymaga potwierdzenia.
- Brak wyników prezentuje komunikat i pozwala spróbować ponownie.

US-013
Tytuł: Zapytanie do AI i kontrola formatu odpowiedzi
Opis: Jako użytkownik chcę, aby AI oceniła dopasowanie rośliny.
Kryteria akceptacji:

- Wysłanie zapytania do AI ma timeout 10 s.
- Odpowiedź musi być w stałym schemacie JSON; w razie niezgodności wyświetlany jest błąd i opcja ponowienia.

US-014
Tytuł: Obliczenie oceny dopasowania (1–5) z wagami sezonów
Opis: Jako użytkownik chcę zobaczyć ocenę dopasowania rośliny do warunków.
Kryteria akceptacji:

- Składniki: nasłonecznienie, wilgotność, opady, temperatura – każdy oceniany 1–5 (progi: ≥90=5, 80–89=4, 70–79=3, 60–69=2, <60=1).
- Średnia ważona miesięcy: IV–IX waga 2, pozostałe 1; automatyczna korekta dla półkuli.

US-015
Tytuł: Ręczna korekta sezonu/półkuli
Opis: Jako użytkownik chcę ręcznie dostosować sezonowość wag.
Kryteria akceptacji:

- Ustawienia planu pozwalają przełączyć półkulę lub zakres miesięcy ważonych.
- Zmiana natychmiast przelicza i prezentuje zaktualizowaną ocenę.

US-016
Tytuł: Zapis rośliny w polu po akceptacji
Opis: Jako użytkownik chcę zapisać roślinę w wybranym polu.
Kryteria akceptacji:

- Zatwierdzenie dodaje roślinę do pola i rejestruje plant_confirmed.
- Anulowanie nie dokonuje zmian w siatce.

US-017
Tytuł: Usunięcie rośliny z pola
Opis: Jako użytkownik chcę usunąć roślinę z pola.
Kryteria akceptacji:

- Akcja usuń jest dostępna z poziomu pola zawierającego roślinę.
- Po usunięciu pole jest puste (typ ziemia).

US-018
Tytuł: Pobranie i cache danych pogodowych
Opis: Jako użytkownik chcę, aby aplikacja automatycznie pobrała dane pogodowe dla planu.
Kryteria akceptacji:

- Dane pobierane po ustawieniu lokalizacji lub przy pierwszym użyciu AI.
- Cache miesięczny per plan; po miesiącu dane są odświeżane.

US-019
Tytuł: Obsługa braku danych pogodowych lub błędu API
Opis: Jako użytkownik chcę otrzymać czytelny komunikat i opcję ponowienia.
Kryteria akceptacji:

- W razie błędu Open‑Meteo aplikacja pokazuje komunikat i przycisk „Ponów”.
- Aplikacja degraduje się łagodnie (bez blokowania innych działań edytora).

US-020
Tytuł: Ustawienie lokalizacji na mapie
Opis: Jako użytkownik chcę wskazać lokalizację działki na mapie.
Kryteria akceptacji:

- Możliwość wyszukania adresu i/lub przesunięcia pinezki.
- Komunikat o możliwej niskiej dokładności danych mapowych.

US-021
Tytuł: Lista i otwieranie planów
Opis: Jako użytkownik chcę zobaczyć listę swoich planów i otwierać wybrane.
Kryteria akceptacji:

- Lista pokazuje nazwę planu i datę modyfikacji.
- Kliknięcie otwiera plan do edycji.

US-022
Tytuł: Edycja parametrów planu z zachowaniem spójności
Opis: Jako użytkownik chcę móc zmienić parametry planu z ostrzeżeniem o skutkach.
Kryteria akceptacji:

- Zmiana jednostki kratki lub wymiarów, która wpływa na siatkę, wymaga potwierdzenia i może usunąć rośliny.
- Po potwierdzeniu siatka regeneruje się zgodnie z nowymi parametrami.

US-023
Tytuł: Ograniczenia edytora i komunikaty
Opis: Jako użytkownik chcę jasno wiedzieć o braku cofania i warstw.
Kryteria akceptacji:

- Widoczny komunikat/tooltip informujący o braku cofania/drag&drop.
- Operacje krytyczne wymagają potwierdzenia.

US-024
Tytuł: Telemetria minimalna (4 zdarzenia)
Opis: Jako właściciel produktu chcę mierzyć postęp użytkownika w lejku.
Kryteria akceptacji:

- plan_created zapisywane przy utworzeniu planu.
- grid_saved przy zapisie siatki.
- area_typed przy przypisaniu typu obszarowi.
- plant_confirmed przy zatwierdzeniu rośliny.

US-025
Tytuł: Blokada dodania rośliny na polu nie‑ziemi
Opis: Jako użytkownik chcę jasny komunikat, że można sadzić tylko na ziemi.
Kryteria akceptacji:

- Próba dodania rośliny na ścieżce/wodzie/zabudowie wyświetla komunikat i nie dodaje rośliny.

US-026
Tytuł: Walidacja limitu siatki 200 × 200
Opis: Jako użytkownik chcę, by aplikacja nie pozwoliła przekroczyć limitu.
Kryteria akceptacji:

- Wprowadzanie wymiarów i jednostki, które dawałyby >200 × 200, jest blokowane z komunikatem.

US-027
Tytuł: Sanity‑check odpowiedzi AI (niezgodny JSON)
Opis: Jako użytkownik chcę czytelny błąd, gdy odpowiedź AI jest niepoprawna.
Kryteria akceptacji:

- Niepoprawny schemat JSON powoduje błąd i pozwala ponowić zapytanie.

US-028
Tytuł: Timeout AI i ponawianie zapytania
Opis: Jako użytkownik chcę wznowić zapytanie po przekroczeniu 10 s.
Kryteria akceptacji:

- Po 10 s aplikacja pokazuje błąd timeout i przycisk ponów.

US-029
Tytuł: Geokodowanie – wiele wyników
Opis: Jako użytkownik chcę wybrać właściwy wynik z listy.
Kryteria akceptacji:

- Lista kandydatów z adresami; wybór ustawia lokalizację planu.

US-030
Tytuł: Geokodowanie – brak wyników
Opis: Jako użytkownik chcę informację i możliwość spróbowania ponownie.
Kryteria akceptacji:

- Komunikat o braku wyników; opcja zmiany zapytania i ponowienia.

US-031
Tytuł: Zmiana jednostki kratki po dodaniu roślin
Opis: Jako użytkownik chcę świadomie potwierdzić re‑generację siatki.
Kryteria akceptacji:

- Zmiana jednostki po dodaniu roślin wymaga potwierdzenia usunięcia roślin i regeneracji siatki.

US-032
Tytuł: Bezpieczny dostęp – minimalne logowanie
Opis: Jako użytkownik chcę, by moje plany były dostępne tylko po zalogowaniu.
Kryteria akceptacji:

- Dostęp do listy planów i edytora wymaga aktywnej sesji.
- Brak sesji przekierowuje do logowania.

## 6. Metryki sukcesu

KPI (MVP):

- Odsetek użytkowników z co najmniej jednym w pełni wypełnionym planem (≥5 roślin) – cel: 90%.
- Odsetek użytkowników, którzy w ciągu roku tworzą plan i dodają ≥5 roślin – cel: 75%.

Pomiar i telemetria:

- Lejek oparty o zdarzenia: plan_created → grid_saved → area_typed → plant_confirmed.
- Agregacja liczby roślin per plan i per użytkownik do oceny spełnienia KPI.
- Częstotliwość niepowodzeń AI (timeout, zły JSON) i Open‑Meteo (błędy) monitorowana na potrzeby jakości (poza KPI).

Założenia dot. danych:

- Zdarzenia zawierają minimalne atrybuty: typ, planId, userId, timestamp.
- Dane zdarzeń i cache pogody współistnieją; retencja i prywatność zgodnie z polityką produktu.
