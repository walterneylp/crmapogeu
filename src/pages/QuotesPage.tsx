import { useEffect, useMemo, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { Contact, ProductItem, QuoteItem, QuoteModel } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

type QuoteStatus = QuoteItem['status'];

const initialForm = {
  contact_id: '',
  product_id: '',
  quote_model_id: '',
  title: '',
  status: 'rascunho' as QuoteStatus,
  total_value: '',
  parameters: '{\n  "escopo": "",\n  "prazo_dias": 30\n}',
};

function renderTemplate(template: string, data: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = data[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [models, setModels] = useState<QuoteModel[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [contacts]);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [products]);

  const modelNameById = useMemo(() => {
    const map = new Map<string, string>();
    models.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [models]);

  const load = async () => {
    const [qRes, cRes, pRes, mRes] = await Promise.all([
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').order('name', { ascending: true }),
      supabase.from('products').select('*').eq('active', true).order('name', { ascending: true }),
      supabase.from('quote_models').select('*').eq('active', true).order('name', { ascending: true }),
    ]);

    if (!qRes.error) setQuotes((qRes.data as QuoteItem[]) ?? []);
    if (!cRes.error) setContacts((cRes.data as Contact[]) ?? []);
    if (!pRes.error) setProducts((pRes.data as ProductItem[]) ?? []);
    if (!mRes.error) setModels((mRes.data as QuoteModel[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const fillByModel = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;

    setForm((prev) => ({
      ...prev,
      quote_model_id: modelId,
      title: prev.title || `Orcamento - ${model.name}`,
      parameters: JSON.stringify(model.parameters ?? {}, null, 2),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    let parsedParams: Record<string, unknown> | null = null;
    try {
      parsedParams = form.parameters.trim() ? (JSON.parse(form.parameters) as Record<string, unknown>) : null;
    } catch {
      alert('Parametros JSON invalidos.');
      return;
    }

    const selectedContact = contacts.find((c) => c.id === form.contact_id);
    const selectedProduct = products.find((p) => p.id === form.product_id);
    const selectedModel = models.find((m) => m.id === form.quote_model_id);

    const templateData: Record<string, unknown> = {
      cliente: selectedContact?.name ?? '',
      empresa: selectedContact?.company ?? '',
      produto: selectedProduct?.name ?? '',
      valor: form.total_value ? Number(form.total_value) : null,
      ...(parsedParams ?? {}),
    };

    const generated_content = selectedModel
      ? renderTemplate(selectedModel.template_content, templateData)
      : null;

    const payload = {
      contact_id: form.contact_id || null,
      product_id: form.product_id || null,
      quote_model_id: form.quote_model_id || null,
      title: form.title.trim(),
      status: form.status,
      total_value: form.total_value ? Number(form.total_value) : null,
      parameters: parsedParams,
      generated_content,
    };

    const op = editingId
      ? supabase.from('quotes').update(payload).eq('id', editingId)
      : supabase.from('quotes').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingId(null);
    setForm(initialForm);
    load();
  };

  const edit = (q: QuoteItem) => {
    setEditingId(q.id);
    setForm({
      contact_id: q.contact_id ?? '',
      product_id: q.product_id ?? '',
      quote_model_id: q.quote_model_id ?? '',
      title: q.title,
      status: q.status,
      total_value: q.total_value?.toString() ?? '',
      parameters: JSON.stringify(q.parameters ?? {}, null, 2),
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir orcamento?')) return;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <SectionTitle
        title="Orcamentos"
        subtitle="Defina parametros, vincule modelos pre-definidos e gere documentos"
      />

      <div className="mb-4 card p-4">
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="input"
              value={form.contact_id}
              onChange={(e) => setForm((v) => ({ ...v, contact_id: e.target.value }))}
            >
              <option value="">Contato</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.product_id}
              onChange={(e) => setForm((v) => ({ ...v, product_id: e.target.value }))}
            >
              <option value="">Produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.quote_model_id}
              onChange={(e) => fillByModel(e.target.value)}
            >
              <option value="">Modelo de orcamento</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="input md:col-span-2"
              placeholder="Titulo *"
              value={form.title}
              onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
            />
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as QuoteStatus }))}
            >
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>

          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Valor total"
            value={form.total_value}
            onChange={(e) => setForm((v) => ({ ...v, total_value: e.target.value }))}
          />

          <textarea
            className="input min-h-[120px]"
            placeholder="Parametros JSON"
            value={form.parameters}
            onChange={(e) => setForm((v) => ({ ...v, parameters: e.target.value }))}
          />

          <div className="flex justify-end gap-2">
            {editingId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Cancelar
              </button>
            ) : null}
            <button className="btn-primary" type="submit">
              {editingId ? 'Atualizar orcamento' : 'Gerar orcamento'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t align-top">
                <td className="px-4 py-3 font-semibold">{q.title}</td>
                <td className="px-4 py-3">{q.contact_id ? contactNameById.get(q.contact_id) ?? '-' : '-'}</td>
                <td className="px-4 py-3">{q.product_id ? productNameById.get(q.product_id) ?? '-' : '-'}</td>
                <td className="px-4 py-3">{q.quote_model_id ? modelNameById.get(q.quote_model_id) ?? '-' : '-'}</td>
                <td className="px-4 py-3">{q.status}</td>
                <td className="px-4 py-3">{formatDateTime(q.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" type="button" onClick={() => edit(q)}>
                      Editar
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => remove(q.id)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!quotes.length ? (
              <tr>
                <td className="px-4 py-8 text-center opacity-70" colSpan={7}>
                  Nenhum orcamento cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
