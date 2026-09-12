-- ============================================================================
-- RESET: rimuove lo schema della vecchia app (Leoragno/timbratura).
-- I dati reali (utenti, timbrature, impostazioni, notifiche_admin) sono stati
-- esportati in locale prima di eseguire questa migrazione.
-- ============================================================================
drop table if exists public.notifiche_admin cascade;
drop table if exists public.timbrature cascade;
drop table if exists public.impostazioni cascade;
drop table if exists public.utenti cascade;

create extension if not exists pgcrypto;

-- ============================================================================
-- ENUM
-- ============================================================================
do $$ begin create type public.app_role as enum ('animatore','admin_jerago','admin_besnate','admin_general'); exception when duplicate_object then null; end $$;
do $$ begin create type public.profile_status as enum ('pending','active','rejected','disabled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.oratory_id as enum ('jerago','besnate'); exception when duplicate_object then null; end $$;
do $$ begin create type public.time_entry_type as enum ('entry','exit'); exception when duplicate_object then null; end $$;
do $$ begin create type public.timbratura_method as enum ('gps','qr','manuale'); exception when duplicate_object then null; end $$;
do $$ begin create type public.trust_status as enum ('ok','watch','suspicious'); exception when duplicate_object then null; end $$;
do $$ begin create type public.form_target_type as enum ('all','oratory','specific'); exception when duplicate_object then null; end $$;
do $$ begin create type public.question_type as enum ('yesno','text','number','date','choice','checkbox'); exception when duplicate_object then null; end $$;
do $$ begin create type public.form_status as enum ('open','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.audit_action as enum (
  'time_entry.create','time_entry.edit','profile.approve','profile.reject',
  'profile.disable','oratory.gps_update','form.create','form.response'
); exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABELLE
-- ============================================================================
create table if not exists public.oratories (
  id oratory_id primary key,
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  gps_enabled boolean not null default true,
  gps_radius integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_year integer not null,
  email text not null,
  role app_role not null default 'animatore',
  oratory_id oratory_id references public.oratories (id),
  status profile_status not null default 'pending',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  oratory_id oratory_id not null references public.oratories (id),
  type time_entry_type not null,
  timestamp timestamptz not null,
  latitude double precision,
  longitude double precision,
  gps_accuracy double precision,
  distance_from_oratory double precision,
  metodo_timbratura timbratura_method not null default 'gps',
  fiducia_score integer,
  fiducia_stato trust_status,
  fiducia_motivi text[] not null default '{}',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists time_entries_user_id_idx on public.time_entries (user_id, timestamp);
create index if not exists time_entries_oratory_id_idx on public.time_entries (oratory_id, timestamp);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  created_by uuid not null references public.profiles (id),
  target_type form_target_type not null default 'all',
  target_oratories oratory_id[] not null default '{}',
  target_user_ids uuid[] not null default '{}',
  deadline timestamptz,
  status form_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  question text not null,
  type question_type not null,
  options text[] not null default '{}',
  required boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (form_id, user_id)
);

create table if not exists public.form_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.form_responses (id) on delete cascade,
  question_id uuid not null references public.form_questions (id) on delete cascade,
  answer text not null default ''
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  action audit_action not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ============================================================================
-- SEED oratori (stessi valori del demo-store locale)
-- ============================================================================
insert into public.oratories (id, name, address, latitude, longitude, gps_enabled, gps_radius) values
  ('jerago', 'Jerago', 'Via Roma 1, Jerago con Orago (VA)', 45.6973, 8.7981, true, 50),
  ('besnate', 'Besnate', 'Piazza Chiesa 3, Besnate (VA)', 45.6701, 8.8283, false, 75)
on conflict (id) do nothing;

-- ============================================================================
-- HELPER (security definer: evitano ricorsione nelle policy su profiles)
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin_jerago','admin_besnate','admin_general'), false);
$$;

create or replace function public.scoped_oratories()
returns oratory_id[]
language sql stable security definer set search_path = public as $$
  select case (select role from public.profiles where id = auth.uid())
    when 'admin_general' then array['jerago','besnate']::oratory_id[]
    when 'admin_jerago' then array['jerago']::oratory_id[]
    when 'admin_besnate' then array['besnate']::oratory_id[]
    else array[(select oratory_id from public.profiles where id = auth.uid())]
  end;
$$;

-- ============================================================================
-- TRIGGER: crea il profilo (stato "pending") alla registrazione
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, birth_year, email, oratory_id, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce((new.raw_user_meta_data ->> 'birth_year')::int, extract(year from now())::int),
    new.email,
    nullif(new.raw_user_meta_data ->> 'oratory_id', '')::oratory_id,
    'animatore',
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.oratories enable row level security;
alter table public.profiles enable row level security;
alter table public.time_entries enable row level security;
alter table public.forms enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_responses enable row level security;
alter table public.form_answers enable row level security;
alter table public.audit_logs enable row level security;

create policy "oratories select" on public.oratories for select to authenticated using (true);
create policy "oratories update by admin" on public.oratories for update to authenticated
  using (id = any(public.scoped_oratories()) and public.is_admin());

create policy "profiles select own" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles select scoped by admin" on public.profiles for select to authenticated
  using (public.is_admin() and oratory_id = any(public.scoped_oratories()));
create policy "profiles insert self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid());
create policy "profiles update scoped by admin" on public.profiles for update to authenticated
  using (public.is_admin() and oratory_id = any(public.scoped_oratories()));

-- time_entries/forms/audit_logs: policy di base, verranno raffinate quando questi
-- service verranno migrati dal demo-store locale a Supabase (fase 2).
create policy "time_entries select own" on public.time_entries for select to authenticated
  using (user_id = auth.uid());
create policy "time_entries select scoped by admin" on public.time_entries for select to authenticated
  using (public.is_admin() and oratory_id = any(public.scoped_oratories()));
create policy "time_entries insert own" on public.time_entries for insert to authenticated
  with check (user_id = auth.uid());
create policy "time_entries update scoped by admin" on public.time_entries for update to authenticated
  using (public.is_admin() and oratory_id = any(public.scoped_oratories()));

create policy "forms select" on public.forms for select to authenticated using (true);
create policy "forms manage by admin" on public.forms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "form_questions select" on public.form_questions for select to authenticated using (true);
create policy "form_questions manage by admin" on public.form_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "form_responses select own or admin" on public.form_responses for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "form_responses insert own" on public.form_responses for insert to authenticated
  with check (user_id = auth.uid());

create policy "form_answers select own or admin" on public.form_answers for select to authenticated
  using (exists (select 1 from public.form_responses r where r.id = response_id and (r.user_id = auth.uid() or public.is_admin())));
create policy "form_answers insert own" on public.form_answers for insert to authenticated
  with check (exists (select 1 from public.form_responses r where r.id = response_id and r.user_id = auth.uid()));

create policy "audit_logs select by admin" on public.audit_logs for select to authenticated
  using (public.is_admin());
create policy "audit_logs insert own" on public.audit_logs for insert to authenticated
  with check (user_id = auth.uid());
