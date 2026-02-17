import { useEffect, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { QuoteModel } from '@/lib/types';

const initialForm = { name: '', description: '', template_content: '', parameters: '{"campos":["cliente","produto","valor"]}', active: true };

export function QuoteModelsPage() {
  const [models, setModels] = useState<QuoteModel[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('quote_models').select('*').order('name', { ascending: true });
    if (!error) setModels((data as QuoteModel[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.template_content.trim()) return;

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = form.parameters.trim() ? (JSON.parse(form.parameters) as Record<string, unknown>) : null;
    } catch {
      alert('Parâmetros JSON inválidos.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      template_content: form.template_content,
      parameters: parsed,
      active: form.active,
    };

    const op = editingId
      ? supabase.from('quote_models').update(payload).eq('id', editingId)
      : supabase.from('quote_models').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);
    setEditingId(null);
    setForm(initialForm);
    load();
  };

  const edit = (m: QuoteModel) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      description: m.description ?? '',
      template_content: m.template_content,
      parameters: JSON.stringify(m.parameters ?? {}, null, 2),
      active: m.active,
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir modelo?')) return;
    const { error } = await supabase.from('quote_models').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <SectionTitle title="Modelos de Orçamento" subtitle="Templates pré-definidos para preenchimento automático" />
      <div className="mb-4 card p-4">
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
            <input className="input" placeholder="Descrição" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          </div>
          <textarea className="input min-h-[130px]" placeholder="Template (use {{cliente}}, {{produto}}, {{valor}}...)" value={form.template_content} onChange={(e) => setForm((v) => ({ ...v, template_content: e.target.value }))} />
          <textarea className="input min-h-[100px] code" placeholder="Parâmetros JSON" value={form.parameters} onChange={(e) => setForm((v) => ({ ...v, parameters: e.target.value }))} />
          <div className="flex justify-end gap-2">
            {editingId ? <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancelar</button> : null}
            <button className="btn-primary" type="submit">{editingId ? 'Atualizar' : 'Cadastrar modelo'}</button>
          </div>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left"><tr><th className="px-4 py-3">Modelo</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr></thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{m.name}</td>
                <td className="px-4 py-3">{m.description ?? '-'}</td>
                <td className="px-4 py-3">{m.active ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="btn-secondary" onClick={() => edit(m)} type="button">Editar</button><button className="btn-secondary" onClick={() => remove(m.id)} type="button">Excluir</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
