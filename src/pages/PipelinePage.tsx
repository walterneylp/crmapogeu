import { useEffect, useMemo, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { Contact, PipelineStage } from '@/lib/types';
import { Link } from 'react-router-dom';

export function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const load = async () => {
    const [sRes, cRes] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('sort_order', { ascending: true }),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    ]);
    if (!sRes.error) setStages((sRes.data as PipelineStage[]) ?? []);
    if (!cRes.error) setContacts((cRes.data as Contact[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>();
    stages.forEach((s) => map.set(s.id, []));
    contacts.forEach((c) => {
      if (c.current_stage_id && map.has(c.current_stage_id)) {
        map.get(c.current_stage_id)?.push(c);
      }
    });
    return map;
  }, [contacts, stages]);

  const changeStage = async (contactId: string, nextStageId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.current_stage_id === nextStageId) return;

    const previous = contact.current_stage_id;
    const { error } = await supabase.from('contacts').update({ current_stage_id: nextStageId }).eq('id', contactId);
    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from('contact_stage_history').insert({
      contact_id: contactId,
      from_stage_id: previous,
      to_stage_id: nextStageId,
      changed_by: null,
    });

    load();
  };

  return (
    <div>
      <SectionTitle title="Pipeline" subtitle="Visualize e atualize o andamento das oportunidades" />
      <div className="grid gap-4 lg:grid-cols-4">
        {stages.map((stage) => (
          <section className="card p-3" key={stage.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">{stage.name}</h2>
              <span className="badge bg-muted">{grouped.get(stage.id)?.length ?? 0}</span>
            </div>
            <div className="space-y-3">
              {(grouped.get(stage.id) ?? []).map((c) => (
                <article className="rounded-xl border bg-bg p-3" key={c.id}>
                  <Link to={`/contacts/${c.id}`} className="font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <p className="mt-1 text-xs opacity-70">{c.company ?? 'Sem empresa'}</p>
                  <select
                    className="input mt-3"
                    value={c.current_stage_id ?? ''}
                    onChange={(e) => changeStage(c.id, e.target.value)}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
              {(grouped.get(stage.id) ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed p-3 text-xs opacity-60">Sem contatos nesta etapa.</div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
