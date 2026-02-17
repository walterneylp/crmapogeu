import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { ClientGroup } from '@/lib/types';

const initialForm = {
  name: '',
  description: '',
};

export function GroupsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('client_groups').select('*').order('name', { ascending: true });
    if (!error) setGroups((data as ClientGroup[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from('client_groups')
        .update({ name: form.name.trim(), description: form.description || null })
        .eq('id', editingId);
      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('client_groups')
        .insert({ name: form.name.trim(), description: form.description || null, active: true });
      if (error) {
        alert(error.message);
        return;
      }
    }

    setForm(initialForm);
    setEditingId(null);
    load();
  };

  const edit = (group: ClientGroup) => {
    setEditingId(group.id);
    setForm({ name: group.name, description: group.description ?? '' });
  };

  const remove = async (id: string) => {
    const confirmDelete = window.confirm('Deseja remover este grupo?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('client_groups').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
    load();
  };

  return (
    <div>
      <SectionTitle
        title="Grupos de Clientes"
        subtitle="Organize sua base por segmentos e mantenha padrao comercial"
      />

      <div className="mb-4 card p-4">
        <h2 className="mb-3 text-lg font-extrabold">{editingId ? 'Editar grupo' : 'Novo grupo'}</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <input
            className="input"
            placeholder="Nome do grupo *"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Descricao"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingId ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Cancelar edicao
              </button>
            ) : null}
            <button className="btn-primary" type="submit">
              <Plus size={16} /> {editingId ? 'Atualizar grupo' : 'Adicionar grupo'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Grupo</th>
              <th className="px-4 py-3">Descricao</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{group.name}</td>
                <td className="px-4 py-3">{group.description ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="btn-secondary" type="button" onClick={() => edit(group)}>
                      Editar
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => remove(group.id)}>
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center opacity-70" colSpan={3}>
                  Nenhum grupo cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
