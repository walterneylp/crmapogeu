import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { ClientGroup, Contact, Interaction, LossReason, TaskItem } from '@/lib/types';
import { formatDateTime, toISODateTimeLocal } from '@/lib/utils';

const initialInteraction = {
  type: 'nota',
  description: '',
  interaction_at: '',
};

const initialTask = {
  title: '',
  type: 'ligacao' as TaskItem['type'],
  priority: 'media' as TaskItem['priority'],
  dueAt: '',
};

export function ContactDetailPage() {
  const { id } = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [form, setForm] = useState(initialInteraction);
  const [taskForm, setTaskForm] = useState(initialTask);
  const [lossReasonId, setLossReasonId] = useState('');
  const [lossObs, setLossObs] = useState('');

  const load = useCallback(async () => {
    if (!id) return;

    const [cRes, iRes, tRes, lRes, gRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase
        .from('interactions')
        .select('*')
        .eq('contact_id', id)
        .order('interaction_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('contact_id', id).order('due_at', { ascending: true }),
      supabase.from('loss_reasons').select('*').order('name', { ascending: true }),
      supabase.from('client_groups').select('*').order('name', { ascending: true }),
    ]);

    if (!cRes.error) setContact(cRes.data as Contact);
    if (!iRes.error) setInteractions((iRes.data as Interaction[]) ?? []);
    if (!tRes.error) setTasks((tRes.data as TaskItem[]) ?? []);
    if (!lRes.error) setLossReasons((lRes.data as LossReason[]) ?? []);
    if (!gRes.error) setGroups((gRes.data as ClientGroup[]) ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const submitInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form.description.trim()) return;

    const { error } = await supabase.from('interactions').insert({
      contact_id: id,
      type: form.type,
      description: form.description,
      interaction_at: toISODateTimeLocal(form.interaction_at) ?? new Date().toISOString(),
      created_by: null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm(initialInteraction);
    load();
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !taskForm.title.trim() || !taskForm.dueAt) return;

    const { error } = await supabase.from('tasks').insert({
      contact_id: id,
      title: taskForm.title.trim(),
      type: taskForm.type,
      priority: taskForm.priority,
      due_at: new Date(taskForm.dueAt).toISOString(),
      status: 'aberta',
    });

    if (error) {
      alert(error.message);
      return;
    }

    setTaskForm(initialTask);
    load();
  };

  const concludeTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'concluida', completed_at: new Date().toISOString() })
      .eq('id', taskId);

    if (!error) {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: 'concluida', completed_at: new Date().toISOString() } : task)),
      );
    }
  };

  const closeAsLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !lossReasonId) return;

    const [{ error: lossErr }, { data: lostStage }] = await Promise.all([
      supabase.from('contact_losses').insert({
        contact_id: id,
        loss_reason_id: lossReasonId,
        observation: lossObs || null,
        lost_by: null,
      }),
      supabase.from('pipeline_stages').select('id').eq('type', 'perdido').limit(1).maybeSingle(),
    ]);

    if (lossErr) {
      alert(lossErr.message);
      return;
    }

    if (lostStage?.id) {
      await supabase.from('contacts').update({ current_stage_id: lostStage.id }).eq('id', id);
    }

    setLossReasonId('');
    setLossObs('');
    load();
  };

  const updateContactGroup = async (groupId: string) => {
    if (!id) return;
    const { error } = await supabase
      .from('contacts')
      .update({ client_group_id: groupId || null })
      .eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setContact((prev) => (prev ? { ...prev, client_group_id: groupId || null } : prev));
  };

  const channels = useMemo(() => {
    if (!contact) return [];
    return [
      ['Telefone', contact.phone],
      ['Ramal', contact.extension],
      ['WhatsApp', contact.whatsapp],
      ['E-mail', contact.email],
      ['Empresa', contact.company],
    ];
  }, [contact]);

  const taskCounters = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const abertas = tasks.filter((task) => task.status === 'aberta').length;
    const atrasadas = tasks.filter(
      (task) => task.status === 'aberta' && new Date(task.due_at).getTime() < now,
    ).length;
    const concluidasHoje = tasks.filter(
      (task) =>
        task.status === 'concluida' &&
        task.completed_at &&
        new Date(task.completed_at).getTime() >= todayStart.getTime() &&
        new Date(task.completed_at).getTime() < todayEnd.getTime(),
    ).length;

    return { abertas, atrasadas, concluidasHoje };
  }, [tasks]);

  const getTaskTimeHint = (task: TaskItem) => {
    if (task.status !== 'aberta') return null;
    const diffMs = new Date(task.due_at).getTime() - Date.now();
    const hours = Math.floor(Math.abs(diffMs) / 3600000);
    if (diffMs < 0) return { label: `Atrasada ha ${hours}h`, className: 'bg-red-500/15 text-red-500' };
    return { label: `Vence em ${hours}h`, className: 'bg-sky-500/15 text-sky-500' };
  };

  if (!contact) return <p>Contato nao encontrado.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
      <section>
        <SectionTitle title={contact.name} subtitle="Historico completo da conta" />
        <div className="card mb-4 p-4">
          <div className="grid gap-2 md:grid-cols-2">
            {channels.map(([k, v]) => (
              <div key={k}>
                <p className="text-xs uppercase tracking-wide opacity-60">{k}</p>
                <p className="font-semibold">{v || '-'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide opacity-60">Abertas</p>
            <p className="mt-1 text-2xl font-extrabold">{taskCounters.abertas}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide opacity-60">Atrasadas</p>
            <p className="mt-1 text-2xl font-extrabold text-red-500">{taskCounters.atrasadas}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide opacity-60">Concluidas hoje</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-500">{taskCounters.concluidasHoje}</p>
          </div>
        </div>

        <div className="card mb-4 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">Proximas acoes (Agenda deste contato)</h2>
            <Link className="btn-secondary" to={`/agenda?contactId=${id}`}>
              Ir para Agenda deste contato
            </Link>
          </div>
          <div className="mb-3 rounded-xl border bg-bg p-3">
            <p className="mb-2 text-xs uppercase tracking-wide opacity-60">Grupo do cliente</p>
            <select
              className="input max-w-md"
              value={contact.client_group_id ?? ''}
              onChange={(e) => updateContactGroup(e.target.value)}
            >
              <option value="">Sem grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitTask}>
            <input
              className="input md:col-span-2"
              placeholder="Titulo da tarefa *"
              value={taskForm.title}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <select
              className="input"
              value={taskForm.type}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, type: e.target.value as TaskItem['type'] }))}
            >
              <option value="ligacao">Ligacao</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="reuniao">Reuniao</option>
              <option value="geral">Geral</option>
            </select>
            <select
              className="input"
              value={taskForm.priority}
              onChange={(e) =>
                setTaskForm((prev) => ({ ...prev, priority: e.target.value as TaskItem['priority'] }))
              }
            >
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
            <input
              className="input md:col-span-2"
              type="datetime-local"
              value={taskForm.dueAt}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, dueAt: e.target.value }))}
            />
            <div className="md:col-span-2 flex justify-end">
              <button className="btn-primary" type="submit">
                Agendar proxima acao
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-2">
            {tasks.map((task) => {
              const timeHint = getTaskTimeHint(task);
              return (
                <div key={task.id} className="rounded-xl border bg-bg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {timeHint ? (
                        <span className={`badge ${timeHint.className}`}>{timeHint.label}</span>
                      ) : null}
                      <span
                        className={`badge ${
                          task.status === 'concluida'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-orange-500/15 text-orange-500'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs opacity-70">
                    {task.type} | {task.priority} | vence em {formatDateTime(task.due_at)}
                  </p>
                  {task.status === 'aberta' ? (
                    <div className="mt-2">
                      <button className="btn-secondary" type="button" onClick={() => concludeTask(task.id)}>
                        Concluir tarefa
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {tasks.length === 0 ? (
              <p className="text-sm opacity-70">Nenhuma tarefa para este contato ainda.</p>
            ) : null}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-lg font-extrabold">Timeline</h2>
          <div className="space-y-3">
            {interactions.map((i) => (
              <article key={i.id} className="rounded-xl border bg-bg p-3">
                <div className="mb-1 flex items-center justify-between text-xs opacity-70">
                  <span className="badge bg-muted">{i.type}</span>
                  <span>{formatDateTime(i.interaction_at)}</span>
                </div>
                <p className="text-sm">{i.description}</p>
              </article>
            ))}
            {interactions.length === 0 ? <p className="text-sm opacity-70">Sem interacoes ainda.</p> : null}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="card p-4">
          <h3 className="mb-3 text-lg font-extrabold">Nova interacao</h3>
          <form className="space-y-3" onSubmit={submitInteraction}>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="nota">Nota</option>
              <option value="ligacao">Ligacao</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="reuniao">Reuniao</option>
            </select>
            <input
              className="input"
              type="datetime-local"
              value={form.interaction_at}
              onChange={(e) => setForm({ ...form, interaction_at: e.target.value })}
            />
            <textarea
              className="input min-h-[100px]"
              placeholder="Descricao"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button className="btn-primary w-full" type="submit">
              Registrar
            </button>
          </form>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-lg font-extrabold">Encerrar como perdido</h3>
          <form className="space-y-3" onSubmit={closeAsLost}>
            <select className="input" value={lossReasonId} onChange={(e) => setLossReasonId(e.target.value)}>
              <option value="">Selecione o motivo</option>
              {lossReasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <textarea
              className="input min-h-[80px]"
              placeholder="Observacao"
              value={lossObs}
              onChange={(e) => setLossObs(e.target.value)}
            />
            <button className="btn-secondary w-full" type="submit">
              Registrar perda
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
