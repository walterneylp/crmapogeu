# Comercial OS

App web para criacao e gestao de contatos comerciais com pipeline, agenda de follow-up e timeline de interacoes.

## Stack
- React + Vite + TypeScript
- Tailwind CSS
- Supabase (Postgres + API)

## Funcionalidades implementadas
- Dashboard operacional
- Cadastro e listagem de contatos
- CRUD de grupos de clientes (segmentacao)
- Cadastro de usuarios internos
- Cadastro de produtos (treinamentos, consultoria, hora tecnica, mentoria, pericia etc.)
- Cadastro de modelos de orcamento
- Cadastro e geracao de orcamentos por parametros + modelo
- Cadastro de apresentacao da empresa
- Cadastro de apresentacao dos produtos
- Configuracoes administrativas (webhook e-mail, webhook WhatsApp, e-mails de origem etc.)
- Central de mensagens recebidas (e-mail/WhatsApp via webhook) com alarme
- Auditoria de operacoes (insert/update/delete)
- Menu lateral com icones e modo retratil
- Pipeline com mudanca de etapa
- Agenda (hoje, atrasadas, 7 dias)
- Detalhe do contato com timeline, contador de tarefas e agenda por contato
- Registro de perda com motivo
- Tema claro e escuro

## Requisitos
- Node.js 20+
- Projeto Supabase ativo (VPS)

## Setup local
1. Instale dependencias:
```bash
npm install
```

2. Copie variaveis de ambiente:
```bash
cp .env.example .env
```

3. Preencha no `.env`:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Execute o schema no Supabase SQL Editor:
- Arquivo: `supabase/schema.sql`
 - Se ja tinha banco criado, rode novamente para aplicar `alter table` da coluna `tasks.completed_at`.

5. Rode o app:
```bash
npm run dev
```

## Estrutura de docs de direcionamento
- `docs/comercial/01_design_produto.md`
- `docs/comercial/02_roadmap_90_dias.md`
- `docs/comercial/03_backlog_moscow.md`
- `docs/comercial/04_plano_implementacao_tecnica.md`

## Proximos passos recomendados
1. Adicionar autenticacao Supabase Auth.
2. Aplicar RLS por usuario/equipe.
3. Criar endpoints backend para automacoes (Sprint 4+).
4. Publicar em cloud (Vercel + Supabase VPS).
