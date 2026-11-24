# Instruções do projeto

## Visão geral

Radar Odonto é uma aplicação Next.js com TypeScript que coleta oportunidades públicas, normaliza os dados e salva registros no Supabase.

## Estrutura

- `app/`: páginas, layout e API routes do Next.js.
- `components/`: componentes React reutilizáveis.
- `crawler/`: descoberta, extração, normalização, validação e persistência.
- `crawler/discovery/`: fontes que descobrem oportunidades.
- `crawler/sources/`: adaptadores de fontes HTML.
- `lib/`: clientes Supabase e tipos compartilhados.
- `supabase/migrations/`: schema e migrações do banco.

## Comandos

```bash
npm run dev       # desenvolvimento
npm run build     # validar build de produção
npm run lint      # validar código
npm run radar     # executar crawler principal
npm run radar:refresh # reprocessar documentos sem alteração
npm run discover  # descobrir oportunidades
npm run crawler   # executar crawler legado
```

## Regras

- Use TypeScript e mantenha tipos explícitos nas fronteiras de dados.
- Preserve separação entre descoberta, extração, normalização, validação e persistência.
- Ao alterar o formato salvo, atualize tipos, validação e migração Supabase relacionada.
- Use `external_key` como identidade da oportunidade; mantenha o `upsert` idempotente.
- Não exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente. Use `lib/supabase-admin.ts` somente no servidor/crawler.
- Leia `.env.example` antes de adicionar novas variáveis. Nunca versione `.env.local` ou segredos.
- Prefira mensagens e nomes consistentes com o código existente, escrito em português.
- Faça mudanças pequenas e preserve comportamento de fontes já existentes.

## Antes de concluir

Execute `npm run lint` e `npm run build` quando a mudança afetar código da aplicação. Para mudanças somente no crawler, execute ao menos `npm run lint` e o comando do crawler relevante, usando ambiente configurado.
