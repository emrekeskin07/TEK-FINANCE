-- Run this script in Supabase SQL Editor.
-- It enforces per-user data isolation for assets and manual_assets tables.

-- 1) Ensure user_id column exists on both tables
alter table if exists public.assets
  add column if not exists user_id uuid;

alter table if exists public.assets
  add column if not exists unit_type text;

alter table if exists public.manual_assets
  add column if not exists user_id uuid;

create table if not exists public.transaction_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  asset_id bigint,
  action text not null,
  symbol text,
  name text,
  category text,
  bank_name text,
  quantity numeric,
  unit_price numeric,
  total_value numeric,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key,
  interests text[] not null default '{}',
  risk_profile text,
  first_asset_command text,
  has_completed_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Default new rows to current authenticated user
alter table if exists public.assets
  alter column user_id set default auth.uid();

alter table if exists public.assets
  alter column unit_type set default 'adet';

update public.assets
set unit_type = 'adet'
where unit_type is null;

alter table if exists public.assets
  alter column unit_type set not null;

alter table if exists public.manual_assets
  alter column user_id set default auth.uid();

-- 3) Helpful indexes for user-scoped queries
create index if not exists idx_assets_user_id on public.assets (user_id);
create index if not exists idx_manual_assets_user_id on public.manual_assets (user_id);
create index if not exists idx_transaction_log_user_id on public.transaction_log (user_id);
create index if not exists idx_transaction_log_created_at on public.transaction_log (created_at desc);
create index if not exists idx_user_preferences_completed on public.user_preferences (has_completed_onboarding);

-- 4) Enable RLS
alter table if exists public.assets enable row level security;
alter table if exists public.manual_assets enable row level security;
alter table if exists public.transaction_log enable row level security;
alter table if exists public.user_preferences enable row level security;

-- 5) Recreate policies (idempotent)
drop policy if exists assets_select_own on public.assets;
drop policy if exists assets_insert_own on public.assets;
drop policy if exists assets_update_own on public.assets;
drop policy if exists assets_delete_own on public.assets;

create policy assets_select_own
  on public.assets
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy assets_insert_own
  on public.assets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy assets_update_own
  on public.assets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy assets_delete_own
  on public.assets
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- manual_assets policies
drop policy if exists manual_assets_select_own on public.manual_assets;
drop policy if exists manual_assets_insert_own on public.manual_assets;
drop policy if exists manual_assets_update_own on public.manual_assets;
drop policy if exists manual_assets_delete_own on public.manual_assets;

create policy manual_assets_select_own
  on public.manual_assets
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy manual_assets_insert_own
  on public.manual_assets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy manual_assets_update_own
  on public.manual_assets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy manual_assets_delete_own
  on public.manual_assets
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists transaction_log_select_own on public.transaction_log;
drop policy if exists transaction_log_insert_own on public.transaction_log;
drop policy if exists transaction_log_update_own on public.transaction_log;
drop policy if exists transaction_log_delete_own on public.transaction_log;

create policy transaction_log_select_own
  on public.transaction_log
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy transaction_log_insert_own
  on public.transaction_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy transaction_log_update_own
  on public.transaction_log
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy transaction_log_delete_own
  on public.transaction_log
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_preferences_select_own on public.user_preferences;
drop policy if exists user_preferences_insert_own on public.user_preferences;
drop policy if exists user_preferences_update_own on public.user_preferences;
drop policy if exists user_preferences_delete_own on public.user_preferences;

create policy user_preferences_select_own
  on public.user_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_preferences_insert_own
  on public.user_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_preferences_update_own
  on public.user_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_preferences_delete_own
  on public.user_preferences
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional one-time migration note:
-- Existing rows with NULL user_id will be invisible after this script.
-- If needed, assign those rows to a specific user manually before enabling strict access.
