create table if not exists public.event_type_catalog (
  name text primary key,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_type_catalog_active_sort_idx
on public.event_type_catalog (is_active, sort_order, name);

drop trigger if exists set_event_type_catalog_updated_at on public.event_type_catalog;
create trigger set_event_type_catalog_updated_at
before update on public.event_type_catalog
for each row execute function public.set_updated_at();

insert into public.event_type_catalog (name, sort_order, is_active)
values
  ('Mantenimiento proveedor', 10, true), ('Calibración', 20, true),
  ('Monitoreo', 30, true), ('Calificación', 40, true),
  ('Verificación interna', 50, true), ('Reparación correctiva', 60, true),
  ('Incidencia', 70, true), ('Cursos', 80, true),
  ('Capacitaciones', 90, true), ('Certificaciones', 100, true),
  ('Traslado', 110, true), ('Alta inventario', 120, true), ('Baja', 130, true)
on conflict (name) do update set is_active = true, sort_order = excluded.sort_order;

insert into public.event_type_catalog (name, sort_order, is_active)
select distinct e.event_type, 1000, true
from public.equipment_events e
where nullif(trim(e.event_type), '') is not null
on conflict (name) do nothing;

alter table public.event_type_catalog enable row level security;

drop policy if exists event_type_catalog_select_authenticated on public.event_type_catalog;
create policy event_type_catalog_select_authenticated on public.event_type_catalog
for select to authenticated
using ((select private.current_access_level()) is not null);

drop policy if exists event_type_catalog_insert_admin on public.event_type_catalog;
create policy event_type_catalog_insert_admin on public.event_type_catalog
for insert to authenticated
with check ((select private.current_access_level()) = 'admin');

drop policy if exists event_type_catalog_update_admin on public.event_type_catalog;
create policy event_type_catalog_update_admin on public.event_type_catalog
for update to authenticated
using ((select private.current_access_level()) = 'admin')
with check ((select private.current_access_level()) = 'admin');

drop policy if exists event_type_catalog_delete_admin on public.event_type_catalog;
create policy event_type_catalog_delete_admin on public.event_type_catalog
for delete to authenticated
using ((select private.current_access_level()) = 'admin');

grant select, insert, update, delete on public.event_type_catalog to authenticated;
