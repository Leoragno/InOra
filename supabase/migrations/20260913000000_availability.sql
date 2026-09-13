-- Porting di "Disponibilità" dalla vecchia app: l'admin definisce delle
-- settimane (es. turni oratorio estivo) con i giorni attivi (lun-ven,
-- indice 0-4), ogni animatore segna Sì/No/note per ogni giorno, l'admin
-- vede il riepilogo e può "chiudere" una settimana per bloccare modifiche.

create table if not exists public.availability_weeks (
  id uuid primary key default gen_random_uuid(),
  oratory_id oratory_id not null references public.oratories (id),
  name text not null,
  date_info text not null default '',
  active_days smallint[] not null default '{0,1,2,3,4}',
  closed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists availability_weeks_oratory_idx on public.availability_weeks (oratory_id, sort_order);

create table if not exists public.availability_responses (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.availability_weeks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_index smallint not null,
  status text check (status in ('disponibile', 'non_disponibile')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (week_id, user_id, day_index)
);
create index if not exists availability_responses_week_idx on public.availability_responses (week_id);

alter table public.availability_weeks enable row level security;
alter table public.availability_responses enable row level security;

create policy "availability_weeks select" on public.availability_weeks for select to authenticated
  using (oratory_id = any(public.scoped_oratories()));

create policy "availability_weeks manage by admin" on public.availability_weeks for all to authenticated
  using (public.is_admin() and oratory_id = any(public.scoped_oratories()))
  with check (public.is_admin() and oratory_id = any(public.scoped_oratories()));

create policy "availability_responses select own" on public.availability_responses for select to authenticated
  using (user_id = auth.uid());
create policy "availability_responses select scoped by admin" on public.availability_responses for select to authenticated
  using (public.is_admin() and exists (
    select 1 from public.availability_weeks w where w.id = week_id and w.oratory_id = any(public.scoped_oratories())
  ));

create policy "availability_responses insert own" on public.availability_responses for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.availability_weeks w where w.id = week_id and not w.closed
  ));
create policy "availability_responses update own" on public.availability_responses for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.availability_weeks w where w.id = week_id and not w.closed
  ));
