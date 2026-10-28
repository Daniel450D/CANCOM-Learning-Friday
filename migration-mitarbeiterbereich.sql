-- =====================================================================
-- CANCOM Learning Friday – Migration: Mitarbeiterbereich
-- Ausführen im Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
--
-- Fügt jedem Mitarbeiter ein eigenes Passwort hinzu. Gespeichert wird
-- nur ein SHA-256-Hash (mit festem Salt), niemals das Klartext-Passwort.
-- Mitarbeiter ohne Hash setzen ihr Passwort beim ersten Login selbst.
-- =====================================================================

alter table employees
  add column if not exists password_hash text,
  add column if not exists password_set_at timestamptz;

-- Der anon-Key muss employees aktualisieren dürfen,
-- damit Passwort setzen/ändern funktioniert.
drop policy if exists "anon update employees" on employees;
create policy "anon update employees" on employees
  for update to anon using (true) with check (true);
