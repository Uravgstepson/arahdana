-- ArahDana v0.4 Supabase schema.
-- Run this in the Supabase SQL editor with the anon key used by the app.
-- Never use or expose a service role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  local_id text,
  name text not null,
  type text not null,
  ticker text,
  buy_price numeric not null default 0,
  quantity numeric not null default 0,
  current_price numeric not null default 0,
  buy_date date not null default current_date,
  notes text,
  risk_category text not null default 'medium',
  data_source text not null default 'manual_input',
  last_price_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  type text not null,
  target_buy_zone text not null,
  notes text,
  status text not null default 'watching',
  data_source text not null default 'manual_input',
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  capital numeric not null default 10000000,
  risk_tolerance numeric not null default 15,
  time_horizon text not null default 'medium',
  preferred_instruments jsonb not null default '["money_market_fund","bond_fund","stock"]'::jsonb,
  apr_money_market_fund numeric not null default 0.05,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  type text not null,
  ticker text,
  result jsonb not null,
  price_source_label text not null,
  is_mock_data boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.portfolios add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.portfolios add column if not exists name text not null default 'Default';
alter table public.portfolios add column if not exists created_at timestamptz not null default now();
alter table public.portfolios add column if not exists updated_at timestamptz not null default now();

alter table public.holdings add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.holdings add column if not exists portfolio_id uuid references public.portfolios(id) on delete cascade;
alter table public.holdings add column if not exists local_id text;
alter table public.holdings add column if not exists name text not null default 'Untitled holding';
alter table public.holdings add column if not exists type text not null default 'stock';
alter table public.holdings add column if not exists ticker text;
alter table public.holdings add column if not exists buy_price numeric not null default 0;
alter table public.holdings add column if not exists quantity numeric not null default 0;
alter table public.holdings add column if not exists current_price numeric not null default 0;
alter table public.holdings add column if not exists buy_date date not null default current_date;
alter table public.holdings add column if not exists notes text;
alter table public.holdings add column if not exists risk_category text not null default 'medium';
alter table public.holdings add column if not exists data_source text not null default 'manual_input';
alter table public.holdings add column if not exists last_price_updated_at timestamptz;
alter table public.holdings add column if not exists created_at timestamptz not null default now();
alter table public.holdings add column if not exists updated_at timestamptz not null default now();

alter table public.watchlist_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.watchlist_items add column if not exists local_id text;
alter table public.watchlist_items add column if not exists name text not null default 'Untitled watchlist item';
alter table public.watchlist_items add column if not exists type text not null default 'stock';
alter table public.watchlist_items add column if not exists target_buy_zone text not null default '-';
alter table public.watchlist_items add column if not exists notes text;
alter table public.watchlist_items add column if not exists status text not null default 'watching';
alter table public.watchlist_items add column if not exists data_source text not null default 'manual_input';
alter table public.watchlist_items add column if not exists last_analyzed_at timestamptz;
alter table public.watchlist_items add column if not exists created_at timestamptz not null default now();
alter table public.watchlist_items add column if not exists updated_at timestamptz not null default now();

alter table public.user_settings add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_settings add column if not exists capital numeric not null default 10000000;
alter table public.user_settings add column if not exists risk_tolerance numeric not null default 15;
alter table public.user_settings add column if not exists time_horizon text not null default 'medium';
alter table public.user_settings add column if not exists preferred_instruments jsonb not null default '["money_market_fund","bond_fund","stock"]'::jsonb;
alter table public.user_settings add column if not exists apr_money_market_fund numeric not null default 0.05;
alter table public.user_settings add column if not exists created_at timestamptz not null default now();
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

alter table public.analysis_results add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.analysis_results add column if not exists local_id text;
alter table public.analysis_results add column if not exists name text not null default 'Untitled analysis';
alter table public.analysis_results add column if not exists type text not null default 'stock';
alter table public.analysis_results add column if not exists ticker text;
alter table public.analysis_results add column if not exists result jsonb not null default '{}'::jsonb;
alter table public.analysis_results add column if not exists price_source_label text not null default 'Data tidak diketahui';
alter table public.analysis_results add column if not exists is_mock_data boolean not null default false;
alter table public.analysis_results add column if not exists created_at timestamptz not null default now();

create unique index if not exists portfolios_user_id_name_key on public.portfolios (user_id, name);
create unique index if not exists holdings_user_id_local_id_key on public.holdings (user_id, local_id);
create unique index if not exists watchlist_items_user_id_local_id_key on public.watchlist_items (user_id, local_id);
create unique index if not exists analysis_results_user_id_local_id_key on public.analysis_results (user_id, local_id);

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.user_settings enable row level security;
alter table public.analysis_results enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "portfolios_select_own" on public.portfolios;
create policy "portfolios_select_own"
on public.portfolios
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "portfolios_insert_own" on public.portfolios;
create policy "portfolios_insert_own"
on public.portfolios
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "portfolios_update_own" on public.portfolios;
create policy "portfolios_update_own"
on public.portfolios
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "portfolios_delete_own" on public.portfolios;
create policy "portfolios_delete_own"
on public.portfolios
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "holdings_select_own" on public.holdings;
create policy "holdings_select_own"
on public.holdings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "holdings_insert_own" on public.holdings;
create policy "holdings_insert_own"
on public.holdings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "holdings_update_own" on public.holdings;
create policy "holdings_update_own"
on public.holdings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "holdings_delete_own" on public.holdings;
create policy "holdings_delete_own"
on public.holdings
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "watchlist_select_own" on public.watchlist_items;
create policy "watchlist_select_own"
on public.watchlist_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "watchlist_insert_own" on public.watchlist_items;
create policy "watchlist_insert_own"
on public.watchlist_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "watchlist_update_own" on public.watchlist_items;
create policy "watchlist_update_own"
on public.watchlist_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "watchlist_delete_own" on public.watchlist_items;
create policy "watchlist_delete_own"
on public.watchlist_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own"
on public.user_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own"
on public.user_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own"
on public.user_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "analysis_select_own" on public.analysis_results;
create policy "analysis_select_own"
on public.analysis_results
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "analysis_insert_own" on public.analysis_results;
create policy "analysis_insert_own"
on public.analysis_results
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "analysis_update_own" on public.analysis_results;
create policy "analysis_update_own"
on public.analysis_results
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "analysis_delete_own" on public.analysis_results;
create policy "analysis_delete_own"
on public.analysis_results
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Refresh PostgREST schema cache after table/policy changes.
-- This prevents PGRST205 "table not found in schema cache" right after running the migration.
notify pgrst, 'reload schema';
