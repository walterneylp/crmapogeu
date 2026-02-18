-- Schema inicial para o app Comercial OS
-- Execute no SQL Editor do Supabase (projeto VPS)

create extension if not exists pgcrypto;

create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  sort_order int not null,
  type text not null check (type in ('normal', 'ganho', 'perdido')),
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  extension text,
  email text,
  whatsapp text,
  company text,
  role text,
  source text,
  client_group_id uuid,
  current_stage_id uuid references pipeline_stages(id),
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table contacts add column if not exists client_group_id uuid;
alter table contacts drop constraint if exists contacts_client_group_id_fkey;
alter table contacts
  add constraint contacts_client_group_id_fkey
  foreign key (client_group_id)
  references client_groups(id)
  on delete set null;

create table if not exists contact_stage_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  from_stage_id uuid references pipeline_stages(id),
  to_stage_id uuid references pipeline_stages(id),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  type text not null check (type in ('ligacao', 'whatsapp', 'email', 'reuniao', 'nota')),
  description text not null,
  interaction_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  title text not null,
  type text not null check (type in ('ligacao', 'whatsapp', 'email', 'reuniao', 'geral')),
  due_at timestamptz not null,
  priority text not null check (priority in ('baixa', 'media', 'alta')) default 'media',
  status text not null check (status in ('aberta', 'concluida')) default 'aberta',
  completed_at timestamptz,
  assignee_user_id uuid,
  created_at timestamptz not null default now()
);

alter table tasks add column if not exists completed_at timestamptz;

create table if not exists loss_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists contact_losses (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  loss_reason_id uuid not null references loss_reasons(id),
  observation text,
  lost_at timestamptz not null default now(),
  lost_by uuid
);

create index if not exists idx_contacts_name on contacts(name);
create index if not exists idx_contacts_email on contacts(email);
create index if not exists idx_contacts_whatsapp on contacts(whatsapp);
create index if not exists idx_contacts_group on contacts(client_group_id);
create index if not exists idx_tasks_due_status on tasks(due_at, status);
create index if not exists idx_interactions_contact_date on interactions(contact_id, interaction_at desc);
create index if not exists idx_stage_history_contact_date on contact_stage_history(contact_id, changed_at desc);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  login text not null unique,
  phone text,
  password_hash text not null,
  role text not null check (role in ('admin', 'comercial', 'gestor')) default 'comercial',
  active boolean not null default true,
  can_view_all boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_users add column if not exists login text;
alter table app_users add column if not exists phone text;
alter table app_users add column if not exists password_hash text;
alter table app_users add column if not exists can_view_all boolean not null default true;
update app_users set login = lower(split_part(email, '@', 1)) where login is null and email is not null;
update app_users set password_hash = crypt('123456', gen_salt('bf')) where password_hash is null;
alter table app_users alter column login set not null;
alter table app_users alter column password_hash set not null;
create unique index if not exists idx_app_users_login on app_users(login);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  unit_price numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  template_content text not null,
  parameters jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  quote_model_id uuid references quote_models(id) on delete set null,
  title text not null,
  status text not null check (status in ('rascunho', 'enviado', 'aprovado', 'rejeitado')) default 'rascunho',
  total_value numeric(12,2),
  parameters jsonb,
  generated_content text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotes_status on quotes(status);
create index if not exists idx_quotes_contact on quotes(contact_id);
create index if not exists idx_quotes_product on quotes(product_id);

create table if not exists company_presentations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_presentations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_presentations_product on product_presentations(product_id);

create table if not exists admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inbound_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'whatsapp')),
  sender text not null,
  subject text,
  body text not null,
  metadata jsonb,
  received_at timestamptz not null default now(),
  read_at timestamptz,
  alarm_enabled boolean not null default false,
  alarm_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_inbound_messages_received on inbound_messages(received_at desc);
create index if not exists idx_inbound_messages_channel on inbound_messages(channel);
create index if not exists idx_inbound_messages_read on inbound_messages(read_at);
create index if not exists idx_inbound_messages_alarm on inbound_messages(alarm_active);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_date on audit_logs(created_at desc);
create index if not exists idx_audit_logs_table on audit_logs(table_name);
create index if not exists idx_audit_logs_action on audit_logs(action);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function hash_app_user_password()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.password_hash is null or btrim(new.password_hash) = '' then
      raise exception 'Senha obrigatoria para novo usuario';
    end if;
    if new.password_hash !~ '^[a-f0-9]{32}$' then
      new.password_hash := md5(new.password_hash);
    end if;
    new.login := lower(new.login);
  elsif tg_op = 'UPDATE' then
    if new.password_hash is null or btrim(new.password_hash) = '' then
      new.password_hash := old.password_hash;
    elsif new.password_hash is distinct from old.password_hash and new.password_hash !~ '^[a-f0-9]{32}$' then
      new.password_hash := md5(new.password_hash);
    end if;
    new.login := lower(new.login);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hash_app_users_password on app_users;
create trigger trg_hash_app_users_password
before insert or update on app_users
for each row execute function hash_app_user_password();

drop function if exists app_authenticate(text, text);

create function app_authenticate(p_login text, p_password text)
returns table (
  id uuid,
  name text,
  email text,
  login text,
  phone text,
  role text,
  active boolean,
  can_view_all boolean
)
language sql
security definer
as $$
  select
    u.id,
    u.name,
    u.email,
    u.login,
    u.phone,
    u.role::text,
    u.active,
    u.can_view_all
  from app_users u
  where u.login = lower(trim(p_login))
    and u.active = true
    and u.password_hash = md5(p_password)
  limit 1;
$$;

grant execute on function app_authenticate(text, text) to anon, authenticated;

drop trigger if exists trg_contacts_updated_at on contacts;
create trigger trg_contacts_updated_at before update on contacts for each row execute function set_updated_at();

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at before update on app_users for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products for each row execute function set_updated_at();

drop trigger if exists trg_quote_models_updated_at on quote_models;
create trigger trg_quote_models_updated_at before update on quote_models for each row execute function set_updated_at();

drop trigger if exists trg_quotes_updated_at on quotes;
create trigger trg_quotes_updated_at before update on quotes for each row execute function set_updated_at();

drop trigger if exists trg_company_presentations_updated_at on company_presentations;
create trigger trg_company_presentations_updated_at before update on company_presentations for each row execute function set_updated_at();

drop trigger if exists trg_product_presentations_updated_at on product_presentations;
create trigger trg_product_presentations_updated_at before update on product_presentations for each row execute function set_updated_at();

drop trigger if exists trg_admin_settings_updated_at on admin_settings;
create trigger trg_admin_settings_updated_at before update on admin_settings for each row execute function set_updated_at();

create or replace function audit_row_changes()
returns trigger
language plpgsql
as $$
declare
  actor_id uuid;
begin
  actor_id := auth.uid();
  if tg_op = 'INSERT' then
    insert into audit_logs (table_name, action, record_id, old_data, new_data, changed_by)
    values (
      tg_table_name,
      tg_op,
      new.id,
      null,
      to_jsonb(new),
      actor_id
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into audit_logs (table_name, action, record_id, old_data, new_data, changed_by)
    values (
      tg_table_name,
      tg_op,
      new.id,
      to_jsonb(old),
      to_jsonb(new),
      actor_id
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_logs (table_name, action, record_id, old_data, new_data, changed_by)
    values (
      tg_table_name,
      tg_op,
      old.id,
      to_jsonb(old),
      null,
      actor_id
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_contacts on contacts;
create trigger trg_audit_contacts after insert or update or delete on contacts for each row execute function audit_row_changes();

drop trigger if exists trg_audit_client_groups on client_groups;
create trigger trg_audit_client_groups after insert or update or delete on client_groups for each row execute function audit_row_changes();

drop trigger if exists trg_audit_interactions on interactions;
create trigger trg_audit_interactions after insert or update or delete on interactions for each row execute function audit_row_changes();

drop trigger if exists trg_audit_tasks on tasks;
create trigger trg_audit_tasks after insert or update or delete on tasks for each row execute function audit_row_changes();

drop trigger if exists trg_audit_app_users on app_users;
create trigger trg_audit_app_users after insert or update or delete on app_users for each row execute function audit_row_changes();

drop trigger if exists trg_audit_products on products;
create trigger trg_audit_products after insert or update or delete on products for each row execute function audit_row_changes();

drop trigger if exists trg_audit_quote_models on quote_models;
create trigger trg_audit_quote_models after insert or update or delete on quote_models for each row execute function audit_row_changes();

drop trigger if exists trg_audit_quotes on quotes;
create trigger trg_audit_quotes after insert or update or delete on quotes for each row execute function audit_row_changes();

drop trigger if exists trg_audit_company_presentations on company_presentations;
create trigger trg_audit_company_presentations after insert or update or delete on company_presentations for each row execute function audit_row_changes();

drop trigger if exists trg_audit_product_presentations on product_presentations;
create trigger trg_audit_product_presentations after insert or update or delete on product_presentations for each row execute function audit_row_changes();

drop trigger if exists trg_audit_admin_settings on admin_settings;
create trigger trg_audit_admin_settings after insert or update or delete on admin_settings for each row execute function audit_row_changes();

drop trigger if exists trg_audit_inbound_messages on inbound_messages;
create trigger trg_audit_inbound_messages after insert or update or delete on inbound_messages for each row execute function audit_row_changes();

insert into pipelines (name)
select 'Pipeline Padrao'
where not exists (select 1 from pipelines);

with p as (
  select id from pipelines order by created_at asc limit 1
)
insert into pipeline_stages (pipeline_id, name, sort_order, type)
select p.id, s.name, s.sort_order, s.type
from p
join (
  values
    ('Novo', 1, 'normal'),
    ('Contato feito', 2, 'normal'),
    ('Qualificado', 3, 'normal'),
    ('Proposta', 4, 'normal'),
    ('Negociacao', 5, 'normal'),
    ('Ganho', 6, 'ganho'),
    ('Perdido', 7, 'perdido')
) as s(name, sort_order, type) on true
where not exists (select 1 from pipeline_stages);

insert into loss_reasons (name)
select x.name
from (
  values
    ('Preco'),
    ('Sem retorno'),
    ('Concorrente'),
    ('Sem fit'),
    ('Timing')
) as x(name)
where not exists (select 1 from loss_reasons lr where lr.name = x.name);

insert into client_groups (name, description)
select g.name, g.description
from (
  values
    ('Setor Hospitalar', 'Hospitais, clinicas e redes de saude'),
    ('Usinas', 'Usinas de energia, acucar e alcool'),
    ('Concessionarias de Energia', 'Distribuicao e transmissao de energia eletrica'),
    ('Concessionarias de Saneamento', 'Agua, esgoto e tratamento'),
    ('Industria Metalurgica', 'Fundicao, usinagem e transformacao metalica'),
    ('Montadoras de Veiculos', 'Fabricantes e plantas automotivas'),
    ('Oficinas de Veiculos', 'Oficinas mecanicas e centros automotivos')
) as g(name, description)
where not exists (select 1 from client_groups cg where cg.name = g.name);

insert into products (name, category, description, unit_price, active)
select p.name, p.category, p.description, p.unit_price, true
from (
  values
    ('Treinamento In Company', 'Treinamento', 'Capacitacao tecnica personalizada para equipes', 12000.00),
    ('Consultoria Especializada', 'Consultoria', 'Consultoria de processos e melhorias operacionais', 18000.00),
    ('Hora Tecnica', 'Servico Tecnico', 'Atendimento tecnico sob demanda por hora', 290.00),
    ('Mentoria Executiva', 'Mentoria', 'Mentoria estrategica para liderancas e times comerciais', 9500.00),
    ('Pericia Tecnica', 'Pericia', 'Analise tecnica e emissao de parecer especializado', 15000.00)
) as p(name, category, description, unit_price)
where not exists (select 1 from products x where x.name = p.name);

insert into quote_models (name, description, template_content, parameters, active)
select m.name, m.description, m.template_content, m.parameters::jsonb, true
from (
  values
    (
      'Modelo Padrao Comercial',
      'Modelo geral para propostas comerciais',
      E'Proposta Comercial\\n\\nCliente: {{cliente}}\\nEmpresa: {{empresa}}\\nProduto: {{produto}}\\nValor: {{valor}}\\n\\nEscopo: {{escopo}}\\nPrazo (dias): {{prazo_dias}}\\n',
      '{"escopo":"Descrever escopo aqui","prazo_dias":30}'
    ),
    (
      'Modelo Consultoria Tecnica',
      'Template para servicos de consultoria e diagnostico',
      E'Orcamento de Consultoria\\n\\nCliente: {{cliente}}\\nProduto: {{produto}}\\nValor Total: {{valor}}\\n\\nObjetivo: {{objetivo}}\\nEntregaveis: {{entregaveis}}\\n',
      '{"objetivo":"Objetivo principal","entregaveis":"Lista de entregaveis"}'
    )
) as m(name, description, template_content, parameters)
where not exists (select 1 from quote_models q where q.name = m.name);

insert into admin_settings (key, value, description)
select s.key, s.value::jsonb, s.description
from (
  values
    ('webhook_email', '{"url":"https://seu-endpoint-email","enabled":false}', 'Webhook de envio ou notificacao por e-mail'),
    ('webhook_whatsapp', '{"url":"https://seu-endpoint-whatsapp","enabled":false}', 'Webhook para integracao de WhatsApp'),
    ('webhook_inbound_email', '{"url":"https://seu-endpoint-entrada-email","enabled":false}', 'Webhook para recebimento de e-mails'),
    ('webhook_inbound_whatsapp', '{"url":"https://seu-endpoint-entrada-whatsapp","enabled":false}', 'Webhook para recebimento de mensagens WhatsApp'),
    ('emails_origem', '{"default":"comercial@empresa.com","fallback":["atendimento@empresa.com"]}', 'Emails de origem permitidos para envio'),
    ('smtp_config', '{"host":"smtp.exemplo.com","port":587,"secure":false,"user":"","enabled":false}', 'Configuracao SMTP padrao')
) as s(key, value, description)
where not exists (select 1 from admin_settings a where a.key = s.key);

insert into app_users (name, email, login, phone, password_hash, role, active, can_view_all)
select 'Administrador', 'admin@crmapogeu.local', 'admin', '(11) 99999-9999', '123456', 'admin', true, true
where not exists (select 1 from app_users u where u.login = 'admin');

update app_users
set password_hash = md5(password_hash)
where password_hash is not null
  and password_hash !~ '^[a-f0-9]{32}$';

update app_users
set can_view_all = true
where role = 'admin' and can_view_all is distinct from true;

-- Para desenvolvimento local:
-- 1) Se usar anon key sem auth, desabilite RLS temporariamente.
-- 2) Em producao, habilite RLS e crie policies por usuario/equipe.
