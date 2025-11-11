## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

### 1.1 Typy ENUM

```sql
-- Typ komórki siatki
CREATE TYPE grid_cell_type AS ENUM ('soil', 'path', 'water', 'building', 'blocked');

-- Typ zdarzenia analitycznego (MVP)
CREATE TYPE analytics_event_type AS ENUM ('plan_created','grid_saved','area_typed','plant_confirmed');

-- Preferencje profilu
CREATE TYPE ui_theme AS ENUM ('light','dark');
```

### 1.2 Tabela: profiles

`auth.users` pochodzi z Supabase

Opis: Preferencje użytkownika. 1:1 z `auth.users`.

```sql
CREATE TABLE public.profiles (
	id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	language_code text NOT NULL DEFAULT 'pl', -- np. 'pl', 'en'
	theme ui_theme NOT NULL DEFAULT 'light',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);
```

Ograniczenia i uwagi:

- `id` = `auth.users.id` (1:1).

### 1.3 Tabela: plans

Opis: Definicja planu działki i parametrów siatki.

```sql
CREATE TABLE public.plans (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	name text NOT NULL,
	-- Lokalizacja
	latitude double precision,
	longitude double precision,
	-- Parametry fizyczne i siatki
	width_cm integer NOT NULL CHECK (width_cm > 0),
	height_cm integer NOT NULL CHECK (height_cm > 0),
	cell_size_cm smallint NOT NULL CHECK (cell_size_cm IN (10,25,50,100)),
	-- Wymuszenie całkowitego podziału na siatkę
	CHECK (width_cm % cell_size_cm = 0),
	CHECK (height_cm % cell_size_cm = 0),
	-- Wymiary siatki wyliczane i przechowywane
	grid_width integer GENERATED ALWAYS AS ((width_cm / cell_size_cm)) STORED,
	grid_height integer GENERATED ALWAYS AS ((height_cm / cell_size_cm)) STORED,
	CHECK (grid_width BETWEEN 1 AND 200),
	CHECK (grid_height BETWEEN 1 AND 200),
	-- Orientacja działki
	orientation smallint NOT NULL DEFAULT 0 CHECK (orientation BETWEEN 0 AND 359),
	-- Sezonowość (opcjonalnie do ważenia)
	hemisphere text, -- 'northern'/'southern' (opcjonalne; walidacja aplikacyjna)
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (user_id, name)
);
```

Uwaga: `hemisphere` pozostawione jako `text` z walidacją po stronie aplikacji (można w przyszłości zamienić na ENUM).

### 1.4 Tabela: grid_cells

Opis: Komórki siatki planu z typem powierzchni. Limit do 200×200 per plan.

```sql
CREATE TABLE public.grid_cells (
	plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
	x integer NOT NULL,
	y integer NOT NULL,
	type grid_cell_type NOT NULL DEFAULT 'soil',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (plan_id, x, y)
);
```

Uwaga: Granice (0 ≤ x < grid_width, 0 ≤ y < grid_height) weryfikowane triggerem (patrz sekcja 4 i 5).

### 1.5 Tabela: plant_placements

Opis: Umieszczenie rośliny 1:1 w komórce typu `soil`. Zawiera wyniki AI (składowe 1–5).

```sql
CREATE TABLE public.plant_placements (
	plan_id uuid NOT NULL,
	x integer NOT NULL,
	y integer NOT NULL,
	plant_name text NOT NULL,
	-- Wyniki AI (składowe 1–5)
	sunlight_score smallint CHECK (sunlight_score BETWEEN 1 AND 5),
	humidity_score smallint CHECK (humidity_score BETWEEN 1 AND 5),
	precip_score smallint CHECK (precip_score BETWEEN 1 AND 5),
	overall_score smallint CHECK (overall_score BETWEEN 1 AND 5),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (plan_id, x, y),
	FOREIGN KEY (plan_id, x, y) REFERENCES public.grid_cells(plan_id, x, y) ON DELETE CASCADE
);
```

Uwaga: Spójność z typem komórki `soil` oraz kasowanie roślin przy zmianie typu komórki wymuszane triggerami (sekcja 4 i 5).

### 1.6 Tabela: weather_monthly

Opis: Cache miesięczny danych pogodowych per plan (ostatnie 12 miesięcy). Wartości po normalizacji w skali 0–100.

```sql
CREATE TABLE public.weather_monthly (
	plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
	year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
	month smallint NOT NULL,
	-- Znormalizowane metryki 0–100
	sunlight smallint NOT NULL CHECK (sunlight BETWEEN 0 AND 100),
	humidity smallint NOT NULL CHECK (humidity BETWEEN 0 AND 100),
	precip smallint NOT NULL CHECK (precip BETWEEN 0 AND 100),
	last_refreshed_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (plan_id, year, month)
);
```

Uwaga: Aktualizacje/usunięcia tylko przez `service_role` (RLS; sekcja 4).

### 1.7 Tabela: analytics_events

Opis: Minimalna telemetria 4 zdarzeń MVP. `plan_id` może być NULL, zdarzenia nie usuwają się z usunięciem planu.

```sql
CREATE TABLE public.analytics_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	plan_id uuid NULL REFERENCES public.plans(id) ON DELETE SET NULL,
	event_type analytics_event_type NOT NULL,
	attributes jsonb,
	created_at timestamptz NOT NULL DEFAULT now()
);
```

## 2. Relacje między tabelami

- `profiles (id)` 1:1 → `auth.users(id)`.
- `plans (user_id)` N:1 → `auth.users(id)`.
- `grid_cells (plan_id)` N:1 → `plans(id)` (kasuje się z planem).
- `plant_placements (plan_id,x,y)` 1:1 ↔ `grid_cells (plan_id,x,y)` (kasuje się z komórką).
- `weather_monthly (plan_id)` N:1 → `plans(id)` (kasuje się z planem).
- `analytics_events (plan_id)` N:1 → `plans(id)` (ON DELETE SET NULL); N:1 → `auth.users(id)`.

Kardynalności i zasady:

- 1 komórka siatki może mieć 0 lub 1 roślinę.
- Roślina może istnieć tylko w komórce typu `soil` (wymuszane triggerami).
- Zmiana typu komórki na inny niż `soil` usuwa roślinę w tej komórce.

## 3. Indeksy

```sql
-- profiles: PK wystarczy

-- plans: listowanie użytkownika i sortowanie po czasie
CREATE INDEX idx_plans_user_updated_at ON public.plans (user_id, updated_at DESC);

-- grid_cells: PK (plan_id,x,y) wystarczy; pomocniczo po typie w obrębie planu
CREATE INDEX idx_grid_cells_plan_type ON public.grid_cells (plan_id, type);

-- plant_placements: PK (plan_id,x,y) wystarczy; wyszukiwanie po nazwie w planie
CREATE INDEX idx_plants_plan_name ON public.plant_placements (plan_id, plant_name);

-- weather_monthly: PK (plan_id,year,month) wystarczy

-- analytics_events: typowe zapytania użytkownika i po planie
CREATE INDEX idx_analytics_user_created_at ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_plan_created_at ON public.analytics_events (plan_id, created_at DESC);
```

## 4. Zasady PostgreSQL (RLS)

Włączone RLS na wszystkich tabelach domenowych w schemacie `public`. Polityki „owner‑only” oparte o `auth.uid()` (Supabase).

```sql
-- 4.1 Włączenie RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grid_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 4.2 profiles: właściciel = auth.uid()
CREATE POLICY profiles_select ON public.profiles
	FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_upsert ON public.profiles
	FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles
	FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 4.3 plans: owner‑only
CREATE POLICY plans_select ON public.plans
	FOR SELECT USING (user_id = auth.uid());
CREATE POLICY plans_insert ON public.plans
	FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY plans_update ON public.plans
	FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY plans_delete ON public.plans
	FOR DELETE USING (user_id = auth.uid());

-- 4.4 grid_cells: owner‑only przez powiązanie z planem
CREATE POLICY grid_cells_select ON public.grid_cells
	FOR SELECT USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY grid_cells_insert ON public.grid_cells
	FOR INSERT WITH CHECK (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY grid_cells_update ON public.grid_cells
	FOR UPDATE USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	)) WITH CHECK (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY grid_cells_delete ON public.grid_cells
	FOR DELETE USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));

-- 4.5 plant_placements: owner‑only przez powiązanie z planem
CREATE POLICY plant_select ON public.plant_placements
	FOR SELECT USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY plant_insert ON public.plant_placements
	FOR INSERT WITH CHECK (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY plant_update ON public.plant_placements
	FOR UPDATE USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	)) WITH CHECK (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY plant_delete ON public.plant_placements
	FOR DELETE USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));

-- 4.6 weather_monthly: owner‑only SELECT/INSERT; UPDATE/DELETE tylko service_role
CREATE POLICY weather_select ON public.weather_monthly
	FOR SELECT USING (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));
CREATE POLICY weather_insert ON public.weather_monthly
	FOR INSERT WITH CHECK (EXISTS (
		SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
	));

-- 4.7 analytics_events: owner‑only SELECT; INSERT przez właściciela; brak UPDATE/DELETE dla klienta
CREATE POLICY ae_select ON public.analytics_events
	FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ae_insert ON public.analytics_events
	FOR INSERT WITH CHECK (user_id = auth.uid());
```

## 5. Triggery i funkcje pomocnicze

### 5.1 Aktualizacja `updated_at`

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
	BEFORE UPDATE ON public.profiles
	FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_plans_updated
	BEFORE UPDATE ON public.plans
	FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_grid_cells_updated
	BEFORE UPDATE ON public.grid_cells
	FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_plants_updated
	BEFORE UPDATE ON public.plant_placements
	FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 5.2 Walidacja granic komórek względem planu

```sql
CREATE OR REPLACE FUNCTION public.validate_cell_bounds()
RETURNS trigger AS $$
DECLARE
	gw integer;
	gh integer;
BEGIN
	SELECT grid_width, grid_height INTO gw, gh FROM public.plans WHERE id = NEW.plan_id;
	IF gw IS NULL THEN
		RAISE EXCEPTION 'Plan % not found', NEW.plan_id;
	END IF;
	IF NEW.x < 0 OR NEW.y < 0 OR NEW.x >= gw OR NEW.y >= gh THEN
		RAISE EXCEPTION 'Cell (% %, % %) out of bounds [0..% , 0..%]', NEW.plan_id, NEW.x, NEW.y, gw-1, gh-1;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grid_cells_bounds
	BEFORE INSERT OR UPDATE ON public.grid_cells
	FOR EACH ROW EXECUTE FUNCTION public.validate_cell_bounds();

CREATE TRIGGER trg_plants_bounds
	BEFORE INSERT OR UPDATE ON public.plant_placements
	FOR EACH ROW EXECUTE FUNCTION public.validate_cell_bounds();
```

### 5.3 Spójność: rośliny tylko na `soil`; usuwanie roślin przy zmianie typu

```sql
-- Wstawienie/aktualizacja rośliny tylko na polu typu 'soil'
CREATE OR REPLACE FUNCTION public.ensure_plant_on_soil()
RETURNS trigger AS $$
DECLARE
	cell_type grid_cell_type;
BEGIN
	SELECT type INTO cell_type FROM public.grid_cells
	WHERE plan_id = NEW.plan_id AND x = NEW.x AND y = NEW.y;
	IF cell_type IS NULL THEN
		RAISE EXCEPTION 'Grid cell not found for plant placement';
	END IF;
	IF cell_type <> 'soil' THEN
		RAISE EXCEPTION 'Plants can be placed only on soil cells';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plants_on_soil
	BEFORE INSERT OR UPDATE ON public.plant_placements
	FOR EACH ROW EXECUTE FUNCTION public.ensure_plant_on_soil();

-- Zmiana typu komórki: jeśli nie 'soil', usuń roślinę w tej komórce
CREATE OR REPLACE FUNCTION public.purge_plant_on_cell_type_change()
RETURNS trigger AS $$
BEGIN
	IF NEW.type <> 'soil' THEN
		DELETE FROM public.plant_placements
		WHERE plan_id = NEW.plan_id AND x = NEW.x AND y = NEW.y;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purge_plant_on_cell_type_change
	AFTER UPDATE OF type ON public.grid_cells
	FOR EACH ROW EXECUTE FUNCTION public.purge_plant_on_cell_type_change();
```

## 6. Dodatkowe uwagi projektowe

- Normalizacja: model w 3NF; brak denormalizacji poza przechowywaniem `grid_width/grid_height` jako kolumn generowanych dla spójności i prostoty zapytań.
- Skala metryk pogodowych: przyjęto 0–100 (smallint) dla kompaktowości i prostoty progów; w razie potrzeby możliwa zmiana na `numeric(p,s)`.
- Limit siatki: egzekwowany przez CHECK na `grid_width/grid_height` oraz triggery granic przy operacjach na komórkach/roślinach.
- Transakcyjność: operacje edycji obszarów i zmian typów zalecane w transakcjach po stronie aplikacji (atomowość z kasowaniem roślin).
