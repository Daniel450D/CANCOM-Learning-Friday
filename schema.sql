-- =====================================================================
-- CANCOM Learning Friday – Supabase-Schema
-- Ausführen im Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------

create table if not exists employees (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- Alle Punktebewegungen landen in EINER Tabelle:
--   * normale Lern-Einträge (Kategorie + feste Punkte, note = Kommentar)
--   * Startpunkte (Übertrag der bisher händisch gezählten Punkte)
--   * manuelle Korrekturen durch Admins (auch negative Punkte möglich)
-- Das ist die einfachste saubere Variante: der Punktestand eines
-- Mitarbeiters ist immer sum(points) über alle seine entries.
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  category    text not null,
  points      integer not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists entries_employee_id_idx on entries (employee_id);
create index if not exists entries_created_at_idx on entries (created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security
-- Internes Tool ohne Login: der anon-Key darf lesen und schreiben.
-- ---------------------------------------------------------------------

alter table employees enable row level security;
alter table entries   enable row level security;

create policy "anon select employees" on employees for select to anon using (true);
create policy "anon insert employees" on employees for insert to anon with check (true);
create policy "anon delete employees" on employees for delete to anon using (true);

create policy "anon select entries" on entries for select to anon using (true);
create policy "anon insert entries" on entries for insert to anon with check (true);
create policy "anon update entries" on entries for update to anon using (true) with check (true);
create policy "anon delete entries" on entries for delete to anon using (true);

-- ---------------------------------------------------------------------
-- Seed: Mitarbeiterliste
-- ---------------------------------------------------------------------

insert into employees (name) values
  ('Agnieszka Matuszek-Misiura'),
  ('Alexander Zinchenko'),
  ('Alexandra Franz'),
  ('Carlos Malter'),
  ('Christian Baar'),
  ('Daniela Englbrecht'),
  ('David Dziallas'),
  ('Eric Verzendaal'),
  ('Eva Dölle'),
  ('Fabienne Eichinger'),
  ('Frank Wziontek'),
  ('Gabriela Maria Dreher'),
  ('Helena Schweiger'),
  ('Hubert-Wilhelm Domröse'),
  ('Igor Zwitkis'),
  ('Ilona Käser'),
  ('Jutta Gürses'),
  ('Kiriazis Papaloudis'),
  ('Kirill Hilpert'),
  ('Markus Karadeniz'),
  ('Maurice Menke'),
  ('Melanie Lakowski'),
  ('Michael Martin'),
  ('Michael Spengler'),
  ('Oliver Parpart'),
  ('Patrick Wurmdobler'),
  ('Petra Törteli'),
  ('Ray Viebrock'),
  ('Rhett Peter'),
  ('Sandra Bartels'),
  ('Siraj Hasan'),
  ('Stefano Canali')
on conflict (name) do nothing;
