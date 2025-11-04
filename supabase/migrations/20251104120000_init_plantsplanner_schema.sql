--
-- migration: init plantsplanner schema (mvp)
-- purpose: create core types, tables, indexes, rls policies, and triggers to support
--          garden plot planning, placement of plants, basic analytics, and cached weather.
-- affected objects:
--   types: public.grid_cell_type, public.analytics_event_type, public.ui_theme
--   tables: public.profiles, public.plans, public.grid_cells, public.plant_placements,
--           public.weather_monthly, public.analytics_events
--   indexes: see section 3 below
--   rls: enabled on all domain tables with granular owner-only policies for anon and authenticated roles
--   triggers/functions: updated_at maintainer, bounds validation, soil-only placement,
--                       purge placements on cell type change
-- special considerations:
--   - destructive operations are not performed; this migration is additive
--   - update/delete on weather/monthly only via service_role (no client policies)
--   - all sql is written in lowercase and thoroughly commented

-- 0) prerequisites and extensions
-- gen_random_uuid() is used for primary keys; ensure pgcrypto is available in the extensions schema
create extension if not exists pgcrypto with schema extensions;

/*
1) enum types
   enums model constrained domain values and simplify validation in application code
*/

-- cell type in the grid
create type public.grid_cell_type as enum ('soil', 'path', 'water', 'building', 'blocked');

-- analytics event type (mvp scope)
create type public.analytics_event_type as enum ('plan_created','grid_saved','area_typed','plant_confirmed');

-- ui theme preference for profiles
create type public.ui_theme as enum ('light','dark');

/*
2) tables
   tables implement the mvp data model. all tables include created_at; mutable rows include updated_at
*/

-- profiles: user preferences (1:1 with auth.users)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    language_code text not null default 'pl',
    theme public.ui_theme not null default 'light',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- plans: plot definition and grid parameters
create table public.plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    -- location (optional)
    latitude double precision,
    longitude double precision,
    -- physical dimensions and grid cell size
    width_cm integer not null check (width_cm > 0),
    height_cm integer not null check (height_cm > 0),
    cell_size_cm smallint not null check (cell_size_cm in (10,25,50,100)),
    -- enforce exact grid partition
    check (width_cm % cell_size_cm = 0),
    check (height_cm % cell_size_cm = 0),
    -- generated grid dimensions
    grid_width integer generated always as ((width_cm / cell_size_cm)) stored,
    grid_height integer generated always as ((height_cm / cell_size_cm)) stored,
    check (grid_width between 1 and 200),
    check (grid_height between 1 and 200),
    -- plot orientation (degrees 0..359)
    orientation smallint not null default 0 check (orientation between 0 and 359),
    -- hemisphere (kept as free text for now; app-level validation)
    hemisphere text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, name)
);

-- grid_cells: per-cell surface type within a plan
create table public.grid_cells (
    plan_id uuid not null references public.plans(id) on delete cascade,
    x integer not null,
    y integer not null,
    type public.grid_cell_type not null default 'soil',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (plan_id, x, y)
);

-- plant_placements: 1:1 placement of a plant into a soil cell; includes ai scoring
create table public.plant_placements (
    plan_id uuid not null,
    x integer not null,
    y integer not null,
    plant_name text not null,
    -- ai scores (1..5)
    sunlight_score smallint check (sunlight_score between 1 and 5),
    humidity_score smallint check (humidity_score between 1 and 5),
    precip_score smallint check (precip_score between 1 and 5),
    overall_score smallint check (overall_score between 1 and 5),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (plan_id, x, y),
    foreign key (plan_id, x, y) references public.grid_cells (plan_id, x, y) on delete cascade
);

-- weather_monthly: cached monthly weather metrics per plan; normalized to 0..100
create table public.weather_monthly (
    plan_id uuid not null references public.plans(id) on delete cascade,
    year integer not null check (year between 1900 and 2100),
    month smallint not null check (month between 1 and 12),
    sunlight smallint not null check (sunlight between 0 and 100),
    humidity smallint not null check (humidity between 0 and 100),
    precip smallint not null check (precip between 0 and 100),
    last_refreshed_at timestamptz not null default now(),
    primary key (plan_id, year, month)
);

-- analytics_events: minimal telemetry for 4 mvp events
create table public.analytics_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    plan_id uuid null references public.plans(id) on delete set null,
    event_type public.analytics_event_type not null,
    attributes jsonb,
    created_at timestamptz not null default now()
);

/*
3) indexes
   targeted to common queries: listing by user, filtering by type/name, ordering by recency
*/

-- plans: list user's plans and sort by recency
create index idx_plans_user_updated_at on public.plans (user_id, updated_at desc);

-- grid_cells: by type within a plan
create index idx_grid_cells_plan_type on public.grid_cells (plan_id, type);

-- plant_placements: search by name within a plan
create index idx_plants_plan_name on public.plant_placements (plan_id, plant_name);

-- analytics_events: typical queries by user/plan and recency
create index idx_analytics_user_created_at on public.analytics_events (user_id, created_at desc);
create index idx_analytics_plan_created_at on public.analytics_events (plan_id, created_at desc);

/*
4) row level security (rls)
   rls is enabled on all domain tables. policies follow owner-only pattern with separate
   policies for 'anon' (denied access) and 'authenticated' (can only access their own data).
   granular policies are defined per operation (select, insert, update, delete) and per role.
*/

-- enable rls on all tables
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.grid_cells enable row level security;
alter table public.plant_placements enable row level security;
alter table public.weather_monthly enable row level security;
alter table public.analytics_events enable row level security;

-- profiles policies
-- rationale: only authenticated users can access their own profile; anonymous users have no access
create policy profiles_select_anon on public.profiles
    for select to anon using (false);
create policy profiles_select_authenticated on public.profiles
    for select to authenticated using (id = auth.uid());
create policy profiles_insert_anon on public.profiles
    for insert to anon with check (false);
create policy profiles_insert_authenticated on public.profiles
    for insert to authenticated with check (id = auth.uid());
create policy profiles_update_anon on public.profiles
    for update to anon using (false);
create policy profiles_update_authenticated on public.profiles
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete_anon on public.profiles
    for delete to anon using (false);
create policy profiles_delete_authenticated on public.profiles
    for delete to authenticated using (id = auth.uid());

-- plans policies (owner-only)
-- rationale: authenticated users can only access and modify their own plans; anonymous users have no access
create policy plans_select_anon on public.plans
    for select to anon using (false);
create policy plans_select_authenticated on public.plans
    for select to authenticated using (user_id = auth.uid());
create policy plans_insert_anon on public.plans
    for insert to anon with check (false);
create policy plans_insert_authenticated on public.plans
    for insert to authenticated with check (user_id = auth.uid());
create policy plans_update_anon on public.plans
    for update to anon using (false);
create policy plans_update_authenticated on public.plans
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plans_delete_anon on public.plans
    for delete to anon using (false);
create policy plans_delete_authenticated on public.plans
    for delete to authenticated using (user_id = auth.uid());

-- grid_cells policies (owner-only via plan relationship)
-- rationale: authenticated users can only access grid cells of their own plans; anonymous users have no access
create policy grid_cells_select_anon on public.grid_cells
    for select to anon using (false);
create policy grid_cells_select_authenticated on public.grid_cells
    for select to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy grid_cells_insert_anon on public.grid_cells
    for insert to anon with check (false);
create policy grid_cells_insert_authenticated on public.grid_cells
    for insert to authenticated with check (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy grid_cells_update_anon on public.grid_cells
    for update to anon using (false);
create policy grid_cells_update_authenticated on public.grid_cells
    for update to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    )) with check (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy grid_cells_delete_anon on public.grid_cells
    for delete to anon using (false);
create policy grid_cells_delete_authenticated on public.grid_cells
    for delete to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));

-- plant_placements policies (owner-only via plan relationship)
-- rationale: authenticated users can only access plant placements in their own plans; anonymous users have no access
create policy plant_select_anon on public.plant_placements
    for select to anon using (false);
create policy plant_select_authenticated on public.plant_placements
    for select to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy plant_insert_anon on public.plant_placements
    for insert to anon with check (false);
create policy plant_insert_authenticated on public.plant_placements
    for insert to authenticated with check (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy plant_update_anon on public.plant_placements
    for update to anon using (false);
create policy plant_update_authenticated on public.plant_placements
    for update to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    )) with check (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy plant_delete_anon on public.plant_placements
    for delete to anon using (false);
create policy plant_delete_authenticated on public.plant_placements
    for delete to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));

-- weather_monthly policies
-- rationale: authenticated users can view and insert weather data for their plans; anonymous users have no access; update/delete only via service_role
create policy weather_select_anon on public.weather_monthly
    for select to anon using (false);
create policy weather_select_authenticated on public.weather_monthly
    for select to authenticated using (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));
create policy weather_insert_anon on public.weather_monthly
    for insert to anon with check (false);
create policy weather_insert_authenticated on public.weather_monthly
    for insert to authenticated with check (exists (
        select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()
    ));

-- analytics_events policies
-- rationale: authenticated users can view and insert their own analytics events; anonymous users have no access; no update/delete for clients
create policy ae_select_anon on public.analytics_events
    for select to anon using (false);
create policy ae_select_authenticated on public.analytics_events
    for select to authenticated using (user_id = auth.uid());
create policy ae_insert_anon on public.analytics_events
    for insert to anon with check (false);
create policy ae_insert_authenticated on public.analytics_events
    for insert to authenticated with check (user_id = auth.uid());

/*
5) triggers and helper functions
   functions are placed in public schema; triggers maintain invariants and timestamps
*/

-- 5.1 updated_at maintainer for mutable tables
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at := now();
    return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated
    before update on public.profiles
    for each row execute function public.set_updated_at();

create trigger trg_plans_updated
    before update on public.plans
    for each row execute function public.set_updated_at();

create trigger trg_grid_cells_updated
    before update on public.grid_cells
    for each row execute function public.set_updated_at();

create trigger trg_plants_updated
    before update on public.plant_placements
    for each row execute function public.set_updated_at();

-- 5.2 bounds validation against plan grid dimensions
create or replace function public.validate_cell_bounds()
returns trigger as $$
declare
    gw integer;
    gh integer;
begin
    select grid_width, grid_height into gw, gh from public.plans where id = new.plan_id;
    if gw is null then
        raise exception 'plan % not found', new.plan_id;
    end if;
    if new.x < 0 or new.y < 0 or new.x >= gw or new.y >= gh then
        raise exception 'cell (%, %, %) out of bounds [0..%, 0..%]', new.plan_id, new.x, new.y, gw-1, gh-1;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_grid_cells_bounds
    before insert or update on public.grid_cells
    for each row execute function public.validate_cell_bounds();

create trigger trg_plants_bounds
    before insert or update on public.plant_placements
    for each row execute function public.validate_cell_bounds();

-- 5.3 consistency: plants only on 'soil' cells; purge placements when cell type changes
create or replace function public.ensure_plant_on_soil()
returns trigger as $$
declare
    cell_type public.grid_cell_type;
begin
    select type into cell_type from public.grid_cells
    where plan_id = new.plan_id and x = new.x and y = new.y;
    if cell_type is null then
        raise exception 'grid cell not found for plant placement';
    end if;
    if cell_type <> 'soil' then
        raise exception 'plants can be placed only on soil cells';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_plants_on_soil
    before insert or update on public.plant_placements
    for each row execute function public.ensure_plant_on_soil();

create or replace function public.purge_plant_on_cell_type_change()
returns trigger as $$
begin
    if new.type <> 'soil' then
        delete from public.plant_placements
        where plan_id = new.plan_id and x = new.x and y = new.y;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_purge_plant_on_cell_type_change
    after update of type on public.grid_cells
    for each row execute function public.purge_plant_on_cell_type_change();

-- end of migration


