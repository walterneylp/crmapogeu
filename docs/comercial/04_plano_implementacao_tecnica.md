# Plano de Implementacao Tecnica por Sprint

## 0) Arquitetura alvo (enxuta e evolutiva)
- Frontend: SPA web responsiva (desktop first).
- Backend: API REST com autenticacao.
- Banco: relacional (modelo orientado a CRM operacional).
- Jobs: fila leve para alertas, automacoes e sincronizacoes.
- Observabilidade: logs estruturados + monitoramento de uptime.

## 1) Modelo de dados inicial (Sprint 1 e 2)

### Tabelas principais

| Tabela | Objetivo | Campos chave |
|---|---|---|
| `users` | usuarios do sistema | id, nome, email, senha_hash, ativo |
| `contacts` | cadastro principal do contato | id, nome, telefone, ramal, email, whatsapp, empresa, cargo, origem, owner_user_id |
| `pipelines` | definicao de pipeline | id, nome, ativo |
| `pipeline_stages` | etapas do funil | id, pipeline_id, nome, ordem, tipo (normal/ganho/perdido) |
| `contact_stage_history` | historico de mudanca de etapa | id, contact_id, from_stage_id, to_stage_id, changed_by, changed_at |
| `interactions` | timeline de interacoes | id, contact_id, tipo, descricao, interaction_at, created_by |
| `tasks` | proxima acao e tarefas | id, contact_id, titulo, tipo, due_at, prioridade, status, assignee_user_id |
| `loss_reasons` | catalogo de perda | id, nome, ativo |
| `contact_losses` | perda registrada por contato | id, contact_id, loss_reason_id, observacao, lost_at, lost_by |

### Indices recomendados
1. `contacts(nome)`, `contacts(email)`, `contacts(whatsapp)`.
2. `tasks(due_at, status, assignee_user_id)`.
3. `interactions(contact_id, interaction_at desc)`.
4. `contact_stage_history(contact_id, changed_at desc)`.

## 2) Contratos de API (MVP)

### Contatos
- `POST /api/contacts`
- `GET /api/contacts`
- `GET /api/contacts/{id}`
- `PUT /api/contacts/{id}`
- `DELETE /api/contacts/{id}`

### Pipeline
- `GET /api/pipelines/default/stages`
- `PATCH /api/contacts/{id}/stage`

### Timeline
- `POST /api/contacts/{id}/interactions`
- `GET /api/contacts/{id}/interactions`

### Tarefas/Agenda
- `POST /api/tasks`
- `GET /api/tasks?view=today|overdue|week`
- `PATCH /api/tasks/{id}`

### Perdas
- `GET /api/loss-reasons`
- `POST /api/contacts/{id}/loss`

### Dashboard (Sprint 3)
- `GET /api/dashboard/execution`
- `GET /api/dashboard/conversion`
- `GET /api/dashboard/productivity`

## 3) Telas por sprint

## Sprint 1 (US-01, US-02, US-03)

### Telas
1. Lista de contatos.
2. Formulario de contato (criar/editar).
3. Pipeline Kanban.
4. Pagina de detalhe do contato com timeline.

### Regras tecnicas
1. Validacao frontend + backend para campos obrigatorios.
2. Mudanca de etapa gera evento em `contact_stage_history`.
3. Timeline deve paginar eventos para performance.

## Sprint 2 (US-04, US-05, US-06)

### Telas
1. Agenda comercial (Hoje, Atrasados, Semana).
2. Modal de proxima acao.
3. Modal de encerramento perdido com motivo.

### Regras tecnicas
1. Contato em etapa ativa exige tarefa futura aberta.
2. Ao marcar como perdido, gravar `contact_losses`.
3. Alertas de atraso por job recorrente (a cada 5 min).

## Sprint 3 (US-10 parcial)

### Telas
1. Dashboard executivo.
2. Dashboard por vendedor.
3. Relatorio de aging por etapa.

### Regras tecnicas
1. Criar camada de agregacao (views/materializadas se necessario).
2. Definir janela de atualizacao dos indicadores.
3. Salvar filtros padrao por usuario.

## Sprint 4 (US-07, US-08, US-09)

### Telas
1. Configurador simples de regras (if/then pre-definido).
2. Checklists de playbook por etapa.
3. Painel de possiveis duplicados.

### Regras tecnicas
1. Motor de regra inicial baseado em gatilhos simples.
2. Regras auditaveis (log de execucao).
3. Dedupe por score (email igual, telefone igual, nome parecido).

## Sprint 5 (Integracoes)

### Telas
1. Configuracao de canais.
2. Timeline unificada multicanal.
3. Composer rapido de mensagem.

### Regras tecnicas
1. Adaptadores por canal para desacoplar integracoes.
2. Persistir mensagens e metadados em `interactions`.
3. Retry com backoff para falhas temporarias.

## Sprint 6 (hardening)

### Telas
1. Relatorios avancados.
2. Painel de saude operacional.
3. Configuracoes de backup e governanca basica.

### Regras tecnicas
1. SLO de disponibilidade em horario comercial.
2. Testes de carga no Kanban e listas.
3. Rotina de backup e restauracao validada.

## 4) Mapeamento US -> API -> Tela

| US | Endpoints principais | Tela principal |
|---|---|---|
| US-01 | POST/GET/PUT `/api/contacts` | Formulario e lista de contatos |
| US-02 | GET stages + PATCH stage | Pipeline Kanban |
| US-03 | POST/GET interactions | Detalhe do contato |
| US-04 | POST/PATCH `/api/tasks` | Modal de proxima acao |
| US-05 | GET `/api/tasks?view=...` | Agenda comercial |
| US-06 | GET loss-reasons + POST loss | Encerramento de oportunidade |
| US-07 | POST/GET `/api/automation-rules` | Configurador de regras |
| US-08 | GET/PUT `/api/stages/{id}/playbook` | Playbook por etapa |
| US-09 | GET `/api/contacts/duplicates` | Painel de duplicidades |
| US-10 | GET `/api/dashboard/*` | Dashboards |

## 5) Plano de testes (resumo)
1. Testes de contrato dos endpoints criticos.
2. Testes de fluxo: criar contato -> mover etapa -> registrar interacao -> agendar tarefa.
3. Teste de regra obrigatoria de proxima acao.
4. Teste de encerramento perdido com motivo.
5. Testes de performance em lista/kanban.

## 6) Riscos e mitigacoes
1. **Risco:** escopo grande cedo.
   - Mitigacao: trancar escopo por sprint (MoSCoW).
2. **Risco:** integracoes instaveis.
   - Mitigacao: adaptadores desacoplados e fila de retry.
3. **Risco:** baixa adocao interna.
   - Mitigacao: UX simples e rotina guiada por agenda.
4. **Risco:** dados inconsistentes.
   - Mitigacao: validacao forte e padronizacao obrigatoria.

## 7) Decision log tecnico
1. API REST e modelo relacional para acelerar entrega e manutencao.
2. Arquitetura preparada para evoluir automacoes sem reescrever base.
3. Integracoes por adaptadores para reduzir acoplamento.
4. Dashboards com agregacao incremental para manter performance.
