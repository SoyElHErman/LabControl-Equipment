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

create index if not exists app_user_invites_invited_by_idx on public.app_user_invites (invited_by);
create index if not exists equipments_created_by_idx on public.equipments (created_by);
create index if not exists equipments_updated_by_idx on public.equipments (updated_by);
create index if not exists equipment_events_equipment_id_idx on public.equipment_events (equipment_id);
create index if not exists equipment_events_user_id_idx on public.equipment_events (user_id);

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
