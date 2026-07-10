-- My Little Secret Diary — Supabase schema
-- Run this once: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Creates the tables + row-level security so each person only ever sees their
-- own data. (Photos are stored compressed inside each entry row for v1.)

-- 1. PROFILES ("Tell me about yourself") -----------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name   text,
  last_name    text,
  gender       text,
  address      text,
  phone        text,
  email        text,
  interests    jsonb default '[]'::jsonb,
  about        text,
  avatar_url   text,               -- small compressed avatar (data URL)
  birth_month  int,
  birth_day    int,
  updated_at   timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

-- 2. ENTRIES (one page per day) --------------------------------------------
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  html       text default '',        -- rich-text body
  content    text default '',        -- plain-text mirror (search/previews)
  photos     jsonb default '[]'::jsonb,  -- [{ id, dataUrl }] compressed images
  updated_at timestamptz default now(),
  unique (user_id, day)
);
alter table public.entries enable row level security;
create policy "entries: all own" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists entries_user_day_idx on public.entries (user_id, day desc);
