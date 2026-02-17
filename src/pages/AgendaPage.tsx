import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { TaskItem } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

type View = 'today' | 'overdue' | 'week';

type ContactOption = {
  id: string;
  name: string;
};

const initialCreateForm = {
  title: '',
  type: 'geral' as TaskItem['type'],
  priority: 'media' as TaskItem['priority'],
  dueAt: '',
  contactId: '',
};

export function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>('today');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const contactFilterId = searchParams.get('contactId') ?? '';

  const load = useCallback(async () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'aberta')
      .order('due_at', { ascending: true });

    if (contactFilterId) query = query.eq('contact_id', contactFilterId);

    if (view === 'today') {
      query = query
        .gte('due_at', start.toISOString())
        .lt('due_at', new Date(start.getTime() + 86400000).toISOString());
    }
    if (view === 'overdue') query = query.lt('due_at', now.toISOString());
    if (view === 'week') query = query.gte('due_at', start.toISOString()).lte('due_at', end.toISOString());

    const completedStart = new Date(now);
    completedStart.setHours(0, 0, 0, 0);
    const completedEnd = new Date(completedStart);
    completedEnd.setDate(completedEnd.getDate() + 1);

    const [tasksRes, completedRes, contactsRes] = await Promise.all([
      query,
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'concluida')
        .gte('completed_at', completedStart.toISOString())
        .lt('completed_at', completedEnd.toISOString()),
      supabase.from('contacts').select('id, name').order('name', { ascending: true }),
    ]);

    if (!tasksRes.error) setTasks((tasksRes.data as TaskItem[]) ?? []);
    if (!completedRes.error) setCompletedToday(completedRes.count ?? 0);
    if (!contactsRes.error) setContacts((contactsRes.data as ContactOption[]) ?? []);
  }, [view, contactFilterId]);

  useEffect(() => {
    load();
  }, [load]);

  const resume = useMemo(
    () => ({
      total: tasks.length,
      altas: tasks.filter((t) => t.priority === 'alta').length,
      medias: tasks.filter((t) => t.priority === 'media').length,
      baixas: tasks.filter((t) => t.priority === 'baixa').length,
    }),
    [tasks],
  );

  const conclude = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'concluida', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setCompletedToday((prev) => prev + 1);
    }
  };

  const startReschedule = (task: TaskItem) => {
    const local = new Date(task.due_at);
    const y = local.getFullYear();
    const m = `${local.getMonth() + 1}`.padStart(2, '0');
    const d = `${local.getDate()}`.padStart(2, '0');
    const h = `${local.getHours()}`.padStart(2, '0');
    const min = `${local.getMinutes()}`.padStart(2, '0');
    setRescheduleValue(`${y}-${m}-${d}T${h}:${min}`);
    setRescheduleTaskId(task.id);
  };

  const submitReschedule = async (id: string) => {
    if (!rescheduleValue) return;
    const iso = new Date(rescheduleValue).toISOString();
    const { error } = await supabase.from('tasks').update({ due_at: iso }).eq('id', id);
    if (!error) {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, due_at: iso } : task)));
      setRescheduleTaskId(null);
      setRescheduleValue('');
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.dueAt) return;

    const payload = {
      title: createForm.title.trim(),
      type: createForm.type,
      priority: createForm.priority,
      due_at: new Date(createForm.dueAt).toISOString(),
      contact_id: createForm.contactId || null,
      status: 'aberta' as const,
    };

    const { error } = await supabase.from('tasks').insert(payload);
    if (error) {
      alert(error.message);
      return;
    }

    setCreateForm(initialCreateForm);
    setShowCreate(false);
    load();
  };

  const taskPriorityClass = (priority: TaskItem['priority']) => {
    if (priority === 'alta') return 'bg-red-500/15 text-red-500';
    if (priority === 'media') return 'bg-amber-500/15 text-amber-500';
    return 'bg-sky-500/15 text-sky-500';
  };

  return (
    <div>
      <SectionTitle
        title="Agenda Comercial"
        subtitle="Controle de follow-up para nao perder nenhuma oportunidade"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'overdue', label: 'Atrasadas' },
            { id: 'week', label: '7 dias' },
          ].map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setView(item.id as View)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {contactFilterId ? (
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('contactId');
                setSearchParams(next);
              }}
            >
              Limpar filtro de contato
            </button>
          ) : null}
          <button className="btn-primary" type="button" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={16} /> Nova tarefa
          </button>
        </div>
      </div>

      {showCreate ? (
        <div className="mb-4 card p-4">
          <h3 className="mb-3 text-lg font-extrabold">Criar tarefa na agenda</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitCreate}>
            <input
              className="input md:col-span-2"
              placeholder="Titulo da tarefa *"
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <select
              className="input"
              value={createForm.type}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, type: e.target.value as TaskItem['type'] }))
              }
            >
              <option value="geral">Geral</option>
              <option value="ligacao">Ligacao</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="reuniao">Reuniao</option>
            </select>
            <select
              className="input"
              value={createForm.priority}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, priority: e.target.value as TaskItem['priority'] }))
              }
            >
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
            <input
              className="input"
              type="datetime-local"
              value={createForm.dueAt}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, dueAt: e.target.value }))}
            />
            <select
              className="input"
              value={createForm.contactId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, contactId: e.target.value }))}
            >
              <option value="">Sem vinculo de contato</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setCreateForm(initialCreateForm);
                  setShowCreate(false);
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" type="submit">
                Salvar tarefa
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm opacity-70">
            <CalendarClock size={16} />
            Pendencias na visao atual
          </div>
          <div className="text-2xl font-extrabold">{resume.total}</div>
        </div>
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm opacity-70">
            <CheckCircle2 size={16} />
            Prioridade alta
          </div>
          <div className="text-2xl font-extrabold">{resume.altas}</div>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-sm opacity-70">Concluidas hoje x Pendentes</div>
          <div className="text-2xl font-extrabold">
            {completedToday} <span className="opacity-45">x</span> {resume.total}
          </div>
        </div>
      </div>

      <div className="mb-4 card p-4">
        <p className="mb-2 text-sm font-semibold opacity-80">Legenda de prioridade</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="badge bg-red-500/15 text-red-500">Alta: {resume.altas}</span>
          <span className="badge bg-amber-500/15 text-amber-500">Media: {resume.medias}</span>
          <span className="badge bg-sky-500/15 text-sky-500">Baixa: {resume.baixas}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Tarefa</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t align-top">
                <td className="px-4 py-3 font-semibold">{task.title}</td>
                <td className="px-4 py-3">
                  {task.contact_id ? (
                    <Link className="underline decoration-dotted" to={`/contacts/${task.contact_id}`}>
                      Ver contato
                    </Link>
                  ) : (
                    <span className="opacity-60">-</span>
                  )}
                </td>
                <td className="px-4 py-3">{task.type}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${taskPriorityClass(task.priority)}`}>{task.priority}</span>
                </td>
                <td className="px-4 py-3">{formatDateTime(task.due_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => conclude(task.id)} type="button">
                      Concluir
                    </button>
                    <button className="btn-secondary" onClick={() => startReschedule(task)} type="button">
                      Reagendar
                    </button>
                  </div>
                  {rescheduleTaskId === task.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        className="input max-w-[220px]"
                        type="datetime-local"
                        value={rescheduleValue}
                        onChange={(e) => setRescheduleValue(e.target.value)}
                      />
                      <button className="btn-primary" type="button" onClick={() => submitReschedule(task.id)}>
                        Salvar
                      </button>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => {
                          setRescheduleTaskId(null);
                          setRescheduleValue('');
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {tasks.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center opacity-70" colSpan={6}>
                  Nenhuma tarefa nesta visao.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
