create table if not exists public.arahdana_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arahdana_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  portfolio jsonb not null default '[]'::jsonb,
  watchlist jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.arahdana_profiles enable row level security;
alter table public.arahdana_user_data enable row level security;

drop policy if exists "profiles_select_own" on public.arahdana_profiles;
create policy "profiles_select_own"
on public.arahdana_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.arahdana_profiles;
create policy "profiles_insert_own"
on public.arahdana_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.arahdana_profiles;
create policy "profiles_update_own"
on public.arahdana_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "user_data_select_own" on public.arahdana_user_data;
create policy "user_data_select_own"
on public.arahdana_user_data
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_data_insert_own" on public.arahdana_user_data;
create policy "user_data_insert_own"
on public.arahdana_user_data
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "user_data_update_own" on public.arahdana_user_data;
create policy "user_data_update_own"
on public.arahdana_user_data
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
