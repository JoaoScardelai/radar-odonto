drop policy if exists "Authenticated users read source health" on public.source_health;
drop policy if exists "Public read source health" on public.source_health;
create policy "Public read source health"
on public.source_health for select to anon, authenticated using (true);
