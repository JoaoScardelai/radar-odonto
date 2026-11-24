create table if not exists public.source_health (
  source_id text primary key,
  source_name text not null,
  city text not null,
  state text not null,
  last_run_at timestamptz not null default now(),
  last_status text not null default 'OK',
  last_error text,
  documents_found integer not null default 0
);

alter table public.source_health enable row level security;
drop policy if exists "Authenticated users read source health" on public.source_health;
create policy "Authenticated users read source health"
on public.source_health for select to authenticated using (true);
