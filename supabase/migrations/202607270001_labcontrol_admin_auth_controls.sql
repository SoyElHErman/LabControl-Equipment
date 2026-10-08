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
  created_by_admin boolean;
begin
  clean_email := lower(coalesce(new.email, ''));
  created_by_admin := coalesce((new.raw_user_meta_data ->> 'created_by_labcontrol_admin')::boolean, false);

  select *
  into invite_row
  from public.app_user_invites
  where email = clean_email
    and status = 'pending'
  limit 1;

  select count(*) into profile_count from public.profiles;

  if profile_count > 0 and invite_row.id is null and created_by_admin = false then
    raise exception 'Cuenta no autorizada. Solicita acceso al administrador de LabControl.';
  end if;

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
