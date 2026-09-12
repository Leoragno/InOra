-- Chiude una falla: la policy "profiles update own" permette a un utente di
-- modificare la propria riga, ma non limita QUALI colonne — quindi un
-- animatore poteva auto-promuoversi a admin_general/active con una PATCH
-- diretta. Un trigger blocca il cambio di role/status a chiunque non sia
-- già admin (gli admin restano liberi di approvare/promuovere gli altri).
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() è nullo quando non c'è una sessione Supabase Auth (SQL editor,
  -- migrazioni, service_role): un contesto già pienamente fidato, da non bloccare.
  if auth.uid() is null then
    return new;
  end if;
  if (new.role is distinct from old.role or new.status is distinct from old.status) then
    if not public.is_admin() then
      raise exception 'Non hai i permessi per modificare ruolo o stato del profilo.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();
