import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, ListChecks, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from '@/components/SectionTitle';
import { formatDateTime } from '@/lib/utils';

type MetricKey = 'contacts' | 'openTasks' | 'overdueTasks' | 'interactionsToday' | 'unreadMessages';

interface RefRow {
  id: string;
  primary: string;
  secondary: string;
  link: string;
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  hint: string;
  active: boolean;
  onClick: () => void;
  to: string;
}

function MetricCard({ title, value, icon, hint, active, onClick, to }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer p-4 text-left transition hover:opacity-90 ${active ? 'ring-2 ring-orange-500/60' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between text-sm opacity-70">
        <span>{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs opacity-70">{hint}</p>
        <Link className="text-xs font-semibold text-orange-500 hover:underline" to={to} onClick={(e) => e.stopPropagation()}>
          Abrir pagina
        </Link>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [contacts, setContacts] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [interactionsToday, setInteractionsToday] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('contacts');
  const [references, setReferences] = useState<RefRow[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const loadMetrics = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [cRes, tRes, oRes, iRes, mRes] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'aberta'),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'aberta')
        .lt('due_at', new Date().toISOString()),
      supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .gte('interaction_at', today.toISOString()),
      supabase.from('inbound_messages').select('id', { count: 'exact', head: true }).is('read_at', null),
    ]);

    setContacts(cRes.count ?? 0);
    setOpenTasks(tRes.count ?? 0);
    setOverdueTasks(oRes.count ?? 0);
    setInteractionsToday(iRes.count ?? 0);
    setUnreadMessages(mRes.count ?? 0);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    const loadReferences = async () => {
      setLoadingRefs(true);
      if (selectedMetric === 'contacts') {
        const { data } = await supabase.from('contacts').select('id,name,company,created_at').order('created_at', { ascending: false }).limit(15);
        const rows = (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          primary: String(row.name ?? '-'),
          secondary: `${String(row.company ?? '-')} | ${formatDateTime(String(row.created_at ?? null))}`,
          link: `/contacts/${String(row.id)}`,
        }));
        setReferences(rows);
      }

      if (selectedMetric === 'openTasks') {
        const { data } = await supabase.from('tasks').select('id,title,due_at,contact_id').eq('status', 'aberta').order('due_at', { ascending: true }).limit(15);
        const rows = (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          primary: String(row.title ?? '-'),
          secondary: `Vence em ${formatDateTime(String(row.due_at ?? null))}`,
          link: row.contact_id ? `/contacts/${String(row.contact_id)}` : '/agenda',
        }));
        setReferences(rows);
      }

      if (selectedMetric === 'overdueTasks') {
        const { data } = await supabase.from('tasks').select('id,title,due_at,contact_id').eq('status', 'aberta').lt('due_at', new Date().toISOString()).order('due_at', { ascending: true }).limit(15);
        const rows = (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          primary: String(row.title ?? '-'),
          secondary: `Atrasada desde ${formatDateTime(String(row.due_at ?? null))}`,
          link: row.contact_id ? `/contacts/${String(row.contact_id)}` : '/agenda',
        }));
        setReferences(rows);
      }

      if (selectedMetric === 'interactionsToday') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data } = await supabase.from('interactions').select('id,type,description,interaction_at,contact_id').gte('interaction_at', today.toISOString()).order('interaction_at', { ascending: false }).limit(15);
        const rows = (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          primary: `${String(row.type ?? '-')} - ${String(row.description ?? '').slice(0, 60)}`,
          secondary: formatDateTime(String(row.interaction_at ?? null)),
          link: row.contact_id ? `/contacts/${String(row.contact_id)}` : '/contacts',
        }));
        setReferences(rows);
      }

      if (selectedMetric === 'unreadMessages') {
        const { data } = await supabase.from('inbound_messages').select('id,channel,sender,subject,received_at').is('read_at', null).order('received_at', { ascending: false }).limit(15);
        const rows = (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          primary: `${String(row.channel ?? '-')} - ${String(row.sender ?? '-')}`,
          secondary: `${String(row.subject ?? 'Sem assunto')} | ${formatDateTime(String(row.received_at ?? null))}`,
          link: '/messages',
        }));
        setReferences(rows);
      }
      setLoadingRefs(false);
    };

    loadReferences();
  }, [selectedMetric]);

  const score = useMemo(() => {
    if (!openTasks) return 100;
    const penalty = Math.min(70, overdueTasks * 8);
    return Math.max(30, 100 - penalty);
  }, [openTasks, overdueTasks]);

  return (
    <div>
      <SectionTitle
        title="Dashboard Comercial"
        subtitle="Clique nos cards para abrir detalhes e referencias da operacao"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Contatos ativos" value={contacts} hint="Base comercial total" icon={<Users size={16} />} active={selectedMetric === 'contacts'} onClick={() => setSelectedMetric('contacts')} to="/contacts" />
        <MetricCard title="Tarefas abertas" value={openTasks} hint="Follow-ups pendentes" icon={<ListChecks size={16} />} active={selectedMetric === 'openTasks'} onClick={() => setSelectedMetric('openTasks')} to="/agenda" />
        <MetricCard title="Atrasadas" value={overdueTasks} hint="Exigem acao imediata" icon={<Clock3 size={16} />} active={selectedMetric === 'overdueTasks'} onClick={() => setSelectedMetric('overdueTasks')} to="/agenda" />
        <MetricCard title="Interacoes hoje" value={interactionsToday} hint="Ritmo diario" icon={<BarChart3 size={16} />} active={selectedMetric === 'interactionsToday'} onClick={() => setSelectedMetric('interactionsToday')} to="/contacts" />
        <MetricCard title="Mensagens nao lidas" value={unreadMessages} hint="Email e WhatsApp" icon={<MessageSquare size={16} />} active={selectedMetric === 'unreadMessages'} onClick={() => setSelectedMetric('unreadMessages')} to="/messages" />
      </div>

      <div className="mb-4 card p-5">
        <p className="text-sm font-semibold opacity-80">Saude operacional</p>
        <div className="mt-3 h-3 w-full rounded-full bg-muted">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-2 text-sm">
          Score atual: <strong>{score}%</strong> (baseado em tarefas atrasadas)
        </p>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Referencias do card selecionado</h2>
          {loadingRefs ? <span className="text-xs opacity-70">Carregando...</span> : null}
        </div>
        <div className="space-y-2">
          {references.map((row) => (
            <Link key={row.id} to={row.link} className="block rounded-xl border bg-bg p-3 hover:bg-muted/50">
              <p className="font-semibold">{row.primary}</p>
              <p className="text-xs opacity-70">{row.secondary}</p>
            </Link>
          ))}
          {!loadingRefs && !references.length ? <p className="text-sm opacity-70">Sem referencias para exibir.</p> : null}
        </div>
      </div>
    </div>
  );
}
