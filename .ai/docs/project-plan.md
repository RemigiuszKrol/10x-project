<conversation_summary>
<decisions>
Docelowa platforma: tylko desktop (strona WWW) z obsługą myszy.
Persony: użytkownicy indywidualni i projektanci przestrzeni przydomowych; narzędzie proste w użyciu.
Orientacja działki: użytkownik wskazuje północ; input 0–359° z mini-kompasem; zapis z dokładnością 1°.
Edytor siatki: limit 200×200; generowanie na podstawie wymiarów i jednostki; typy pól: ziemia/ścieżka/woda/zabudowa; zaznaczanie obszaru i wybór typu z listy; zmiana typu usuwa rośliny z potwierdzeniem; brak cofania/warstw/drag&drop.
Rośliny: zasada „1 roślina = 1 pole”.
Lokalizacja/mapy: darmowe geokodowanie Leaflet.js + OpenStreetMap
Dane pogodowe: Open‑Meteo; pojedyncze pobranie i cache miesięczny per plan; zmienne: nasłonecznienie = shortwave_radiation + sunshine_duration, wilgotność = relative_humidity_2m, opady = precipitation_sum; normalizacja do wspólnej skali.
AI: wyszukiwanie po nazwie z potwierdzeniem użytkownika; zwrot wyłącznie w stałym schemacie JSON; źródła dowolne; scoring parametrów 1–5 z progami (≥90=5, 80–89=4, 70–79=3, 60–69=2, <60=1); średnia ważona miesięcy (IV–IX waga 2, pozostałe 1) z automatycznym dostosowaniem do półkuli i możliwością ręcznej korekty; timeout 10 s – po przekroczeniu błąd i opcja ponowienia.
Uwierzytelnianie: e‑mail/hasło, bez weryfikacji e‑mail.
Analityka: tylko 4 zdarzenia w bazie: plan_created, grid_saved, area_typed, plant_confirmed.
Kryteria sukcesu (MVP): 90% użytkowników z co najmniej jednym w pełni wypełnionym planem (≥5 roślin), 75% tworzy plan i dodaje ≥5 roślin w ciągu roku.
</decisions>
<matched_recommendations>
Wprowadzenie pola „orientacja” (0–359°) z mini‑kompasem i zapisem w planie.
Użycie Leaflet.js + OpenStreetMap.
Mapowanie zmiennych Open‑Meteo oraz cache miesięczny per plan.
Normalizacja i łączenie shortwave_radiation z sunshine_duration w jedną metrykę „nasłonecznienie”.
Skala ocen 1–5 i średnia ważona z dostosowaniem do półkuli oraz ręczną korektą sezonu.
Sztywny schemat odpowiedzi AI w JSON i sanity‑check po stronie aplikacji.
Timeout 10 s dla AI z komunikatem błędu i możliwością ponowienia.
Zasada „1 roślina = 1 pole” i potwierdzenie przy zmianie typu pola usuwającej rośliny.
</matched_recommendations>
<prd_planning_summary>
a) Główne wymagania funkcjonalne:
Rejestracja/logowanie: e‑mail/hasło (bez weryfikacji).
Tworzenie planu: geokodowanie lokalizacji; orientacja 0–359°; definicja wymiarów i jednostki siatki; limit 200×200.
Edycja siatki: typy pól (ziemia/ścieżka/woda/zabudowa); zaznaczanie obszaru i przypisanie typu; zmiana typu usuwa rośliny (z potwierdzeniem).
Rośliny: jedna roślina na pole; dodanie rośliny uruchamia AI.
Dane pogodowe: jednorazowe pobranie z Open‑Meteo; cache miesięczny na plan.
AI: stały JSON, porównanie wymagań z warunkami miesięcznymi; ocena 1–5 per parametr; średnia ważona (IV–IX waga 2, reszta 1) z auto‑dostosowaniem do półkuli; timeout 10 s i ponowienie.
Mapy: Leaflet.js + OpenStreetMap; komunikat o niskiej dokładności przy braku danych.
Analityka: zapisy do bazy 4 zdarzeń (plan_created, grid_saved, area_typed, plant_confirmed).
b) Kluczowe historie użytkownika i ścieżki:
Onboarding planu: lokalizacja → orientacja → wymiary → generacja siatki → oznaczenie typów pól → zapis planu.
Dodawanie rośliny: wybór pola → wyszukiwanie rośliny po nazwie → potwierdzenie → AI ocena → zapis/odrzucenie rośliny.
Edycja planu: ponowne zaznaczenie obszarów → zmiana typu z potwierdzeniem → konsekwencyjne usunięcie roślin z obszaru.
Pobranie i cache pogody: automatycznie po ustawieniu lokalizacji lub przy pierwszym uruchomieniu AI.
Uwierzytelnianie: logowanie e‑mail/hasło; dostęp do zapisanych planów.
c) Kryteria sukcesu i pomiar:
KPI: (1) odsetek użytkowników z w pełni wypełnionym planem (≥5 roślin), (2) odsetek użytkowników, którzy w ciągu roku tworzą plan i dodają ≥5 roślin.
Telemetria: wykorzystanie 4 zdarzeń do wyznaczania lejka (plan_created → grid_saved → area_typed → plant_confirmed); agregacja liczby roślin per plan/użytkownik do oceny spełnienia KPI.
d) Nierozwiązane kwestie (wysokopoziomowe):
Bezpieczeństwo kont: polityka haseł, reset hasła, rate‑limiting, ochrona przed brute‑force nieokreślone.
Dokładna funkcja normalizacji i jednostki porównawcze (np. kWh/m²/mies. vs godziny słońca/dzień) do jednoznacznej interpretacji wyniku.
Zarządzanie limitami/dostępnością darmowych usług (Leaflet.js + OpenStreetMap/Open‑Meteo)
Brak mechanizmów cofania/warstw może wpływać na UX przy większych planach (świadoma decyzja, ale ryzyko frustracji).
Analityka ograniczona do 4 zdarzeń może utrudniać pełny pomiar retencji i użycia AI (np. brak ai_result_viewed).
</prd_planning_summary>
<unresolved_issues>
Polityka bezpieczeństwa logowania (reset hasła, złożoność, rate‑limiting, CAPTCHA).
Precyzyjna definicja normalizacji i jednostek dla „nasłonecznienia” oraz kombinacji shortwave_radiation + sunshine_duration.
Strategia obsługi limitów i awarii dostawców (Leaflet.js + OpenStreetMap/Open‑Meteo), w tym konkretne progi i czasy cache.
Decyzja, czy potrzeba dodatkowych eventów analitycznych dla pomiaru wykorzystania AI i ukończenia planu (jeśli KPI mają być wiarygodne).
Strategia lokalizacji/języków i tłumaczeń w UI/AI (jeśli planowany zasięg międzynarodowy).
</unresolved_issues>
</conversation_summary>
