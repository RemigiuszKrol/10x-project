--
-- migration: auto-populate grid_cells on plan creation
-- purpose: automatically generate grid_cells entries when a new plan is inserted
--          each cell is initialized with default type 'soil'
-- rationale: ensures grid_cells are always present after plan creation,
--            eliminating the need for explicit application-level population
-- affected objects:
--   function: public.populate_grid_cells()
--   trigger: trg_plans_populate_grid on public.plans

-- function to populate all grid_cells for a newly created plan
create or replace function public.populate_grid_cells()
returns trigger as $$
declare
    gw integer;
    gh integer;
    ix integer;
    iy integer;
begin
    -- get generated grid dimensions from the new plan
    gw := new.grid_width;
    gh := new.grid_height;
    
    -- validate that dimensions are present (should always be true due to generated columns)
    if gw is null or gh is null then
        raise exception 'grid dimensions are null for plan %', new.id;
    end if;
    
    -- generate all cells with default type 'soil'
    -- using a loop to insert each cell (x from 0 to grid_width-1, y from 0 to grid_height-1)
    for ix in 0..(gw - 1) loop
        for iy in 0..(gh - 1) loop
            insert into public.grid_cells (plan_id, x, y, type)
            values (new.id, ix, iy, 'soil');
        end loop;
    end loop;
    
    return new;
end;
$$ language plpgsql security definer;

-- trigger to auto-populate grid_cells after a new plan is inserted
create trigger trg_plans_populate_grid
    after insert on public.plans
    for each row execute function public.populate_grid_cells();

-- end of migration

