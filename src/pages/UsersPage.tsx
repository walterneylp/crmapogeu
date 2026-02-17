import { useEffect, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/lib/types';

const initialForm = { name: '', email: '', role: 'comercial' as AppUser['role'], active: true };

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    if (!error) setUsers((data as AppUser[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    const payload = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() };
    const op = editingId
      ? supabase.from('app_users').update(payload).eq('id', editingId)
      : supabase.from('app_users').insert(payload);

    const { error } = await op;
    if (error) return alert(error.message);

    setEditingId(null);
    setForm(initialForm);
    load();
  };

  const edit = (u: AppUser) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, role: u.role, active: u.active });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir usuário?')) return;
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div>
      <SectionTitle title="Usuários" subtitle="Cadastro interno (sem fluxo de confirmação de e-mail)" />

      <div className="mb-4 card p-4">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <select className="input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as AppUser['role'] }))}>
            <option value="comercial">Comercial</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Admin</option>
          </select>
          <select className="input" value={form.active ? 'true' : 'false'} onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingId ? <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancelar</button> : null}
            <button className="btn-primary" type="submit">{editingId ? 'Atualizar' : 'Cadastrar usuário'}</button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.active ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="btn-secondary" onClick={() => edit(u)} type="button">Editar</button><button className="btn-secondary" onClick={() => remove(u.id)} type="button">Excluir</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
