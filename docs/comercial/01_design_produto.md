# App Web de Contatos Comerciais - Design de Produto

## 1) Resumo de entendimento
- Produto: app web para criar e gerenciar contatos comerciais.
- Objetivo: resolver organização, follow-up, pipeline e padronizacao de dados.
- Publico inicial: equipe comercial pequena (1 a 5 usuarios).
- Operacao: mista (prospeccao + gestao de carteira).
- Canais principais: WhatsApp, ligacao e e-mail com peso equivalente.
- Nivel esperado: alta automacao operacional no dia a dia.
- Disponibilidade: nao pode cair em horario comercial.

## 2) Premissas
- Uso principal em desktop, com responsividade para mobile.
- Historico completo por contato e obrigatorio para continuidade comercial.
- Integracoes entram por fases, mas modelo de dados nasce preparado.
- Controle de acesso inicia simples (login + papeis basicos).
- Gestao sera feita inicialmente pelo proprio dono da operacao.

## 3) Nao objetivos (agora)
- Suite completa estilo HubSpot no primeiro ciclo.
- BPM visual complexo com editor de fluxos avancado.
- Modulo financeiro e comissionamento completo no MVP.

## 4) Abordagens avaliadas
1. CRM Operacional Comercial (recomendada)
2. CRM com motor de processos (BPM leve)
3. Plataforma comercial modular completa

### Escolha
**Escolhida:** abordagem 1 (CRM Operacional Comercial), com arquitetura preparada para evolucao.

## 5) Features priorizadas

### MVP
1. Cadastro 360 de contato.
2. Pipeline Kanban por etapas.
3. Timeline unica de interacoes.
4. Proxima acao obrigatoria.
5. Agenda comercial diaria.
6. Tarefas com prioridade e atraso.
7. Validacoes e padronizacao de campos.
8. Busca e filtros avancados.
9. Dashboard de execucao.
10. Motivo de perda obrigatorio.

### V2
1. Automacoes por regra.
2. Playbook por etapa.
3. Integracao WhatsApp.
4. Integracao e-mail.
5. Registro de ligacao com clique.
6. Dedupe inteligente.
7. Segmentacao de carteira.
8. Metas por vendedor.
9. Relatorios de produtividade.
10. Importacao/exportacao estruturada.

### Diferenciais
1. Priorizacao inteligente de contatos (score).
2. Sugestao de melhor horario/canal.
3. Copiloto comercial para proxima acao.
4. Cadencias multicanal.
5. Visao gerencial de gargalos em tempo real.

## 6) Requisitos nao funcionais (NFR)
- Performance: respostas de lista/kanban abaixo de 2s em condicao normal.
- Disponibilidade: foco em alta estabilidade no horario comercial.
- Seguranca inicial: autenticacao, criptografia em transito e em repouso.
- Escalabilidade: crescer de 5 para 50 usuarios sem refatoracao estrutural.
- Operacao: backup diario e monitoramento basico de saude.

## 7) Decision log
1. **Decisao:** priorizar disciplina de follow-up como eixo central.
   - Alternativas: foco em funcoes administrativas.
   - Motivo: maior impacto direto em receita e previsibilidade.
2. **Decisao:** comecar com CRM operacional, nao com plataforma completa.
   - Alternativas: construir suite ampla desde o inicio.
   - Motivo: reduzir risco e acelerar valor.
3. **Decisao:** backlog MoSCoW por resultado comercial.
   - Alternativas: backlog por camada tecnica.
   - Motivo: facilitar execucao e priorizacao no dia a dia.
