alter table public.opportunities
  add column if not exists application_url text,
  add column if not exists application_fee numeric(12, 2),
  add column if not exists fee_exemption_deadline date,
  add column if not exists required_documents text[],
  add column if not exists registration_summary text,
  add column if not exists exam_location text,
  add column if not exists selection_stages text[];
