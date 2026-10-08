create table if not exists public.labcontrol_budgets (
  budget_year integer primary key check (budget_year between 2000 and 2100),
  annual_budget numeric(14, 2) not null default 0 check (annual_budget >= 0),
  currency text not null default 'CLP',
  allocation_method text not null default 'forecast_weighted'
    check (allocation_method in ('forecast_weighted', 'asset_value_weighted', 'equal_per_equipment')),
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_labcontrol_budgets_updated_at on public.labcontrol_budgets;
create trigger set_labcontrol_budgets_updated_at
before update on public.labcontrol_budgets
for each row execute function public.set_updated_at();

alter table public.labcontrol_budgets enable row level security;

drop policy if exists labcontrol_budgets_select_authenticated on public.labcontrol_budgets;
create policy labcontrol_budgets_select_authenticated
on public.labcontrol_budgets
for select
to authenticated
using ((select private.current_access_level()) is not null);

drop policy if exists labcontrol_budgets_insert_editor on public.labcontrol_budgets;
create policy labcontrol_budgets_insert_editor
on public.labcontrol_budgets
for insert
to authenticated
with check ((select private.current_access_level()) in ('admin', 'editor'));

drop policy if exists labcontrol_budgets_update_editor on public.labcontrol_budgets;
create policy labcontrol_budgets_update_editor
on public.labcontrol_budgets
for update
to authenticated
using ((select private.current_access_level()) in ('admin', 'editor'))
with check ((select private.current_access_level()) in ('admin', 'editor'));

grant select, insert, update on public.labcontrol_budgets to authenticated;

insert into public.labcontrol_budgets (budget_year, annual_budget, allocation_method, notes)
values (extract(year from current_date)::integer, 0, 'forecast_weighted', 'Presupuesto anual de mantenimiento editable desde LabControl-EquiposHG.')
on conflict (budget_year) do nothing;
