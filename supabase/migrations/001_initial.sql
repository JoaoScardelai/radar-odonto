create extension if not exists "pgcrypto";

create table if not exists public.opportunities (
    id uuid primary key default gen_random_uuid(),

    title text not null,
    organization text not null,

    city text,
    state varchar(2),

    type text not null
        check (type in ('CONCURSO', 'PSS')),

    position text not null,
    specialty text,

    salary_min numeric(12, 2),
    salary_max numeric(12, 2),

    weekly_hours integer,

    vacancies integer,
    reserve_list boolean not null default false,

    registration_start date,
    registration_end date,
    exam_date date,

    requires_cro boolean not null default true,
    requires_specialization boolean not null default false,
    specialization text,

    status text not null default 'OPEN'
        check (
            status in (
                'UPCOMING',
                'OPEN',
                'CLOSED',
                'CANCELLED'
            )
        ),

    source_name text,
    source_url text not null,
    official_notice_url text,

    description text,

    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists opportunities_state_idx
    on public.opportunities(state);

create index if not exists opportunities_type_idx
    on public.opportunities(type);

create index if not exists opportunities_status_idx
    on public.opportunities(status);

create index if not exists opportunities_registration_end_idx
    on public.opportunities(registration_end);


-- Evita cadastrar a mesma oportunidade duas vezes
create unique index if not exists opportunities_source_url_unique_idx
    on public.opportunities(source_url);


-- Atualiza updated_at automaticamente
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists opportunities_updated_at
on public.opportunities;

create trigger opportunities_updated_at
before update on public.opportunities
for each row
execute function public.update_updated_at();


-- RLS
alter table public.opportunities enable row level security;


-- Qualquer visitante do Radar pode visualizar oportunidades.
create policy "Public can read opportunities"
on public.opportunities
for select
to anon, authenticated
using (true);