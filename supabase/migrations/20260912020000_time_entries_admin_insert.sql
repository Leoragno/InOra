-- manualCorrectDay (correzione admin di una giornata) deve poter inserire
-- una timbratura mancante per conto di un animatore del proprio scope,
-- non solo per sé stesso.
create policy "time_entries insert scoped by admin" on public.time_entries for insert to authenticated
  with check (public.is_admin() and oratory_id = any(public.scoped_oratories()));
