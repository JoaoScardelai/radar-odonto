-- Compatibilidade para instalações criadas por 001_initial.sql.
alter table public.opportunities
  add column if not exists external_key text;

with ranked_opportunities as (
  select
    id,
    concat_ws('|', source_url, position, coalesce(specialty, 'GERAL')) as base_key,
    row_number() over (
      partition by source_url, position, coalesce(specialty, 'GERAL')
      order by created_at, id
    ) as duplicate_number
  from public.opportunities
  where external_key is null
)
update public.opportunities as opportunity
set external_key = case
  when ranked.duplicate_number = 1 then ranked.base_key
  else ranked.base_key || '|' || opportunity.id::text
end
from ranked_opportunities as ranked
where opportunity.id = ranked.id;

alter table public.opportunities
  alter column external_key set not null;

create unique index if not exists opportunities_external_key_unique_idx
  on public.opportunities(external_key);

alter table public.opportunities
  drop constraint if exists opportunities_type_check;

alter table public.opportunities
  add constraint opportunities_type_check
  check (type in ('CONCURSO', 'PSS', 'CREDENCIAMENTO'));

create table if not exists public.processed_documents (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  document_url text not null unique,
  title text,
  content_hash text,
  has_dentistry boolean,
  processing_status text not null default 'PENDING'
    check (processing_status in ('PENDING', 'PROCESSED', 'FAILED')),
  last_error text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_processed_at timestamptz
);

create index if not exists processed_documents_status_idx
  on public.processed_documents(processing_status);
