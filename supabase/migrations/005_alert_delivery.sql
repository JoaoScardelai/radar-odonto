alter table public.alert_subscriptions
  add column if not exists last_sent_at timestamptz;
