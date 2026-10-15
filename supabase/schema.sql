-- ==============================================================================
-- VORRAT APP - SUPABASE DATABASE SCHEMA & RLS SETUP
-- Project: auwrcldqfapejhdwjzbg (https://auwrcldqfapejhdwjzbg.supabase.co)
-- ==============================================================================
-- Anleitung:
-- 1. Öffne das Supabase Dashboard: https://supabase.com/dashboard/project/auwrcldqfapejhdwjzbg/sql/new
-- 2. Füge dieses gesamte SQL-Skript in den SQL Editor ein.
-- 3. Klicke auf "Run" (unten rechts).
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. HAUPTTABELLE: vorrat_user_data
-- Speichert Vorrat, Einkaufsliste, eigene Rezepte, Essensplanung und Favoriten pro Nutzer/Haushalt
create table if not exists public.vorrat_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_name text default 'Unsere Küche' not null,
  pantry jsonb default '[]'::jsonb not null,
  groceries jsonb default '[]'::jsonb not null,
  custom_recipes jsonb default '[]'::jsonb not null,
  meal_plan jsonb default '[]'::jsonb not null,
  favorites jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index für schnelle Lookups
create index if not exists idx_vorrat_user_data_updated_at on public.vorrat_user_data(updated_at desc);

-- 3. AUTOMATISCHER TIMESTAMP TRIGGER FÜR updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_vorrat_user_data_timestamp on public.vorrat_user_data;
create trigger set_vorrat_user_data_timestamp
  before update on public.vorrat_user_data
  for each row execute function public.handle_updated_at();

-- 4. ROW LEVEL SECURITY (RLS)
-- Stellt sicher, dass jeder Nutzer nur Zugriff auf seine eigenen Daten hat!
alter table public.vorrat_user_data enable row level security;

-- Policy: Nur der eingeloggte Nutzer kann seine eigenen Daten lesen
drop policy if exists "Users can view their own vorrat data" on public.vorrat_user_data;
create policy "Users can view their own vorrat data"
  on public.vorrat_user_data
  for select
  using (auth.uid() = user_id);

-- Policy: Nur der eingeloggte Nutzer kann seine eigenen Daten anlegen
drop policy if exists "Users can insert their own vorrat data" on public.vorrat_user_data;
create policy "Users can insert their own vorrat data"
  on public.vorrat_user_data
  for insert
  with check (auth.uid() = user_id);

-- Policy: Nur der eingeloggte Nutzer kann seine eigenen Daten aktualisieren
drop policy if exists "Users can update their own vorrat data" on public.vorrat_user_data;
create policy "Users can update their own vorrat data"
  on public.vorrat_user_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Nur der eingeloggte Nutzer kann seine eigenen Daten löschen
drop policy if exists "Users can delete their own vorrat data" on public.vorrat_user_data;
create policy "Users can delete their own vorrat data"
  on public.vorrat_user_data
  for delete
  using (auth.uid() = user_id);

-- 5. AUTOMATISCHE INITIALISIERUNG BEI REGISTRIERUNG (OPTIONALER HOOK)
-- Erstellt bei neuer E-Mail-Registrierung automatisch einen leeren Datensatz
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.vorrat_user_data (user_id, household_name, pantry, groceries, custom_recipes, meal_plan, favorites)
  values (
    new.id,
    'Unsere Küche',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- FERTIG! Deine Datenbank ist jetzt vollständig konfiguriert und geschützt.
-- ==============================================================================
