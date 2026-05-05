-- MAVF Objectives schema + RLS
-- Run this in Supabase SQL editor before using /api/mavf/objectives

create table if not exists public.mavf_objectives (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.mavf_sessions(id) on delete set null,
  pillar text not null check (
    pillar in (
      'financeiro', 'profissional', 'emocional', 'espiritual',
      'parentes', 'conjugal', 'filhos', 'social',
      'saude', 'servir', 'intelectual'
    )
  ),
  description text not null,
  deadline date not null,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mavf_objectives_user_id on public.mavf_objectives(user_id);
create index if not exists idx_mavf_objectives_session_id on public.mavf_objectives(session_id);
create index if not exists idx_mavf_objectives_deadline on public.mavf_objectives(deadline);

alter table public.mavf_objectives enable row level security;

drop policy if exists "mavf_objectives_select_own" on public.mavf_objectives;
create policy "mavf_objectives_select_own"
  on public.mavf_objectives
  for select
  using (auth.uid() = user_id);

drop policy if exists "mavf_objectives_insert_own" on public.mavf_objectives;
create policy "mavf_objectives_insert_own"
  on public.mavf_objectives
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "mavf_objectives_update_own" on public.mavf_objectives;
create policy "mavf_objectives_update_own"
  on public.mavf_objectives
  for update
  using (auth.uid() = user_id);

drop policy if exists "mavf_objectives_delete_own" on public.mavf_objectives;
create policy "mavf_objectives_delete_own"
  on public.mavf_objectives
  for delete
  using (auth.uid() = user_id);

drop policy if exists "mavf_objectives_admin_select_all" on public.mavf_objectives;
create policy "mavf_objectives_admin_select_all"
  on public.mavf_objectives
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  );

drop policy if exists "mavf_objectives_admin_update_all" on public.mavf_objectives;
create policy "mavf_objectives_admin_update_all"
  on public.mavf_objectives
  for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  );
