-- Notifiche push: la sottoscrizione (endpoint + chiavi) di ogni dispositivo
-- di ogni animatore/admin che ha attivato le notifiche. Letta ed usata dalla
-- Edge Function "send-push" (già esistente su questo progetto, con service
-- role key e chiavi VAPID già configurate come secret).
--
-- RESET: la tabella push_subscriptions esisteva già dalla vecchia app, con
-- user_id bigint che puntava alla vecchia tabella utenti (già eliminata in
-- una migrazione precedente) — le 7 righe erano quindi già orfane. Backup
-- salvato in locale prima di questa migrazione.
drop table if exists public.push_subscriptions cascade;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_json jsonb not null,
  created_at timestamptz not null default now()
);
create unique index if not exists push_subscriptions_user_endpoint_idx
  on public.push_subscriptions (user_id, (subscription_json ->> 'endpoint'));

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions manage own" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- La Edge Function usa la service role key (bypassa la RLS): questa policy
-- serve solo per far funzionare eventuali letture admin lato client in futuro.
create policy "push_subscriptions select by admin" on public.push_subscriptions for select to authenticated
  using (public.is_admin());
