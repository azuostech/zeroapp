-- Admin audit trail schema + RLS
-- Run this in Supabase SQL editor before using administrative impersonation logs

create extension if not exists "pgcrypto";

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  resource text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_action_logs_admin_user_id on public.admin_action_logs(admin_user_id);
create index if not exists idx_admin_action_logs_target_user_id on public.admin_action_logs(target_user_id);
create index if not exists idx_admin_action_logs_created_at on public.admin_action_logs(created_at desc);

alter table public.admin_action_logs enable row level security;

drop policy if exists "admin_action_logs_insert_admin" on public.admin_action_logs;
create policy "admin_action_logs_insert_admin"
  on public.admin_action_logs
  for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "admin_action_logs_select_admin" on public.admin_action_logs;
create policy "admin_action_logs_select_admin"
  on public.admin_action_logs
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
