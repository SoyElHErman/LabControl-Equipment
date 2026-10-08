create table if not exists public.equipment_type_catalog (
  name text primary key,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_type_catalog_active_sort_idx
on public.equipment_type_catalog (is_active, sort_order, name);

drop trigger if exists set_equipment_type_catalog_updated_at on public.equipment_type_catalog;
create trigger set_equipment_type_catalog_updated_at
before update on public.equipment_type_catalog
for each row execute function public.set_updated_at();

insert into public.equipment_type_catalog (name, sort_order, is_active)
values
  ('Agitador', 10, true),
  ('Balanza', 20, true),
  ('Baño / Sonicador', 30, true),
  ('Colorímetro', 40, true),
  ('Densitómetro', 50, true),
  ('Estufa', 60, true),
  ('Granulometría', 70, true),
  ('HPLC', 80, true),
  ('IC', 90, true),
  ('Inclinómetro', 100, true),
  ('Karl Fischer', 110, true),
  ('Masas patrón', 120, true),
  ('Medidor de altura', 130, true),
  ('Medidor de espesor', 140, true),
  ('Medidor de humedad', 150, true),
  ('Micropipeta', 160, true),
  ('Microscopio', 170, true),
  ('NIR', 180, true),
  ('Otro', 190, true),
  ('pH / Conductividad', 200, true),
  ('Pie de metro', 210, true),
  ('Purificador de agua', 220, true),
  ('Refractómetro', 230, true),
  ('Refrigerador', 240, true),
  ('Termohigrómetro', 250, true),
  ('Termómetro', 260, true),
  ('Titulación', 270, true),
  ('TOC', 280, true),
  ('Torquímetro', 290, true),
  ('Turbidímetro', 300, true),
  ('UPLC', 310, true),
  ('UV-VIS', 320, true),
  ('Viscosímetro', 330, true)
on conflict (name) do update
set is_active = true,
    sort_order = excluded.sort_order;

insert into public.equipment_type_catalog (name, sort_order, is_active)
select distinct e.type, 1000, true
from public.equipments e
where nullif(trim(e.type), '') is not null
on conflict (name) do nothing;

alter table public.equipment_type_catalog enable row level security;

drop policy if exists equipment_type_catalog_select_authenticated on public.equipment_type_catalog;
create policy equipment_type_catalog_select_authenticated
on public.equipment_type_catalog
for select
to authenticated
using ((select private.current_access_level()) is not null);

drop policy if exists equipment_type_catalog_insert_admin on public.equipment_type_catalog;
create policy equipment_type_catalog_insert_admin
on public.equipment_type_catalog
for insert
to authenticated
with check ((select private.current_access_level()) = 'admin');

drop policy if exists equipment_type_catalog_update_admin on public.equipment_type_catalog;
create policy equipment_type_catalog_update_admin
on public.equipment_type_catalog
for update
to authenticated
using ((select private.current_access_level()) = 'admin')
with check ((select private.current_access_level()) = 'admin');

drop policy if exists equipment_type_catalog_delete_admin on public.equipment_type_catalog;
create policy equipment_type_catalog_delete_admin
on public.equipment_type_catalog
for delete
to authenticated
using ((select private.current_access_level()) = 'admin');

grant select, insert, update, delete on public.equipment_type_catalog to authenticated;
