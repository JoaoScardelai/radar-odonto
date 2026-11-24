create table if not exists public.opportunity_user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  is_favorite boolean not null default false,
  applied boolean not null default false,
  completed_documents text[] not null default '{}',
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

alter table public.opportunity_user_state enable row level security;

drop policy if exists "Users manage own opportunity state" on public.opportunity_user_state;
create policy "Users manage own opportunity state"
on public.opportunity_user_state for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.alert_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  enabled boolean not null default true,
  cities text[] not null default '{}',
  types text[] not null default '{}',
  minimum_salary numeric(12, 2),
  updated_at timestamptz not null default now()
);

alter table public.alert_subscriptions enable row level security;

drop policy if exists "Users manage own alert subscription" on public.alert_subscriptions;
create policy "Users manage own alert subscription"
on public.alert_subscriptions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_url text not null,
  source_name text not null,
  title text,
  content_hash text not null,
  detected_at timestamptz not null default now(),
  unique (document_url, content_hash)
);

alter table public.document_revisions enable row level security;

drop policy if exists "Authenticated users read document revisions" on public.document_revisions;
create policy "Authenticated users read document revisions"
on public.document_revisions for select
to authenticated
using (true);

create index if not exists document_revisions_url_idx
  on public.document_revisions(document_url, detected_at desc);
