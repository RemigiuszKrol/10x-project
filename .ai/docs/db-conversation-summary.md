<conversation_summary>
<decisions>
Klucze główne: uuid we wszystkich tabelach domenowych, domyślnie gen_random_uuid(). user_id jako FK do auth.users(id).
Tabela profiles(id uuid PK) powiązana 1:1 z auth.users, przechowuje preferencje (motyw).
plans: unikalność (user_id, name), pola audytowe created_at/updated_at timestamptz.
Parametry planu: width_cm, height_cm, cell_size_cm ∈ {10,25,50,100}, oraz wyliczone i przechowywane grid_width, grid_height z limitem ≤ 200. orientation smallint 0–359.
Geolokalizacja: latitude/longitude double precision (MVP bez PostGIS).
Siatka: grid_cells(plan_id, x, y, type) z PK (plan_id,x,y); type jako ENUM ('soil','path','water','building','blocked').
Rośliny: plant_placements(plan_id,x,y,plant_name) z PK (plan_id,x,y); brak pól source/source_id.
Spójność siatka↔rośliny: triggery wymuszające rośliny tylko na type='soil'; zmiana typu usuwa roślinę w tej komórce; operacje w transakcjach.
AI: przechowywanie wyników w kolumnach typowanych (score’y 1–5, ewentualnie ai_payload jsonb, ai_version), zgodnie z rekomendacją.
Pogoda: weather_monthly(plan_id, year, month, sunlight numeric, humidity numeric, precip numeric, last_refreshed_at timestamptz, UNIQUE(plan_id,year,month)); przechowujemy wyłącznie ostatnie 12 miesięcy; bez odświeżania w MVP; blokada UPDATE/DELETE (wyjątek service_role).
Analityka: analytics_events zachowywane po usunięciu planu; plan_id NULLABLE z ON DELETE SET NULL, user_id NOT NULL.
Usuwanie planów: hard delete z ON DELETE CASCADE dla grid_cells, plant_placements, weather_monthly; brak kaskady na analytics_events.
RLS: model owner-only — dostęp wyłącznie właściciela (auth.uid()) do własnych danych; tabele zależne autoryzowane przez powiązanie z plans.
Indeksy: na start tylko PK grid_cells(plan_id,x,y) (bez partycjonowania).
Audyt: wszędzie created_at DEFAULT now(), updated_at DEFAULT now() + trigger aktualizujący updated_at.
</decisions>
<matched_recommendations>
UUID jako PK + FK do auth.users oraz osobna tabela profiles dla preferencji.
Unikalność nazwy planu w obrębie użytkownika; audyt created_at/updated_at.
ENUM dla grid_cell_type oraz ograniczenia walidacyjne siatki i orientacji.
Model siatki z PK (plan_id,x,y) i osobną tabelą plant_placements 1:1 do komórki.
Triggery dla spójności: rośliny tylko na soil; zmiana typu usuwa roślinę.
weather_monthly z unikalnością (plan_id,year,month) i brakiem odświeżania w MVP.
RLS owner-only z politykami opartymi o istnienie powiązanego planu.
Hard delete planu z CASCADE dla siatki/roślin/pogody; analytics_events pozostają (SET NULL).
Indeksy minimalne na start (PK w grid_cells); brak partycjonowania.
Pola audytowe i spójny timestamptz; triggery updated_at.
</matched_recommendations>
<database_planning_summary>
Główne wymagania schematu:
Integracja z Supabase Auth (auth.users), preferencje w profiles.
Edytor siatki do 200×200 pól, jednostki kratki 10/25/50/100 cm, orientacja 0–359°, lokalizacja lat/lon.
Dodawanie roślin 1:1 do komórki typu soil.
Cache pogody: 12 ostatnich miesięcy per plan, bez odświeżania w MVP.
Minimalna analityka (4 zdarzenia).
RLS: dostęp tylko właściciela.
Kluczowe encje i relacje:
profiles(id PK) 1:1 → auth.users.
plans(id PK, user_id FK→auth.users) 1:N → grid_cells, plant_placements, weather_monthly, analytics_events (opcjonalnie przez plan_id).
grid_cells(PK plan_id,x,y) 1:1 ↔ plant_placements(PK plan_id,x,y).
weather_monthly(UNIQUE plan_id,year,month) N:1 → plans.
analytics_events(id PK, user_id, plan_id NULL) N:1 → auth.users i opcjonalnie → plans.
Bezpieczeństwo i skalowalność:
RLS owner-only: w plans po user_id = auth.uid(); w tabelach zależnych EXISTS do plans.
Uprawnienia: analytics_events tylko INSERT/SELECT przez właściciela; odczyty zbiorcze wyłącznie service_role.
Indeksy: PK w każdej tabeli; na start tylko PK w grid_cells.
Brak partycjonowania w MVP; możliwe dodanie w przyszłości w razie wzrostu (hash po plan_id).
Spójność transakcyjna przy operacjach na siatce; triggery dla integralności.
Audyt created_at/updated_at i triggery aktualizujące.
Otwarte/kluczowe parametry techniczne:
ENUM grid_cell_type('soil','path','water','building','blocked'); opcjonalny ENUM hemisphere jeśli trzymany przy wynikach AI lub w plans.
Ograniczenia: grid_width,grid_height BETWEEN 1 AND 200; x,y >=0 AND < grid_width/height.
Wyniki AI: kolumny typowane na score’y 1–5 (+ opcjonalny ai_payload jsonb, ai_version), bez pól source/source_id.
Pogoda: wartości numeric (skala do ustalenia), 12 rekordów na plan; blokada modyfikacji w MVP.
</database_planning_summary>
<unresolved_issues>
Skala i precyzja dla numeric w weather_monthly i potencjalnie dla znormalizowanych metryk (np. numeric(5,2) vs smallint 0–100).
Lokalizacja pól związanych z sezonowością (np. hemisphere, wagi sezonów): czy przechowywać w plans, czy tylko w wynikach AI?
Dokładny zestaw kolumn w analytics_events (np. event_type jako ENUM, minimalne atrybuty per PRD).
Ewentualne przechowywanie geocoding_accuracy/adresu w plans (MVP dopuszcza komunikat o niskiej dokładności).
Zakres i format ai_payload jsonb oraz polityka rozmiaru (limit) dla JSON, jeśli będzie przechowywany.
</unresolved_issues>
</conversation_summary>
