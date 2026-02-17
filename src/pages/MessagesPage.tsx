import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Mail, MessageCircle } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { InboundMessage } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export function MessagesPage() {
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    const { data, error } = await supabase
      .from('inbound_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(500);

    if (!error) setMessages((data as InboundMessage[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return messages.filter((msg) => {
      if (channelFilter && msg.channel !== channelFilter) return false;
      if (statusFilter === 'nao_lidas' && msg.read_at) return false;
      if (statusFilter === 'lidas' && !msg.read_at) return false;
      if (statusFilter === 'alarme' && !msg.alarm_active) return false;
      return true;
    });
  }, [messages, channelFilter, statusFilter]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('inbound_messages')
      .update({ read_at: new Date().toISOString(), alarm_active: false })
      .eq('id', id);

    if (error) return alert(error.message);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString(), alarm_active: false } : m)));
  };

  const toggleAlarm = async (msg: InboundMessage) => {
    const nextEnabled = !msg.alarm_enabled;
    const { error } = await supabase
      .from('inbound_messages')
      .update({ alarm_enabled: nextEnabled, alarm_active: nextEnabled && !msg.read_at })
      .eq('id', msg.id);

    if (error) return alert(error.message);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? { ...m, alarm_enabled: nextEnabled, alarm_active: nextEnabled && !m.read_at }
          : m,
      ),
    );
  };

  return (
    <div>
      <SectionTitle
        title="Mensagens Recebidas"
        subtitle="Central de e-mails e WhatsApp recebidos por webhook, com controle de alarme"
      />

      <div className="mb-4 card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="input" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
            <option value="">Todos os canais</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="nao_lidas">Nao lidas</option>
            <option value="lidas">Lidas</option>
            <option value="alarme">Alarme ativo</option>
          </select>
          <button className="btn-secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((msg) => (
          <article key={msg.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="badge bg-muted inline-flex items-center gap-1">
                  {msg.channel === 'email' ? <Mail size={12} /> : <MessageCircle size={12} />}
                  {msg.channel}
                </span>
                <span className="text-xs opacity-70">{formatDateTime(msg.received_at)}</span>
                {msg.alarm_active ? <span className="badge bg-red-500/20 text-red-500">ALERTA</span> : null}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" type="button" onClick={() => toggleAlarm(msg)}>
                  {msg.alarm_enabled ? <BellOff size={14} /> : <Bell size={14} />}
                  {msg.alarm_enabled ? 'Desativar alarme' : 'Ativar alarme'}
                </button>
                {!msg.read_at ? (
                  <button className="btn-secondary" type="button" onClick={() => markAsRead(msg.id)}>
                    Marcar como lida
                  </button>
                ) : null}
              </div>
            </div>

            <p className="mt-2 text-sm"><strong>Remetente:</strong> {msg.sender}</p>
            {msg.subject ? <p className="text-sm"><strong>Assunto:</strong> {msg.subject}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm opacity-90">{msg.body}</p>
          </article>
        ))}
        {!filtered.length ? <div className="card p-6 text-sm opacity-70">Nenhuma mensagem encontrada.</div> : null}
      </div>
    </div>
  );
}
