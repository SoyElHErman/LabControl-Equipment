alter table public.equipment_events
  add column if not exists plan_type text;
