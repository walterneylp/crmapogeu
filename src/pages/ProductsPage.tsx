import { useEffect, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { ProductItem } from '@/lib/types';

const initialForm = { name: '', category: '', description: '', unit_price: '', active: true };

export function ProductsPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (!error) setItems((data as ProductItem[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim()) return;

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description || null,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      active: form.active,
    };

    const op = editingId
      ? supabase.from('products').update(payload).eq('id', editingId)
      : supabase.from('products').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);
    setEditingId(null);
    setForm(initialForm);
    load();
  };

  const edit = (p: ProductItem) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      unit_price: p.unit_price?.toString() ?? '',
      active: p.active,
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <SectionTitle title="Produtos" subtitle="Treinamentos, consultoria, hora técnica, mentoria e mais" />
      <div className="mb-4 card p-4">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
          <input className="input" placeholder="Categoria" value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} />
          <input className="input" placeholder="Preço unitário" type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm((v) => ({ ...v, unit_price: e.target.value }))} />
          <select className="input" value={form.active ? 'true' : 'false'} onChange={(e) => setForm((v) => ({ ...v, active: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          <textarea className="input md:col-span-2 min-h-[90px]" placeholder="Descrição" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingId ? <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancelar</button> : null}
            <button className="btn-primary" type="submit">{editingId ? 'Atualizar' : 'Cadastrar produto'}</button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{p.unit_price ?? '-'}</td>
                <td className="px-4 py-3">{p.active ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="btn-secondary" onClick={() => edit(p)} type="button">Editar</button><button className="btn-secondary" onClick={() => remove(p.id)} type="button">Excluir</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
