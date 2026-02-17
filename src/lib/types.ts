export type StageType = 'normal' | 'ganho' | 'perdido';

export interface PipelineStage {
  id: string;
  name: string;
  sort_order: number;
  type: StageType;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  extension: string | null;
  email: string | null;
  whatsapp: string | null;
  company: string | null;
  role: string | null;
  source: string | null;
  client_group_id: string | null;
  current_stage_id: string | null;
  owner_user_id: string | null;
  created_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  type: 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'nota';
  description: string;
  interaction_at: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  contact_id: string | null;
  title: string;
  type: 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'geral';
  due_at: string;
  priority: 'baixa' | 'media' | 'alta';
  status: 'aberta' | 'concluida';
  completed_at?: string | null;
}

export interface LossReason {
  id: string;
  name: string;
}

export interface ClientGroup {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  login: string;
  phone: string | null;
  role: 'admin' | 'comercial' | 'gestor';
  active: boolean;
  created_at: string;
}

export type SessionUser = Pick<AppUser, 'id' | 'name' | 'login' | 'role' | 'email' | 'phone'>;

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  unit_price: number | null;
  active: boolean;
}

export interface QuoteModel {
  id: string;
  name: string;
  description: string | null;
  template_content: string;
  parameters: Record<string, unknown> | null;
  active: boolean;
}

export interface QuoteItem {
  id: string;
  contact_id: string | null;
  product_id: string | null;
  quote_model_id: string | null;
  title: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado';
  total_value: number | null;
  parameters: Record<string, unknown> | null;
  generated_content: string | null;
  created_at: string;
}

export interface CompanyPresentation {
  id: string;
  title: string;
  content: string;
  active: boolean;
}

export interface ProductPresentation {
  id: string;
  product_id: string | null;
  title: string;
  content: string;
  active: boolean;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown> | null;
  description: string | null;
}

export interface AuditLog {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by?: string | null;
  created_at: string;
}

export interface InboundMessage {
  id: string;
  channel: 'email' | 'whatsapp';
  sender: string;
  subject: string | null;
  body: string;
  received_at: string;
  read_at: string | null;
  alarm_enabled: boolean;
  alarm_active: boolean;
}
