<conversation_summary>
<decisions>

1. Główna nawigacja opiera się na stałym topbarze z globalnymi przełącznikami oraz bocznym panelem kontekstowym w edytorze planu, który zawiera akcje i informacje związane z bieżącym planem.
2. Tworzenie planu odbywa się w wieloetapowym kreatorze z możliwością zapisu szkicu i przywrócenia przerwanego procesu przed finalnym wywołaniem `POST /api/plans`.
3. Po wejściu do edytora domyślnie prezentowana jest zakładka „Siatka”, a panel parametrów planu działa jako wysuwany drawer, aby nie zasłaniać widoku.
4. Siatka zawsze wypełnia całą szerokość dostępnego obszaru, bez funkcji zoom; na niższych ekranach dopuszczony jest pionowy scroll, a rozmiar komórek skaluje się dynamicznie.
5. Interfejs ma spełniać standard WCAG 2.1 AA (kontrast ≥4.5:1, etykiety ARIA, aria-live dla komunikatów, wyraźne fokusy) z wykorzystaniem komponentów shadcn/ui.
6. Wdrożony zostanie globalny nasłuch stanu sesji Supabase: w razie wylogowania UI pokazuje modal proszący o ponowne logowanie i chroni dane przed utratą.
7. Zarządzanie stanem korzysta z React Query (synchronizacja danych `plans`, `grid`, `plants`, `weather`) oraz lekkiego kontekstu edytora dla ustawień lokalnych.
8. Błędy 409 obsługiwane są modalem potwierdzającym konsekwencje, a błędy 422 komunikowane inline w formularzu wraz z toastem informacyjnym.
9. W panelu parametrów znajduje się sekcja „Pogoda” z datą ostatniego odświeżenia oraz przyciskiem do wywołania `/api/plans/:id/weather/refresh`; dane pogodowe są tylko odczytywane z bazy i odświeżane na żądanie.
10. Zdarzenia analityczne są wysyłane automatycznie przez wspólny hook (np. plan_created, grid_saved, area_typed, plant_confirmed) bez dedykowanego widoku w UI; raportowanie odbywa się poza interfejsem.
    </decisions>

<matched_recommendations>

1. Utrzymanie topbaru i bocznego panelu kontekstowego w edytorze.
2. Zaprojektowanie kreatora planu z lokalnym zapisem postępu i szkicu.
3. Domyślne ustawienie zakładki „Siatka” z wysuwanym panelem parametrów.
4. Responsywna siatka bez zoomu, pełna szerokość i pionowy scroll na małych ekranach.
5. Wdrożenie wytycznych WCAG 2.1 AA (kontrast, ARIA, aria-live, fokusy) na komponentach shadcn/ui.
6. Modalne ponowne logowanie przy utracie sesji Supabase.
7. Wykorzystanie React Query i kontekstu edytora do zarządzania stanem i synchronizacji z API.
8. Spójne wzorce obsługi błędów 409 (modal) i 422 (walidacja + toast).
9. Sekcja „Pogoda” z timestampem i przyciskiem odświeżania danych z `/weather/refresh`.
10. Hook do automatycznego wywoływania `POST /api/analytics/events` bez ekspozycji w interfejsie.
    </matched_recommendations>

<ui_architecture_planning_summary>
Główne wymagania UI obejmują: listę planów, wieloetapowy kreator tworzenia nowego planu, edytor planu z siatką i panelem parametrów oraz stronę profilu (motyw). Edytor zapewnia pełnoekranowy widok siatki z bocznym drawerem zawierającym parametry planu, sekcję pogody i kontrolę roślin; dostępne są operacje zaznaczania obszarów, zmiany typów pól i dodawania roślin zgodnie z API (`/grid`, `/plants`, `/ai`).

Przepływy użytkownika obejmują: logowanie (już istniejące), listę planów (US-021), tworzenie planu w kreatorze (US-005, US-007), wejście do edytora (US-009, US-011), dodawanie roślin z integracją AI i potwierdzeniami (US-012–US-016) oraz zarządzanie parametrami planu wraz z obsługą potwierdzeń skutków zmian (US-022, US-031). Główna nawigacja w topbarze przełącza pomiędzy listą planów a profilem; kontekstowe akcje edytora znajdują się w bocznym panelu.

Integracja z API bazuje na React Query do pobierania i mutacji (`GET/POST/PATCH /api/plans`, `/grid/*`, `/plants/*`, `/ai/plants/*`, `/weather`, `/analytics/events`), z lokalnym kontekstem przechowującym konfigurację edytora. Dane pogodowe są odczytywane z bazy i odświeżane na żądanie; AI wywoływane jest przy dodawaniu roślin lub na życzenie użytkownika; eventy analityczne wysyłane są automatycznie bez ekspozycji w UI. Globalny mechanizm monitoruje sesję Supabase, zapewniając modalne ponowne logowanie.

Responsywność zakłada pełną szerokość siatki, dynamiczną wielkość komórek i pionowe przewijanie na niskich rozdzielczościach. UI spełnia WCAG 2.1 AA (kontrast, aria-live, etykiety, fokusy) oraz wykorzystuje komponenty shadcn/ui. W zakresie bezpieczeństwa i sesji przewidziano obsługę utraty zalogowania z zachowaniem danych oraz brak dodatkowych ekranów analityki czy logowania. Wzorce błędów implementują modalne potwierdzenia dla konfliktów i komunikaty inline z toastami dla walidacji.

Zdefiniowane zostały hooki i komponenty do obsługi kluczowych czynności, jednak brak potrzeby dedykowanego widoku analityki; raportowanie pozostaje w warstwie danych.
</ui_architecture_planning_summary>

<unresolved_issues>
Brak.
</unresolved_issues>
</conversation_summary>
