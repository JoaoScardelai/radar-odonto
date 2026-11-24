-- Remove dados fictícios usados apenas para testar a interface.
delete from public.opportunities
where source_url in (
  'https://example.com/concurso-dentista-1',
  'https://example.com/concurso-dentista-2'
);
