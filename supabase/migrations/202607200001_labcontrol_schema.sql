create schema if not exists private;

revoke all on schema private from public;
grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  initials text,
  job_role text,
  area text,
  access_level text not null default 'viewer'
    check (access_level in ('admin', 'editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_user_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  initials text,
  job_role text,
  area text,
  access_level text not null default 'viewer'
    check (access_level in ('admin', 'editor', 'viewer')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.equipments (
  id text primary key,
  asset_tag text not null unique,
  name text not null,
  type text not null,
  manufacturer text,
  provider text,
  model text,
  serial text,
  location text,
  owner_name text,
  status text not null default 'Operativo',
  criticality text not null default 'Media',
  acquisition_date date,
  commercial_value numeric(14, 2) not null default 0,
  commercial_value_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_plans (
  equipment_id text not null references public.equipments(id) on delete cascade,
  service_type text not null,
  frequency_months integer not null default 12 check (frequency_months > 0),
  next_due date,
  last_done date,
  cost numeric(14, 2) not null default 0,
  provider text,
  contract text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (equipment_id, service_type)
);

create table if not exists public.equipment_events (
  id text primary key,
  equipment_id text references public.equipments(id) on delete cascade,
  event_date date not null,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  result text not null,
  cost numeric(14, 2) not null default 0,
  provider text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_access_level_idx on public.profiles (access_level);
create index if not exists profiles_active_idx on public.profiles (is_active);
create index if not exists invites_status_idx on public.app_user_invites (status);
create index if not exists app_user_invites_invited_by_idx on public.app_user_invites (invited_by);
create index if not exists equipments_type_idx on public.equipments (type);
create index if not exists equipments_status_idx on public.equipments (status);
create index if not exists equipments_created_by_idx on public.equipments (created_by);
create index if not exists equipments_updated_by_idx on public.equipments (updated_by);
create index if not exists service_plans_next_due_idx on public.service_plans (next_due);
create index if not exists equipment_events_equipment_id_idx on public.equipment_events (equipment_id);
create index if not exists equipment_events_user_id_idx on public.equipment_events (user_id);
create index if not exists equipment_events_date_idx on public.equipment_events (event_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_invites_updated_at on public.app_user_invites;
create trigger set_invites_updated_at
before update on public.app_user_invites
for each row execute function public.set_updated_at();

drop trigger if exists set_equipments_updated_at on public.equipments;
create trigger set_equipments_updated_at
before update on public.equipments
for each row execute function public.set_updated_at();

drop trigger if exists set_service_plans_updated_at on public.service_plans;
create trigger set_service_plans_updated_at
before update on public.service_plans
for each row execute function public.set_updated_at();

create or replace function private.current_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.access_level
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active = true
  limit 1
$$;

revoke all on function private.current_access_level() from public;
grant execute on function private.current_access_level() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.app_user_invites%rowtype;
  profile_count integer;
  clean_email text;
  display_name text;
begin
  clean_email := lower(coalesce(new.email, ''));

  select *
  into invite_row
  from public.app_user_invites
  where email = clean_email
    and status = 'pending'
  limit 1;

  select count(*) into profile_count from public.profiles;

  display_name := coalesce(
    nullif(invite_row.name, ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(clean_email, '@', 1)
  );

  insert into public.profiles (
    id,
    email,
    name,
    initials,
    job_role,
    area,
    access_level,
    is_active
  )
  values (
    new.id,
    clean_email,
    display_name,
    coalesce(nullif(invite_row.initials, ''), upper(left(display_name, 2))),
    coalesce(nullif(invite_row.job_role, ''), 'Usuario de laboratorio'),
    coalesce(nullif(invite_row.area, ''), 'Laboratorio'),
    case
      when profile_count = 0 then 'admin'
      when invite_row.id is not null then invite_row.access_level
      else 'viewer'
    end,
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        initials = excluded.initials,
        job_role = excluded.job_role,
        area = excluded.area,
        updated_at = now();

  if invite_row.id is not null then
    update public.app_user_invites
    set status = 'accepted',
        accepted_at = now()
    where id = invite_row.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.app_user_invites enable row level security;
alter table public.equipments enable row level security;
alter table public.service_plans enable row level security;
alter table public.equipment_events enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check ((select private.current_access_level()) = 'admin');

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using ((select private.current_access_level()) = 'admin')
with check ((select private.current_access_level()) = 'admin');

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (
  (select private.current_access_level()) = 'admin'
  and id <> (select auth.uid())
);

drop policy if exists invites_admin_select on public.app_user_invites;
create policy invites_admin_select
on public.app_user_invites
for select
to authenticated
using ((select private.current_access_level()) = 'admin');

drop policy if exists invites_admin_insert on public.app_user_invites;
create policy invites_admin_insert
on public.app_user_invites
for insert
to authenticated
with check ((select private.current_access_level()) = 'admin');

drop policy if exists invites_admin_update on public.app_user_invites;
create policy invites_admin_update
on public.app_user_invites
for update
to authenticated
using ((select private.current_access_level()) = 'admin')
with check ((select private.current_access_level()) = 'admin');

drop policy if exists invites_admin_delete on public.app_user_invites;
create policy invites_admin_delete
on public.app_user_invites
for delete
to authenticated
using ((select private.current_access_level()) = 'admin');

drop policy if exists equipments_select_authenticated on public.equipments;
create policy equipments_select_authenticated
on public.equipments
for select
to authenticated
using ((select private.current_access_level()) is not null);

drop policy if exists equipments_write_editor on public.equipments;
drop policy if exists equipments_insert_editor on public.equipments;
create policy equipments_insert_editor
on public.equipments
for insert
to authenticated
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists equipments_update_editor on public.equipments;
create policy equipments_update_editor
on public.equipments
for update
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'))
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists equipments_delete_editor on public.equipments;
create policy equipments_delete_editor
on public.equipments
for delete
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists service_plans_select_authenticated on public.service_plans;
create policy service_plans_select_authenticated
on public.service_plans
for select
to authenticated
using ((select private.current_access_level()) is not null);

drop policy if exists service_plans_write_editor on public.service_plans;
drop policy if exists service_plans_insert_editor on public.service_plans;
create policy service_plans_insert_editor
on public.service_plans
for insert
to authenticated
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists service_plans_update_editor on public.service_plans;
create policy service_plans_update_editor
on public.service_plans
for update
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'))
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists service_plans_delete_editor on public.service_plans;
create policy service_plans_delete_editor
on public.service_plans
for delete
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists equipment_events_select_authenticated on public.equipment_events;
create policy equipment_events_select_authenticated
on public.equipment_events
for select
to authenticated
using ((select private.current_access_level()) is not null);

drop policy if exists equipment_events_write_editor on public.equipment_events;
drop policy if exists equipment_events_insert_editor on public.equipment_events;
create policy equipment_events_insert_editor
on public.equipment_events
for insert
to authenticated
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists equipment_events_update_editor on public.equipment_events;
create policy equipment_events_update_editor
on public.equipment_events
for update
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'))
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists equipment_events_delete_editor on public.equipment_events;
create policy equipment_events_delete_editor
on public.equipment_events
for delete
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'));

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.app_user_invites to authenticated;
grant select, insert, update, delete on public.equipments to authenticated;
grant select, insert, update, delete on public.service_plans to authenticated;
grant select, insert, update, delete on public.equipment_events to authenticated;
