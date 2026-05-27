-- ArahDana v1.0 Beta Supabase schema.
-- Run this in the Supabase SQL editor with the anon key used by the app.
-- Never use or expose a service role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  full_name text,
  avatar_url text,
  provider text,
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
  market_asset_id uuid,
  price_tracking_mode text not null default 'manual',
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
  language text not null default 'id',
  apr_money_market_fund numeric not null default 0.05,
  notification_preferences jsonb not null default '{"enabled":true,"browserEnabled":false,"reminderFrequency":"monthly","enabledTypes":["reminder","risk","watchlist","goal","portfolio","market"],"quietMode":false,"mobileVibration":false,"weeklySummary":true,"lastGeneratedAt":{}}'::jsonb,
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

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  message text not null,
  page text,
  app_version text not null,
  page_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  category text not null default 'custom',
  name text not null,
  target_amount numeric not null default 0,
  target_date date not null default current_date,
  monthly_contribution numeric not null default 0,
  risk_tolerance numeric not null default 15,
  risk_profile text not null default 'balanced',
  preferred_instruments jsonb not null default '[]'::jsonb,
  linked_holding_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  goal_local_id text not null,
  amount numeric not null default 0,
  contribution_month text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  ticker text,
  instrument_name text,
  alert_type text not null,
  target_price numeric,
  buy_zone_from numeric,
  buy_zone_to numeric,
  risk_threshold numeric,
  volatility_threshold numeric,
  loss_threshold numeric,
  allocation_threshold numeric,
  enabled boolean not null default true,
  notes text,
  source_type text not null default 'manual',
  source_id text,
  last_checked_at timestamptz,
  last_triggered_at timestamptz,
  last_check_status text,
  last_check_message text,
  last_observed_verdict text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.portfolio_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  report_type text not null default 'monthly',
  title text not null default 'Portfolio review',
  period_start timestamptz not null default now(),
  period_end timestamptz not null default now(),
  generated_at timestamptz not null default now(),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  local_id text,
  name text not null,
  email text not null,
  investment_experience text not null default 'beginner',
  feedback_interest text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.beta_test_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  local_id text,
  rating integer not null default 4,
  confusing text not null default '',
  useful text not null default '',
  bugs text not null default '',
  feature_request text not null default '',
  checklist jsonb not null default '{}'::jsonb,
  email text,
  app_version text not null default 'ArahDana unknown',
  page_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.market_assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  display_name text not null,
  search_aliases text[] not null default '{}',
  type text not null,
  exchange text,
  currency text,
  logo_url text,
  provider text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, symbol, exchange)
);

create table if not exists public.market_quotes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.market_assets(id) on delete cascade,
  price numeric,
  change numeric,
  change_percent numeric,
  currency text,
  market_status text not null default 'unknown',
  is_delayed boolean not null default true,
  source text not null,
  updated_at timestamptz not null default now(),
  unique (asset_id)
);

create table if not exists public.market_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.market_assets(id) on delete cascade,
  target_price numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table if not exists public.market_price_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.market_assets(id) on delete cascade,
  price numeric not null,
  captured_at timestamptz not null default now(),
  source text not null
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists provider text;
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
alter table public.holdings add column if not exists market_asset_id uuid references public.market_assets(id) on delete set null;
alter table public.holdings add column if not exists price_tracking_mode text not null default 'manual';
alter table public.holdings drop constraint if exists holdings_market_asset_id_fkey;
alter table public.holdings
  add constraint holdings_market_asset_id_fkey
  foreign key (market_asset_id)
  references public.market_assets(id)
  on delete set null;
alter table public.holdings drop constraint if exists holdings_price_tracking_mode_check;
alter table public.holdings
  add constraint holdings_price_tracking_mode_check
  check (price_tracking_mode in ('manual', 'auto'));
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
alter table public.user_settings add column if not exists language text not null default 'id';
alter table public.user_settings add column if not exists apr_money_market_fund numeric not null default 0.05;
alter table public.user_settings add column if not exists notification_preferences jsonb not null default '{"enabled":true,"browserEnabled":false,"reminderFrequency":"monthly","enabledTypes":["reminder","risk","watchlist","goal","portfolio","market"],"quietMode":false,"mobileVibration":false,"weeklySummary":true,"lastGeneratedAt":{}}'::jsonb;
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

alter table public.feedback add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.feedback add column if not exists email text;
alter table public.feedback add column if not exists message text not null default '';
alter table public.feedback add column if not exists page text;
alter table public.feedback add column if not exists app_version text not null default 'ArahDana unknown';
alter table public.feedback add column if not exists page_url text;
alter table public.feedback add column if not exists created_at timestamptz not null default now();

alter table public.financial_goals add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.financial_goals add column if not exists local_id text;
alter table public.financial_goals add column if not exists category text not null default 'custom';
alter table public.financial_goals add column if not exists name text not null default 'Tujuan finansial';
alter table public.financial_goals add column if not exists target_amount numeric not null default 0;
alter table public.financial_goals add column if not exists target_date date not null default current_date;
alter table public.financial_goals add column if not exists monthly_contribution numeric not null default 0;
alter table public.financial_goals add column if not exists risk_tolerance numeric not null default 15;
alter table public.financial_goals add column if not exists risk_profile text not null default 'balanced';
alter table public.financial_goals add column if not exists preferred_instruments jsonb not null default '[]'::jsonb;
alter table public.financial_goals add column if not exists linked_holding_ids jsonb not null default '[]'::jsonb;
alter table public.financial_goals add column if not exists created_at timestamptz not null default now();
alter table public.financial_goals add column if not exists updated_at timestamptz not null default now();

alter table public.goal_contributions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.goal_contributions add column if not exists local_id text;
alter table public.goal_contributions add column if not exists goal_local_id text not null default '';
alter table public.goal_contributions add column if not exists amount numeric not null default 0;
alter table public.goal_contributions add column if not exists contribution_month text not null default to_char(current_date, 'YYYY-MM');
alter table public.goal_contributions add column if not exists note text;
alter table public.goal_contributions add column if not exists created_at timestamptz not null default now();

alter table public.alert_rules add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.alert_rules add column if not exists local_id text;
alter table public.alert_rules add column if not exists name text not null default 'Alert';
alter table public.alert_rules add column if not exists ticker text;
alter table public.alert_rules add column if not exists instrument_name text;
alter table public.alert_rules add column if not exists alert_type text not null default 'price_below';
alter table public.alert_rules add column if not exists target_price numeric;
alter table public.alert_rules add column if not exists buy_zone_from numeric;
alter table public.alert_rules add column if not exists buy_zone_to numeric;
alter table public.alert_rules add column if not exists risk_threshold numeric;
alter table public.alert_rules add column if not exists volatility_threshold numeric;
alter table public.alert_rules add column if not exists loss_threshold numeric;
alter table public.alert_rules add column if not exists allocation_threshold numeric;
alter table public.alert_rules add column if not exists enabled boolean not null default true;
alter table public.alert_rules add column if not exists notes text;
alter table public.alert_rules add column if not exists source_type text not null default 'manual';
alter table public.alert_rules add column if not exists source_id text;
alter table public.alert_rules add column if not exists last_checked_at timestamptz;
alter table public.alert_rules add column if not exists last_triggered_at timestamptz;
alter table public.alert_rules add column if not exists last_check_status text;
alter table public.alert_rules add column if not exists last_check_message text;
alter table public.alert_rules add column if not exists last_observed_verdict text;
alter table public.alert_rules add column if not exists created_at timestamptz not null default now();
alter table public.alert_rules add column if not exists updated_at timestamptz not null default now();

alter table public.portfolio_reports add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.portfolio_reports add column if not exists local_id text;
alter table public.portfolio_reports add column if not exists report_type text not null default 'monthly';
alter table public.portfolio_reports add column if not exists title text not null default 'Portfolio review';
alter table public.portfolio_reports add column if not exists period_start timestamptz not null default now();
alter table public.portfolio_reports add column if not exists period_end timestamptz not null default now();
alter table public.portfolio_reports add column if not exists generated_at timestamptz not null default now();
alter table public.portfolio_reports add column if not exists report jsonb not null default '{}'::jsonb;
alter table public.portfolio_reports add column if not exists created_at timestamptz not null default now();
alter table public.portfolio_reports add column if not exists updated_at timestamptz not null default now();

alter table public.beta_signups add column if not exists local_id text;
alter table public.beta_signups add column if not exists name text not null default '';
alter table public.beta_signups add column if not exists email text not null default '';
alter table public.beta_signups add column if not exists investment_experience text not null default 'beginner';
alter table public.beta_signups add column if not exists feedback_interest text not null default '';
alter table public.beta_signups add column if not exists created_at timestamptz not null default now();

alter table public.beta_test_feedback add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.beta_test_feedback add column if not exists local_id text;
alter table public.beta_test_feedback add column if not exists rating integer not null default 4;
alter table public.beta_test_feedback add column if not exists confusing text not null default '';
alter table public.beta_test_feedback add column if not exists useful text not null default '';
alter table public.beta_test_feedback add column if not exists bugs text not null default '';
alter table public.beta_test_feedback add column if not exists feature_request text not null default '';
alter table public.beta_test_feedback add column if not exists checklist jsonb not null default '{}'::jsonb;
alter table public.beta_test_feedback add column if not exists email text;
alter table public.beta_test_feedback add column if not exists app_version text not null default 'ArahDana unknown';
alter table public.beta_test_feedback add column if not exists page_url text;
alter table public.beta_test_feedback add column if not exists created_at timestamptz not null default now();

alter table public.market_assets add column if not exists symbol text not null default '';
alter table public.market_assets add column if not exists display_name text not null default '';
alter table public.market_assets add column if not exists search_aliases text[] not null default '{}';
alter table public.market_assets add column if not exists type text not null default 'stock';
alter table public.market_assets add column if not exists exchange text;
alter table public.market_assets add column if not exists currency text;
alter table public.market_assets add column if not exists logo_url text;
alter table public.market_assets add column if not exists provider text not null default 'unknown';
alter table public.market_assets add column if not exists is_active boolean not null default true;
alter table public.market_assets add column if not exists created_at timestamptz not null default now();
alter table public.market_assets add column if not exists updated_at timestamptz not null default now();

alter table public.market_quotes add column if not exists asset_id uuid references public.market_assets(id) on delete cascade;
alter table public.market_quotes add column if not exists price numeric;
alter table public.market_quotes add column if not exists change numeric;
alter table public.market_quotes add column if not exists change_percent numeric;
alter table public.market_quotes add column if not exists currency text;
alter table public.market_quotes add column if not exists market_status text not null default 'unknown';
alter table public.market_quotes add column if not exists is_delayed boolean not null default true;
alter table public.market_quotes add column if not exists source text not null default 'unknown';
alter table public.market_quotes add column if not exists updated_at timestamptz not null default now();

alter table public.market_watchlist add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.market_watchlist add column if not exists asset_id uuid references public.market_assets(id) on delete cascade;
alter table public.market_watchlist add column if not exists target_price numeric;
alter table public.market_watchlist add column if not exists note text;
alter table public.market_watchlist add column if not exists created_at timestamptz not null default now();
alter table public.market_watchlist add column if not exists updated_at timestamptz not null default now();

alter table public.market_price_history add column if not exists asset_id uuid references public.market_assets(id) on delete cascade;
alter table public.market_price_history add column if not exists price numeric not null default 0;
alter table public.market_price_history add column if not exists captured_at timestamptz not null default now();
alter table public.market_price_history add column if not exists source text not null default 'unknown';

create unique index if not exists portfolios_user_id_name_key on public.portfolios (user_id, name);
create unique index if not exists holdings_user_id_local_id_key on public.holdings (user_id, local_id);
create unique index if not exists watchlist_items_user_id_local_id_key on public.watchlist_items (user_id, local_id);
create unique index if not exists analysis_results_user_id_local_id_key on public.analysis_results (user_id, local_id);
create unique index if not exists financial_goals_user_id_local_id_key on public.financial_goals (user_id, local_id);
create unique index if not exists goal_contributions_user_id_local_id_key on public.goal_contributions (user_id, local_id);
create unique index if not exists alert_rules_user_id_local_id_key on public.alert_rules (user_id, local_id);
create unique index if not exists portfolio_reports_user_id_local_id_key on public.portfolio_reports (user_id, local_id);

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.user_settings enable row level security;
alter table public.analysis_results enable row level security;
alter table public.feedback enable row level security;
alter table public.financial_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.alert_rules enable row level security;
alter table public.portfolio_reports enable row level security;
alter table public.beta_signups enable row level security;
alter table public.beta_test_feedback enable row level security;
alter table public.market_assets enable row level security;
alter table public.market_quotes enable row level security;
alter table public.market_watchlist enable row level security;
alter table public.market_price_history enable row level security;

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

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

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

drop policy if exists "settings_delete_own" on public.user_settings;
create policy "settings_delete_own"
on public.user_settings
for delete
to authenticated
using ((select auth.uid()) = user_id);

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

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
on public.feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own"
on public.feedback
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "feedback_delete_own" on public.feedback;
create policy "feedback_delete_own"
on public.feedback
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "goals_select_own" on public.financial_goals;
create policy "goals_select_own"
on public.financial_goals
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "goals_insert_own" on public.financial_goals;
create policy "goals_insert_own"
on public.financial_goals
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "goals_update_own" on public.financial_goals;
create policy "goals_update_own"
on public.financial_goals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "goals_delete_own" on public.financial_goals;
create policy "goals_delete_own"
on public.financial_goals
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
create policy "goal_contributions_select_own"
on public.goal_contributions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_insert_own" on public.goal_contributions;
create policy "goal_contributions_insert_own"
on public.goal_contributions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_update_own" on public.goal_contributions;
create policy "goal_contributions_update_own"
on public.goal_contributions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "goal_contributions_delete_own" on public.goal_contributions;
create policy "goal_contributions_delete_own"
on public.goal_contributions
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "alert_rules_select_own" on public.alert_rules;
create policy "alert_rules_select_own"
on public.alert_rules
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "alert_rules_insert_own" on public.alert_rules;
create policy "alert_rules_insert_own"
on public.alert_rules
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "alert_rules_update_own" on public.alert_rules;
create policy "alert_rules_update_own"
on public.alert_rules
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "alert_rules_delete_own" on public.alert_rules;
create policy "alert_rules_delete_own"
on public.alert_rules
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "portfolio_reports_select_own" on public.portfolio_reports;
create policy "portfolio_reports_select_own"
on public.portfolio_reports
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "portfolio_reports_insert_own" on public.portfolio_reports;
create policy "portfolio_reports_insert_own"
on public.portfolio_reports
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "portfolio_reports_update_own" on public.portfolio_reports;
create policy "portfolio_reports_update_own"
on public.portfolio_reports
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "portfolio_reports_delete_own" on public.portfolio_reports;
create policy "portfolio_reports_delete_own"
on public.portfolio_reports
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "beta_signups_insert_public" on public.beta_signups;
create policy "beta_signups_insert_public"
on public.beta_signups
for insert
to anon, authenticated
with check (true);

drop policy if exists "beta_test_feedback_insert_own" on public.beta_test_feedback;
create policy "beta_test_feedback_insert_own"
on public.beta_test_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "beta_test_feedback_select_own" on public.beta_test_feedback;
create policy "beta_test_feedback_select_own"
on public.beta_test_feedback
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "beta_test_feedback_delete_own" on public.beta_test_feedback;
create policy "beta_test_feedback_delete_own"
on public.beta_test_feedback
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "market_assets_select_public" on public.market_assets;
create policy "market_assets_select_public"
on public.market_assets
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "market_quotes_select_public" on public.market_quotes;
create policy "market_quotes_select_public"
on public.market_quotes
for select
to anon, authenticated
using (true);

drop policy if exists "market_price_history_select_public" on public.market_price_history;
create policy "market_price_history_select_public"
on public.market_price_history
for select
to anon, authenticated
using (true);

drop policy if exists "market_watchlist_select_own" on public.market_watchlist;
create policy "market_watchlist_select_own"
on public.market_watchlist
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "market_watchlist_insert_own" on public.market_watchlist;
create policy "market_watchlist_insert_own"
on public.market_watchlist
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "market_watchlist_update_own" on public.market_watchlist;
create policy "market_watchlist_update_own"
on public.market_watchlist
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "market_watchlist_delete_own" on public.market_watchlist;
create policy "market_watchlist_delete_own"
on public.market_watchlist
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists market_assets_search_idx on public.market_assets using gin (
  to_tsvector('simple', symbol || ' ' || display_name || ' ' || array_to_string(search_aliases, ' '))
);
create index if not exists market_quotes_updated_at_idx on public.market_quotes (updated_at desc);
create index if not exists market_watchlist_user_id_idx on public.market_watchlist (user_id);
create index if not exists market_price_history_asset_captured_idx on public.market_price_history (asset_id, captured_at desc);

create or replace function public.delete_current_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.feedback where user_id = current_user_id;
  delete from public.beta_test_feedback where user_id = current_user_id;
  delete from public.market_watchlist where user_id = current_user_id;
  delete from public.portfolio_reports where user_id = current_user_id;
  delete from public.alert_rules where user_id = current_user_id;
  delete from public.goal_contributions where user_id = current_user_id;
  delete from public.financial_goals where user_id = current_user_id;
  delete from public.analysis_results where user_id = current_user_id;
  delete from public.watchlist_items where user_id = current_user_id;
  delete from public.holdings where user_id = current_user_id;
  delete from public.portfolios where user_id = current_user_id;
  delete from public.user_settings where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user_account() from public;
grant execute on function public.delete_current_user_account() to authenticated;

-- Refresh PostgREST schema cache after table/policy changes.
-- This prevents PGRST205 "table not found in schema cache" right after running the migration.
notify pgrst, 'reload schema';
